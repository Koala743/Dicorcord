const { Client, GatewayIntentBits } = require("discord.js")

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
})

client.once("ready", () => {
  console.log(`Bot activo como ${client.user.tag}`)
})

client.login(process.env.DISCORD_TOKEN)