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
Si te piden cuánto borrar, borras esa cantidad directamente desde el mensaje donde se ejecuta el comando hacia atrás, incluyendo el mensaje de comando.
Tu objetivo es ayudar con dulzura y eficacia. Siempre responde con educación y encanto.`;

// Detecta frases para terminar chat
function debeTerminarSesion(texto) {
  const palabrasClave = [
    'terminar', 'finalizar', 'adiós', 'chao', 'hasta luego', 'me voy', 'gracias', 'ya no quiero', 'cerrar chat', 'termina chat'
  ];
  const lower = texto.toLowerCase();
  return palabrasClave.some(palabra => lower.includes(palabra));
}

// Extrae comando borrar con cantidad y posible mención
function extraerComandoYUsuario(mensaje) {
  const lower = mensaje.content.toLowerCase();

  // Regex para borrar, ejemplo: "borra 10 mensajes @usuario", "elimina 5 de @usuario"
  const borrarRegex = /(borra|elimina|quita|borrar|eliminar)\s+(\d+)?\s*(mensajes)?/i;
  const match = borrarRegex.exec(lower);

  if (match) {
    const cantidad = match[2] ? parseInt(match[2], 10) : 10; // por defecto 10 mensajes si no indica cantidad

    // Detectar mención de usuario (si hay)
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

// Función mejorada para borrar mensajes desde el mensaje del comando hacia atrás
async function borrarMensajes(canal, autorId, cantidad, session, mensajeComando, usuarioMencionado) {
  if (!mensajeComando.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return enviarRespuestaIA(session, canal, '🚫 Lo siento, no tengo permisos para borrar mensajes.');
  }

  try {
    const limit = Math.min(cantidad, 100);

    // Traer mensajes antes (y incluyendo) del mensaje comando
    // fetch no permite buscar desde un mensaje hacia atrás directo, 
    // pero podemos traer 100 últimos mensajes y filtrar

    // Traemos 100 mensajes recientes
    const mensajes = await canal.messages.fetch({ limit: 100 });

    // Filtrar mensajes que sean anteriores o igual al mensaje comando
    // Para eso comparamos timestamps: mensajes con ID menor o igual al mensajeComando.id
    // (IDs de Discord son Snowflakes ordenadas cronológicamente)
    const mensajesPrevios = mensajes.filter(msg => BigInt(msg.id) <= BigInt(mensajeComando.id));

    let mensajesFiltrados;

    if (usuarioMencionado) {
      await enviarRespuestaIA(session, canal, `🔍 Buscando mensajes de ${usuarioMencionado.username} para borrar desde el comando hacia atrás.`);

      mensajesFiltrados = mensajesPrevios.filter(msg => msg.author.id === usuarioMencionado.id);
    } else {
      // Si no hay usuario mencionado, borramos mensajes del autor del comando y del bot
      mensajesFiltrados = mensajesPrevios.filter(msg =>
        msg.author.id === autorId || msg.author.id === client.user.id
      );
    }

    const mensajesABorrar = mensajesFiltrados.first(limit);

    if (!mensajesABorrar.length) {
      await enviarRespuestaIA(session, canal, '❌ No encontré mensajes para borrar en ese rango.');
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

  const comando = extraerComandoYUsuario(m);

  if (comando) {
    if (comando.cmd === 'borrar') {
      // Aquí se pasa el mensaje que ejecuta el comando para saber desde donde borrar
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

  // Guardar mensaje de usuario en el historial para contexto
  session.history.push({
    role: 'user',
    parts: [{ text: content }]
  });

  try {
    // Enviar la conversación completa a la API
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