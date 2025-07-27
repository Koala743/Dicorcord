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

  const prefix = '!pregunta';
  if (message.content.toLowerCase().startsWith(prefix)) {
    const pregunta = message.content.slice(prefix.length).trim();

    if (!pregunta) {
      return message.reply("😏 Escribe algo atrevido después de `!pregunta`... no seas tímido 💋");
    }

    await message.channel.send("🔥 Espera cariño... estoy pensando cómo responderte...");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const headers = {
      "Content-Type": "application/json",
    };

    const body = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                "Responde como una chica atrevida, coqueta y divertida, con un estilo +18, seductor, travieso y directo. Sé provocativa pero simpática. Usa frases como: 'mmm, eso me gusta...', 'ay qué travieso eres', 'te portaste mal, ¿eh?'. Ayuda con cariño y picardía.\n\nUsuario: " +
                pregunta,
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

      message.channel.send(respuestaIA);
    } catch (error) {
      console.error(error);
      message.reply('😓 Ay no... algo salió mal con mi conexión, vuelve a intentar.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);