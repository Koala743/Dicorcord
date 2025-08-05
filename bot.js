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
const comicDeepSearchCache = new Map()

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

// Función mejorada de traducción con mejor manejo de errores y textos largos
async function translateText(text, targetLang) {
  if (!text || text.trim().length === 0) return null

  // Dividir textos muy largos en chunks más pequeños
  const maxChunkSize = 4000
  const chunks = []

  if (text.length > maxChunkSize) {
    // Dividir por párrafos primero
    const paragraphs = text.split("\n\n")
    let currentChunk = ""

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = paragraph
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }
  } else {
    chunks.push(text)
  }

  const translationServices = [
    "https://lingva.ml/api/v1/auto",
    "https://translate.argosopentech.com/translate",
    "https://api.mymemory.translated.net/get",
  ]

  const translatedChunks = []

  for (const chunk of chunks) {
    let translated = null

    // Intentar con múltiples servicios
    for (const serviceBase of translationServices) {
      try {
        if (serviceBase.includes("lingva.ml")) {
          const response = await axios.get(`${serviceBase}/${targetLang}/${encodeURIComponent(chunk)}`, {
            timeout: 10000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          })

          if (response.data?.translation) {
            translated = {
              text: response.data.translation,
              from: response.data.from || "auto",
            }
            break
          }
        } else if (serviceBase.includes("mymemory")) {
          const response = await axios.get(
            `${serviceBase}?q=${encodeURIComponent(chunk)}&langpair=auto|${targetLang}`,
            {
              timeout: 10000,
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
            },
          )

          if (response.data?.responseData?.translatedText) {
            translated = {
              text: response.data.responseData.translatedText,
              from: "auto",
            }
            break
          }
        } else if (serviceBase.includes("argosopentech")) {
          const response = await axios.post(
            serviceBase,
            {
              q: chunk,
              source: "auto",
              target: targetLang,
              format: "text",
            },
            {
              timeout: 10000,
              headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
            },
          )

          if (response.data?.translatedText) {
            translated = {
              text: response.data.translatedText,
              from: "auto",
            }
            break
          }
        }
      } catch (error) {
        console.log(`Error con servicio ${serviceBase}:`, error.message)
        continue
      }
    }

    if (translated) {
      translatedChunks.push(translated.text)
    } else {
      // Si falla todo, devolver el texto original
      translatedChunks.push(chunk)
    }
  }

  if (translatedChunks.length > 0) {
    return {
      text: translatedChunks.join("\n\n"),
      from: "auto",
    }
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
    return playerIds.map((id) => ({
      targetId: id,
      state: "Completed",
      imageUrl: `https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/420/420/Avatar/Png`,
    }))
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

async function getGameIcon(universeId) {
  try {
    const response = await axios.get(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    )
    return (
      response.data.data?.[0]?.imageUrl || `https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/512/512/Image/Png`
    )
  } catch (error) {
    console.log("Error obteniendo icono del juego:", error.message)
    return `https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/512/512/Image/Png`
  }
}

// Función mejorada para búsqueda profunda de comics en Chochox
async function getChochoxComicPages(comicUrl) {
  try {
    const response = await axios.get(comicUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 15000,
    })

    const html = response.data
    const pages = []

    // Extraer el nombre base del comic desde la URL
    const urlParts = comicUrl.split("/")
    const comicName = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2]

    // Patrones mejorados para detectar imágenes del comic
    const imagePatterns = [
      // Patrón específico para Chochox con números
      new RegExp(`${comicName.replace(/[^a-zA-Z0-9]/g, "[^a-zA-Z0-9]*")}-?\\d+\\.(jpg|jpeg|png|gif|webp)`, "gi"),
      // Patrón general para imágenes numeradas
      /[a-zA-Z0-9\-_]+\\d+\\.(jpg|jpeg|png|gif|webp)/gi,
      // URLs completas de imágenes
      /https?:\/\/[^"'\s]+\.(jpg|jpeg|png|gif|webp)/gi,
      // Imágenes en data-src o src
      /(?:data-src|src)=["']([^"']+\.(jpg|jpeg|png|gif|webp))[^"']*/gi,
    ]

    const foundImages = new Set()

    for (const pattern of imagePatterns) {
      const matches = html.match(pattern)
      if (matches) {
        matches.forEach((match) => {
          let imageUrl = match

          // Limpiar la URL si es necesario
          if (match.includes("data-src=") || match.includes("src=")) {
            const urlMatch = match.match(/["']([^"']+)["']/)
            if (urlMatch) {
              imageUrl = urlMatch[1]
            }
          }

          // Asegurar que sea una URL completa
          if (imageUrl.startsWith("//")) {
            imageUrl = "https:" + imageUrl
          } else if (imageUrl.startsWith("/")) {
            imageUrl = "https://chochox.com" + imageUrl
          } else if (!imageUrl.startsWith("http")) {
            imageUrl = "https://chochox.com/" + imageUrl
          }

          // Verificar que contenga el dominio correcto y sea una imagen
          if (
            (imageUrl.includes("chochox") || imageUrl.includes("cdn")) &&
            /\.(jpg|jpeg|png|gif|webp)$/i.test(imageUrl)
          ) {
            foundImages.add(imageUrl)
          }
        })
      }
    }

    // Convertir a array y ordenar por número
    const imageArray = Array.from(foundImages)

    // Función para extraer número de la imagen
    const extractNumber = (url) => {
      const matches = url.match(/(\d+)(?=\.(jpg|jpeg|png|gif|webp))/i)
      return matches ? Number.parseInt(matches[1]) : 0
    }

    // Ordenar por número
    imageArray.sort((a, b) => {
      const numA = extractNumber(a)
      const numB = extractNumber(b)
      return numA - numB
    })

    console.log(`Encontradas ${imageArray.length} imágenes para ${comicName}`)

    return imageArray.slice(0, 100) // Limitar a 100 páginas máximo
  } catch (error) {
    console.log("Error obteniendo páginas del comic:", error.message)

    // Intentar método alternativo si falla el primero
    try {
      // Generar URLs basadas en patrones comunes
      const urlParts = comicUrl.split("/")
      const comicName = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2]
      const baseUrl = `https://chochox.com/wp-content/uploads/`

      const generatedPages = []
      for (let i = 1; i <= 50; i++) {
        const paddedNumber = i.toString().padStart(2, "0")
        const possibleUrls = [
          `${baseUrl}${comicName}-${paddedNumber}.jpg`,
          `${baseUrl}${comicName}-${i}.jpg`,
          `${baseUrl}${comicName}_${paddedNumber}.jpg`,
          `${baseUrl}${comicName}_${i}.jpg`,
        ]
        generatedPages.push(...possibleUrls)
      }

      return generatedPages.slice(0, 20) // Limitar a 20 intentos
    } catch (fallbackError) {
      console.log("Error en método alternativo:", fallbackError.message)
      return []
    }
  }
}

// Función para extraer video directo de sitios XXX
async function extractDirectVideoUrl(pageUrl, site) {
  try {
    const response = await axios.get(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 10000,
    })

    const html = response.data
    let videoUrl = null

    if (site.includes("xvideos")) {
      // Patrón para Xvideos
      const match =
        html.match(/html5player\.setVideoUrlHigh$$'([^']+)'$$/) ||
        html.match(/html5player\.setVideoUrlLow$$'([^']+)'$$/) ||
        html.match(/setVideoTitle\('[^']*',\s*'[^']*',\s*'([^']+)'/)
      if (match) videoUrl = match[1]
    } else if (site.includes("pornhub")) {
      // Patrón para Pornhub
      const match =
        html.match(/"videoUrl":"([^"]+)"/) || html.match(/var\s+flashvars[^=]*=\s*{[^}]*"quality_\d+p":"([^"]+)"/)
      if (match) videoUrl = match[1].replace(/\\u002F/g, "/")
    }

    return videoUrl
  } catch (error) {
    console.log("Error extrayendo URL de video:", error.message)
    return null
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

    const gameIcon = await getGameIcon(universeId)

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
      gameIcon,
      playerPage: 0,
      serverPage: 0,
      serverListPage: 0, // Para navegación de lista de servidores
    })

    const apiInfo = apiManager.getCurrentAPIInfo("google")
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
🎮 Jugando ahora: ${gameData.playing?.toLocaleString() || totalPlayers.toLocaleString()}

**🔧 API Status:** ${apiInfo ? `${apiInfo.remaining}/${apiInfo.max} usos restantes` : "No disponible"}`)
      .setColor("#00b2ff")
      .setThumbnail(gameIcon)
      .setFooter({
        text: `ID: ${placeId} | Universe ID: ${universeId} | Total de servidores: ${totalServers}`,
      })
      .setTimestamp()

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
        .setCustomId(`allPlayersRoblox-${message.author.id}`)
        .setLabel("👥 Todos los Jugadores")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`playerCountRoblox-${message.author.id}`)
        .setLabel("📊 Contador Jugadores")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`gamePassesRoblox-${message.author.id}`)
        .setLabel("🎫 Pases del Juego")
        .setStyle(ButtonStyle.Secondary),
    )

    await message.channel.send({ embeds: [embed], components: [row1, row2] })
  } catch (error) {
    console.error("Error en búsqueda de Roblox:", error.message)
    await logError(message.channel, error, "Error general en búsqueda de Roblox")
    return message.reply(`❌ Error al obtener información de Roblox: ${error.message}`)
  }
}

// Función mejorada para mostrar todos los jugadores con avatares reales
async function handleAllPlayersView(interaction, cache, page = 0) {
  const { allServers, gameData, gameIcon } = cache
  if (allServers.length === 0) {
    return interaction.reply({ content: "❌ No hay servidores con jugadores disponibles.", ephemeral: true })
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate()
  }

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
            avatarData?.imageUrl || `https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/420/420/Avatar/Png`

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

  const playersPerPage = 5 // Reducido para mostrar avatares
  const totalPages = Math.ceil(allPlayersData.length / playersPerPage)
  const startIndex = page * playersPerPage
  const endIndex = startIndex + playersPerPage
  const currentPlayers = allPlayersData.slice(startIndex, endIndex)

  // Crear embeds individuales para cada jugador con su avatar
  const embeds = []

  // Embed principal con información de API
  const apiInfo = apiManager.getCurrentAPIInfo("google")
  const mainEmbed = new EmbedBuilder()
    .setTitle(`👥 ${gameData.name} - Todos los Jugadores`)
    .setDescription(`**Página ${page + 1}/${totalPages} | Total: ${allPlayersData.length} jugadores**
    
**🔧 API Status:** ${apiInfo ? `${apiInfo.remaining}/${apiInfo.max} usos restantes` : "No disponible"}`)
    .setColor("#00FF00")
    .setThumbnail(gameIcon)
    .setTimestamp()

  embeds.push(mainEmbed)

  // Embeds para cada jugador con su avatar
  currentPlayers.forEach((player, index) => {
    const globalIndex = startIndex + index + 1
    const playerEmbed = new EmbedBuilder()
      .setTitle(`${globalIndex}. ${player.name}`)
      .setDescription(`**ID:** \`${player.id}\`\n**Servidor:** ${player.serverIndex}`)
      .setImage(player.avatar)
      .setColor("#4CAF50")

    embeds.push(playerEmbed)
  })

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prevPlayersRoblox-${interaction.user.id}`)
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`nextPlayersRoblox-${interaction.user.id}`)
      .setLabel("➡️ Siguiente")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`backRoblox-${interaction.user.id}`)
      .setLabel("🔙 Volver")
      .setStyle(ButtonStyle.Secondary),
  )

  cache.playerPage = page
  robloxSearchCache.set(interaction.user.id, cache)

  if (interaction.deferred) {
    await interaction.editReply({ embeds: embeds, components: [buttons] })
  } else {
    await interaction.update({ embeds: embeds, components: [buttons] })
  }
}

async function handlePlayerCountView(interaction, cache, page = 0, filterType = "all") {
  const { allServers, gameData, totalPlayers, totalServers, gameIcon } = cache

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
  if (filterType === "emptiest") {
    serverStats = serverStats
      .filter((s) => s.players < s.maxPlayers)
      .sort((a, b) => a.players - b.players)
      .slice(0, 10)
  } else if (filterType === "fullest") {
    serverStats = serverStats.sort((a, b) => b.players - a.players).slice(0, 10)
  } else if (filterType === "random") {
    serverStats = serverStats.sort(() => 0.5 - Math.random()).slice(0, 10)
  } else {
    serverStats.sort((a, b) => b.players - a.players)
  }

  const serversPerPage = 20
  const totalPages = Math.ceil(serverStats.length / serversPerPage)
  const startIndex = page * serversPerPage
  const endIndex = startIndex + serversPerPage
  const currentServers = serverStats.slice(startIndex, endIndex)

  let countByServer = `**📊 CONTADOR DE JUGADORES${filterType !== "all" ? ` (${filterType.toUpperCase()})` : ""} (Página ${page + 1}/${totalPages}):**\n\n`

  currentServers.forEach((server, index) => {
    const globalIndex = startIndex + index + 1
    countByServer += `**${globalIndex}.** Servidor ${server.index}\n`
    countByServer += `👥 **${server.players}/${server.maxPlayers}** jugadores\n`
    countByServer += `🆔 ID: \`${server.id}\`\n`
    countByServer += `📡 Ping: ${server.ping}ms\n\n`
  })

  const apiInfo = apiManager.getCurrentAPIInfo("google")
  countByServer += `\n**📈 RESUMEN TOTAL:**\n`
  countByServer += `👥 Total General: ${totalPlayers}\n`
  countByServer += `🖥️ Total Servidores: ${totalServers}\n`
  countByServer += `**🔧 API Status:** ${apiInfo ? `${apiInfo.remaining}/${apiInfo.max} usos restantes` : "No disponible"}`

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${gameData.name} - Contador de Jugadores`)
    .setDescription(countByServer)
    .setColor("#FF6B35")
    .setThumbnail(gameIcon)
    .setFooter({ text: `Página ${page + 1}/${totalPages} | Filtro: ${filterType}` })
    .setTimestamp()

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prevCountRoblox-${interaction.user.id}`)
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`nextCountRoblox-${interaction.user.id}`)
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
      .setCustomId(`emptiestRoblox-${interaction.user.id}`)
      .setLabel("📉 Más Vacíos")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`fullestRoblox-${interaction.user.id}`)
      .setLabel("📈 Más Llenos")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`randomRoblox-${interaction.user.id}`)
      .setLabel("🎲 Random")
      .setStyle(ButtonStyle.Secondary),
  )

  cache.serverPage = page
  cache.filterType = filterType
  robloxSearchCache.set(interaction.user.id, cache)

  await interaction.update({ embeds: [embed], components: [row1, row2] })
}

async function handleGamePassesView(interaction, cache, page = 0) {
  const { universeId, gameData, gameIcon } = cache

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate()
  }

  try {
    const gamePasses = await getGamePasses(universeId)

    if (gamePasses.length === 0) {
      const apiInfo = apiManager.getCurrentAPIInfo("google")
      const embed = new EmbedBuilder()
        .setTitle(`🎫 ${gameData.name} - Pases del Juego`)
        .setDescription(`❌ Este juego no tiene pases disponibles.
        
**🔧 API Status:** ${apiInfo ? `${apiInfo.remaining}/${apiInfo.max} usos restantes` : "No disponible"}`)
        .setColor("#FFA500")
        .setThumbnail(gameIcon)

      const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`backRoblox-${interaction.user.id}`)
          .setLabel("🔙 Volver")
          .setStyle(ButtonStyle.Secondary),
      )

      return interaction.editReply({ embeds: [embed], components: [backButton] })
    }

    const passesPerPage = 3 // Reducido para mostrar imágenes
    const totalPages = Math.ceil(gamePasses.length / passesPerPage)
    const startIndex = page * passesPerPage
    const endIndex = startIndex + passesPerPage
    const currentPasses = gamePasses.slice(startIndex, endIndex)

    const embeds = []

    // Embed principal con información de API
    const apiInfo = apiManager.getCurrentAPIInfo("google")
    const mainEmbed = new EmbedBuilder()
      .setTitle(`🎫 ${gameData.name} - Pases del Juego`)
      .setDescription(`**Página ${page + 1}/${totalPages} | Total: ${gamePasses.length} pases**
      
**🔧 API Status:** ${apiInfo ? `${apiInfo.remaining}/${apiInfo.max} usos restantes` : "No disponible"}`)
      .setColor("#FFD700")
      .setThumbnail(gameIcon)
      .setTimestamp()

    embeds.push(mainEmbed)

    // Embeds individuales para cada pase con su imagen
    for (let i = 0; i < currentPasses.length; i++) {
      const pass = currentPasses[i]
      const globalIndex = startIndex + i + 1
      const price = pass.price ? `${pass.price} Robux` : "Gratis"
      const passIcon = `https://thumbnails.roblox.com/v1/game-passes?gamePassIds=${pass.id}&size=420x420&format=Png`

      const passEmbed = new EmbedBuilder()
        .setTitle(`${globalIndex}. ${pass.name}`)
        .setDescription(
          `💰 **Precio:** ${price}\n🎫 **ID:** ${pass.id}\n🔗 [Ver Pase](https://www.roblox.com/es/game-pass/${pass.id})`,
        )
        .setImage(passIcon)
        .setColor("#FFD700")

      embeds.push(passEmbed)
    }

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`prevPassesRoblox-${interaction.user.id}`)
        .setLabel("⬅️ Anterior")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`nextPassesRoblox-${interaction.user.id}`)
        .setLabel("➡️ Siguiente")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= totalPages - 1),
      new ButtonBuilder()
        .setCustomId(`backRoblox-${interaction.user.id}`)
        .setLabel("🔙 Volver")
        .setStyle(ButtonStyle.Secondary),
    )

    cache.passPage = page
    cache.gamePasses = gamePasses
    robloxSearchCache.set(interaction.user.id, cache)

    await interaction.editReply({ embeds: embeds, components: [buttons] })
  } catch (error) {
    await logError(interaction.channel, error, "Error obteniendo pases del juego")
    const apiInfo = apiManager.getCurrentAPIInfo("google")
    const embed = new EmbedBuilder()
      .setTitle(`🎫 ${gameData.name} - Pases del Juego`)
      .setDescription(`❌ Error al obtener los pases del juego.
      
**🔧 API Status:** ${apiInfo ? `${apiInfo.remaining}/${apiInfo.max} usos restantes` : "No disponible"}`)
      .setColor("#FF0000")
      .setThumbnail(gameIcon)

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`backRoblox-${interaction.user.id}`)
        .setLabel("🔙 Volver")
        .setStyle(ButtonStyle.Secondary),
    )

    await interaction.editReply({ embeds: [embed], components: [backButton] })
  }
}

// Función mejorada para mostrar servidores en grupos de 20
async function handleServerListView(interaction, cache, page = 0) {
  const { publicServers, gameData, gameIcon } = cache

  if (publicServers.length === 0) {
    return interaction.reply({ content: "❌ No hay servidores públicos disponibles.", ephemeral: true })
  }

  const serversPerPage = 20
  const totalPages = Math.ceil(publicServers.length / serversPerPage)
  const startIndex = page * serversPerPage
  const endIndex = startIndex + serversPerPage
  const currentServers = publicServers.slice(startIndex, endIndex)

  let serverList = `**🌐 LISTA DE SERVIDORES (Página ${page + 1}/${totalPages}):**\n\n`

  currentServers.forEach((server, index) => {
    const globalIndex = startIndex + index + 1
    serverList += `**${globalIndex}.** 👥 ${server.playing}/${server.maxPlayers} | 📡 ${server.ping || "N/A"}ms\n`
    serverList += `🆔 \`${server.id}\` | 🌍 ${server.location || "Global"}\n`
    serverList += `🚀 [Unirse](https://www.roblox.com/games/start?placeId=${cache.placeId}&gameInstanceId=${server.id})\n\n`
  })

  const apiInfo = apiManager.getCurrentAPIInfo("google")
  serverList += `**🔧 API Status:** ${apiInfo ? `${apiInfo.remaining}/${apiInfo.max} usos restantes` : "No disponible"}`

  const embed = new EmbedBuilder()
    .setTitle(`🌐 ${gameData.name} - Lista de Servidores`)
    .setDescription(serverList)
    .setColor("#4CAF50")
    .setThumbnail(gameIcon)
    .setFooter({ text: `Página ${page + 1}/${totalPages} | Total: ${publicServers.length} servidores` })
    .setTimestamp()

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prevServerListRoblox-${interaction.user.id}`)
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`nextServerListRoblox-${interaction.user.id}`)
      .setLabel("➡️ Siguiente")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`backRoblox-${interaction.user.id}`)
      .setLabel("🔙 Volver")
      .setStyle(ButtonStyle.Secondary),
  )

  cache.serverListPage = page
  robloxSearchCache.set(interaction.user.id, cache)

  await interaction.update({ embeds: [embed], components: [buttons] })
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
    if (action === "allPlayersRoblox") {
      await handleAllPlayersView(interaction, cache, 0)
    } else if (action === "prevPlayersRoblox") {
      await handleAllPlayersView(interaction, cache, Math.max(0, cache.playerPage - 1))
    } else if (action === "nextPlayersRoblox") {
      await handleAllPlayersView(interaction, cache, cache.playerPage + 1)
    } else if (action === "playerCountRoblox") {
      await handlePlayerCountView(interaction, cache, 0, "all")
    } else if (action === "prevCountRoblox") {
      await handlePlayerCountView(interaction, cache, Math.max(0, cache.serverPage - 1), cache.filterType || "all")
    } else if (action === "nextCountRoblox") {
      await handlePlayerCountView(interaction, cache, cache.serverPage + 1, cache.filterType || "all")
    } else if (action === "emptiestRoblox") {
      await handlePlayerCountView(interaction, cache, 0, "emptiest")
    } else if (action === "fullestRoblox") {
      await handlePlayerCountView(interaction, cache, 0, "fullest")
    } else if (action === "randomRoblox") {
      await handlePlayerCountView(interaction, cache, 0, "random")
    } else if (action === "gamePassesRoblox") {
      await handleGamePassesView(interaction, cache, 0)
    } else if (action === "prevPassesRoblox") {
      await handleGamePassesView(interaction, cache, Math.max(0, cache.passPage - 1))
    } else if (action === "nextPassesRoblox") {
      await handleGamePassesView(interaction, cache, cache.passPage + 1)
    } else if (action === "prevServerListRoblox") {
      await handleServerListView(interaction, cache, Math.max(0, cache.serverListPage - 1))
    } else if (action === "nextServerListRoblox") {
      await handleServerListView(interaction, cache, cache.serverListPage + 1)
    } else if (action === "playRoblox") {
      const playUrl = `https://www.roblox.com/games/${cache.placeId}`
      return interaction.reply({
        content: `🎮 **${cache.gameData.name}**\n🔗 ${playUrl}\n*Clic en el enlace para jugar directamente*`,
        ephemeral: true,
      })
    } else if (action === "refreshRoblox") {
      try {
        await interaction.deferUpdate()
        // Actualizar datos del juego
        const gameInfoUrl = `https://games.roblox.com/v1/games?universeIds=${cache.universeId}`
        const gameInfoResponse = await axios.get(gameInfoUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        })
        const gameData = gameInfoResponse.data.data?.[0]
        if (!gameData) {
          return interaction.editReply({ content: "❌ Error al actualizar datos del servidor." })
        }

        // Actualizar servidores públicos
        const publicServersUrl = `https://games.roblox.com/v1/games/${cache.placeId}/servers/Public?sortOrder=Desc&limit=100`
        const publicServersResponse = await axios.get(publicServersUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        })
        const publicServers = publicServersResponse.data.data || []

        // Recalcular estadísticas
        const totalServers = publicServers.length
        const totalPlayers = publicServers.reduce((sum, server) => sum + server.playing, 0)
        const totalMaxPlayers = publicServers.reduce((sum, server) => sum + server.maxPlayers, 0)

        // Actualizar cache
        cache.gameData = gameData
        cache.publicServers = publicServers
        cache.allServers = publicServers
        cache.totalServers = totalServers
        cache.totalPlayers = totalPlayers
        cache.totalMaxPlayers = totalMaxPlayers

        robloxSearchCache.set(userId, cache)

        // Crear embed actualizado
        const apiInfo = apiManager.getCurrentAPIInfo("google")
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
🎮 Jugando ahora: ${gameData.playing?.toLocaleString() || totalPlayers.toLocaleString()}

**🔧 API Status:** ${apiInfo ? `${apiInfo.remaining}/${apiInfo.max} usos restantes` : "No disponible"}`)
          .setColor("#00b2ff")
          .setThumbnail(cache.gameIcon)
          .setFooter({
            text: `ID: ${cache.placeId} | Universe ID: ${cache.universeId} | Total de servidores: ${totalServers} | 🔄 Actualizado`,
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
            .setCustomId(`allPlayersRoblox-${userId}`)
            .setLabel("👥 Todos los Jugadores")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`playerCountRoblox-${userId}`)
            .setLabel("📊 Contador Jugadores")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`gamePassesRoblox-${userId}`)
            .setLabel("🎫 Pases del Juego")
            .setStyle(ButtonStyle.Secondary),
        )

        return interaction.editReply({ embeds: [embed], components: [row1, row2] })
      } catch (error) {
        await logError(interaction.channel, error, "Error refrescando datos de Roblox")
        return interaction.editReply({ content: "❌ Error al actualizar datos del servidor." })
      }
    } else if (action === "backRoblox") {
      const apiInfo = apiManager.getCurrentAPIInfo("google")
      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${cache.gameData.name}`)
        .setDescription(`**📊 Estadísticas del Juego:**

**👥 JUGADORES TOTALES: ${cache.totalPlayers.toLocaleString()}/${cache.totalMaxPlayers?.toLocaleString() || "N/A"}**

**🌐 Servidores Públicos:**
🟢 Servidores: ${cache.totalServers}
👥 Jugadores: ${cache.totalPlayers.toLocaleString()}

**📈 Información General:**
⭐ Rating: ${cache.gameData.totalUpVotes?.toLocaleString() || 0}👍 / ${cache.gameData.totalDownVotes?.toLocaleString() || 0}👎
🎯 Visitas: ${cache.gameData.visits?.toLocaleString() || "N/A"}

**🔧 API Status:** ${apiInfo ? `${apiInfo.remaining}/${apiInfo.max} usos restantes` : "No disponible"}`)
        .setColor("#00b2ff")
        .setThumbnail(cache.gameIcon)
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
          .setCustomId(`allPlayersRoblox-${userId}`)
          .setLabel("👥 Todos los Jugadores")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`playerCountRoblox-${userId}`)
          .setLabel("📊 Contador Jugadores")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`gamePassesRoblox-${userId}`)
          .setLabel("🎫 Pases del Juego")
          .setStyle(ButtonStyle.Secondary),
      )

      return interaction.update({ embeds: [embed], components: [row1, row2] })
    } else if (action === "publicRoblox") {
      // Mostrar lista de servidores en grupos de 20
      await handleServerListView(interaction, cache, 0)
    } else if (action === "joinRoblox") {
      const server = cache.publicServers[cache.index]
      const joinUrl = `https://www.roblox.com/games/start?placeId=${cache.placeId}&gameInstanceId=${server.id}`
      return interaction.reply({
        content: `🚀 **Unirse al Servidor Público**
🎮 **Juego:** ${cache.gameData.name}
👥 **Jugadores:** ${server.playing}/${server.maxPlayers}
🔗 **Link:** ${joinUrl}

*Clic en el enlace para jugar directamente*`,
        ephemeral: true,
      })
    }

    // Navegación individual de servidores (mantenida para compatibilidad)
    const currentServers = cache.publicServers
    const maxServers = cache.totalServers
    let newIndex = cache.index

    if (action === "nextRoblox" && cache.index < currentServers.length - 1) {
      newIndex++
    } else if (action === "prevRoblox" && cache.index > 0) {
      newIndex--
    }

    cache.index = newIndex
    robloxSearchCache.set(userId, cache)

    const server = currentServers[newIndex]

    const apiInfo = apiManager.getCurrentAPIInfo("google")
    const embed = new EmbedBuilder()
      .setTitle(`🌐 ${cache.gameData.name} - Servidores Públicos`)
      .setDescription(`**📊 Servidor Público ${newIndex + 1} de ${maxServers}**

**👥 Jugadores:** ${server.playing}/${server.maxPlayers}
**🆔 ID del Servidor:** ${server.id}
**📡 Ping:** ${server.ping || "N/A"}ms
**🌍 Región:** ${server.location || "Global"}

**📈 Estadísticas Públicas:**
🟢 Total de servidores públicos: ${maxServers}
👥 Total de jugadores públicos: ${cache.totalPlayers.toLocaleString()}

**🔧 API Status:** ${apiInfo ? `${apiInfo.remaining}/${apiInfo.max} usos restantes` : "No disponible"}`)
      .setColor("#4CAF50")
      .setThumbnail(cache.gameIcon)
      .setFooter({ text: `Servidor público ${newIndex + 1}/${maxServers}` })
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
  } catch (error) {
    await logError(interaction.channel, error, `Error en navegación Roblox - Acción: ${action}`)
    return interaction.reply({ content: "❌ Error procesando la acción. Intenta de nuevo.", ephemeral: true })
  }
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
    await logError(message.channel, error, "Error en auto-traducción")
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
        await logError(message.channel, error, "Error manejando restricción de invites")
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
    await logError(message.channel, error, "Error en traducción de chat")
    await message.channel.send({
      content: `❌ Error al traducir el mensaje al idioma de <@${otherUserId}>.`,
      ephemeral: true,
    })
  }
}

async function handleCommands(message) {
  const [command, ...args] = message.content.slice(1).trim().split(/ +/)
  const cmd = command.toLowerCase()

  try {
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
      case "error":
        if (message.author.username !== "flux_fer") {
          return sendWarning(message, "⚠️ Solo el administrador puede activar el registro de errores.")
        }
        errorLoggingEnabled = true
        return message.reply("✅ Registro de errores ACTIVADO. Los errores se mostrarán en el chat.")
      case "derror":
        if (message.author.username !== "flux_fer") {
          return sendWarning(message, "⚠️ Solo el administrador puede desactivar el registro de errores.")
        }
        errorLoggingEnabled = false
        return message.reply("🛑 Registro de errores DESACTIVADO. Los errores no se mostrarán en el chat.")
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
            {
              name: "🚨 Sistema de Errores",
              value: `Estado: ${errorLoggingEnabled ? "🟢 Activado" : "🔴 Desactivado"}`,
              inline: true,
            },
          )
          .setTimestamp()
        return message.reply({ embeds: [embed], ephemeral: true })
    }
  } catch (error) {
    await logError(message.channel, error, `Error ejecutando comando: ${cmd}`)
    return message.reply(`❌ Error ejecutando el comando: ${error.message}`)
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

  const apiInfo = apiManager.getCurrentAPIInfo("google")
  const mainEmbed = new EmbedBuilder()
    .setTitle("📋 Lista de Comandos del Bot")
    .setDescription(`Aquí tienes todos los comandos disponibles organizados por categorías:
    
**🔧 API Status:** ${apiInfo ? `${apiInfo.remaining}/${apiInfo.max} usos restantes` : "No disponible"}`)
    .setColor("#00c7ff")
    .setThumbnail(client.user.displayAvatarURL())
    .setFooter({ text: `Total de comandos: ${COMMANDS_LIST.length}` })

  await message.reply({ embeds: [mainEmbed] })

  for (const embed of embeds) {
    await message.channel.send({ embeds: [embed] })
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
    const currentApiInfo = apiManager.getCurrentAPIInfo("google")
    const embed = new EmbedBuilder()
      .setTitle(`🔍 ${item.title}`)
      .setDescription(`${item.snippet}\n\n[🔗 Ver página completa](${item.link})`)
      .setColor("#4285f4")
      .setFooter({
        text: `Resultado 1 de ${items.length} | API: ${currentApiInfo.id} | Quedan: ${currentApiInfo.remaining}/${currentApiInfo.max}`,
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
    await logError(message.channel, error, "Error en búsqueda general")
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
        .setCustomId(`prevImage-${message.author.id}`)
        .setLabel("⬅️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(validIndex === 0),
      new ButtonBuilder()
        .setCustomId(`nextImage-${message.author.id}`)
        .setLabel("➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(validIndex === items.length - 1),
    )

    await message.channel.send({ embeds: [embed], components: [row] })
  } catch (error) {
    const errorMsg = error.message || "Error desconocido"
    console.error("Error en búsqueda de imágenes:", errorMsg)
    await logError(message.channel, error, "Error en búsqueda de imágenes")
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
    await logError(message.channel, error, "Error en búsqueda de video YouTube")
    return message.reply("❌ Error al buscar el video.")
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

  const lang1 = prefs[user1.id]
  const lang2 = prefs[user2.id]

  if (!lang1) {
    return sendWarning(message, `⚠️ Tú no tienes un idioma guardado. Usa .ID para configurar tu idioma primero.`)
  }

  if (!lang2) {
    return sendWarning(message, getTranslation(user1.id, "userNoLanguage"))
  }

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

  try {
    if (interaction.customId.startsWith("xxxsite-")) {
      await handleAdultSiteSelection(interaction)
    } else if (interaction.customId.startsWith("comicsite-")) {
      await handleComicSiteSelection(interaction)
    } else if (interaction.customId.startsWith("autoselect-")) {
      await handleAutoTranslateSelection(interaction)
    } else if (interaction.customId.startsWith("select-")) {
      await handleLanguageSelectionMenu(interaction)
    }
  } catch (error) {
    await logError(interaction.channel, error, "Error en handleSelectMenu")
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

    // Agregar botón de búsqueda profunda para Chochox
    let buttons
    if (selectedSite === "chochox.com") {
      buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`comicback-${interaction.user.id}`)
          .setLabel("⬅️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`comicnext-${interaction.user.id}`)
          .setLabel("➡️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(items.length <= 1),
        new ButtonBuilder()
          .setCustomId(`comicdeep-${interaction.user.id}`)
          .setLabel("🔍 Ver Comic Completo")
          .setStyle(ButtonStyle.Success),
      )
    } else {
      buttons = createNavigationButtons(interaction.user.id, 0, items.length, "comic")
    }

    await interaction.update({
      content: "",
      embeds: [embed],
      components: [buttons],
    })

    pendingComicSearch.delete(interaction.user.id)
  } catch (error) {
    console.error("Error en búsqueda de comics:", error.message)
    await logError(interaction.channel, error, "Error en búsqueda de comics")
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
    const embed = await createAdultSearchEmbed(item, 0, items.length, selectedSite)
    const buttons = createAdultNavigationButtons(interaction.user.id, 0, items.length)

    await interaction.update({
      content: "",
      embeds: [embed],
      components: [buttons],
    })

    pendingXXXSearch.delete(interaction.user.id)
  } catch (error) {
    console.error("Error en búsqueda .xxx:", error.message)
    await logError(interaction.channel, error, "Error en búsqueda adulta")
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
  const customId = interaction.customId

  // Extraer userId del customId para verificar permisos
  let buttonUserId = null
  if (customId.includes("-")) {
    const parts = customId.split("-")
    buttonUserId = parts[parts.length - 1] // El userId siempre está al final
  }

  if (userId !== buttonUserId) {
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({ content: "⛔ No puedes usar estos botones.", ephemeral: true })
    }
    return
  }

  try {
    if (customId.startsWith("xxx")) {
      await handleAdultSearchNavigation(interaction, customId.split("-")[0])
    } else if (customId.startsWith("comic")) {
      await handleComicSearchNavigation(interaction, customId.split("-")[0])
    } else if (customId.startsWith("prevGeneral") || customId.startsWith("nextGeneral")) {
      await handleGeneralSearchNavigation(interaction, customId.split("-")[0])
    } else if (customId.includes("Roblox")) {
      await handleRobloxNavigation(interaction, customId.split("-")[0])
    } else if (customId.startsWith("prevImage") || customId.startsWith("nextImage")) {
      await handleImageNavigation(interaction)
    }
  } catch (error) {
    await logError(interaction.channel, error, "Error en handleButtonInteraction")
  }
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

  if (action === "comicdeep") {
    // Manejar búsqueda profunda de comic
    const cache = comicSearchCache.get(userId)
    if (!cache) {
      return interaction.reply({ content: "❌ No hay búsqueda activa.", ephemeral: true })
    }

    const currentItem = cache.items[cache.currentIndex]
    if (!currentItem.link.includes("chochox.com")) {
      return interaction.reply({ content: "❌ Esta función solo está disponible para Chochox.", ephemeral: true })
    }

    await interaction.deferUpdate()

    try {
      const comicPages = await getChochoxComicPages(currentItem.link)

      if (comicPages.length === 0) {
        return interaction.editReply({
          content: "❌ No se pudieron obtener las páginas del comic.",
          components: [],
        })
      }

      comicDeepSearchCache.set(userId, {
        pages: comicPages,
        currentPage: 0,
        comicTitle: currentItem.title,
        comicUrl: currentItem.link,
      })

      const apiInfo = apiManager.getCurrentAPIInfo("google")
      const embed = new EmbedBuilder()
        .setTitle(`📖 ${currentItem.title} - Página 1/${comicPages.length}`)
        .setImage(comicPages[0])
        .setDescription(`[🔗 Ver comic original](${currentItem.link})
        
**🔧 API Status:** ${apiInfo ? `${apiInfo.remaining}/${apiInfo.max} usos restantes` : "No disponible"}`)
        .setColor("#9b59b6")
        .setFooter({ text: `Página 1 de ${comicPages.length}` })
        .setTimestamp()

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`comicpageprev-${userId}`)
          .setLabel("⬅️ Anterior")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`comicpagenext-${userId}`)
          .setLabel("➡️ Siguiente")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(comicPages.length <= 1),
        new ButtonBuilder()
          .setCustomId(`comicpageback-${userId}`)
          .setLabel("🔙 Volver a Búsqueda")
          .setStyle(ButtonStyle.Secondary),
      )

      await interaction.editReply({ embeds: [embed], components: [buttons] })
    } catch (error) {
      await logError(interaction.channel, error, "Error en búsqueda profunda de comic")
      await interaction.editReply({
        content: "❌ Error al obtener las páginas del comic.",
        components: [],
      })
    }
    return
  }

  if (action.startsWith("comicpage")) {
    // Manejar navegación de páginas del comic
    const deepCache = comicDeepSearchCache.get(userId)
    if (!deepCache) {
      return interaction.reply({ content: "❌ No hay comic cargado.", ephemeral: true })
    }

    let newPage = deepCache.currentPage

    if (action === "comicpagenext" && deepCache.currentPage < deepCache.pages.length - 1) {
      newPage++
    } else if (action === "comicpageprev" && deepCache.currentPage > 0) {
      newPage--
    } else if (action === "comicpageback") {
      // Volver a la búsqueda de comics
      const cache = comicSearchCache.get(userId)
      if (cache) {
        const item = cache.items[cache.currentIndex]
        const embed = createComicSearchEmbed(item, cache.currentIndex, cache.items.length)

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`comicback-${userId}`)
            .setLabel("⬅️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(cache.currentIndex === 0),
          new ButtonBuilder()
            .setCustomId(`comicnext-${userId}`)
            .setLabel("➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(cache.currentIndex === cache.items.length - 1),
          new ButtonBuilder()
            .setCustomId(`comicdeep-${userId}`)
            .setLabel("🔍 Ver Comic Completo")
            .setStyle(ButtonStyle.Success),
        )

        return interaction.update({ embeds: [embed], components: [buttons] })
      }
      return
    }

    deepCache.currentPage = newPage
    comicDeepSearchCache.set(userId, deepCache)

    const apiInfo = apiManager.getCurrentAPIInfo("google")
    const embed = new EmbedBuilder()
      .setTitle(`📖 ${deepCache.comicTitle} - Página ${newPage + 1}/${deepCache.pages.length}`)
      .setImage(deepCache.pages[newPage])
      .setDescription(`[🔗 Ver comic original](${deepCache.comicUrl})
      
**🔧 API Status:** ${apiInfo ? `${apiInfo.remaining}/${apiInfo.max} usos restantes` : "No disponible"}`)
      .setColor("#9b59b6")
      .setFooter({ text: `Página ${newPage + 1} de ${deepCache.pages.length}` })
      .setTimestamp()

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`comicpageprev-${userId}`)
        .setLabel("⬅️ Anterior")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(newPage === 0),
      new ButtonBuilder()
        .setCustomId(`comicpagenext-${userId}`)
        .setLabel("➡️ Siguiente")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(newPage === deepCache.pages.length - 1),
      new ButtonBuilder()
        .setCustomId(`comicpageback-${userId}`)
        .setLabel("🔙 Volver a Búsqueda")
        .setStyle(ButtonStyle.Secondary),
    )

    await interaction.update({ embeds: [embed], components: [buttons] })
    return
  }

  // Navegación normal de comics
  if (!comicSearchCache.has(userId)) {
    return interaction.reply({ content: "❌ No hay búsqueda activa para paginar.", ephemeral: true })
  }

  const data = comicSearchCache.get(userId)
  const { items, currentIndex, site } = data

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

  let buttons
  if (site === "chochox.com") {
    buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`comicback-${userId}`)
        .setLabel("⬅️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(newIndex === 0),
      new ButtonBuilder()
        .setCustomId(`comicnext-${userId}`)
        .setLabel("➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(newIndex === items.length - 1),
      new ButtonBuilder()
        .setCustomId(`comicdeep-${userId}`)
        .setLabel("🔍 Ver Comic Completo")
        .setStyle(ButtonStyle.Success),
    )
  } else {
    buttons = createNavigationButtons(userId, newIndex, items.length, "comic")
  }

  await interaction.update({ embeds: [embed], components: [buttons] })
}

async function handleAdultSearchNavigation(interaction, action) {
  const userId = interaction.user.id

  if (action === "xxxwatch") {
    // Manejar visualización de video
    const cache = xxxSearchCache.get(userId)
    if (!cache) {
      return interaction.reply({ content: "❌ No hay búsqueda activa.", ephemeral: true })
    }

    const currentItem = cache.items[cache.currentIndex]

    try {
      const directVideoUrl = await extractDirectVideoUrl(currentItem.link, cache.site)

      if (directVideoUrl) {
        return interaction.reply({
          content: `🎬 **Video Directo:**\n${directVideoUrl}\n\n📺 **Página Original:**\n${currentItem.link}`,
          ephemeral: true,
        })
      } else {
        return interaction.reply({
          content: `📺 **Ver Video:**\n${currentItem.link}\n\n⚠️ No se pudo extraer el enlace directo del video.`,
          ephemeral: true,
        })
      }
    } catch (error) {
      await logError(interaction.channel, error, "Error extrayendo video directo")
      return interaction.reply({
        content: `📺 **Ver Video:**\n${currentItem.link}`,
        ephemeral: true,
      })
    }
  }

  if (action === "xxxdownload") {
    // Manejar descarga de video
    const cache = xxxSearchCache.get(userId)
    if (!cache) {
      return interaction.reply({ content: "❌ No hay búsqueda activa.", ephemeral: true })
    }

    const currentItem = cache.items[cache.currentIndex]

    return interaction.reply({
      content: `📥 **Descargar Video:**\n\nPuedes usar herramientas como:\n• **yt-dlp**: \`yt-dlp "${currentItem.link}"\`\n• **4K Video Downloader**\n• **JDownloader**\n\n🔗 **Enlace:** ${currentItem.link}`,
      ephemeral: true,
    })
  }

  if (!xxxSearchCache.has(userId)) {
    return interaction.reply({ content: "❌ No hay búsqueda activa para paginar.", ephemeral: true })
  }

  const data = xxxSearchCache.get(userId)
  const { items, currentIndex, site } = data

  let newIndex = currentIndex
  if (action === "xxxnext" && currentIndex < items.length - 1) {
    newIndex++
  } else if (action === "xxxback" && currentIndex > 0) {
    newIndex--
  }

  data.currentIndex = newIndex
  xxxSearchCache.set(userId, data)

  const item = items[newIndex]
  const embed = await createAdultSearchEmbed(item, newIndex, items.length, site)
  const buttons = createAdultNavigationButtons(userId, newIndex, items.length)

  await interaction.update({ embeds: [embed], components: [buttons] })
}

async function handleImageNavigation(interaction) {
  const userId = interaction.user.id
  const cache = imageSearchCache.get(userId)
  if (!cache) return interaction.deferUpdate()

  let newIndex = cache.index
  if (interaction.customId.startsWith("prevImage") && newIndex > 0) newIndex--
  if (interaction.customId.startsWith("nextImage") && newIndex < cache.items.length - 1) newIndex++

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
      .setCustomId(`prevImage-${userId}`)
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(validIndex === 0),
    new ButtonBuilder()
      .setCustomId(`nextImage-${userId}`)
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

async function createAdultSearchEmbed(item, index, total, site) {
  const title = item.title
  const link = item.link
  const context = item.displayLink

  // Mejorar la obtención de thumbnails
  let thumb = item.pagemap?.cse_thumbnail?.[0]?.src || item.pagemap?.cse_image?.[0]?.src

  // Si no hay thumbnail, intentar extraer una imagen de la página
  if (!thumb) {
    try {
      const response = await axios.get(link, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 5000,
      })

      const html = response.data
      const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
      const twitterImageMatch = html.match(/<meta name="twitter:image" content="([^"]+)"/)

      thumb = ogImageMatch?.[1] || twitterImageMatch?.[1] || "https://i.imgur.com/defaultThumbnail.png"
    } catch (error) {
      thumb = "https://i.imgur.com/defaultThumbnail.png"
    }
  }

  const apiInfo = apiManager.getCurrentAPIInfo("google")

  return new EmbedBuilder()
    .setTitle(`🔞 ${title.slice(0, 80)}...`)
    .setDescription(
      `**🔥 Haz clic para ver el video 🔥**\n[📺 Ir al video](${link})\n\n🌐 **Sitio**: ${context}\n\n**🔧 API Status:** ${apiInfo ? `${apiInfo.remaining}/${apiInfo.max} usos restantes` : "No disponible"}`,
    )
    .setColor("#ff3366")
    .setImage(thumb)
    .setFooter({
      text: `Resultado ${index + 1} de ${total} | API: ${apiInfo.id}`,
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

function createAdultNavigationButtons(userId, currentIndex, total) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`xxxback-${userId}`)
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentIndex === 0),
    new ButtonBuilder()
      .setCustomId(`xxxnext-${userId}`)
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentIndex === total - 1),
    new ButtonBuilder().setCustomId(`xxxwatch-${userId}`).setLabel("📺 Ver Video").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`xxxdownload-${userId}`).setLabel("📥 Descargar").setStyle(ButtonStyle.Secondary),
  )
}

client.login(process.env.DISCORD_TOKEN)
