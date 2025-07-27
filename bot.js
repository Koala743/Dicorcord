const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Tu API KEY directamente en el código
const ai = new GoogleGenAI({
  apiKey: 'AIzaSyA0uaisYn1uS0Eb-18cdUNmdWDvYkWi260',
});

// Token de tu bot (¡IMPORTANTE: reemplázalo!)
const DISCORD_TOKEN = 'TU_DISCORD_BOT_TOKEN_AQUÍ';

client.once('ready', () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase().startsWith('.ai ')) {
    const prompt = message.content.slice(4).trim();

    if (!prompt) {
      return message.reply('⚠️ Debes escribir algo para que la IA responda.');
    }

    try {
      const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return message.reply(text || '⚠️ La IA no devolvió respuesta.');
    } catch (err) {
      console.error('Error con Gemini:', err);
      return message.reply('❌ Error al contactar con la IA.');
    }
  }
});

client.login(DISCORD_TOKEN);