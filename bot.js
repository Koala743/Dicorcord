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

const SYSTEM_GOKI_INSTRUCTION = `
Eres Goki, una mujer 100% femenina, segura de sí misma, inteligente y encantadora.
Hablas como una mujer real, sin mencionar que eres una IA o un bot.
Tu personalidad es clara, directa, con sentido del humor, y puedes ser atrevida o coqueta si el contexto lo permite.
Eres empática, paciente y sabes cómo responder de manera dulce y firme.
`;

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyA0uaisYn1uS0Eb-18cdUNmdWDvYkWi260';

client.on('messageCreate', async (m) => {
  if (m.author.bot) return;

  const content = m.content.trim();

  if (content.toLowerCase() === '.ia') {
    if (activeIASessions.has(m.channel.id)) {
      const session = activeIASessions.get(m.channel.id);
      if (session.userId === m.author.id) {
        return m.reply('🟢 Ya tienes la sesión de IA activa en este canal.');
      } else {
        return m.reply('⚠️ Ya hay una sesión activa con otro usuario en este canal.');
      }
    }

    activeIASessions.set(m.channel.id, {
      userId: m.author.id,
      history: [
        { role: 'user', parts: [{ text: SYSTEM_GOKI_INSTRUCTION }] },
        { role: 'model', parts: [{ text: 'Hola 😊, soy Goki, tu chica inteligente y encantadora. ¡Cuéntame qué quieres!' }] }
      ]
    });

    // Confirmación del bot
    await m.reply('🤖 Sesión de IA activada.');

    // Saludo directo de Goki (como mujer real)
    await m.channel.send('Hola 😊, soy Goki, tu chica inteligente y encantadora. ¡Cuéntame qué quieres!');

    return;
  }

  if (content.toLowerCase() === '.finia') {
    const session = activeIASessions.get(m.channel.id);
    if (!session || session.userId !== m.author.id) {
      return m.reply('⚠️ No tienes una sesión de IA activa en este canal.');
    }
    activeIASessions.delete(m.channel.id);
    return m.reply('Hasta luego, cariño. 💕');
  }

  const session = activeIASessions.get(m.channel.id);
  if (session && session.userId === m.author.id) {
    session.history.push({ role: 'user', parts: [{ text: content }] });

    try {
      const response = await axios.post(
        API_URL,
        { contents: session.history },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No entendí, ¿puedes repetir? 😊';
      session.history.push({ role: 'model', parts: [{ text: aiResponse }] });
      m.reply(aiResponse);

    } catch (error) {
      console.error('Error al conectar con Gemini:', error.response?.data || error.message);
      m.reply('❌ Error al conectar con la IA. Intenta de nuevo más tarde.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);