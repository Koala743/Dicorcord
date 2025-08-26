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

const CHANNELS = new Set([
  '1381953561008541920',
  '1386131661942554685',
  '1299860715884249088'
]);

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

const GOOGLE_API_KEY = "AIzaSyDIrZO_rzRxvf9YvbZK1yPdsj4nrc0nqwY";
const GOOGLE_CX = "34fe95d6cf39d4dd4";

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

async function isImageUrlValid(url) {
  try {
    const res = await axios.head(url, { timeout: 5000 });
    const contentType = res.headers['content-type'];
    return res.status === 200 && contentType && contentType.startsWith('image/');
  } catch {
    return false;
  }
}

const activeChats = new Map();
const imageSearchCache = new Map();
const pendingXXXSearch = new Map();
const xxxSearchCache = new Map();
const mp4SearchCache = new Map();
const xmlSearchCache = new Map();

loadPrefs();
loadPools();

async function googleImageSearchTry(query) {
  for (let api of API_POOLS.google) {
    resetDailyIfNeeded(api);
  }
  for (let i = 0; i < API_POOLS.google.length; i++) {
    const api = API_POOLS.google[i];
    resetDailyIfNeeded(api);
    if (!api.active || api.quotaExhausted || api.dailyRequests >= api.maxDailyRequests) continue;
    api.dailyRequests++;
    savePools();
    const url = `https://www.googleapis.com/customsearch/v1?key=${api.apiKey}&cx=${api.cx}&searchType=image&q=${encodeURIComponent(query)}&num=10`;
    try {
      const res = await axios.get(url, { timeout: 8000 });
      const items = (res.data.items || []).filter(img => img.link && img.link.startsWith('http'));
      if (!items.length) {
        return { items: [], apiUsed: api };
      }
      return { items, apiUsed: api };
    } catch (err) {
      const status = err.response?.status;
      const reason = err.response?.data?.error?.errors?.[0]?.reason || err.response?.data?.error?.message || err.message;
      if (status === 403 || /quota|limited|dailyLimitExceeded|quotaExceeded/i.test(String(reason))) {
        api.quotaExhausted = true;
        savePools();
        continue;
      } else {
        continue;
      }
    }
  }
  return null;
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
    description: "Búsqueda general en Google (texto, imágenes, videos, todo)",
    example: ".bs recetas de pizza",
    category: "🔍 Búsqueda"
  },
  {
    name: ".help",
    description: "Muestra todos los comandos disponibles",
    example: ".help",
    category: "ℹ️ Utilidad"
  },
  {
    name: ".apis",
    description: "Muestra el estado y conteo diario real de las APIs",
    example: ".apis",
    category: "🔧 Herramientas"
  },
  {
    name: ".xxx [búsqueda]",
    description: "Busca contenido adulto con selector de sitios",
    example: ".xxx anime",
    category: "🔞 Adulto"
  },
  {
    name: ".mp4 [búsqueda]",
    description: "Busca videos en YouTube",
    example: ".mp4 música relajante",
    category: "🎬 Video"
  },
  {
    name: ".xml [búsqueda]",
    description: "Busca videos en XNXX",
    example: ".xml búsqueda",
    category: "🔞 Video"
  }
];

const COMMAND_FUNCTIONS = {
  web: async (m, args) => {
    const query = args.join(' ');
    if (!query) return m.reply('⚠️ Debes proporcionar texto para buscar.');
    const result = await googleImageSearchTry(query);
    if (result === null) return m.reply('❌ Todas las APIs de Google están agotadas o fallan.');
    const { items, apiUsed } = result;
    if (!items || !items.length) return m.reply('❌ No se encontraron imágenes válidas.');
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
      .setFooter({ text: `Imagen ${validIndex + 1} de ${items.length} • Usado: ${apiUsed.id} (${apiUsed.dailyRequests}/${apiUsed.maxDailyRequests} hoy)` })
      .setColor('#00c7ff');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prevImage').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(validIndex === 0),
      new ButtonBuilder().setCustomId('nextImage').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(validIndex === items.length - 1)
    );
    await m.channel.send({ embeds: [embed], components: [row] });
  },

  bs: async (m, args) => {
    
  },

  help: async (m) => {
    const embed = new EmbedBuilder().setTitle('📜 Lista de Comandos').setColor('#00c7ff');
    for (let cmd of COMMANDS_LIST) {
      embed.addFields({ name: cmd.name, value: `${cmd.description}\nEjemplo: \`${cmd.example}\` (${cmd.category})` });
    }
    return m.channel.send({ embeds: [embed] });
  },

  apis: async (m) => {
    const embed = new EmbedBuilder().setTitle('🔧 Estado de APIs').setColor('#00c7ff').setTimestamp();
    for (let api of API_POOLS.google) {
      resetDailyIfNeeded(api);
      embed.addFields({
        name: api.id,
        value: `Activo: ${api.active}\nAgotada: ${api.quotaExhausted}\nRequests hoy: ${api.dailyRequests}/${api.maxDailyRequests}\nÚltimo reset: ${api.lastReset}`,
        inline: false
      });
    }
    return m.channel.send({ embeds: [embed] });
  },

  xxx: async (m, args) => {
    const query = args.join(' ');
    if (!query) return m.reply('⚠️ Debes escribir algo para buscar.');
    const uid = m.author.id;
    pendingXXXSearch.set(uid, query);
    const siteSelector = new StringSelectMenuBuilder()
      .setCustomId(`xxxsite-${uid}`)
      .setPlaceholder('🔞 Selecciona el sitio para buscar contenido adulto')
      .addOptions([
        { label: 'Xvideos', value: 'xvideos.es', emoji: '🔴' },
        { label: 'Pornhub', value: 'es.pornhub.com', emoji: '🔵' },
        { label: 'Hentaila', value: 'hentaila.tv', emoji: '🟣' },
      ]);
    return m.reply({
      content: 'Selecciona el sitio donde deseas buscar:',
      components: [new ActionRowBuilder().addComponents(siteSelector)],
      ephemeral: true,
    });
  },

  mp4: async (m, args) => {
    const query = args.join(' ');
    if (!query) return m.reply('⚠️ Debes escribir algo para buscar el video.');
    try {
      const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: query,
          key: GOOGLE_API_KEY,
          maxResults: 10,
          type: 'video'
        }
      });
      const items = res.data.items;
      if (!items || items.length === 0) return m.reply('❌ No se encontró ningún video.');
      
      mp4SearchCache.set(m.author.id, { items, index: 0, query });
      
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
        .setFooter({ text: `Video 1 de ${items.length}` })
        .setTimestamp();
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prevMp4').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('nextMp4').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(items.length === 1)
      );
      
      await m.channel.send({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Error en mp4:', error);
      return m.reply('❌ Error al buscar el video.');
    }
  },

  xml: async (m, args) => {
    const query = args.join(' ');
    if (!query) return m.reply('⚠️ ¡Escribe algo para buscar un video, compa!');
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query + ' site:www.xnxx.es')}&num=10`;
      const res = await axios.get(url);
      const items = res.data.items;
      if (!items || items.length === 0) return m.reply('❌ No se encontraron videos, ¡intenta otra cosa!');
      
      xmlSearchCache.set(m.author.id, { items, index: 0, query });
      
      const video = items[0];
      const title = video.title;
      const link = video.link;
      const context = video.displayLink;
      const thumb = video.pagemap?.cse_thumbnail?.[0]?.src;
      
      const embed = new EmbedBuilder()
        .setTitle(`🎬 ${title.slice(0, 80)}...`)
        .setDescription(`**🔥 Clic para ver el video 🔥**\n[📺 Ir al video](${link})\n\n🌐 **Fuente**: ${context}`)
        .setColor('#ff0066')
        .setThumbnail(thumb || 'https://i.imgur.com/defaultThumbnail.png')
        .setFooter({ text: `Video 1 de ${items.length} | Buscado con Bot_v`, iconURL: 'https://i.imgur.com/botIcon.png' })
        .setTimestamp()
        .addFields({ name: '⚠️ Nota', value: 'Este enlace lleva a la página del video' });
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prevXml').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('nextXml').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(items.length === 1)
      );
      
      await m.channel.send({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Error en xml:', error);
      return m.reply('❌ ¡Algo salió mal, compa! Intenta de nuevo.');
    }
  }
};

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async (m) => {
  if (m.author.bot || !m.content) return;

  const urlRegex = /https?:\/\/[^\s]+/i;

  if (urlRegex.test(m.content)) {
    try {
      const member = await m.guild.members.fetch(m.author.id);
      const allowedRoles = new Set([
        '1305327128341905459',
        '1244056080825454642',
        '1244039798696710212'
      ]);
      const hasAllowedRole = member.roles.cache.some(r => allowedRoles.has(r.id));
      if (!hasAllowedRole) {
        await m.delete().catch(() => {});
        return;
      }
    } catch {}
  }

  if (!m.content.startsWith('.')) return;

  const [command, ...args] = m.content.slice(1).trim().split(/ +/);
  if (COMMAND_FUNCTIONS[command]) {
    try {
      await COMMAND_FUNCTIONS[command](m, args);
    } catch (e) {
      m.reply('❌ Error ejecutando el comando.');
    }
  }
});

client.on('interactionCreate', async (i) => {
  if (i.isButton()) {
    const uid = i.user.id;

    if (i.customId === 'prevImage' || i.customId === 'nextImage') {
      const cache = imageSearchCache.get(uid);
      if (!cache) return i.deferUpdate();
      let newIndex = cache.index;
      if (i.customId === 'prevImage' && newIndex > 0) newIndex--;
      if (i.customId === 'nextImage' && newIndex < cache.items.length - 1) newIndex++;
      
      async function findValidImage(startIndex, direction) {
        let idx = startIndex;
        while (idx >= 0 && idx < cache.items.length) {
          if (await isImageUrlValid(cache.items[idx].link)) return idx;
          idx += direction;
        }
        return -1;
      }
      
      const direction = newIndex < cache.index ? -1 : 1;
      let validIndex = await findValidImage(newIndex, direction);
      if (validIndex === -1 && (await isImageUrlValid(cache.items[cache.index].link))) {
        validIndex = cache.index;
      }
      if (validIndex === -1) return i.deferUpdate();
      
      cache.index = validIndex;
      const img = cache.items[validIndex];
      const api = API_POOLS.google.find(a => a.id === cache.apiId) || null;
      const footerText = api ? `Imagen ${validIndex + 1} de ${cache.items.length} • Usado: ${api.id} (${api.dailyRequests}/${api.maxDailyRequests} hoy)` : `Imagen ${validIndex + 1} de ${cache.items.length}`;
      
      const embed = new EmbedBuilder()
        .setTitle(`📷 Resultados para: ${cache.query}`)
        .setImage(img.link)
        .setDescription(`[Página donde está la imagen](${img.image.contextLink})`)
        .setFooter({ text: footerText })
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

    if (i.customId === 'prevMp4' || i.customId === 'nextMp4') {
      const cache = mp4SearchCache.get(uid);
      if (!cache) return i.deferUpdate();
      
      let newIndex = cache.index;
      if (i.customId === 'prevMp4' && newIndex > 0) newIndex--;
      if (i.customId === 'nextMp4' && newIndex < cache.items.length - 1) newIndex++;
      if (newIndex === cache.index) return i.deferUpdate();
      
      cache.index = newIndex;
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
        .setFooter({ text: `Video ${newIndex + 1} de ${cache.items.length}` })
        .setTimestamp();
      
      await i.update({
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prevMp4').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === 0),
            new ButtonBuilder().setCustomId('nextMp4').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === cache.items.length - 1)
          )
        ]
      });
    }

    if (i.customId === 'prevXml' || i.customId === 'nextXml') {
      const cache = xmlSearchCache.get(uid);
      if (!cache) return i.deferUpdate();
      
      let newIndex = cache.index;
      if (i.customId === 'prevXml' && newIndex > 0) newIndex--;
      if (i.customId === 'nextXml' && newIndex < cache.items.length - 1) newIndex++;
      if (newIndex === cache.index) return i.deferUpdate();
      
      cache.index = newIndex;
      const video = cache.items[newIndex];
      const title = video.title;
      const link = video.link;
      const context = video.displayLink;
      const thumb = video.pagemap?.cse_thumbnail?.[0]?.src;
      
      const embed = new EmbedBuilder()
        .setTitle(`🎬 ${title.slice(0, 80)}...`)
        .setDescription(`**🔥 Clic para ver el video 🔥**\n[📺 Ir al video](${link})\n\n🌐 **Fuente**: ${context}`)
        .setColor('#ff0066')
        .setThumbnail(thumb || 'https://i.imgur.com/defaultThumbnail.png')
        .setFooter({ text: `Video ${newIndex + 1} de ${cache.items.length} | Buscado con Bot_v`, iconURL: 'https://i.imgur.com/botIcon.png' })
        .setTimestamp()
        .addFields({ name: '⚠️ Nota', value: 'Este enlace lleva a la página del video' });
      
      await i.update({
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prevXml').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === 0),
            new ButtonBuilder().setCustomId('nextXml').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === cache.items.length - 1)
          )
        ]
      });
    }

    if (i.customId === 'prevXxx' || i.customId === 'nextXxx') {
      const cache = xxxSearchCache.get(i.user.id);
      if (!cache) return i.deferUpdate();
      
      let newIndex = cache.index;
      if (i.customId === 'prevXxx' && newIndex > 0) newIndex--;
      if (i.customId === 'nextXxx' && newIndex < cache.items.length - 1) newIndex++;
      if (newIndex === cache.index) return i.deferUpdate();
      
      cache.index = newIndex;
      const video = cache.items[newIndex];
      const title = video.title;
      const link = video.link;
      const context = video.displayLink;
      const thumb = video.pagemap?.cse_thumbnail?.[0]?.src;
      
      const embed = new EmbedBuilder()
        .setTitle(`🔞 ${title.slice(0, 80)}...`)
        .setDescription(`**🔥 Clic para ver el contenido 🔥**\n[📺 Ir al enlace](${link})\n\n🌐 **Fuente**: ${context}`)
        .setColor('#ff1493')
        .setThumbnail(thumb || 'https://i.imgur.com/defaultThumbnail.png')
        .setFooter({ text: `Resultado ${newIndex + 1} de ${cache.items.length} | ${cache.site}`, iconURL: 'https://i.imgur.com/botIcon.png' })
        .setTimestamp();
      
      await i.update({
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prevXxx').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === 0),
            new ButtonBuilder().setCustomId('nextXxx').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(newIndex === cache.items.length - 1)
          )
        ]
      });
    }
  }

  if (i.isStringSelectMenu() && i.customId.startsWith('xxxsite-')) {
    const uid = i.customId.split('-')[1];
    if (i.user.id !== uid) return i.deferUpdate();
    
    const query = pendingXXXSearch.get(uid);
    if (!query) return i.deferUpdate();
    
    const selectedSite = i.values[0];
    pendingXXXSearch.delete(uid);
    
    try {
      const searchQuery = `${query} site:${selectedSite}`;
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(searchQuery)}&num=10`;
      const res = await axios.get(url);
      const items = res.data.items;
      
      if (!items || items.length === 0) {
        return i.update({
          content: '❌ No se encontraron resultados para esa búsqueda.',
          components: [],
          ephemeral: true
        });
      }
      
      xxxSearchCache.set(uid, { items, index: 0, query, site: selectedSite });
      
      const video = items[0];
      const title = video.title;
      const link = video.link;
      const context = video.displayLink;
      const thumb = video.pagemap?.cse_thumbnail?.[0]?.src;
      
      const embed = new EmbedBuilder()
        .setTitle(`🔞 ${title.slice(0, 80)}...`)
        .setDescription(`**🔥 Clic para ver el contenido 🔥**\n[📺 Ir al enlace](${link})\n\n🌐 **Fuente**: ${context}`)
        .setColor('#ff1493')
        .setThumbnail(thumb || 'https://i.imgur.com/defaultThumbnail.png')
        .setFooter({ text: `Resultado 1 de ${items.length} | ${selectedSite}`, iconURL: 'https://i.imgur.com/botIcon.png' })
        .setTimestamp();
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prevXxx').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('nextXxx').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(items.length === 1)
      );
      
      await i.update({
        content: null,
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error en búsqueda XXX:', error);
      return i.update({
        content: '❌ Error al realizar la búsqueda.',
        components: [],
        ephemeral: true
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);