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
  if (
    message.author.bot ||
    !message.content ||
    !CHANNELS_TO_TRANSLATE.has(message.channel.id)
  ) return;

  const original = message.content.trim();

  const hasLongWord = original.split(/\s+/).some(word => word.length > 3);
  if (!hasLongWord) return;

  const sinTexto = original
    .replace(/<a?:\w+:\d+>/g, '')
    .replace(/[\p{Emoji}\p{Punctuation}\p{Symbol}\s]/gu, '');

  if (sinTexto.length === 0 || original.length < 2) return;

  console.log(`📨 ${message.author.username}: ${original}`);

  const translated = await translateWithLingva(original);

  if (translated && translated.toLowerCase() !== original.toLowerCase()) {
    console.log(`📝 Traducción: ${translated}`);
    await message.reply(`📥 **Traducción al español:** ${translated}`);
  } else {
    console.log("⚠️ No se pudo traducir o ya está en español.");
  }
});

client.login(DISCORD_TOKEN);