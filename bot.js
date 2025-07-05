// bot.js
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

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
  if (message.author.bot || !message.content) return;

  const original = message.content.trim();
  const translated = await translateWithLingva(original);

  if (translated && translated.toLowerCase() !== original.toLowerCase()) {
    await message.reply(`📥 **Traducido al español:** ${translated}`);
  }
});

client.login(DISCORD_TOKEN);