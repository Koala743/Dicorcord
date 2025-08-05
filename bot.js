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
  {
    name: ".error",
    description: "Activa el registro de errores (solo admin)",
    example: ".error",
    category: "📊 Admin",
  },
  {
    name: ".derror",
    description: "Desactiva el registro de errores (solo admin)",
    example: ".derror",
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
let errorLoggingEnabled = false
let savedGames = {}

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
    userNoLanguage:
      "⚠️ El usuario mencionado no tiene un idioma guardado. Debe usar .ID para configurar su idioma primero.",
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
    userNoLanguage:
      "⚠️ The mentioned user doesn't have a saved language. They must use .ID to set their language first.",
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

function loadSavedGames() {
  try {
    savedGames = JSON.parse(fs.readFileSync("./savedGames.json"))
  } catch {
    savedGames = {}
  }
}

function saveSavedGames() {
  fs.writeFileSync("./savedGames.json", JSON.stringify(savedGames, null, 2))
}

function getUserLanguage(userId) {
  return prefs[userId] || "es"
}

function getTranslation(userId, key) {
  const userLang = getUserLanguage(userId)
  return translations[userLang]?.[key] || translations["es"][key]
}

async function logError(channel, error, context = "") {
  if (!errorLoggingEnabled) return

  const errorEmbed = new EmbedBuilder()
    .setTitle("🚨 Error Detectado")
    .setDescription(
      `**Contexto:** ${context}\n**Error:** \`${error.message}\`\n**Stack:** \`\`\`${error.stack?.slice(0, 1000) || "No disponible"}\`\`\``,
    )
    .setColor("#FF0000")
    .setTimestamp()

  try {
    await channel.send({ embeds: [errorEmbed] })
  } catch (e) {
    console.error("Error enviando log de error:", e)
  }
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

async function handleInviteRestrictions(message) {
  if (!CHANNELS.has(message.channel.id)) return

  const member = message.member
  if (!member) return

  const hasRestrictedRole = member.roles.cache.has(ROLE_CONFIG.restricted)
  const hasAllowedRole = Array.from(ROLE_CONFIG.allowed).some((roleId) => member.roles.cache.has(roleId))

  if (hasRestrictedRole && !hasAllowedRole) {
    const inviteRegex =
      /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/gi
    if (inviteRegex.test(message.content)) {
      try {
        await message.delete()
        const warningMessage = getTranslation(message.author.id, "inviteRestricted")
        const warning = await message.channel.send(`<@${message.author.id}> ${warningMessage}`)
        setTimeout(() => warning.delete().catch(() => {}), 10000)
      } catch (error) {
        await logError(message.channel, error, "Error eliminando mensaje con invitación")
      }
    }
  }
}

async function handleAutoTranslate(message) {
  const userId = message.author.id
  const autoTranslateData = autoTranslateUsers.get(userId)

  if (!autoTranslateData) return

  try {
    const result = await translateText(message.content, autoTranslateData.targetLang)
    if (result && result.text !== message.content) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: message.author.displayName || message.author.username,
          iconURL: message.author.displayAvatarURL(),
        })
        .setDescription(`**Original:** ${message.content}\n**Traducido:** ${result.text}`)
        .setColor("#00FF00")
        .setFooter({ text: `${result.from} → ${autoTranslateData.targetLang}` })
        .setTimestamp()

      await message.channel.send({ embeds: [embed] })
    }
  } catch (error) {
    await logError(message.channel, error, "Error en traducción automática")
  }
}

async function handleChatTranslation(message) {
  const userId = message.author.id
  const chatData = activeChats.get(message.channel.id)

  if (!chatData || (!chatData.users.has(userId) && userId !== chatData.initiator)) return

  try {
    const userLang = getUserLanguage(userId)
    const otherUserId = Array.from(chatData.users).find((id) => id !== userId) || chatData.initiator
    const otherUserLang = getUserLanguage(otherUserId)

    if (userLang === otherUserLang) return

    const result = await translateText(message.content, otherUserLang)
    if (result && result.text !== message.content) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: message.author.displayName || message.author.username,
          iconURL: message.author.displayAvatarURL(),
        })
        .setDescription(
          `**${userLang.toUpperCase()}:** ${message.content}\n**${otherUserLang.toUpperCase()}:** ${result.text}`,
        )
        .setColor("#FFD700")
        .setFooter({ text: `Chat traducido: ${userLang} ↔ ${otherUserLang}` })
        .setTimestamp()

      await message.channel.send({ embeds: [embed] })
    }
  } catch (error) {
    await logError(message.channel, error, "Error en chat de traducción")
  }
}

async function getPlayerNames(playerTokens) {
  if (!playerTokens || playerTokens.length === 0) return []

  try {
    const response = await axios.post(
      "https://users.roblox.com/v1/users",
      {
        userIds: playerTokens,
        excludeBannedUsers: true,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    )
    return response.data.data || []
  } catch (error) {
    console.log("Error obteniendo nombres de jugadores:", error.message)
    return playerTokens.map((token, index) => ({
      id: token,
      name: `Jugador_${index + 1}`,
      displayName: `Jugador_${index + 1}`,
    }))
  }
}

async function getPlayerAvatars(playerIds) {
  if (!playerIds || playerIds.length === 0) return []

  try {
    const response = await axios.get(
      `https://thumbnails.roblox.com/v1/users/avatar?userIds=${playerIds.join(",")}&size=420x420&format=Png&isCircular=false`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    )
    return response.data.data || []
  } catch (error) {
    console.log("Error obteniendo avatares de jugadores:", error.message)
    return []
  }
}

async function getGamePasses(universeId) {
  try {
    const response = await axios.get(
      `https://games.roblox.com/v1/games/${universeId}/game-passes?sortOrder=Asc&limit=100`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    )
    return response.data.data || []
  } catch (error) {
    console.log("Error obteniendo pases del juego:", error.message)
    return []
  }
}

async function handleRobloxSearch(message, args) {
  const input = args.join(" ")
  if (!input) return message.reply("⚠️ Debes escribir el ID del juego de Roblox o el nombre.")

  try {
    let universeId = null
    let placeId = null
    let gameData = null

    if (!isNaN(input)) {
      placeId = input
      const placeInfoUrl = `https://apis.roblox.com/universes/v1/places/${placeId}/universe`
      try {
        const placeInfoResponse = await axios.get(placeInfoUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        })
        universeId = placeInfoResponse.data.universeId
      } catch (error) {
        await logError(message.channel, error, "Error obteniendo universeId desde placeId")
        return message.reply("❌ No se pudo encontrar el juego con ese ID.")
      }
    } else {
      const searchUrl = `https://games.roblox.com/v1/games/list?model.keyword=${encodeURIComponent(input)}&model.maxRows=10&model.startRowIndex=0`
      const searchResponse = await axios.get(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      const games = searchResponse.data.games || []
      if (!games.length) {
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
          await logError(message.channel, error, "Error en búsqueda amplia de juegos")
          return message.reply("❌ No se encontró ningún juego con ese nombre.")
        }
      } else {
        const bestMatch = games.reduce((best, current) => {
          const currentScore = calculateSimilarity(input.toLowerCase(), current.name.toLowerCase())
          const bestScore = calculateSimilarity(input.toLowerCase(), best.name.toLowerCase())
          return currentScore > bestScore ? current : best
        })
        placeId = bestMatch.rootPlaceId
        universeId = bestMatch.universeId
      }
    }

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

    // Guardar el juego con su nombre
    savedGames[gameData.name] = {
      placeId: placeId,
      universeId: universeId,
      name: gameData.name,
      savedAt: new Date().toISOString(),
    }
    saveSavedGames()

    const publicServersUrl = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&limit=100`
    const publicServersResponse = await axios.get(publicServersUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    const publicServers = publicServersResponse.data.data || []

    const allPlayers = []
    publicServers.forEach((server, serverIndex) => {
      if (server.playerTokens && server.playerTokens.length > 0) {
        server.playerTokens.forEach((playerToken, playerIndex) => {
          allPlayers.push({
            serverIndex: serverIndex,
            serverId: server.id,
            playerToken: playerToken,
            playerIndex: playerIndex,
          })
        })
      }
    })

    const totalServers = publicServers.length
    const totalPlayers = publicServers.reduce((sum, server) => sum + server.playing, 0)
    const totalMaxPlayers = publicServers.reduce((sum, server) => sum + server.maxPlayers, 0)

    const fullestServer =
      publicServers.length > 0
        ? publicServers.reduce((prev, current) => (prev.playing > current.playing ? prev : current))
        : null

    robloxSearchCache.set(message.author.id, {
      publicServers,
      allServers: publicServers,
      allPlayers,
      index: 0,
      gameData,
      placeId,
      universeId,
      totalServers,
      totalPlayers,
      totalMaxPlayers,
    })

    const gameIconUrl = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`
    let gameIcon = null
    try {
      const iconResponse = await axios.get(gameIconUrl)
      gameIcon = iconResponse.data.data?.[0]?.imageUrl
    } catch (error) {
      console.log("Error obteniendo icono del juego:", error.message)
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${gameData.name}`)
      .setDescription(`**📊 Estadísticas del Juego:**

**👥 JUGADORES TOTALES: ${totalPlayers.toLocaleString()}/${totalMaxPlayers.toLocaleString()}**

**🌐 Servidores Públicos:**
🟢 Servidores: ${totalServers}
👥 Jugadores: ${totalPlayers.toLocaleString()}/${totalMaxPlayers.toLocaleString()}

**📈 Información General:**
⭐ Rating: ${gameData.totalUpVotes?.toLocaleString() || 0}👍 / ${gameData.totalDownVotes?.toLocaleString() || 0}👎
🎯 Visitas: ${gameData.visits?.toLocaleString() || "N/A"}
🎮 Jugando ahora: ${gameData.playing?.toLocaleString() || totalPlayers.toLocaleString()}`)
      .setColor("#00b2ff")
      .setThumbnail(
        gameIcon || `https://www.roblox.com/asset-thumbnail/image?assetId=${placeId}&width=150&height=150&format=png`,
      )
      .setFooter({
        text: `ID: ${placeId} | Universe ID: ${universeId} | Total de servidores: ${totalServers}`,
      })
      .setTimestamp()

    if (fullestServer) {
      embed.addFields({
        name: "🔥 Servidor Más Lleno",
        value: `**ID:** ${fullestServer.id}
**Jugadores:** ${fullestServer.playing}/${fullestServer.maxPlayers}
**Ping:** ${fullestServer.ping || "N/A"}ms`,
        inline: true,
      })
    }

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`publicRoblox-${message.author.id}`)
        .setLabel("🌐 Ver Servidores")
        .setStyle(ButtonStyle.Primary)
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

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`allServersRoblox-${message.author.id}`)
        .setLabel("📋 Todos los Servidores")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`allPlayersRoblox-${message.author.id}`)
        .setLabel("👥 Todos los Jugadores")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`playerCountRoblox-${message.author.id}`)
        .setLabel("📊 Contador Jugadores")
        .setStyle(ButtonStyle.Secondary),
    )

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`gamePassesRoblox-${message.author.id}`)
        .setLabel("🎫 Pases del Juego")
        .setStyle(ButtonStyle.Secondary),
    )

    await message.channel.send({ embeds: [embed], components: [row1, row2, row3] })
  } catch (error) {
    console.error("Error en búsqueda de Roblox:", error.message)
    await logError(message.channel, error, "Error general en búsqueda de Roblox")
    return message.reply(`❌ Error al obtener información de Roblox: ${error.message}`)
  }
}

async function handleAllPlayersView(interaction, cache, page = 0) {
  const { allServers, gameData } = cache
  if (allServers.length === 0) {
    return interaction.reply({ content: "❌ No hay servidores con jugadores disponibles.", ephemeral: true })
  }

  await interaction.deferUpdate()

  const allPlayersData = []

  for (let serverIndex = 0; serverIndex < allServers.length; serverIndex++) {
    const server = allServers[serverIndex]
    if (server.playerTokens && server.playerTokens.length > 0) {
      try {
        const playerNames = await getPlayerNames(server.playerTokens)
        const playerAvatars = await getPlayerAvatars(server.playerTokens)

        server.playerTokens.forEach((playerToken, playerIndex) => {
          const playerData = playerNames.find((p) => p.id === playerToken)
          const playerName = playerData ? playerData.displayName || playerData.name : `Jugador_${playerIndex + 1}`
          const avatarData = playerAvatars.find((a) => a.targetId == playerToken)
          const avatarUrl =
            avatarData?.imageUrl ||
            `https://www.roblox.com/headshot-thumbnail/image?userId=${playerToken}&width=420&height=420&format=png`

          allPlayersData.push({
            name: playerName,
            id: playerToken,
            avatar: avatarUrl,
            serverId: server.id,
            serverIndex: serverIndex + 1,
          })
        })
      } catch (error) {
        await logError(interaction.channel, error, "Error obteniendo datos de jugadores")
      }
    }
  }

  const playersPerPage = 20
  const totalPages = Math.ceil(allPlayersData.length / playersPerPage)
  const startIndex = page * playersPerPage
  const endIndex = startIndex + playersPerPage
  const currentPlayers = allPlayersData.slice(startIndex, endIndex)

  let playerList = `**👥 TODOS LOS JUGADORES (Página ${page + 1}/${totalPages}):**\n\n`

  currentPlayers.forEach((player, index) => {
    const globalIndex = startIndex + index + 1
    playerList += `**${globalIndex}.** ${player.name} (ID: \`${player.id}\`)\n`
    playerList += `🖼️ [Ver Avatar](${player.avatar}) | 🖥️ Servidor ${player.serverIndex}\n\n`
  })

  if (currentPlayers.length === 0) {
    playerList = "❌ No se encontraron jugadores en esta página."
  }

  const embed = new EmbedBuilder()
    .setTitle(`👥 ${gameData.name} - Todos los Jugadores`)
    .setDescription(playerList)
    .setColor("#00FF00")
    .setFooter({ text: `Página ${page + 1}/${totalPages} | Total: ${allPlayersData.length} jugadores` })
    .setTimestamp()

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prevPlayersPage-${interaction.user.id}-${page}`)
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`nextPlayersPage-${interaction.user.id}-${page}`)
      .setLabel("➡️ Siguiente")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`backRoblox-${interaction.user.id}`)
      .setLabel("🔙 Volver")
      .setStyle(ButtonStyle.Secondary),
  )

  // Guardar datos de paginación en cache
  cache.allPlayersData = allPlayersData
  cache.currentPlayersPage = page
  robloxSearchCache.set(interaction.user.id, cache)

  await interaction.editReply({ embeds: [embed], components: [buttons] })
}

async function handlePlayerCountView(interaction, cache, page = 0, filterType = "all") {
  const { allServers, gameData, totalPlayers, totalServers } = cache

  let serverStats = []
  allServers.forEach((server, index) => {
    serverStats.push({
      index: index + 1,
      id: server.id,
      players: server.playing,
      maxPlayers: server.maxPlayers,
      ping: server.ping || "N/A",
    })
  })

  // Aplicar filtros
  switch (filterType) {
    case "fullest":
      serverStats.sort((a, b) => b.players - a.players)
      serverStats = serverStats.slice(0, 10)
      break
    case "emptiest":
      serverStats.sort((a, b) => a.players - b.players)
      serverStats = serverStats.slice(0, 10)
      break
    case "random":
      serverStats = serverStats.sort(() => 0.5 - Math.random()).slice(0, 10)
      break
    default:
      serverStats.sort((a, b) => b.players - a.players)
      break
  }

  const serversPerPage = 20
  const totalPages = Math.ceil(serverStats.length / serversPerPage)
  const startIndex = page * serversPerPage
  const endIndex = startIndex + serversPerPage
  const currentServers = serverStats.slice(startIndex, endIndex)

  let countByServer = `**📊 CONTADOR DE JUGADORES${filterType !== "all" ? ` (${filterType.toUpperCase()})` : ""} (Página ${page + 1}/${totalPages}):**\n\n`

  currentServers.forEach((server, index) => {
    const globalIndex = startIndex + index + 1
    countByServer += `**${globalIndex}.** 🌐 Público\n`
    countByServer += `👥 **${server.players}/${server.maxPlayers}** jugadores\n`
    countByServer += `🆔 ID: \`${server.id}\`\n`
    countByServer += `📡 Ping: ${server.ping}ms\n\n`
  })

  countByServer += `\n**📈 RESUMEN TOTAL:**\n`
  countByServer += `👥 Total General: ${totalPlayers}\n`
  countByServer += `🖥️ Total Servidores: ${totalServers}`

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${gameData.name} - Contador de Jugadores`)
    .setDescription(countByServer)
    .setColor("#FF6B35")
    .setFooter({ text: `Página ${page + 1}/${totalPages} | Filtro: ${filterType}` })
    .setTimestamp()

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prevCountPage-${interaction.user.id}-${page}-${filterType}`)
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`nextCountPage-${interaction.user.id}-${page}-${filterType}`)
      .setLabel("➡️ Siguiente")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`backRoblox-${interaction.user.id}`)
      .setLabel("🔙 Volver")
      .setStyle(ButtonStyle.Secondary),
  )

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`fullestServers-${interaction.user.id}`)
      .setLabel("🔥 Más Llenos")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`emptiestServers-${interaction.user.id}`)
      .setLabel("🌙 Más Vacíos")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`randomServers-${interaction.user.id}`)
      .setLabel("🎲 Random")
      .setStyle(ButtonStyle.Secondary),
  )

  // Guardar datos en cache
  cache.serverStats = serverStats
  cache.currentCountPage = page
  cache.currentFilter = filterType
  robloxSearchCache.set(interaction.user.id, cache)

  await interaction.update({ embeds: [embed], components: [row1, row2] })
}

async function handleGamePassesView(interaction, cache, page = 0) {
  const { gameData, universeId } = cache

  await interaction.deferUpdate()

  try {
    const gamePasses = await getGamePasses(universeId)

    if (gamePasses.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle(`🎫 ${gameData.name} - Pases del Juego`)
        .setDescription("❌ Este juego no tiene pases disponibles.")
        .setColor("#FFA500")
        .setTimestamp()

      const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`backRoblox-${interaction.user.id}`)
          .setLabel("🔙 Volver")
          .setStyle(ButtonStyle.Secondary),
      )

      return await interaction.editReply({ embeds: [embed], components: [backButton] })
    }

    const passesPerPage = 10
    const totalPages = Math.ceil(gamePasses.length / passesPerPage)
    const startIndex = page * passesPerPage
    const endIndex = startIndex + passesPerPage
    const currentPasses = gamePasses.slice(startIndex, endIndex)

    let passesList = `**🎫 PASES DEL JUEGO (Página ${page + 1}/${totalPages}):**\n\n`

    for (let i = 0; i < currentPasses.length; i++) {
      const pass = currentPasses[i]
      const globalIndex = startIndex + i + 1

      // Obtener icono del pase
      let passIcon = null
      try {
        const iconResponse = await axios.get(
          `https://thumbnails.roblox.com/v1/game-passes?gamePassIds=${pass.id}&size=150x150&format=Png`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          },
        )
        passIcon = iconResponse.data.data?.[0]?.imageUrl
      } catch (error) {
        console.log("Error obteniendo icono del pase:", error.message)
      }

      passesList += `**${globalIndex}.** ${pass.name}\n`
      passesList += `💰 **Precio:** ${pass.price ? `${pass.price.toLocaleString()} Robux` : "Gratis"}\n`
      passesList += `🆔 **ID:** ${pass.id}\n`
      if (passIcon) {
        passesList += `🖼️ [Ver Icono](${passIcon})\n`
      }
      passesList += `🔗 [Ver en Roblox](https://www.roblox.com/es/game-pass/${pass.id})\n\n`
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎫 ${gameData.name} - Pases del Juego`)
      .setDescription(passesList)
      .setColor("#FFD700")
      .setFooter({ text: `Página ${page + 1}/${totalPages} | Total: ${gamePasses.length} pases` })
      .setTimestamp()

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`prevPassesPage-${interaction.user.id}-${page}`)
        .setLabel("⬅️ Anterior")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`nextPassesPage-${interaction.user.id}-${page}`)
        .setLabel("➡️ Siguiente")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= totalPages - 1),
      new ButtonBuilder()
        .setCustomId(`backRoblox-${interaction.user.id}`)
        .setLabel("🔙 Volver")
        .setStyle(ButtonStyle.Secondary),
    )

    // Guardar datos en cache
    cache.gamePasses = gamePasses
    cache.currentPassesPage = page
    robloxSearchCache.set(interaction.user.id, cache)

    await interaction.editReply({ embeds: [embed], components: [buttons] })
  } catch (error) {
    await logError(interaction.channel, error, "Error obteniendo pases del juego")
    const embed = new EmbedBuilder()
      .setTitle(`🎫 ${gameData.name} - Pases del Juego`)
      .setDescription("❌ Error al obtener los pases del juego. Intenta de nuevo más tarde.")
      .setColor("#FF0000")
      .setTimestamp()

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`backRoblox-${interaction.user.id}`)
        .setLabel("🔙 Volver")
        .setStyle(ButtonStyle.Secondary),
    )

    await interaction.editReply({ embeds: [embed], components: [backButton] })
  }
}

async function handleAllServersView(interaction, cache) {
  const { allServers, gameData, placeId } = cache
  if (allServers.length === 0) {
    return interaction.reply({ content: "❌ No hay servidores disponibles.", ephemeral: true })
  }

  let serverList = "**📋 TODOS LOS SERVIDORES:**\n\n"
  for (let index = 0; index < allServers.length; index++) {
    const server = allServers[index]
    const joinUrl = `https://www.roblox.com/games/start?placeId=${placeId}&gameInstanceId=${server.id}`
    serverList += `**${index + 1}.** 🌐 Público\n`
    serverList += `🆔 **ID:** \`${server.id}\`\n`
    serverList += `👥 **Jugadores:** ${server.playing}/${server.maxPlayers}\n`
    serverList += `📡 **Ping:** ${server.ping || "N/A"}ms\n`
    serverList += `🔗 **URL:** ${joinUrl}\n\n`

    if (index >= 9) {
      serverList += `*... y ${allServers.length - 10} servidores más*\n`
      break
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`📋 ${gameData.name} - Todos los Servidores`)
    .setDescription(serverList)
    .setColor("#FFA500")
    .setFooter({ text: `Total: ${allServers.length} servidores` })
    .setTimestamp()

  const backButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`backRoblox-${interaction.user.id}`)
      .setLabel("🔙 Volver")
      .setStyle(ButtonStyle.Secondary),
  )

  await interaction.update({ embeds: [embed], components: [backButton] })
}

async function handleRobloxNavigation(interaction, action) {
  const userId = interaction.user.id
  const cache = robloxSearchCache.get(userId)

  if (interaction.replied || interaction.deferred) {
    return
  }

  if (!cache) {
    await logError(interaction.channel, new Error("Cache no encontrado"), `Usuario: ${userId}, Acción: ${action}`)
    return interaction.reply({
      content: "❌ No hay datos de juego disponibles. Usa .roblox [juego] primero.",
      ephemeral: true,
    })
  }

  try {
    if (action === "allServersRoblox") {
      await handleAllServersView(interaction, cache)
    } else if (action === "allPlayersRoblox") {
      await handleAllPlayersView(interaction, cache, 0)
    } else if (action === "playerCountRoblox") {
      await handlePlayerCountView(interaction, cache, 0, "all")
    } else if (action === "gamePassesRoblox") {
      await handleGamePassesView(interaction, cache, 0)
    } else if (action.startsWith("prevPlayersPage")) {
      const currentPage = Number.parseInt(action.split("-")[2]) || 0
      await handleAllPlayersView(interaction, cache, Math.max(0, currentPage - 1))
    } else if (action.startsWith("nextPlayersPage")) {
      const currentPage = Number.parseInt(action.split("-")[2]) || 0
      await handleAllPlayersView(interaction, cache, currentPage + 1)
    } else if (action.startsWith("prevCountPage")) {
      const parts = action.split("-")
      const currentPage = Number.parseInt(parts[2]) || 0
      const filterType = parts[3] || "all"
      await handlePlayerCountView(interaction, cache, Math.max(0, currentPage - 1), filterType)
    } else if (action.startsWith("nextCountPage")) {
      const parts = action.split("-")
      const currentPage = Number.parseInt(parts[2]) || 0
      const filterType = parts[3] || "all"
      await handlePlayerCountView(interaction, cache, currentPage + 1, filterType)
    } else if (action.startsWith("prevPassesPage")) {
      const currentPage = Number.parseInt(action.split("-")[2]) || 0
      await handleGamePassesView(interaction, cache, Math.max(0, currentPage - 1))
    } else if (action.startsWith("nextPassesPage")) {
      const currentPage = Number.parseInt(action.split("-")[2]) || 0
      await handleGamePassesView(interaction, cache, currentPage + 1)
    } else if (action === "fullestServers") {
      await handlePlayerCountView(interaction, cache, 0, "fullest")
    } else if (action === "emptiestServers") {
      await handlePlayerCountView(interaction, cache, 0, "emptiest")
    } else if (action === "randomServers") {
      await handlePlayerCountView(interaction, cache, 0, "random")
    } else if (action === "playRoblox") {
      const playUrl = `https://www.roblox.com/games/${cache.placeId}`
      return interaction.reply({
        content: `🎮 **${cache.gameData.name}**\n🔗 ${playUrl}\n*Clic en el enlace para jugar directamente*`,
        ephemeral: true,
      })
    } else if (action === "refreshRoblox") {
      await interaction.deferUpdate()

      try {
        const publicServersUrl = `https://games.roblox.com/v1/games/${cache.placeId}/servers/Public?sortOrder=Desc&limit=100`
        const publicServersResponse = await axios.get(publicServersUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        })

        const publicServers = publicServersResponse.data.data || []
        const totalServers = publicServers.length
        const totalPlayers = publicServers.reduce((sum, server) => sum + server.playing, 0)
        const totalMaxPlayers = publicServers.reduce((sum, server) => sum + server.maxPlayers, 0)

        // Actualizar cache
        cache.publicServers = publicServers
        cache.allServers = publicServers
        cache.totalServers = totalServers
        cache.totalPlayers = totalPlayers
        cache.totalMaxPlayers = totalMaxPlayers
        robloxSearchCache.set(userId, cache)

        const gameIconUrl = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${cache.universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`
        let gameIcon = null
        try {
          const iconResponse = await axios.get(gameIconUrl)
          gameIcon = iconResponse.data.data?.[0]?.imageUrl
        } catch (error) {
          console.log("Error obteniendo icono del juego:", error.message)
        }

        const embed = new EmbedBuilder()
          .setTitle(`🎮 ${cache.gameData.name} (Actualizado)`)
          .setDescription(`**📊 Estadísticas del Juego:**

**👥 JUGADORES TOTALES: ${totalPlayers.toLocaleString()}/${totalMaxPlayers.toLocaleString()}**

**🌐 Servidores Públicos:**
🟢 Servidores: ${totalServers}
👥 Jugadores: ${totalPlayers.toLocaleString()}/${totalMaxPlayers.toLocaleString()}

**📈 Información General:**
⭐ Rating: ${cache.gameData.totalUpVotes?.toLocaleString() || 0}👍 / ${cache.gameData.totalDownVotes?.toLocaleString() || 0}👎
🎯 Visitas: ${cache.gameData.visits?.toLocaleString() || "N/A"}`)
          .setColor("#00b2ff")
          .setThumbnail(
            gameIcon ||
              `https://www.roblox.com/asset-thumbnail/image?assetId=${cache.placeId}&width=150&height=150&format=png`,
          )
          .setFooter({
            text: `ID: ${cache.placeId} | Actualizado: ${new Date().toLocaleTimeString()}`,
          })
          .setTimestamp()

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`publicRoblox-${userId}`)
            .setLabel("🌐 Ver Servidores")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(totalServers === 0),
          new ButtonBuilder().setCustomId(`playRoblox-${userId}`).setLabel("🎮 Jugar").setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`refreshRoblox-${userId}`)
            .setLabel("🔄 Actualizar")
            .setStyle(ButtonStyle.Secondary),
        )

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`allServersRoblox-${userId}`)
            .setLabel("📋 Todos los Servidores")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`allPlayersRoblox-${userId}`)
            .setLabel("👥 Todos los Jugadores")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`playerCountRoblox-${userId}`)
            .setLabel("📊 Contador Jugadores")
            .setStyle(ButtonStyle.Secondary),
        )

        const row3 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`gamePassesRoblox-${userId}`)
            .setLabel("🎫 Pases del Juego")
            .setStyle(ButtonStyle.Secondary),
        )

        await interaction.editReply({ embeds: [embed], components: [row1, row2, row3] })
      } catch (error) {
        await logError(interaction.channel, error, "Error actualizando datos de Roblox")
        await interaction.editReply({ content: "❌ Error al actualizar los datos. Intenta de nuevo.", components: [] })
      }
    } else if (action === "backRoblox") {
      const gameIconUrl = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${cache.universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`
      let gameIcon = null
      try {
        const iconResponse = await axios.get(gameIconUrl)
        gameIcon = iconResponse.data.data?.[0]?.imageUrl
      } catch (error) {
        console.log("Error obteniendo icono del juego:", error.message)
      }

      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${cache.gameData.name}`)
        .setDescription(`**📊 Estadísticas del Juego:**

**👥 JUGADORES TOTALES: ${cache.totalPlayers.toLocaleString()}/${cache.totalMaxPlayers?.toLocaleString() || "N/A"}**

**🌐 Servidores Públicos:**
🟢 Servidores: ${cache.totalServers}
👥 Jugadores: ${cache.totalPlayers.toLocaleString()}

**📈 Información General:**
⭐ Rating: ${cache.gameData.totalUpVotes?.toLocaleString() || 0}👍 / ${cache.gameData.totalDownVotes?.toLocaleString() || 0}👎
🎯 Visitas: ${cache.gameData.visits?.toLocaleString() || "N/A"}`)
        .setColor("#00b2ff")
        .setThumbnail(
          gameIcon ||
            `https://www.roblox.com/asset-thumbnail/image?assetId=${cache.placeId}&width=150&height=150&format=png`,
        )
        .setFooter({
          text: `ID: ${cache.placeId} | Total de servidores: ${cache.totalServers}`,
        })
        .setTimestamp()

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`publicRoblox-${userId}`)
          .setLabel("🌐 Ver Servidores")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(cache.totalServers === 0),
        new ButtonBuilder().setCustomId(`playRoblox-${userId}`).setLabel("🎮 Jugar").setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`refreshRoblox-${userId}`)
          .setLabel("🔄 Actualizar")
          .setStyle(ButtonStyle.Secondary),
      )

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`allServersRoblox-${userId}`)
          .setLabel("📋 Todos los Servidores")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`allPlayersRoblox-${userId}`)
          .setLabel("👥 Todos los Jugadores")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`playerCountRoblox-${userId}`)
          .setLabel("📊 Contador Jugadores")
          .setStyle(ButtonStyle.Secondary),
      )

      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`gamePassesRoblox-${userId}`)
          .setLabel("🎫 Pases del Juego")
          .setStyle(ButtonStyle.Secondary),
      )

      return interaction.update({ embeds: [embed], components: [row1, row2, row3] })
    }
  } catch (error) {
    await logError(interaction.channel, error, `Error en navegación Roblox - Acción: ${action}`)
    return interaction.reply({ content: "❌ Error procesando la acción. Intenta de nuevo.", ephemeral: true })
  }
}

async function handleImageSearch(message, args) {
  const query = args.join(" ")
  if (!query) {
    return message.reply(getTranslation(message.author.id, "noSearchQuery"))
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(query)}&searchType=image&num=10&safe=off`
    const response = await makeGoogleAPIRequest(url)

    if (!response.data.items || response.data.items.length === 0) {
      return message.reply(getTranslation(message.author.id, "noValidImages"))
    }

    const validImages = []
    for (const item of response.data.items) {
      if (await isImageUrlValid(item.link)) {
        validImages.push(item)
      }
      if (validImages.length >= 10) break
    }

    if (validImages.length === 0) {
      return message.reply(getTranslation(message.author.id, "noValidImages"))
    }

    imageSearchCache.set(message.author.id, { images: validImages, query, index: 0 })

    const currentImage = validImages[0]
    const embed = new EmbedBuilder()
      .setTitle(`🔍 Resultados para: "${query}"`)
      .setDescription(`**${currentImage.title}**\n[Ver imagen original](${currentImage.link})`)
      .setImage(currentImage.link)
      .setColor("#4285f4")
      .setFooter({ text: `Imagen 1 de ${validImages.length}` })
      .setTimestamp()

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`prevImage-${message.author.id}`)
        .setLabel("⬅️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`nextImage-${message.author.id}`)
        .setLabel("➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(validImages.length <= 1),
    )

    await message.channel.send({ embeds: [embed], components: [row] })
  } catch (error) {
    await logError(message.channel, error, "Error en búsqueda de imágenes")
    return message.reply(`❌ Error en la búsqueda: ${error.message}`)
  }
}

async function handleGeneralSearch(message, args) {
  const query = args.join(" ")
  if (!query) {
    return message.reply(getTranslation(message.author.id, "noSearchQuery"))
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(query)}&num=10`
    const response = await makeGoogleAPIRequest(url)

    if (!response.data.items || response.data.items.length === 0) {
      return message.reply("❌ No se encontraron resultados para tu búsqueda.")
    }

    generalSearchCache.set(message.author.id, { results: response.data.items, query, index: 0 })

    const currentResult = response.data.items[0]
    const embed = new EmbedBuilder()
      .setTitle(`🔍 Resultados para: "${query}"`)
      .setDescription(
        `**[${currentResult.title}](${currentResult.link})**\n\n${currentResult.snippet || "Sin descripción disponible"}`,
      )
      .setColor("#4285f4")
      .setFooter({ text: `Resultado 1 de ${response.data.items.length}` })
      .setTimestamp()

    if (currentResult.pagemap?.cse_image?.[0]?.src) {
      embed.setThumbnail(currentResult.pagemap.cse_image[0].src)
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`prevResult-${message.author.id}`)
        .setLabel("⬅️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`nextResult-${message.author.id}`)
        .setLabel("➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(response.data.items.length <= 1),
    )

    await message.channel.send({ embeds: [embed], components: [row] })
  } catch (error) {
    await logError(message.channel, error, "Error en búsqueda general")
    return message.reply(`❌ Error en la búsqueda: ${error.message}`)
  }
}

async function handleYouTubeSearch(message, args) {
  const query = args.join(" ")
  if (!query) {
    return message.reply(getTranslation(message.author.id, "noSearchQuery"))
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(query)}&type=video&key=GOOGLE_API_KEY`
    const response = await makeGoogleAPIRequest(url, "youtube")

    if (!response.data.items || response.data.items.length === 0) {
      return message.reply("❌ No se encontraron videos para tu búsqueda.")
    }

    const video = response.data.items[0]
    const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`

    const embed = new EmbedBuilder()
      .setTitle(`🎬 ${video.snippet.title}`)
      .setDescription(
        `**Canal:** ${video.snippet.channelTitle}\n**Descripción:** ${video.snippet.description.slice(0, 200)}...`,
      )
      .setURL(videoUrl)
      .setThumbnail(video.snippet.thumbnails.medium.url)
      .setColor("#FF0000")
      .setTimestamp()

    await message.channel.send({ content: `🎬 **Video encontrado:**\n${videoUrl}`, embeds: [embed] })
  } catch (error) {
    await logError(message.channel, error, "Error en búsqueda de YouTube")
    return message.reply(`❌ Error en la búsqueda de YouTube: ${error.message}`)
  }
}

async function handleXXXSearch(message, args) {
  const query = args.join(" ")
  if (!query) {
    return message.reply(getTranslation(message.author.id, "noSearchQuery"))
  }

  const userId = message.author.id
  pendingXXXSearch.set(userId, query)

  const embed = new EmbedBuilder()
    .setTitle("🔞 Búsqueda de Contenido Adulto")
    .setDescription(
      `**Búsqueda:** "${query}"\n\n⚠️ **ADVERTENCIA:** Este contenido es para adultos (+18)\n\nSelecciona un sitio para buscar:`,
    )
    .setColor("#FF69B4")
    .setTimestamp()

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`xxxSiteSelect-${userId}`)
    .setPlaceholder("Selecciona un sitio...")
    .addOptions([
      { label: "Pornhub", value: "pornhub.com", emoji: "🟠" },
      { label: "Xvideos", value: "xvideos.com", emoji: "🔴" },
      { label: "Xnxx", value: "xnxx.com", emoji: "🟣" },
      { label: "RedTube", value: "redtube.com", emoji: "🔵" },
      { label: "YouPorn", value: "youporn.com", emoji: "🟢" },
    ])

  const row = new ActionRowBuilder().addComponents(selectMenu)
  await message.channel.send({ embeds: [embed], components: [row] })
}

async function handleComicSearch(message, args) {
  const query = args.join(" ")
  if (!query) {
    return message.reply(getTranslation(message.author.id, "noSearchQuery"))
  }

  const userId = message.author.id
  pendingComicSearch.set(userId, query)

  const embed = new EmbedBuilder()
    .setTitle("📚 Búsqueda de Comics Adultos")
    .setDescription(
      `**Búsqueda:** "${query}"\n\n⚠️ **ADVERTENCIA:** Este contenido es para adultos (+18)\n\nSelecciona un sitio para buscar:`,
    )
    .setColor("#9B59B6")
    .setTimestamp()

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`comicSiteSelect-${userId}`)
    .setPlaceholder("Selecciona un sitio...")
    .addOptions(COMIC_SITES)

  const row = new ActionRowBuilder().addComponents(selectMenu)
  await message.channel.send({ embeds: [embed], components: [row] })
}

async function handleTranslateCommand(message) {
  if (!message.reference?.messageId) {
    return message.reply(getTranslation(message.author.id, "mustReply"))
  }

  try {
    const referencedMessage = await message.channel.messages.fetch(message.reference.messageId)
    const targetLang = getUserLanguage(message.author.id)

    if (referencedMessage.author.id === message.author.id) {
      return message.reply(getTranslation(message.author.id, "notYours"))
    }

    const result = await translateText(referencedMessage.content, targetLang)
    if (!result) {
      return message.reply("❌ Error al traducir el mensaje.")
    }

    if (result.from === targetLang) {
      return message.reply(getTranslation(message.author.id, "alreadyInLang"))
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: referencedMessage.author.displayName || referencedMessage.author.username,
        iconURL: referencedMessage.author.displayAvatarURL(),
      })
      .setDescription(
        `**Original (${result.from}):** ${referencedMessage.content}\n**Traducido (${targetLang}):** ${result.text}`,
      )
      .setColor("#00FF00")
      .setTimestamp()

    await message.channel.send({ embeds: [embed] })
  } catch (error) {
    await logError(message.channel, error, "Error en comando de traducción")
    return message.reply("❌ Error al procesar la traducción.")
  }
}

async function handleLanguageSelection(message) {
  const embed = new EmbedBuilder()
    .setTitle("🌍 Selecciona tu idioma")
    .setDescription("Elige tu idioma predeterminado para las traducciones:")
    .setColor("#3498db")
    .setTimestamp()

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`languageSelect-${message.author.id}`)
    .setPlaceholder("Selecciona un idioma...")
    .addOptions(LANGUAGES)

  const row = new ActionRowBuilder().addComponents(selectMenu)
  await message.channel.send({ embeds: [embed], components: [row] })
}

async function handleAutoTranslateCommand(message, args) {
  const userId = message.author.id
  const targetLang = args[0]

  if (!targetLang) {
    return message.reply(getTranslation(userId, "invalidLanguage"))
  }

  const validLanguages = ["es", "en", "fr", "de", "pt", "it", "ru", "ja", "ko", "zh-CN"]
  if (!validLanguages.includes(targetLang)) {
    return message.reply(getTranslation(userId, "invalidLanguage"))
  }

  autoTranslateUsers.set(userId, { targetLang })
  const langName = LANGUAGES.find((l) => l.value === targetLang)?.label || targetLang
  await message.reply(`${getTranslation(userId, "autoTranslateOn")} **${langName}**`)
}

async function handleDeactivateAutoTranslate(message) {
  const userId = message.author.id
  if (!autoTranslateUsers.has(userId)) {
    return message.reply(getTranslation(userId, "autoTranslateNotActive"))
  }

  autoTranslateUsers.delete(userId)
  await message.reply(getTranslation(userId, "autoTranslateOff"))
}

async function handleChatCommand(message) {
  const mentionedUser = message.mentions.users.first()
  if (!mentionedUser) {
    return message.reply("⚠️ Debes mencionar a un usuario para iniciar el chat.")
  }

  const initiatorLang = getUserLanguage(message.author.id)
  const mentionedUserLang = getUserLanguage(mentionedUser.id)

  if (!prefs[mentionedUser.id]) {
    return message.reply(getTranslation(message.author.id, "userNoLanguage"))
  }

  if (initiatorLang === mentionedUserLang) {
    return message.reply(getTranslation(message.author.id, "sameLanguage"))
  }

  activeChats.set(message.channel.id, {
    initiator: message.author.id,
    users: new Set([message.author.id, mentionedUser.id]),
    startTime: Date.now(),
  })

  await message.reply(getTranslation(message.author.id, "chatActivated"))
}

async function handleEndChatCommand(message) {
  if (!activeChats.has(message.channel.id)) {
    return message.reply(getTranslation(message.author.id, "chatNoSession"))
  }

  const chatData = activeChats.get(message.channel.id)
  if (chatData.initiator !== message.author.id && !message.member.permissions.has("ADMINISTRATOR")) {
    return message.reply(getTranslation(message.author.id, "notAuthorized"))
  }

  activeChats.delete(message.channel.id)
  await message.reply(getTranslation(message.author.id, "chatDeactivated"))
}

async function handleCommandsList(message) {
  const categories = {}
  COMMANDS_LIST.forEach((cmd) => {
    if (!categories[cmd.category]) {
      categories[cmd.category] = []
    }
    categories[cmd.category].push(cmd)
  })

  const embed = new EmbedBuilder().setTitle("📋 Lista de Comandos Disponibles").setColor("#3498db").setTimestamp()

  Object.keys(categories).forEach((category) => {
    const commands = categories[category]
    const commandList = commands
      .map((cmd) => `**${cmd.name}**\n${cmd.description}\n*Ejemplo: ${cmd.example}*`)
      .join("\n\n")
    embed.addFields({ name: category, value: commandList, inline: false })
  })

  await message.channel.send({ embeds: [embed] })
}

async function handleAPIStats(message) {
  if (!message.member.permissions.has("ADMINISTRATOR")) {
    return message.reply(getTranslation(message.author.id, "notAuthorized"))
  }

  const googleStats = apiManager.getAPIStats("google")
  const youtubeStats = apiManager.getAPIStats("youtube")
  const googleCurrent = apiManager.getCurrentAPIInfo("google")
  const youtubeCurrent = apiManager.getCurrentAPIInfo("youtube")

  const embed = new EmbedBuilder().setTitle("📊 Estadísticas de APIs").setColor("#00FF00").setTimestamp()

  embed.addFields(
    {
      name: "🔍 Google Search API",
      value: `**Activas:** ${googleStats.active}/${googleStats.total}\n**Requests hoy:** ${googleStats.totalRequests}\n**API actual:** ${googleCurrent?.id || "Ninguna"}\n**Restantes:** ${googleCurrent?.remaining || 0}/${googleCurrent?.max || 0}`,
      inline: true,
    },
    {
      name: "🎬 YouTube API",
      value: `**Activas:** ${youtubeStats.active}/${youtubeStats.total}\n**Requests hoy:** ${youtubeStats.totalRequests}\n**API actual:** ${youtubeCurrent?.id || "Ninguna"}\n**Restantes:** ${youtubeCurrent?.remaining || 0}/${youtubeCurrent?.max || 0}`,
      inline: true,
    },
  )

  await message.channel.send({ embeds: [embed] })
}

async function handleErrorLogging(message, enable) {
  if (!message.member.permissions.has("ADMINISTRATOR")) {
    return message.reply(getTranslation(message.author.id, "notAuthorized"))
  }

  errorLoggingEnabled = enable
  const status = enable ? "ACTIVADO" : "DESACTIVADO"
  const emoji = enable ? "✅" : "❌"
  await message.reply(`${emoji} Registro de errores ${status}`)
}

async function handleCommands(message) {
  const args = message.content.slice(1).trim().split(/ +/)
  const command = args.shift().toLowerCase()

  switch (command) {
    case "web":
      await handleImageSearch(message, args)
      break
    case "bs":
      await handleGeneralSearch(message, args)
      break
    case "mp4":
      await handleYouTubeSearch(message, args)
      break
    case "xxx":
      await handleXXXSearch(message, args)
      break
    case "cmx":
      await handleComicSearch(message, args)
      break
    case "roblox":
      await handleRobloxSearch(message, args)
      break
    case "td":
      await handleTranslateCommand(message)
      break
    case "id":
      await handleLanguageSelection(message)
      break
    case "auto":
      await handleAutoTranslateCommand(message, args)
      break
    case "dauto":
      await handleDeactivateAutoTranslate(message)
      break
    case "chat":
      await handleChatCommand(message)
      break
    case "dchat":
      await handleEndChatCommand(message)
      break
    case "lista":
      await handleCommandsList(message)
      break
    case "apistats":
      await handleAPIStats(message)
      break
    case "error":
      await handleErrorLogging(message, true)
      break
    case "derror":
      await handleErrorLogging(message, false)
      break
  }
}

async function handleSelectMenu(interaction) {
  const [action, userId] = interaction.customId.split("-")

  if (interaction.user.id !== userId) {
    return sendWarning(interaction, getTranslation(interaction.user.id, "notAuthorized"))
  }

  try {
    if (action === "languageSelect") {
      const selectedLang = interaction.values[0]
      prefs[userId] = selectedLang
      savePreferences()
      await interaction.reply({
        content: getTranslation(userId, "langSaved"),
        ephemeral: true,
      })
    } else if (action === "xxxSiteSelect") {
      const selectedSite = interaction.values[0]
      const query = pendingXXXSearch.get(userId)
      if (!query) {
        return sendWarning(interaction, "⚠️ Búsqueda expirada. Usa el comando nuevamente.")
      }

      await interaction.deferReply()
      try {
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(query)} site:${selectedSite}&num=10&safe=off`
        const response = await makeGoogleAPIRequest(searchUrl)

        if (!response.data.items || response.data.items.length === 0) {
          return interaction.editReply("❌ No se encontraron resultados en este sitio.")
        }

        xxxSearchCache.set(userId, { results: response.data.items, query, site: selectedSite, index: 0 })

        const currentResult = response.data.items[0]
        const embed = new EmbedBuilder()
          .setTitle(`🔞 Resultados en ${selectedSite}`)
          .setDescription(
            `**Búsqueda:** "${query}"\n\n**[${currentResult.title}](${currentResult.link})**\n\n${currentResult.snippet || "Sin descripción"}`,
          )
          .setColor("#FF69B4")
          .setFooter({ text: `Resultado 1 de ${response.data.items.length} | ${selectedSite}` })
          .setTimestamp()

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`prevXXX-${userId}`)
            .setLabel("⬅️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`nextXXX-${userId}`)
            .setLabel("➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(response.data.items.length <= 1),
        )

        await interaction.editReply({ embeds: [embed], components: [row] })
        pendingXXXSearch.delete(userId)
      } catch (error) {
        await logError(interaction.channel, error, "Error en búsqueda XXX")
        await interaction.editReply(`❌ Error en la búsqueda: ${error.message}`)
      }
    } else if (action === "comicSiteSelect") {
      const selectedSite = interaction.values[0]
      const query = pendingComicSearch.get(userId)
      if (!query) {
        return sendWarning(interaction, "⚠️ Búsqueda expirada. Usa el comando nuevamente.")
      }

      await interaction.deferReply()
      try {
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(query)} site:${selectedSite}&num=10&safe=off`
        const response = await makeGoogleAPIRequest(searchUrl)

        if (!response.data.items || response.data.items.length === 0) {
          return interaction.editReply("❌ No se encontraron comics en este sitio.")
        }

        comicSearchCache.set(userId, { results: response.data.items, query, site: selectedSite, index: 0 })

        const currentResult = response.data.items[0]
        const embed = new EmbedBuilder()
          .setTitle(`📚 Comics en ${selectedSite}`)
          .setDescription(
            `**Búsqueda:** "${query}"\n\n**[${currentResult.title}](${currentResult.link})**\n\n${currentResult.snippet || "Sin descripción"}`,
          )
          .setColor("#9B59B6")
          .setFooter({ text: `Comic 1 de ${response.data.items.length} | ${selectedSite}` })
          .setTimestamp()

        if (currentResult.pagemap?.cse_image?.[0]?.src) {
          embed.setThumbnail(currentResult.pagemap.cse_image[0].src)
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`prevComic-${userId}`)
            .setLabel("⬅️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`nextComic-${userId}`)
            .setLabel("➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(response.data.items.length <= 1),
        )

        await interaction.editReply({ embeds: [embed], components: [row] })
        pendingComicSearch.delete(userId)
      } catch (error) {
        await logError(interaction.channel, error, "Error en búsqueda de comics")
        await interaction.editReply(`❌ Error en la búsqueda: ${error.message}`)
      }
    }
  } catch (error) {
    await logError(interaction.channel, error, "Error en select menu")
    await interaction.reply({ content: "❌ Error procesando la selección.", ephemeral: true })
  }
}

async function handleButtonInteraction(interaction) {
  const [action, userId] = interaction.customId.split("-")

  if (interaction.user.id !== userId) {
    return sendWarning(interaction, getTranslation(interaction.user.id, "notAuthorized"))
  }

  try {
    if (
      action.includes("Roblox") ||
      action.includes("Players") ||
      action.includes("Count") ||
      action.includes("Passes") ||
      action.includes("Servers")
    ) {
      await handleRobloxNavigation(interaction, action)
    } else if (action === "prevImage" || action === "nextImage") {
      await handleImageNavigation(interaction, action)
    } else if (action === "prevResult" || action === "nextResult") {
      await handleGeneralNavigation(interaction, action)
    } else if (action === "prevXXX" || action === "nextXXX") {
      await handleXXXNavigation(interaction, action)
    } else if (action === "prevComic" || action === "nextComic") {
      await handleComicNavigation(interaction, action)
    }
  } catch (error) {
    await logError(interaction.channel, error, "Error en button interaction")
    await interaction.reply({ content: "❌ Error procesando la acción.", ephemeral: true })
  }
}

async function handleImageNavigation(interaction, action) {
  const userId = interaction.user.id
  const cache = imageSearchCache.get(userId)

  if (!cache) {
    return sendWarning(interaction, "⚠️ Búsqueda expirada. Usa .web [búsqueda] nuevamente.")
  }

  const direction = action === "nextImage" ? 1 : -1
  cache.index = Math.max(0, Math.min(cache.images.length - 1, cache.index + direction))

  const currentImage = cache.images[cache.index]
  const embed = new EmbedBuilder()
    .setTitle(`🔍 Resultados para: "${cache.query}"`)
    .setDescription(`**${currentImage.title}**\n[Ver imagen original](${currentImage.link})`)
    .setImage(currentImage.link)
    .setColor("#4285f4")
    .setFooter({ text: `Imagen ${cache.index + 1} de ${cache.images.length}` })
    .setTimestamp()

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prevImage-${userId}`)
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(cache.index === 0),
    new ButtonBuilder()
      .setCustomId(`nextImage-${userId}`)
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(cache.index === cache.images.length - 1),
  )

  await interaction.update({ embeds: [embed], components: [row] })
}

async function handleGeneralNavigation(interaction, action) {
  const userId = interaction.user.id
  const cache = generalSearchCache.get(userId)

  if (!cache) {
    return sendWarning(interaction, "⚠️ Búsqueda expirada. Usa .bs [búsqueda] nuevamente.")
  }

  const direction = action === "nextResult" ? 1 : -1
  cache.index = Math.max(0, Math.min(cache.results.length - 1, cache.index + direction))

  const currentResult = cache.results[cache.index]
  const embed = new EmbedBuilder()
    .setTitle(`🔍 Resultados para: "${cache.query}"`)
    .setDescription(
      `**[${currentResult.title}](${currentResult.link})**\n\n${currentResult.snippet || "Sin descripción disponible"}`,
    )
    .setColor("#4285f4")
    .setFooter({ text: `Resultado ${cache.index + 1} de ${cache.results.length}` })
    .setTimestamp()

  if (currentResult.pagemap?.cse_image?.[0]?.src) {
    embed.setThumbnail(currentResult.pagemap.cse_image[0].src)
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prevResult-${userId}`)
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(cache.index === 0),
    new ButtonBuilder()
      .setCustomId(`nextResult-${userId}`)
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(cache.index === cache.results.length - 1),
  )

  await interaction.update({ embeds: [embed], components: [row] })
}

async function handleXXXNavigation(interaction, action) {
  const userId = interaction.user.id
  const cache = xxxSearchCache.get(userId)

  if (!cache) {
    return sendWarning(interaction, "⚠️ Búsqueda expirada. Usa .xxx [búsqueda] nuevamente.")
  }

  const direction = action === "nextXXX" ? 1 : -1
  cache.index = Math.max(0, Math.min(cache.results.length - 1, cache.index + direction))

  const currentResult = cache.results[cache.index]
  const embed = new EmbedBuilder()
    .setTitle(`🔞 Resultados en ${cache.site}`)
    .setDescription(
      `**Búsqueda:** "${cache.query}"\n\n**[${currentResult.title}](${currentResult.link})**\n\n${currentResult.snippet || "Sin descripción"}`,
    )
    .setColor("#FF69B4")
    .setFooter({ text: `Resultado ${cache.index + 1} de ${cache.results.length} | ${cache.site}` })
    .setTimestamp()

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prevXXX-${userId}`)
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(cache.index === 0),
    new ButtonBuilder()
      .setCustomId(`nextXXX-${userId}`)
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(cache.index === cache.results.length - 1),
  )

  await interaction.update({ embeds: [embed], components: [row] })
}

async function handleComicNavigation(interaction, action) {
  const userId = interaction.user.id
  const cache = comicSearchCache.get(userId)

  if (!cache) {
    return sendWarning(interaction, "⚠️ Búsqueda expirada. Usa .cmx [búsqueda] nuevamente.")
  }

  const direction = action === "nextComic" ? 1 : -1
  cache.index = Math.max(0, Math.min(cache.results.length - 1, cache.index + direction))

  const currentResult = cache.results[cache.index]
  const embed = new EmbedBuilder()
    .setTitle(`📚 Comics en ${cache.site}`)
    .setDescription(
      `**Búsqueda:** "${cache.query}"\n\n**[${currentResult.title}](${currentResult.link})**\n\n${currentResult.snippet || "Sin descripción"}`,
    )
    .setColor("#9B59B6")
    .setFooter({ text: `Comic ${cache.index + 1} de ${cache.results.length} | ${cache.site}` })
    .setTimestamp()

  if (currentResult.pagemap?.cse_image?.[0]?.src) {
    embed.setThumbnail(currentResult.pagemap.cse_image[0].src)
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prevComic-${userId}`)
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(cache.index === 0),
    new ButtonBuilder()
      .setCustomId(`nextComic-${userId}`)
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(cache.index === cache.results.length - 1),
  )

  await interaction.update({ embeds: [embed], components: [row] })
}

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`)
  loadPreferences()
  loadSavedGames()
})

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content) return

  try {
    await handleInviteRestrictions(message)
    await handleAutoTranslate(message)
    await handleChatTranslation(message)

    if (message.content.startsWith(".")) {
      await handleCommands(message)
    }
  } catch (error) {
    await logError(message.channel, error, "Error en messageCreate")
  }
})

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction)
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction)
    }
  } catch (error) {
    await logError(interaction.channel, error, "Error en interactionCreate")
  }
})

client.login(process.env.DISCORD_TOKEN)
