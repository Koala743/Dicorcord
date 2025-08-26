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
        const title = document.querySelector("h1")?.textContent || "Comic"
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
        const match = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/)
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

class EnhancedXXXSearch {
  constructor() {
    this.videoCache = new Map()
  }

  async handleEnhancedAdultSearch(interaction, selectedSite, query) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=GOOGLE_API_KEY&cx=GOOGLE_CX&q=${encodeURIComponent(query + " site:" + selectedSite)}&num=10`
      const response = await makeGoogleAPIRequest(url, "google")
      const items = response.data.items

      if (!items || items.length === 0) {
        return interaction.reply({ content: "❌ No se encontraron resultados.", ephemeral: true })
      }

      const processedItems = await Promise.all(
        items.map(async (item) => await this.processAdultSearchItem(item, selectedSite)),
      )

      xxxSearchCache.set(interaction.user.id, {
        items: processedItems,
        currentIndex: 0,
        query,
        site: selectedSite,
      })

      const item = processedItems[0]
      const embed = await this.createEnhancedAdultEmbed(item, 0, processedItems.length)
      const buttons = this.createEnhancedAdultButtons(interaction.user.id, 0, processedItems.length)

      await interaction.update({
        content: "",
        embeds: [embed],
        components: buttons,
      })
    } catch (error) {
      console.error("Error en búsqueda XXX mejorada:", error)
      return interaction.reply({
        content: "❌ Error al buscar. Intenta de nuevo más tarde.",
        ephemeral: true,
      })
    }
  }

  async processAdultSearchItem(item, site) {
    const processedItem = { ...item }

    try {
      const videoInfo = await this.extractVideoInfo(item.link, site)
      processedItem.videoInfo = videoInfo
      processedItem.enhancedThumbnail = await this.getEnhancedThumbnail(item)
      processedItem.directVideoUrl = await this.getDirectVideoUrl(item.link, site)
    } catch (error) {
      console.error("Error procesando item adulto:", error)
    }

    return processedItem
  }

  async extractVideoInfo(url, site) {
    try {
      const browser = await puppeteer.launch({ headless: true })
      const page = await browser.newPage()

      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
      await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 })

      const videoInfo = await page.evaluate(() => {
        const title =
          document.querySelector("h1")?.textContent ||
          document.querySelector(".title")?.textContent ||
          document.querySelector('[class*="title"]')?.textContent ||
          document.title

        const duration =
          document.querySelector(".duration")?.textContent ||
          document.querySelector('[class*="duration"]')?.textContent ||
          document.querySelector("[data-duration]")?.getAttribute("data-duration")

        const views =
          document.querySelector(".views")?.textContent ||
          document.querySelector('[class*="views"]')?.textContent ||
          document.querySelector('[class*="view-count"]')?.textContent

        const videoElement = document.querySelector("video")
        let videoSrc = null

        if (videoElement) {
          videoSrc = videoElement.src || videoElement.getAttribute("src")
          if (!videoSrc) {
            const source = videoElement.querySelector("source")
            if (source) {
              videoSrc = source.src || source.getAttribute("src")
            }
          }
        }

        const thumbnail =
          document.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
          document.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ||
          document.querySelector("video")?.getAttribute("poster")

        return {
          title: title?.trim(),
          duration: duration?.trim(),
          views: views?.trim(),
          directVideoSrc: videoSrc,
          thumbnail: thumbnail,
        }
      })

      await browser.close()
      return videoInfo
    } catch (error) {
      console.error("Error extrayendo info de video:", error)
      return null
    }
  }

  async getEnhancedThumbnail(item) {
    const possibleThumbnails = [
      item.pagemap?.cse_thumbnail?.[0]?.src,
      item.pagemap?.cse_image?.[0]?.src,
      item.pagemap?.metatags?.[0]?.["og:image"],
      item.pagemap?.metatags?.[0]?.["twitter:image"],
    ].filter(Boolean)

    for (const thumb of possibleThumbnails) {
      if (await isImageUrlValid(thumb)) {
        return thumb
      }
    }

    return "https://via.placeholder.com/640x360/FF6B6B/FFFFFF?text=Video+Adulto"
  }

  async getDirectVideoUrl(pageUrl, site) {
    try {
      if (site.includes("xvideos")) {
        return await this.extractXvideosDirectUrl(pageUrl)
      } else if (site.includes("pornhub")) {
        return await this.extractPornhubDirectUrl(pageUrl)
      }
    } catch (error) {
      console.error("Error obteniendo URL directa:", error)
    }
    return null
  }

  async extractXvideosDirectUrl(url) {
    try {
      const browser = await puppeteer.launch({ headless: true })
      const page = await browser.newPage()

      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
      await page.goto(url, { waitUntil: "networkidle2" })

      const videoUrl = await page.evaluate(() => {
        const video = document.querySelector("video source")
        return video ? video.src : null
      })

      await browser.close()
      return videoUrl
    } catch (error) {
      console.error("Error extrayendo URL de Xvideos:", error)
      return null
    }
  }

  async createEnhancedAdultEmbed(item, index, total) {
    const title = item.videoInfo?.title || item.title
    const link = item.link
    const context = item.displayLink
    const thumbnail = item.videoInfo?.thumbnail || item.enhancedThumbnail
    const apiInfo = apiManager.getCurrentAPIInfo("google")

    const embed = new EmbedBuilder()
      .setTitle(`🔞 ${title.slice(0, 80)}...`)
      .setColor("#ff3366")
      .setImage(thumbnail)
      .setFooter({
        text: `Resultado ${index + 1} de ${total} | API: ${apiInfo.id} | Quedan: ${apiInfo.remaining}/${apiInfo.max}`,
      })
      .setTimestamp()

    let description = `**🔥 Video encontrado 🔥**\n[📺 Ver en sitio](${link})\n\n🌐 **Sitio**: ${context}`

    if (item.videoInfo) {
      if (item.videoInfo.duration) description += `\n⏱️ **Duración**: ${item.videoInfo.duration}`
      if (item.videoInfo.views) description += `\n👁️ **Vistas**: ${item.videoInfo.views}`
    }

    if (item.directVideoUrl) {
      description += `\n🎬 **[Link Directo](${item.directVideoUrl})**`
    }

    embed.setDescription(description)

    embed.addFields({
      name: "⚠️ Nota",
      value: "Contenido para adultos (+18). Usa los botones para navegar.",
    })

    return embed
  }

  createEnhancedAdultButtons(userId, currentIndex, total) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`xxxback-${userId}`)
        .setLabel("⬅️ Anterior")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentIndex === 0),
      new ButtonBuilder()
        .setCustomId(`xxxnext-${userId}`)
        .setLabel("➡️ Siguiente")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentIndex === total - 1),
      new ButtonBuilder().setCustomId(`xxxwatch-${userId}`).setLabel("🎬 Ver Video").setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`xxxdirect-${userId}`)
        .setLabel("🔗 Link Directo")
        .setStyle(ButtonStyle.Secondary),
    )

    return [row]
  }

  async handleVideoWatch(interaction, cache) {
    const currentItem = cache.items[cache.currentIndex]

    if (currentItem.directVideoUrl || currentItem.videoInfo?.directVideoSrc) {
      const videoUrl = currentItem.directVideoUrl || currentItem.videoInfo.directVideoSrc

      const embed = new EmbedBuilder()
        .setTitle("🎬 Reproduciendo Video")
        .setDescription(`**${currentItem.title}**\n\n[🎥 Ver Video Directo](${videoUrl})`)
        .setColor("#00ff00")
        .setFooter({ text: "Video cargado directamente en Discord" })

      return interaction.reply({ embeds: [embed], ephemeral: true })
    } else {
      return interaction.reply({
        content: `🎬 **Ver Video**\n${currentItem.link}\n\n*Abre el enlace en tu navegador para ver el video*`,
        ephemeral: true,
      })
    }
  }
}

const apiManager = new APIManager()
const comicScraper = new ComicScraper()
const enhancedXXXSearch = new EnhancedXXXSearch()

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

const imageSearchCache = new Map()
const pendingXXXSearch = new Map()
const xxxSearchCache = new Map()
const pendingComicSearch = new Map()
const comicSearchCache = new Map()
const robloxSearchCache = new Map()
let savedGames = {}

async function isImageUrlValid(url) {
  try {
    const response = await axios.head(url, { timeout: 5000 })
    const contentType = response.headers["content-type"]
    return response.status === 200 && contentType && contentType.startsWith("image/")
  } catch {
    return false
  }
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

    const userInfoUrl = `https://users.roblox.com/v1/users/${playerId}`
    const userInfoResponse = await axios.get(userInfoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    playerData = userInfoResponse.data

    const avatarUrl = `https://thumbnails.roblox.com/v1/users/avatar?userIds=${playerId}&size=420x420&format=Png&isCircular=false`
    const avatarResponse = await axios.get(avatarUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    const avatarData = avatarResponse.data.data?.[0]

    return {
      id: playerData.id,
      name: playerData.name,
      displayName: playerData.displayName,
      description: playerData.description || "Sin descripción",
      created: playerData.created,
      isBanned: playerData.isBanned,
      avatar: avatarData?.imageUrl || `https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/420/420/Avatar/Png`,
      profileUrl: `https://www.roblox.com/users/${playerId}/profile`,
    }
  } catch (error) {
    console.error("Error buscando jugador de Roblox:", error)
    return null
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
    case "comicBack":
      return interaction.reply({ content: "🔙 Volviendo al menú principal.", ephemeral: true })
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
        const broadSearchUrl =
          `https://catalog.roblox.com/v1/search/items?category=Experiences&keyword=${encodeURIComponent(input)}&limit=10`
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
    )

    await message.channel.send({ embeds: [embed], components: [row1, row2] })
  } catch (error) {
    console.error("Error en búsqueda de Roblox:", error.message)
    return message.reply(`❌ Error al obtener información de Roblox: ${error.message}`)
  }
}

async function handleRobloxNavigation(interaction, action) {
  const userId = interaction.user.id
  const cache = robloxSearchCache.get(userId)

  if (interaction.replied || interaction.deferred) {
    return
  }

  if (!cache) {
    return interaction.reply({
      content: "❌ No hay datos de juego disponibles. Usa .roblox [juego] primero.",
      ephemeral: true,
    })
  }

  try {
    if (action === "searchPlayerRoblox") {
      await handlePlayerSearch(interaction, cache)
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
        )

        return interaction.editReply({ embeds: [embed], components: [row1, row2] })
      } catch (error) {
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
      )

      return interaction.update({ embeds: [embed], components: [row1, row2] })
    }
  } catch (error) {
    return interaction.reply({ content: "❌ Error procesando la acción. Intenta de nuevo.", ephemeral: true })
  }
}

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`)
})

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content) return

  if (message.content.startsWith(".")) {
    await handleCommands(message)
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
    console.error("Error en interactionCreate:", error)
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
  } else if (interaction.customId === "playerSearchModal") {
    const query = interaction.fields.getTextInputValue("playerSearchInput")
    await handlePlayerSearchResult(interaction, query)
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
      case "xxx":
        await handleAdultSearch(message, args)
        break
      case "cmx":
        await handleComicSearch(message, args)
        break
      case "roblox":
        await handleRobloxSearch(message, args)
        break
    }
  } catch (error) {
    console.error(`Error ejecutando comando: ${cmd}`, error)
    return message.reply(`❌ Error ejecutando el comando: ${error.message}`)
  }
}

async function handleSelectMenu(interaction) {
  const userId = interaction.user.id

  try {
    if (interaction.customId.startsWith("xxxsite-")) {
      await handleAdultSiteSelection(interaction)
    } else if (interaction.customId.startsWith("comicsite-")) {
      await handleComicSiteSelection(interaction)
    }
  } catch (error) {
    console.error("Error en handleSelectMenu:", error)
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

  await enhancedXXXSearch.handleEnhancedAdultSearch(interaction, selectedSite, query)
  pendingXXXSearch.delete(interaction.user.id)
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
    if (customId.startsWith("xxx")) {
      await handleAdultSearchNavigation(interaction, customId.split("-")[0])
    } else if (customId.startsWith("comic")) {
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
    } else if (customId.includes("Roblox")) {
      await handleRobloxNavigation(interaction, customId.split("-")[0])
    } else if (customId.startsWith("prevImage") || customId.startsWith("nextImage")) {
      await handleImageNavigation(interaction)
    }
  } catch (error) {
    console.error("Error en handleButtonInteraction:", error)
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
        console.error("Error obteniendo páginas del comic:", error)
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
          console.error("Error scraping comic:", error)
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

async function handleAdultSearchNavigation(interaction, action) {
  const userId = interaction.user.id
  if (!xxxSearchCache.has(userId)) {
    return interaction.reply({ content: "❌ No hay búsqueda activa para paginar.", ephemeral: true })
  }

  const data = xxxSearchCache.get(userId)
  const { items, currentIndex } = data

  if (action === "xxxwatch") {
    return await enhancedXXXSearch.handleVideoWatch(interaction, data)
  } else if (action === "xxxdirect") {
    const currentItem = items[currentIndex]
    return interaction.reply({
      content: `🔗 **Link Directo:**\n${currentItem.link}`,
      ephemeral: true,
    })
  }

  let newIndex = currentIndex
  if (action === "xxxnext" && currentIndex < items.length - 1) {
    newIndex++
  } else if (action === "xxxback" && currentIndex > 0) {
    newIndex--
  }

  data.currentIndex = newIndex
  xxxSearchCache.set(userId, data)

  const item = items[newIndex]
  const embed = await enhancedXXXSearch.createEnhancedAdultEmbed(item, newIndex, items.length)
  const buttons = enhancedXXXSearch.createEnhancedAdultButtons(userId, newIndex, items.length)

  await interaction.update({ embeds: [embed], components: buttons })
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

  const embed = new EmbedBuilder()
    .setTitle(`📷 Resultados para: ${cache.query}`)
    .setImage(img.link)
    .setDescription(`[Página donde está la imagen](${img.image.contextLink})`)
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

  const apiInfo = apiManager.getCurrentAPIInfo("google")
  if (apiInfo) {
    embed.setFooter({
      text: `Resultado ${index + 1} de ${total} | API: ${apiInfo.remaining}/${apiInfo.max}`,
    })
  }

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

  return new ActionRowBuilder().addComponents(backBtn, nextBtn)
}

async function handleWebSearch(message, args) {
  const query = args.join(" ")
  if (!query) return message.reply("⚠️ Debes escribir algo para buscar.")

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
      return message.reply("❌ No se encontraron imágenes válidas.")
    }

    let validIndex = -1
    for (let i = 0; i < items.length; i++) {
      if (await isImageUrlValid(items[i].link)) {
        validIndex = i
        break
      }
    }

    if (validIndex === -1) {
      return message.reply("❌ No se encontraron imágenes válidas.")
    }

    imageSearchCache.set(message.author.id, { items, index: validIndex, query })

    const embed = new EmbedBuilder()
      .setTitle(`📷 Resultados para: ${query}`)
      .setImage(items[validIndex].link)
      .setDescription(`[Página donde está la imagen](${items[validIndex].image.contextLink})`)
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
    console.error("Error en búsqueda de imágenes:", error.message)
    return message.reply(`❌ Error buscando imágenes: ${error.message}`)
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

client.login(process.env.DISCORD_TOKEN)