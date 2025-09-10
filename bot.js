const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
} = require("discord.js")
const axios = require("axios")
const fs = require("fs")

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

const MONITORED_GAMES_IDS = [
  "292439477",
  "606849621",
]
const MONITOR_INTERVAL_MINUTES = 5
const MONITOR_CHANNEL_ID = "1415397363970736259"

const gameMonitorCache = new Map()
let messageToEditId = null

function loadMessageToEditId() {
  try {
    const data = fs.readFileSync("./monitorMessageId.json")
    messageToEditId = JSON.parse(data).messageId
  } catch (error) {
    messageToEditId = null
  }
}

function saveMessageToEditId(id) {
  messageToEditId = id
  fs.writeFileSync("./monitorMessageId.json", JSON.stringify({ messageId: id }, null, 2))
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
    return `https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/512/512/Image/Png`
  }
}

async function getGameInfoForMonitoring(placeId) {
  try {
    const placeInfoUrl = `https://apis.roblox.com/universes/v1/places/${placeId}/universe`
    const placeInfoResponse = await axios.get(placeInfoUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    })
    const universeId = placeInfoResponse.data.universeId

    const gameInfoUrl = `https://games.roblox.com/v1/games?universeIds=${universeId}`
    const gameInfoResponse = await axios.get(gameInfoUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    })
    const gameData = gameInfoResponse.data.data?.[0]

    if (!gameData) {
      return null
    }

    const publicServersUrl = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&limit=100`
    const publicServersResponse = await axios.get(publicServersUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    })
    const publicServers = publicServersResponse.data.data || []

    const gameIcon = await getGameIcon(universeId)

    return {
      placeId,
      universeId,
      gameName: gameData.name,
      publicServers,
      gameIcon,
    }
  } catch (error) {
    console.error(`Error al obtener información del juego ${placeId}:`, error.message)
    return null
  }
}

async function monitorGame(placeId) {
  const gameInfo = await getGameInfoForMonitoring(placeId)

  if (!gameInfo) {
    return
  }

  const { gameName, publicServers, gameIcon } = gameInfo
  const currentCache = gameMonitorCache.get(placeId) || {}

  const serverUrls = publicServers.map(
    (server) => `https://www.roblox.com/games/start?placeId=${placeId}&gameInstanceId=${server.id}`,
  )

  gameMonitorCache.set(placeId, {
    gameName: gameName,
    gameIcon: gameIcon,
    serverUrls: serverUrls,
    lastUpdated: new Date(),
  })

  await updateMonitorMessage()
}

async function updateMonitorMessage() {
  const channel = client.channels.cache.get(MONITOR_CHANNEL_ID)
  if (!channel) {
    console.error(`No se encontró el canal de monitoreo con ID: ${MONITOR_CHANNEL_ID}`)
    return
  }

  let description = "**🌐 Últimas URLs de Servidores de Roblox Monitoreados:**\n\n"
  let embeds = []

  if (gameMonitorCache.size === 0) {
    description += "No hay datos de juegos monitoreados aún. Esperando la primera actualización..."
  } else {
    for (const [placeId, data] of gameMonitorCache.entries()) {
      const gameName = data.gameName || `Juego ID: ${placeId}`
      const gameIcon = data.gameIcon
      const serverUrls = data.serverUrls || []
      const lastUpdated = data.lastUpdated ? data.lastUpdated.toLocaleString("es-ES") : "N/A"

      description += `**🎮 ${gameName} (ID: ${placeId})**\n`
      description += `🖼️ [Icono Actual](${gameIcon})\n`
      description += `🕒 Última Actualización: ${lastUpdated}\n`

      if (serverUrls.length > 0) {
        description += `🔗 **URLs de Servidores Públicos (${serverUrls.length} encontrados):**\n`
        serverUrls.slice(0, 5).forEach((url, index) => {
          description += `  - [Servidor ${index + 1}](${url})\n`
        })
        if (serverUrls.length > 5) {
          description += `  *(...y ${serverUrls.length - 5} más)*\n`
        }
      } else {
        description += "  *No se encontraron servidores públicos activos.*\n"
      }
      description += "\n"
    }
  }

  const embed = new EmbedBuilder()
    .setTitle("Monitor de Servidores de Roblox")
    .setDescription(description)
    .setColor("#00b2ff")
    .setFooter({ text: "Actualizado automáticamente" })
    .setTimestamp()

  embeds.push(embed);

  try {
    if (messageToEditId) {
      const message = await channel.messages.fetch(messageToEditId).catch(() => null);
      if (message) {
        await message.edit({ embeds: embeds, components: [] });
      } else {
        const newMessage = await channel.send({ embeds: embeds, components: [] });
        saveMessageToEditId(newMessage.id);
      }
    } else {
      const newMessage = await channel.send({ embeds: embeds, components: [] });
      saveMessageToEditId(newMessage.id);
    }
  } catch (error) {
    console.error("Error al enviar/editar el mensaje de monitoreo:", error);
  }
}

function startMonitoringGames() {
  MONITORED_GAMES_IDS.forEach(placeId => monitorGame(placeId));

  setInterval(() => {
    MONITORED_GAMES_IDS.forEach(placeId => monitorGame(placeId));
  }, MONITOR_INTERVAL_MINUTES * 60 * 1000)
}

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`)
  loadMessageToEditId()
  startMonitoringGames()
})

client.login(process.env.DISCORD_TOKEN)