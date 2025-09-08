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
const cheerio = require("cheerio");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const COMIC_SITES = [
  { label: "Chochox", value: "chochox.com", description: "Comics adultos populares", emoji: "🔞" },
  // Puedes agregar más sitios aquí
];

const comicCache = new Map();

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(".cmx")) return;

  const query = message.content.slice(4).trim();
  if (!query) return message.reply("⚠️ Escribe algo para buscar.");

  const userId = message.author.id;
  comicCache.delete(userId);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`siteSelect-${userId}`)
    .setPlaceholder("Selecciona sitio para buscar")
    .addOptions(
      COMIC_SITES.map((site) => ({
        label: site.label,
        value: site.value,
        description: site.description,
        emoji: site.emoji,
      }))
    );

  await message.reply({
    content: "📚 Elige el sitio donde buscar comics:",
    components: [new ActionRowBuilder().addComponents(menu)],
    ephemeral: true,
  });

  comicCache.set(userId, { query });
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isStringSelectMenu()) {
    const [action, userId] = interaction.customId.split("-");
    if (interaction.user.id !== userId) return interaction.reply({ content: "⛔ No puedes usar esto.", ephemeral: true });

    if (action === "siteSelect") {
      const site = interaction.values[0];
      const data = comicCache.get(userId);
      if (!data) return interaction.reply({ content: "❌ No se encontró tu búsqueda.", ephemeral: true });

      if (site === "chochox.com") {
        try {
          const comics = await searchChochox(data.query);
          if (!comics.length) return interaction.update({ content: "❌ No se encontraron comics.", components: [] });

          comicCache.set(userId, { comics, index: 0 });

          const embed = createComicListEmbed(comics[0], 1, comics.length);
          const buttons = createComicListButtons(userId, 0, comics.length);

          await interaction.update({ content: "", embeds: [embed], components: [buttons] });
        } catch (e) {
          console.error(e);
          await interaction.update({ content: "❌ Error buscando comics.", components: [] });
        }
      } else {
        await interaction.update({ content: "❌ Sitio no soportado aún.", components: [] });
      }
    }
  } else if (interaction.isButton()) {
    const [action, userId] = interaction.customId.split("-");
    if (interaction.user.id !== userId) return interaction.reply({ content: "⛔ No puedes usar esto.", ephemeral: true });

    const data = comicCache.get(userId);
    if (!data) return interaction.reply({ content: "❌ No hay búsqueda activa.", ephemeral: true });

    if (action === "prev") {
      if (data.index > 0) data.index--;
    } else if (action === "next") {
      if (data.index < data.comics.length - 1) data.index++;
    } else if (action === "view") {
      // Cargar páginas del comic seleccionado
      const comic = data.comics[data.index];
      try {
        const pages = await getChochoxPages(comic.url);
        if (!pages.length) return interaction.reply({ content: "❌ No se encontraron páginas.", ephemeral: true });

        comicCache.set(userId, { pages, pageIndex: 0, comicUrl: comic.url });

        const embed = createPageEmbed(pages[0], 1, pages.length, comic.url);
        const buttons = createPageButtons(userId, 0, pages.length);

        await interaction.update({ content: "", embeds: [embed], components: [buttons] });
      } catch (e) {
        console.error(e);
        await interaction.reply({ content: "❌ Error cargando páginas.", ephemeral: true });
      }
      return;
    } else if (action === "pagePrev") {
      if (data.pageIndex > 0) data.pageIndex--;
    } else if (action === "pageNext") {
      if (data.pageIndex < data.pages.length - 1) data.pageIndex++;
    } else if (action === "backToList") {
      // Volver a la lista de comics
      if (!data.comics) return interaction.reply({ content: "❌ No hay lista para volver.", ephemeral: true });
      const embed = createComicListEmbed(data.comics[data.index], data.index + 1, data.comics.length);
      const buttons = createComicListButtons(userId, data.index, data.comics.length);
      comicCache.set(userId, { comics: data.comics, index: data.index });
      await interaction.update({ content: "", embeds: [embed], components: [buttons] });
      return;
    }

    comicCache.set(userId, data);

    if (data.pages) {
      // Navegando páginas
      const embed = createPageEmbed(data.pages[data.pageIndex], data.pageIndex + 1, data.pages.length, data.comicUrl);
      const buttons = createPageButtons(userId, data.pageIndex, data.pages.length);
      await interaction.update({ embeds: [embed], components: [buttons] });
    } else if (data.comics) {
      // Navegando lista comics
      const embed = createComicListEmbed(data.comics[data.index], data.index + 1, data.comics.length);
      const buttons = createComicListButtons(userId, data.index, data.comics.length);
      await interaction.update({ embeds: [embed], components: [buttons] });
    }
  }
});

async function searchChochox(query) {
  const url = `https://chochox.com/api/search?q=${encodeURIComponent(query)}&limit=20`;
  const res = await axios.get(url, {
    headers: { "User -Agent": "Mozilla/5.0" },
  });
  if (!res.data?.results) return [];
  return res.data.results.map((c) => ({
    title: c.title,
    url: `https://chochox.com/comic/${c.slug}`,
    thumbnail: c.thumbnail || c.cover,
  }));
}

async function getChochoxPages(comicUrl) {
  const res = await axios.get(comicUrl, { headers: { "User -Agent": "Mozilla/5.0" } });
  const $ = cheerio.load(res.data);
  const images = [];

  // Buscar imágenes que terminen en 01.webp, 1.webp, etc
  $("img").each((i, el) => {
    const src = $(el).attr("src") || "";
    if (/\/\d{1,2}\.webp$/.test(src) || /\/\d{1,2}\.jpg$/.test(src) || /\/\d{1,2}\.png$/.test(src)) {
      images.push(src.startsWith("http") ? src : "https://chochox.com" + src);
    }
  });

  // Ordenar por número de página
  images.sort((a, b) => {
    const numA = parseInt(a.match(/\/(\d{1,2})\.(webp|jpg|png)$/)?.[1] || "0");
    const numB = parseInt(b.match(/\/(\d{1,2})\.(webp|jpg|png)$/)?.[1] || "0");
    return numA - numB;
  });

  return images;
}

function createComicListEmbed(comic, current, total) {
  return new EmbedBuilder()
    .setTitle(comic.title)
    .setURL(comic.url)
    .setDescription(`Resultado ${current} de ${total}`)
    .setImage(comic.thumbnail)
    .setColor("#ff3366");
}

function createComicListButtons(userId, index, total) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prev-${userId}`)
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId(`next-${userId}`)
      .setLabel("➡️ Siguiente")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === total - 1),
    new ButtonBuilder()
      .setCustomId(`view-${userId}`)
      .setLabel("📖 Ver Comic Completo")
      .setStyle(ButtonStyle.Success)
  );
}

function createPageEmbed(imageUrl, current, total, comicUrl) {
  return new EmbedBuilder()
    .setTitle(`Página ${current} de ${total}`)
    .setURL(comicUrl)
    .setImage(imageUrl)
    .setFooter({ text: "Usa los botones para navegar o volver a la lista" })
    .setColor("#33aaff");
}

function createPageButtons(userId, index, total) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pagePrev-${userId}`)
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId(`pageNext-${userId}`)
      .setLabel("➡️ Siguiente")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === total - 1),
    new ButtonBuilder()
      .setCustomId(`backToList-${userId}`)
      .setLabel("🔙 Volver a la lista")
      .setStyle(ButtonStyle.Danger)
  );
}

client.login(process.env.DISCORD_TOKEN);
