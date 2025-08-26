const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const PREFS = './langPrefs.json';
const POOLS_FILE = './apiPools.json';

let prefs = {};
let API_POOLS = {
  google: [
    {
      id: "google_1",
      apiKey: "AIzaSyDIrZO_rzRxvf9YvbZK1yPdsj4nrc0nqwY",
      cx: "34fe95d6cf39d4dd4",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString()
    },
    {
      id: "google_2",
      apiKey: "AIzaSyCOY3_MeHHHLiOXq2tAUypm1aHbpkFwQ80",
      cx: "f21e2b3468dc449e2",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString()
    }
  ]
};

const imageSearchCache = new Map();
const pendingVideoSearch = new Map();
const videoSearchCache = new Map();

function loadPrefs() {
  try {
    prefs = JSON.parse(fs.readFileSync(PREFS));
  } catch {
    prefs = {};
  }
}

function savePrefs() {
  fs.writeFileSync(PREFS, JSON.stringify(prefs, null, 2));
}

function loadPools() {
  try {
    const raw = fs.readFileSync(POOLS_FILE);
    API_POOLS = JSON.parse(raw);
  } catch {
    savePools();
  }
}

function savePools() {
  fs.writeFileSync(POOLS_FILE, JSON.stringify(API_POOLS, null, 2));
}

function resetDailyIfNeeded(api) {
  const today = new Date().toDateString();
  if (api.lastReset !== today) {
    api.dailyRequests = 0;
    api.quotaExhausted = false;
    api.lastReset = today;
  }
}

function getAvailableGoogleAPI() {
  for (let api of API_POOLS.google) {
    resetDailyIfNeeded(api);
  }

  for (let api of API_POOLS.google) {
    if (api.active && !api.quotaExhausted && api.dailyRequests < api.maxDailyRequests) {
      return api;
    }
  }

  return null;
}

async function isImageUrlValid(url) {
  try {
    const res = await axios.head(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } });
    const contentType = res.headers['content-type'];
    return res.status === 200 && contentType && contentType.startsWith('image/');
  } catch {
    return false;
  }
}

async function googleImageSearch(query) {
  const api = getAvailableGoogleAPI();
  if (!api) return null;

  api.dailyRequests++;
  savePools();

  const url = `https://www.googleapis.com/customsearch/v1?key=${api.apiKey}&cx=${api.cx}&searchType=image&q=${encodeURIComponent(query)}&num=10`;

  try {
    const res = await axios.get(url, { timeout: 8000 });
    const items = (res.data.items || []).filter(img => img.link && img.link.startsWith('http'));
    return { items, apiUsed: api };
  } catch (err) {
    const status = err.response?.status;
    const reason = err.response?.data?.error?.errors?.[0]?.reason || err.response?.data?.error?.message || err.message;

    if (status === 403 || /quota|limited|dailyLimitExceeded|quotaExceeded/i.test(String(reason))) {
      api.quotaExhausted = true;
      savePools();
    }

    return null;
  }
}

async function googleGeneralSearch(query, site = null) {
  const api = getAvailableGoogleAPI();
  if (!api) return null;

  api.dailyRequests++;
  savePools();

  const searchQuery = site ? `${query} site:${site}` : query;
  const url = `https://www.googleapis.com/customsearch/v1?key=${api.apiKey}&cx=${api.cx}&q=${encodeURIComponent(searchQuery)}&num=10`;

  try {
    const res = await axios.get(url, { timeout: 8000 });
    return { items: res.data.items || [], apiUsed: api };
  } catch (err) {
    const status = err.response?.status;
    const reason = err.response?.data?.error?.errors?.[0]?.reason || err.response?.data?.error?.message || err.message;

    if (status === 403 || /quota|limited|dailyLimitExceeded|quotaExceeded/i.test(String(reason))) {
      api.quotaExhausted = true;
      savePools();
    }

    return null;
  }
}

async function youtubeSearch(query) {
  const api = getAvailableGoogleAPI();
  if (!api) return null;

  api.dailyRequests++;
  savePools();

  try {
    const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        key: api.apiKey,
        maxResults: 10,
        type: 'video'
      }
    });
    return { items: res.data.items || [], apiUsed: api };
  } catch (err) {
    const status = err.response?.status;
    const reason = err.response?.data?.error?.message || err.message;

    if (status === 403 || /quota|limited|dailyLimitExceeded|quotaExceeded/i.test(String(reason))) {
      api.quotaExhausted = true;
      savePools();
    }

    return null;
  }
}

/**
 * ----------------------
 *  Scraping helpers
 * ----------------------
 */

function isUrl(text) {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

async function fetchHtml(url) {
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0 Safari/537.36'
      }
    });
    return res.data;
  } catch (err) {
    throw new Error('fetchHtml failed: ' + (err.message || err));
  }
}

function tryParseJsonLD($) {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      const txt = $(scripts[i]).html();
      const parsed = JSON.parse(txt);
      // Could be an array or object
      if (parsed && typeof parsed === 'object') {
        // title/path for video
        if (parsed.name || parsed.headline || parsed['@type']) return parsed;
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
}

async function scrapeVideoData(url) {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    // Try OpenGraph first
    let title = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || $('title').text();
    let image = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
    let video = $('meta[property="og:video"]').attr('content') || $('meta[name="twitter:player"]').attr('content');

    // JSON-LD fallback
    const jsonld = tryParseJsonLD($);
    if ((!title || title.length < 3) && jsonld) {
      title = title || jsonld.name || jsonld.headline || title;
    }
    if (!image && jsonld) {
      image = image || (jsonld.thumbnailUrl || (Array.isArray(jsonld.image) ? jsonld.image[0] : jsonld.image));
    }

    // Domain-specific heuristics
    const host = (new URL(url)).hostname.replace('www.', '');

    // Xvideos / XNXX often put thumbs in cdn77-pic.* or in <img> tags
    if (!image && /xvideos|xnxx/.test(host)) {
      // look for any image tags with 'thumb' or cdn77 in src
      const possible = $("img[src*='cdn77'], img[src*='thumb'], img[src*='thumbs']").map((i, el) => $(el).attr('src')).get();
      if (possible && possible.length) image = possible[0];
      // regex search for cdn77 in html
      if (!image) {
        const m = html.match(/https?:\/\/cdn77-pic\.[^\s'"]+?(?:jpg|jpeg|png)/i);
        if (m) image = m[0];
      }
    }

    // Pornhub image heuristic
    if (!image && /pornhub/.test(host)) {
      const m = html.match(/https?:\/\/(?:ei\.)?phncdn\.com[^\s'"]+?(?:jpg|jpeg|png)/i);
      if (m) image = m[0];
      // sometimes OG missing, look for meta itemprop
      image = image || $('meta[itemprop="thumbnailUrl"]').attr('content');
    }

    // Hentaila: thumbnails might be in <img class="thumb"> or inside listing
    if (!image && /hentaila\./.test(host)) {
      const possible = $("img").map((i, el) => $(el).attr('src')).get().filter(Boolean);
      // pick first that looks like a thumbnail
      const thumb = possible.find(u => /thumb|poster|thumbnail|\/media\//i.test(u));
      if (thumb) image = thumb;
    }

    // Generic fallback: first <img> that looks like a valid URL
    if (!image) {
      const firstImg = $('img').first().attr('src') || $('img').first().attr('data-src');
      if (firstImg && firstImg.startsWith('http')) image = firstImg;
    }

    // Final sanitization: make image absolute if needed
    if (image && image.startsWith('//')) image = 'https:' + image;
    if (image && image.startsWith('/')) image = `${new URL(url).origin}${image}`;

    // If still no image, try to find thumbnails in page via regex
    if (!image) {
      const m = html.match(/https?:\/\/[^\s'"]+?(?:thumbs169|thumbnail|poster)[^\s'"]+?(?:jpg|jpeg|png)/i);
      if (m) image = m[0];
    }

    // Return the scraped data
    return {
      title: title ? String(title).trim() : null,
      image: image || null,
      video: video || null,
      link: url,
      site: host
    };
  } catch (err) {
    console.error('scrapeVideoData error:', err.message || err);
    return null;
  }
}

/**
 * Hentaila search helper (uses site catalog search)
 * tries /catalogo?search= and scrapes results list
 */
async function searchHentaila(query) {
  try {
    const searchUrl = `https://hentaila.tv/catalogo?search=${encodeURIComponent(query)}`;
    const html = await fetchHtml(searchUrl);
    const $ = cheerio.load(html);

    // selectors depend on the site markup; try common patterns
    const results = [];
    $('a.card, .card a, .catalogo-item a').each((i, el) => {
      const href = $(el).attr('href');
      const title = $(el).find('.card-title, .title, h3').text() || $(el).attr('title') || $(el).text();
      const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
      if (href && href.startsWith('/')) {
        results.push({
          link: `https://hentaila.tv${href}`,
          title: title ? title.trim() : null,
          thumb: thumb
        });
      } else if (href && href.startsWith('http')) {
        results.push({ link: href, title: title ? title.trim() : null, thumb });
      }
    });

    return results;
  } catch (e) {
    return [];
  }
}

/**
 * ----------------------
 *  Commands & handlers
 * ----------------------
 */

const COMMANDS_LIST = [
  {
    name: ".web [búsqueda]",
    description: "Busca imágenes en Google con navegación por flechas",
    example: ".web gatos",
    category: "🔍 Búsqueda"
  },
  {
    name: ".bs [búsqueda]",
    description: "Búsqueda general en Google",
    example: ".bs recetas de pizza",
    category: "🔍 Búsqueda"
  },
  {
    name: ".video [búsqueda|url]",
    description: "Busca videos con selector de plataformas (YouTube + sitios propios)",
    example: ".video música relajante OR .video https://www.xvideos.com/...",
    category: "🎬 Video"
  },
  {
    name: ".help",
    description: "Muestra todos los comandos disponibles",
    example: ".help",
    category: "ℹ️ Utilidad"
  },
  {
    name: ".apis",
    description: "Muestra el estado de las APIs",
    example: ".apis",
    category: "🔧 Herramientas"
  }
];

const COMMAND_FUNCTIONS = {
  web: async (m, args) => {
    const query = args.join(' ');
    if (!query) return m.reply('⚠️ Debes proporcionar texto para buscar.');

    const result = await googleImageSearch(query);
    if (!result) return m.reply('❌ Todas las APIs de Google están agotadas o fallan.');

    const { items, apiUsed } = result;
    if (!items.length) return m.reply('❌ No se encontraron imágenes.');

    let validIndex = -1;
    for (let i = 0; i < items.length; i++) {
      if (await isImageUrlValid(items[i].link)) {
        validIndex = i;
        break;
      }
    }

    if (validIndex === -1) return m.reply('❌ No se encontraron imágenes válidas.');

    imageSearchCache.set(m.author.id, { items, index: validIndex, query, apiId: apiUsed.id });

    const embed = new EmbedBuilder()
      .setTitle(`📷 Resultados para: ${query}`)
      .setImage(items[validIndex].link)
      .setDescription(`[Página donde está la imagen](${items[validIndex].image.contextLink})`)
      .setFooter({ text: `Imagen ${validIndex + 1} de ${items.length} • API: ${apiUsed.id} (${apiUsed.dailyRequests}/${apiUsed.maxDailyRequests})` })
      .setColor('#00c7ff');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prevImage').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(validIndex === 0),
      new ButtonBuilder().setCustomId('nextImage').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(validIndex === items.length - 1)
    );

    await m.channel.send({ embeds: [embed], components: [row] });
  },

  bs: async (m, args) => {
    const query = args.join(' ');
    if (!query) return m.reply('⚠️ Debes proporcionar texto para buscar.');

    const result = await googleGeneralSearch(query);
    if (!result) return m.reply('❌ Todas las APIs de Google están agotadas o fallan.');

    const { items, apiUsed } = result;
    if (!items.length) return m.reply('❌ No se encontraron resultados.');

    const embed = new EmbedBuilder()
      .setTitle(`🔍 Resultados para: ${query}`)
      .setColor('#00c7ff')
      .setFooter({ text: `API: ${apiUsed.id} (${apiUsed.dailyRequests}/${apiUsed.maxDailyRequests})` });

    items.slice(0, 5).forEach((item, i) => {
      embed.addFields({
        name: `${i + 1}. ${item.title}`,
        value: `${item.snippet}\n[🔗 Ver enlace](${item.link})`,
        inline: false
      });
    });

    await m.channel.send({ embeds: [embed] });
  },

  video: async (m, args) => {
    const query = args.join(' ');
    if (!query) return m.reply('⚠️ Debes escribir algo para buscar.');

    const uid = m.author.id;
    pendingVideoSearch.set(uid, query);

    // Añadimos las plataformas nuevas
    const siteSelector = new StringSelectMenuBuilder()
      .setCustomId(`videosite-${uid}`)
      .setPlaceholder('🎬 Selecciona la plataforma donde buscar')
      .addOptions([
        { label: 'YouTube', value: 'youtube', emoji: '🔴' },
        { label: 'Xvideos', value: 'xvideos.com', emoji: '🟠' },
        { label: 'Xvideos (ES)', value: 'xvideos.es', emoji: '🟠' },
        { label: 'Pornhub', value: 'es.pornhub.com', emoji: '🟡' },
        { label: 'XNXX', value: 'xnxx.es', emoji: '🟢' },
        { label: 'Hentaila (tv)', value: 'hentaila.tv', emoji: '🟣' },
        { label: 'Hentaila (com)', value: 'hentaila.com', emoji: '🟣' },
        { label: 'VideosDeMadurasX', value: 'videosdemadurasx.com', emoji: '🟤' },
        { label: 'Serviporno', value: 'serviporno.com', emoji: '⚪' }
      ]);

    return m.reply({
      content: 'Selecciona la plataforma donde deseas buscar:',
      components: [new ActionRowBuilder().addComponents(siteSelector)]
    });
  },

  help: async (m) => {
    const embed = new EmbedBuilder()
      .setTitle('📜 Lista de Comandos')
      .setColor('#00c7ff');

    for (let cmd of COMMANDS_LIST) {
      embed.addFields({
        name: cmd.name,
        value: `${cmd.description}\nEjemplo: \`${cmd.example}\` (${cmd.category})`
      });
    }

    return m.channel.send({ embeds: [embed] });
  },

  apis: async (m) => {
    const embed = new EmbedBuilder()
      .setTitle('🔧 Estado de APIs')
      .setColor('#00c7ff')
      .setTimestamp();

    for (let api of API_POOLS.google) {
      resetDailyIfNeeded(api);
      embed.addFields({
        name: api.id,
        value: `Activo: ${api.active ? '✅' : '❌'}\nAgotada: ${api.quotaExhausted ? '❌' : '✅'}\nRequests hoy: ${api.dailyRequests}/${api.maxDailyRequests}\nÚltimo reset: ${api.lastReset}`,
        inline: true
      });
    }

    return m.channel.send({ embeds: [embed] });
  }
};

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  loadPrefs();
  loadPools();
});

client.on('messageCreate', async (m) => {
  if (m.author.bot || !m.content || !m.content.startsWith('.')) return;

  const [command, ...args] = m.content.slice(1).trim().split(/ +/);

  if (COMMAND_FUNCTIONS[command]) {
    try {
      await COMMAND_FUNCTIONS[command](m, args);
    } catch (e) {
      console.error('Error ejecutando comando:', e);
      m.reply('❌ Error ejecutando el comando.');
    }
  }
});

client.on('interactionCreate', async (i) => {
  if (!i.isButton() && !i.isStringSelectMenu()) return;

  const uid = i.user.id;

  if (i.isButton() && (i.customId === 'prevImage' || i.customId === 'nextImage')) {
    const cache = imageSearchCache.get(uid);
    if (!cache) return i.deferUpdate();

    let newIndex = cache.index;
    if (i.customId === 'prevImage' && newIndex > 0) newIndex--;
    if (i.customId === 'nextImage' && newIndex < cache.items.length - 1) newIndex++;

    const direction = newIndex < cache.index ? -1 : 1;
    let validIndex = newIndex;

    while (validIndex >= 0 && validIndex < cache.items.length) {
      if (await isImageUrlValid(cache.items[validIndex].link)) break;
      validIndex += direction;
    }

    if (validIndex < 0 || validIndex >= cache.items.length) return i.deferUpdate();

    cache.index = validIndex;
    const img = cache.items[validIndex];
    const api = API_POOLS.google.find(a => a.id === cache.apiId);

    const embed = new EmbedBuilder()
      .setTitle(`📷 Resultados para: ${cache.query}`)
      .setImage(img.link)
      .setDescription(`[Página donde está la imagen](${img.image.contextLink})`)
      .setFooter({ text: `Imagen ${validIndex + 1} de ${cache.items.length} • API: ${api?.id || 'N/A'}` })
      .setColor('#00c7ff');

    await i.update({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('prevImage').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(validIndex === 0),
          new ButtonBuilder().setCustomId('nextImage').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(validIndex === cache.items.length - 1)
        )
      ]
    });
  }

  if (i.isButton() && (i.customId === 'prevVideo' || i.customId === 'nextVideo')) {
    const cache = videoSearchCache.get(uid);
    if (!cache) return i.deferUpdate();

    let newIndex = cache.index;
    if (i.customId === 'prevVideo' && newIndex > 0) newIndex--;
    if (i.customId === 'nextVideo' && newIndex < cache.items.length - 1) newIndex++;
    if (newIndex === cache.index) return i.deferUpdate();

    cache.index = newIndex;

    if (cache.platform === 'youtube') {
      const item = cache.items[newIndex];
      const videoId = item.id.videoId;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const title = item.snippet.title;
      const thumbnail = item.snippet.thumbnails.medium?.url;

      const embed = new EmbedBuilder()
        .setTitle(`🎬 ${title}`)
        .setDescription(`[📺 Ver en YouTube](${videoUrl})`)
        .setThumbnail(thumbnail)
        .setColor('#ff0000')
        .setFooter({ text: `Video ${newIndex + 1} de ${cache.items.length} | YouTube` })
        .setTimestamp();

      await i.update({
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prevVideo').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === 0),
            new ButtonBuilder().setCustomId('nextVideo').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === cache.items.length - 1)
          )
        ]
      });
    } else {
      // For non-youtube we cached final scraped items (link/title/thumb)
      const video = cache.items[newIndex];
      const title = video.title || 'Video';
      const link = video.link || video.url;
      const thumb = video.thumb || video.image || null;

      const embed = new EmbedBuilder()
        .setTitle(`🎬 ${title.length > 80 ? title.slice(0, 77) + '...' : title}`)
        .setDescription(`**🔥 Clic para ver el contenido 🔥**\n[📺 Ir al enlace](${link})\n\n🌐 **Fuente**: ${cache.site || 'sitio'}`)
        .setColor('#ff1493')
        .setThumbnail(thumb || 'https://i.imgur.com/defaultThumbnail.png')
        .setFooter({ text: `Video ${newIndex + 1} de ${cache.items.length} | ${cache.site || 'sitio'}` })
        .setTimestamp();

      await i.update({
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prevVideo').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === 0),
            new ButtonBuilder().setCustomId('nextVideo').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === cache.items.length - 1)
          )
        ]
      });
    }
  }

  if (i.isStringSelectMenu() && i.customId.startsWith('videosite-')) {
    const extractedUid = i.customId.split('-')[1];
    if (i.user.id !== extractedUid) return i.deferUpdate();

    const query = pendingVideoSearch.get(extractedUid);
    if (!query) return i.deferUpdate();

    const selectedSite = i.values[0];
    pendingVideoSearch.delete(extractedUid);

    try {
      // If user provided a direct URL as query -> scrape it
      if (isUrl(query)) {
        const scraped = await scrapeVideoData(query);
        if (!scraped) return i.update({ content: '❌ No se pudo raspar la URL proporcionada.', components: [] });

        videoSearchCache.set(extractedUid, { items: [{ title: scraped.title, link: scraped.link, thumb: scraped.image }], index: 0, query, platform: 'other', site: scraped.site });
        const item = videoSearchCache.get(extractedUid).items[0];

        const embed = new EmbedBuilder()
          .setTitle(`🎬 ${item.title || 'Video'}`)
          .setDescription(`[📺 Ir al enlace](${item.link})`)
          .setThumbnail(item.thumb || scraped.image || 'https://i.imgur.com/defaultThumbnail.png')
          .setColor('#ff1493')
          .setFooter({ text: `Video 1 de 1 | ${scraped.site}` });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('prevVideo').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId('nextVideo').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(true)
        );

        return i.update({ content: null, embeds: [embed], components: [row] });
      }

      // Not a URL: search inside the site (if supported) using Google CSE when available,
      // otherwise use site-specific search (hentaila).
      if (selectedSite === 'youtube') {
        const result = await youtubeSearch(query);
        if (!result) return i.update({ content: '❌ Error al buscar en YouTube.', components: [] });

        const { items, apiUsed } = result;
        if (!items.length) return i.update({ content: '❌ No se encontraron videos en YouTube.', components: [] });

        videoSearchCache.set(extractedUid, { items, index: 0, query, platform: 'youtube', apiUsed });

        const item = items[0];
        const videoId = item.id.videoId;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const title = item.snippet.title;
        const thumbnail = item.snippet.thumbnails.medium?.url;

        const embed = new EmbedBuilder()
          .setTitle(`🎬 ${title}`)
          .setDescription(`[📺 Ver en YouTube](${videoUrl})`)
          .setThumbnail(thumbnail)
          .setColor('#ff0000')
          .setFooter({ text: `Video 1 de ${items.length} | YouTube | API: ${apiUsed.id}` })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('prevVideo').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId('nextVideo').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(items.length === 1)
        );

        return i.update({ content: null, embeds: [embed], components: [row] });
      }

      // For hentaila use internal search if possible
      if (selectedSite === 'hentaila.tv' || selectedSite === 'hentaila.com') {
        // try site search first (only for hentaila.tv implemented)
        const results = await searchHentaila(query);
        if (results && results.length) {
          // scrape first N results to normalize
          const items = [];
          for (let r of results.slice(0, 10)) {
            // try to scrape the result page for more accurate thumbnail/title
            const scraped = await scrapeVideoData(r.link);
            items.push({
              title: scraped?.title || r.title || 'Video',
              link: scraped?.link || r.link,
              thumb: scraped?.image || r.thumb || r.thumb
            });
          }
          videoSearchCache.set(extractedUid, { items, index: 0, query, platform: 'other', site: selectedSite });
          const first = items[0];

          const embed = new EmbedBuilder()
            .setTitle(`🎬 ${first.title}`)
            .setDescription(`[📺 Ir al enlace](${first.link})`)
            .setThumbnail(first.thumb || 'https://i.imgur.com/defaultThumbnail.png')
            .setColor('#ff1493')
            .setFooter({ text: `Video 1 de ${items.length} | ${selectedSite}` });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prevVideo').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('nextVideo').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(items.length === 1)
          );

          return i.update({ content: null, embeds: [embed], components: [row] });
        }

        // fallback to google CSE search on the domain
        // fallthrough to generic site-search block
      }

      // Generic: try Google custom search restricted to the site domain (ex: xvideos.com, pornub.com, etc)
      const result = await googleGeneralSearch(query, selectedSite);
      if (!result) return i.update({ content: '❌ Error al realizar la búsqueda (Google API o sin resultados).', components: [] });

      const { items, apiUsed } = result;
      if (!items.length) return i.update({ content: '❌ No se encontraron resultados en el sitio indicado.', components: [] });

      // Scrape the top N results to extract thumbnails and titles reliably
      const scrapedItems = [];
      for (let item of items.slice(0, 10)) {
        try {
          const link = item.link;
          const scraped = await scrapeVideoData(link);
          scrapedItems.push({
            title: scraped?.title || item.title || item.snippet || 'Video',
            link: scraped?.link || link,
            thumb: scraped?.image || item.pagemap?.cse_thumbnail?.[0]?.src || null
          });
        } catch (err) {
          // ignore single failures
        }
      }

      if (!scrapedItems.length) return i.update({ content: '❌ No se pudieron extraer miniaturas de los resultados encontrados.', components: [] });

      videoSearchCache.set(extractedUid, { items: scrapedItems, index: 0, query, platform: 'other', site: selectedSite, apiUsed });

      const first = scrapedItems[0];
      const embed = new EmbedBuilder()
        .setTitle(`🎬 ${first.title}`)
        .setDescription(`**🔥 Clic para ver el contenido 🔥**\n[📺 Ir al enlace](${first.link})\n\n🌐 **Fuente**: ${selectedSite}`)
        .setColor('#ff1493')
        .setThumbnail(first.thumb || 'https://i.imgur.com/defaultThumbnail.png')
        .setFooter({ text: `Video 1 de ${scrapedItems.length} | ${selectedSite} | API: ${apiUsed?.id || 'scraper'}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prevVideo').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('nextVideo').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(scrapedItems.length === 1)
      );

      await i.update({ content: null, embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Error en búsqueda de video:', error);
      return i.update({
        content: '❌ Error al realizar la búsqueda.',
        components: []
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);