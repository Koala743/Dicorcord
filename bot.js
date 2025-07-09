const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const express = require('express');
const cors = require('cors');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let robloxLink = "https://www.roblox.com/share?code=f8cdd8844a281f4d87c8a591b5d3126a&type=Server";

app.get('/roblox-link', (req, res) => {
  res.json({ link: robloxLink });
});

app.post('/update-link', (req, res) => {
  const { link } = req.body;
  if (!link || !link.startsWith("http")) {
    return res.status(400).json({ error: "Link inválido" });
  }
  robloxLink = link;
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor backend activo en http://localhost:${PORT}`);
});

client.once('ready', () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('.setlink ')) {
    const newLink = message.content.slice(9).trim();
    if (!newLink.startsWith('http')) {
      return message.reply('❌ Link inválido.');
    }

    robloxLink = newLink;
    message.reply('✅ Link de Roblox actualizado correctamente.');
  }
});

client.login(DISCORD_TOKEN);