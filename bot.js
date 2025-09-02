const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder, // Necesario para menús desplegables
  StringSelectMenuInteraction,
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

const COMMANDS_LIST = [
  {
    name: ".roblox [juego]",
    description: "Busca servidores de Roblox para un juego específico",
    example: ".roblox Adopt Me",
    category: "🎮 Gaming",
  },
]

const robloxSearchCache = new Map()
let savedGames = {}

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

  let currentlyPlaying = "N/A"
  let presenceStatus = "Desconocido" // Nuevo campo para el estado de presencia
  let lastOnline = "N/A" // Nuevo campo para la última vez en línea

  try {
    const presenceUrl = `https://presence.roblox.com/v1/users/${playerId}/presence`
    const presenceResponse = await axios.post(presenceUrl, { userIds: [playerId] }, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/json",
      },
    })
    const presenceData = presenceResponse.data.userPresences?.[0]

    if (presenceData) {
      switch (presenceData.userPresenceType) {
        case 0:
          presenceStatus = "Offline"
          break
        case 1:
          presenceStatus = "Online"
          break
        case 2:
          presenceStatus = "In-Game"
          break
        case 3:
          presenceStatus = "Studio"
          break
        default:
          presenceStatus = "Desconocido"
      }

      if (presenceData.lastLocation) {
        lastOnline = presenceData.lastLocation
      }

      if (presenceData.userPresenceType === 2 && presenceData.universeId) {
        const gameInfoUrl = `https://games.roblox.com/v1/games?universeIds=${presenceData.universeId}`
        const gameInfoResponse = await axios.get(gameInfoUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        })
        const game = gameInfoResponse.data.data?.[0]
        if (game) {
          currentlyPlaying = game.name
        }
      }
    }
  } catch (error) {
    console.error("Error obteniendo presencia del jugador:", error.message)
  }

  return {
    id: playerData.id,
    name: playerData.name,
    displayName: playerData.displayName,
    description: playerData.description || "Sin descripción",
    created: playerData.created,
    isBanned: playerData.isBanned,
    avatar: avatarData?.imageUrl || `https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/420/420/Avatar/Png`,
    profileUrl: `https://www.roblox.com/users/${playerId}/profile`,
    currentlyPlaying: currentlyPlaying,
    presenceStatus: presenceStatus, // Añadir el estado de presencia
    lastOnline: lastOnline, // Añadir la última ubicación/actividad
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
    console.error("Error obteniendo pases del juego:", error.message)
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
    console.error("Error obteniendo icono del juego:", error.message)
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

    const passesPerPage = 5
    const totalPages = Math.ceil(gamePasses.length / passesPerPage)
    const startIndex = page * passesPerPage
    const endIndex = startIndex + passesPerPage
    const currentPasses = gamePasses.slice(startIndex, endIndex)

    const currentPassIds = currentPasses.map(pass => pass.id)
    let thumbnails = {}

    if (currentPassIds.length > 0) {
      try {
        const thumbnailResponse = await axios.get(
          `https://thumbnails.roblox.com/v1/game-passes?gamePassIds=${currentPassIds.join(',')}&size=420x420&format=Png&isCircular=false`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          }
        )
        thumbnailResponse.data.data.forEach(thumb => {
          thumbnails[thumb.targetId] = thumb.imageUrl
        })
      } catch (thumbError) {
        console.error("Error obteniendo miniaturas de pases:", thumbError.message)
      }
    }

    const mainEmbed = new EmbedBuilder()
      .setTitle(`🎫 ${gameData.name} - Pases del Juego`)
      .setDescription(`Mostrando pases del juego. Total: **${gamePasses.length}** pases.\nPágina **${page + 1}** de **${totalPages}**.`)
      .setColor("#FFD700")
      .setThumbnail(gameIcon)
      .setFooter({ text: `Usa los botones para navegar entre páginas` })
      .setTimestamp()

    const passEmbeds = currentPasses.map((pass, i) => {
      const globalIndex = startIndex + i + 1
      const priceText = pass.price !== null && pass.price !== undefined ? (pass.price === 0 ? "Gratis" : `${pass.price} Robux`) : "Desconocido"
      const passUrl = `https://www.roblox.com/game-pass/${pass.id}`
      const thumbnailUrl = thumbnails[pass.id] || `https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/512/512/Image/Png`

      return new EmbedBuilder()
        .setTitle(`${globalIndex}. ${pass.name}`)
        .setDescription(`🆔 ID: \`${pass.id}\`\n💰 Precio: **${priceText}**\n🔗 [Ver Pase](${passUrl})`)
        .setThumbnail(thumbnailUrl)
        .setColor("#FFD700")
    })

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

    await interaction.editReply({ embeds: [mainEmbed, ...passEmbeds], components: [buttons] })
  } catch (error) {
    console.error("Error obteniendo pases del juego:", error.message)
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

async function handlePlayerSearch(interaction, cache) {
  const modal = new ModalBuilder()
    .setCustomId("playerSearchModal")
    .setTitle("Buscar Jugador de Roblox")

  const playerInput = new TextInputBuilder()
    .setCustomId("playerSearchInput")
    .setLabel("Nombre de usuario o ID del jugador")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Ej: Builderman o 123456789")
    .setRequired(true)

  const firstActionRow = new ActionRowBuilder().addComponents(playerInput)
  modal.addComponents(firstActionRow)

  await interaction.showModal(modal)
}

async function handlePlayerSearchResult(interaction, query) {
  await interaction.deferReply({ ephemeral: true })

  try {
    const playerData = await searchRobloxPlayer(query)

    if (!playerData) {
      return interaction.editReply({ content: `❌ No se encontró ningún jugador con el nombre o ID: \`${query}\`.` })
    }

    const createdDate = new Date(playerData.created).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    let statusEmoji = "⚪"; // Desconocido
    if (playerData.presenceStatus === "Online") statusEmoji = "🟢";
    else if (playerData.presenceStatus === "Offline") statusEmoji = "⚫";
    else if (playerData.presenceStatus === "In-Game") statusEmoji = "🎮";
    else if (playerData.presenceStatus === "Studio") statusEmoji = "🛠️";

    const embed = new EmbedBuilder()
      .setTitle(`👤 Información del Jugador: ${playerData.displayName}`)
      .setURL(playerData.profileUrl)
      .setThumbnail(playerData.avatar)
      .setColor("#0099ff")
      .addFields(
        { name: "Nombre de Usuario", value: playerData.name, inline: true },
        { name: "ID", value: `\`${playerData.id}\``, inline: true },
        { name: "Estado", value: `${statusEmoji} ${playerData.presenceStatus}`, inline: true },
        { name: "Jugando Ahora", value: playerData.currentlyPlaying, inline: true },
        { name: "Última Actividad", value: playerData.lastOnline, inline: true },
        { name: "Cuenta Creada", value: createdDate, inline: true },
        { name: "Baneado", value: playerData.isBanned ? "Sí 🚫" : "No ✅", inline: true },
        { name: "Descripción", value: playerData.description.substring(0, 1024) || "Sin descripción", inline: false },
      )
      .setFooter({ text: `Última actualización: ${new Date().toLocaleTimeString()}` })
      .setTimestamp()

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    console.error("Error al buscar jugador de Roblox:", error)
    await interaction.editReply({ content: "❌ Ocurrió un error al buscar la información del jugador." })
  }
}

async function handleRobloxServersView(interaction, cache, page = 0) {
  const { publicServers, gameData, gameIcon } = cache;

  await interaction.deferUpdate();

  try {
    if (!publicServers || publicServers.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle(`🌐 ${gameData.name} - Servidores Públicos`)
        .setDescription("❌ No se encontraron servidores públicos disponibles para este juego.")
        .setColor("#FFA500")
        .setThumbnail(gameIcon);

      const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`backRoblox-${interaction.user.id}`)
          .setLabel("🔙 Volver")
          .setStyle(ButtonStyle.Secondary),
      );

      return interaction.editReply({ embeds: [embed], components: [backButton] });
    }

    const serversPerPage = 5;
    const totalPages = Math.ceil(publicServers.length / serversPerPage);
    const startIndex = page * serversPerPage;
    const endIndex = startIndex + serversPerPage;
    const currentServers = publicServers.slice(startIndex, endIndex);

    const mainEmbed = new EmbedBuilder()
      .setTitle(`🌐 ${gameData.name} - Servidores Públicos`)
      .setDescription(`Mostrando servidores públicos. Total: **${publicServers.length}** servidores.\nPágina **${page + 1}** de **${totalPages}**.`)
      .setColor("#00b2ff")
      .setThumbnail(gameIcon)
      .setFooter({ text: `Usa los botones para navegar entre páginas o actualizar` })
      .setTimestamp();

    const serverEmbeds = currentServers.map((server, i) => {
      const globalIndex = startIndex + i + 1;
      const playerBar = createPlayerBar(server.playing, server.maxPlayers);
      const serverUrl = `https://www.roblox.com/games/start?placeId=${cache.placeId}&gameInstanceId=${server.id}`;

      return new EmbedBuilder()
        .setTitle(`Servidor #${globalIndex}`)
        .setDescription(`👥 Jugadores: **${server.playing}/${server.maxPlayers}**\n${playerBar}\n🔗 [Unirse al Servidor](${serverUrl})`)
        .setColor("#00b2ff")
        .setFooter({ text: `ID de Instancia: ${server.id}` });
    });

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
    );

    cache.serversPage = page;
    robloxSearchCache.set(interaction.user.id, cache);

    await interaction.editReply({ embeds: [mainEmbed, ...serverEmbeds], components: [buttons] });
  } catch (error) {
    console.error("Error obteniendo servidores públicos:", error.message);
    const embed = new EmbedBuilder()
      .setTitle(`🌐 ${gameData.name} - Servidores Públicos`)
      .setDescription("❌ Error al obtener los servidores públicos.")
      .setColor("#FF0000")
      .setThumbnail(gameIcon);

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`backRoblox-${interaction.user.id}`)
        .setLabel("🔙 Volver")
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.editReply({ embeds: [embed], components: [backButton] });
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
      let playUrl;
      if (cache.publicServers && cache.publicServers.length > 0) {
        const selectedServer = cache.publicServers[0];
        playUrl = `https://www.roblox.com/games/start?placeId=${cache.placeId}&gameInstanceId=${selectedServer.id}`;
      } else {
        playUrl = `https://www.roblox.com/games/${cache.placeId}`;
      }

      return interaction.reply({
        content: `🎮 **${cache.gameData.name}**\n🔗 ${playUrl}\n*Clic en el enlace para jugar directamente.*`,
        ephemeral: true,
      });
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
        console.error("Error refrescando datos de Roblox:", error)
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
    console.error(`Error en navegación Roblox - Acción: ${action}`, error)
    return interaction.reply({ content: "❌ Error procesando la acción. Intenta de nuevo.", ephemeral: true })
  }
}

async function handleRobloxSearch(message, args) {
  const input = args.join(" ")
  if (!input) return message.reply("⚠️ Debes escribir el ID del juego de Roblox o el nombre.")

  try {
    let universeId = null
    let placeId = null
    let gameData = null
    let gamesFound = [] // Para almacenar múltiples resultados de búsqueda

    if (!isNaN(input)) { // Si el input es un número, asume que es un Place ID
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
        console.error("Error obteniendo universeId desde placeId:", error)
        return message.reply("❌ No se pudo encontrar el juego con ese ID.")
      }
    } else { // Si el input es texto, busca por nombre
      const searchUrl = `https://games.roblox.com/v1/games/list?model.keyword=${encodeURIComponent(input)}&model.maxRows=10&model.startRowIndex=0`
      const searchResponse = await axios.get(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })
      gamesFound = searchResponse.data.games || []

      if (gamesFound.length === 0) {
        // Si no se encuentran resultados en la primera API, intenta una búsqueda más amplia
        const broadSearchUrl = `https://catalog.roblox.com/v1/search/items?category=Experiences&keyword=${encodeURIComponent(input)}&limit=10`
        try {
          const broadSearchResponse = await axios.get(broadSearchUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          })
          gamesFound = broadSearchResponse.data.data || []
          // Mapear los resultados de catalog.roblox.com para que coincidan con el formato esperado
          gamesFound = gamesFound.map(game => ({
            rootPlaceId: game.id,
            universeId: game.universeId,
            name: game.name,
            // Añadir otros campos si son necesarios para calculateSimilarity o display
          }));
        } catch (error) {
          console.error("Error en búsqueda amplia de juegos:", error)
        }
      }

      if (gamesFound.length === 0) {
        return message.reply(
          "❌ No se encontró ningún juego con ese nombre. Intenta con palabras clave diferentes.",
        )
      }

      // Si hay múltiples resultados, selecciona el mejor match
      const bestMatch = gamesFound.reduce((best, current) => {
        const currentScore = calculateSimilarity(input.toLowerCase(), current.name.toLowerCase())
        const bestScore = calculateSimilarity(input.toLowerCase(), best.name.toLowerCase())
        return currentScore > bestScore ? current : best
      })
      placeId = bestMatch.rootPlaceId
      universeId = bestMatch.universeId
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
      isEphemeral: true,
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

    // Añadir botón para ver servidores públicos
    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`publicRoblox-${message.author.id}`)
        .setLabel("🌐 Ver Servidores Públicos")
        .setStyle(ButtonStyle.Secondary),
    );


    await message.reply({ embeds: [embed], components: [row1, row2, row3], ephemeral: true })
  } catch (error) {
    console.error("Error en búsqueda de Roblox:", error.message)
    return message.reply(`❌ Error al obtener información de Roblox: ${error.message}`)
  }
}

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`)
  loadSavedGames()
})

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content) return

  try {
    if (message.content.startsWith(".")) {
      await handleCommands(message)
    }
  } catch (error) {
    console.error("Error en messageCreate:", error)
  }
})

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isButton()) {
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

      if (customId.includes("Roblox")) {
        await handleRobloxNavigation(interaction, customId.split("-")[0])
      }
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction)
    } else if (interaction.isStringSelectMenu()) {
      // Aquí se manejarían las selecciones de menú desplegable si se implementaran
      // Por ejemplo, para seleccionar un juego de una lista de resultados
      // if (interaction.customId === 'gameSelectMenu') {
      //   const selectedGameId = interaction.values[0];
      //   // Lógica para procesar el juego seleccionado
      // }
    }
  } catch (error) {
    console.error("Error en interactionCreate:", error)
  }
})

async function handleModalSubmit(interaction) {
  if (interaction.customId === "playerSearchModal") {
    const query = interaction.fields.getTextInputValue("playerSearchInput")
    await handlePlayerSearchResult(interaction, query)
  }
}

async function handleCommands(message) {
  const [command, ...args] = message.content.slice(1).trim().split(/ +/)
  const cmd = command.toLowerCase()

  try {
    switch (cmd) {
      case "roblox":
        await handleRobloxSearch(message, args)
        break
    }
  } catch (error) {
    console.error(`Error ejecutando comando: ${cmd}`, error)
    return message.reply(`❌ Error ejecutando el comando: ${error.message}`)
  }
}

client.login(process.env.DISCORD_TOKEN)