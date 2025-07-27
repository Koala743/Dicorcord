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

const SYSTEM_INSTRUCTION = `Eres Shizuka Minamoto, un bot de Discord creado por Fernando. Eres femenina, amable, inteligente y siempre respondes con educación y dulzura.
Sabes ejecutar comandos de Discord como borrar mensajes y terminar chats. Explica cuando usas un comando.
Tu objetivo es ayudar y ser encantadora en la conversación.`;

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyA0uaisYn1uS0Eb-18cdUNmdWDvYkWi260';

// Frases para detectar cierre de chat
function debeTerminarSesion(texto) {
  const palabrasClave = [
    'terminar', 'finalizar', 'adiós', 'chao', 'hasta luego', 'me voy', 'gracias', 'ya no quiero', 'cerrar chat', 'termina chat'
  ];
  const lower = texto.toLowerCase();
  return palabrasClave.some(palabra => lower.includes(palabra));
}

// Extrae comandos del texto
function extraerComando(texto) {
  const lower = texto.toLowerCase();

  const borrarMatch = lower.match(/(borra|elimina|quita|borrar|eliminar)\s+(\d+)\s*(mensajes)?/);
  if (borrarMatch) {
    return { cmd: 'borrar', cantidad: parseInt(borrarMatch[2], 10) };
  }

  if (/terminar chat|finalizar chat|cerrar chat/.test(lower)) {
    return { cmd: 'terminarChat' };
  }

  return null;
}

async function enviarRespuestaIA(session, canal, texto) {
  session.history.push({
    role: 'model',
    parts: [{ text: texto }]
  });
  await canal.send(texto);
}

client.on('messageCreate', async (m) => {
  if (m.author.bot) return;

  const content = m.content.trim();

  if (content.toLowerCase() === '.ia') {
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
        { role: 'user', parts: [{ text: SYSTEM_INSTRUCTION }] }
      ]
    });

    return m.reply('🌸 ¡Hola! Soy Shizuka, tu asistente virtual. ¿En qué puedo ayudarte hoy?');
  }

  const session = activeIASessions.get(m.channel.id);
  if (!session || session.userId !== m.author.id) return;

  // Verifica si el mensaje contiene un comando
  const comando = extraerComando(content);

  if (comando) {
    if (comando.cmd === 'borrar') {
      const cantidad = Math.min(comando.cantidad, 100);
      if (!m.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return enviarRespuestaIA(session, m.channel, '🚫 Lo siento, no tengo permisos para borrar mensajes.');
      }
      try {
        // Enviar saludo antes de borrar
        await enviarRespuestaIA(session, m.channel, `🧹 Entendido, borraré los últimos ${cantidad} mensajes relevantes.`);

        // Buscar mensajes para borrar
        const mensajes = await m.channel.messages.fetch({ limit: cantidad + 20 });
        const mensajesABorrar = mensajes.filter(msg =>
          msg.author.id === m.author.id || msg.author.id === client.user.id
        ).first(cantidad);

        await m.channel.bulkDelete(mensajesABorrar, true);

        await enviarRespuestaIA(session, m.channel, `✅ He borrado ${mensajesABorrar.length} mensajes.`);
      } catch (err) {
        console.error('Error borrando mensajes:', err);
        await enviarRespuestaIA(session, m.channel, '❌ No pude borrar los mensajes. ¿Tengo permisos?');
      }
      return;
    }

    if (comando.cmd === 'terminarChat') {
      await enviarRespuestaIA(session, m.channel, '🍂 Está bien, cerraré nuestro chat. ¡Cuídate mucho!');
      activeIASessions.delete(m.channel.id);
      return;
    }
  }

  if (debeTerminarSesion(content)) {
    await enviarRespuestaIA(session, m.channel, '🍂 Entiendo que quieres finalizar. Hasta pronto!');
    activeIASessions.delete(m.channel.id);
    return;
  }

  // Conversación normal con la IA
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

    const aiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Lo siento, no entendí eso muy bien.';
    session.history.push({
      role: 'model',
      parts: [{ text: aiText }]
    });

    m.reply(aiText);
  } catch (err) {
    console.error('Error IA:', err.response?.data || err.message);
    m.reply('❌ No se pudo conectar con Shizuka.');
  }
});

client.login(process.env.DISCORD_TOKEN);