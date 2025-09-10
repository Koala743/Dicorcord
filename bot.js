const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const axios = require("axios");

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

async function getGameIcon(universeId) {
  try {
    const response = await axios.get(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );
    return (
      response.data.data?.[0]?.imageUrl ||
      `https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/512/512/Image/Png`
    );
  } catch (error) {
    console.error(`Error obteniendo icono del juego ${universeId}:`, error.message);
    return `https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/512/512/Image/Png`;
  }
}

async function getGameInfo(universeId) {
  try {
    const gameInfoUrl = `https://games.roblox.com/v1/games?universeIds=${universeId}`;
    const gameInfoResponse = await axios.get(gameInfoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    return gameInfoResponse.data.data?.[0] || null;
  } catch (error) {
    console.error(`Error obteniendo información del juego ${universeId}:`, error.message);
    return null;
  }
}

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content) return;

  if (message.content.toLowerCase() === ".roblox") {
    try {
      await message.channel.send("Cargando imágenes de los juegos monitoreados...");

      const embeds = [];
      for (const universeId of MONITORED_GAMES_IDS) {
        const gameInfo = await getGameInfo(universeId);
        const gameIcon = await getGameIcon(universeId);

        if (gameInfo) {
          const embed = new EmbedBuilder()
            .setTitle(`🎮 ${gameInfo.name}`)
            .setImage(gameIcon)
            .setColor("#00b2ff")
            .setFooter({ text: `Universe ID: ${universeId}` })
            .setTimestamp();
          embeds.push(embed);
        } else {
          const embed = new EmbedBuilder()
            .setTitle(`🎮 Juego Desconocido (ID: ${universeId})`)
            .setImage(gameIcon)
            .setColor("#FF0000")
            .setFooter({ text: `Universe ID: ${universeId}` })
            .setTimestamp();
          embeds.push(embed);
        }
      }

      if (embeds.length > 0) {
        await message.channel.send({ embeds: embeds });
      } else {
        await message.channel.send("❌ No se pudieron obtener imágenes para ningún juego monitoreado.");
      }
    } catch (error) {
      console.error("Error en el comando .roblox:", error);
      await message.channel.send("❌ Ocurrió un error al procesar el comando.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
