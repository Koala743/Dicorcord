const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
} = require("discord.js")
const axios = require("axios")
const fs = require("fs")
const path = require("path")
const cheerio = require("cheerio")
const puppeteer = require("puppeteer")

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
  ],
  youtube: [],
}

const COMMANDS_LIST = [
  {
    name: ".roblox [juego]",
    description: "Busca servidores de Roblox para un juego específico",
    example: ".roblox Adopt Me",
    category: "🎮 Gaming",
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

const robloxSearchCache = new Map()
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

async function searchRobloxPlayer(query) {
  try {
    let playerId = null
    let playerData = null

    if (!isNaN(query)) {
      playerId = query
    } else {
      const searchUrl = `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(query)}&limit=10`
      const searchResponse = await axios.get(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      const users = searchResponse.data.data || []
      if (users.length === 0) {
        return null
      }

      const bestMatch = users.reduce((best, current) => {
        const currentScore = calculateSimilarity(query.toLowerCase(), current.name.toLowerCase())
        const bestScore = calculateSimilarity(query.toLowerCase(), best.name.toLowerCase())
        return currentScore > bestScore ? current : best
      })

      playerId = bestMatch.id
    }

    const userInfoUrl = `https://roblox.com/users/profile?userId=${playerId}`
    const userInfoResponse = await axios.get(userInfoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    const $ = cheerio.load(userInfoResponse.data)
    const name = $('.profile-name').text().trim();
    const displayName = $('.profile-display-name').text().trim() || name;
    const description = $('.profile-about-content-text').text().trim() || "Sin descripción";
    const created = $('[data-testid="profile-created-date"]').text().trim();
    const isBanned = $('.icon-status-banned').length > 0;
    const avatar = $('.avatar-card-image').attr('src') || `https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/420/420/Avatar/Png`;


    return {
      id: playerId,
      name: name,
      displayName: displayName,
      description: description,
      created: created,
      isBanned: isBanned,
      avatar: avatar,
      profileUrl: `https://www.roblox.com/users/${playerId}/profile`,
    }
  } catch (error) {
    console.error("Error buscando jugador de Roblox:", error)
    return null
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

function createPlayerBar(current, max) {
  const percentage = (current / max) * 100
  const filledBars = Math.round(percentage / 10)
  const emptyBars = 10 - filledBars

  let bar = ""
  for (let i = 0; i < filledBars; i++) bar += "🟩"
  for (let i = 0; i < emptyBars; i++) bar += "⬜"

  return bar
}

async function handleRobloxServersView(interaction, cache, page = 0) {
  const { publicServers, gameData, gameIcon, totalServers } = cache

  if (!publicServers || publicServers.length === 0) {
    return interaction.reply({ content: "❌ No hay servidores públicos disponibles.", ephemeral: true })
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate()
  }

  const serversPerPage = 20
  const totalPages = Math.ceil(publicServers.length / serversPerPage)
  const startIndex = page * serversPerPage
  const endIndex = startIndex + serversPerPage
  const currentServers = publicServers.slice(startIndex, endIndex)

  let serversList = `**🌐 SERVIDORES PÚBLICOS (Página ${page + 1}/${totalPages}):**\n\n`

  currentServers.forEach((server, index) => {
    const globalIndex = startIndex + index + 1
    const playerBar = createPlayerBar(server.playing, server.maxPlayers)

    serversList += `**${globalIndex}.** Servidor #${globalIndex}\n`
    serversList += `👥 **${server.playing}/${server.maxPlayers}** ${playerBar}\n`
    serversList += `🆔 ID: \`${server.id}\`\n`
    serversList += `📡 Ping: ${server.ping || "N/A"}ms\n`
    serversList += `🌍 Región: ${server.location || "Global"}\n`
    serversList += `🚀 [Unirse](https://www.roblox.com/games/start?placeId=${cache.placeId}&gameInstanceId=${server.id})\n\n`
  })

  const embed = new EmbedBuilder()
    .setTitle(`🌐 ${gameData.name} - Servidores Públicos`)
    .setDescription(serversList)
    .setColor("#4CAF50")
    .setThumbnail(gameIcon)
    .setFooter({
      text: `Página ${page + 1}/${totalPages} | Total: ${totalServers} servidores`,
    })
    .setTimestamp()

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prevServersRoblox-${interaction.user.id}`)
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`nextServersRoblox-${interaction.user.id}`)
      .setLabel("➡️ Siguiente")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`refreshServersRoblox-${interaction.user.id}`)
      .setLabel("🔄 Actualizar")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`backRoblox-${interaction.user.id}`)
      .setLabel("🔙 Volver")
      .setStyle(ButtonStyle.Secondary),
  )

  cache.serversPage = page
  robloxSearchCache.set(interaction.user.id, cache)

  if (interaction.deferred) {
    await interaction.editReply({ embeds: [embed], components: [buttons] })
  } else {
    await interaction.update({ embeds: [embed], components: [buttons] })
  }
}

async function handlePlayerSearch(interaction, cache) {
  const modal = new ModalBuilder().setCustomId("playerSearchModal").setTitle("Buscar Jugador de Roblox")

  const playerInput = new TextInputBuilder()
    .setCustomId("playerSearchInput")
    .setLabel("Nombre de usuario o ID del jugador")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(50)
    .setPlaceholder("Ejemplo: Builderman o 156")

  const firstActionRow = new ActionRowBuilder().addComponents(playerInput)

  await interaction.showModal(modal.addComponents(firstActionRow))
}

async function handlePlayerSearchResult(interaction, query) {
  await interaction.deferReply({ ephemeral: true })

  const playerData = await searchRobloxPlayer(query)

  if (!playerData) {
    return interaction.editReply({
      content: "❌ No se encontró ningún jugador con ese nombre o ID.",
    })
  }

  const createdDate = new Date(playerData.created).toLocaleDateString("es-ES")

  const embed = new EmbedBuilder()
    .setTitle(`👤 ${playerData.displayName} (@${playerData.name})`)
    .setDescription(
      `**📝 Descripción:**\n${playerData.description}\n\n**📅 Cuenta creada:** ${createdDate}\n**🆔 ID:** ${playerData.id}\n**🚫 Baneado:** ${playerData.isBanned ? "Sí" : "No"}`,
    )
    .setColor("#00b2ff")
    .setThumbnail(playerData.avatar)
    .setFooter({ text: "Información del jugador de Roblox" })
    .setTimestamp()

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel("👤 Ver Perfil").setStyle(ButtonStyle.Link).setURL(playerData.profileUrl),
  )

  await interaction.editReply({ embeds: [embed], components: [button] })
}

function createAPIUsageEmbed() {
  const googleStats = apiManager.getAPIStats("google")
  const youtubeStats = apiManager.getAPIStats("youtube")

  const embed = new EmbedBuilder().setTitle("📊 Estado de APIs en Tiempo Real").setColor("#00c7ff").setTimestamp()

  let googleInfo = "**🔍 Google Custom Search APIs:**\n"
  API_POOLS.google.forEach((api, index) => {
    const status = api.quotaExhausted ? "🔴" : api.active ? "🟢" : "🟡"
    const usage = `${api.dailyRequests}/${api.maxDailyRequests}`
    const percentage = Math.round((api.dailyRequests / api.maxDailyRequests) * 100)

    googleInfo += `${status} **API ${index + 1}**: ${usage} (${percentage}%)\n`
  })

  let youtubeInfo = "**🎬 YouTube Data APIs:**\n"
  API_POOLS.youtube.forEach((api, index) => {
    const status = api.quotaExhausted ? "🔴" : api.active ? "🟢" : "🟡"
    const usage = `${api.dailyRequests}/${api.maxDailyRequests}`
    const percentage = Math.round((api.dailyRequests / api.maxDailyRequests) * 100)

    youtubeInfo += `${status} **API ${index + 1}**: ${usage} (${percentage}%)\n`
  })

  embed.addFields(
    { name: "Google APIs", value: googleInfo, inline: true },
    { name: "YouTube APIs", value: youtubeInfo, inline: true },
    {
      name: "📈 Resumen",
      value: `🔍 Google: ${googleStats.active}/${googleStats.total} activas\n🎬 YouTube: ${youtubeStats.active}/${youtubeStats.total} activas\n📊 Total requests hoy: ${googleStats.totalRequests + youtubeStats.totalRequests}`,
      inline: false,
    },
  )

  return embed
}

function addAPIUsageToEmbed(embed, apiType = "google") {
  const apiInfo = apiManager.getCurrentAPIInfo(apiType)
  if (apiInfo) {
    const percentage = Math.round((apiInfo.used / apiInfo.max) * 100)
    const statusEmoji = percentage > 90 ? "🔴" : percentage > 70 ? "🟡" : "🟢"

    embed.setFooter({
      text: `${embed.data.footer?.text || ""} | ${statusEmoji} API: ${apiInfo.remaining}/${apiInfo.max} (${100 - percentage}% disponible)`,
    })
  }
  return embed
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

    const totalServers = publicServers.length
    const totalPlayers = publicServers.reduce((sum, server) => sum + server.playing, 0)
    const totalMaxPlayers = publicServers.reduce((sum, server) => sum + server.maxPlayers, 0)

    const gameIcon = await getGameIcon(universeId)

    robloxSearchCache.set(message.author.id, {
      publicServers,
      gameData,
      placeId,
      universeId,
      totalServers,
      totalPlayers,
      totalMaxPlayers,
      gameIcon,
      serversPage: 0,
    })

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
        .setCustomId(`searchPlayerRoblox-${message.author.id}`)
        .setLabel("👤 Buscar Jugador")
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

async function handleGamePassesView(interaction, cache, page = 0) {
  const { universeId, gameData, gameIcon } = cache

  await interaction.deferUpdate()

  try {
    const gamePasses = await getGamePasses(universeId)

    if (gamePasses.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle(`🎫 ${gameData.name} - Pases del Juego`)
        .setDescription("❌ Este juego no tiene pases disponibles.")
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

    const passesPerPage = 10
    const totalPages = Math.ceil(gamePasses.length / passesPerPage)
    const startIndex = page * passesPerPage
    const endIndex = startIndex + passesPerPage
    const currentPasses = gamePasses.slice(startIndex, endIndex)

    let passesList = `**🎫 PASES DEL JUEGO (Página ${page + 1}/${totalPages}):**\n\n`

    for (let i = 0; i < currentPasses.length; i++) {
      const pass = currentPasses[i]
      const globalIndex = startIndex + i + 1
      const price = pass.price ? `${pass.price} Robux` : "Gratis"
      const passIcon = `https://thumbnails.roblox.com/v1/game-passes?gamePassIds=${pass.id}&size=150x150&format=Png`

      passesList += `**${globalIndex}.** ${pass.name}\n`
      passesList += `💰 **Precio:** ${price}\n`
      passesList += `🎫 **ID:** ${pass.id}\n`
      passesList += `🖼️ [Icono](${passIcon})\n`
      passesList += `🔗 [Ver Pase](https://www.roblox.com/es/game-pass/${pass.id})\n\n`
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎫 ${gameData.name} - Pases del Juego`)
      .setDescription(passesList)
      .setColor("#FFD700")
      .setThumbnail(gameIcon)
      .setFooter({ text: `Página ${page + 1}/${totalPages} | Total: ${gamePasses.length} pases` })
      .setTimestamp()

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

    await interaction.editReply({ embeds: [embed], components: [buttons] })
  } catch (error) {
    await logError(interaction.channel, error, "Error obteniendo pases del juego")
    const embed = new EmbedBuilder()
      .setTitle(`🎫 ${gameData.name} - Pases del Juego`)
      .setDescription("❌ Error al obtener los pases del juego.")
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
    if (action === "searchPlayerRoblox") {
      await handlePlayerSearch(interaction, cache)
    } else if (action === "gamePassesRoblox") {
      await handleGamePassesView(interaction, cache, 0)
    } else if (action === "prevPassesRoblox") {
      await handleGamePassesView(interaction, cache, Math.max(0, cache.passPage - 1))
    } else if (action === "nextPassesRoblox") {
      await handleGamePassesView(interaction, cache, cache.passPage + 1)
    } else if (action === "publicRoblox") {
      await handleRobloxServersView(interaction, cache, 0)
    } else if (action === "prevServersRoblox") {
      await handleRobloxServersView(interaction, cache, Math.max(0, cache.serversPage - 1))
    } else if (action === "nextServersRoblox") {
      await handleRobloxServersView(interaction, cache, cache.serversPage + 1)
    } else if (action === "refreshServersRoblox") {
      await handleRobloxServersView(interaction, cache, cache.serversPage || 0)
    } else if (action === "playRoblox") {
      const playUrl = `https://www.roblox.com/games/${cache.placeId}`
      return interaction.reply({
        content: `🎮 **${cache.gameData.name}**\n🔗 ${playUrl}\n*Clic en el enlace para jugar directamente*`,
        ephemeral: true,
      })
    } else if (action === "refreshRoblox") {
      try {
        await interaction.deferUpdate()

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

        cache.gameData = gameData
        cache.publicServers = publicServers
        cache.totalServers = totalServers
        cache.totalPlayers = totalPlayers
        cache.totalMaxPlayers = totalMaxPlayers
        robloxSearchCache.set(userId, cache)

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
            .setCustomId(`searchPlayerRoblox-${userId}`)
            .setLabel("👤 Buscar Jugador")
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
          .setCustomId(`searchPlayerRoblox-${userId}`)
          .setLabel("👤 Buscar Jugador")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`gamePassesRoblox-${userId}`)
          .setLabel("🎫 Pases del Juego")
          .setStyle(ButtonStyle.Secondary),
      )

      return interaction.update({ embeds: [embed], components: [row1, row2] })
    }
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

    if (message.content.startsWith(".")) {
      await handleCommands(message)
    }
  } catch (error) {
    await logError(message.channel, error, "Error en messageCreate")
  }
})

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction)
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction)
    }
  } catch (error) {
    await logError(interaction.channel, error, "Error en interactionCreate")
  }
})

async function handleModalSubmit(interaction) {
  if (interaction.customId === "playerSearchModal") {
    const query = interaction.fields.getTextInputValue("playerSearchInput")
    await handlePlayerSearchResult(interaction, query)
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

async function handleCommands(message) {
  const [command, ...args] = message.content.slice(1).trim().split(/ +/)
  const cmd = command.toLowerCase()

  try {
    switch (cmd) {
      case "roblox":
        await handleRobloxSearch(message, args)
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
        const embed = createAPIUsageEmbed()
        return message.reply({ embeds: [embed], ephemeral: true })
      default:
        return message.reply("❌ Comando no reconocido. Solo el comando `.roblox` está disponible.")
    }
  } catch (error) {
    await logError(message.channel, error, `Error ejecutando comando: ${cmd}`)
    return message.reply(`❌ Error ejecutando el comando: ${error.message}`)
  }
}

async function handleButtonInteraction(interaction) {
  const userId = interaction.user.id
  const customId = interaction.customId

  let buttonUserId = null
  if (customId.includes("-")) {
    const parts = customId.split("-")
    buttonUserId = parts[parts.length - 1]
  }

  if (userId !== buttonUserId) {
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({ content: "⛔ No puedes usar estos botones.", ephemeral: true })
    }
    return
  }

  try {
    if (customId.includes("Roblox")) {
      await handleRobloxNavigation(interaction, customId.split("-")[0])
    }
  } catch (error) {
    await logError(interaction.channel, error, "Error en handleButtonInteraction")
  }
}

client.login(process.env.DISCORD_TOKEN)
