const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const CHANNELS_TO_TRANSLATE = new Set([
  '1381953561008541920',
  '1386131661942554685',
  '1299860715884249088'
]);

async function translateWithLingva(text) {
  try {
    const url = `https://lingva.ml/api/v1/auto/es/${encodeURIComponent(text)}`;
    const res = await axios.get(url);
    if (res.data && res.data.translation) return res.data.translation;
    return null;
  } catch {
    return null;
  }
}

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content || !CHANNELS_TO_TRANSLATE.has(message.channel.id)) return;

  const original = message.content.trim();

  const words = original.split(/\s+/);
  const maxWordLength = Math.max(...words.map(w => w.length));
  if (maxWordLength < 3) return;

  const sinTexto = original
    .replace(/<a?:\w+:\d+>/g, '')
    .replace(/[\p{Emoji}\p{Punctuation}\p{Symbol}\s]/gu, '');

  if (sinTexto.length === 0 || original.length < 2) return;

  if (original.toLowerCase().startsWith('.tg')) return;

  if (maxWordLength >= 3 && maxWordLength <= 5) {
    const translated = await translateWithLingva(original);
    if (translated && translated.toLowerCase() !== original.toLowerCase()) {
      const reply = await message.reply(`📥 **Traducción al español:** ${translated}`);
      setTimeout(() => reply.delete().catch(() => {}), 5000);
    }
  }
});

client.on('messageCreate', async (message) => {
  if (
    message.author.bot ||
    !message.content ||
    !CHANNELS_TO_TRANSLATE.has(message.channel.id)
  ) return;

  if (!message.content.toLowerCase().startsWith('.tg')) return;

  if (!message.reference || !message.reference.messageId) return;

  try {
    const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
    const original = referencedMessage.content.trim();
    if (!original) return;

    const words = original.split(/\s+/);
    const maxWordLength = Math.max(...words.map(w => w.length));
    if (maxWordLength <= 5) return;

    const translated = await translateWithLingva(original);
    if (translated && translated.toLowerCase() !== original.toLowerCase()) {
      await message.reply(`📥 **Traducción al español:** ${translated}`);
    }
  } catch {
    return;
  }
});

client.login(DISCORD_TOKEN);