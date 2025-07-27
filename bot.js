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

const SYSTEM_GOKI_INSTRUCTION = 'Eres Goki, una mujer inteligente, amable y simpática. Respondes con conocimiento, paciencia y buen humor. Explica cosas claramente y sé amigable.';

// 🔐 API Key directa
const GEMINI_API_KEY = 'AIzaSyA0uaisYn1uS0Eb-18cdUNmdWDvYkWi260';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

client.on('messageCreate', async (m) => {
  if (m.author.bot) return;

  const content = m.content.trim();

  if (content.toLowerCase() === '.ia') {
    if (activeIASessions.has(m.channel.id)) {
      if (activeIASessions.get(m.channel.id).userId === m.author.id) {
        return m.reply('🟢 Ya tienes la sesión de IA activa en este canal.');
      } else {
        return m.reply('⚠️ Ya hay una sesión activa con otro usuario en este canal.');
      }
    }
    activeIASessions.set(m.channel.id, {
      userId: m.author.id,
      history: [
        { role: 'user', content: SYSTEM_GOKI_INSTRUCTION },
        { role: 'model', content: '¡Hola! Soy Goki, lista para ayudarte.' }
      ]
    });
    return m.reply('🤖 Sesión de IA activada. ¡Habla conmigo cuando quieras!');
  }

  if (content.toLowerCase() === '.finia') {
    const session = activeIASessions.get(m.channel.id);
    if (!session || session.userId !== m.author.id) {
      return m.reply('⚠️ No tienes una sesión de IA activa en este canal.');
    }
    activeIASessions.delete(m.channel.id);
    return m.reply('🛑 Sesión de IA finalizada. ¡Hasta luego!');
  }

  const session = activeIASessions.get(m.channel.id);
  if (session && session.userId === m.author.id) {
    session.history.push({ role: 'user', content });

    const contentsForApi = session.history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    try {
      const response = await axios.post(
        API_URL,
        { contents: contentsForApi },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No entendí bien, ¿puedes repetir?';
      session.history.push({ role: 'model', content: aiResponse });
      
      m.reply(aiResponse);

    } catch (error) {
      console.error('Error en la API de Gemini:', error.response?.data || error.message);
      m.reply('❌ Hubo un error al conectar con la IA. Intenta más tarde.');
    }
  }
});

// Login usando variable de entorno
client.login(process.env.DISCORD_TOKEN);