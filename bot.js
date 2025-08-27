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

// Removido CHANNELS - ahora funciona en cualquier canal

const LANGUAGES = [
  { label: 'Español', value: 'es', emoji: '🇪🇸', name: 'Español' },
  { label: 'Inglés', value: 'en', emoji: '🇬🇧', name: 'English' },
  { label: 'Francés', value: 'fr', emoji: '🇫🇷', name: 'Français' },
  { label: 'Alemán', value: 'de', emoji: '🇩🇪', name: 'Deutsch' },
  { label: 'Portugués', value: 'pt', emoji: '🇵🇹', name: 'Português' },
  { label: 'Italiano', value: 'it', emoji: '🇮🇹', name: 'Italiano' },
  { label: 'Ruso', value: 'ru', emoji: '🇷🇺', name: 'Русский' },
  { label: 'Japonés', value: 'ja', emoji: '🇯🇵', name: '日本語' },
  { label: 'Chino (Simpl.)', value: 'zh-CN', emoji: '🇨🇳', name: '中文' },
  { label: 'Coreano', value: 'ko', emoji: '🇰🇷', name: '한국어' },
  { label: 'Árabe', value: 'ar', emoji: '🇸🇦', name: 'العربية' },
  { label: 'Hindi', value: 'hi', emoji: '🇮🇳', name: 'हिन्दी' },
  { label: 'Holandés', value: 'nl', emoji: '🇳🇱', name: 'Nederlands' },
  { label: 'Sueco', value: 'sv', emoji: '🇸🇪', name: 'Svenska' },
  { label: 'Polaco', value: 'pl', emoji: '🇵🇱', name: 'Polski' },
  { label: 'Turco', value: 'tr', emoji: '🇹🇷', name: 'Türkçe' }
];

const trans = {
  es: {
    mustReply: '⚠️ Usa el comando citando un mensaje válido.',
    timeout: '⏳ Error en la traducción. Inténtalo de nuevo.',
    alreadyInLang: '⚠️ El mensaje ya está en tu idioma configurado.',
    notAuthorized: '⚠️ No tienes permisos para usar este comando.',
    noSearchQuery: '⚠️ Debes proporcionar texto para buscar.',
    noImagesFound: '❌ No se encontraron imágenes para esa búsqueda.',
    noValidImages: '❌ No se encontraron imágenes válidas.',
    chatDeactivated: '🛑 Chat automático desactivado.',
    languageChanged: '✅ Tu idioma ha sido cambiado exitosamente.',
    currentLanguage: '🌐 Tu idioma actual es',
    selectLanguage: '🌐 Selecciona tu idioma preferido:',
    translationError: '❌ No se pudo traducir el mensaje. Inténtalo más tarde.',
    originalMessage: 'Mensaje original',
    translation: 'Traducción',
    detectedLanguage: 'Idioma detectado',
    searching: '🔍 Buscando imágenes...',
    translating: '🔄 Traduciendo...',
    apiExhausted: '❌ Todas las APIs de Google están agotadas o fallan.',
    noTextToTranslate: '❌ El mensaje no contiene texto para traducir.',
    mentionOneUser: 'Debes mencionar exactamente a un usuario.',
    cannotChatYourself: 'No puedes chatear contigo mismo.',
    chatStarted: '💬 Chat Automático Iniciado',
    noChatActive: '❌ No hay chat activo en este canal.',
    commandError: '❌ Error ejecutando el comando. Inténtalo de nuevo.',
    invalidLanguage: '❌ Idioma no válido. Idiomas disponibles:',
    chatBetween: 'Chat entre',
    results: 'Resultados para',
    imageSource: 'Página donde está la imagen',
    imageCount: 'Imagen',
    of: 'de',
    today: 'hoy',
    commandsList: '📜 Lista de Comandos',
    configuredLanguage: 'Idioma configurado:',
    allChannelsWork: 'Todos los comandos funcionan en cualquier canal',
    example: '📝 Ejemplo:',
    apiStatus: '🔧 Estado de APIs',
    status: 'Estado',
    active: 'Activo',
    inactive: 'Inactivo',
    quota: 'Cuota',
    available: 'Disponible',
    exhausted: 'Agotada',
    requests: 'Requests',
    lastReset: 'Último reset',
    languageConfig: '🌐 Configuración de Idioma',
    canAlsoUse: 'También puedes usar: .id [código] (ej: .id en)',
    selectLang1: '🌍 Seleccionar idioma (Parte 1)',
    selectLang2: '🌎 Seleccionar idioma (Parte 2)',
    languageChangedTitle: '✅ Idioma Cambiado',
    generalSearch: '🔍 Búsqueda:',
    viewResults: 'Ver resultados en Google'
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

// Sistema de traducción automática de mensajes del bot
async function T(userId, messageKey) {
  const userLang = getLang(userId);
  const baseMessage = trans.es[messageKey] || messageKey;
  
  // Si el usuario tiene español o el mensaje no existe, retornar directo
  if (userLang === 'es' || !trans.es[messageKey]) {
    return baseMessage;
  }
  
  // Traducir el mensaje al idioma del usuario
  try {
    const translated = await translate(baseMessage, userLang, 'es');
    return translated ? translated.text : baseMessage;
  } catch {
    return baseMessage;
  }
}

function getLanguageInfo(code) {
  return LANGUAGES.find(l => l.value === code) || { label: code, emoji: '🌐', name: code };
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

// Traductor mejorado con múltiples APIs de respaldo
async function translate(text, targetLang, sourceLang = 'auto') {
  const translationAPIs = [
    // API principal: Lingva
    async () => {
      const response = await axios.get(
        `https://lingva.ml/api/v1/${sourceLang}/${targetLang}/${encodeURIComponent(text)}`,
        { timeout: 8000 }
      );
      return {
        text: response.data.translation,
        from: response.data.info?.detectedSource || response.data.from || sourceLang,
        service: 'Lingva'
      };
    },
    
    // API de respaldo: LibreTranslate
    async () => {
      const response = await axios.post('https://libretranslate.com/translate', {
        q: text,
        source: sourceLang === 'auto' ? 'auto' : sourceLang,
        target: targetLang,
        format: 'text'
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000
      });
      return {
        text: response.data.translatedText,
        from: response.data.detectedLanguage || sourceLang,
        service: 'LibreTranslate'
      };
    },
    
    // API de respaldo: MyMemory
    async () => {
      const langPair = sourceLang === 'auto' ? `|${targetLang}` : `${sourceLang}|${targetLang}`;
      const response = await axios.get(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`,
        { timeout: 8000 }
      );
      return {
        text: response.data.responseData.translatedText,
        from: response.data.matches?.[0]?.source || sourceLang,
        service: 'MyMemory'
      };
    }
  ];

  for (const apiCall of translationAPIs) {
    try {
      const result = await apiCall();
      if (result && result.text && result.text !== text) {
        return result;
      }
    } catch (error) {
      console.log(`Translation API failed: ${error.message}`);
      continue;
    }
  }
  
  return null;
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
    description: "Traduce el mensaje citado a tu idioma configurado",
    example: ".td (respondiendo un mensaje)",
    category: "🌐 Traducción"
  },
  {
    name: ".id",
    description: "Cambia tu idioma preferido o muestra el actual",
    example: ".id o .id es",
    category: "🌐 Idioma"
  },
  {
    name: ".chat @usuario",
    description: "Inicia chat automático entre dos usuarios",
    example: ".chat @amigo",
    category: "💬 Chat"
  },
  {
    name: ".dchat",
    description: "Detiene el chat automático (cualquier usuario puede usarlo)",
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
    if (!query) return m.reply(await T(m.author.id, 'noSearchQuery'));
    
    const loadingMsg = await m.reply(await T(m.author.id, 'searching'));
    
    const result = await googleImageSearchTry(query);
    if (result === null) {
      return loadingMsg.edit(await T(m.author.id, 'apiExhausted'));
    }
    
    const { items, apiUsed } = result;
    if (!items || !items.length) {
      return loadingMsg.edit(await T(m.author.id, 'noValidImages'));
    }
    
    let validIndex = -1;
    for (let i = 0; i < items.length; i++) {
      if (await isImageUrlValid(items[i].link)) {
        validIndex = i;
        break;
      }
    }
    if (validIndex === -1) {
      return loadingMsg.edit(await T(m.author.id, 'noValidImages'));
    }
    
    imageSearchCache.set(m.author.id, { items, index: validIndex, query, apiId: apiUsed.id });
    const embed = new EmbedBuilder()
      .setTitle(`📷 ${await T(m.author.id, 'results')}: ${query}`)
      .setImage(items[validIndex].link)
      .setDescription(`[${await T(m.author.id, 'imageSource')}](${items[validIndex].image.contextLink})`)
      .setFooter({ text: `${await T(m.author.id, 'imageCount')} ${validIndex + 1} ${await T(m.author.id, 'of')} ${items.length} • API: ${apiUsed.id} (${apiUsed.dailyRequests}/${apiUsed.maxDailyRequests} ${await T(m.author.id, 'today')})` })
      .setColor('#00c7ff');
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prevImage').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(validIndex === 0),
      new ButtonBuilder().setCustomId('nextImage').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(validIndex === items.length - 1)
    );
    
    await loadingMsg.edit({ content: '', embeds: [embed], components: [row] });
  },

  bs: async (m, args) => {
    const query = args.join(' ');
    if (!query) return m.reply(await T(m.author.id, 'noSearchQuery'));
    
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const embed = new EmbedBuilder()
      .setTitle(`${await T(m.author.id, 'generalSearch')} ${query}`)
      .setDescription(`[${await T(m.author.id, 'viewResults')}](${searchUrl})`)
      .setColor('#4285f4')
      .setTimestamp();
    
    return m.reply({ embeds: [embed] });
  },

  td: async (m, args) => {
    if (!m.reference?.messageId) return m.reply(await T(m.author.id, 'mustReply'));
    
    try {
      const ref = await m.channel.messages.fetch(m.reference.messageId);
      if (!ref.content || ref.content.length === 0) {
        return m.reply(await T(m.author.id, 'noTextToTranslate'));
      }
      
      const loadingMsg = await m.reply(await T(m.author.id, 'translating'));
      const userLang = getLang(m.author.id);
      const res = await translate(ref.content, userLang);
      
      if (!res) {
        return loadingMsg.edit(await T(m.author.id, 'translationError'));
      }
      
      if (res.from === userLang) {
        return loadingMsg.edit(await T(m.author.id, 'alreadyInLang'));
      }
      
      const fromLangInfo = getLanguageInfo(res.from);
      const toLangInfo = getLanguageInfo(userLang);
      
      const embed = new EmbedBuilder()
        .setColor('#00c7ff')
        .setTitle('🌐 ' + await T(m.author.id, 'translation'))
        .addFields(
          { name: `${await T(m.author.id, 'originalMessage')} ${fromLangInfo.emoji}`, value: ref.content.length > 1000 ? ref.content.substring(0, 1000) + '...' : ref.content },
          { name: `${await T(m.author.id, 'translation')} ${toLangInfo.emoji}`, value: res.text.length > 1000 ? res.text.substring(0, 1000) + '...' : res.text }
        )
        .setFooter({ text: `${await T(m.author.id, 'detectedLanguage')}: ${fromLangInfo.name} → ${toLangInfo.name} | ${res.service}` })
        .setTimestamp();
      
      return loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      console.error('Translation error:', error);
      return m.reply(await T(m.author.id, 'translationError'));
    }
  },

  id: async (m, args) => {
    const currentLang = getLang(m.author.id);
    const currentLangInfo = getLanguageInfo(currentLang);
    
    if (args.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle(await T(m.author.id, 'languageConfig'))
        .setDescription(`${await T(m.author.id, 'currentLanguage')}: ${currentLangInfo.emoji} **${currentLangInfo.name}**\n\n${await T(m.author.id, 'selectLanguage')}`)
        .setColor('#00c7ff')
        .setFooter({ text: await T(m.author.id, 'canAlsoUse') });

      const firstHalf = LANGUAGES.slice(0, 12);
      const secondHalf = LANGUAGES.slice(12);

      const selectMenu1 = new StringSelectMenuBuilder()
        .setCustomId('language_select_1')
        .setPlaceholder(await T(m.author.id, 'selectLang1'))
        .addOptions(firstHalf.map(lang => ({
          label: lang.label,
          value: lang.value,
          emoji: lang.emoji,
          default: lang.value === currentLang
        })));

      const selectMenu2 = new StringSelectMenuBuilder()
        .setCustomId('language_select_2')
        .setPlaceholder(await T(m.author.id, 'selectLang2'))
        .addOptions(secondHalf.map(lang => ({
          label: lang.label,
          value: lang.value,
          emoji: lang.emoji,
          default: lang.value === currentLang
        })));

      const row1 = new ActionRowBuilder().addComponents(selectMenu1);
      const row2 = new ActionRowBuilder().addComponents(selectMenu2);

      return m.reply({ embeds: [embed], components: [row1, row2] });
    }

    const newLang = args[0].toLowerCase();
    const langExists = LANGUAGES.find(l => l.value === newLang);
    
    if (!langExists) {
      const availableLangs = LANGUAGES.map(l => `\`${l.value}\``).join(', ');
      return m.reply(`${await T(m.author.id, 'invalidLanguage')}\n${availableLangs}`);
    }

    prefs[m.author.id] = newLang;
    savePrefs();

    const embed = new EmbedBuilder()
      .setTitle(await T(m.author.id, 'languageChangedTitle'))
      .setDescription(`${await T(m.author.id, 'languageChanged')} ${langExists.emoji} **${langExists.name}**`)
      .setColor('#00ff00')
      .setTimestamp();

    return m.reply({ embeds: [embed] });
  },

  chat: async (m, args) => {
    if (m.mentions.users.size !== 1) return m.reply(await T(m.author.id, 'mentionOneUser'));
    const other = m.mentions.users.first();
    if (other.id === m.author.id) return m.reply(await T(m.author.id, 'cannotChatYourself'));
    activeChats.set(m.channel.id, { users: [m.author.id, other.id] });
    const m1 = await m.guild.members.fetch(m.author.id);
    const m2 = await m.guild.members.fetch(other.id);
    const embed = new EmbedBuilder()
      .setTitle(await T(m.author.id, 'chatStarted'))
      .setDescription(`${await T(m.author.id, 'chatBetween')} **${m1.nickname || m1.user.username}** y **${m2.nickname || m2.user.username}**`)
      .setThumbnail(m1.user.displayAvatarURL({ size: 64 }))
      .setImage(m2.user.displayAvatarURL({ size: 64 }))
      .setColor('#00c7ff')
      .setTimestamp();
    return m.channel.send({ embeds: [embed] });
  },

  dchat: async (m, args) => {
    if (activeChats.has(m.channel.id)) {
      activeChats.delete(m.channel.id);
      return m.reply(await T(m.author.id, 'chatDeactivated'));
    }
    return m.reply(await T(m.author.id, 'noChatActive'));
  },

  help: async (m) => {
    const userLang = getLang(m.author.id);
    const langInfo = getLanguageInfo(userLang);
    
    const embed = new EmbedBuilder()
      .setTitle(await T(m.author.id, 'commandsList'))
      .setDescription(`${langInfo.emoji} ${await T(m.author.id, 'configuredLanguage')} **${langInfo.name}**`)
      .setColor('#00c7ff')
      .setFooter({ text: await T(m.author.id, 'allChannelsWork') });
      
    for (let cmd of COMMANDS_LIST) {
      embed.addFields({ 
        name: `${cmd.category} ${cmd.name}`, 
        value: `${cmd.description}\n${await T(m.author.id, 'example')} \`${cmd.example}\``,
        inline: false
      });
    }
    return m.channel.send({ embeds: [embed] });
  },

  apis: async (m) => {
    const embed = new EmbedBuilder()
      .setTitle(await T(m.author.id, 'apiStatus'))
      .setColor('#00c7ff')
      .setTimestamp();
      
    for (let api of API_POOLS.google) {
      resetDailyIfNeeded(api);
      const status = api.active ? '✅' : '❌';
      const quota = api.quotaExhausted ? '🔴' : '🟢';
      
      embed.addFields({
        name: `${status} ${api.id}`,
        value: `**${await T(m.author.id, 'status')}:** ${api.active ? await T(m.author.id, 'active') : await T(m.author.id, 'inactive')}\n**${await T(m.author.id, 'quota')}:** ${quota} ${api.quotaExhausted ? await T(m.author.id, 'exhausted') : await T(m.author.id, 'available')}\n**${await T(m.author.id, 'requests')}:** ${api.dailyRequests}/${api.maxDailyRequests}\n**${await T(m.author.id, 'lastReset')}:** ${api.lastReset}`,
        inline: true
      });
    }
    return m.channel.send({ embeds: [embed] });
  }
    for (let api of API_POOLS.google) {
      resetDailyIfNeeded(api);
      const status = api.active ? '✅' : '❌';
      const quota = api.quotaExhausted ? '🔴' : '🟢';
      
      embed.addFields({
        name: `${status} ${api.id}`,
        value: `**${await T(m.author.id, 'status')}:** ${api.active ? await T(m.author.id, 'active') : await T(m.author.id, 'inactive')}\n**${await T(m.author.id, 'quota')}:** ${quota} ${api.quotaExhausted ? await T(m.author.id, 'exhausted') : await T(m.author.id, 'available')}\n**${await T(m.author.id, 'requests')}:** ${api.dailyRequests}/${api.maxDailyRequests}\n**${await T(m.author.id, 'lastReset')}:** ${api.lastReset}`,
        inline: true
      });
    }
    return m.channel.send({ embeds: [embed] });
  }
};

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  console.log(`📊 ${LANGUAGES.length} idiomas soportados`);
  console.log(`🔧 ${API_POOLS.google.length} APIs de Google configuradas`);
  console.log(`🌍 Bot disponible para TODOS los usuarios en CUALQUIER servidor`);
  console.log(`🚀 Sin restricciones de roles o canales específicos`);
});

client.on('messageCreate', async (m) => {
  if (m.author.bot || !m.content) return;

  if (!m.content.startsWith('.')) return;

  const [command, ...args] = m.content.slice(1).trim().split(/ +/);
  if (COMMAND_FUNCTIONS[command]) {
    try {
      await COMMAND_FUNCTIONS[command](m, args);
    } catch (e) {
      console.error(`Error ejecutando comando ${command}:`, e);
      m.reply(await T(m.author.id, 'commandError'));
    }
  }
});

client.on('interactionCreate', async (i) => {
  if (i.isButton()) {
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
    const footerText = api ? `Imagen ${validIndex + 1} de ${cache.items.length} • API: ${api.id} (${api.dailyRequests}/${api.maxDailyRequests} hoy)` : `Imagen ${validIndex + 1} de ${cache.items.length}`;
    
    const embed = new EmbedBuilder()
      .setTitle(`📷 ${await T(uid, 'results')}: ${cache.query}`)
      .setImage(img.link)
      .setDescription(`[${await T(uid, 'imageSource')}](${img.image.contextLink})`)
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
  
  if (i.isStringSelectMenu()) {
    if (i.customId.startsWith('language_select_')) {
      const selectedLang = i.values[0];
      const langInfo = getLanguageInfo(selectedLang);
      
      prefs[i.user.id] = selectedLang;
      savePrefs();
      
      const embed = new EmbedBuilder()
        .setTitle(await T(i.user.id, 'languageChangedTitle'))
        .setDescription(`${await T(i.user.id, 'languageChanged')} ${langInfo.emoji} **${langInfo.name}**`)
        .setColor('#00ff00')
        .setTimestamp();
        
      await i.update({ embeds: [embed], components: [] });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);