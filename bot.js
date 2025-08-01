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
      lastReset: new Date().toDateString()
    },
    {
      id: "api_2", 
      apiKey: "AIzaSyCOY3_MeHHHLiOXq2tAUypm1aHbpkFwQ80",
      cx: "f21e2b3468dc449e2",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString()
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
      lastReset: new Date().toDateString()
    },
    {
      id: "api_4",
      apiKey: "TU_API_KEY_4_AQUI",
      cx: "TU_CX_4_AQUI", 
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString()
    },
    {
      id: "api_5",
      apiKey: "TU_API_KEY_5_AQUI",
      cx: "TU_CX_5_AQUI",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString()
    }
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
      lastReset: new Date().toDateString()
    },
    {
      id: "youtube_2", 
      apiKey: "TU_YOUTUBE_API_KEY_2",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 10000,
      lastReset: new Date().toDateString()
    }
    // Agrega más YouTube APIs aquí
  ]
}

// Sistema de gestión de APIs
class APIManager {
  constructor() {
    this.loadAPIStatus()
    this.resetDailyCounters()
  }

  // Obtener la próxima API disponible
  getNextAvailableAPI(type = 'google') {
    const apis = API_POOLS[type]
    if (!apis) return null

    // Buscar API activa y no agotada
    for (let api of apis) {
      if (api.active && !api.quotaExhausted && api.dailyRequests < api.maxDailyRequests) {
        return api
      }
    }

    // Si todas están agotadas, reiniciar contadores si es un nuevo día
    this.resetDailyCounters()
    
    // Intentar de nuevo después del reset
    for (let api of apis) {
      if (api.active && !api.quotaExhausted) {
        return api
      }
    }

    return null
  }

  // Marcar API como agotada
  markAPIAsExhausted(apiId, type = 'google') {
    const apis = API_POOLS[type]
    const api = apis.find(a => a.id === apiId)
    if (api) {
      api.quotaExhausted = true
      console.log(`⚠️ API ${apiId} marcada como agotada. Cambiando a la siguiente...`)
      this.saveAPIStatus()
    }
  }

  // Incrementar contador de requests
  incrementRequestCount(apiId, type = 'google') {
    const apis = API_POOLS[type]
    const api = apis.find(a => a.id === apiId)
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
    
    Object.keys(API_POOLS).forEach(type => {
      API_POOLS[type].forEach(api => {
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
      fs.writeFileSync('./apiStatus.json', JSON.stringify(API_POOLS, null, 2))
    } catch (error) {
      console.error('Error guardando estado de APIs:', error)
    }
  }

  // Cargar estado de APIs
  loadAPIStatus() {
    try {
      const data = fs.readFileSync('./apiStatus.json', 'utf8')
      const savedPools = JSON.parse(data)
      
      // Merge con la configuración actual
      Object.keys(savedPools).forEach(type => {
        if (API_POOLS[type]) {
          savedPools[type].forEach(savedApi => {
            const currentApi = API_POOLS[type].find(a => a.id === savedApi.id)
            if (currentApi) {
              currentApi.dailyRequests = savedApi.dailyRequests || 0
              currentApi.quotaExhausted = savedApi.quotaExhausted || false
              currentApi.lastReset = savedApi.lastReset || new Date().toDateString()
            }
          })
        }
      })
    } catch (error) {
      console.log('📝 Creando nuevo archivo de estado de APIs...')
      this.saveAPIStatus()
    }
  }

  // Obtener estadísticas de APIs
  getAPIStats(type = 'google') {
    const apis = API_POOLS[type]
    const active = apis.filter(a => a.active && !a.quotaExhausted).length
    const total = apis.length
    const totalRequests = apis.reduce((sum, api) => sum + api.dailyRequests, 0)
    
    return { active, total, totalRequests }
  }
}

// Inicializar el gestor de APIs
const apiManager = new APIManager()

// Función mejorada para hacer requests con rotación automática
async function makeGoogleAPIRequest(url, type = 'google') {
  let attempts = 0
  const maxAttempts = API_POOLS[type].length

  while (attempts < maxAttempts) {
    const api = apiManager.getNextAvailableAPI(type)
    
    if (!api) {
      throw new Error(`❌ Todas las APIs de ${type} están agotadas. Intenta mañana.`)
    }

    // Construir URL con la API actual
    const finalUrl = url.replace('GOOGLE_API_KEY', api.apiKey).replace('GOOGLE_CX', api.cx)
    
    try {
      console.log(`🔄 Usando API ${api.id} (Request #${api.dailyRequests + 1})`)
      
      const response = await axios.get(finalUrl)
      
      // Incrementar contador si la request fue exitosa
      apiManager.incrementRequestCount(api.id, type)
      
      return response
      
    } catch (error) {
      attempts++
      
      // Detectar si es error de cuota agotada
      if (error.response?.status === 429 || 
          error.response?.data?.error?.message?.includes('quota') ||
          error.response?.data?.error?.message?.includes('limit')) {
        
        console.log(`⚠️ Cuota agotada en API ${api.id}. Cambiando a la siguiente...`)
        apiManager.markAPIAsExhausted(api.id, type)
        continue
      }
      
      // Si es otro tipo de error, lanzarlo

