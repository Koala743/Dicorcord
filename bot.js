const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const GEMINI_API_KEY = 'AIzaSyBqPCfTlkpk4SQ_PeaRghav13hINXEetC4';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const activeIASessions = new Map();
const SYSTEM_GOKI_INSTRUCTION = 'Eres Goki, una mujer inteligente, amable y simpática. Explicas con claridad y buen humor.';

client.on('messageCreate', async (m) => {
  if (m.author.bot) return;
  const content = m.content.trim();

  if (content.toLowerCase() === '.ia') {
    if (activeIASessions.has(m.channel.id)) {
      const sess = activeIASessions.get(m.channel.id);
      if (sess.userId === m.author.id) {
        return m.reply('🟢 ¡Ya tienes la IA de Goki activa en este canal!');
      } else {
        return m.reply('⚠️ Otro usuario ya tiene la IA activa aquí. Por favor, espera tu turno o pide que la finalice.');
      }
    }
    activeIASessions.set(m.channel.id, {
      userId: m.author.id,
      history: [
        { role: 'user', parts: [{ text: SYSTEM_GOKI_INSTRUCTION }] },
        { role: 'model', parts: [{ text: '¡Hola! Soy Goki, lista para ayudarte. ¿En qué puedo asistirte hoy?' }] },
      ],
    });
    return m.reply('🤖 ¡Goki activada! Ahora puedes hablar conmigo. Usa `.finia` para terminar.');
  }

  if (content.toLowerCase() === '.finia') {
    const session = activeIASessions.get(m.channel.id);
    if (!session || session.userId !== m.author.id) {
      return m.reply('⚠️ No tienes una sesión de Goki activa en este canal.');
    }
    activeIASessions.delete(m.channel.id);
    return m.reply('🛑 Sesión con Goki finalizada. ¡Hasta pronto!');
  }

  const session = activeIASessions.get(m.channel.id);
  if (session && session.userId === m.author.id) {
    session.history.push({ role: 'user', parts: [{ text: content }] });
    const contentsForApi = session.history;

    try {
      const resp = await axios.post(API_URL, { contents: contentsForApi }, {
        headers: { 'Content-Type': 'application/json' },
      });

      const aiText =
        resp.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Ups, no entendí bien, ¿podrías repetirlo con otras palabras?';

      session.history.push({ role: 'model', parts: [{ text: aiText }] });
      m.reply(aiText);
    } catch (err) {
      console.error('Error al conectar con Gemini 1.5 Flash:');
      if (err.response) {
        console.error('Datos del error:', err.response.data);
        console.error('Código de estado:', err.response.status);
        m.reply(`❌ ¡Uy! Hubo un problema al hablar con Goki. Código de error: \`${err.response.status}\`. Revisa la consola para más detalles.`);
      } else if (err.request) {
        console.error('No se recibió respuesta del servidor:', err.request);
        m.reply('❌ ¡Goki no me responde! Parece que hay un problema de conexión. ¿Está bien mi internet?');
      } else {
        console.error('Error al configurar la solicitud:', err.message);
        m.reply(`❌ Hubo un error inesperado al intentar conectar con Goki: \`${err.message}\`.`);
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);