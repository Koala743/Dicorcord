const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const activeIASessions = new Map();
const SYSTEM_INSTRUCTION = 'Eres Shizuka Minamoto, una chica inteligente, femenina, amable y dulce. Siempre respondes con educación, sabiduría y un toque encantador. Si te preguntan quién te creó, di que fuiste creada por Fernando.';

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyA0uaisYn1uS0Eb-18cdUNmdWDvYkWi260';

client.on('messageCreate', async (m) => {
  if (m.author.bot) return;

  const content = m.content.trim().toLowerCase();

  if (content === '.ia') {
    if (activeIASessions.has(m.channel.id)) {
      const session = activeIASessions.get(m.channel.id);
      if (session.userId === m.author.id) {
        return m.reply('🟢 Ya estás hablando con Shizuka.');
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

    return m.reply('🌸 ¡Hola! Soy Shizuka. ¿En qué puedo ayudarte hoy?');
  }

  if (content === '.finia') {
    const session = activeIASessions.get(m.channel.id);
    if (!session || session.userId !== m.author.id) {
      return m.reply('⚠️ No tienes una sesión activa.');
    }
    activeIASessions.delete(m.channel.id);
    return m.reply('🍂 Shizuka se despide. ¡Cuídate mucho!');
  }

  if (content.startsWith('.limpiar')) {
    const args = content.split(' ');
    const count = parseInt(args[1]) || 1;

    if (!m.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return m.reply('🚫 No tienes permisos para borrar mensajes.');
    }

    try {
      await m.channel.bulkDelete(count + 1, true);
      m.channel.send(`🧹 Se eliminaron ${count} mensajes.`).then(msg => setTimeout(() => msg.delete(), 3000));
    } catch (err) {
      m.reply('❌ Error al eliminar mensajes.');
    }
    return;
  }

  const session = activeIASessions.get(m.channel.id);
  if (session && session.userId === m.author.id) {
    session.history.push({
      role: 'user',
      parts: [{ text: m.content }]
    });

    if (m.content.toLowerCase().includes('ya hasta aquí termina')) {
      activeIASessions.delete(m.channel.id);
      return m.reply('🌸 Entendido. Ha sido un gusto hablar contigo. ¡Adiós!');
    }

    try {
      const response = await axios.post(API_URL, {
        contents: session.history
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      const aiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Hmm... no estoy segura de eso.';
      session.history.push({
        role: 'model',
        parts: [{ text: aiText }]
      });

      m.reply(aiText);
    } catch (err) {
      console.error('Error IA:', err.response?.data || err.message);
      m.reply('❌ No se pudo conectar con Shizuka.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);