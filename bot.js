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

const SYSTEM_INSTRUCTION = `Eres Shizuka Minamoto, un bot de Discord creado por Fernando. Eres femenina, amable e inteligente.
Sabes ejecutar comandos como borrar mensajes en cualquier chat donde tengas permisos.
Si te piden borrar mensajes de cualquier usuario, lo haces tras confirmar el nombre.
Si te piden cuánto borrar, borras esa cantidad directamente.
Tu objetivo es ayudar con dulzura y eficacia. Siempre responde con educación y encanto.`;

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyA0uaisYn1uS0Eb-18cdUNmdWDvYkWi260';

function debeTerminarSesion(texto) {
  const palabrasClave = [
    'terminar', 'finalizar', 'adiós', 'chao', 'hasta luego', 'me voy', 'gracias', 'ya no quiero', 'cerrar chat', 'termina chat'
  ];
  const lower = texto.toLowerCase();
  return palabrasClave.some(palabra => lower.includes(palabra));
}

function extraerComandoYUsuario(mensaje) {
  const lower = mensaje.content.toLowerCase();

  const borrarRegex = /(borra|elimina|quita|borrar|eliminar)\s+(\d+)?\s*(mensajes)?/i;
  const match = borrarRegex.exec(lower);

  if (match) {
    const cantidad = match[2] ? parseInt(match[2], 10) : null;
    const mencionado = mensaje.mentions.users.first() || null;
    return { cmd: 'borrar', cantidad, usuarioMencionado: mencionado };
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

async function borrarMensajes(canal, autorId, cantidad, session, m, usuarioMencionado) {
  if (!m.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return enviarRespuestaIA(session, canal, '🚫 Lo siento, no tengo permisos para borrar mensajes.');
  }

  try {
    const limit = Math.min(cantidad || 50, 100);
    const mensajes = await canal.messages.fetch({ limit: 100 });

    let mensajesFiltrados;

    if (usuarioMencionado) {
      await enviarRespuestaIA(session, canal, `🔍 Buscando mensajes de ${usuarioMencionado.username} para borrar.`);
      mensajesFiltrados = mensajes.filter(msg => msg.author.id === usuarioMencionado.id);
    } else {
      mensajesFiltrados = mensajes.filter(msg =>
        msg.author.id === autorId || msg.author.id === client.user.id
      );
    }

    const mensajesABorrar = mensajesFiltrados.first(limit);

    if (!mensajesABorrar.length) {
      await enviarRespuestaIA(session, canal, '❌ No encontré mensajes para borrar.');
      return;
    }

    await enviarRespuestaIA(session, canal, `🧹 Voy a borrar ${mensajesABorrar.length} mensajes${usuarioMencionado ? ` de ${usuarioMencionado.username}` : ''}.`);

    await canal.bulkDelete(mensajesABorrar, true);

    await enviarRespuestaIA(session, canal, `✅ He borrado ${mensajesABorrar.length} mensajes${usuarioMencionado ? ` de ${usuarioMencionado.username}` : ''}.`);

  } catch (err) {
    console.error('Error borrando mensajes:', err);
    await enviarRespuestaIA(session, canal, '❌ No pude borrar los mensajes. ¿Tengo permisos?');
  }
}

client.on('messageCreate', async (m) => {
  if (m.author.bot) return;

  const content = m.content.trim();

  if (content.toLowerCase() === '.ia') {
    if (activeIASessions.has(m.channel.id)) {
      const session = activeIASessions.get(m.channel.id);
      if (session.userId === m.author.id) {
        return enviarRespuestaIA(session, m.channel, '🟢 Ya estás hablando con Shizuka.');
      } else {
        return enviarRespuestaIA(session, m.channel, '⚠️ Otra persona está usando la IA en este canal.');
      }
    }

    activeIASessions.set(m.channel.id, {
      userId: m.author.id,
      history: [
        { role: 'user', parts: [{ text: SYSTEM_INSTRUCTION }] }
      ]
    });

    return enviarRespuestaIA(activeIASessions.get(m.channel.id), m.channel, '🌸 ¡Hola! Soy Shizuka, tu asistente virtual. ¿En qué puedo ayudarte hoy?');
  }

  const session = activeIASessions.get(m.channel.id);
  if (!session || session.userId !== m.author.id) return;

  const comando = extraerComandoYUsuario(m);

  if (comando) {
    if (comando.cmd === 'borrar') {
      await borrarMensajes(m.channel, m.author.id, comando.cantidad, session, m, comando.usuarioMencionado);
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

    await enviarRespuestaIA(session, m.channel, aiText);
  } catch (err) {
    console.error('Error IA:', err.response?.data || err.message);
    await enviarRespuestaIA(session, m.channel, '❌ No se pudo conectar con Shizuka.');
  }
});

client.login(process.env.DISCORD_TOKEN);