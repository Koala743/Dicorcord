const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio'); // Necesitas instalar: npm install cheerio

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
const pendingComicSearch = new Map();
const comicSearchCache = new Map();
const comicImageCache = new Map();

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
    const res = await axios.head(url, { timeout: 5000 });
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

// Función para scraping de sitios específicos
async function scrapeVideoSite(url, site) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    let title = '';
    let thumbnail = '';

    switch (site) {
      case 'xvideos.es':
      case 'xvideos.com':
        title = $('meta[property="og:title"]').attr('content') || $('.page-title h2').text() || 'Video';
        thumbnail = $('meta[property="og:image"]').attr('content') || $('.thumb img').attr('src');
        break;
      
      case 'es.pornhub.com':
        title = $('meta[property="og:title"]').attr('content') || $('h1.title').text() || 'Video';
        thumbnail = $('meta[property="og:image"]').attr('content');
        break;
      
      case 'www.xnxx.es':
        title = $('meta[property="og:title"]').attr('content') || $('.page-title').text() || 'Video';
        thumbnail = $('meta[property="og:image"]').attr('content');
        break;
      
      case 'hentaila.tv':
        title = $('.entry-title').text() || $('h1').text() || 'Anime';
        thumbnail = $('.wp-post-image').attr('src') || $('meta[property="og:image"]').attr('content');
        break;
      
      case 'www.videosdemadurasx.com':
        title = $('meta[property="og:title"]').attr('content') || $('h1').text() || 'Video';
        thumbnail = $('meta[property="og:image"]').attr('content');
        break;
      
      case 'www.serviporno.com':
        title = $('meta[property="og:title"]').attr('content') || $('h1').text() || 'Video';
        thumbnail = $('meta[property="og:image"]').attr('content');
        break;
    }

    return { title, thumbnail, url };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return { title: 'Error al cargar', thumbnail: null, url };
  }
}

// Función para buscar comics en chochox.com
async function searchChochoxComics(query) {
  try {
    const searchUrl = `https://chochox.com/?s=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const comics = [];
    
    $('.post').each((i, element) => {
      const title = $(element).find('h2 a').text().trim();
      const link = $(element).find('h2 a').attr('href');
      const thumbnail = $(element).find('img').attr('src');
      
      if (title && link) {
        comics.push({ title, link, thumbnail });
      }
    });
    
    return comics;
  } catch (error) {
    console.error('Error searching chochox:', error);
    return [];
  }
}

// Función para buscar comics en comics18.org
async function searchComics18(query) {
  try {
    const searchUrl = `https://comics18.org/?s=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const comics = [];
    
    $('.post').each((i, element) => {
      const title = $(element).find('h2 a').text().trim();
      const link = $(element).find('h2 a').attr('href');
      const thumbnail = $(element).find('img').attr('src');
      
      if (title && link) {
        comics.push({ title, link, thumbnail });
      }
    });
    
    return comics;
  } catch (error) {
    console.error('Error searching comics18:', error);
    return [];
  }
}

// Función para buscar comics en vercomicsporno.xxx
async function searchVerComicsPorno(query) {
  try {
    const searchUrl = `https://vercomicsporno.xxx/?s=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const comics = [];
    
    $('.post').each((i, element) => {
      const title = $(element).find('h2 a').text().trim();
      const link = $(element).find('h2 a').attr('href');
      const thumbnail = $(element).find('img').attr('src');
      
      if (title && link) {
        comics.push({ title, link, thumbnail });
      }
    });
    
    return comics;
  } catch (error) {
    console.error('Error searching vercomicsporno:', error);
    return [];
  }
}

// Función para obtener imágenes de comic de chochox
async function getChochoxComicImages(comicUrl) {
  try {
    const response = await axios.get(comicUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const images = [];
    
    // Buscar imágenes del comic
    $('.entry-content img').each((i, element) => {
      const src = $(element).attr('src');
      if (src && src.includes('wp-content/uploads')) {
        images.push(src);
      }
    });
    
    return images;
  } catch (error) {
    console.error('Error getting chochox images:', error);
    return [];
  }
}

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
    name: ".mp4 [búsqueda]",
    description: "Busca videos con selector de plataformas",
    example: ".mp4 música relajante",
    category: "🎬 Video"
  },
  {
    name: ".cmx [búsqueda]",
    description: "Busca comics en diferentes sitios",
    example: ".cmx bulma",
    category: "📚 Comics"
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

  mp4: async (m, args) => {
    const query = args.join(' ');
    if (!query) return m.reply('⚠️ Debes escribir algo para buscar.');

    const uid = m.author.id;
    pendingVideoSearch.set(uid, query);

    const siteSelector = new StringSelectMenuBuilder()
      .setCustomId(`videosite-${uid}`)
      .setPlaceholder('🎬 Selecciona la plataforma donde buscar')
      .addOptions([
        { label: 'YouTube', value: 'youtube', emoji: '🔴' },
        { label: 'Xvideos', value: 'xvideos.es', emoji: '🟠' },
        { label: 'Pornhub', value: 'es.pornhub.com', emoji: '🟡' },
        { label: 'XNXX', value: 'www.xnxx.es', emoji: '🟢' },
        { label: 'Hentaila', value: 'hentaila.tv', emoji: '🟣' },
        { label: 'Videos de Maduras', value: 'www.videosdemadurasx.com', emoji: '🔵' },
        { label: 'ServiPorno', value: 'www.serviporno.com', emoji: '🟤' },
      ]);

    return m.reply({
      content: 'Selecciona la plataforma donde deseas buscar:',
      components: [new ActionRowBuilder().addComponents(siteSelector)]
    });
  },

  cmx: async (m, args) => {
    const query = args.join(' ');
    if (!query) return m.reply('⚠️ Debes escribir algo para buscar.');

    const uid = m.author.id;
    pendingComicSearch.set(uid, query);

    const siteSelector = new StringSelectMenuBuilder()
      .setCustomId(`comicsite-${uid}`)
      .setPlaceholder('📚 Selecciona el sitio de comics')
      .addOptions([
        { label: 'ChochoX', value: 'chochox', emoji: '💜' },
        { label: 'Comics18', value: 'comics18', emoji: '🔞' },
        { label: 'VerComicsPorno', value: 'vercomicsporno', emoji: '📖' },
      ]);

    return m.reply({
      content: 'Selecciona el sitio donde deseas buscar comics:',
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

  // Manejo de botones de imágenes
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

  // Manejo de botones de videos
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
    } else if (cache.platform === 'scraping') {
      const video = cache.items[newIndex];

      const embed = new EmbedBuilder()
        .setTitle(`🎬 ${video.title}`)
        .setDescription(`[📺 Ver video](${video.url})`)
        .setThumbnail(video.thumbnail)
        .setColor('#ff1493')
        .setFooter({ text: `Video ${newIndex + 1} de ${cache.items.length} | ${cache.site}` })
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
      const video = cache.items[newIndex];
      const title = video.title;
      const link = video.link;
      const context = video.displayLink;
      const thumb = video.pagemap?.cse_thumbnail?.[0]?.src;

      const embed = new EmbedBuilder()
        .setTitle(`🎬 ${title.slice(0, 80)}...`)
        .setDescription(`**🔥 Clic para ver el contenido 🔥**\n[📺 Ir al enlace](${link})\n\n🌐 **Fuente**: ${context}`)
        .setColor('#ff1493')
        .setThumbnail(thumb || 'https://i.imgur.com/defaultThumbnail.png')
        .setFooter({ text: `Video ${newIndex + 1} de ${cache.items.length} | ${cache.site}` })
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

  // Manejo de botones de comics
  if (i.isButton() && (i.customId === 'prevComic' || i.customId === 'nextComic')) {
    const cache = comicSearchCache.get(uid);
    if (!cache) return i.deferUpdate();

    let newIndex = cache.index;
    if (i.customId === 'prevComic' && newIndex > 0) newIndex--;
    if (i.customId === 'nextComic' && newIndex < cache.items.length - 1) newIndex++;
    if (newIndex === cache.index) return i.deferUpdate();

    cache.index = newIndex;
    const comic = cache.items[newIndex];

    const embed = new EmbedBuilder()
      .setTitle(`📚 ${comic.title}`)
      .setDescription(`[📖 Leer comic](${comic.link})`)
      .setThumbnail(comic.thumbnail)
      .setColor('#9b59b6')
      .setFooter({ text: `Comic ${newIndex + 1} de ${cache.items.length} | ${cache.site}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prevComic').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === 0),
      new ButtonBuilder().setCustomId('nextComic').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === cache.items.length - 1),
      new ButtonBuilder().setCustomId(`readComic-${uid}-${newIndex}`).setLabel('📖 Ver Páginas').setStyle(ButtonStyle.Secondary)
    );

    await i.update({
      embeds: [embed],
      components: [row]
    });
  }

  // Manejo de botones para ver páginas del comic
  if (i.isButton() && i.customId.startsWith('readComic-')) {
    const parts = i.customId.split('-');
    const comicUid = parts[1];
    const comicIndex = parseInt(parts[2]);
    
    if (i.user.id !== comicUid) return i.deferUpdate();
    
    const cache = comicSearchCache.get(comicUid);
    if (!cache) return i.deferUpdate();
    
    const comic = cache.items[comicIndex];
    let images = [];
    
    // Obtener imágenes según el sitio
    if (cache.site === 'chochox') {
      images = await getChochoxComicImages(comic.link);
    }
    // Aquí puedes agregar más sitios cuando implementes las funciones
    
    if (images.length === 0) {
      return i.update({ content: '❌ No se pudieron obtener las imágenes del comic.', components: [] });
    }
    
    // Guardar en cache de imágenes del comic
    comicImageCache.set(comicUid, { images, index: 0, title: comic.title });
    
    const embed = new EmbedBuilder()
      .setTitle(`📖 ${comic.title}`)
      .setImage(images[0])
      .setColor('#9b59b6')
      .setFooter({ text: `Página 1 de ${images.length}` });
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prevComicPage').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId('nextComicPage').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(images.length === 1),
      new ButtonBuilder().setCustomId('downloadComic').setLabel('💾 Descargar Todo').setStyle(ButtonStyle.Success)
    );
    
    await i.update({
      embeds: [embed],
      components: [row]
    });
  }

  // Manejo de navegación de páginas del comic
  if (i.isButton() && (i.customId === 'prevComicPage' || i.customId === 'nextComicPage')) {
    const cache = comicImageCache.get(uid);
    if (!cache) return i.deferUpdate();

    let newIndex = cache.index;
    if (i.customId === 'prevComicPage' && newIndex > 0) newIndex--;
    if (i.customId === 'nextComicPage' && newIndex < cache.images.length - 1) newIndex++;
    if (newIndex === cache.index) return i.deferUpdate();

    cache.index = newIndex;

    const embed = new EmbedBuilder()
      .setTitle(`📖 ${cache.title}`)
      .setImage(cache.images[newIndex])
      .setColor('#9b59b6')
      .setFooter({ text: `Página ${newIndex + 1} de ${cache.images.length}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prevComicPage').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === 0),
      new ButtonBuilder().setCustomId('nextComicPage').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === cache.images.length - 1),
      new ButtonBuilder().setCustomId('downloadComic').setLabel('💾 Descargar Todo').setStyle(ButtonStyle.Success)
    );

    await i.update({
      embeds: [embed],
      components: [row]
    });
  }

  // Manejo de descarga de comic completo
  if (i.isButton() && i.customId === 'downloadComic') {
    const cache = comicImageCache.get(uid);
    if (!cache) return i.deferUpdate();

    await i.deferReply({ ephemeral: true });

    try {
      let downloadLinks = '';
      cache.images.forEach((img, index) => {
        downloadLinks += `Página ${index + 1}: ${img}\n`;
      });

      const embed = new EmbedBuilder()
        .setTitle('💾 Enlaces de Descarga')
        .setDescription(`**${cache.title}**\n\`\`\`\n${downloadLinks}\`\`\``)
        .setColor('#2ecc71')
        .setFooter({ text: 'Copia los enlaces para descargar las imágenes' });

      await i.editReply({ embeds: [embed] });
    } catch (error) {
      await i.editReply({ content: '❌ Error al generar los enlaces de descarga.' });
    }
  }

  // Selector de sitio de videos
  if (i.isStringSelectMenu() && i.customId.startsWith('videosite-')) {
    const extractedUid = i.customId.split('-')[1];
    if (i.user.id !== extractedUid) return i.deferUpdate();

    const query = pendingVideoSearch.get(extractedUid);
    if (!query) return i.deferUpdate();

    const selectedSite = i.values[0];
    pendingVideoSearch.delete(extractedUid);

    try {
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

        await i.update({
          content: null,
          embeds: [embed],
          components: [row]
        });
      } else {
        // Para sitios específicos que necesitan scraping
        if (['xvideos.es', 'es.pornhub.com', 'www.xnxx.es', 'hentaila.tv', 'www.videosdemadurasx.com', 'www.serviporno.com'].includes(selectedSite)) {
          const result = await googleGeneralSearch(query, selectedSite);
          if (!result) return i.update({ content: '❌ Error al realizar la búsqueda.', components: [] });

          const { items, apiUsed } = result;
          if (!items.length) return i.update({ content: '❌ No se encontraron resultados.', components: [] });

          // Hacer scraping de los primeros 5 resultados
          const scrapedVideos = [];
          for (let j = 0; j < Math.min(5, items.length); j++) {
            const videoData = await scrapeVideoSite(items[j].link, selectedSite);
            scrapedVideos.push(videoData);
          }

          videoSearchCache.set(extractedUid, { 
            items: scrapedVideos, 
            index: 0, 
            query, 
            site: selectedSite, 
            platform: 'scraping', 
            apiUsed 
          });

          const video = scrapedVideos[0];

          const embed = new EmbedBuilder()
            .setTitle(`🎬 ${video.title}`)
            .setDescription(`[📺 Ver video](${video.url})`)
            .setThumbnail(video.thumbnail)
            .setColor('#ff1493')
            .setFooter({ text: `Video 1 de ${scrapedVideos.length} | ${selectedSite} | API: ${apiUsed.id}` })
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prevVideo').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('nextVideo').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(scrapedVideos.length === 1)
          );

          await i.update({
            content: null,
            embeds: [embed],
            components: [row]
          });
        } else {
          // Búsqueda normal con Google
          const result = await googleGeneralSearch(query, selectedSite);
          if (!result) return i.update({ content: '❌ Error al realizar la búsqueda.', components: [] });

          const { items, apiUsed } = result;
          if (!items.length) return i.update({ content: '❌ No se encontraron resultados.', components: [] });

          videoSearchCache.set(extractedUid, { items, index: 0, query, site: selectedSite, platform: 'google', apiUsed });

          const video = items[0];
          const title = video.title;
          const link = video.link;
          const context = video.displayLink;
          const thumb = video.pagemap?.cse_thumbnail?.[0]?.src;

          const embed = new EmbedBuilder()
            .setTitle(`🎬 ${title.slice(0, 80)}...`)
            .setDescription(`**🔥 Clic para ver el contenido 🔥**\n[📺 Ir al enlace](${link})\n\n🌐 **Fuente**: ${context}`)
            .setColor('#ff1493')
            .setThumbnail(thumb || 'https://i.imgur.com/defaultThumbnail.png')
            .setFooter({ text: `Video 1 de ${items.length} | ${selectedSite} | API: ${apiUsed.id}` })
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prevVideo').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('nextVideo').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(items.length === 1)
          );

          await i.update({
            content: null,
            embeds: [embed],
            components: [row]
          });
        }
      }
    } catch (error) {
      console.error('Error en búsqueda de video:', error);
      return i.update({
        content: '❌ Error al realizar la búsqueda.',
        components: []
      });
    }
  }

  // Selector de sitio de comics
  if (i.isStringSelectMenu() && i.customId.startsWith('comicsite-')) {
    const extractedUid = i.customId.split('-')[1];
    if (i.user.id !== extractedUid) return i.deferUpdate();

    const query = pendingComicSearch.get(extractedUid);
    if (!query) return i.deferUpdate();

    const selectedSite = i.values[0];
    pendingComicSearch.delete(extractedUid);

    try {
      let comics = [];
      
      switch (selectedSite) {
        case 'chochox':
          comics = await searchChochoxComics(query);
          break;
        case 'comics18':
          comics = await searchComics18(query);
          break;
        case 'vercomicsporno':
          comics = await searchVerComicsPorno(query);
          break;
      }

      if (!comics.length) {
        return i.update({ content: '❌ No se encontraron comics.', components: [] });
      }

      comicSearchCache.set(extractedUid, { items: comics, index: 0, query, site: selectedSite });

      const comic = comics[0];

      const embed = new EmbedBuilder()
        .setTitle(`📚 ${comic.title}`)
        .setDescription(`[📖 Leer comic](${comic.link})`)
        .setThumbnail(comic.thumbnail)
        .setColor('#9b59b6')
        .setFooter({ text: `Comic 1 de ${comics.length} | ${selectedSite}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prevComic').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('nextComic').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(comics.length === 1),
        new ButtonBuilder().setCustomId(`readComic-${extractedUid}-0`).setLabel('📖 Ver Páginas').setStyle(ButtonStyle.Secondary)
      );

      await i.update({
        content: null,
        embeds: [embed],
        components: [row]
      });
    } catch (error) {
      console.error('Error en búsqueda de comics:', error);
      return i.update({
        content: '❌ Error al buscar comics.',
        components: []
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);