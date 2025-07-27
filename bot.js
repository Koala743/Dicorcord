const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const activeIASessions = new Map();
const SYSTEM_GOKI_INSTRUCTION =
  'Eres Goki, una mujer inteligente, amable y simpática. Explicas con claridad y buen humor.';

const GEMINI_API_KEY = 'AIzaSyBqPCfTlkpk4SQ_PeaRghav13hINXEetC4';

client.on('messageCreate', async (m) => {
  if (m.author.bot) return;
  const content = m.content.trim();

  if (content.toLowerCase() === '.ia') {
    if (activeIASessions.has(m.channel.id)) {
      const sess = activeIASessions.get(m.channel.id);
      if (sess.userId === m.author.id) {
        return m.reply('🟢 Ya tienes la IA activa.');
      } else {
        return m.reply('⚠️ Otro usuario ya tiene IA activa aquí.');
      }
    }
    activeIASessions.set(m.channel.id, {
      userId: m.author.id,
      history: [
        { role: 'system', content: SYSTEM_GOKI_INSTRUCTION },
        { role: 'assistant', content: '¡Hola! Soy Goki, lista para ayudarte.' },
      ],
    });
    return m.reply('🤖 Goki activada. Puedes hablar conmigo.');
  }

  if (content.toLowerCase() === '.finia') {
    const session = activeIASessions.get(m.channel.id);
    if (!session || session.userId !== m.author.id) {
      return m.reply('⚠️ No tienes sesión activa.');
    }
    activeIASessions.delete(m.channel.id);
    return m.reply('🛑 Sesión finalizada.');
  }

  const session = activeIASessions.get(m.channel.id);
  if (session && session.userId === m.author.id) {
    session.history.push({ role: 'user', content });

    const payload = {
      model: "gemini-2.0-flash",
      prompt: {
        messages: session.history.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
      },
      temperature: 0.7,
    };

    try {
      const resp = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateMessage?key=${GEMINI_API_KEY}`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );

      const aiText =
        resp.data?.candidates?.[0]?.message?.content ||
        'No entendí bien, ¿puedes repetir?';
      session.history.push({ role: 'assistant', content: aiText });
      m.reply(aiText);
    } catch (err) {
      console.error('Error Gemini 2.0:', err.response?.data || err.message);
      m.reply('❌ Error al conectar a Gemini 2.0‑Flash.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);