const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');
const archiver = require('archiver');
const path = require('path');

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

// Función para extraer thumbnail de páginas de video
async function extractVideoThumbnail(url) {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    
    let thumbnail = null;
    let title = $('title').text() || 'Video';
    
    // Buscar meta tags de imagen
    const ogImage = $('meta[property="og:image"]').attr('content');
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    
    if (ogImage) thumbnail = ogImage;
    else if (twitterImage) thumbnail = twitterImage;
    
    // Buscar el título específico
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) title = ogTitle;
    
    return { thumbnail, title };
  } catch (error) {
    console.error('Error extrayendo thumbnail:', error);
    return { thumbnail: null, title: 'Video' };
  }
}

// Función para buscar cómics en chochox.com
async function searchChochoxComics(query) {
  try {
    const searchUrl = `https://chochox.com/?s=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    
    const comics = [];
    $('.wp-block-group').each((i, elem) => {
      const title = $(elem).find('h2 a').text().trim();
      const link = $(elem).find('h2 a').attr('href');
      const thumbnail = $(elem).find('img').attr('src');
      
      if (title && link) {
        comics.push({ title, link, thumbnail });
      }
    });
    
    return comics;
  } catch (error) {
    console.error('Error buscando en chochox:', error);
    return [];
  }
}

// Función para buscar cómics en comics18.org
async function searchComics18(query) {
  try {
    const searchUrl = `https://comics18.org/?s=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    
    const comics = [];
    $('.post-item').each((i, elem) => {
      const title = $(elem).find('.post-title a').text().trim();
      const link = $(elem).find('.post-title a').attr('href');
      const thumbnail = $(elem).find('.post-thumb img').attr('src');
      
      if (title && link) {
        comics.push({ title, link, thumbnail });
      }
    });
    
    return comics;
  } catch (error) {
    console.error('Error buscando en comics18:', error);
    return [];
  }
}

// Función para buscar cómics en vercomicsporno.xxx
async function searchVerComicsPorno(query) {
  try {
    const searchUrl = `https://vercomicsporno.xxx/?s=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    
    const comics = [];
    $('.post-item').each((i, elem) => {
      const title = $(elem).find('.post-title a').text().trim();
      const link = $(elem).find('.post-title a').attr('href');
      const thumbnail = $(elem).find('.post-thumb img').attr('src');
      
      if (title && link) {
        comics.push({ title, link, thumbnail });
      }
    });
    
    return comics;
  } catch (error) {
    console.error('Error buscando en vercomicsporno:', error);
    return [];
  }
}

// Función para obtener imágenes del cómic de chochox
async function getChochoxComicImages(comicUrl) {
  try {
    const response = await axios.get(comicUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    
    const images = [];
    
    // Buscar imágenes en diferentes selectores
    $('img').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src && (src.includes('wp-content/uploads') || src.includes('chochox.com'))) {
        images.push(src);
      }
    });

    // También buscar en enlaces directos
    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && (href.includes('.jpg') || href.includes('.png') || href.includes('.webp'))) {
        images.push(href);
      }
    });
    
    return [...new Set(images)]; // Eliminar duplicados
  } catch (error) {
    console.error('Error obteniendo imágenes de chochox:', error);
    return [];
  }
}

// Función para obtener imágenes de comics18
async function getComics18Images(comicUrl) {
  try {
    const response = await axios.get(comicUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    
    const images = [];
    
    // Buscar patrón de imágenes de comics18
    const comicSlug = comicUrl.split('/').pop().replace('/', '');
    
    // Intentar diferentes números de página
    for (let i = 1; i <= 50; i++) {
      const imageUrl = `https://fullcomics18.org/img23/${comicSlug}-${i}.jpg`;
      images.push(imageUrl);
    }
    
    return images;
  } catch (error) {
    console.error('Error obteniendo imágenes de comics18:', error);
    return [];
  }
}

// Función para obtener imágenes de vercomicsporno
async function getVerComicspornoImages(comicUrl) {
  try {
    const response = await axios.get(comicUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    
    const images = [];
    
    // Buscar imágenes en el contenido
    $('.entry-content img').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src && (src.includes('himg.nl') || src.includes('vercomicsporno'))) {
        images.push(src);
      }
    });

    // También buscar enlaces a imágenes
    $('.entry-content a').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && (href.includes('.jpg') || href.includes('.png') || href.includes('.webp'))) {
        images.push(href);
      }
    });
    
    return [...new Set(images)]; // Eliminar duplicados
  } catch (error) {
    console.error('Error obteniendo imágenes de vercomicsporno:', error);
    return [];
  }
}
async function downloadComicImages(images, title, uid) {
  try {
    const tempDir = `./temp_${uid}`;
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const downloadedImages = [];
    
    for (let i = 0; i < Math.min(images.length, 50); i++) { // Límite de 50 imágenes por Railway
      try {
        const response = await axios({
          method: 'GET',
          url: images[i],
          responseType: 'stream',
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        const extension = path.extname(images[i]) || '.jpg';
        const filename = `${i + 1}.${extension.substring(1)}`;
        const filepath = path.join(tempDir, filename);
        
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        downloadedImages.push({ filename, filepath });
      } catch (error) {
        console.error(`Error descargando imagen ${i + 1}:`, error.message);
        continue;
      }
    }

    if (downloadedImages.length === 0) {
      // Limpiar directorio temporal
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
      return null;
    }

    // Crear ZIP
    const zipPath = `./comic_${uid}_${Date.now()}.zip`;
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    for (const img of downloadedImages) {
      archive.file(img.filepath, { name: img.filename });
    }

    await archive.finalize();

    // Esperar a que termine el ZIP
    await new Promise((resolve) => {
      output.on('close', resolve);
    });

    // Limpiar directorio temporal
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }

    return zipPath;
  } catch (error) {
    console.error('Error en descarga:', error);
    return null;
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
    description: "Busca cómics con navegación y descarga",
    example: ".cmx Bulma",
    category: "📚 Cómics"
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
        { label: 'Videos de Maduras', value: 'videosdemadurasx.com', emoji: '🔥' },
        { label: 'Serviporno', value: 'serviporno.com', emoji: '🎭' },
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
      .setPlaceholder('📚 Selecciona la plataforma de cómics')
      .addOptions([
        { label: 'Chochox', value: 'chochox', emoji: '🔥' },
        { label: 'Comics18', value: 'comics18', emoji: '🎨' },
        { label: 'Ver Comics Porno', value: 'vercomicsporno', emoji: '📖' },
      ]);

    return m.reply({
      content: 'Selecciona la plataforma de cómics donde deseas buscar:',
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

  // Navegación de imágenes normales
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

  // Navegación de videos
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
      const video = cache.items[newIndex];
      
      // Extraer thumbnail real del video
      const { thumbnail, title } = await extractVideoThumbnail(video.link);
      
      const embed = new EmbedBuilder()
        .setTitle(`🎬 ${title.slice(0, 80)}...`)
        .setDescription(`**🔥 Clic para ver el contenido 🔥**\n[📺 Ir al enlace](${video.link})\n\n🌐 **Fuente**: ${video.displayLink}`)
        .setColor('#ff1493')
        .setThumbnail(thumbnail || 'https://i.imgur.com/defaultThumbnail.png')
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

  // Navegación de cómics
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
      .setDescription(`[📖 Ver cómic completo](${comic.link})`)
      .setThumbnail(comic.thumbnail || 'https://i.imgur.com/defaultThumbnail.png')
      .setColor('#ff69b4')
      .setFooter({ text: `Cómic ${newIndex + 1} de ${cache.items.length} | ${cache.site}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prevComic').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === 0),
      new ButtonBuilder().setCustomId('nextComic').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === cache.items.length - 1),
      new ButtonBuilder().setCustomId('readComic').setLabel('📖 Leer').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('downloadComic').setLabel('💾 Descargar').setStyle(ButtonStyle.Secondary)
    );

    await i.update({
      embeds: [embed],
      components: [row]
    });
  }

  // Selector de sitios de video
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
        const result = await googleGeneralSearch(query, selectedSite);
        if (!result) return i.update({ content: '❌ Error al realizar la búsqueda.', components: [] });

        const { items, apiUsed } = result;
        if (!items.length) return i.update({ content: '❌ No se encontraron resultados.', components: [] });

        videoSearchCache.set(extractedUid, { items, index: 0, query, site: selectedSite, platform: 'other', apiUsed });

        const video = items[0];
        
        // Extraer thumbnail real del video
        const { thumbnail, title } = await extractVideoThumbnail(video.link);

        const embed = new EmbedBuilder()
          .setTitle(`🎬 ${title.slice(0, 80)}...`)
          .setDescription(`**🔥 Clic para ver el contenido 🔥**\n[📺 Ir al enlace](${video.link})\n\n🌐 **Fuente**: ${video.displayLink}`)
          .setColor('#ff1493')
          .setThumbnail(thumbnail || 'https://i.imgur.com/defaultThumbnail.png')
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
    } catch (error) {
      console.error('Error en búsqueda de video:', error);
      return i.update({
        content: '❌ Error al realizar la búsqueda.',
        components: []
      });
    }
  }

  // Selector de sitios de cómics
  if (i.isStringSelectMenu() && i.customId.startsWith('comicsite-')) {
    const extractedUid = i.customId.split('-')[1];
    if (i.user.id !== extractedUid) return i.deferUpdate();

    const query = pendingComicSearch.get(extractedUid);
    if (!query) return i.deferUpdate();

    const selectedSite = i.values[0];
    pendingComicSearch.delete(extractedUid);

    try {
      let comics = [];
      
      if (selectedSite === 'chochox') {
        comics = await searchChochoxComics(query);
      } else if (selectedSite === 'comics18') {
        comics = await searchComics18(query);
      } else if (selectedSite === 'vercomicsporno') {
        comics = await searchVerComicsPorno(query);
      }

      if (!comics.length) {
        return i.update({ 
          content: '❌ No se encontraron cómics con esa búsqueda.', 
          components: [] 
        });
      }

      comicSearchCache.set(extractedUid, { 
        items: comics, 
        index: 0, 
        query, 
        site: selectedSite 
      });

      const comic = comics[0];

      const embed = new EmbedBuilder()
        .setTitle(`📚 ${comic.title}`)
        .setDescription(`[📖 Ver cómic completo](${comic.link})`)
        .setThumbnail(comic.thumbnail || 'https://i.imgur.com/defaultThumbnail.png')
        .setColor('#ff69b4')
        .setFooter({ text: `Cómic 1 de ${comics.length} | ${selectedSite}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prevComic').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('nextComic').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(comics.length === 1),
        new ButtonBuilder().setCustomId('readComic').setLabel('📖 Leer').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('downloadComic').setLabel('💾 Descargar').setStyle(ButtonStyle.Secondary)
      );

      await i.update({
        content: null,
        embeds: [embed],
        components: [row]
      });

    } catch (error) {
      console.error('Error en búsqueda de cómics:', error);
      return i.update({
        content: '❌ Error al realizar la búsqueda de cómics.',
        components: []
      });
    }
  }

  // Botón para leer cómic
  if (i.isButton() && i.customId === 'readComic') {
    const cache = comicSearchCache.get(uid);
    if (!cache) return i.deferUpdate();

    const comic = cache.items[cache.index];
    
    try {
      let images = [];
      
      if (cache.site === 'chochox') {
        images = await getChochoxComicImages(comic.link);
      } else if (cache.site === 'comics18') {
        images = await getComics18Images(comic.link);
      } else if (cache.site === 'vercomicsporno') {
        images = await getVerComicspornoImages(comic.link);
      }
      
      if (!images.length) {
        return i.reply({ 
          content: '❌ No se pudieron cargar las imágenes del cómic.', 
          ephemeral: true 
        });
      }

      comicImageCache.set(uid, {
        images,
        index: 0,
        title: comic.title,
        site: cache.site
      });

      const embed = new EmbedBuilder()
        .setTitle(`📖 ${comic.title}`)
        .setImage(images[0])
        .setColor('#ff69b4')
        .setFooter({ text: `Página 1 de ${images.length}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prevPage').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('nextPage').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(images.length === 1),
        new ButtonBuilder().setCustomId('backToComics').setLabel('🔙 Volver').setStyle(ButtonStyle.Secondary)
      );

      await i.update({
        embeds: [embed],
        components: [row]
      });

    } catch (error) {
      console.error('Error cargando cómic:', error);
      return i.reply({ 
        content: '❌ Error al cargar el cómic.', 
        ephemeral: true 
      });
    }
  }

  // Navegación de páginas del cómic
  if (i.isButton() && (i.customId === 'prevPage' || i.customId === 'nextPage')) {
    const cache = comicImageCache.get(uid);
    if (!cache) return i.deferUpdate();

    let newIndex = cache.index;
    if (i.customId === 'prevPage' && newIndex > 0) newIndex--;
    if (i.customId === 'nextPage' && newIndex < cache.images.length - 1) newIndex++;
    if (newIndex === cache.index) return i.deferUpdate();

    cache.index = newIndex;

    const embed = new EmbedBuilder()
      .setTitle(`📖 ${cache.title}`)
      .setImage(cache.images[newIndex])
      .setColor('#ff69b4')
      .setFooter({ text: `Página ${newIndex + 1} de ${cache.images.length}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prevPage').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === 0),
      new ButtonBuilder().setCustomId('nextPage').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === cache.images.length - 1),
      new ButtonBuilder().setCustomId('backToComics').setLabel('🔙 Volver').setStyle(ButtonStyle.Secondary)
    );

    await i.update({
      embeds: [embed],
      components: [row]
    });
  }

  // Botón para volver a la lista de cómics
  if (i.isButton() && i.customId === 'backToComics') {
    const cache = comicSearchCache.get(uid);
    if (!cache) return i.deferUpdate();

    const comic = cache.items[cache.index];

    const embed = new EmbedBuilder()
      .setTitle(`📚 ${comic.title}`)
      .setDescription(`[📖 Ver cómic completo](${comic.link})`)
      .setThumbnail(comic.thumbnail || 'https://i.imgur.com/defaultThumbnail.png')
      .setColor('#ff69b4')
      .setFooter({ text: `Cómic ${cache.index + 1} de ${cache.items.length} | ${cache.site}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prevComic').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(cache.index === 0),
      new ButtonBuilder().setCustomId('nextComic').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(cache.index === cache.items.length - 1),
      new ButtonBuilder().setCustomId('readComic').setLabel('📖 Leer').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('downloadComic').setLabel('💾 Descargar').setStyle(ButtonStyle.Secondary)
    );

    await i.update({
      embeds: [embed],
      components: [row]
    });
  }

  // Botón para descargar cómic
  if (i.isButton() && i.customId === 'downloadComic') {
    const cache = comicSearchCache.get(uid);
    if (!cache) return i.deferUpdate();

    const comic = cache.items[cache.index];
    
    await i.deferReply({ ephemeral: true });
    
    try {
      let images = [];
      
      if (cache.site === 'chochox') {
        images = await getChochoxComicImages(comic.link);
      } else if (cache.site === 'comics18') {
        images = await getComics18Images(comic.link);
      } else if (cache.site === 'vercomicsporno') {
        images = await getVerComicspornoImages(comic.link);
      }

      if (!images.length) {
        return i.editReply({
          content: '❌ No se pudieron encontrar imágenes para descargar.',
        });
      }

      await i.editReply({
        content: `📥 Descargando cómic: **${comic.title}**\n⏳ Encontradas ${images.length} imágenes, iniciando descarga...`
      });

      const zipPath = await downloadComicImages(images, comic.title, uid);
      
      if (!zipPath || !fs.existsSync(zipPath)) {
        return i.editReply({
          content: '❌ Error al crear el archivo ZIP. Intenta nuevamente.'
        });
      }

      const stats = fs.statSync(zipPath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      // Discord tiene límite de 8MB para bots normales
      if (fileSizeInMB > 8) {
        fs.unlinkSync(zipPath);
        return i.editReply({
          content: `❌ El archivo es muy grande (${fileSizeInMB.toFixed(2)}MB). Discord permite máximo 8MB.\n\n📋 **Imágenes encontradas:** ${images.length}\n🔗 **Enlace del cómic:** ${comic.link}\n\n*Sugerencia: Visita el enlace directamente para ver todas las imágenes.*`
        });
      }

      const attachment = new AttachmentBuilder(zipPath, {
        name: `${comic.title.replace(/[^a-zA-Z0-9]/g, '_')}.zip`
      });

      await i.editReply({
        content: `✅ **Descarga completada!**\n📚 **Cómic:** ${comic.title}\n📦 **Imágenes:** ${images.length}\n📏 **Tamaño:** ${fileSizeInMB.toFixed(2)}MB`,
        files: [attachment]
      });

      // Limpiar archivo después de 30 segundos
      setTimeout(() => {
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
        }
      }, 30000);

    } catch (error) {
      console.error('Error en descarga:', error);
      await i.editReply({
        content: `❌ Error durante la descarga.\n\n🔗 **Enlace directo:** ${comic.link}\n\n*Puedes visitar el enlace para ver el cómic manualmente.*`
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);