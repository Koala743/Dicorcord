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

// Bot configuration
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
})

// Constants
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

// Reemplaza la sección API_CONFIG con esta nueva estructura:

const API_POOLS = {
  google: [
    {
      id: "api_1",
      apiKey: "AIzaSyDIrZO_rzRxvf9YvbZK1yPdsj4nrc0nqwY",
      cx: "34fe95d6cf39d4dd4",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100, // Límite diario de Google Custom Search
      lastReset: new Date().toDateString(),
    },
    {
      id: "api_2",
      apiKey: "AIzaSyCOY3_MeHHHLiOXq2tAUypm1aHbpkFwQ80",
      cx: "f21e2b3468dc449e2",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString(),
    },
    // 🔥 AGREGA MÁS APIs AQUÍ - EJEMPLOS:
    {
      id: "api_3",
      apiKey: "TU_API_KEY_3_AQUI", // Reemplaza con tu API Key
      cx: "TU_CX_3_AQUI", // Reemplaza con tu Custom Search Engine ID
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString(),
    },
    {
      id: "api_4",
      apiKey: "TU_API_KEY_4_AQUI",
      cx: "TU_CX_4_AQUI",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString(),
    },
    {
      id: "api_5",
      apiKey: "TU_API_KEY_5_AQUI",
      cx: "TU_CX_5_AQUI",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString(),
    },
    // Puedes agregar tantas como quieras siguiendo el mismo patrón
  ],

  // 🌟 PUEDES AGREGAR MÁS TIPOS DE APIs AQUÍ:
  youtube: [
    {
      id: "youtube_1",
      apiKey: "TU_YOUTUBE_API_KEY_1",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 10000, // YouTube tiene límites más altos
      lastReset: new Date().toDateString(),
    },
    {
      id: "youtube_2",
      apiKey: "TU_YOUTUBE_API_KEY_2",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 10000,
      lastReset: new Date().toDateString(),
    },
    // Agrega más YouTube APIs aquí
  ],
}

// Sistema de gestión de APIs
class APIManager {
  constructor() {
    this.loadAPIStatus()
    this.resetDailyCounters()
  }

  // Obtener la próxima API disponible
  getNextAvailableAPI(type = "google") {
    const apis = API_POOLS[type]
    if (!apis) return null

    // Buscar API activa y no agotada
    for (const api of apis) {
      if (api.active && !api.quotaExhausted && api.dailyRequests < api.maxDailyRequests) {
        return api
      }
    }

    // Si todas están agotadas, reiniciar contadores si es un nuevo día
    this.resetDailyCounters()

    // Intentar de nuevo después del reset
    for (const api of apis) {
      if (api.active && !api.quotaExhausted) {
        return api
      }
    }

    return null
  }

  // Marcar API como agotada
  markAPIAsExhausted(apiId, type = "google") {
    const apis = API_POOLS[type]
    const api = apis.find((a) => a.id === apiId)
    if (api) {
      api.quotaExhausted = true
      console.log(`⚠️ API ${apiId} marcada como agotada. Cambiando a la siguiente...`)
      this.saveAPIStatus()
    }
  }

  // Incrementar contador de requests
  incrementRequestCount(apiId, type = "google") {
    const apis = API_POOLS[type]
    const api = apis.find((a) => a.id === apiId)
    if (api) {
      api.dailyRequests++

      // Si alcanza el límite, marcar como agotada
      if (api.dailyRequests >= api.maxDailyRequests) {
        api.quotaExhausted = true
        console.log(`📊 API ${apiId} alcanzó el límite diario (${api.maxDailyRequests} requests)`)
      }

      this.saveAPIStatus()
    }
  }

  // Resetear contadores diarios
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

  // Guardar estado de APIs
  saveAPIStatus() {
    try {
      fs.writeFileSync("./apiStatus.json", JSON.stringify(API_POOLS, null, 2))
    } catch (error) {
      console.error("Error guardando estado de APIs:", error)
    }
  }

  // Cargar estado de APIs
  loadAPIStatus() {
    try {
      const data = fs.readFileSync("./apiStatus.json", "utf8")
      const savedPools = JSON.parse(data)

      // Merge con la configuración actual
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

  // Obtener estadísticas de APIs
  getAPIStats(type = "google") {
    const apis = API_POOLS[type]
    const active = apis.filter((a) => a.active && !a.quotaExhausted).length
    const total = apis.length
    const totalRequests = apis.reduce((sum, api) => sum + api.dailyRequests, 0)

    return { active, total, totalRequests }
  }
}

// Inicializar el gestor de APIs
const apiManager = new APIManager()

// Función mejorada para hacer requests con rotación automática
async function makeGoogleAPIRequest(url, type = "google") {
  let attempts = 0
  const maxAttempts = API_POOLS[type].length

  while (attempts < maxAttempts) {
    const api = apiManager.getNextAvailableAPI(type)

    if (!api) {
      throw new Error(`❌ Todas las APIs de ${type} están agotadas. Intenta mañana.`)
    }

    // Construir URL con la API actual
    const finalUrl = url.replace("GOOGLE_API_KEY", api.apiKey).replace("GOOGLE_CX", api.cx)

    try {
      console.log(`🔄 Usando API ${api.id} (Request #${api.dailyRequests + 1})`)

      const response = await axios.get(finalUrl)

      // Incrementar contador si la request fue exitosa
      apiManager.incrementRequestCount(api.id, type)

      return response
    } catch (error) {
      attempts++

      // Detectar si es error de cuota agotada
      if (
        error.response?.status === 429 ||
        error.response?.data?.error?.message?.includes("quota") ||
        error.response?.data?.error?.message?.includes("limit")
      ) {
        console.log(`⚠️ Cuota agotada en API ${api.id}. Cambiando a la siguiente...`)
        apiManager.markAPIAsExhausted(api.id, type)
        continue
      }

      // Si es otro tipo de error, lanzarlo
      if (attempts >= maxAttempts) {
        throw error
      }
    }
  }

  throw new Error(`❌ Todas las APIs de ${type} fallaron después de ${maxAttempts} intentos`)
}

// Global state
const activeChats = new Map()
const imageSearchCache = new Map()
const pendingXXXSearch = new Map()
const xxxSearchCache = new Map()
let prefs = {}

// Translations
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
  },
}

// Utility functions
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
    const response = await axios.get(`${API_POOLS.lingvaUrl}/auto/${targetLang}/${encodeURIComponent(text)}`)
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

// Event handlers
client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`)
  loadPreferences()
})

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content) return

  // Handle invite link restrictions
  await handleInviteRestrictions(message)

  // Handle active chat translations
  await handleChatTranslation(message)

  // Handle commands
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

// Handler functions
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

  switch (command) {
    case "web":
      await handleWebSearch(message, args)
      break
    case "xxx":
      await handleAdultSearch(message, args)
      break
    case "mp4":
      await handleVideoSearch(message, args)
      break
    case "xml":
      await handleXMLSearch(message, args)
      break
    case "td":
      await handleTranslate(message)
      break
    case "chat":
      await handleChatCommand(message)
      break
    case "dchat":
      await handleDisableChatCommand(message)
      break
    case "ID":
      await handleLanguageSelection(message)
      break
    // Agregar comando para ver estadísticas de APIs
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

// Actualizar la función handleWebSearch para usar el nuevo sistema:

async function handleWebSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply(getTranslation(message.author.id, "noSearchQuery"))

  // Mostrar estadísticas de APIs disponibles
  const stats = apiManager.getAPIStats("google")
  console.log(`📊 APIs Google disponibles: ${stats.active}/${stats.total} | Requests hoy: ${stats.totalRequests}`)

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

    const embed = new EmbedBuilder()
      .setTitle(`📷 Resultados para: ${query}`)
      .setImage(items[validIndex].link)
      .setDescription(`[Página donde está la imagen](${items[validIndex].image.contextLink})`)
      .setFooter({ text: `Imagen ${validIndex + 1} de ${items.length} | APIs activas: ${stats.active}/${stats.total}` })
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

// Actualizar handleVideoSearch para usar YouTube API con rotación:

async function handleVideoSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply("⚠️ Debes escribir algo para buscar el video.")

  const stats = apiManager.getAPIStats("youtube")
  console.log(`📊 APIs YouTube disponibles: ${stats.active}/${stats.total}`)

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

    await message.channel.send(`🎬 ${title}`)
    return message.channel.send(videoUrl)
  } catch (error) {
    if (error.response?.status === 429) {
      console.log("⚠️ Cuota de YouTube agotada, intentando con otra API...")
      // El sistema automáticamente intentará con la siguiente API
      return message.reply("⚠️ Cuota agotada, intentando con otra API...")
    }
    return message.reply("❌ Error al buscar el video.")
  }
}

// Actualizar las otras funciones de búsqueda para usar el nuevo sistema:

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

    const embed = new EmbedBuilder()
      .setTitle(`🎬 ${title.slice(0, 80)}...`)
      .setDescription(`**🔥 Clic para ver el video 🔥**\n[📺 Ir al video](${link})\n\n🌐 **Fuente**: ${context}`)
      .setColor("#ff0066")
      .setThumbnail(thumb || "https://i.imgur.com/defaultThumbnail.png")
      .setFooter({ text: "Buscado con Bot_v, ¡a darle caña!", iconURL: "https://i.imgur.com/botIcon.png" })
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
  } else if (interaction.customId.startsWith("select-")) {
    await handleLanguageSelectionMenu(interaction)
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
  } else if (["prevImage", "nextImage"].includes(interaction.customId)) {
    await handleImageNavigation(interaction)
  }
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

  const embed = new EmbedBuilder()
    .setTitle(`📷 Resultados para: ${cache.query}`)
    .setImage(img.link)
    .setDescription(`[Página donde está la imagen](${img.image.contextLink})`)
    .setFooter({ text: `Imagen ${validIndex + 1} de ${cache.items.length}` })
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

// Helper functions
async function findValidImageIndex(items, startIndex, direction) {
  let idx = startIndex
  while (idx >= 0 && idx < items.length) {
    if (await isImageUrlValid(items[idx].link)) return idx
    idx += direction
  }
  return -1
}

function createAdultSearchEmbed(item, index, total) {
  const title = item.title
  const link = item.link
  const context = item.displayLink
  const thumb = item.pagemap?.cse_thumbnail?.[0]?.src || "https://i.imgur.com/defaultThumbnail.png"

  return new EmbedBuilder()
    .setTitle(`🔞 ${title.slice(0, 80)}...`)
    .setDescription(`**🔥 Haz clic para ver el video 🔥**\n[📺 Ir al video](${link})\n\n🌐 **Sitio**: ${context}`)
    .setColor("#ff3366")
    .setImage(thumb)
    .setFooter({
      text: `Resultados para adultos (+18) — Resultado ${index + 1} de ${total}`,
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

// Start the bot
client.login(process.env.DISCORD_TOKEN)
