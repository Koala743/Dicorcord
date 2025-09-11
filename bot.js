const { Client, GatewayIntentBits } = require("discord.js")
const axios = require("axios")

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
})

const MONITORED_GAMES_IDS = [
  "11063612131",
  "109983668079237",
  "3101667897",
  "3623096087",
  "99567941238278",
  "128696516339161",
]

const MONITOR_CHANNEL_ID = "1415397363970736259"
const MONITOR_INTERVAL_MINUTES = 5

async function getGameIconUrl(placeId) {
  try {
    // Obtener universeId desde placeId
    const placeInfo = await axios.get(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`)
    const universeId = placeInfo.data.universeId

    // Obtener icono del juego
    const iconResponse = await axios.get(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png&isCircular=false`
    )
    const iconUrl = iconResponse.data.data?.[0]?.imageUrl
    return iconUrl || null
  } catch (error) {
    console.error(`Error obteniendo icono para placeId ${placeId}:`, error.message)
    return null
  }
}

async function sendGameIcons() {
  const channel = client.channels.cache.get(MONITOR_CHANNEL_ID)
  if (!channel) {
    console.error("No se encontró el canal de monitoreo")
    return
  }

  let messageContent = "**URLs de imágenes de juegos Roblox:**\n\n"

  for (const placeId of MONITORED_GAMES_IDS) {
    const iconUrl = await getGameIconUrl(placeId)
    if (iconUrl) {
      messageContent += `${iconUrl}\n`
    } else {
      messageContent += `No se pudo obtener imagen para juego ID ${placeId}\n`
    }
  }

  try {
    await channel.send(messageContent)
  } catch (error) {
    console.error("Error enviando mensaje:", error)
  }
}

client.once("ready", () => {
  console.log(`Bot listo como ${client.user.tag}`)
  sendGameIcons()
  setInterval(sendGameIcons, MONITOR_INTERVAL_MINUTES * 60 * 1000)
})

client.login(process.env.DISCORD)
