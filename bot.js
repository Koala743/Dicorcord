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
    let universeId = null
    let placeId = null
    let gameData = null

    // Si es un número, asumir que es un ID
    if (!isNaN(input)) {
      placeId = input

      // Obtener universeId desde placeId
      const placeInfoUrl = `https://apis.roblox.com/universes/v1/places/${placeId}/universe`
      try {
        const placeInfoResponse = await axios.get(placeInfoUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        })
        universeId = placeInfoResponse.data.universeId
      } catch (error) {
        return message.reply("❌ No se pudo encontrar el juego con ese ID.")
      }
    } else {
      // Buscar por nombre con búsqueda difusa
      const searchUrl = `https://games.roblox.com/v1/games/list?model.keyword=${encodeURIComponent(input)}&model.maxRows=10&model.startRowIndex=0`

      const searchResponse = await axios.get(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      const games = searchResponse.data.games || []
      if (!games.length) {
        // Intentar búsqueda más amplia si no encuentra nada
        const broadSearchUrl = `https://catalog.roblox.com/v1/search/items?category=Experiences&keyword=${encodeURIComponent(input)}&limit=10`

        try {
          const broadSearchResponse = await axios.get(broadSearchUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          })

          const catalogGames = broadSearchResponse.data.data || []
          if (!catalogGames.length) {
            return message.reply(
              "❌ No se encontró ningún juego con ese nombre. Intenta con palabras clave diferentes.",
            )
          }

          placeId = catalogGames[0].id
          universeId = catalogGames[0].universeId
        } catch (error) {
          return message.reply("❌ No se encontró ningún juego con ese nombre.")
        }
      } else {
        // Buscar el juego más similar usando coincidencia difusa
        const bestMatch = games.reduce((best, current) => {
          const currentScore = calculateSimilarity(input.toLowerCase(), current.name.toLowerCase())
          const bestScore = calculateSimilarity(input.toLowerCase(), best.name.toLowerCase())
          return currentScore > bestScore ? current : best
        })

        placeId = bestMatch.rootPlaceId
        universeId = bestMatch.universeId
      }
    }

    // Obtener información detallada del juego
    const gameInfoUrl = `https://games.roblox.com/v1/games?universeIds=${universeId}`
    const gameInfoResponse = await axios.get(gameInfoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    gameData = gameInfoResponse.data.data?.[0]
    if (!gameData) {
      return message.reply("❌ No se pudo obtener información del juego.")
    }

    // Obtener servidores públicos
    const publicServersUrl = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&limit=100`
    const publicServersResponse = await axios.get(publicServersUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    const publicServers = publicServersResponse.data.data || []

    // Obtener servidores VIP/Privados
    let vipServers = []
    try {
      const vipServersUrl = `https://games.roblox.com/v1/games/${placeId}/servers/Friend?sortOrder=Desc&limit=100`
      const vipServersResponse = await axios.get(vipServersUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })
      vipServers = vipServersResponse.data.data || []
    } catch (error) {
      console.log("No se pudieron obtener servidores VIP")
    }

    // Calcular estadísticas
    const totalPublicServers = publicServers.length
    const totalVipServers = vipServers.length
    const totalServers = totalPublicServers + totalVipServers

    const publicPlayers = publicServers.reduce((sum, server) => sum + server.playing, 0)
    const vipPlayers = vipServers.reduce((sum, server) => sum + server.playing, 0)
    const totalPlayers = publicPlayers + vipPlayers

    const publicMaxPlayers = publicServers.reduce((sum, server) => sum + server.maxPlayers, 0)
    const vipMaxPlayers = vipServers.reduce((sum, server) => sum + server.maxPlayers, 0)
    const totalMaxPlayers = publicMaxPlayers + vipMaxPlayers

    // Encontrar servidores destacados
    const fullestPublicServer =
      publicServers.length > 0
        ? publicServers.reduce((prev, current) => (prev.playing > current.playing ? prev : current))
        : null

    const fullestVipServer =
      vipServers.length > 0
        ? vipServers.reduce((prev, current) => (prev.playing > current.playing ? prev : current))
        : null

    // Guardar en cache para navegación
    robloxSearchCache.set(message.author.id, {
      publicServers,
      vipServers,
      index: 0,
      serverType: "public", // 'public' o 'vip'
      gameData,
      placeId,
      universeId,
      totalServers,
      totalPlayers,
      totalMaxPlayers,
      publicPlayers,
      vipPlayers,
      totalPublicServers,
      totalVipServers,
      listCurrentPage: 0, // New: for server list pagination
      listServerType: null, // New: 'public' or 'vip' for list view
    })

    // Crear embed con información completa
    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${gameData.name}`)
      .setDescription(`**📊 Estadísticas Completas del Juego:**

**👥 JUGADORES TOTALES: ${totalPlayers.toLocaleString()}/${totalMaxPlayers.toLocaleString()}**

**🌐 Servidores Públicos:**
🟢 Servidores: ${totalPublicServers}
👥 Jugadores: ${publicPlayers.toLocaleString()}/${publicMaxPlayers.toLocaleString()}

**💎 Servidores VIP/Privados:**
🔒 Servidores: ${totalVipServers}
👥 Jugadores: ${vipPlayers.toLocaleString()}/${vipMaxPlayers.toLocaleString()}

**📈 Información General:**
⭐ Rating: ${gameData.totalUpVotes?.toLocaleString() || 0}👍 / ${gameData.totalDownVotes?.toLocaleString() || 0}👎
🎯 Visitas: ${gameData.visits?.toLocaleString() || "N/A"}
🎮 Jugando ahora: ${gameData.playing?.toLocaleString() || totalPlayers.toLocaleString()}`)
      .setColor("#00b2ff")
      .setThumbnail(`https://www.roblox.com/asset-thumbnail/image?assetId=${placeId}&width=150&height=150&format=png`)
      .setFooter({
        text: `ID: ${placeId} | Universe ID: ${universeId} | Total de servidores: ${totalServers}`,
      })
      .setTimestamp()

    // Agregar información de servidores destacados si existen
    if (fullestPublicServer) {
      embed.addFields({
        name: "🔥 Servidor Público Más Lleno",
        value: `**ID:** ${fullestPublicServer.id}\n**Jugadores:** ${fullestPublicServer.playing}/${fullestPublicServer.maxPlayers}\n**Ping:** ${fullestPublicServer.ping || "N/A"}ms`,
        inline: true,
      })
    }

    if (fullestVipServer) {
      embed.addFields({
        name: "💎 Servidor VIP Más Lleno",
        value: `**ID:** ${fullestVipServer.id}\n**Jugadores:** ${fullestVipServer.playing}/${fullestVipServer.maxPlayers}\n**Ping:** ${fullestVipServer.ping || "N/A"}ms`,
        inline: true,
      })
    }

    // Botones de navegación y acciones
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`publicRoblox-${message.author.id}`)
        .setLabel("🌐 Ver Públicos")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(totalPublicServers === 0),
      new ButtonBuilder()
        .setCustomId(`vipRoblox-${message.author.id}`)
        .setLabel("💎 Ver VIP")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(totalVipServers === 0),
      new ButtonBuilder()
        .setCustomId(`viewRobloxLists-${message.author.id}`) // NEW BUTTON
        .setLabel("📋 Listar Servidores") // NEW LABEL
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(totalServers === 0),
      new ButtonBuilder()
        .setCustomId(`playRoblox-${message.author.id}`)
        .setLabel("🎮 Jugar")
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

// Agregar función para calcular similitud de strings (búsqueda difusa)
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1, str2) {
  const matrix = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
      }
    }
  }

  return matrix[str2.length][str1.length]
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
  } else if (action === "viewRobloxLists") {
    // NEW CASE
    await handleRobloxViewLists(interaction)
  } else if (action.startsWith("list")) {
    // NEW CASE FOR LIST NAVIGATION
    await handleRobloxServerListNavigation(interaction, action)
  } else if (action.startsWith("Roblox") || action.includes("Roblox")) {
    await handleRobloxNavigation(interaction, action)
  } else if (["prevImage", "nextImage"].includes(interaction.customId)) {
    await handleImageNavigation(interaction)
  }
}

// New function: handleRobloxViewLists
async function handleRobloxViewLists(interaction) {
  const userId = interaction.user.id
  const cache = robloxSearchCache.get(userId)

  if (!cache) {
    return interaction.reply({ content: "❌ No hay datos de juego disponibles para listar.", ephemeral: true })
  }

  const embed = new EmbedBuilder()
    .setTitle(`📋 Listar Servidores para ${cache.gameData.name}`)
    .setDescription("Selecciona el tipo de servidor que deseas listar:")
    .setColor("#00b2ff")
    .setThumbnail(
      `https://www.roblox.com/asset-thumbnail/image?assetId=${cache.placeId}&width=150&height=150&format=png`,
    )

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`listPublicRoblox-${userId}`)
      .setLabel("🌐 Listar Públicos")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(cache.totalPublicServers === 0),
    new ButtonBuilder()
      .setCustomId(`listVipRoblox-${userId}`)
      .setLabel("💎 Listar VIP")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(cache.totalVipServers === 0),
    new ButtonBuilder()
      .setCustomId(`listBackToMainRoblox-${userId}`)
      .setLabel("🔙 Volver")
      .setStyle(ButtonStyle.Danger),
  )

  await interaction.update({ embeds: [embed], components: [buttons] })
}

// New function: handleRobloxServerListNavigation
async function handleRobloxServerListNavigation(interaction, action) {
  const userId = interaction.user.id
  const cache = robloxSearchCache.get(userId)

  if (!cache) {
    return interaction.reply({ content: "❌ No hay datos de juego disponibles.", ephemeral: true })
  }

  const serversPerPage = 5 // Number of servers to display per page

  let currentServers = []
  let totalServers = 0
  let serverTypeLabel = ""
  let serverTypeEmoji = ""
  let serverTypeColor = ""

  if (action === "listPublicRoblox" || (action.startsWith("list") && cache.listServerType === "public")) {
    currentServers = cache.publicServers
    totalServers = cache.totalPublicServers
    serverTypeLabel = "Públicos"
    serverTypeEmoji = "🌐"
    serverTypeColor = "#4CAF50"
    if (action === "listPublicRoblox") {
      cache.listServerType = "public"
      cache.listCurrentPage = 0
    }
  } else if (action === "listVipRoblox" || (action.startsWith("list") && cache.listServerType === "vip")) {
    currentServers = cache.vipServers
    totalServers = cache.totalVipServers
    serverTypeLabel = "VIP"
    serverTypeEmoji = "💎"
    serverTypeColor = "#9C27B0"
    if (action === "listVipRoblox") {
      cache.listServerType = "vip"
      cache.listCurrentPage = 0
    }
  } else if (action === "listBackToMainRoblox") {
    // Reset list state and go back to main game info
    cache.listServerType = null
    cache.listCurrentPage = 0
    robloxSearchCache.set(userId, cache)
    // Re-render the initial game info embed
    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${cache.gameData.name}`)
      .setDescription(
        `**📊 Estadísticas Completas del Juego:**\n\n**👥 JUGADORES TOTALES: ${cache.totalPlayers.toLocaleString()}/${cache.totalMaxPlayers.toLocaleString()}**\n\n**🌐 Servidores Públicos:**\n🟢 Servidores: ${cache.totalPublicServers}\n👥 Jugadores: ${cache.publicPlayers.toLocaleString()}/${cache.publicMaxPlayers.toLocaleString()}\n\n**💎 Servidores VIP/Privados:**\n🔒 Servidores: ${cache.totalVipServers}\n👥 Jugadores: ${cache.vipPlayers.toLocaleString()}/${cache.vipMaxPlayers.toLocaleString()}\n\n**📈 Información General:**\n⭐ Rating: ${cache.gameData.totalUpVotes?.toLocaleString() || 0}👍 / ${cache.gameData.totalDownVotes?.toLocaleString() || 0}👎\n🎯 Visitas: ${cache.gameData.visits?.toLocaleString() || "N/A"}\n🎮 Jugando ahora: ${cache.gameData.playing?.toLocaleString() || cache.totalPlayers.toLocaleString()}`,
      )
      .setColor("#00b2ff")
      .setThumbnail(
        `https://www.roblox.com/asset-thumbnail/image?assetId=${cache.placeId}&width=150&height=150&format=png`,
      )
      .setFooter({
        text: `ID: ${cache.placeId} | Universe ID: ${cache.universeId} | Total de servidores: ${cache.totalServers}`,
      })
      .setTimestamp()

    const fullestPublicServer =
      cache.publicServers.length > 0
        ? cache.publicServers.reduce((prev, current) => (prev.playing > current.playing ? prev : current))
        : null
    const fullestVipServer =
      cache.vipServers.length > 0
        ? cache.vipServers.reduce((prev, current) => (prev.playing > current.playing ? prev : current))
        : null

    if (fullestPublicServer) {
      embed.addFields({
        name: "🔥 Servidor Público Más Lleno",
        value: `**ID:** ${fullestPublicServer.id}\n**Jugadores:** ${fullestPublicServer.playing}/${fullestPublicServer.maxPlayers}\n**Ping:** ${fullestPublicServer.ping || "N/A"}ms`,
        inline: true,
      })
    }
    if (fullestVipServer) {
      embed.addFields({
        name: "💎 Servidor VIP Más Lleno",
        value: `**ID:** ${fullestVipServer.id}\n**Jugadores:** ${fullestVipServer.playing}/${fullestVipServer.maxPlayers}\n**Ping:** ${fullestVipServer.ping || "N/A"}ms`,
        inline: true,
      })
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`publicRoblox-${userId}`)
        .setLabel("🌐 Ver Públicos")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(cache.totalPublicServers === 0),
      new ButtonBuilder()
        .setCustomId(`vipRoblox-${userId}`)
        .setLabel("💎 Ver VIP")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(cache.totalVipServers === 0),
      new ButtonBuilder()
        .setCustomId(`viewRobloxLists-${userId}`)
        .setLabel("📋 Listar Servidores")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(cache.totalServers === 0),
      new ButtonBuilder().setCustomId(`playRoblox-${userId}`).setLabel("🎮 Jugar").setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`refreshRoblox-${userId}`)
        .setLabel("🔄 Actualizar")
        .setStyle(ButtonStyle.Secondary),
    )
    return interaction.update({ embeds: [embed], components: [row] })
  }

  let newPage = cache.listCurrentPage
  if (action === "listNextRoblox" && (newPage + 1) * serversPerPage < totalServers) {
    newPage++
  } else if (action === "listPrevRoblox" && newPage > 0) {
    newPage--
  }
  cache.listCurrentPage = newPage
  robloxSearchCache.set(userId, cache)

  const startIndex = newPage * serversPerPage
  const endIndex = Math.min(startIndex + serversPerPage, totalServers)
  const serversToShow = currentServers.slice(startIndex, endIndex)

  let description = `**${serverTypeEmoji} Servidores ${serverTypeLabel} (${startIndex + 1}-${endIndex} de ${totalServers}):**\n\n`
  if (serversToShow.length === 0) {
    description += "No hay servidores disponibles en esta página."
  } else {
    serversToShow.forEach((server, i) => {
      description += `**${startIndex + i + 1}. ID:** \`${server.id}\`\n`
      description += `   **Jugadores:** ${server.playing}/${server.maxPlayers}\n`
      description += `   **Ping:** ${server.ping || "N/A"}ms\n`
      description += `   **URL:** [Unirse](https://www.roblox.com/games/start?placeId=${cache.placeId}&gameInstanceId=${server.id})\n\n`
    })
  }

  const embed = new EmbedBuilder()
    .setTitle(`📋 ${cache.gameData.name} - Lista de Servidores ${serverTypeLabel}`)
    .setDescription(description)
    .setColor(serverTypeColor)
    .setThumbnail(
      `https://www.roblox.com/asset-thumbnail/image?assetId=${cache.placeId}&width=150&height=150&format=png`,
    )
    .setFooter({ text: `Página ${newPage + 1} de ${Math.ceil(totalServers / serversPerPage)}` })
    .setTimestamp()

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`listPrevRoblox-${userId}`)
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(newPage === 0),
    new ButtonBuilder()
      .setCustomId(`listNextRoblox-${userId}`)
      .setLabel("➡️ Siguiente")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(endIndex >= totalServers),
    new ButtonBuilder()
      .setCustomId(`listBackToMainRoblox-${userId}`)
      .setLabel("🔙 Volver")
      .setStyle(ButtonStyle.Danger),
  )

  await interaction.update({ embeds: [embed], components: [buttons] })
}

async function handleRobloxNavigation(interaction, action) {
  const userId = interaction.user.id
  const cache = robloxSearchCache.get(userId)

  if (!cache) {
    return interaction.reply({ content: "❌ No hay datos de juego disponibles.", ephemeral: true })
  }

  let currentServers = []
  let serverTypeLabel = ""
  let serverTypeEmoji = ""
  let serverTypeColor = ""

  // Determine which server list to use based on the action or current cache state
  if (
    action === "publicRoblox" ||
    ((action.startsWith("prevRoblox") || action.startsWith("nextRoblox")) && cache.serverType === "public")
  ) {
    currentServers = cache.publicServers
    serverTypeLabel = "Público"
    serverTypeEmoji = "🌐"
    serverTypeColor = "#4CAF50"
    if (action === "publicRoblox") {
      // If entering this view, reset index
      cache.index = 0
      cache.serverType = "public"
    }
  } else if (
    action === "vipRoblox" ||
    ((action.startsWith("prevRoblox") || action.startsWith("nextRoblox")) && cache.serverType === "vip")
  ) {
    currentServers = cache.vipServers
    serverTypeLabel = "VIP"
    serverTypeEmoji = "💎"
    serverTypeColor = "#9C27B0"
    if (action === "vipRoblox") {
      // If entering this view, reset index
      cache.index = 0
      cache.serverType = "vip"
    }
  } else if (action === "playRoblox") {
    const playUrl = `https://www.roblox.com/games/${cache.placeId}`
    return interaction.reply({
      content: `🎮 **${cache.gameData.name}**\n🔗 ${playUrl}\n\n*Clic en el enlace para jugar directamente*`,
      ephemeral: true,
    })
  } else if (action === "refreshRoblox") {
    try {
      await interaction.deferUpdate()
      const newMessage = {
        author: { id: userId },
        reply: (content) => interaction.editReply(content),
        channel: interaction.channel,
      }
      await handleRobloxSearch(newMessage, [cache.placeId])
    } catch (error) {
      return interaction.editReply({ content: "❌ Error al actualizar datos del servidor." })
    }
    return
  } else if (action === "backRoblox") {
    // Go back to the main game info view
    const newMessage = {
      author: { id: userId },
      reply: (content) => interaction.editReply(content),
      channel: interaction.channel,
    }
    await handleRobloxSearch(newMessage, [cache.placeId])
    return
  } else {
    return interaction.reply({ content: "❌ Acción de navegación de Roblox no válida.", ephemeral: true })
  }

  if (currentServers.length === 0) {
    return interaction.reply({
      content: `❌ No hay servidores ${serverTypeLabel.toLowerCase()} disponibles.`,
      ephemeral: true,
    })
  }

  let newIndex = cache.index
  if (action.startsWith("nextRoblox") && newIndex < currentServers.length - 1) {
    newIndex++
  } else if (action.startsWith("prevRoblox") && newIndex > 0) {
    newIndex--
  }
  cache.index = newIndex
  robloxSearchCache.set(userId, cache)

  const server = currentServers[newIndex]
  const embed = new EmbedBuilder()
    .setTitle(`${serverTypeEmoji} ${cache.gameData.name} - Servidor ${serverTypeLabel}`)
    .setDescription(
      `**📊 Servidor ${serverTypeLabel} ${newIndex + 1} de ${currentServers.length}**\n\n**👥 Jugadores:** ${server.playing}/${server.maxPlayers}\n**🆔 ID del Servidor:** ${server.id}\n**📡 Ping:** ${server.ping || "N/A"}ms\n${serverTypeLabel === "Público" ? "**🌍 Región:** " + (server.location || "Global") : "**🔒 Tipo:** Servidor Privado/VIP"}`,
    )
    .setColor(serverTypeColor)
    .setThumbnail(
      `https://www.roblox.com/asset-thumbnail/image?assetId=${cache.placeId}&width=150&height=150&format=png`,
    )
    .setFooter({ text: `Servidor ${serverTypeLabel.toLowerCase()} ${newIndex + 1}/${currentServers.length}` })
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
      .setDisabled(newIndex === currentServers.length - 1),
    new ButtonBuilder().setCustomId(`joinRoblox-${userId}`).setLabel("🚀 Unirse").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`backRoblox-${userId}`).setLabel("🔙 Volver").setStyle(ButtonStyle.Secondary),
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

async function handleSelectMenu(interaction) {
  const [prefix, userId] = interaction.customId.split("-")

  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "⛔ No puedes usar este menú.", ephemeral: true })
  }

  const selectedValue = interaction.values[0]

  if (prefix === "langselect") {
    prefs[userId] = selectedValue
    savePreferences()

    const langEmoji = LANGUAGES.find((l) => l.value === selectedValue)?.emoji || "🌐"
    return interaction.reply({
      content: `${langEmoji} ${getTranslation(userId, "langSaved")}`,
      ephemeral: true,
    })
  } else if (prefix === "autoselect") {
    const validLang = LANGUAGES.find((l) => l.value === selectedValue)
    if (!validLang) {
      return interaction.reply({ content: getTranslation(userId, "invalidLanguage"), ephemeral: true })
    }

    autoTranslateUsers.set(userId, { targetLang: selectedValue })

    const langEmoji = validLang.emoji
    return interaction.reply({
      content: `${langEmoji} ${getTranslation(userId, "autoTranslateOn")} **${validLang.label}**`,
      ephemeral: true,
    })
  }
}

async function handleLanguageSelection(message) {
  const userId = message.author.id

  const selector = new StringSelectMenuBuilder()
    .setCustomId(`langselect-${userId}`)
    .setPlaceholder("🌐 Selecciona tu idioma")
    .addOptions(LANGUAGES.map((l) => ({ label: l.label, value: l.value, emoji: l.emoji })))

  return message.reply({
    content: "Selecciona tu idioma preferido:",
    components: [new ActionRowBuilder().addComponents(selector)],
    ephemeral: true,
  })
}

async function handleChatCommand(message) {
  const [_, mention] = message.content.split(" ")

  if (!mention) {
    return message.reply({ content: "⚠️ Debes mencionar al usuario con quien quieres chatear.", ephemeral: true })
  }

  const targetId = mention.replace(/<@!?(\d+)>/, "$1")
  const target = await client.users.fetch(targetId)

  if (!target) {
    return message.reply({ content: "❌ No se encontró al usuario mencionado.", ephemeral: true })
  }

  if (target.id === message.author.id) {
    return message.reply({ content: "⚠️ No puedes iniciar un chat contigo mismo.", ephemeral: true })
  }

  const userLang = getUserLanguage(message.author.id)
  const targetLang = getUserLanguage(target.id)

  if (userLang === targetLang) {
    return message.reply({ content: getTranslation(message.author.id, "sameLanguage"), ephemeral: true })
  }

  try {
    const channel = await message.guild.channels.create({
      name: `chat-${message.author.username}-con-${target.username}`,
      type: 0,
      permissionOverwrites: [
        {
          id: message.guild.id,
          deny: ["ViewChannel"],
        },
        {
          id: message.author.id,
          allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
        },
        {
          id: target.id,
          allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
        },
      ],
    })

    activeChats.set(channel.id, { users: [message.author.id, target.id] })

    const userEmoji = LANGUAGES.find((l) => l.value === userLang)?.emoji || "🌐"
    const targetEmoji = LANGUAGES.find((l) => l.value === targetLang)?.emoji || "🌐"

    const embed = new EmbedBuilder()
      .setTitle("💬 Chat de Traducción Automática")
      .setDescription(
        `${getTranslation(
          message.author.id,
          "chatActivated",
        )}\n\n${userEmoji} <@${message.author.id}> (${userLang})\n${targetEmoji} <@${target.id}> (${targetLang})`,
      )
      .setColor("#00c7ff")
      .setTimestamp()

    await channel.send({ embeds: [embed] })
    await message.reply({ content: `✅ Chat creado en <#${channel.id}>`, ephemeral: true })
  } catch (error) {
    console.error("Error al crear el canal:", error)
    await message.reply({ content: "❌ No se pudo crear el chat.", ephemeral: true })
  }
}

async function handleDisableChatCommand(message) {
  if (!message.member.permissions.has("Administrator")) {
    return message.reply({ content: getTranslation(message.author.id, "notAuthorized"), ephemeral: true })
  }

  const chat = activeChats.get(message.channel.id)

  if (!chat) {
    return message.reply({ content: getTranslation(message.author.id, "chatNoSession"), ephemeral: true })
  }

  try {
    await message.channel.delete()
    activeChats.delete(message.channel.id)
  } catch (error) {
    console.error("Error al cerrar el chat:", error)
    await message.reply({ content: "❌ No se pudo cerrar el chat.", ephemeral: true })
  }
}

async function handleWebSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply({ content: getTranslation(message.author.id, "noSearchQuery"), ephemeral: true })

  const cacheKey = `web-${message.author.id}-${query}`

  if (imageSearchCache.has(cacheKey)) {
    const cachedData = imageSearchCache.get(cacheKey)
    return displayImageResult(message, cachedData)
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(
    query,
  )}&searchType=image&fileType=jpg|jpeg|png&safe=high`

  try {
    const response = await makeGoogleAPIRequest(url, "google")
    const items = response.data.items

    if (!items || items.length === 0) {
      return message.reply({ content: getTranslation(message.author.id, "noValidImages"), ephemeral: true })
    }

    const validImages = []
    for (const item of items) {
      if (await isImageUrlValid(item.link)) {
        validImages.push(item)
      }
    }

    if (validImages.length === 0) {
      return message.reply({ content: getTranslation(message.author.id, "noValidImages"), ephemeral: true })
    }

    const data = { query, items: validImages, index: 0 }
    imageSearchCache.set(cacheKey, data)

    await displayImageResult(message, data)
  } catch (error) {
    console.error("Error en la búsqueda de imágenes:", error)
    message.reply({ content: `❌ Error en la búsqueda: ${error.message}`, ephemeral: true })
  }
}

async function displayImageResult(message, data) {
  const { query, items, index } = data
  const img = items[index]

  const apiInfo = apiManager.getCurrentAPIInfo("google")

  const embed = new EmbedBuilder()
    .setTitle(`📷 Resultados para: ${query}`)
    .setImage(img.link)
    .setDescription(`[Página donde está la imagen](${img.image.contextLink})`)
    .setFooter({
      text: `Imagen ${index + 1} de ${items.length} | API: ${apiInfo.id} | Quedan: ${apiInfo.remaining}/${apiInfo.max}`,
    })
    .setColor("#00c7ff")

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("prevImage")
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId("nextImage")
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === items.length - 1),
  )

  imageSearchCache.set(message.author.id, data)

  await message.reply({ embeds: [embed], components: [buttons] })
}

async function handleGeneralSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply({ content: getTranslation(message.author.id, "noSearchQuery"), ephemeral: true })

  const cacheKey = `general-${message.author.id}-${query}`

  if (generalSearchCache.has(cacheKey)) {
    const cachedData = generalSearchCache.get(cacheKey)
    return displayGeneralResult(message, cachedData)
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(query)}`

  try {
    const response = await makeGoogleAPIRequest(url, "google")
    const items = response.data.items

    if (!items || items.length === 0) {
      return message.reply({ content: "❌ No se encontraron resultados.", ephemeral: true })
    }

    const data = { query, items, index: 0 }
    generalSearchCache.set(cacheKey, data)

    await displayGeneralResult(message, data)
  } catch (error) {
    console.error("Error en la búsqueda general:", error)
    message.reply({ content: `❌ Error en la búsqueda: ${error.message}`, ephemeral: true })
  }
}

async function displayGeneralResult(message, data) {
  const { items, index } = data
  const item = items[index]

  const apiInfo = apiManager.getCurrentAPIInfo("google")

  const embed = new EmbedBuilder()
    .setTitle(`🔍 ${item.title}`)
    .setDescription(`${item.snippet}\n\n[🔗 Ver página completa](${item.link})`)
    .setColor("#4285f4")
    .setFooter({
      text: `Resultado ${index + 1} de ${items.length} | API: ${apiInfo.id} | Quedan: ${apiInfo.remaining}/${apiInfo.max}`,
    })
    .setTimestamp()

  if (item.pagemap?.cse_image?.[0]?.src) {
    embed.setThumbnail(item.pagemap.cse_image[0].src)
  }

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prevGeneral-${message.author.id}`)
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId(`nextGeneral-${message.author.id}`)
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === items.length - 1),
  )

  generalSearchCache.set(message.author.id, data)

  await message.reply({ embeds: [embed], components: [buttons] })
}

async function handleAdultSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply({ content: getTranslation(message.author.id, "noSearchQuery"), ephemeral: true })

  const cacheKey = `xxx-${message.author.id}-${query}`

  if (xxxSearchCache.has(cacheKey)) {
    const cachedData = xxxSearchCache.get(cacheKey)
    return displayAdultResult(message, cachedData)
  }

  if (pendingXXXSearch.has(message.author.id)) {
    return message.reply({ content: "⏳ Espera a que termine la búsqueda anterior...", ephemeral: true })
  }

  pendingXXXSearch.set(message.author.id, true)

  const url = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(
    query + " site:xvideos.com OR site:pornhub.com OR site:tnaflix.com",
  )}&safe=off`

  try {
    const response = await makeGoogleAPIRequest(url, "google")
    const items = response.data.items

    if (!items || items.length === 0) {
      return message.reply({ content: "❌ No se encontraron resultados.", ephemeral: true })
    }

    const data = { query, items, currentIndex: 0 }
    xxxSearchCache.set(cacheKey, data)

    await displayAdultResult(message, data)
  } catch (error) {
    console.error("Error en la búsqueda de videos XXX:", error)
    message.reply({ content: `❌ Error en la búsqueda: ${error.message}`, ephemeral: true })
  } finally {
    pendingXXXSearch.delete(message.author.id)
  }
}

async function displayAdultResult(message, data) {
  const { items, currentIndex } = data
  const item = items[currentIndex]

  const embed = createAdultSearchEmbed(item, currentIndex, items.length)
  const buttons = createNavigationButtons(message.author.id, currentIndex, items.length, "xxx")

  xxxSearchCache.set(message.author.id, data)

  await message.reply({ embeds: [embed], components: [buttons] })
}

async function handleComicSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply({ content: getTranslation(message.author.id, "noSearchQuery"), ephemeral: true })

  const cacheKey = `comic-${message.author.id}-${query}`

  if (comicSearchCache.has(cacheKey)) {
    const cachedData = comicSearchCache.get(cacheKey)
    return displayComicResult(message, cachedData)
  }

  if (pendingComicSearch.has(message.author.id)) {
    return message.reply({ content: "⏳ Espera a que termine la búsqueda anterior...", ephemeral: true })
  }

  pendingComicSearch.set(message.author.id, true)

  const url = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(
    query +
      " site:chochox.com OR site:reycomix.com OR site:ver-comics-porno.com OR site:hitomi.la OR site:vercomicsporno.xxx",
  )}&safe=off`

  try {
    const response = await makeGoogleAPIRequest(url, "google")
    const items = response.data.items

    if (!items || items.length === 0) {
      return message.reply({ content: "❌ No se encontraron resultados.", ephemeral: true })
    }

    const data = { query, items, currentIndex: 0 }
    comicSearchCache.set(cacheKey, data)

    await displayComicResult(message, data)
  } catch (error) {
    console.error("Error en la búsqueda de comics:", error)
    message.reply({ content: `❌ Error en la búsqueda: ${error.message}`, ephemeral: true })
  } finally {
    pendingComicSearch.delete(message.author.id)
  }
}

async function displayComicResult(message, data) {
  const { items, currentIndex } = data
  const item = items[currentIndex]

  const embed = createComicSearchEmbed(item, currentIndex, items.length)
  const buttons = createNavigationButtons(message.author.id, currentIndex, items.length, "comic")

  comicSearchCache.set(message.author.id, data)

  await message.reply({ embeds: [embed], components: [buttons] })
}

async function handleVideoSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply({ content: getTranslation(message.author.id, "noSearchQuery"), ephemeral: true })

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(
    query,
  )}&key=YOUTUBE_API_KEY`

  try {
    const response = await makeGoogleAPIRequest(url, "youtube")
    const items = response.data.items

    if (!items || items.length === 0) {
      return message.reply({ content: "❌ No se encontraron videos.", ephemeral: true })
    }

    const videoId = items[0].id.videoId
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    await message.reply({ content: `🎬 ${videoUrl}` })
  } catch (error) {
    console.error("Error en la búsqueda de videos:", error)
    message.reply({ content: `❌ Error en la búsqueda: ${error.message}`, ephemeral: true })
  }
}

async function handleXMLSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply({ content: getTranslation(message.author.id, "noSearchQuery"), ephemeral: true })

  const url = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(
    query + " site:xnxx.com",
  )}&safe=off`

  try {
    const response = await makeGoogleAPIRequest(url, "google")
    const items = response.data.items

    if (!items || items.length === 0) {
      return message.reply({ content: "❌ No se encontraron resultados.", ephemeral: true })
    }

    const videoUrl = items[0].link
    await message.reply({ content: `🔞 ${videoUrl}` })
  } catch (error) {
    console.error("Error en la búsqueda de videos XNXX:", error)
    message.reply({ content: `❌ Error en la búsqueda: ${error.message}`, ephemeral: true })
  }
}

async function handleTranslate(message) {
  if (!message.reference?.messageId) {
    return message.reply({ content: getTranslation(message.author.id, "mustReply"), ephemeral: true })
  }

  const repliedMessage = await message.channel.messages.fetch(message.reference.messageId)

  if (!repliedMessage) {
    return message.reply({ content: getTranslation(message.author.id, "timeout"), ephemeral: true })
  }

  const targetLang = getUserLanguage(message.author.id)

  if (repliedMessage.content === "") {
    return message.reply({ content: "❌ El mensaje original está vacío.", ephemeral: true })
  }

  if (repliedMessage.content === repliedMessage.content) {
    return message.reply({ content: getTranslation(message.author.id, "alreadyInLang"), ephemeral: true })
  }

  if (repliedMessage.author.id === message.author.id) {
    return message.reply({ content: getTranslation(message.author.id, "notYours"), ephemeral: true })
  }

  try {
    const result = await translateText(repliedMessage.content, targetLang)

    if (result && result.text) {
      const targetLangEmoji = LANGUAGES.find((l) => l.value === targetLang)?.emoji || "🌐"
      const embed = new EmbedBuilder()
        .setColor("#00c7ff")
        .setDescription(`${targetLangEmoji} ${result.text}`)
        .setFooter({ text: `Traducido de ${result.from} a ${targetLang}` })

      await message.reply({ embeds: [embed] })
    } else {
      await message.reply({ content: "❌ No se pudo traducir el mensaje.", ephemeral: true })
    }
  } catch (error) {
    console.error("Error en traducción:", error)
    await message.reply({ content: "❌ Error al traducir el mensaje.", ephemeral: true })
  }
}

client.login(process.env.DISCORD_TOKEN)
