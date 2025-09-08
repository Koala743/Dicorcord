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

// Eliminado CHANNELS
// Eliminado LANGUAGES
// Eliminado ROLE_CONFIG

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
    name: ".cmx [búsqueda]",
    description: "Busca comics adultos en sitios especializados",
    example: ".cmx naruto",
    category: "🔞 Adulto",
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

class ComicScraper {
  constructor() {
    this.comicCache = new Map()
  }

  async scrapeChochoxAPI(query) {
    try {
      const searchUrl = `https://chochox.com/api/search?q=${encodeURIComponent(query)}&limit=20`
      const response = await axios.get(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
          Referer: "https://chochox.com/",
        },
      })

      if (response.data && response.data.results) {
        return response.data.results.map((comic) => ({
          title: comic.title,
          url: `https://chochox.com/comic/${comic.slug}`,
          thumbnail: comic.thumbnail || comic.cover,
          pages: comic.pages || 0,
          id: comic.id,
          slug: comic.slug,
        }))
      }
    } catch (error) {
      console.log("API de Chochox no disponible, usando scraping...")
    }
    return null
  }

  async scrapeReyComixAPI(query) {
    try {
      const searchUrl = `https://reycomix.com/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&per_page=20`
      const response = await axios.get(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
      })

      if (response.data && Array.isArray(response.data)) {
        return response.data.map((comic) => ({
          title: comic.title.rendered,
          url: comic.link,
          thumbnail: comic.featured_media_url,
          excerpt: comic.excerpt.rendered.replace(/<[^>]*>/g, ""),
          id: comic.id,
        }))
      }
    } catch (error) {
      console.log("API de ReyComix no disponible, usando scraping...")
    }
    return null
  }

  async getComicPages(comicUrl, site) {
    try {
      if (site === "chochox.com") {
        return await this.getChochoxPages(comicUrl)
      } else if (site === "reycomix.com") {
        return await this.getReyComixPages(comicUrl)
      }
    } catch (error) {
      console.error("Error obteniendo páginas del comic:", error)
    }
    return null
  }

  async getChochoxPages(comicUrl) {
    try {
      const comicId = comicUrl.split("/").pop()
      const apiUrl = `https://chochox.com/api/comic/${comicId}/pages`

      const response = await axios.get(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
          Referer: comicUrl,
        },
      })

      if (response.data && response.data.pages) {
        return {
          title: response.data.title,
          pages: response.data.pages.map((page, index) => ({
            url: page.image_url,
            index: index + 1,
            filename: `page_${index + 1}.jpg`,
          })),
          totalPages: response.data.pages.length,
          sourceUrl: comicUrl,
        }
      }
    } catch (error) {
      console.log("API no disponible, usando scraping tradicional...")
      return await this.scrapeChochoxComic(comicUrl)
    }
    return null
  }

  async getReyComixPages(comicUrl) {
    try {
      const browser = await puppeteer.launch({ headless: true })
      const page = await browser.newPage()

      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
      await page.goto(comicUrl, { waitUntil: "networkidle2" })

      const comicData = await page.evaluate(() => {
        const title =
          document.querySelector("h1")?.textContent || "Comic"
        const images = []

        document.querySelectorAll("img").forEach((img, index) => {
          const src = img.src || img.getAttribute("data-src")
          if (src && (src.includes(".jpg") || src.includes(".png") || src.includes(".webp"))) {
            if (!src.includes("logo") && !src.includes("banner")) {
              images.push({
                url: src,
                index: index + 1,
                filename: `page_${index + 1}.jpg`,
              })
            }
          }
        })

        return { title, images }
      })

      await browser.close()

      return {
        title: comicData.title,
        pages: comicData.images,
        totalPages: comicData.images.length,
        sourceUrl: comicUrl,
      }
    } catch (error) {
      console.error("Error scraping ReyComix:", error)
      return null
    }
  }

  async scrapeChochoxComic(comicUrl) {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
      const page = await browser.newPage()

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      )

      await page.goto(comicUrl, { waitUntil: "networkidle2" })
      await page.waitForTimeout(3000)

      const content = await page.content()
      const $ = cheerio.load(content)

      const images = []
      const comicTitle = $("h1").first().text() || "Comic"

      $("img").each((i, elem) => {
        const src = $(elem).attr("src") || $(elem).attr("data-src")
        if (src && this.isComicImage(src)) {
          images.push({
            url: this.normalizeImageUrl(src, comicUrl),
            index: this.extractImageNumber(src),
            filename: this.extractFilename(src),
          })
        }
      })

      $('div[style*="background-image"]').each((i, elem) => {
        const style = $(elem).attr("style")
        const match = style.match(/background-image:\s*url$$['"]?([^'"]+)['"]?$$/)
        if (match && this.isComicImage(match[1])) {
          images.push({
            url: this.normalizeImageUrl(match[1], comicUrl),
            index: this.extractImageNumber(match[1]),
            filename: this.extractFilename(match[1]),
          })
        }
      })

      await browser.close()

      images.sort((a, b) => a.index - b.index)

      return {
        title: comicTitle,
        pages: images,
        totalPages: images.length,
        sourceUrl: comicUrl,
      }
    } catch (error) {
      console.error("Error scraping comic:", error)
      return null
    }
  }

  isComicImage(src) {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
    const lowerSrc = src.toLowerCase()
    return (
      imageExtensions.some((ext) => lowerSrc.includes(ext)) &&
      !lowerSrc.includes("logo") &&
      !lowerSrc.includes("banner") &&
      !lowerSrc.includes("ad")
    )
  }

  extractImageNumber(src) {
    const match = src.match(/(\d+)\.(?:jpg|jpeg|png|webp|gif)/i)
    return match ? Number.parseInt(match[1]) : 0
  }

  extractFilename(src) {
    return src.split("/").pop()
  }

  normalizeImageUrl(src, baseUrl) {
    if (src.startsWith("http")) return src
    if (src.startsWith("//")) return "https:" + src
    if (src.startsWith("/")) return new URL(baseUrl).origin + src
    return new URL(src, baseUrl).href
  }
}

// Eliminado EnhancedXXXSearch (ya que .xxx no es un comando permitido)

const apiManager = new APIManager()
const comicScraper = new ComicScraper()
// Eliminado enhancedXXXSearch

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

// Eliminado imageSearchCache
// Eliminado pendingXXXSearch
// Eliminado xxxSearchCache
const pendingComicSearch = new Map()
const comicSearchCache = new Map()

// Eliminado loadPreferences, savePreferences, loadSavedGames, saveSavedGames, getUserLanguage, getTranslation

async function logError(channel, error, context = "") {
  // Simplificado: solo loguea a consola, no envía a Discord
  console.error(`🚨 Error Detectado - Contexto: ${context} - Error: ${error.message} - Stack: ${error.stack}`)
}

// Eliminado isImageUrlValid (ya no se usa para .web)

async function sendWarning(interactionOrMessage, text) {
  const reply = await interactionOrMessage.reply({ content: text, ephemeral: true })
  setTimeout(() => {
    if (reply?.delete) reply.delete().catch(() => {})
  }, 5000)
}

// Eliminado todas las funciones de Roblox, traducción, chat, etc.

async function handleComicCompleteView(interaction, comicData) {
  const { title, pages, sourceUrl } = comicData
  const userId = interaction.user.id

  if (!pages || pages.length === 0) {
    return interaction.reply({ content: "❌ No se encontraron imágenes del comic.", ephemeral: true })
  }

  comicSearchCache.set(userId, {
    ...comicSearchCache.get(userId),
    comicData: comicData,
    viewingComplete: true,
    currentImageIndex: 0,
  })

  const embed = await createComicViewerEmbed(comicData, 0)
  const buttons = createComicViewerButtons(userId, 0, pages.length)

  await interaction.update({
    embeds: [embed],
    components: buttons,
  })
}

async function createComicViewerEmbed(comicData, imageIndex) {
  const { title, pages, sourceUrl } = comicData
  const currentImage = pages[imageIndex]
  const apiInfo = apiManager.getCurrentAPIInfo("google")

  const embed = new EmbedBuilder()
    .setTitle(`📚 ${title}`)
    .setDescription(
      `**Página ${imageIndex + 1} de ${pages.length}**\n\n📖 **Archivo**: ${currentImage.filename}\n🔗 [Ver comic original](${sourceUrl})`,
    )
    .setImage(currentImage.url)
    .setColor("#9b59b6")
    .setFooter({
      text: `Página ${imageIndex + 1}/${pages.length} | API: ${apiInfo?.remaining || 0}/${apiInfo?.max || 0}`,
    })
    .setTimestamp()

  return embed
}

function createComicViewerButtons(userId, currentIndex, total) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`comicPrev-${userId}`)
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentIndex === 0),
    new ButtonBuilder()
      .setCustomId(`comicNext-${userId}`)
      .setLabel("➡️ Siguiente")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentIndex === total - 1),
    new ButtonBuilder()
      .setCustomId(`comicFirst-${userId}`)
      .setLabel("⏮️ Primera")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentIndex === 0),
    new ButtonBuilder()
      .setCustomId(`comicLast-${userId}`)
      .setLabel("⏭️ Última")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentIndex === total - 1),
  )

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`comicJump-${userId}`)
      .setLabel(`📄 Ir a página...`)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`comicBack-${userId}`).setLabel("🔙 Volver").setStyle(ButtonStyle.Danger),
  )

  return [row1, row2]
}

async function handleComicViewerNavigation(interaction, action) {
  const userId = interaction.user.id
  const cache = comicSearchCache.get(userId)

  if (!cache || !cache.comicData) {
    return interaction.reply({ content: "❌ No hay comic cargado.", ephemeral: true })
  }

  const { comicData } = cache
  let newIndex = cache.currentImageIndex || 0

  switch (action) {
    case "comicNext":
      newIndex = Math.min(newIndex + 1, comicData.pages.length - 1)
      break
    case "comicPrev":
      newIndex = Math.max(newIndex - 1, 0)
      break
    case "comicFirst":
      newIndex = 0
      break
    case "comicLast":
      newIndex = comicData.pages.length - 1
      break
    case "comicJump":
      return handleComicJumpModal(interaction, cache)
    case "comicBack": // Manejar el botón "Volver"
      comicSearchCache.delete(userId); // Limpiar el caché del comic
      // Redirigir a la búsqueda inicial de comics o simplemente actualizar el mensaje
      return interaction.update({
        content: "Volviendo a la búsqueda de comics...",
        embeds: [],
        components: [],
      });
  }

  cache.currentImageIndex = newIndex
  comicSearchCache.set(userId, cache)

  const embed = await createComicViewerEmbed(comicData, newIndex)
  const buttons = createComicViewerButtons(userId, newIndex, comicData.pages.length)

  await interaction.update({ embeds: [embed], components: buttons })
}

async function handleComicJumpModal(interaction, cache) {
  const { comicData } = cache
  const modal = new ModalBuilder().setCustomId("comicJumpModal").setTitle("Ir a página específica")

  const pageInput = new TextInputBuilder()
    .setCustomId("comicPageInput")
    .setLabel("Número de página")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(3)
    .setPlaceholder(`1-${comicData.pages.length}`)

  const firstActionRow = new ActionRowBuilder().addComponents(pageInput)

  await interaction.showModal(modal.addComponents(firstActionRow))
}

// Eliminado createAPIUsageEmbed (ya no hay comandos de admin)

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

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`)
  // Eliminado loadPreferences y loadSavedGames
})

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content) return

  try {
    // Eliminado handleInviteRestrictions, handleAutoTranslate, handleChatTranslation
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
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction)
    }
  } catch (error) {
    await logError(interaction.channel, error, "Error en interactionCreate")
  }
})

async function handleModalSubmit(interaction) {
  if (interaction.customId === "comicJumpModal") {
    const userId = interaction.user.id
    const cache = comicSearchCache.get(userId)

    if (!cache || !cache.comicData) {
      return interaction.reply({ content: "❌ No hay comic cargado.", ephemeral: true })
    }

    const page = Number.parseInt(interaction.fields.getTextInputValue("comicPageInput"))
    const newIndex = Math.min(Math.max(page - 1, 0), cache.comicData.pages.length - 1)

    cache.currentImageIndex = newIndex
    comicSearchCache.set(userId, cache)

    const embed = await createComicViewerEmbed(cache.comicData, newIndex)
    const buttons = createComicViewerButtons(userId, newIndex, cache.comicData.pages.length)

    await interaction.update({ embeds: [embed], components: buttons })
  }
}

async function handleCommands(message) {
  const [command, ...args] = message.content.slice(1).trim().split(/ +/)
  const cmd = command.toLowerCase()

  try {
    switch (cmd) {
      case "cmx":
        await handleComicSearch(message, args)
        break
      default:
        // Si el comando no es 'cmx', no hace nada.
        break;
    }
  } catch (error) {
    await logError(message.channel, error, `Error ejecutando comando: ${cmd}`)
    return message.reply(`❌ Error ejecutando el comando: ${error.message}`)
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

async function handleSelectMenu(interaction) {
  const userId = interaction.user.id

  try {
    if (interaction.customId.startsWith("comicsite-")) {
      await handleComicSiteSelection(interaction)
    }
  } catch (error) {
    await logError(interaction.channel, error, "Error en handleSelectMenu")
  }
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
    let comicsFound = null

    if (selectedSite === "chochox.com") {
      comicsFound = await comicScraper.scrapeChochoxAPI(query)
    } else if (selectedSite === "reycomix.com") {
      comicsFound = await comicScraper.scrapeReyComixAPI(query)
    }

    if (!comicsFound) {
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
    } else {
      comicSearchCache.set(interaction.user.id, {
        items: comicsFound,
        currentIndex: 0,
        query,
        site: selectedSite,
        isAPI: true,
      })

      const item = comicsFound[0]
      const embed = createAPIComicEmbed(item, 0, comicsFound.length)
      const buttons = createNavigationButtons(interaction.user.id, 0, comicsFound.length, "comic")

      await interaction.update({
        content: "",
        embeds: [embed],
        components: [buttons],
      })
    }

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

function createAPIComicEmbed(comic, index, total) {
  const embed = new EmbedBuilder()
    .setTitle(`📚 ${comic.title}`)
    .setDescription(
      `**📖 Comic encontrado via API 📖**\n[📚 Ver comic completo](${comic.url})\n\n📄 **Páginas**: ${comic.pages || "N/A"}`,
    )
    .setColor("#9b59b6")
    .setImage(comic.thumbnail)
    .setTimestamp()
    .addFields({
      name: "📚 Nota",
      value: "Este comic fue encontrado usando la API oficial del sitio.",
    })

  const apiInfo = apiManager.getCurrentAPIInfo("google")
  if (apiInfo) {
    embed.setFooter({
      text: `Resultado ${index + 1} de ${total} | API: ${apiInfo.remaining}/${apiInfo.max}`,
    })
  }

  return embed
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
    if (customId.startsWith("comic")) {
      if (
        customId.includes("Prev") ||
        customId.includes("Next") ||
        customId.includes("First") ||
        customId.includes("Last") ||
        customId.includes("Jump") ||
        customId.includes("Back")
      ) {
        await handleComicViewerNavigation(interaction, customId.split("-")[0])
      } else {
        await handleComicSearchNavigation(interaction, customId.split("-")[0])
      }
    }
  } catch (error) {
    await logError(interaction.channel, error, "Error en handleButtonInteraction")
  }
}

async function handleComicSearchNavigation(interaction, action) {
  const userId = interaction.user.id
  if (!comicSearchCache.has(userId)) {
    return interaction.reply({ content: "❌ No hay búsqueda activa para paginar.", ephemeral: true })
  }

  const data = comicSearchCache.get(userId)
  const { items, currentIndex, isAPI } = data

  let newIndex = currentIndex
  if (action === "comicnext" && currentIndex < items.length - 1) {
    newIndex++
  } else if (action === "comicback" && currentIndex > 0) {
    newIndex--
  } else if (action === "comicview") {
    const currentItem = items[currentIndex]

    if (isAPI) {
      try {
        const comicData = await comicScraper.getComicPages(currentItem.url, data.site)
        if (comicData && comicData.pages && comicData.pages.length > 0) {
          return await handleComicCompleteView(interaction, comicData)
        } else {
          return interaction.reply({ content: "❌ No se pudieron extraer las páginas del comic.", ephemeral: true })
        }
      } catch (error) {
        await logError(interaction.channel, error, "Error obteniendo páginas del comic")
        return interaction.reply({ content: "❌ Error al procesar el comic.", ephemeral: true })
      }
    } else {
      if (data.site === "chochox.com") {
        try {
          const comicData = await comicScraper.scrapeChochoxComic(currentItem.link)
          if (comicData && comicData.pages.length > 0) {
            return await handleComicCompleteView(interaction, comicData)
          } else {
            return interaction.reply({ content: "❌ No se pudieron extraer las imágenes del comic.", ephemeral: true })
          }
        } catch (error) {
          await logError(interaction.channel, error, "Error scraping comic")
          return interaction.reply({ content: "❌ Error al procesar el comic.", ephemeral: true })
        }
      }
    }
  }

  data.currentIndex = newIndex
  comicSearchCache.set(userId, data)

  const item = items[newIndex]
  const embed = isAPI
    ? createAPIComicEmbed(item, newIndex, items.length)
    : createComicSearchEmbed(item, newIndex, items.length)
  const buttons = createNavigationButtons(userId, newIndex, items.length, "comic")

  await interaction.update({ embeds: [embed], components: buttons })
}

function createComicSearchEmbed(item, index, total) {
  const title = item.title
  const link = item.link
  const context = item.displayLink
  const thumb = item.pagemap?.cse_thumbnail?.[0]?.src || item.pagemap?.cse_image?.[0]?.src

  const embed = new EmbedBuilder()
    .setTitle(`📚 ${title.slice(0, 80)}...`)
    .setDescription(`**📖 Navega con las flechas 📖**\n[📚 Ir al comic](${link})\n\n🌐 **Sitio**: ${context}`)
    .setColor("#9b59b6")
    .setImage(thumb)
    .setTimestamp()
    .addFields({
      name: "📚 Nota",
      value: "Usa las flechas para navegar entre resultados.",
    })

  addAPIUsageToEmbed(embed, "google")

  return embed
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

  const viewBtn = new ButtonBuilder()
    .setCustomId(`${prefix}view-${userId}`)
    .setLabel("Ver Comic")
    .setStyle(ButtonStyle.Success)

  return new ActionRowBuilder().addComponents(backBtn, nextBtn, viewBtn)
}

client.login(process.env.DISCORD_TOKEN)
