const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const MONITORED_GAMES_IDS = [
  "11063612131",
  "109983668079237",
  "3101667897",
  "3623096087",
  "99567941238278",
  "128696516339161",
];
const MONITOR_INTERVAL_MINUTES = 5;

const gameMonitorCache = new Map();

async function getGameIcon(universeId) {
  try {
    const response = await axios.get(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`,
      {
        headers: {
          "User -Agent": "Mozilla/5.0",
        },
      }
    );
    return response.data.data?.[0]?.imageUrl || "https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/512/512/Image/Png";
  } catch {
    return "https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/512/512/Image/Png";
  }
}

async function getGameInfoForMonitoring(placeId) {
  try {
    const placeInfoUrl = `https://apis.roblox.com/universes/v1/places/${placeId}/universe`;
    const placeInfoResponse = await axios.get(placeInfoUrl, {
      headers: { "User -Agent": "Mozilla/5.0" },
    });
    const universeId = placeInfoResponse.data.universeId;

    const gameInfoUrl = `https://games.roblox.com/v1/games?universeIds=${universeId}`;
    const gameInfoResponse = await axios.get(gameInfoUrl, {
      headers: { "User -Agent": "Mozilla/5.0" },
    });
    const gameData = gameInfoResponse.data.data?.[0];
    if (!gameData) return null;

    const publicServersUrl = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&limit=100`;
    const publicServersResponse = await axios.get(publicServersUrl, {
      headers: { "User -Agent": "Mozilla/5.0" },
    });
    const publicServers = publicServersResponse.data.data || [];

    const gameIcon = await getGameIcon(universeId);

    return {
      placeId,
      universeId,
      gameName: gameData.name,
      publicServers,
      gameIcon,
    };
  } catch {
    return null;
  }
}

async function monitorGame(placeId) {
  const gameInfo = await getGameInfoForMonitoring(placeId);
  if (!gameInfo) return;

  const { gameName, publicServers, gameIcon } = gameInfo;

  const serverUrls = publicServers.map(
    (server) => `https://www.roblox.com/games/start?placeId=${placeId}&gameInstanceId=${server.id}`
  );

  gameMonitorCache.set(placeId, {
    gameName,
    gameIcon,
    serverUrls,
    lastUpdated: new Date(),
  });
}

async function updateAllGames() {
  for (const placeId of MONITORED_GAMES_IDS) {
    await monitorGame(placeId);
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.toLowerCase().startsWith(".url")) return;

  if (gameMonitorCache.size === 0) {
    await message.channel.send("No hay datos de juegos monitoreados aún. Por favor espera la próxima actualización.");
    return;
  }

  let reply = "**🌐 Últimas URLs de los juegos monitoreados:**\n\n";

  for (const [placeId, data] of gameMonitorCache.entries()) {
    const gameName = data.gameName || `Juego ID: ${placeId}`;
    const serverUrls = data.serverUrls || [];

    reply += `**🎮 ${gameName} (ID: ${placeId})**\n`;

    if (serverUrls.length > 0) {
      serverUrls.slice(0, 5).forEach((url, index) => {
        reply += `  - [Servidor ${index + 1}](${url})\n`;
      });
      if (serverUrls.length > 5) {
        reply += `  *(...y ${serverUrls.length - 5} más)*\n`;
      }
    } else {
      reply += "  *No se encontraron servidores públicos activos.*\n";
    }
    reply += "\n";
  }

  await message.channel.send({ content: reply });
});

client.once("ready", async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  await updateAllGames();
  setInterval(updateAllGames, MONITOR_INTERVAL_MINUTES * 60 * 1000);
});

client.login(process.env.DISCORD_TOKEN);
