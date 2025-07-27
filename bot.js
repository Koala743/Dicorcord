const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');

// API Key de Gemini (¡incrustada directamente aquí!)
const GEMINI_API_KEY = 'AIzaSyA0uaisYn1uS0Eb-18cdUNmdWDvYkWi260';
const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // La de Discord puede seguir viniendo de .env

if (!GEMINI_API_KEY) {
  console.error('❌ Falta la clave de Gemini.');
  process.exit(1);
}
if (!DISCORD_TOKEN) {
  console.error('❌ Falta el token de Discord.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', () => {
  console.log(`🤖 Bot activo como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userMessage = message.content.trim();
  if (!userMessage) return;

  const thinking = await message.channel.send("🤔 Pensando...");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const headers = {
    "Content-Type": "application/json",
  };

  const body = JSON.stringify({
    contents: [
      {
        parts: [
          {
            text: "Eres una inteligencia artificial útil, clara y educada. Responde de forma informativa, útil y precisa. Te llamas AsistenteIA.\n\nUsuario: " + userMessage,
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

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error en la API de Gemini:', response.status, errorData);
      await thinking.edit(`⚠️ Error: ${response.status} - ${errorData?.error?.message || 'Error desconocido'}`);
      return;
    }

    const data = await response.json();
    const respuestaIA = data?.candidates?.[0]?.content?.parts?.[0]?.text || "❓ No logré entender tu pregunta.";

    await thinking.edit(respuestaIA);
  } catch (error) {
    console.error("Error al comunicar con Gemini:", error);
    await thinking.edit("⚠️ Ocurrió un error al procesar tu pregunta.");
  }
});

client.login(DISCORD_TOKEN);