const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio"); // para parsear HTML

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const LANGUAGES = [
  { label: "Español", value: "es", emoji: "🇪🇸" },
  { label: "Inglés", value: "en", emoji: "🇬🇧" }
];

const trans = {
  es: {
    mustReply: "⚠️ Usa el comando con un mensaje válido.",
    timeout: "⏳ Tiempo agotado. Usa el comando nuevamente.",
    alreadyInLang: "⚠️ El mensaje ya está en tu idioma.",
    notAuthorized: "⚠️ No eres el usuario autorizado.",
    noSearchQuery: "⚠️ Debes proporcionar texto para buscar.",
    noValidImages: "❌ No se encontraron resultados válidos.",
    chatDeactivated: "🛑 Chat automático desactivado."
  }
};

// todo en memoria (Railway-friendly)
let prefs = {};
let API_POOLS = {
  google: [
    {
      id: "google_1",
      apiKey: "AIzaSyDIrZO_rzRxvf9YvbZK1yPdsj4nrc0nqwY",
      cx: "34fe95d6cf39d4dd4",
      active: true,
      quotaExhausted: false,
      dailyRequests: 0,
      maxDailyRequests: 100,
      lastReset: new Date().toDateString()
    }
  ]
};

function resetDailyIfNeeded(api) {
  const today = new Date().toDateString();
  if (api.lastReset !== today) {
    api.dailyRequests = 0;
    api.quotaExhausted = false;
    api.lastReset = today;
  }
}

async function googleImageSearchTry(query) {
  for (let api of API_POOLS.google) resetDailyIfNeeded(api);
  for (let api of API_POOLS.google) {
    if (!api.active || api.quotaExhausted || api.dailyRequests >= api.maxDailyRequests) continue;
    api.dailyRequests++;
    const url = `https://www.googleapis.com/customsearch/v1?key=${api.apiKey}&cx=${api.cx}&searchType=image&q=${encodeURIComponent(query)}&num=10`;
    try {
      const res = await axios.get(url, { timeout: 8000 });
      const items = (res.data.items || []).filter(img => img.link && img.link.startsWith("http"));
      if (!items.length) return { items: [], apiUsed: api };
      return { items, apiUsed: api };
    } catch (err) {
      api.quotaExhausted = true;
      continue;
    }
  }
  return null;
}

const COMMANDS_LIST = [
  {
    name: ".web [búsqueda]",
    description: "Busca imágenes en Google con navegación por flechas",
    example: ".web gatos",
    category: "🔍 Búsqueda"
  },
  {
    name: ".bs [búsqueda]",
    description: "Busca videos en gokx.es y permite reproducir con navegación",
    example: ".bs naruto",
    category: "🎥 Videos"
  },
  {
    name: ".help",
    description: "Muestra todos los comandos disponibles",
    example: ".help",
    category: "ℹ️ Utilidad"
  }
];

const imageSearchCache = new Map();
const videoSearchCache = new Map();

const COMMAND_FUNCTIONS = {
  web: async (m, args) => {
    const query = args.join(" ");
    if (!query) return m.reply(trans.es.noSearchQuery);
    const result = await googleImageSearchTry(query);
    if (result === null) return m.reply("❌ Todas las APIs de Google están agotadas.");
    const { items, apiUsed } = result;
    if (!items.length) return m.reply(trans.es.noValidImages);
    const embed = new EmbedBuilder()
      .setTitle(`📷 Resultados para: ${query}`)
      .setImage(items[0].link)
      .setDescription(`[Página donde está la imagen](${items[0].image.contextLink})`)
      .setFooter({ text: `Imagen 1 de ${items.length} • Usado: ${apiUsed.id}` })
      .setColor("#00c7ff");
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prevImage").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("nextImage").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(items.length <= 1)
    );
    imageSearchCache.set(m.author.id, { items, index: 0, query });
    await m.channel.send({ embeds: [embed], components: [row] });
  },

  bs: async (m, args) => {
    const query = args.join(" ");
    if (!query) return m.reply("⚠️ Debes poner algo para buscar.");
    const searchUrl = `https://www.gokx.es/search/${encodeURIComponent(query)}`;
    try {
      const res = await axios.get(searchUrl, { timeout: 10000 });
      const $ = cheerio.load(res.data);
      const results = [];
      $("a").each((_, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim();
        if (href && href.includes("/video-")) {
          results.push({ url: `https://www.gokx.es${href}`, title: text || "Video" });
        }
      });
      if (!results.length) return m.reply("❌ No se encontraron videos.");
      const first = results[0];
      const embed = new EmbedBuilder()
        .setTitle(`🎥 Resultados de: ${query}`)
        .setDescription(`[${first.title}](${first.url})`)
        .setColor("#ff0066");
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prevVideo").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId("nextVideo").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(results.length <= 1)
      );
      videoSearchCache.set(m.author.id, { results, index: 0, query });
      await m.channel.send({ embeds: [embed], components: [row] });
    } catch {
      return m.reply("❌ Error al buscar videos.");
    }
  },

  help: async (m) => {
    const embed = new EmbedBuilder().setTitle("📜 Lista de Comandos").setColor("#00c7ff");
    for (let cmd of COMMANDS_LIST) {
      embed.addFields({ name: cmd.name, value: `${cmd.description}\nEjemplo: \`${cmd.example}\` (${cmd.category})` });
    }
    return m.channel.send({ embeds: [embed] });
  }
};

client.on("messageCreate", async (m) => {
  if (m.author.bot || !m.content.startsWith(".")) return;
  const [command, ...args] = m.content.slice(1).trim().split(/ +/);
  if (COMMAND_FUNCTIONS[command]) {
    try {
      await COMMAND_FUNCTIONS[command](m, args);
    } catch {
      m.reply("❌ Error ejecutando el comando.");
    }
  }
});

client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;
  const uid = i.user.id;

  if (i.customId === "prevImage" || i.customId === "nextImage") {
    const cache = imageSearchCache.get(uid);
    if (!cache) return i.deferUpdate();
    let newIndex = cache.index + (i.customId === "nextImage" ? 1 : -1);
    if (newIndex < 0 || newIndex >= cache.items.length) return i.deferUpdate();
    cache.index = newIndex;
    const img = cache.items[newIndex];
    const embed = new EmbedBuilder()
      .setTitle(`📷 Resultados para: ${cache.query}`)
      .setImage(img.link)
      .setDescription(`[Página donde está la imagen](${img.image.contextLink})`)
      .setFooter({ text: `Imagen ${newIndex + 1} de ${cache.items.length}` })
      .setColor("#00c7ff");
    await i.update({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prevImage").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(newIndex === 0),
          new ButtonBuilder().setCustomId("nextImage").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(newIndex === cache.items.length - 1)
        )
      ]
    });
  }

  if (i.customId === "prevVideo" || i.customId === "nextVideo") {
    const cache = videoSearchCache.get(uid);
    if (!cache) return i.deferUpdate();
    let newIndex = cache.index + (i.customId === "nextVideo" ? 1 : -1);
    if (newIndex < 0 || newIndex >= cache.results.length) return i.deferUpdate();
    cache.index = newIndex;
    const vid = cache.results[newIndex];
    const embed = new EmbedBuilder()
      .setTitle(`🎥 Resultados de: ${cache.query}`)
      .setDescription(`[${vid.title}](${vid.url})`)
      .setColor("#ff0066");
    await i.update({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prevVideo").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(newIndex === 0),
          new ButtonBuilder().setCustomId("nextVideo").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(newIndex === cache.results.length - 1)
        )
      ]
    });
  }
});

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);