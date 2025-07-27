const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const activeIASessions = new Map();
const SYSTEM_INSTRUCTION = 'Eres Goki, una mujer inteligente, amable y simpática. Respondes con conocimiento, paciencia y buen humor.';

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyA0uaisYn1uS0Eb-18cdUNmdWDvYkWi260';

client.on('messageCreate', async (m) => {
  if (m.author.bot) return;

  const content = m.content.trim();

  if (content.toLowerCase() === '.ia') {
    if (activeIASessions.has(m.channel.id)) {
      const session = activeIASessions.get(m.channel.id);
      if (session.userId === m.author.id) {
        return m.reply('🟢 Ya estás hablando con Goki.');
      } else {
        return m.reply('⚠️ Otra persona está usando la IA en este canal.');
      }
    }

    activeIASessions.set(m.channel.id, {
      userId: m.author.id,
      history: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_INSTRUCTION }]
        }
      ]
    });

    return m.reply('🤖 ¡Hola! Soy Goki. ¿En qué te ayudo?');
  }

  if (content.toLowerCase() === '.finia') {
    const session = activeIASessions.get(m.channel.id);
    if (!session || session.userId !== m.author.id) {
      return m.reply('⚠️ No tienes una sesión activa.');
    }
    activeIASessions.delete(m.channel.id);
    return m.reply('🛑 Goki se desconectó.');
  }

  const session = activeIASessions.get(m.channel.id);
  if (session && session.userId === m.author.id) {
    session.history.push({
      role: 'user',
      parts: [{ text: content }]
    });

    try {
      const response = await axios.post(API_URL, {
        contents: session.history
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      const aiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No entendí eso.';
      session.history.push({
        role: 'model',
        parts: [{ text: aiText }]
      });

      m.reply(aiText);
    } catch (err) {
      console.error('Error IA:', err.response?.data || err.message);
      m.reply('❌ No se pudo conectar con la IA.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);