const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const axios = require('axios');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const CHANNELS = new Set([
  '1381953561008541920',
  '1386131661942554685',
  '1299860715884249088',
]);

const LANGUAGES = [
  { label: 'Español', value: 'es', emoji: '🇪🇸' },
  { label: 'Inglés', value: 'en', emoji: '🇬🇧' },
  { label: 'Francés', value: 'fr', emoji: '🇫🇷' },
  { label: 'Alemán', value: 'de', emoji: '🇩🇪' },
  { label: 'Portugués', value: 'pt', emoji: '🇵🇹' },
  { label: 'Italiano', value: 'it', emoji: '🇮🇹' },
  { label: 'Ruso', value: 'ru', emoji: '🇷🇺' },
  { label: 'Japonés', value: 'ja', emoji: '🇯🇵' },
  { label: 'Coreano', value: 'ko', emoji: '🇰🇷' },
  { label: 'Chino (Simpl.)', value: 'zh-CN', emoji: '🇨🇳' },
];

const trans = {
  es: {
    mustReply: '⚠️ Usa el comando con un mensaje válido.',
    timeout: '⏳ Tiempo agotado. Usa el comando nuevamente.',
    alreadyInLang: '⚠️ El mensaje ya está en tu idioma.',
    notYours: '⚠️ No puedes traducir tu propio idioma.',
    langSaved: '🎉 Idioma guardado exitosamente.',
    chatActivated: '💬 Chat de traducción automática ACTIVADO para los usuarios seleccionados.',
    chatDeactivated: '🛑 Chat de traducción automática FINALIZADO.',
    chatNoSession: '❌ No hay chat activo para finalizar.',
    chatSelectUsers: '🌐 Selecciona con quién quieres hablar (tú ya estás incluido):',
    notAuthorized: '⚠️ No eres el usuario autorizado para usar este comando.',
    selectOneUser: '⚠️ Debes seleccionar exactamente un usuario para chatear.',
    noSearchQuery: '⚠️ Debes proporcionar texto para buscar.',
    noImagesFound: '❌ No se encontraron imágenes para esa búsqueda.',
  },
  en: {
    mustReply: '⚠️ Use the command with a valid message.',
    timeout: '⏳ Time ran out. Use the command again.',
    alreadyInLang: '⚠️ Message already in your language.',
    notYours: "⚠️ You can't translate your own language.",
    langSaved: '🎉 Language saved successfully.',
    chatActivated: '💬 Auto-translate chat ACTIVATED for selected users.',
    chatDeactivated: '🛑 Auto-translate chat STOPPED.',
    chatNoSession: '❌ No active chat session to stop.',
    chatSelectUsers: '🌐 Select who you want to chat with (you are included):',
    notAuthorized: '⚠️ You are not authorized to use this command.',
    selectOneUser: '⚠️ You must select exactly one user to chat with.',
    noSearchQuery: '⚠️ You must provide text to search.',
    noImagesFound: '❌ No images found for that search.',
  },
};

const PREFS = './langPrefs.json';
let prefs = {};

function load() {
  try {
    prefs = JSON.parse(fs.readFileSync(PREFS));
  } catch {
    prefs = {};
  }
}
function save() {
  fs.writeFileSync(PREFS, JSON.stringify(prefs, null, 2));
}
function getLang(u) {
  return prefs[u] || 'es';
}
function T(u, k) {
  return trans[getLang(u)]?.[k] || trans['es'][k];
}

async function translate(t, lang) {
  try {
    const r = await axios.get(
      `https://lingva.ml/api/v1/auto/${lang}/${encodeURIComponent(t)}`
    );
    if (r.data?.translation) return { text: r.data.translation, from: r.data.from };
  } catch {}
  return null;
}

const activeChats = new Map();

const imageSearchCache = new Map();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // Pon tu API Key aquí
const GOOGLE_CX = process.env.GOOGLE_CX; // Pon tu ID de motor personalizado aquí

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  load();
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    const uid = interaction.user.id;
    if (interaction.customId === 'prevImage') {
      const cache = imageSearchCache.get(uid);
      if (!cache) return interaction.deferUpdate();

      if (cache.index > 0) {
        cache.index--;
        const image = cache.items[cache.index];
        const embed = new EmbedBuilder()
          .setTitle(`Resultados para: ${cache.query}`)
          .setImage(image.link)
          .setFooter({ text: `Imagen ${cache.index + 1} de ${cache.items.length}` })
          .setColor('#00c7ff');

        await interaction.update({
          embeds: [embed],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prevImage')
                .setLabel('⬅️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(cache.index === 0),
              new ButtonBuilder()
                .setCustomId('nextImage')
                .setLabel('➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(cache.index === cache.items.length - 1)
            ),
          ],
        });
      } else {
        await interaction.deferUpdate();
      }
      return;
    }
    if (interaction.customId === 'nextImage') {
      const cache = imageSearchCache.get(uid);
      if (!cache) return interaction.deferUpdate();

      if (cache.index < cache.items.length - 1) {
        cache.index++;
        const image = cache.items[cache.index];
        const embed = new EmbedBuilder()
          .setTitle(`Resultados para: ${cache.query}`)
          .setImage(image.link)
          .setFooter({ text: `Imagen ${cache.index + 1} de ${cache.items.length}` })
          .setColor('#00c7ff');

        await interaction.update({
          embeds: [embed],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prevImage')
                .setLabel('⬅️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(cache.index === 0),
              new ButtonBuilder()
                .setCustomId('nextImage')
                .setLabel('➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(cache.index === cache.items.length - 1)
            ),
          ],
        });
      } else {
        await interaction.deferUpdate();
      }
      return;
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName, user, options } = interaction;

  if (commandName === 'td') {
    const messageId = options.getString('mensaje_id');
    const channel = interaction.channel;
    if (!channel) return interaction.reply({ content: 'Canal no válido.', ephemeral: true });

    try {
      const msgToTranslate = await channel.messages.fetch(messageId);
      if (!msgToTranslate)
        return interaction.reply({ content: 'Mensaje no encontrado.', ephemeral: true });

      const uid = user.id;
      const lang = getLang(uid);
      const text = msgToTranslate.content;

      if (prefs[uid]) {
        await interaction.deferReply({ ephemeral: true });
        const res = await translate(text, lang);
        if (!res)
          return interaction.editReply({ content: T(uid, 'timeout') });
        if (res.from === lang)
          return interaction.editReply({ content: T(uid, 'alreadyInLang') });
        const embed = new EmbedBuilder()
          .setColor('#00c7ff')
          .setDescription(`${LANGUAGES.find(l => l.value === lang).emoji} : ${res.text}`);
        return interaction.editReply({ embeds: [embed] });
      } else {
        const sel = new StringSelectMenuBuilder()
          .setCustomId(`select-${uid}`)
          .setPlaceholder('🌍 Selecciona idioma')
          .addOptions(LANGUAGES.map(l => ({ label: l.label, value: l.value, emoji: l.emoji })));

        await interaction.reply({
          content: 'Selecciona idioma para guardar:',
          components: [new ActionRowBuilder().addComponents(sel)],
          ephemeral: true,
        });
      }
    } catch {
      return interaction.reply({ content: 'No se pudo obtener el mensaje.', ephemeral: true });
    }
  }

  if (commandName === 'chat') {
    const mentionUser = options.getUser('usuario');
    if (!mentionUser)
      return interaction.reply({ content: 'Debes mencionar un usuario válido.', ephemeral: true });

    if (mentionUser.id === user.id)
      return interaction.reply({ content: 'No puedes iniciar un chat contigo mismo.', ephemeral: true });

    activeChats.set(interaction.channel.id, { users: [user.id, mentionUser.id] });

    const guild = interaction.guild;
    const member1 = await guild.members.fetch(user.id);
    const member2 = await guild.members.fetch(mentionUser.id);

    const embed = new EmbedBuilder()
      .setTitle('💬 Chat Automático Iniciado')
      .setDescription(
        `Chat iniciado entre:\n**${member1.nickname || member1.user.username}** <@${member1.id}>\n**${member2.nickname || member2.user.username}** <@${member2.id}>`
      )
      .setThumbnail(member1.user.displayAvatarURL({ extension: 'png', size: 64 }))
      .setImage(member2.user.displayAvatarURL({ extension: 'png', size: 64 }))
      .setColor('#00c7ff')
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'dchat') {
    if (user.username !== 'flux_fer')
      return interaction.reply({ content: T(user.id, 'notAuthorized'), ephemeral: true });

    if (activeChats.has(interaction.channel.id)) {
      activeChats.delete(interaction.channel.id);
      return interaction.reply({ content: T(user.id, 'chatDeactivated'), ephemeral: true });
    } else {
      return interaction.reply({ content: T(user.id, 'chatNoSession'), ephemeral: true });
    }
  }

  if (commandName === 'web') {
    const query = options.getString('consulta');
    const uid = user.id;
    if (!query) return interaction.reply({ content: T(uid, 'noSearchQuery'), ephemeral: true });

    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&searchType=image&q=${encodeURIComponent(
      query
    )}&num=50`;

    try {
      const res = await axios.get(url);
      const items = res.data.items;
      if (!items || items.length === 0)
        return interaction.reply({ content: T(uid, 'noImagesFound'), ephemeral: true });

      imageSearchCache.set(uid, { items, index: 0, query });

      const currentImage = items[0];
      const embed = new EmbedBuilder()
        .setTitle(`Resultados para: ${query}`)
        .setImage(currentImage.link)
        .setFooter({ text: `Imagen 1 de ${items.length}` })
        .setColor('#00c7ff');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prevImage')
          .setLabel('⬅️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('nextImage')
          .setLabel('➡️')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    } catch {
      return interaction.reply({ content: 'Error buscando imágenes.', ephemeral: true });
    }
  }
});

client.on('messageCreate', async (m) => {
  if (m.author.bot || !m.content) return;

  const chat = activeChats.get(m.channel.id);
  if (chat) {
    const { users } = chat;
    if (users.includes(m.author.id)) {
      const otherUserId = users.find((u) => u !== m.author.id);
      const fromLang = getLang(m.author.id);
      const toLang = getLang(otherUserId);

      const raw = m.content.trim();
      if (
        !raw ||
        m.stickers.size > 0 ||
        /^<a?:.+?:\d+>$/.test(raw) ||
        /^(\p{Emoji_Presentation}|\p{Emoji})+$/u.test(raw) ||
        /^\.\w{1,4}$/i.test(raw)
      )
        return;

      if (fromLang !== toLang) {
        const res = await translate(raw, toLang);
        if (res && res.text) {
          m.channel.send({
            content: `${LANGUAGES.find((l) => l.value === toLang)?.emoji || ''} **Traducción para <@${otherUserId}>:** ${res.text}`,
          });
        }
      }
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  const uid = interaction.user.id;

  if (interaction.customId.startsWith('select-')) {
    const [_, uid2] = interaction.customId.split('-');
    if (uid !== uid2)
      return interaction.reply({ content: 'No es tu menú.', ephemeral: true });

    const v = interaction.values[0];
    prefs[uid] = v;
    save();
    await interaction.update({
      content: `${LANGUAGES.find((l) => l.value === v).emoji} ${T(uid, 'langSaved')}`,
      components: [],
      ephemeral: true,
    });
    const note = await interaction.followUp({
      content: '🎉 Listo! Usa `/td` ahora.',
      ephemeral: true,
    });
    setTimeout(() => note.delete().catch(() => {}), 5000);
  }
});

client.login(process.env.DISCORD_TOKEN);