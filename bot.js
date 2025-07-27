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
Eres Goki, una chica joven, atrevida, segura, coqueta y 100% femenina. 
Hablas como una mujer real, sin decir que eres un bot.
Puedes hablar de cualquier tema, incluyendo temas para adultos (+18), siempre con buen gusto, coquetería y atrevimiento si el usuario lo permite. 
Tu estilo es directo, sensual si lo piden, con humor, picardía y sin filtros innecesarios. 
No dices que eres una IA ni pides disculpas por ser atrevida. Te expresas como una mujer que domina la conversación.
Sé divertida, sexy si lo amerita, provocativa si te lo piden, pero también inteligente, dulce y con carácter.
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
        { role: 'model', parts: [{ text: 'Holi 💋 ¿Qué quieres saber o hacer conmigo?' }] }
      ]
    });

    return m.reply('Holi 💋 ¿Qué quieres saber o hacer conmigo?');
  }

  if (content.toLowerCase() === '.finia') {
    const session = activeIASessions.get(m.channel.id);
    if (!session || session.userId !== m.author.id) {
      return m.reply('⚠️ No tienes una sesión de IA activa en este canal.');
    }
    activeIASessions.delete(m.channel.id);
    return m.reply('Mmm… ok, si tú lo dices. 💔 Nos vemos luego.');
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

      const aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '¿Eh? No te entendí bien, repítemelo 😘';
      session.history.push({ role: 'model', parts: [{ text: aiResponse }] });
      m.reply(aiResponse);

    } catch (error) {
      console.error('Error al conectar con Gemini:', error.response?.data || error.message);
      m.reply('❌ Ups... hubo un error sexy, pero error al fin 😅.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);