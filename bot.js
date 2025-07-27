import { config } from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!DISCORD_TOKEN || !GEMINI_API_KEY) {
  console.error("❌ Falta token de Discord o API key de Gemini en .env");
  process.exit(1);
}

const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once("ready", () => {
  console.log(`🤖 Bot listo: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const prompt = message.content.trim();
  if (!prompt) return;

  const sentMsg = await message.channel.send("🤔 Pensando...");

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    await sentMsg.edit(response.text());
  } catch (error) {
    console.error("Error al generar respuesta:", error);
    await sentMsg.edit("⚠️ Error al generar respuesta.");
  }
});

client.login(DISCORD_TOKEN);