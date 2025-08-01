const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js")
const axios = require("axios")
const fs = require("fs")

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
})

const CHANNELS = new Set(["1381953561008541920", "1386131661942554685", "1299860715884249088"])

const LANGUAGES = [
  { label: "Español", value: "es", emoji: "🇪🇸" },
  { label: "Inglés", value: "en", emoji: "🇬🇧" },
  { label: "Francés", value: "fr", emoji: "🇫🇷" },
  { label: "Alemán", value: "de", emoji: "🇩🇪" },
  { label: "Portugués", value: "pt", emoji: "🇵🇹" },
  { label: "Italiano", value: "it", emoji: "🇮🇹" },
  { label: "Ruso", value: "ru", emoji: "🇷🇺" },
  { label: "Japonés", value: "ja", emoji: "🇯🇵" },
  { label: "Coreano", value: "ko", emoji: "🇰🇷" },
  { label: "Chino (Simpl.)", value: "zh-CN", emoji: "🇨🇳" },
]

const ROLE_CONFIG = {
  restricted: "1244039798696710211",
  allowed: new Set(["1244056080825454642", "1305327128341905459", "1244039798696710212"]),
}

const API_POOLS = {
  google: [
    {
      id: "google_1",
      apiKey: "AIzaSyDIrZO_rzRxvf9YvbZK1yPdsj4nrc0nqwY",
      cx: "34fe95d6cf39d4dd4",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString(),
    },
    {
      id: "google_2",
      apiKey: "AIzaSyCOY3_MeHHHLiOXq2tAUypm1aHbpkFwQ80",
      cx: "f21e2b3468dc449e2",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString(),
    },
    {
      id: "google_3",
      apiKey: "TU_API_KEY_3_AQUI",
      cx: "TU_CX_3_AQUI",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString(),
    },
    {
      id: "google_4",
      apiKey: "TU_API_KEY_4_AQUI",
      cx: "TU_CX_4_AQUI",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString(),
    },
    {
      id: "google_5",
      apiKey: "TU_API_KEY_5_AQUI",
      cx: "TU_CX_5_AQUI",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString(),
    },
  ],

  youtube: [
    {
      id: "youtube_1",
      apiKey: "AIzaSyDIrZO_rzRxvf9YvbZK1yPdsj4nrc0nqwY",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 10000,
      lastReset: new Date().toDateString(),
    },
    {
      id: "youtube_2",
      apiKey: "AIzaSyCOY3_MeHHHLiOXq2tAUypm1aHbpkFwQ80",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 10000,
      lastReset: new Date().toDateString(),
    },
    {
      id: "youtube_3",
      apiKey: "TU_YOUTUBE_API_KEY_3",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 10000,
      lastReset: new Date().toDateString(),
    },
  ],
}

const COMIC_SITES = [
  { label: "Chochox", value: "chochox.com", emoji: "🔴" },
  { label: "ReyComix", value: "reycomix.com", emoji: "🔵" },
  { label: "Ver Comics Porno", value: "ver-comics-porno.com", emoji: "🟣" },
  { label: "Hitomi", value: "hitomi.la", emoji: "🟠" },
  { label: "Ver Comics Porno XXX", value: "vercomicsporno.xxx", emoji: "🟢" },
]

const COMMANDS_LIST = [
  {
    name: ".web [búsqueda]",
    description: "Busca imágenes en Google con navegación por flechas",
    example: ".web gatos",
    category: "🔍 Búsqueda",
  },
  {
    name: ".bs [búsqueda]",
    description: "Búsqueda general en Google (texto, imágenes, videos, todo)",
    example: ".bs recetas de pizza",
    category: "🔍 Búsqueda",
  },
  {
    name: ".cmx [búsqueda]",
    description: "Busca comics adultos en sitios especializados",
    example: ".cmx naruto",
    category: "🔞 Adulto",
  },
  {
    name: ".xxx [búsqueda]",
    description: "Busca videos adultos en sitios especializados",
    example: ".xxx anime",
    category: "🔞 Adulto",
  },
  {
    name: ".mp4 [búsqueda]",
    description: "Busca videos en YouTube y devuelve el enlace",
    example: ".mp4 música relajante",
    category: "🎬 Video",
  },
  {
    name: ".xml [búsqueda]",
    description: "Busca videos en XNXX específicamente",
    example: ".xml búsqueda",
    category: "🔞 Adulto",
  },
  {
    name: ".roblox [juego]",
    description: "Busca servidores de Roblox para un juego específico",
    example: ".roblox Adopt Me",
    category: "🎮 Gaming",
  },
  {
    name: ".td",
    description: "Traduce un mensaje (responde a un mensaje para traducir)",
    example: "Responder a un mensaje con .td",
    category: "🌍 Traducción",
  },
  {
    name: ".auto [idioma]",
    description: "Activa traducción automática de tus mensajes al idioma seleccionado",
    example: ".auto en (para inglés)",
    category: "🌍 Traducción",
  },
  {
    name: ".dauto",
    description: "Desactiva la traducción automática de tus mensajes",
    example: ".dauto",
    category: "🌍 Traducción",
  },
  {
    name: ".chat @usuario",
    description: "Inicia chat con traducción automática entre dos usuarios",
    example: ".chat @amigo",
    category: "💬 Chat",
  },
  {
    name: ".dchat",
    description: "Finaliza el chat con traducción automática (solo admin)",
    example: ".dchat",
    category: "💬 Chat",
  },
  {
    name: ".ID",
    description: "Cambia tu idioma predeterminado para traducciones",
    example: ".ID",
    category: "⚙️ Configuración",
  },
  {
    name: ".lista",
    description: "Muestra todos los comandos disponibles con detalles",
    example: ".lista",
    category: "ℹ️ Ayuda",
  },
  {
    name: ".apistats",
    description: "Muestra estadísticas de uso de APIs (solo admin)",
    example: ".apistats",
    category: "📊 Admin",
  },
]

class APIManager {
  constructor() {
    this.loadAPIStatus()
    this.resetDailyCounters()
  }

  getNextAvailableAPI(type = "google") {
    const apis = API_POOLS[type]
    if (!apis) return null

    for (const api of apis) {
      if (api.active && !api.quotaExhausted && api.dailyRequests < api.maxDailyRequests) {
        return api
      }
    }

    this.resetDailyCounters()

    for (const api of apis) {
      if (api.active && !api.quotaExhausted) {
        return api
      }
    }

    return null
  }

  markAPIAsExhausted(apiId, type = "google") {
    const apis = API_POOLS[type]
    const api = apis.find((a) => a.id === apiId)
    if (api) {
      api.quotaExhausted = true
      console.log(`⚠️ API ${apiId} marcada como agotada. Cambiando a la siguiente...`)
      this.saveAPIStatus()
    }
  }

  incrementRequestCount(apiId, type = "google") {
    const apis = API_POOLS[type]
    const api = apis.find((a) => a.id === apiId)
    if (api) {
      api.dailyRequests++

      if (api.dailyRequests >= api.maxDailyRequests) {
        api.quotaExhausted = true
        console.log(`📊 API ${apiId} alcanzó el límite diario (${api.maxDailyRequests} requests)`)
      }

      this.saveAPIStatus()
    }
  }

  resetDailyCounters() {
    const today = new Date().toDateString()

    Object.keys(API_POOLS).forEach((type) => {
      API_POOLS[type].forEach((api) => {
        if (api.lastReset !== today) {
          api.dailyRequests = 0
          api.quotaExhausted = false
          api.lastReset = today
          console.log(`🔄 Reseteando contadores para API ${api.id}`)
        }
      })
    })

    this.saveAPIStatus()
  }

  saveAPIStatus() {
    try {
      fs.writeFileSync("./apiStatus.json", JSON.stringify(API_POOLS, null, 2))
    } catch (error) {
      console.error("Error guardando estado de APIs:", error)
    }
  }

  loadAPIStatus() {
    try {
      const data = fs.readFileSync("./apiStatus.json", "utf8")
      const savedPools = JSON.parse(data)

      Object.keys(savedPools).forEach((type) => {
        if (API_POOLS[type]) {
          savedPools[type].forEach((savedApi) => {
            const currentApi = API_POOLS[type].find((a) => a.id === savedApi.id)
            if (currentApi) {
              currentApi.dailyRequests = savedApi.dailyRequests || 0
              currentApi.quotaExhausted = savedApi.quotaExhausted || false
              currentApi.lastReset = savedApi.lastReset || new Date().toDateString()
            }
          })
        }
      })
    } catch (error) {
      console.log("📝 Creando nuevo archivo de estado de APIs...")
      this.saveAPIStatus()
    }
  }

  getAPIStats(type = "google") {
    const apis = API_POOLS[type]
    const active = apis.filter((a) => a.active && !a.quotaExhausted).length
    const total = apis.length
    const totalRequests = apis.reduce((sum, api) => sum + api.dailyRequests, 0)

    return { active, total, totalRequests }
  }

  getCurrentAPIInfo(type = "google") {
    const api = this.getNextAvailableAPI(type)
    if (!api) return null

    const remaining = api.maxDailyRequests - api.dailyRequests
    return {
      id: api.id,
      remaining: remaining,
      used: api.dailyRequests,
      max: api.maxDailyRequests,
    }
  }
}

const apiManager = new APIManager()

async function makeGoogleAPIRequest(url, type = "google") {
  let attempts = 0
  const maxAttempts = API_POOLS[type].length

  while (attempts < maxAttempts) {
    const api = apiManager.getNextAvailableAPI(type)

    if (!api) {
      throw new Error(`❌ Todas las APIs de ${type} están agotadas. Intenta mañana.`)
    }

    const finalUrl = url.replace("GOOGLE_API_KEY", api.apiKey).replace("GOOGLE_CX", api.cx)

    try {
      console.log(`🔄 Usando API ${api.id} (Request #${api.dailyRequests + 1})`)

      const response = await axios.get(finalUrl)

      apiManager.incrementRequestCount(api.id, type)

      return response
    } catch (error) {
      attempts++

      if (
        error.response?.status === 429 ||
        error.response?.data?.error?.message?.includes("quota") ||
        error.response?.data?.error?.message?.includes("limit")
      ) {
        console.log(`⚠️ Cuota agotada en API ${api.id}. Cambiando a la siguiente...`)
        apiManager.markAPIAsExhausted(api.id, type)
        continue
      }

      if (attempts >= maxAttempts) {
        throw error
      }
    }
  }

  throw new Error(`❌ Todas las APIs de ${type} fallaron después de ${maxAttempts} intentos`)
}

const activeChats = new Map()
const imageSearchCache = new Map()
const pendingXXXSearch = new Map()
const xxxSearchCache = new Map()
const pendingComicSearch = new Map()
const comicSearchCache = new Map()
const generalSearchCache = new Map()
const robloxSearchCache = new Map()
const autoTranslateUsers = new Map()
let prefs = {}

const translations = {
  es: {
    mustReply: "⚠️ Usa el comando respondiendo a un mensaje.",
    timeout: "⏳ Tiempo agotado. Usa el comando nuevamente.",
    alreadyInLang: "⚠️ El mensaje ya está en tu idioma.",
    notYours: "⚠️ No puedes traducir tu propio idioma.",
    langSaved: "🎉 Idioma guardado exitosamente.",
    chatActivated: "💬 Chat de traducción automática ACTIVADO para los usuarios seleccionados.",
    chatDeactivated: "🛑 Chat de traducción automática FINALIZADO.",
    chatNoSession: "❌ No hay chat activo para finalizar.",
    notAuthorized: "⚠️ No eres el usuario autorizado para usar este comando.",
    noSearchQuery: "⚠️ Debes escribir algo para buscar.",
    noValidImages: "❌ No se encontraron imágenes válidas.",
    sameLanguage: "⚠️ Ambos usuarios tienen el mismo idioma, no se inició el chat.",
    inviteRestricted:
      "⚠️ No podés enviar enlaces de invitación porque tenés el rol de Miembro, el cual está restringido. Tu mensaje fue eliminado automáticamente.",
    autoTranslateOn: "🔄 Traducción automática ACTIVADA. Tus mensajes se traducirán a",
    autoTranslateOff: "🛑 Traducción automática DESACTIVADA.",
    autoTranslateNotActive: "⚠️ No tienes traducción automática activa.",
    invalidLanguage: "⚠️ Idioma no válido. Usa códigos como: es, en, fr, de, pt, it, ru, ja, ko, zh-CN",
  },
  en: {
    mustReply: "⚠️ Use the command by replying to a message.",
    timeout: "⏳ Time ran out. Use the command again.",
    alreadyInLang: "⚠️ Message already in your language.",
    notYours: "⚠️ You can't translate your own language.",
    langSaved: "🎉 Language saved successfully.",
    chatActivated: "💬 Auto-translate chat ACTIVATED for selected users.",
    chatDeactivated: "🛑 Auto-translate chat STOPPED.",
    chatNoSession: "❌ No active chat session to stop.",
    notAuthorized: "⚠️ You are not authorized to use this command.",
    noSearchQuery: "⚠️ You must provide a search query.",
    noValidImages: "❌ No valid images found.",
    sameLanguage: "⚠️ Both users have the same language, chat not started.",
    inviteRestricted:
      "⚠️ You are not allowed to send invite links because you have the Member role, which is restricted. Your message was automatically deleted.",
    autoTranslateOn: "🔄 Auto-translate ACTIVATED. Your messages will be translated to",
    autoTranslateOff: "🛑 Auto-translate DEACTIVATED.",
    autoTranslateNotActive: "⚠️ You don't have auto-translate active.",
    invalidLanguage: "⚠️ Invalid language. Use codes like: es, en, fr, de, pt, it, ru, ja, ko, zh-CN",
  },
}

function loadPreferences() {
  try {
    prefs = JSON.parse(fs.readFileSync("./langPrefs.json"))
  } catch {
    prefs = {}
  }
}

function savePreferences() {
  fs.writeFileSync("./langPrefs.json", JSON.stringify(prefs, null, 2))
}

function getUserLanguage(userId) {
  return prefs[userId] || "es"
}

function getTranslation(userId, key) {
  const userLang = getUserLanguage(userId)
  return translations[userLang]?.[key] || translations["es"][key]
}

async function isImageUrlValid(url) {
  try {
    const response = await axios.head(url, { timeout: 5000 })
    const contentType = response.headers["content-type"]
    return response.status === 200 && contentType && contentType.startsWith("image/")
  } catch {
    return false
  }
}

async function translateText(text, targetLang) {
  try {
    const response = await axios.get(`https://lingva.ml/api/v1/auto/${targetLang}/${encodeURIComponent(text)}`)
    if (response.data?.translation) {
      return {
        text: response.data.translation,
        from: response.data.from,
      }
    }
  } catch (error) {
    console.error("Translation error:", error.message)
  }
  return null
}

async function sendWarning(interactionOrMessage, text) {
  const reply = await interactionOrMessage.reply({ content: text, ephemeral: true })
  setTimeout(() => {
    if (reply?.delete) reply.delete().catch(() => {})
  }, 5000)
}

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`)
  loadPreferences()
})

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content) return

  await handleInviteRestrictions(message)

  await handleAutoTranslate(message)

  await handleChatTranslation(message)

  if (message.content.startsWith(".")) {
    await handleCommands(message)
  }
})

client.on("interactionCreate", async (interaction) => {
  if (interaction.isStringSelectMenu()) {
    await handleSelectMenu(interaction)
  } else if (interaction.isButton()) {
    await handleButtonInteraction(interaction)
  }
})

async function handleAutoTranslate(message) {
  const userId = message.author.id
  const autoTranslateInfo = autoTranslateUsers.get(userId)

  if (!autoTranslateInfo || message.content.startsWith(".")) return

  const { targetLang } = autoTranslateInfo
  const userLang = getUserLanguage(userId)

  if (userLang === targetLang) return

  try {
    const result = await translateText(message.content, targetLang)
    if (result && result.text && result.from !== targetLang) {
      const targetLangEmoji = LANGUAGES.find((l) => l.value === targetLang)?.emoji || "🌐"
      const embed = new EmbedBuilder()
        .setColor("#00ff88")
        .setDescription(`${targetLangEmoji} **Auto-traducido:** ${result.text}`)
        .setFooter({ text: `Mensaje original de ${message.author.username}` })

      await message.channel.send({ embeds: [embed] })
    }
  } catch (error) {
    console.error("Error en auto-traducción:", error)
  }
}

async function handleInviteRestrictions(message) {
  const inviteRegex = /(discord.gg\/|discord.com\/invite\/)/i

  if (inviteRegex.test(message.content) && message.member) {
    const hasRestricted = message.member.roles.cache.has(ROLE_CONFIG.restricted)
    const hasAllowed = message.member.roles.cache.some((role) => ROLE_CONFIG.allowed.has(role.id))

    if (hasRestricted && !hasAllowed) {
      try {
        await message.delete()
        const userLang = getUserLanguage(message.author.id)
        const warning = getTranslation(message.author.id, "inviteRestricted")
        await message.author.send({ content: warning })
      } catch (error) {
        console.error("Error handling invite restriction:", error.message)
      }
      return true
    }
  }
  return false
}

async function handleChatTranslation(message) {
  const chat = activeChats.get(message.channel.id)
  if (!chat) return

  const { users } = chat
  if (!users.includes(message.author.id)) return

  const otherUserId = users.find((u) => u !== message.author.id)
  const toLang = getUserLanguage(otherUserId)
  const raw = message.content.trim()

  try {
    const result = await translateText(raw, toLang)
    if (result && result.text) {
      const targetLangEmoji = LANGUAGES.find((l) => l.value === toLang)?.emoji || "🌐"
      const embed = new EmbedBuilder()
        .setColor("#00c7ff")
        .setDescription(
          `${targetLangEmoji} ${result.text}\n\n*<@${message.author.id}> (${getUserLanguage(message.author.id)})*`,
        )

      await message.channel.send({ embeds: [embed] })
    } else {
      await message.channel.send({
        content: `⚠️ No se pudo traducir el mensaje de <@${message.author.id}> al idioma de <@${otherUserId}>.`,
        ephemeral: true,
      })
    }
  } catch (error) {
    console.error("Error en traducción:", error)
    await message.channel.send({
      content: `❌ Error al traducir el mensaje al idioma de <@${otherUserId}>.`,
      ephemeral: true,
    })
  }
}

async function handleCommands(message) {
  const [command, ...args] = message.content.slice(1).trim().split(/ +/)
  const cmd = command.toLowerCase()

  switch (cmd) {
    case "web":
      await handleWebSearch(message, args)
      break
    case "bs":
      await handleGeneralSearch(message, args)
      break
    case "xxx":
      await handleAdultSearch(message, args)
      break
    case "cmx":
      await handleComicSearch(message, args)
      break
    case "mp4":
      await handleVideoSearch(message, args)
      break
    case "xml":
      await handleXMLSearch(message, args)
      break
    case "roblox":
      await handleRobloxSearch(message, args)
      break
    case "td":
      await handleTranslate(message)
      break
    case "auto":
      await handleAutoTranslateCommand(message, args)
      break
    case "dauto":
      await handleDisableAutoTranslate(message)
      break
    case "chat":
      await handleChatCommand(message)
      break
    case "dchat":
      await handleDisableChatCommand(message)
      break
    case "id":
      await handleLanguageSelection(message)
      break
    case "lista":
      await handleCommandsList(message)
      break
    case "apistats":
      if (message.author.username !== "flux_fer") {
        return sendWarning(message, "⚠️ Solo el administrador puede ver las estadísticas.")
      }

      const googleStats = apiManager.getAPIStats("google")
      const youtubeStats = apiManager.getAPIStats("youtube")

      const embed = new EmbedBuilder()
        .setTitle("📊 Estadísticas de APIs")
        .setColor("#00c7ff")
        .addFields(
          {
            name: "🔍 Google Custom Search",
            value: `Activas: ${googleStats.active}/${googleStats.total}\nRequests hoy: ${googleStats.totalRequests}`,
            inline: true,
          },
          {
            name: "🎬 YouTube Data API",
            value: `Activas: ${youtubeStats.active}/${youtubeStats.total}\nRequests hoy: ${youtubeStats.totalRequests}`,
            inline: true,
          },
        )
        .setTimestamp()

      return message.reply({ embeds: [embed], ephemeral: true })
  }
}

async function handleAutoTranslateCommand(message, args) {
  const userId = message.author.id
  const targetLang = args[0]?.toLowerCase()

  if (!targetLang) {
    const selector = new StringSelectMenuBuilder()
      .setCustomId(`autoselect-${userId}`)
      .setPlaceholder("🔄 Selecciona idioma para auto-traducción")
      .addOptions(LANGUAGES.map((l) => ({ label: l.label, value: l.value, emoji: l.emoji })))

    return message.reply({
      content: "Selecciona el idioma al que quieres que se traduzcan automáticamente tus mensajes:",
      components: [new ActionRowBuilder().addComponents(selector)],
      ephemeral: true,
    })
  }

  const validLang = LANGUAGES.find((l) => l.value === targetLang)
  if (!validLang) {
    return message.reply({ content: getTranslation(userId, "invalidLanguage"), ephemeral: true })
  }

  autoTranslateUsers.set(userId, { targetLang })

  const langEmoji = validLang.emoji
  return message.reply({
    content: `${langEmoji} ${getTranslation(userId, "autoTranslateOn")} **${validLang.label}**`,
    ephemeral: true,
  })
}

async function handleDisableAutoTranslate(message) {
  const userId = message.author.id

  if (!autoTranslateUsers.has(userId)) {
    return message.reply({ content: getTranslation(userId, "autoTranslateNotActive"), ephemeral: true })
  }

  autoTranslateUsers.delete(userId)
  return message.reply({ content: getTranslation(userId, "autoTranslateOff"), ephemeral: true })
}

async function handleCommandsList(message) {
  const categories = {}

  COMMANDS_LIST.forEach((cmd) => {
    if (!categories[cmd.category]) {
      categories[cmd.category] = []
    }
    categories[cmd.category].push(cmd)
  })

  const embeds = []

  Object.keys(categories).forEach((category) => {
    const embed = new EmbedBuilder().setTitle(`${category}`).setColor("#4285f4").setTimestamp()

    categories[category].forEach((cmd) => {
      embed.addFields({
        name: cmd.name,
        value: `${cmd.description}\n*Ejemplo: ${cmd.example}*`,
        inline: false,
      })
    })

    embeds.push(embed)
  })

  const mainEmbed = new EmbedBuilder()
    .setTitle("📋 Lista de Comandos del Bot")
    .setDescription("Aquí tienes todos los comandos disponibles organizados por categorías:")
    .setColor("#00c7ff")
    .setThumbnail(client.user.displayAvatarURL())
    .setFooter({ text: `Total de comandos: ${COMMANDS_LIST.length}` })

  await message.reply({ embeds: [mainEmbed] })

  for (const embed of embeds) {
    await message.channel.send({ embeds: [embed] })
  }
}

async function handleRobloxSearch(message, args) {
  const input = args.join(" ")
  if (!input) return message.reply("⚠️ Debes escribir el ID del juego de Roblox o el nombre.")

  try {
    let placeId = input

    // Si no es un número, buscar el juego por nombre primero
    if (isNaN(input)) {
      const searchUrl = `https://games.roblox.com/v1/games/list?model.keyword=${encodeURIComponent(input)}&model.maxRows=1&model.startRowIndex=0`

      const searchResponse = await axios.get(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      const games = searchResponse.data.games || []
      if (!games.length) {
        return message.reply("❌ No se encontró ningún juego con ese nombre.")
      }

      placeId = games[0].rootPlaceId
    }

    // Obtener información del juego
    const gameInfoUrl = `https://games.roblox.com/v1/games?universeIds=${placeId}`
    const gameInfoResponse = await axios.get(gameInfoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    const gameData = gameInfoResponse.data.data?.[0]
    if (!gameData) {
      return message.reply("❌ No se pudo obtener información del juego.")
    }

    // Obtener servidores del juego
    const serversUrl = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Asc&limit=100`
    const serversResponse = await axios.get(serversUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    const serversData = serversResponse.data
    const servers = serversData.data || []

    if (!servers.length) {
      return message.reply("❌ No se encontraron servidores activos para este juego.")
    }

    // Calcular estadísticas
    const totalServers = servers.length
    const totalPlayers = servers.reduce((sum, server) => sum + server.playing, 0)
    const maxPlayers = servers.reduce((sum, server) => sum + server.maxPlayers, 0)
    const averagePlayers = Math.round(totalPlayers / totalServers)

    // Encontrar el servidor con más jugadores
    const fullestServer = servers.reduce((prev, current) => (prev.playing > current.playing ? prev : current))

    robloxSearchCache.set(message.author.id, {
      servers,
      index: 0,
      gameData,
      placeId,
      totalServers,
      totalPlayers,
      maxPlayers,
    })

    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${gameData.name}`)
      .setDescription(`**📊 Estadísticas de Servidores:**
🟢 **Servidores activos:** ${totalServers}
👥 **Jugadores totales:** ${totalPlayers}/${maxPlayers}
📈 **Promedio por servidor:** ${averagePlayers} jugadores
🔥 **Servidor más lleno:** ${fullestServer.playing}/${fullestServer.maxPlayers} jugadores`)
      .setColor("#00b2ff")
      .setThumbnail(`https://www.roblox.com/asset-thumbnail/image?assetId=${placeId}&width=150&height=150&format=png`)
      .addFields(
        {
          name: "🎯 Servidor Destacado",
          value: `**ID:** ${fullestServer.id}
**Jugadores:** ${fullestServer.playing}/${fullestServer.maxPlayers}
**Ping:** ${fullestServer.ping || "N/A"}ms`,
          inline: true,
        },
        {
          name: "🔗 Enlaces",
          value: `[🎮 Jugar](https://www.roblox.com/games/${placeId})
[📊 Ver página](https://www.roblox.com/games/${placeId})`,
          inline: true,
        },
      )
      .setFooter({ text: `Servidor 1 de ${totalServers} | Actualizado hace unos segundos` })
      .setTimestamp()

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`prevRoblox-${message.author.id}`)
        .setLabel("⬅️ Anterior")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`nextRoblox-${message.author.id}`)
        .setLabel("➡️ Siguiente")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(servers.length <= 1),
      new ButtonBuilder()
        .setCustomId(`joinRoblox-${message.author.id}`)
        .setLabel("🚀 Unirse")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`refreshRoblox-${message.author.id}`)
        .setLabel("🔄 Actualizar")
        .setStyle(ButtonStyle.Secondary),
    )

    await message.channel.send({ embeds: [embed], components: [row] })
  } catch (error) {
    console.error("Error en búsqueda de Roblox:", error.message)
    return message.reply(`❌ Error al obtener información de Roblox: ${error.message}`)
  }
}

async function handleGeneralSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply(getTranslation(message.author.id, "noSearchQuery"))

  const apiInfo = apiManager.getCurrentAPIInfo("google")
  if (!apiInfo) {
    return message.reply("❌ Todas las APIs están agotadas. Intenta mañana.")
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(query)}&num=10`

  try {
    const response = await makeGoogleAPIRequest(url, "google")
    const items = response.data.items || []

    if (!items.length) {
      return message.reply("❌ No se encontraron resultados.")
    }

    generalSearchCache.set(message.author.id, { items, index: 0, query })

    const item = items[0]
    const embed = new EmbedBuilder()
      .setTitle(`🔍 ${item.title}`)
      .setDescription(`${item.snippet}\n\n[🔗 Ver página completa](${item.link})`)
      .setColor("#4285f4")
      .setFooter({
        text: `Resultado 1 de ${items.length} | API: ${apiInfo.id} | Quedan: ${apiInfo.remaining}/${apiInfo.max}`,
      })
      .setTimestamp()

    if (item.pagemap?.cse_image?.[0]?.src) {
      embed.setThumbnail(item.pagemap.cse_image[0].src)
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`prevGeneral-${message.author.id}`)
        .setLabel("⬅️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`nextGeneral-${message.author.id}`)
        .setLabel("➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(items.length <= 1),
    )

    await message.channel.send({ embeds: [embed], components: [row] })
  } catch (error) {
    const errorMsg = error.message || "Error desconocido"
    console.error("Error en búsqueda general:", errorMsg)
    return message.reply(`❌ Error en la búsqueda: ${errorMsg}`)
  }
}

async function handleComicSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply("⚠️ Debes escribir algo para buscar.")

  const userId = message.author.id
  pendingComicSearch.set(userId, query)

  const siteSelector = new StringSelectMenuBuilder()
    .setCustomId(`comicsite-${userId}`)
    .setPlaceholder("📚 Selecciona el sitio para buscar comics")
    .addOptions(COMIC_SITES)

  return message.reply({
    content: "Selecciona el sitio donde deseas buscar comics:",
    components: [new ActionRowBuilder().addComponents(siteSelector)],
    ephemeral: true,
  })
}

async function handleWebSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply(getTranslation(message.author.id, "noSearchQuery"))

  const apiInfo = apiManager.getCurrentAPIInfo("google")
  if (!apiInfo) {
    return message.reply("❌ Todas las APIs están agotadas. Intenta mañana.")
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&searchType=image&q=${encodeURIComponent(query)}&num=10`

  try {
    const response = await makeGoogleAPIRequest(url, "google")
    let items = response.data.items || []
    items = items.filter((img) => img.link && img.link.startsWith("http"))

    if (!items.length) {
      return message.reply(getTranslation(message.author.id, "noValidImages"))
    }

    let validIndex = -1
    for (let i = 0; i < items.length; i++) {
      if (await isImageUrlValid(items[i].link)) {
        validIndex = i
        break
      }
    }

    if (validIndex === -1) {
      return message.reply(getTranslation(message.author.id, "noValidImages"))
    }

    imageSearchCache.set(message.author.id, { items, index: validIndex, query })

    const currentApiInfo = apiManager.getCurrentAPIInfo("google")
    const embed = new EmbedBuilder()
      .setTitle(`📷 Resultados para: ${query}`)
      .setImage(items[validIndex].link)
      .setDescription(`[Página donde está la imagen](${items[validIndex].image.contextLink})`)
      .setFooter({
        text: `Imagen ${validIndex + 1} de ${items.length} | API: ${currentApiInfo.id} | Quedan: ${currentApiInfo.remaining}/${currentApiInfo.max}`,
      })
      .setColor("#00c7ff")

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prevImage")
        .setLabel("⬅️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(validIndex === 0),
      new ButtonBuilder()
        .setCustomId("nextImage")
        .setLabel("➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(validIndex === items.length - 1),
    )

    await message.channel.send({ embeds: [embed], components: [row] })
  } catch (error) {
    const errorMsg = error.message || "Error desconocido"
    console.error("Error en búsqueda de imágenes:", errorMsg)
    return message.reply(`❌ Error buscando imágenes: ${errorMsg}`)
  }
}

async function handleAdultSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply("⚠️ Debes escribir algo para buscar.")

  const userId = message.author.id
  pendingXXXSearch.set(userId, query)

  const siteSelector = new StringSelectMenuBuilder()
    .setCustomId(`xxxsite-${userId}`)
    .setPlaceholder("🔞 Selecciona el sitio para buscar contenido adulto")
    .addOptions([
      { label: "Xvideos", value: "xvideos.es", emoji: "🔴" },
      { label: "Pornhub", value: "es.pornhub.com", emoji: "🔵" },
      { label: "Hentaila", value: "hentaila.tv", emoji: "🟣" },
    ])

  return message.reply({
    content: "Selecciona el sitio donde deseas buscar:",
    components: [new ActionRowBuilder().addComponents(siteSelector)],
    ephemeral: true,
  })
}

async function handleVideoSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply("⚠️ Debes escribir algo para buscar el video.")

  const apiInfo = apiManager.getCurrentAPIInfo("youtube")
  if (!apiInfo) {
    return message.reply("❌ Todas las APIs de YouTube están agotadas. Intenta mañana.")
  }

  try {
    const api = apiManager.getNextAvailableAPI("youtube")
    if (!api) {
      return message.reply("❌ Todas las APIs de YouTube están agotadas. Intenta mañana.")
    }

    const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: {
        part: "snippet",
        q: query,
        key: api.apiKey,
        maxResults: 1,
        type: "video",
      },
    })

    apiManager.incrementRequestCount(api.id, "youtube")

    const item = response.data.items?.[0]
    if (!item) return message.reply("❌ No se encontró ningún video.")

    const videoId = item.id.videoId
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    const title = item.snippet.title

    const currentApiInfo = apiManager.getCurrentAPIInfo("youtube")
    await message.channel.send(
      `🎬 ${title}\n📊 API: ${currentApiInfo.id} | Quedan: ${currentApiInfo.remaining}/${currentApiInfo.max}`,
    )
    return message.channel.send(videoUrl)
  } catch (error) {
    if (error.response?.status === 429) {
      console.log("⚠️ Cuota de YouTube agotada, intentando con otra API...")
      return message.reply("⚠️ Cuota agotada, intentando con otra API...")
    }
    return message.reply("❌ Error al buscar el video.")
  }
}

async function handleXMLSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply("⚠️ ¡Escribe algo para buscar un video, compa!")

  const url = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(query + " site:www.xnxx.es")}&num=5`

  try {
    const response = await makeGoogleAPIRequest(url, "google")
    const items = response.data.items

    if (!items || items.length === 0) {
      return message.reply("❌ No se encontraron videos, ¡intenta otra cosa!")
    }

    const video = items.find((item) => item.link.includes("/video-")) || items[0]
    const title = video.title
    const link = video.link
    const context = video.displayLink
    const thumb = video.pagemap?.cse_thumbnail?.[0]?.src

    const apiInfo = apiManager.getCurrentAPIInfo("google")
    const embed = new EmbedBuilder()
      .setTitle(`🎬 ${title.slice(0, 80)}...`)
      .setDescription(`**🔥 Clic para ver el video 🔥**\n[📺 Ir al video](${link})\n\n🌐 **Fuente**: ${context}`)
      .setColor("#ff0066")
      .setThumbnail(thumb || "https://i.imgur.com/defaultThumbnail.png")
      .setFooter({
        text: `API: ${apiInfo.id} | Quedan: ${apiInfo.remaining}/${apiInfo.max}`,
        iconURL: "https://i.imgur.com/botIcon.png",
      })
      .setTimestamp()
      .addFields({ name: "⚠️ Nota", value: "Este enlace lleva a la página del video" })

    await message.channel.send({ embeds: [embed] })
  } catch (error) {
    console.error("Error en búsqueda XML:", error.message)
    return message.reply("❌ ¡Algo salió mal, compa! Intenta de nuevo.")
  }
}

async function handleTranslate(message) {
  if (!message.reference?.messageId) {
    return sendWarning(message, getTranslation(message.author.id, "mustReply"))
  }

  const referencedMessage = await message.channel.messages.fetch(message.reference.messageId)
  const text = referencedMessage.content
  const userId = message.author.id

  const loading = await message.reply({ content: "⌛ Traduciendo...", ephemeral: true })
  const userLang = getUserLanguage(userId)

  if (prefs[userId]) {
    const result = await translateText(text, userLang)
    await loading.delete().catch(() => {})

    if (!result) {
      return message.reply({ content: getTranslation(userId, "timeout"), ephemeral: true })
    }

    if (result.from === userLang) {
      return message.reply({ content: getTranslation(userId, "alreadyInLang"), ephemeral: true })
    }

    const embed = new EmbedBuilder()
      .setColor("#00c7ff")
      .setDescription(`${LANGUAGES.find((l) => l.value === userLang).emoji} : ${result.text}`)

    return message.reply({ embeds: [embed], ephemeral: true })
  }

  await loading.delete().catch(() => {})

  const selector = new StringSelectMenuBuilder()
    .setCustomId(`select-${userId}`)
    .setPlaceholder("🌍 Selecciona idioma")
    .addOptions(LANGUAGES.map((l) => ({ label: l.label, value: l.value, emoji: l.emoji })))

  message.reply({
    content: "Selecciona idioma para guardar:",
    components: [new ActionRowBuilder().addComponents(selector)],
    ephemeral: true,
  })
}

async function handleChatCommand(message) {
  const mention = message.mentions.users.first()
  if (!mention) {
    return sendWarning(message, "❌ Debes mencionar al usuario con quien quieres chatear.")
  }

  const user1 = message.author
  const user2 = mention

  if (user1.id === user2.id) {
    return sendWarning(message, "⚠️ No puedes iniciar un chat contigo mismo.")
  }

  const lang1 = getUserLanguage(user1.id)
  const lang2 = getUserLanguage(user2.id)

  if (lang1 === lang2) {
    return sendWarning(message, getTranslation(user1.id, "sameLanguage"))
  }

  activeChats.set(message.channel.id, { users: [user1.id, user2.id] })

  const member1 = await message.guild.members.fetch(user1.id)
  const member2 = await message.guild.members.fetch(user2.id)

  const embed = new EmbedBuilder()
    .setTitle("💬 Chat Automático Iniciado")
    .setDescription(
      `Chat iniciado entre:\n**${member1.nickname || member1.user.username}** <@${member1.id}> (${lang1})\n**${member2.nickname || member2.user.username}** <@${member2.id}> (${lang2})`,
    )
    .setThumbnail(member1.user.displayAvatarURL({ extension: "png", size: 64 }))
    .setImage(member2.user.displayAvatarURL({ extension: "png", size: 64 }))
    .setColor("#00c7ff")
    .setTimestamp()

  return message.channel.send({ embeds: [embed] })
}

async function handleDisableChatCommand(message) {
  if (message.author.username !== "flux_fer") {
    return sendWarning(message, getTranslation(message.author.id, "notAuthorized"))
  }

  if (activeChats.has(message.channel.id)) {
    activeChats.delete(message.channel.id)
    return message.reply({
      content: getTranslation(message.author.id, "chatDeactivated"),
      ephemeral: true,
    })
  } else {
    return sendWarning(message, getTranslation(message.author.id, "chatNoSession"))
  }
}

async function handleLanguageSelection(message) {
  const userId = message.author.id
  const selector = new StringSelectMenuBuilder()
    .setCustomId(`select-${userId}`)
    .setPlaceholder("🌍 Selecciona idioma")
    .addOptions(LANGUAGES.map((l) => ({ label: l.label, value: l.value, emoji: l.emoji })))

  return message.reply({
    content: "Selecciona un nuevo idioma para guardar:",
    components: [new ActionRowBuilder().addComponents(selector)],
    ephemeral: true,
  })
}

async function handleSelectMenu(interaction) {
  const userId = interaction.user.id

  if (interaction.customId.startsWith("xxxsite-")) {
    await handleAdultSiteSelection(interaction)
  } else if (interaction.customId.startsWith("comicsite-")) {
    await handleComicSiteSelection(interaction)
  } else if (interaction.customId.startsWith("autoselect-")) {
    await handleAutoTranslateSelection(interaction)
  } else if (interaction.customId.startsWith("select-")) {
    await handleLanguageSelectionMenu(interaction)
  }
}

async function handleAutoTranslateSelection(interaction) {
  const [_, userId] = interaction.customId.split("-")
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "⛔ No puedes usar este menú.", ephemeral: true })
  }

  const selectedLang = interaction.values[0]
  autoTranslateUsers.set(userId, { targetLang: selectedLang })

  const langInfo = LANGUAGES.find((l) => l.value === selectedLang)
  const langEmoji = langInfo.emoji

  await interaction.update({
    content: `${langEmoji} ${getTranslation(userId, "autoTranslateOn")} **${langInfo.label}**`,
    components: [],
    ephemeral: true,
  })
}

async function handleComicSiteSelection(interaction) {
  const [_, userId] = interaction.customId.split("-")
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "⛔ No puedes usar este menú.", ephemeral: true })
  }

  const query = pendingComicSearch.get(interaction.user.id)
  if (!query) {
    return interaction.reply({ content: "❌ No se encontró tu búsqueda previa.", ephemeral: true })
  }

  const selectedSite = interaction.values[0]

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(query + " site:" + selectedSite)}&num=10`
    const response = await makeGoogleAPIRequest(url, "google")
    const items = response.data.items

    if (!items || items.length === 0) {
      return interaction.reply({ content: "❌ No se encontraron comics.", ephemeral: true })
    }

    comicSearchCache.set(interaction.user.id, {
      items,
      currentIndex: 0,
      query,
      site: selectedSite,
    })

    const item = items[0]
    const embed = createComicSearchEmbed(item, 0, items.length)
    const buttons = createNavigationButtons(interaction.user.id, 0, items.length, "comic")

    await interaction.update({
      content: "",
      embeds: [embed],
      components: [buttons],
    })

    pendingComicSearch.delete(interaction.user.id)
  } catch (error) {
    console.error("Error en búsqueda de comics:", error.message)
    return interaction.reply({
      content: "❌ Error al buscar comics. Intenta de nuevo más tarde.",
      ephemeral: true,
    })
  }
}

async function handleAdultSiteSelection(interaction) {
  const [_, userId] = interaction.customId.split("-")
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "⛔ No puedes usar este menú.", ephemeral: true })
  }

  const query = pendingXXXSearch.get(interaction.user.id)
  if (!query) {
    return interaction.reply({ content: "❌ No se encontró tu búsqueda previa.", ephemeral: true })
  }

  const selectedSite = interaction.values[0]

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(query + " site:" + selectedSite)}&num=10`
    const response = await makeGoogleAPIRequest(url, "google")
    const items = response.data.items

    if (!items || items.length === 0) {
      return interaction.reply({ content: "❌ No se encontraron resultados.", ephemeral: true })
    }

    xxxSearchCache.set(interaction.user.id, {
      items,
      currentIndex: 0,
      query,
      site: selectedSite,
    })

    const item = items[0]
    const embed = createAdultSearchEmbed(item, 0, items.length)
    const buttons = createNavigationButtons(interaction.user.id, 0, items.length, "xxx")

    await interaction.update({
      content: "",
      embeds: [embed],
      components: [buttons],
    })

    pendingXXXSearch.delete(interaction.user.id)
  } catch (error) {
    console.error("Error en búsqueda .xxx:", error.message)
    return interaction.reply({
      content: "❌ Error al buscar. Intenta de nuevo más tarde.",
      ephemeral: true,
    })
  }
}

async function handleLanguageSelectionMenu(interaction) {
  const [_, userId] = interaction.customId.split("-")
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "No es tu menú.", ephemeral: true })
  }

  const selectedLang = interaction.values[0]
  prefs[userId] = selectedLang
  savePreferences()

  const langEmoji = LANGUAGES.find((l) => l.value === selectedLang).emoji
  await interaction.update({
    content: `${langEmoji} ${getTranslation(userId, "langSaved")}`,
    components: [],
    ephemeral: true,
  })

  const note = await interaction.followUp({
    content: "🎉 Listo! Usa .td o .chat ahora.",
    ephemeral: true,
  })

  setTimeout(() => note.delete().catch(() => {}), 5000)
}

async function handleButtonInteraction(interaction) {
  const userId = interaction.user.id
  const [action, uid] = interaction.customId.split("-")

  if (userId !== uid) {
    return interaction.reply({ content: "⛔ No puedes usar estos botones.", ephemeral: true })
  }

  if (action.startsWith("xxx")) {
    await handleAdultSearchNavigation(interaction, action)
  } else if (action.startsWith("comic")) {
    await handleComicSearchNavigation(interaction, action)
  } else if (action.startsWith("General") || action.includes("General")) {
    await handleGeneralSearchNavigation(interaction, action)
  } else if (action.startsWith("Roblox") || action.includes("Roblox")) {
    await handleRobloxNavigation(interaction, action)
  } else if (["prevImage", "nextImage"].includes(interaction.customId)) {
    await handleImageNavigation(interaction)
  }
}

async function handleRobloxNavigation(interaction, action) {
  const userId = interaction.user.id

  if (action === "joinRoblox") {
    const cache = robloxSearchCache.get(userId)
    if (!cache) return interaction.reply({ content: "❌ No hay servidor seleccionado.", ephemeral: true })

    const server = cache.servers[cache.index]
    const joinUrl = `https://www.roblox.com/games/start?placeId=${cache.placeId}&gameInstanceId=${server.id}`

    return interaction.reply({
      content: `🚀 **Unirse al Servidor**
🎮 **Juego:** ${cache.gameData.name}
👥 **Jugadores:** ${server.playing}/${server.maxPlayers}
🔗 **Link:** ${joinUrl}

*Clic en el enlace para unirte directamente al servidor*`,
      ephemeral: true,
    })
  }

  if (action === "refreshRoblox") {
    // Recargar datos del servidor
    const cache = robloxSearchCache.get(userId)
    if (!cache) return interaction.reply({ content: "❌ No hay datos para actualizar.", ephemeral: true })

    try {
      const serversUrl = `https://games.roblox.com/v1/games/${cache.placeId}/servers/Public?sortOrder=Asc&limit=100`
      const serversResponse = await axios.get(serversUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      const servers = serversResponse.data.data || []
      if (!servers.length) {
        return interaction.reply({ content: "❌ No hay servidores activos en este momento.", ephemeral: true })
      }

      // Actualizar cache
      const totalServers = servers.length
      const totalPlayers = servers.reduce((sum, server) => sum + server.playing, 0)
      const maxPlayers = servers.reduce((sum, server) => sum + server.maxPlayers, 0)

      cache.servers = servers
      cache.totalServers = totalServers
      cache.totalPlayers = totalPlayers
      cache.maxPlayers = maxPlayers
      cache.index = 0

      robloxSearchCache.set(userId, cache)

      const server = servers[0]
      const averagePlayers = Math.round(totalPlayers / totalServers)

      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${cache.gameData.name} (Actualizado)`)
        .setDescription(`**📊 Estadísticas de Servidores:**
🟢 **Servidores activos:** ${totalServers}
👥 **Jugadores totales:** ${totalPlayers}/${maxPlayers}
📈 **Promedio por servidor:** ${averagePlayers} jugadores`)
        .setColor("#00ff88")
        .setThumbnail(
          `https://www.roblox.com/asset-thumbnail/image?assetId=${cache.placeId}&width=150&height=150&format=png`,
        )
        .addFields({
          name: "🎯 Servidor Actual",
          value: `**ID:** ${server.id}
**Jugadores:** ${server.playing}/${server.maxPlayers}
**Ping:** ${server.ping || "N/A"}ms`,
          inline: true,
        })
        .setFooter({ text: `Servidor 1 de ${totalServers} | Recién actualizado` })
        .setTimestamp()

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`prevRoblox-${userId}`)
          .setLabel("⬅️ Anterior")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`nextRoblox-${userId}`)
          .setLabel("➡️ Siguiente")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(servers.length <= 1),
        new ButtonBuilder().setCustomId(`joinRoblox-${userId}`).setLabel("🚀 Unirse").setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`refreshRoblox-${userId}`)
          .setLabel("🔄 Actualizar")
          .setStyle(ButtonStyle.Secondary),
      )

      return interaction.update({ embeds: [embed], components: [buttons] })
    } catch (error) {
      return interaction.reply({ content: "❌ Error al actualizar datos del servidor.", ephemeral: true })
    }
  }

  if (!robloxSearchCache.has(userId)) {
    return interaction.reply({ content: "❌ No hay búsqueda activa para navegar.", ephemeral: true })
  }

  const data = robloxSearchCache.get(userId)
  const { servers, index } = data
  let newIndex = index

  if (action === "nextRoblox" && index < servers.length - 1) {
    newIndex++
  } else if (action === "prevRoblox" && index > 0) {
    newIndex--
  }

  data.index = newIndex
  robloxSearchCache.set(userId, data)

  const server = servers[newIndex]
  const embed = new EmbedBuilder()
    .setTitle(`🎮 ${data.gameData.name}`)
    .setDescription(`**📊 Estadísticas Generales:**
🟢 **Servidores activos:** ${data.totalServers}
👥 **Jugadores totales:** ${data.totalPlayers}/${data.maxPlayers}`)
    .setColor("#00b2ff")
    .setThumbnail(
      `https://www.roblox.com/asset-thumbnail/image?assetId=${data.placeId}&width=150&height=150&format=png`,
    )
    .addFields({
      name: "🎯 Servidor Actual",
      value: `**ID:** ${server.id}
**Jugadores:** ${server.playing}/${server.maxPlayers}
**Ping:** ${server.ping || "N/A"}ms`,
      inline: true,
    })
    .setFooter({ text: `Servidor ${newIndex + 1} de ${servers.length}` })
    .setTimestamp()

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prevRoblox-${userId}`)
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(newIndex === 0),
    new ButtonBuilder()
      .setCustomId(`nextRoblox-${userId}`)
      .setLabel("➡️ Siguiente")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(newIndex === servers.length - 1),
    new ButtonBuilder().setCustomId(`joinRoblox-${userId}`).setLabel("🚀 Unirse").setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`refreshRoblox-${userId}`)
      .setLabel("🔄 Actualizar")
      .setStyle(ButtonStyle.Secondary),
  )

  await interaction.update({ embeds: [embed], components: [buttons] })
}

async function handleGeneralSearchNavigation(interaction, action) {
  const userId = interaction.user.id

  if (!generalSearchCache.has(userId)) {
    return interaction.reply({ content: "❌ No hay búsqueda activa para paginar.", ephemeral: true })
  }

  const data = generalSearchCache.get(userId)
  const { items, index } = data
  let newIndex = index

  if (action === "nextGeneral" && index < items.length - 1) {
    newIndex++
  } else if (action === "prevGeneral" && index > 0) {
    newIndex--
  }

  data.index = newIndex
  generalSearchCache.set(userId, data)

  const item = items[newIndex]
  const apiInfo = apiManager.getCurrentAPIInfo("google")

  const embed = new EmbedBuilder()
    .setTitle(`🔍 ${item.title}`)
    .setDescription(`${item.snippet}\n\n[🔗 Ver página completa](${item.link})`)
    .setColor("#4285f4")
    .setFooter({
      text: `Resultado ${newIndex + 1} de ${items.length} | API: ${apiInfo.id} | Quedan: ${apiInfo.remaining}/${apiInfo.max}`,
    })
    .setTimestamp()

  if (item.pagemap?.cse_image?.[0]?.src) {
    embed.setThumbnail(item.pagemap.cse_image[0].src)
  }

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prevGeneral-${userId}`)
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(newIndex === 0),
    new ButtonBuilder()
      .setCustomId(`nextGeneral-${userId}`)
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(newIndex === items.length - 1),
  )

  await interaction.update({ embeds: [embed], components: [buttons] })
}

async function handleComicSearchNavigation(interaction, action) {
  const userId = interaction.user.id

  if (!comicSearchCache.has(userId)) {
    return interaction.reply({ content: "❌ No hay búsqueda activa para paginar.", ephemeral: true })
  }

  const data = comicSearchCache.get(userId)
  const { items, currentIndex } = data
  let newIndex = currentIndex

  if (action === "comicnext" && currentIndex < items.length - 1) {
    newIndex++
  } else if (action === "comicback" && currentIndex > 0) {
    newIndex--
  }

  data.currentIndex = newIndex
  comicSearchCache.set(userId, data)

  const item = items[newIndex]
  const embed = createComicSearchEmbed(item, newIndex, items.length)
  const buttons = createNavigationButtons(userId, newIndex, items.length, "comic")

  await interaction.update({ embeds: [embed], components: [buttons] })
}

async function handleAdultSearchNavigation(interaction, action) {
  const userId = interaction.user.id

  if (!xxxSearchCache.has(userId)) {
    return interaction.reply({ content: "❌ No hay búsqueda activa para paginar.", ephemeral: true })
  }

  const data = xxxSearchCache.get(userId)
  const { items, currentIndex } = data
  let newIndex = currentIndex

  if (action === "xxxnext" && currentIndex < items.length - 1) {
    newIndex++
  } else if (action === "xxxback" && currentIndex > 0) {
    newIndex--
  }

  data.currentIndex = newIndex
  xxxSearchCache.set(userId, data)

  const item = items[newIndex]
  const embed = createAdultSearchEmbed(item, newIndex, items.length)
  const buttons = createNavigationButtons(userId, newIndex, items.length, "xxx")

  await interaction.update({ embeds: [embed], components: [buttons] })
}

async function handleImageNavigation(interaction) {
  const userId = interaction.user.id
  const cache = imageSearchCache.get(userId)

  if (!cache) return interaction.deferUpdate()

  let newIndex = cache.index
  if (interaction.customId === "prevImage" && newIndex > 0) newIndex--
  if (interaction.customId === "nextImage" && newIndex < cache.items.length - 1) newIndex++

  const validIndex = await findValidImageIndex(cache.items, newIndex, newIndex < cache.index ? -1 : 1)

  if (validIndex === -1) return interaction.deferUpdate()

  cache.index = validIndex
  const img = cache.items[validIndex]

  const apiInfo = apiManager.getCurrentAPIInfo("google")
  const embed = new EmbedBuilder()
    .setTitle(`📷 Resultados para: ${cache.query}`)
    .setImage(img.link)
    .setDescription(`[Página donde está la imagen](${img.image.contextLink})`)
    .setFooter({
      text: `Imagen ${validIndex + 1} de ${cache.items.length} | API: ${apiInfo.id} | Quedan: ${apiInfo.remaining}/${apiInfo.max}`,
    })
    .setColor("#00c7ff")

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("prevImage")
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(validIndex === 0),
    new ButtonBuilder()
      .setCustomId("nextImage")
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(validIndex === cache.items.length - 1),
  )

  await interaction.update({ embeds: [embed], components: [buttons] })
}

async function findValidImageIndex(items, startIndex, direction) {
  let idx = startIndex
  while (idx >= 0 && idx < items.length) {
    if (await isImageUrlValid(items[idx].link)) return idx
    idx += direction
  }
  return -1
}

function createComicSearchEmbed(item, index, total) {
  const title = item.title
  const link = item.link
  const context = item.displayLink
  const thumb = item.pagemap?.cse_thumbnail?.[0]?.src || item.pagemap?.cse_image?.[0]?.src

  const apiInfo = apiManager.getCurrentAPIInfo("google")

  return new EmbedBuilder()
    .setTitle(`📚 ${title.slice(0, 80)}...`)
    .setDescription(`**📖 Clic para leer el comic 📖**\n[📚 Ir al comic](${link})\n\n🌐 **Sitio**: ${context}`)
    .setColor("#9b59b6")
    .setImage(thumb)
    .setFooter({
      text: `Comic ${index + 1} de ${total} | API: ${apiInfo.id} | Quedan: ${apiInfo.remaining}/${apiInfo.max}`,
      iconURL: "https://i.imgur.com/comicIcon.png",
    })
    .setTimestamp()
    .addFields({
      name: "📚 Nota",
      value: "Este enlace lleva al comic completo para leer.",
    })
}

function createAdultSearchEmbed(item, index, total) {
  const title = item.title
  const link = item.link
  const context = item.displayLink
  const thumb = item.pagemap?.cse_thumbnail?.[0]?.src || "https://i.imgur.com/defaultThumbnail.png"

  const apiInfo = apiManager.getCurrentAPIInfo("google")

  return new EmbedBuilder()
    .setTitle(`🔞 ${title.slice(0, 80)}...`)
    .setDescription(`**🔥 Haz clic para ver el video 🔥**\n[📺 Ir al video](${link})\n\n🌐 **Sitio**: ${context}`)
    .setColor("#ff3366")
    .setImage(thumb)
    .setFooter({
      text: `Resultado ${index + 1} de ${total} | API: ${apiInfo.id} | Quedan: ${apiInfo.remaining}/${apiInfo.max}`,
      iconURL: "https://i.imgur.com/botIcon.png",
    })
    .setTimestamp()
    .addFields({
      name: "⚠️ Nota",
      value: "Este enlace lleva a contenido para adultos. Asegúrate de tener +18.",
    })
}

function createNavigationButtons(userId, currentIndex, total, prefix) {
  const backBtn = new ButtonBuilder()
    .setCustomId(`${prefix}back-${userId}`)
    .setLabel("⬅️")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentIndex === 0)

  const nextBtn = new ButtonBuilder()
    .setCustomId(`${prefix}next-${userId}`)
    .setLabel("➡️")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentIndex === total - 1)

  return new ActionRowBuilder().addComponents(backBtn, nextBtn)
}

client.login(process.env.DISCORD_TOKEN)
