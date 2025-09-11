const Discord = require("discord.js");

const version = Discord?.version || "14.0.0";
const major = parseInt(version.split(".")[0], 10) || 14;

let intents;
if (major >= 14) intents = [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages];
else if (major >= 13) intents = [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES];
else intents = [Discord.Intents?.FLAGS?.GUILDS, Discord.Intents?.FLAGS?.GUILD_MESSAGES].filter(Boolean);

const client = major <= 12 ? new Discord.Client({ ws: { intents } }) : new Discord.Client({ intents });

let readyHandled = false;
function onReady() {
  if (readyHandled) return;
  readyHandled = true;
  console.log(`Bot activo como ${client.user.tag}`);
}

client.once("ready", onReady);
client.once("clientReady", onReady);

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error("Error iniciando sesión:", err.message);
  process.exit(1);
});