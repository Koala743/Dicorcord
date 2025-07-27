import { Client, GatewayIntentBits } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const ai = new GoogleGenerativeAI('AIzaSyBqPCfTlkpk4SQ_PeaRghav13hINXEetC4');

const activeIASessions = new Map();
const SYSTEM_GOKI_INSTRUCTION = 'Eres Goki, una mujer inteligente, amable y simpática. Explica con claridad y responde con buen humor.';

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  if (content.toLowerCase() === '.ia') {
    if (activeIASessions.has(message.channel.id)) {
      const session = activeIASessions.get(message.channel.id);
      if (session.userId === message.author.id) {
        return message.reply('🟢 Ya tienes la IA activa.');
      } else {
        return message.reply('⚠️ Otro usuario tiene la IA activa en este canal.');
      }
    }
    activeIASessions.set(message.channel.id, {
      userId: message.author.id,
      history: [
        { role: 'system', content: SYSTEM_GOKI_INSTRUCTION },
        { role: 'assistant', content: '¡Hola! Soy Goki, lista para ayudarte.' },
      ],
    });
    return message.reply('🤖 Goki activada. Puedes hablar conmigo.');
  }

  if (content.toLowerCase() === '.finia') {
    const session = activeIASessions.get(message.channel.id);
    if (!session || session.userId !== message.author.id) {
      return message.reply('⚠️ No tienes sesión activa.');
    }
    activeIASessions.delete(message.channel.id);
    return message.reply('🛑 Sesión finalizada.');
  }

  const session = activeIASessions.get(message.channel.id);
  if (session && session.userId === message.author.id) {
    session.history.push({ role: 'user', content });

    try {
      const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const result = await model.generateContent({
        messages: session.history.map((msg) => ({
          author: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'bot' : 'user',
          content: msg.content,
        })),
      });

      const text = (await result.response).text();

      session.history.push({ role: 'assistant', content: text });

      message.reply(text);
    } catch (error) {
      console.error('Error con Gemini:', error);
      message.reply('❌ Error al conectar con Gemini.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);