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
  return trans['es'][k] || '';
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

const GOOGLE_API_KEY = 'AIzaSyDIrZO_rzRxvf9YvbZK1yPdsj4nrc0nqwY';
const GOOGLE_CX = '34fe95d6cf39d4dd4';

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  load();
});

client.on('messageCreate', async (m) => {
  if (m.author.bot || !m.content) return;

  // Procesar comandos que inician con .
  if (!m.content.startsWith('.')) return;

  const args = m.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Comando: web
  if (command === 'web') {
    const query = args.join(' ');
    const uid = m.author.id;

    if (!query) return m.reply(T(uid, 'noSearchQuery'));

    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&searchType=image&q=${encodeURIComponent(
      query
    )}&num=50`;

    try {
      const res = await axios.get(url);
      const items = res.data.items;
      if (!items || items.length === 0)
        return m.reply(T(uid, 'noImagesFound'));

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

      m.channel.send({ embeds: [embed], components: [row] });
    } catch {
      m.reply('Error buscando imágenes.');
    }
    return;
  }

  // Comando: td (traducción) solo si hay reply (mencionado)
  if (command === 'td') {
    if (!CHANNELS.has(m.channel.id)) return;
    if (!m.reference?.messageId) return m.reply(T(m.author.id, 'mustReply'));

    try {
      const ref = await m.channel.messages.fetch(m.reference.messageId);
      const txt = ref.content,
        uid = m.author.id;
      const lang = getLang(uid);

      if (prefs[uid]) {
        const res = await translate(txt, lang);
        if (!res) return m.reply(T(uid, 'timeout'));
        if (res.from === lang) return m.reply(T(uid, 'alreadyInLang'));

        const e = new EmbedBuilder()
          .setColor('#00c7ff')
          .setDescription(`${LANGUAGES.find((l) => l.value === lang).emoji} : ${res.text}`);
        return m.reply({ embeds: [e] });
      }

      const sel = new StringSelectMenuBuilder()
        .setCustomId(`select-${uid}`)
        .setPlaceholder('🌍 Selecciona idioma')
        .addOptions(LANGUAGES.map((l) => ({ label: l.label, value: l.value, emoji: l.emoji })));

      m.reply({
        content: 'Selecciona idioma para guardar:',
        components: [new ActionRowBuilder().addComponents(sel)],
      });
    } catch {
      m.reply('No se pudo obtener el mensaje para traducir.');
    }
    return;
  }

  // Comando chat
  if (command === 'chat') {
    if (m.mentions.users.size !== 1)
      return m.reply('Debes mencionar exactamente a un usuario para chatear.');

    const user1 = m.author;
    const user2 = m.mentions.users.first();

    if (user1.id === user2.id)
      return m.reply('No puedes iniciar un chat contigo mismo.');

    activeChats.set(m.channel.id, { users: [user1.id, user2.id] });

    const member1 = await m.guild.members.fetch(user1.id);
    const member2 = await m.guild.members.fetch(user2.id);

    const embed = new EmbedBuilder()
      .setTitle('💬 Chat Automático Iniciado')
      .setDescription(
        `Chat iniciado entre:\n**${member1.nickname || member1.user.username}** <@${member1.id}>\n**${member2.nickname || member2.user.username}** <@${member2.id}>`
      )
      .setThumbnail(member1.user.displayAvatarURL({ extension: 'png', size: 64 }))
      .setImage(member2.user.displayAvatarURL({ extension: 'png', size: 64 }))
      .setColor('#00c7ff')
      .setTimestamp();

    m.channel.send({ embeds: [embed] });
    return;
  }

  // Comando dchat para finalizar chat (solo user flux_fer)
  if (command === 'dchat') {
    if (m.author.username !== 'flux_fer')
      return m.reply(T(m.author.id, 'notAuthorized'));

    if (activeChats.has(m.channel.id)) {
      activeChats.delete(m.channel.id);
      return m.reply(T(m.author.id, 'chatDeactivated'));
    } else {
      return m.reply(T(m.author.id, 'chatNoSession'));
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
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
      content: '🎉 Listo! Usa `.td` ahora.',
      ephemeral: true,
    });
    setTimeout(() => note.delete().catch(() => {}), 5000);
  }
});

client.login(process.env.DISCORD_TOKEN);