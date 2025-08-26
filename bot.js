const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');

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

  // Búsqueda específica para Hentaila con capítulo 1
  let searchQuery;
  if (site === 'hentaila.com') {
    searchQuery = `${query} "capitulo 1" OR "/1" site:${site}`;
  } else {
    searchQuery = site ? `${query} site:${site}` : query;
  }
  
  const url = `https://www.googleapis.com/customsearch/v1?key=${api.apiKey}&cx=${api.cx}&q=${encodeURIComponent(searchQuery)}&num=10`;
  
  try {
    const res = await axios.get(url, { timeout: 8000 });
    let items = res.data.items || [];
    
    // Filtrado específico para Hentaila
    if (site === 'hentaila.com') {
      items = items.filter(item => {
        const title = (item.title || '').toLowerCase();
        const snippet = (item.snippet || '').toLowerCase();
        const link = (item.link || '').toLowerCase();
        const searchTerms = query.toLowerCase().split(' ');
        
        // Verificar que contenga los términos de búsqueda
        const hasSearchTerms = searchTerms.some(term => 
          title.includes(term) || snippet.includes(term) || link.includes(term)
        );
        
        // Verificar que sea capítulo 1 o contenga referencias al primer capítulo
        const isChapter1 = link.includes('/1') || 
                          title.includes('capitulo 1') || 
                          title.includes('chapter 1') || 
                          snippet.includes('capitulo 1') ||
                          link.match(/\/media\/[^\/]+\/1(?:\/|$|\?)/);
        
        return hasSearchTerms && (isChapter1 || !link.includes('/media/'));
      });
    }
    
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
        { label: 'Hentaila', value: 'hentaila.com', emoji: '🟣' },
        { label: 'Maduras X', value: 'www.videosdemadurasx.com', emoji: '🔥' },
        { label: 'ServiPorno', value: 'www.serviporno.com', emoji: '💋' },
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
      const video = cache.items[newIndex];
      let title = video.title;
      let link = video.link;
      let thumb = video.pagemap?.cse_thumbnail?.[0]?.src;
      const context = video.displayLink;

      // Procesamiento especial para Hentaila
      if (cache.site === 'hentaila.com') {
        // Extraer información del video encontrado
        const urlMatch = link.match(/hentaila\.com\/(?:media|catalogo)\/([^\/\?]+)(?:\/(\d+))?/);
        if (urlMatch) {
          const videoName = urlMatch[1].replace(/\?.*$/, ''); // Remover parámetros de consulta
          
          // Construir URL correcta del video (siempre capítulo 1)
          link = `https://hentaila.com/media/${videoName}/1`;
          
          // Múltiples métodos para obtener el ID del video
          let videoId = null;
          
          // Método 1: Extraer de la URL original
          const urlIdMatch = video.link.match(/\/(\d+)(?:\/|$|\?)/);
          if (urlIdMatch) {
            videoId = urlIdMatch[1];
          }
          
          // Método 2: Buscar en el título
          if (!videoId) {
            const titleIdMatch = video.title.match(/(\d{2,})/);
            if (titleIdMatch) {
              videoId = titleIdMatch[1];
            }
          }
          
          // Método 3: Buscar en el snippet
          if (!videoId) {
            const snippetIdMatch = video.snippet.match(/(\d{2,})/);
            if (snippetIdMatch) {
              videoId = snippetIdMatch[1];
            }
          }
          
          // Método 4: Generar ID basado en el nombre del video
          if (!videoId) {
            // Crear un hash más consistente
            let hash = 0;
            const str = videoName.toLowerCase().replace(/-/g, '');
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash;
            }
            videoId = Math.abs(hash).toString().slice(-3).padStart(3, '1');
          }
          
          // Construir URL de la imagen - siempre intentar cargar
          if (videoId) {
            thumb = `https://cdn.hentaila.com/screenshots/${videoId}/1.jpg`;
          } else {
            // Fallback con el nombre del video
            const fallbackId = videoName.replace(/[^a-z0-9]/gi, '').slice(0, 3).padStart(3, '1');
            thumb = `https://cdn.hentaila.com/screenshots/${fallbackId}/1.jpg`;
          }
          
          console.log(`Hentaila Nav - Video: ${videoName}, ID: ${videoId}, Thumb: ${thumb}`);
        }
      }

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
        let title = video.title;
        let link = video.link;
        let thumb = video.pagemap?.cse_thumbnail?.[0]?.src;
        const context = video.displayLink;

        // Procesamiento especial para Hentaila
        if (selectedSite === 'hentaila.com') {
          // Extraer información del video encontrado
          const urlMatch = link.match(/hentaila\.com\/(?:media|catalogo)\/([^\/\?]+)(?:\/(\d+))?/);
          if (urlMatch) {
            const videoName = urlMatch[1].replace(/\?.*$/, ''); // Remover parámetros de consulta
            
            // Construir URL correcta del video (siempre capítulo 1)
            link = `https://hentaila.com/media/${videoName}/1`;
            
            // Múltiples métodos para obtener el ID del video
            let videoId = null;
            
            // Método 1: Extraer de la URL original
            const urlIdMatch = video.link.match(/\/(\d+)(?:\/|$|\?)/);
            if (urlIdMatch) {
              videoId = urlIdMatch[1];
            }
            
            // Método 2: Buscar en el título
            if (!videoId) {
              const titleIdMatch = video.title.match(/(\d{2,})/);
              if (titleIdMatch) {
                videoId = titleIdMatch[1];
              }
            }
            
            // Método 3: Buscar en el snippet
            if (!videoId) {
              const snippetIdMatch = video.snippet.match(/(\d{2,})/);
              if (snippetIdMatch) {
                videoId = snippetIdMatch[1];
              }
            }
            
            // Método 4: Generar ID basado en el nombre del video
            if (!videoId) {
              // Crear un hash más consistente
              let hash = 0;
              const str = videoName.toLowerCase().replace(/-/g, '');
              for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
              }
              videoId = Math.abs(hash).toString().slice(-3).padStart(3, '1');
            }
            
            // Construir URL de la imagen - siempre intentar cargar
            if (videoId) {
              thumb = `https://cdn.hentaila.com/screenshots/${videoId}/1.jpg`;
            } else {
              // Fallback con el nombre del video
              const fallbackId = videoName.replace(/[^a-z0-9]/gi, '').slice(0, 3).padStart(3, '1');
              thumb = `https://cdn.hentaila.com/screenshots/${fallbackId}/1.jpg`;
            }
            
            console.log(`Hentaila - Video: ${videoName}, ID: ${videoId}, Thumb: ${thumb}`);
          }
        }

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