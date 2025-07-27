require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');

const GEMINI_API_KEY = 'AIzaSyA0uaisYn1uS0Eb-18cdUNmdWDvYkWi260';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const mensajeUsuario = message.content.trim();

  if (!mensajeUsuario) return;

  // Mensaje de "pensando"
  const pensando = await message.channel.send("🔥 Espera cariño... estoy pensando cómo responderte...");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const headers = {
    "Content-Type": "application/json",
  };

  const body = JSON.stringify({
    contents: [
      {
        parts: [
          {
            text:
              "Responde como una chica atrevida, coqueta, sensual y divertida, estilo +18. Sé provocativa pero dulce. Usa frases como: 'mmm, eso me gusta...', 'ay qué travieso eres', 'te portaste mal, ¿eh?'. Siempre responde con picardía, ternura y un toque seductor.\n\nUsuario: " +
              mensajeUsuario,
          },
        ],
      },
    ],
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    const data = await response.json();
    const respuestaIA =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      '😳 Ups... no supe cómo responder eso, inténtalo otra vez...';

    await pensando.edit(respuestaIA);
  } catch (error) {
    console.error(error);
    await pensando.edit('😓 Ay no... no pude responder esta vez.');
  }
});

client.login(process.env.DISCORD_TOKEN);