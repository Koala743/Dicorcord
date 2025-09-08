const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const axios = require("axios");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const COMIC_SITES = [
  { label: "📚 Chochox", value: "chochox.com" },
  { label: "📖 ReyComix", value: "reycomix.com" },
  { label: "🔞 Ver Comics Porno", value: "ver-comics-porno.com" },
  { label: "🎨 Hitomi", value: "hitomi.la" },
  { label: "🔥 Ver Comics Porno XXX", value: "vercomicsporno.xxx" },
];

const API_POOLS = [
  {
    id: "google_1",
    apiKey: "AIzaSyDIrZO_rzRxvf9YvbZK1yPdsj4nrc0nqwY",
    cx: "34fe95d6cf39d4dd4",
    dailyRequests: 0,
    maxDailyRequests: 100,
    quotaExhausted: false,
  },
  {
    id: "google_2",
    apiKey: "AIzaSyCOY3_MeHHHLiOXq2tAUypm1aHbpkFwQ80",
    cx: "f21e2b3468dc449e2",
    dailyRequests: 0,
    maxDailyRequests: 100,
    quotaExhausted: false,
  },
  {
    id: "google_3",
    apiKey: "TU_API_KEY_3_AQUI",
    cx: "TU_CX_3_AQUI",
    dailyRequests: 0,
    maxDailyRequests: 100,
    quotaExhausted: false,
  },
  {
    id: "google_4",
    apiKey: "TU_API_KEY_4_AQUI",
    cx: "TU_CX_4_AQUI",
    dailyRequests: 0,
    maxDailyRequests: 100,
    quotaExhausted: false,
  },
  {
    id: "google_5",
    apiKey: "TU_API_KEY_5_AQUI",
    cx: "TU_CX_5_AQUI",
    dailyRequests: 0,
    maxDailyRequests: 100,
    quotaExhausted: false,
  },
];

let currentApiIndex = 0;

function getNextApi() {
  for (let i = 0; i < API_POOLS.length; i++) {
    const api = API_POOLS[currentApiIndex];
    if (!api.quotaExhausted && api.dailyRequests < api.maxDailyRequests) {
      return api;
    }
    currentApiIndex = (currentApiIndex + 1) % API_POOLS.length;
  }
  return null;
}

async function makeGoogleAPIRequest(query, site) {
  let attempts = 0;
  const maxAttempts = API_POOLS.length;

  while (attempts < maxAttempts) {
    const api = getNextApi();
    if (!api) throw new Error("Todas las APIs están agotadas.");

    const url = `https://www.googleapis.com/customsearch/v1?key=${api.apiKey}&cx=${api.cx}&q=${encodeURIComponent(
      query + " site:" + site
    )}&num=5`;

    try {
      const res = await axios.get(url);
      api.dailyRequests++;
      if (api.dailyRequests >= api.maxDailyRequests) {
        api.quotaExhausted = true;
      }
      return res.data.items || [];
    } catch (e) {
      if (e.response && e.response.status === 429) {
        api.quotaExhausted = true;
        currentApiIndex = (currentApiIndex + 1) % API_POOLS.length;
        attempts++;
      } else {
        throw e;
      }
    }
  }
  throw new Error("No hay APIs disponibles.");
}

const comicCache = new Map();

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(".cmx")) return;

  const query = message.content.slice(4).trim();
  if (!query) return message.reply("Escribe algo para buscar.");

  const userId = message.author.id;
  comicCache.delete(userId);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`siteSelect-${userId}`)
    .setPlaceholder("Selecciona el sitio para buscar tu cómic favorito")
    .addOptions(COMIC_SITES);

  await message.reply({
    content: "Elige sitio para buscar comics:",
    components: [new ActionRowBuilder().addComponents(menu)],
    ephemeral: true,
  });

  comicCache.set(userId, { query });
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isStringSelectMenu()) {
    const [action, userId] = interaction.customId.split("-");
    if (interaction.user.id !== userId)
      return interaction.reply({ content: "No puedes usar esto.", ephemeral: true });

    if (action === "siteSelect") {
      const site = interaction.values[0];
      const data = comicCache.get(userId);
      if (!data) return interaction.reply({ content: "No se encontró tu búsqueda.", ephemeral: true });

      try {
        const items = await makeGoogleAPIRequest(data.query, site);
        if (!items.length) return interaction.update({ content: "No se encontraron comics.", components: [] });

        comicCache.set(userId, { items, index: 0, pageNum: 1 });

        const embed = createEmbed(items[0], 1, items.length, 1);
        const buttons = createButtons(userId, 0, items.length, items[0].link);

        await interaction.update({ content: "", embeds: [embed], components: [buttons] });
      } catch {
        await interaction.update({ content: "Error buscando comics.", components: [] });
      }
    }
  } else if (interaction.isButton()) {
    const [action, userId] = interaction.customId.split("-");
    if (interaction.user.id !== userId)
      return interaction.reply({ content: "No puedes usar esto.", ephemeral: true });

    const data = comicCache.get(userId);
    if (!data || !data.items) return interaction.reply({ content: "No hay búsqueda activa.", ephemeral: true });

    let idx = data.index;
    let pageNum = data.pageNum || 1;

    if (action === "prev" && idx > 0) {
      idx--;
      if (data.items[idx].link.includes("chochox.com") && pageNum > 1) pageNum--;
      else pageNum = 1;
    } else if (action === "next" && idx < data.items.length - 1) {
      idx++;
      if (data.items[idx].link.includes("chochox.com")) pageNum = 1;
      else pageNum = 1;
    } else if (action === "next" && idx === data.index && data.items[idx].link.includes("chochox.com")) {
      pageNum++;
    } else if (action === "prev" && idx === data.index && data.items[idx].link.includes("chochox.com") && pageNum > 1) {
      pageNum--;
    }

    comicCache.set(userId, { ...data, index: idx, pageNum });

    const item = data.items[idx];
    const embed = createEmbed(item, idx + 1, data.items.length, pageNum);
    const buttons = createButtons(userId, idx, data.items.length, item.link);

    await interaction.update({ embeds: [embed], components: [buttons] });
  }
});

function createEmbed(item, current, total, pageNum = 1) {
  let imageUrl = item.pagemap?.cse_image?.[0]?.src || null;

  if (item.link.includes("chochox.com")) {
    const baseUrlMatch = item.link.match(/(https:\/\/chochox\.com\/wp-content\/uploads\/\d{4}\/\d{2}\/.+-)(\d+)(\.webp)/);
    if (baseUrlMatch) {
      const base = baseUrlMatch[1];
      const ext = baseUrlMatch[3];
      const pageStr = pageNum.toString().padStart(2, "0");
      imageUrl = `${base}${pageStr}${ext}`;
    }
  }

  return new EmbedBuilder()
    .setTitle(item.title)
    .setURL(item.link)
    .setDescription(item.snippet || "")
    .setImage(imageUrl)
    .setFooter({ text: `Página ${pageNum} - Resultado ${current} de ${total}` });
}

function createButtons(userId, index, total, link) {
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prev-${userId}`)
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId(`next-${userId}`)
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(false)
  );

  if (link) {
    buttons.addComponents(
      new ButtonBuilder()
        .setLabel("Ver cómic completo")
        .setStyle(ButtonStyle.Link)
        .setURL(link)
    );
  }

  return buttons;
}

client.login(process.env.DISCORD_TOKEN);
