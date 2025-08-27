const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
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

const LANGUAGES = [
  { label: 'Español', value: 'es', emoji: '🇪🇸' },
  { label: 'Inglés', value: 'en', emoji: '🇬🇧' },
  { label: 'Francés', value: 'fr', emoji: '🇫🇷' },
  { label: 'Alemán', value: 'de', emoji: '🇩🇪' },
  { label: 'Portugués', value: 'pt', emoji: '🇵🇹' },
  { label: 'Italiano', value: 'it', emoji: '🇮🇹' },
  { label: 'Ruso', value: 'ru', emoji: '🇷🇺' },
  { label: 'Japonés', value: 'ja', emoji: '🇯🇵' },
  { label: 'Chino (Simpl.)', value: 'zh-CN', emoji: '🇨🇳' },
  { label: 'Coreano', value: 'ko', emoji: '🇰🇷' },
  { label: 'Árabe', value: 'ar', emoji: '🇸🇦' },
  { label: 'Hindi', value: 'hi', emoji: '🇮🇳' }
];

const trans = {
  es: {
    mustReply: '⚠️ Usa el comando con un mensaje válido.',
    timeout: '⏳ Tiempo agotado. Usa el comando nuevamente.',
    alreadyInLang: '⚠️ El mensaje ya está en tu idioma.',
    notAuthorized: '⚠️ No eres el usuario autorizado.',
    noSearchQuery: '⚠️ Debes proporcionar texto para buscar.',
    noImagesFound: '❌ No se encontraron imágenes para esa búsqueda.',
    noValidImages: '❌ No se encontraron imágenes válidas.',
    chatDeactivated: '🛑 Chat automático desactivado.'
  }
};

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

function getLang(u) {
  return prefs[u] || 'es';
}

function T(u, k) {
  return trans.es[k] || '';
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

async function translate(text, lang) {
  try {
    const r = await axios.get(`https://lingva.ml/api/v1/auto/${lang}/${encodeURIComponent(text)}`);
    return r.data?.translation ? { text: r.data.translation, from: r.data.from } : null;
  } catch {
    return null;
  }
}

const activeChats = new Map();
const imageSearchCache = new Map();

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
    name: ".td",
    description: "Traduce el mensaje citado al idioma del usuario",
    example: ".td (respondiendo un mensaje)",
    category: "🌐 Traducción"
  },
  {
    name: ".chat @usuario",
    description: "Inicia chat automático entre dos usuarios",
    example: ".chat @amigo",
    category: "💬 Chat"
  },
  {
    name: ".dchat",
    description: "Detiene el chat automático (solo flux_fer)",
    example: ".dchat",
    category: "💬 Chat"
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
  }
];

const COMMAND_FUNCTIONS = {
  web: async (m, args) => {
    const query = args.join(' ');
    if (!query) return m.reply(T(m.author.id, 'noSearchQuery'));
    const result = await googleImageSearchTry(query);
    if (result === null) return m.reply('❌ Todas las APIs de Google están agotadas o fallan.');
    const { items, apiUsed } = result;
    if (!items || !items.length) return m.reply(T(m.author.id, 'noValidImages'));
    let validIndex = -1;
    for (let i = 0; i < items.length; i++) {
      if (await isImageUrlValid(items[i].link)) {
        validIndex = i;
        break;
      }
    }
    if (validIndex === -1) return m.reply(T(m.author.id, 'noValidImages'));
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
    // Lugar para implementar la función específica del comando .bs
  },

  td: async (m, args) => {
    if (!CHANNELS.has(m.channel.id) || !m.reference?.messageId) return m.reply(T(m.author.id, 'mustReply'));
    try {
      const ref = await m.channel.messages.fetch(m.reference.messageId);
      const res = await translate(ref.content, getLang(m.author.id));
      if (!res) return m.reply(T(m.author.id, 'timeout'));
      if (res.from === getLang(m.author.id)) return m.reply(T(m.author.id, 'alreadyInLang'));
      const embed = new EmbedBuilder()
        .setColor('#00c7ff')
        .setDescription(`${LANGUAGES.find(l => l.value === getLang(m.author.id)).emoji} : ${res.text}`);
      return m.reply({ embeds: [embed] });
    } catch {
      return m.reply('No se pudo traducir el mensaje.');
    }
  },

  chat: async (m, args) => {
    if (m.mentions.users.size !== 1) return m.reply('Debes mencionar exactamente a un usuario.');
    const other = m.mentions.users.first();
    if (other.id === m.author.id) return m.reply('No puedes chatear contigo mismo.');
    activeChats.set(m.channel.id, { users: [m.author.id, other.id] });
    const m1 = await m.guild.members.fetch(m.author.id);
    const m2 = await m.guild.members.fetch(other.id);
    const embed = new EmbedBuilder()
      .setTitle('💬 Chat Automático Iniciado')
      .setDescription(`Chat entre **${m1.nickname || m1.user.username}** y **${m2.nickname || m2.user.username}**`)
      .setThumbnail(m1.user.displayAvatarURL({ size: 64 }))
      .setImage(m2.user.displayAvatarURL({ size: 64 }))
      .setColor('#00c7ff')
      .setTimestamp();
    return m.channel.send({ embeds: [embed] });
  },

  dchat: async (m, args) => {
    if (m.author.username !== 'flux_fer') return m.reply(T(m.author.id, 'notAuthorized'));
    if (activeChats.has(m.channel.id)) {
      activeChats.delete(m.channel.id);
      return m.reply(T(m.author.id, 'chatDeactivated'));
    }
    return m.reply(T(m.author.id, 'mustReply'));
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
  if (!i.isButton()) return;
  const uid = i.user.id;
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
});

client.login(process.env.DISCORD_TOKEN);