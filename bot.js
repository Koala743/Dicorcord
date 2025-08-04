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

// ===== FUNCIONES MEJORADAS DE ROBLOX =====

async function getPlayerNames(playerTokens) {
  if (!playerTokens || playerTokens.length === 0) return []

  try {
    // Dividir en chunks de 100 usuarios (límite de la API)
    const chunks = []
    for (let i = 0; i < playerTokens.length; i += 100) {
      chunks.push(playerTokens.slice(i, i + 100))
    }

    const allPlayers = []

    for (const chunk of chunks) {
      try {
        const response = await axios.post(
          "https://users.roblox.com/v1/users",
          {
            userIds: chunk,
            excludeBannedUsers: true,
          },
          {
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            timeout: 10000,
          },
        )

        if (response.data.data) {
          allPlayers.push(...response.data.data)
        }
      } catch (error) {
        console.log(`Error obteniendo chunk de nombres:`, error.message)
        // Crear datos por defecto para este chunk
        chunk.forEach((token, index) => {
          allPlayers.push({
            id: token,
            name: `Jugador_${token}`,
            displayName: `Jugador_${token}`,
            hasVerifiedBadge: false,
          })
        })
      }
    }

    return allPlayers
  } catch (error) {
    console.log("Error general obteniendo nombres de jugadores:", error.message)
    return playerTokens.map((token) => ({
      id: token,
      name: `Jugador_${token}`,
      displayName: `Jugador_${token}`,
      hasVerifiedBadge: false,
    }))
  }
}

async function getPlayerAvatars(playerIds) {
  if (!playerIds || playerIds.length === 0) return []

  const avatars = []

  for (const playerId of playerIds) {
    try {
      // Método 1: API oficial de thumbnails (más confiable)
      const thumbnailUrl = `https://thumbnails.roblox.com/v1/users/avatar?userIds=${playerId}&size=420x420&format=Png`

      try {
        const response = await axios.get(thumbnailUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          timeout: 5000,
        })

        if (response.data.data && response.data.data[0] && response.data.data[0].imageUrl) {
          avatars.push({
            targetId: playerId,
            state: "Completed",
            imageUrl: response.data.data[0].imageUrl,
          })
          continue
        }
      } catch (error) {
        console.log(`Error con API oficial para usuario ${playerId}, probando método alternativo...`)
      }

      // Método 2: URL directa de rbxcdn (respaldo)
      const directUrl = `https://tr.rbxcdn.com/30DAY-AvatarHeadshot-${playerId}-Png/420/420/AvatarHeadshot/Webp/noFilter`

      try {
        const testResponse = await axios.head(directUrl, { timeout: 3000 })
        if (testResponse.status === 200) {
          avatars.push({
            targetId: playerId,
            state: "Completed",
            imageUrl: directUrl,
          })
          continue
        }
      } catch (error) {
        console.log(`Error con URL directa para usuario ${playerId}, usando URL genérica...`)
      }

      // Método 3: URL genérica (último recurso)
      const genericUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${playerId}&width=420&height=420&format=png`
      avatars.push({
        targetId: playerId,
        state: "Completed",
        imageUrl: genericUrl,
      })
    } catch (error) {
      console.log(`Error general obteniendo avatar para usuario ${playerId}:`, error.message)
      // Avatar por defecto
      avatars.push({
        targetId: playerId,
        state: "Error",
        imageUrl: `https://www.roblox.com/headshot-thumbnail/image?userId=${playerId}&width=420&height=420&format=png`,
      })
    }
  }

  return avatars
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

    const publicServersUrl = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&limit=100`
    const publicServersResponse = await axios.get(publicServersUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })
    const publicServers = publicServersResponse.data.data || []

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

    const allPlayers = []
    const allServers = [...publicServers, ...vipServers]
    allServers.forEach((server, serverIndex) => {
      if (server.playerTokens && server.playerTokens.length > 0) {
        server.playerTokens.forEach((playerToken, playerIndex) => {
          allPlayers.push({
            serverIndex: serverIndex,
            serverId: server.id,
            playerToken: playerToken,
            playerIndex: playerIndex,
            serverType: serverIndex < publicServers.length ? "public" : "vip",
          })
        })
      }
    })

    const totalPublicServers = publicServers.length
    const totalVipServers = vipServers.length
    const totalServers = totalPublicServers + totalVipServers
    const publicPlayers = publicServers.reduce((sum, server) => sum + server.playing, 0)
    const vipPlayers = vipServers.reduce((sum, server) => sum + server.playing, 0)
    const totalPlayers = publicPlayers + vipPlayers
    const publicMaxPlayers = publicServers.reduce((sum, server) => sum + server.maxPlayers, 0)
    const vipMaxPlayers = vipServers.reduce((sum, server) => sum + server.maxPlayers, 0)
    const totalMaxPlayers = publicMaxPlayers + vipMaxPlayers

    const fullestPublicServer =
      publicServers.length > 0
        ? publicServers.reduce((prev, current) => (prev.playing > current.playing ? prev : current))
        : null

    const fullestVipServer =
      vipServers.length > 0
        ? vipServers.reduce((prev, current) => (prev.playing > current.playing ? prev : current))
        : null

    // Tu código VIP personal
    const personalVIPCode = "fa451cf9c4ee5e41b77471b2837e00c3"

    robloxSearchCache.set(message.author.id, {
      publicServers,
      vipServers,
      allServers,
      allPlayers,
      index: 0,
      serverType: "public",
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
      personalVIPCode,
    })

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

**👑 Tu Servidor VIP Personal:**
🔗 [Unirse a tu servidor VIP](https://www.roblox.com/share?code=${personalVIPCode}&type=Server)

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

    const row1 = new ActionRowBuilder().addComponents(
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
        .setCustomId(`personalVIPRoblox-${message.author.id}`)
        .setLabel("👑 Mi Servidor VIP")
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
        .setLabel("👥 Jugadores + Avatares")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`playerCountRoblox-${message.author.id}`)
        .setLabel("📊 Contador Jugadores")
        .setStyle(ButtonStyle.Secondary),
    )

    await message.channel.send({ embeds: [embed], components: [row1, row2] })
  } catch (error) {
    console.error("Error en búsqueda de Roblox:", error.message)
    await logError(message.channel, error, "Error general en búsqueda de Roblox")
    return message.reply(`❌ Error al obtener información de Roblox: ${error.message}`)
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
    const serverType = index < cache.publicServers.length ? "🌐 Público" : "💎 VIP"
    const joinUrl = `https://www.roblox.com/games/start?placeId=${placeId}&gameInstanceId=${server.id}`

    serverList += `**${index + 1}.** ${serverType}\n`
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

async function handleAllPlayersView(interaction, cache) {
  const { allServers, gameData, placeId, personalVIPCode } = cache

  if (allServers.length === 0) {
    return interaction.reply({ content: "❌ No hay servidores con jugadores disponibles.", ephemeral: true })
  }

  await interaction.deferUpdate()

  let playerList = "**👥 TODOS LOS JUGADORES CON AVATARES HD:**\n\n"
  let totalPlayersShown = 0
  const maxPlayersToShow = 20 // Reducido para mejor rendimiento

  for (let serverIndex = 0; serverIndex < allServers.length && totalPlayersShown < maxPlayersToShow; serverIndex++) {
    const server = allServers[serverIndex]
    const serverType = serverIndex < cache.publicServers.length ? "🌐" : "💎"

    if (server.playerTokens && server.playerTokens.length > 0) {
      playerList += `**Servidor ${serverIndex + 1}** ${serverType} (ID: \`${server.id}\`):\n`

      try {
        // Obtener nombres y avatares en paralelo para mejor rendimiento
        const [playerNames, playerAvatars] = await Promise.all([
          getPlayerNames(server.playerTokens.slice(0, 10)), // Limitar a 10 por servidor
          getPlayerAvatars(server.playerTokens.slice(0, 10)),
        ])

        server.playerTokens.slice(0, 10).forEach((playerToken, playerIndex) => {
          if (totalPlayersShown >= maxPlayersToShow) return

          const playerData = playerNames.find((p) => p.id === playerToken)
          const playerName = playerData ? playerData.displayName || playerData.name : `Jugador_${playerToken}`

          const avatarData = playerAvatars.find((a) => a.targetId == playerToken)
          const avatarUrl = avatarData
            ? avatarData.imageUrl
            : `https://thumbnails.roblox.com/v1/users/avatar?userIds=${playerToken}&size=420x420&format=Png`

          // Verificar si el jugador tiene badge verificado
          const verifiedBadge = playerData?.hasVerifiedBadge ? " ✅" : ""

          playerList += `  ${totalPlayersShown + 1}. **${playerName}**${verifiedBadge}\n`
          playerList += `     🆔 ID: \`${playerToken}\`\n`
          playerList += `     🖼️ [Avatar HD](${avatarUrl})\n`
          playerList += `     👤 [Perfil Roblox](https://www.roblox.com/users/${playerToken}/profile)\n\n`

          totalPlayersShown++
        })
      } catch (error) {
        await logError(interaction.channel, error, "Error obteniendo datos de jugadores mejorados")

        // Fallback con información básica
        server.playerTokens.slice(0, 5).forEach((playerToken, playerIndex) => {
          if (totalPlayersShown >= maxPlayersToShow) return

          const avatarUrl = `https://thumbnails.roblox.com/v1/users/avatar?userIds=${playerToken}&size=420x420&format=Png`
          playerList += `  ${totalPlayersShown + 1}. **Jugador_${playerToken}**\n`
          playerList += `     🆔 ID: \`${playerToken}\`\n`
          playerList += `     🖼️ [Avatar HD](${avatarUrl})\n\n`

          totalPlayersShown++
        })
      }
    }
  }

  if (totalPlayersShown === 0) {
    playerList = "❌ No se encontraron jugadores en los servidores disponibles."
  } else if (totalPlayersShown >= maxPlayersToShow) {
    playerList += `*... mostrando solo los primeros ${maxPlayersToShow} jugadores para mejor rendimiento*\n`
  }

  // Agregar información sobre servidor VIP personal
  if (personalVIPCode) {
    playerList += `\n**👑 TU SERVIDOR VIP PERSONAL:**\n`
    playerList += `🔗 [Unirse a tu servidor VIP](https://www.roblox.com/share?code=${personalVIPCode}&type=Server)\n`
    playerList += `📋 Código: \`${personalVIPCode}\`\n`
  }

  const embed = new EmbedBuilder()
    .setTitle(`👥 ${gameData.name} - Jugadores Detallados`)
    .setDescription(playerList)
    .setColor("#00FF00")
    .setFooter({
      text: `Mostrando ${totalPlayersShown} jugadores de ${cache.totalPlayers} totales | Avatares en HD 420x420`,
    })
    .setTimestamp()

  const backButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`backRoblox-${interaction.user.id}`)
      .setLabel("🔙 Volver")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`refreshPlayersRoblox-${interaction.user.id}`)
      .setLabel("🔄 Actualizar Jugadores")
      .setStyle(ButtonStyle.Primary),
  )

  await interaction.editReply({ embeds: [embed], components: [backButton] })
}

async function handlePlayerCountView(interaction, cache) {
  const { allServers, gameData, totalPlayers, totalServers } = cache

  let countByServer = "**📊 CONTADOR DE JUGADORES POR SERVIDOR:**\n\n"
  const serverStats = []

  allServers.forEach((server, index) => {
    const serverType = index < cache.publicServers.length ? "🌐 Público" : "💎 VIP"
    serverStats.push({
      index: index + 1,
      type: serverType,
      id: server.id,
      players: server.playing,
      maxPlayers: server.maxPlayers,
      ping: server.ping || "N/A",
    })
  })

  serverStats.sort((a, b) => b.players - a.players)

  for (let i = 0; i < Math.min(15, serverStats.length); i++) {
    const server = serverStats[i]
    countByServer += `**${i + 1}.** ${server.type}\n`
    countByServer += `👥 **${server.players}/${server.maxPlayers}** jugadores\n`
    countByServer += `🆔 ID: \`${server.id}\n`
    countByServer += `📡 Ping: ${server.ping}ms\n\n`
  }

  if (serverStats.length > 15) {
    countByServer += `*... y ${serverStats.length - 15} servidores más*\n`
  }

  const publicCount = cache.publicServers.reduce((sum, s) => sum + s.playing, 0)
  const vipCount = cache.vipServers.reduce((sum, s) => sum + s.playing, 0)

  countByServer += `\n**📈 RESUMEN TOTAL:**\n`
  countByServer += `🌐 Jugadores Públicos: ${publicCount}\n`
  countByServer += `💎 Jugadores VIP: ${vipCount}\n`
  countByServer += `👥 Total General: ${totalPlayers}\n`
  countByServer += `🖥️ Total Servidores: ${totalServers}`

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${gameData.name} - Contador de Jugadores`)
    .setDescription(countByServer)
    .setColor("#FF6B35")
    .setFooter({ text: `Servidores ordenados por cantidad de jugadores` })
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
    if (action === "personalVIPRoblox") {
      const personalVIPCode = cache.personalVIPCode || "fa451cf9c4ee5e41b77471b2837e00c3"
      return interaction.reply({
        content: `👑 **TU SERVIDOR VIP PERSONAL**\n🎮 **Juego:** ${cache.gameData.name}\n🔗 **Link:** https://www.roblox.com/share?code=${personalVIPCode}&type=Server\n📋 **Código:** \`${personalVIPCode}\`\n\n*Clic en el enlace para unirte a tu servidor VIP*`,
        ephemeral: true,
      })
    } else if (action === "allServersRoblox") {
      await handleAllServersView(interaction, cache)
    } else if (action === "allPlayersRoblox") {
      await handleAllPlayersView(interaction, cache)
    } else if (action === "playerCountRoblox") {
      await handlePlayerCountView(interaction, cache)
    } else if (action === "playRoblox") {
      const playUrl = `https://www.roblox.com/games/${cache.placeId}`
      return interaction.reply({
        content: `🎮 **${cache.gameData.name}**\n🔗 ${playUrl}\n*Clic en el enlace para jugar directamente*`,
        ephemeral: true,
      })
    } else if (action === "refreshRoblox" || action === "refreshPlayersRoblox") {
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

        // Actualizar servidores VIP
        let vipServers = []
        try {
          const vipServersUrl = `https://games.roblox.com/v1/games/${cache.placeId}/servers/Friend?sortOrder=Desc&limit=100`
          const vipServersResponse = await axios.get(vipServersUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          })
          vipServers = vipServersResponse.data.data || []
        } catch (error) {
          console.log("No se pudieron obtener servidores VIP")
        }

        // Recalcular estadísticas
        const totalPublicServers = publicServers.length
        const totalVipServers = vipServers.length
        const totalServers = totalPublicServers + totalVipServers
        const publicPlayers = publicServers.reduce((sum, server) => sum + server.playing, 0)
        const vipPlayers = vipServers.reduce((sum, server) => sum + server.playing, 0)
        const totalPlayers = publicPlayers + vipPlayers
        const publicMaxPlayers = publicServers.reduce((sum, server) => sum + server.maxPlayers, 0)
        const vipMaxPlayers = vipServers.reduce((sum, server) => sum + server.maxPlayers, 0)
        const totalMaxPlayers = publicMaxPlayers + vipMaxPlayers

        // Actualizar cache
        cache.gameData = gameData
        cache.publicServers = publicServers
        cache.vipServers = vipServers
        cache.allServers = [...publicServers, ...vipServers]
        cache.totalServers = totalServers
        cache.totalPlayers = totalPlayers
        cache.totalMaxPlayers = totalMaxPlayers
        cache.publicPlayers = publicPlayers
        cache.vipPlayers = vipPlayers
        cache.totalPublicServers = totalPublicServers
        cache.totalVipServers = totalVipServers

        robloxSearchCache.set(userId, cache)

        if (action === "refreshPlayersRoblox") {
          // Si es refresh de jugadores, volver a mostrar la vista de jugadores
          await handleAllPlayersView(interaction, cache)
          return
        }

        // Crear embed actualizado
        const personalVIPCode = cache.personalVIPCode || "fa451cf9c4ee5e41b77471b2837e00c3"
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

**👑 Tu Servidor VIP Personal:**
🔗 [Unirse a tu servidor VIP](https://www.roblox.com/share?code=${personalVIPCode}&type=Server)

**📈 Información General:**
⭐ Rating: ${gameData.totalUpVotes?.toLocaleString() || 0}👍 / ${gameData.totalDownVotes?.toLocaleString() || 0}👎
🎯 Visitas: ${gameData.visits?.toLocaleString() || "N/A"}
🎮 Jugando ahora: ${gameData.playing?.toLocaleString() || totalPlayers.toLocaleString()}`)
          .setColor("#00b2ff")
          .setThumbnail(
            `https://www.roblox.com/asset-thumbnail/image?assetId=${cache.placeId}&width=150&height=150&format=png`,
          )
          .setFooter({
            text: `ID: ${cache.placeId} | Universe ID: ${cache.universeId} | Total de servidores: ${totalServers} | 🔄 Actualizado`,
          })
          .setTimestamp()

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`publicRoblox-${userId}`)
            .setLabel("🌐 Ver Públicos")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(totalPublicServers === 0),
          new ButtonBuilder()
            .setCustomId(`vipRoblox-${userId}`)
            .setLabel("💎 Ver VIP")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(totalVipServers === 0),
          new ButtonBuilder()
            .setCustomId(`personalVIPRoblox-${userId}`)
            .setLabel("👑 Mi Servidor VIP")
            .setStyle(ButtonStyle.Success),
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
            .setLabel("👥 Jugadores + Avatares")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`playerCountRoblox-${userId}`)
            .setLabel("📊 Contador Jugadores")
            .setStyle(ButtonStyle.Secondary),
        )

        return interaction.editReply({ embeds: [embed], components: [row1, row2] })
      } catch (error) {
        await logError(interaction.channel, error, "Error refrescando datos de Roblox")
        return interaction.editReply({ content: "❌ Error al actualizar datos del servidor." })
      }
    } else if (action === "backRoblox") {
      const personalVIPCode = cache.personalVIPCode || "fa451cf9c4ee5e41b77471b2837e00c3"
      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${cache.gameData.name}`)
        .setDescription(`**📊 Estadísticas Completas del Juego:**

**👥 JUGADORES TOTALES: ${cache.totalPlayers.toLocaleString()}/${cache.totalMaxPlayers?.toLocaleString() || "N/A"}**

**🌐 Servidores Públicos:**
🟢 Servidores: ${cache.totalPublicServers}
👥 Jugadores: ${cache.publicPlayers.toLocaleString()}

**💎 Servidores VIP/Privados:**
🔒 Servidores: ${cache.totalVipServers}
👥 Jugadores: ${cache.vipPlayers.toLocaleString()}

**👑 Tu Servidor VIP Personal:**
🔗 [Unirse a tu servidor VIP](https://www.roblox.com/share?code=${personalVIPCode}&type=Server)

**📈 Información General:**
⭐ Rating: ${cache.gameData.totalUpVotes?.toLocaleString() || 0}👍 / ${cache.gameData.totalDownVotes?.toLocaleString() || 0}👎
🎯 Visitas: ${cache.gameData.visits?.toLocaleString() || "N/A"}`)
        .setColor("#00b2ff")
        .setThumbnail(
          `https://www.roblox.com/asset-thumbnail/image?assetId=${cache.placeId}&width=150&height=150&format=png`,
        )
        .setFooter({
          text: `ID: ${cache.placeId} | Total de servidores: ${cache.totalServers}`,
        })
        .setTimestamp()

      const row1 = new ActionRowBuilder().addComponents(
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
          .setCustomId(`personalVIPRoblox-${userId}`)
          .setLabel("👑 Mi Servidor VIP")
          .setStyle(ButtonStyle.Success),
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
          .setLabel("👥 Jugadores + Avatares")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`playerCountRoblox-${userId}`)
          .setLabel("📊 Contador Jugadores")
          .setStyle(ButtonStyle.Secondary),
      )

      return interaction.update({ embeds: [embed], components: [row1, row2] })
    } else if (action === "publicRoblox") {
      if (cache.publicServers.length === 0) {
        return interaction.reply({ content: "❌ No hay servidores públicos disponibles.", ephemeral: true })
      }

      cache.serverType = "public"
      cache.index = 0
      robloxSearchCache.set(userId, cache)

      const server = cache.publicServers[0]
      const embed = new EmbedBuilder()
        .setTitle(`🌐 ${cache.gameData.name} - Servidores Públicos`)
        .setDescription(`**📊 Servidor Público ${cache.index + 1} de ${cache.totalPublicServers}**

**👥 Jugadores:** ${server.playing}/${server.maxPlayers}
**🆔 ID del Servidor:** ${server.id}
**📡 Ping:** ${server.ping || "N/A"}ms
**🌍 Región:** ${server.location || "Global"}

**📈 Estadísticas Públicas:**
🟢 Total de servidores públicos: ${cache.totalPublicServers}
👥 Total de jugadores públicos: ${cache.publicPlayers.toLocaleString()}`)
        .setColor("#4CAF50")
        .setThumbnail(
          `https://www.roblox.com/asset-thumbnail/image?assetId=${cache.placeId}&width=150&height=150&format=png`,
        )
        .setFooter({ text: `Servidor público ${cache.index + 1}/${cache.totalPublicServers}` })
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
          .setDisabled(cache.publicServers.length <= 1),
        new ButtonBuilder().setCustomId(`joinRoblox-${userId}`).setLabel("🚀 Unirse").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`backRoblox-${userId}`).setLabel("🔙 Volver").setStyle(ButtonStyle.Secondary),
      )

      return interaction.update({ embeds: [embed], components: [buttons] })
    } else if (action === "vipRoblox") {
      if (cache.vipServers.length === 0) {
        return interaction.reply({ content: "❌ No hay servidores VIP disponibles.", ephemeral: true })
      }

      cache.serverType = "vip"
      cache.index = 0
      robloxSearchCache.set(userId, cache)

      const server = cache.vipServers[0]
      const embed = new EmbedBuilder()
        .setTitle(`💎 ${cache.gameData.name} - Servidores VIP`)
        .setDescription(`**📊 Servidor VIP ${cache.index + 1} de ${cache.totalVipServers}**

**👥 Jugadores:** ${server.playing}/${server.maxPlayers}
**🆔 ID del Servidor:** ${server.id}
**📡 Ping:** ${server.ping || "N/A"}ms
**🔒 Tipo:** Servidor Privado/VIP

**💎 Estadísticas VIP:**
🔒 Total de servidores VIP: ${cache.totalVipServers}
👥 Total de jugadores VIP: ${cache.vipPlayers.toLocaleString()}`)
        .setColor("#9C27B0")
        .setThumbnail(
          `https://www.roblox.com/asset-thumbnail/image?assetId=${cache.placeId}&width=150&height=150&format=png`,
        )
        .setFooter({ text: `Servidor VIP ${cache.index + 1}/${cache.totalVipServers}` })
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
          .setDisabled(cache.vipServers.length <= 1),
        new ButtonBuilder().setCustomId(`joinRoblox-${userId}`).setLabel("🚀 Unirse").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`backRoblox-${userId}`).setLabel("🔙 Volver").setStyle(ButtonStyle.Secondary),
      )

      return interaction.update({ embeds: [embed], components: [buttons] })
    } else if (action === "joinRoblox") {
      const currentServers = cache.serverType === "public" ? cache.publicServers : cache.vipServers
      const server = currentServers[cache.index]
      const joinUrl = `https://www.roblox.com/games/start?placeId=${cache.placeId}&gameInstanceId=${server.id}`

      return interaction.reply({
        content: `🚀 **Unirse al Servidor ${cache.serverType === "public" ? "Público" : "VIP"}**

🎮 **Juego:** ${cache.gameData.name}
👥 **Jugadores:** ${server.playing}/${server.maxPlayers}
🔗 **Link:** ${joinUrl}

*Clic en el enlace para jugar directamente*`,
        ephemeral: true,
      })
    }

    const currentServers = cache.serverType === "public" ? cache.publicServers : cache.vipServers
    const maxServers = cache.serverType === "public" ? cache.totalPublicServers : cache.totalVipServers

    let newIndex = cache.index
    if (action === "nextRoblox" && cache.index < currentServers.length - 1) {
      newIndex++
    } else if (action === "prevRoblox" && cache.index > 0) {
      newIndex--
    }

    cache.index = newIndex
    robloxSearchCache.set(userId, cache)

    const server = currentServers[newIndex]
    const serverTypeText = cache.serverType === "public" ? "Público" : "VIP"
    const serverTypeEmoji = cache.serverType === "public" ? "🌐" : "💎"
    const serverTypeColor = cache.serverType === "public" ? "#4CAF50" : "#9C27B0"

    const embed = new EmbedBuilder()
      .setTitle(`${serverTypeEmoji} ${cache.gameData.name} - Servidores ${serverTypeText}s`)
      .setDescription(`**📊 Servidor ${serverTypeText} ${newIndex + 1} de ${maxServers}**

**👥 Jugadores:** ${server.playing}/${server.maxPlayers}
**🆔 ID del Servidor:** ${server.id}
**📡 Ping:** ${server.ping || "N/A"}ms
${cache.serverType === "public" ? "**🌍 Región:** " + (server.location || "Global") : "**🔒 Tipo:** Servidor Privado/VIP"}

**📈 Estadísticas ${serverTypeText}s:**
${serverTypeEmoji} Total de servidores ${cache.serverType === "public" ? "públicos" : "VIP"}: ${maxServers}
👥 Total de jugadores ${cache.serverType === "public" ? "públicos" : "VIP"}: ${cache.serverType === "public" ? cache.publicPlayers.toLocaleString() : cache.vipPlayers.toLocaleString()}`)
      .setColor(serverTypeColor)
      .setThumbnail(
        `https://www.roblox.com/asset-thumbnail/image?assetId=${cache.placeId}&width=150&height=150&format=png`,
      )
      .setFooter({ text: `Servidor ${serverTypeText.toLowerCase()} ${newIndex + 1}/${maxServers}` })
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

// ===== RESTO DE FUNCIONES ORIGINALES =====

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`)
  loadPreferences()
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

async function handleSelectMenu(interaction) {
  const { customId, values, user } = interaction

  if (customId === "language_selection") {
    const selectedLanguage = values[0]
    prefs[user.id] = selectedLanguage
    savePreferences()
    const langEmoji = LANGUAGES.find((l) => l.value === selectedLanguage)?.emoji || "🌐"
    await interaction.reply({
      content: `${langEmoji} ${getTranslation(user.id, "langSaved")} (${selectedLanguage})`,
      ephemeral: true,
    })
  }
}

async function handleButtonInteraction(interaction) {
  const { customId } = interaction

  if (customId.includes("Roblox")) {
    const action = customId.split("-")[0]
    await handleRobloxNavigation(interaction, action)
  } else if (customId === "prev" || customId === "next") {
    await handleImageNavigation(interaction)
  } else if (customId === "prevBs" || customId === "nextBs") {
    await handleGeneralSearchNavigation(interaction)
  } else if (customId === "prevXxx" || customId === "nextXxx") {
    await handleXXXNavigation(interaction)
  } else if (customId === "prevCmx" || customId === "nextCmx") {
    await handleComicNavigation(interaction)
  }
}

async function handleImageNavigation(interaction) {
  const cacheKey = `webSearch-${interaction.user.id}`
  const cache = imageSearchCache.get(cacheKey)

  if (!cache) {
    return interaction.reply({ content: "❌ No hay búsqueda activa.", ephemeral: true })
  }

  let newIndex = cache.index
  if (interaction.customId === "next" && cache.index < cache.images.length - 1) {
    newIndex++
  } else if (interaction.customId === "prev" && cache.index > 0) {
    newIndex--
  }

  cache.index = newIndex
  imageSearchCache.set(cacheKey, cache)

  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("🔍 Búsqueda de imágenes")
    .setImage(cache.images[newIndex])
    .setFooter({ text: `Imagen ${newIndex + 1}/${cache.images.length}` })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(newIndex === 0),
    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(newIndex === cache.images.length - 1),
  )

  await interaction.update({ embeds: [embed], components: [row] })
}

async function handleGeneralSearchNavigation(interaction) {
  const cacheKey = `generalSearch-${interaction.user.id}`
  const cache = generalSearchCache.get(cacheKey)

  if (!cache) {
    return interaction.reply({ content: "❌ No hay búsqueda activa.", ephemeral: true })
  }

  let newIndex = cache.index
  if (interaction.customId === "nextBs" && cache.index < cache.results.length - 1) {
    newIndex++
  } else if (interaction.customId === "prevBs" && cache.index > 0) {
    newIndex--
  }

  cache.index = newIndex
  generalSearchCache.set(cacheKey, cache)

  const result = cache.results[newIndex]
  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("🔍 Búsqueda general")
    .setDescription(result.snippet)
    .setURL(result.link)
    .addFields({ name: "Fuente", value: result.link })
    .setFooter({ text: `Resultado ${newIndex + 1}/${cache.results.length}` })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("prevBs")
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(newIndex === 0),
    new ButtonBuilder()
      .setCustomId("nextBs")
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(newIndex === cache.results.length - 1),
  )

  await interaction.update({ embeds: [embed], components: [row] })
}

async function handleXXXNavigation(interaction) {
  const cacheKey = `xxxSearch-${interaction.user.id}`
  const cache = xxxSearchCache.get(cacheKey)

  if (!cache) {
    return interaction.reply({ content: "❌ No hay búsqueda activa.", ephemeral: true })
  }

  let newIndex = cache.index
  if (interaction.customId === "nextXxx" && cache.index < cache.results.length - 1) {
    newIndex++
  } else if (interaction.customId === "prevXxx" && cache.index > 0) {
    newIndex--
  }

  cache.index = newIndex
  xxxSearchCache.set(cacheKey, cache)

  const result = cache.results[newIndex]
  const embed = new EmbedBuilder()
    .setColor("#FF0000")
    .setTitle("🔞 Búsqueda XXX")
    .setDescription(result.snippet)
    .setURL(result.link)
    .addFields({ name: "Fuente", value: result.link })
    .setFooter({ text: `Resultado ${newIndex + 1}/${cache.results.length}` })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("prevXxx")
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(newIndex === 0),
    new ButtonBuilder()
      .setCustomId("nextXxx")
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(newIndex === cache.results.length - 1),
  )

  await interaction.update({ embeds: [embed], components: [row] })
}

async function handleComicNavigation(interaction) {
  const cacheKey = `comicSearch-${interaction.user.id}`
  const cache = comicSearchCache.get(cacheKey)

  if (!cache) {
    return interaction.reply({ content: "❌ No hay búsqueda activa.", ephemeral: true })
  }

  let newIndex = cache.index
  if (interaction.customId === "nextCmx" && cache.index < cache.results.length - 1) {
    newIndex++
  } else if (interaction.customId === "prevCmx" && cache.index > 0) {
    newIndex--
  }

  cache.index = newIndex
  comicSearchCache.set(cacheKey, cache)

  const result = cache.results[newIndex]
  const embed = new EmbedBuilder()
    .setColor("#FF69B4")
    .setTitle("🔞 Búsqueda de Comics")
    .setDescription(result.snippet)
    .setURL(result.link)
    .addFields({ name: "Fuente", value: result.link })
    .setFooter({ text: `Resultado ${newIndex + 1}/${cache.results.length}` })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("prevCmx")
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(newIndex === 0),
    new ButtonBuilder()
      .setCustomId("nextCmx")
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(newIndex === cache.results.length - 1),
  )

  await interaction.update({ embeds: [embed], components: [row] })
}

async function handleWebSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply(getTranslation(message.author.id, "noSearchQuery"))

  const cacheKey = `webSearch-${message.author.id}`
  imageSearchCache.delete(cacheKey)

  try {
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(
      query,
    )}&searchType=image&safe=active`
    const response = await makeGoogleAPIRequest(searchUrl)
    const items = response.data.items

    if (!items || items.length === 0) {
      return message.reply(getTranslation(message.author.id, "noValidImages"))
    }

    const validImages = []
    for (const item of items) {
      if (await isImageUrlValid(item.link)) {
        validImages.push(item.link)
      }
    }

    if (validImages.length === 0) {
      return message.reply(getTranslation(message.author.id, "noValidImages"))
    }

    imageSearchCache.set(cacheKey, { images: validImages, index: 0 })
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(`🔍 Búsqueda de imágenes: ${query}`)
      .setImage(validImages[0])
      .setFooter({ text: `Imagen 1/${validImages.length}` })

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(validImages.length === 1),
    )

    await message.channel.send({ embeds: [embed], components: [row] })
  } catch (error) {
    console.error("Error en búsqueda web:", error)
    await logError(message.channel, error, "Error en búsqueda web")
    return message.reply(`❌ Error en la búsqueda: ${error.message}`)
  }
}

async function handleGeneralSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply(getTranslation(message.author.id, "noSearchQuery"))

  const cacheKey = `generalSearch-${message.author.id}`
  generalSearchCache.delete(cacheKey)

  try {
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(
      query,
    )}`
    const response = await makeGoogleAPIRequest(searchUrl)
    const items = response.data.items

    if (!items || items.length === 0) {
      return message.reply("❌ No se encontraron resultados.")
    }

    generalSearchCache.set(cacheKey, { results: items, index: 0 })
    const firstResult = items[0]
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(`🔍 Búsqueda general: ${query}`)
      .setDescription(firstResult.snippet)
      .setURL(firstResult.link)
      .addFields({ name: "Fuente", value: firstResult.link })
      .setFooter({ text: `Resultado 1/${items.length}` })

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prevBs").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder()
        .setCustomId("nextBs")
        .setLabel("➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(items.length === 1),
    )

    await message.channel.send({ embeds: [embed], components: [row] })
  } catch (error) {
    console.error("Error en búsqueda general:", error)
    await logError(message.channel, error, "Error en búsqueda general")
    return message.reply(`❌ Error en la búsqueda: ${error.message}`)
  }
}

async function handleAdultSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply(getTranslation(message.author.id, "noSearchQuery"))

  const cacheKey = `xxxSearch-${message.author.id}`

  if (pendingXXXSearch.has(message.author.id)) {
    return message.reply("⏳ Por favor, espera a que termine la búsqueda anterior.")
  }

  pendingXXXSearch.set(message.author.id, true)
  xxxSearchCache.delete(cacheKey)

  try {
    const searchTerm = encodeURIComponent(query)
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${searchTerm}&safe=off&siteSearch=pornhub.com|xvideos.com|tnaflix.com|youporn.com`

    const response = await makeGoogleAPIRequest(searchUrl)
    const items = response.data.items

    if (!items || items.length === 0) {
      return message.reply("❌ No se encontraron resultados.")
    }

    xxxSearchCache.set(cacheKey, { results: items, index: 0 })
    const firstResult = items[0]
    const embed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle(`🔞 Búsqueda XXX: ${query}`)
      .setDescription(firstResult.snippet)
      .setURL(firstResult.link)
      .addFields({ name: "Fuente", value: firstResult.link })
      .setFooter({ text: `Resultado 1/${items.length}` })

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prevXxx").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder()
        .setCustomId("nextXxx")
        .setLabel("➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(items.length === 1),
    )

    await message.channel.send({ embeds: [embed], components: [row] })
  } catch (error) {
    console.error("Error en búsqueda XXX:", error)
    await logError(message.channel, error, "Error en búsqueda XXX")
    return message.reply(`❌ Error en la búsqueda: ${error.message}`)
  } finally {
    pendingXXXSearch.delete(message.author.id)
  }
}

async function handleComicSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply(getTranslation(message.author.id, "noSearchQuery"))

  const cacheKey = `comicSearch-${message.author.id}`

  if (pendingComicSearch.has(message.author.id)) {
    return message.reply("⏳ Por favor, espera a que termine la búsqueda anterior.")
  }

  pendingComicSearch.set(message.author.id, true)
  comicSearchCache.delete(cacheKey)

  try {
    const searchTerm = encodeURIComponent(query)
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${searchTerm}&safe=off&siteSearch=chochox.com|reycomix.com|ver-comics-porno.com|hitomi.la|vercomicsporno.xxx`

    const response = await makeGoogleAPIRequest(searchUrl)
    const items = response.data.items

    if (!items || items.length === 0) {
      return message.reply("❌ No se encontraron resultados.")
    }

    comicSearchCache.set(cacheKey, { results: items, index: 0 })
    const firstResult = items[0]
    const embed = new EmbedBuilder()
      .setColor("#FF69B4")
      .setTitle(`🔞 Búsqueda de Comics: ${query}`)
      .setDescription(firstResult.snippet)
      .setURL(firstResult.link)
      .addFields({ name: "Fuente", value: firstResult.link })
      .setFooter({ text: `Resultado 1/${items.length}` })

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prevCmx").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder()
        .setCustomId("nextCmx")
        .setLabel("➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(items.length === 1),
    )

    await message.channel.send({ embeds: [embed], components: [row] })
  } catch (error) {
    console.error("Error en búsqueda de comics:", error)
    await logError(message.channel, error, "Error en búsqueda de comics")
    return message.reply(`❌ Error en la búsqueda: ${error.message}`)
  } finally {
    pendingComicSearch.delete(message.author.id)
  }
}

async function handleVideoSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply(getTranslation(message.author.id, "noSearchQuery"))

  try {
    const searchTerm = encodeURIComponent(query)
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${searchTerm}&key=YOUTUBE_API_KEY&type=video&maxResults=1`

    const response = await makeGoogleAPIRequest(searchUrl, "youtube")
    const items = response.data.items

    if (!items || items.length === 0) {
      return message.reply("❌ No se encontraron videos.")
    }

    const videoId = items[0].id.videoId
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    await message.reply(`🎬 Video encontrado: ${videoUrl}`)
  } catch (error) {
    console.error("Error en búsqueda de video:", error)
    await logError(message.channel, error, "Error en búsqueda de video")
    return message.reply(`❌ Error en la búsqueda: ${error.message}`)
  }
}

async function handleTranslate(message) {
  if (!message.reference?.messageId) {
    return message.reply(getTranslation(message.author.id, "mustReply"))
  }

  try {
    const repliedMessage = await message.channel.messages.fetch(message.reference.messageId)
    const targetLang = getUserLanguage(message.author.id)

    if (repliedMessage.author.id === message.author.id) {
      return message.reply(getTranslation(message.author.id, "notYours"))
    }

    const result = await translateText(repliedMessage.content, targetLang)
    if (result && result.text) {
      const targetLangEmoji = LANGUAGES.find((l) => l.value === targetLang)?.emoji || "🌐"
      await message.reply({
        content: `${targetLangEmoji} ${result.text}`,
      })
    } else {
      await message.reply("❌ No se pudo traducir el mensaje.")
    }
  } catch (error) {
    console.error("Error en traducción:", error)
    await logError(message.channel, error, "Error en traducción")
    return message.reply(`❌ Error en la traducción: ${error.message}`)
  }
}

async function handleAutoTranslateCommand(message, args) {
  const langCode = args[0]
  const userId = message.author.id

  if (!langCode || !LANGUAGES.find((l) => l.value === langCode)) {
    return message.reply(getTranslation(message.author.id, "invalidLanguage"))
  }

  autoTranslateUsers.set(userId, { targetLang: langCode })
  const langEmoji = LANGUAGES.find((l) => l.value === langCode)?.emoji || "🌐"
  await message.reply(`${getTranslation(userId, "autoTranslateOn")} ${langEmoji} (${langCode})`)
}

async function handleDisableAutoTranslate(message) {
  const userId = message.author.id

  if (!autoTranslateUsers.has(userId)) {
    return message.reply(getTranslation(message.author.id, "autoTranslateNotActive"))
  }

  autoTranslateUsers.delete(userId)
  await message.reply(getTranslation(userId, "autoTranslateOff"))
}

async function handleChatCommand(message) {
  const mentionedUser = message.mentions.users.first()
  if (!mentionedUser) {
    return message.reply("⚠️ Debes mencionar a un usuario para iniciar el chat.")
  }

  if (mentionedUser.id === message.author.id) {
    return message.reply("⚠️ No puedes iniciar un chat contigo mismo.")
  }

  const user1Lang = getUserLanguage(message.author.id)
  const user2Lang = getUserLanguage(mentionedUser.id)

  if (user1Lang === user2Lang) {
    return message.reply(getTranslation(message.author.id, "sameLanguage"))
  }

  const channel = message.channel
  activeChats.set(channel.id, { users: [message.author.id, mentionedUser.id] })

  await message.reply(getTranslation(message.author.id, "chatActivated"))
}

async function handleDisableChatCommand(message) {
  if (message.author.username !== "flux_fer") {
    return sendWarning(message, getTranslation(message.author.id, "notAuthorized"))
  }

  const channel = message.channel
  if (!activeChats.has(channel.id)) {
    return message.reply(getTranslation(message.author.id, "chatNoSession"))
  }

  activeChats.delete(channel.id)
  await message.reply(getTranslation(message.author.id, "chatDeactivated"))
}

async function handleLanguageSelection(message) {
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("language_selection")
      .setPlaceholder("Elige tu idioma")
      .addOptions(LANGUAGES),
  )

  await message.reply({ content: "Selecciona tu idioma:", components: [row], ephemeral: true })
}

async function handleCommandsList(message) {
  const embed = new EmbedBuilder()
    .setTitle("📜 Lista de Comandos")
    .setColor("#00c7ff")
    .setDescription("Aquí tienes una lista de todos los comandos disponibles:")

  const categories = {}
  COMMANDS_LIST.forEach((cmd) => {
    if (!categories[cmd.category]) {
      categories[cmd.category] = []
    }
    categories[cmd.category].push(cmd)
  })

  for (const category in categories) {
    const commands = categories[category]
    let commandList = ""
    commands.forEach((cmd) => {
      commandList += `\`${cmd.name}\` - ${cmd.description}\nEjemplo: \`${cmd.example}\`\n\n`
    })
    embed.addFields({ name: category, value: commandList })
  }

  await message.reply({ embeds: [embed] })
}

client.login(process.env.DISCORD_TOKEN)
