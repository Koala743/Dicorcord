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
  // otros idiomas posibles...
];

const trans = {
  es: {
    mustReply: '⚠️ Usa el comando con un mensaje válido.',
    timeout: '⏳ Tiempo agotado. Usa el comando nuevamente.',
    alreadyInLang: '⚠️ El mensaje ya está en tu idioma.',
    notAuthorized: '⚠️ No eres el usuario autorizado.',
    noSearchQuery: '⚠️ Debes proporcionar texto para buscar.',
    noImagesFound: '❌ No se encontraron imágenes para esa búsqueda.',
  },
};

const PREFS = './langPrefs.json';
let prefs = {};
function load() {
  try { prefs = JSON.parse(fs.readFileSync(PREFS)); } catch { prefs = {}; }
}
function save() { fs.writeFileSync(PREFS, JSON.stringify(prefs, null, 2)); }
function getLang(u) { return prefs[u] || 'es'; }
function T(u, k) { return trans.es[k] || ''; }

async function translate(text, lang) {
  try {
    const r = await axios.get(
      `https://lingva.ml/api/v1/auto/${lang}/${encodeURIComponent(text)}`
    );
    return r.data?.translation ? { text: r.data.translation, from: r.data.from } : null;
  } catch {
    return null;
  }
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
  if (m.author.bot || !m.content || !m.content.startsWith('.')) return;

  const [command, ...args] = m.content.slice(1).trim().split(/ +/);
  const uid = m.author.id;

  if (command === 'web') {
    const query = args.join(' ');
    if (!query) return m.reply(T(uid, 'noSearchQuery'));

    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&searchType=image&q=${encodeURIComponent(query)}&num=10`;

    try {
      const res = await axios.get(url);
      const items = res.data.items;
      if (!items || items.length === 0) {
        console.error('Respuesta Google sin items:', res.data);
        return m.reply(T(uid, 'noImagesFound'));
      }

      imageSearchCache.set(uid, { items, index: 0, query });
      const embed = new EmbedBuilder()
        .setTitle(`Resultados para: ${query}`)
        .setImage(items[0].link)
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

      await m.channel.send({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('Error petición Google:', err.response?.data || err.message);
      const errMsg = err.response?.data?.error?.message || err.message;
      return m.reply(`❌ Error buscando imágenes: ${errMsg}`);
    }
  }

  if (command === 'td') {
    if (!CHANNELS.has(m.channel.id) || !m.reference?.messageId) return m.reply(T(uid, 'mustReply'));
    try {
      const ref = await m.channel.messages.fetch(m.reference.messageId);
      const res = await translate(ref.content, getLang(uid));
      if (!res) return m.reply(T(uid, 'timeout'));
      if (res.from === getLang(uid)) return m.reply(T(uid, 'alreadyInLang'));
      const embed = new EmbedBuilder()
        .setColor('#00c7ff')
        .setDescription(`${LANGUAGES.find(l => l.value === getLang(uid)).emoji} : ${res.text}`);
      return m.reply({ embeds: [embed] });
    } catch {
      return m.reply('No se pudo traducir el mensaje.');
    }
  }

  if (command === 'chat') {
    if (m.mentions.users.size !== 1) return m.reply('Debes mencionar exactamente a un usuario.');
    const other = m.mentions.users.first();
    if (other.id === uid) return m.reply('No puedes chatear contigo mismo.');
    activeChats.set(m.channel.id, { users: [uid, other.id] });
    const m1 = await m.guild.members.fetch(uid);
    const m2 = await m.guild.members.fetch(other.id);
    const embed = new EmbedBuilder()
      .setTitle('💬 Chat Automático Iniciado')
      .setDescription(`Chat entre **${m1.nickname || m1.user.username}** y **${m2.nickname || m2.user.username}**`)
      .setThumbnail(m1.user.displayAvatarURL({ size: 64 }))
      .setImage(m2.user.displayAvatarURL({ size: 64 }))
      .setColor('#00c7ff')
      .setTimestamp();
    return m.channel.send({ embeds: [embed] });
  }

  if (command === 'dchat') {
    if (m.author.username !== 'flux_fer') return m.reply(T(uid, 'notAuthorized'));
    if (activeChats.has(m.channel.id)) {
      activeChats.delete(m.channel.id);
      return m.reply(T(uid, 'chatDeactivated'));
    }
    return m.reply(T(uid, 'chatNoSession'));
  }
});

client.on('interactionCreate', async (i) => {
  if (!i.isButton()) return;
  const uid = i.user.id;
  const cache = imageSearchCache.get(uid);
  if (!cache) return i.deferUpdate();
  if (i.customId === 'prevImage') {
    if (cache.index > 0) cache.index--;
  } else if (i.customId === 'nextImage') {
    if (cache.index < cache.items.length - 1) cache.index++;
  }
  const img = cache.items[cache.index];
  const embed = new EmbedBuilder()
    .setTitle(`Resultados para: ${cache.query}`)
    .setImage(img.link)
    .setFooter({ text: `Imagen ${cache.index + 1} de ${cache.items.length}` })
    .setColor('#00c7ff');
  await i.update({
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
});

client.login(process.env.DISCORD_TOKEN);