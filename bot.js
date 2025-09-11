const { Client, GatewayIntentBits } = require("discord.js")

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
})

client.once("ready", () => {
  console.log(`Bot listo como ${client.user.tag}`)
  // Aquí ya está conectado y activo, no hace nada más
})

client.login(process.env.Bot_Token)