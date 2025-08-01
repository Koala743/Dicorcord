const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const LANGUAGES = [
  { label: 'Español', value: 'es', emoji: '🇪🇸' },
  { label: 'Inglés', value: 'en', emoji: '🇬🇧' },
  { label: 'Francés', value: 'fr', emoji: '🇫🇷' },
  { label: 'Alemán', value: 'de', emoji: '🇩🇪' },
  { label: 'Portugués', value: 'pt', emoji: '🇵🇹' },
  { label: 'Italiano', value: 'it', emoji: '🇮🇹' },
  { label: 'Ruso', value: 'ru', emoji: '🇷🇺' },
  { label: 'Japonés', value: 'ja', emoji: '🇯🇵' },
  { label: 'Chino (Simpl.)', value: 'zh-CN', emoji: '🇨🇳' },
  { label: 'Coreano', value: 'ko', emoji: '🇰🇷' },
  { label: 'Árabe', value: 'ar', emoji: '🇸🇦' },
  { label: 'Hindi', value: 'hi', emoji: '🇮🇳' }
];

const trans = {
  es: {
    mustReply: '⚠️ Usa el comando con un mensaje válido.',
    timeout: '⏳ Tiempo agotado. Usa el comando nuevamente.',
    alreadyInLang: '⚠️ El mensaje ya está en tu idioma.',
    notAuthorized: '⚠️ No eres el usuario autorizado.',
    noSearchQuery: '⚠️ Debes proporcionar texto para buscar.',
    noValidImages: '❌ No se encontraron imágenes válidas.',
    chatDeactivated: '🛑 Chat automático desactivado.'
  }
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
  return trans.es[k] || '';
}

async function isImageUrlValid(url) {
  try {
    const res = await axios.head(url, { timeout: 5000 });
    const contentType = res.headers['content-type'];
    return res.status === 200 && contentType && contentType.startsWith('image/');
  } catch {
    return false;
  }
}
async function translate(text, lang) {
  try {
    const r = await axios.get(`https://lingva.ml/api/v1/auto/${lang}/${encodeURIComponent(text)}`);
    return r.data?.translation ? { text: r.data.translation, from: r.data.from } : null;
  } catch {
    return null;
  }
}

async function askLangSelect(message) {
  const select = new StringSelectMenuBuilder()
    .setCustomId('selectLang')
    .setPlaceholder('🌐 Selecciona tu idioma preferido')
    .addOptions(LANGUAGES.map(lang => ({
      label: lang.label,
      value: lang.value,
      emoji: lang.emoji
    })));

  const row = new ActionRowBuilder().addComponents(select);
  await message.reply({
    content: '🌍 Por favor selecciona tu idioma:',
    components: [row]
  });
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

  const chat = activeChats.get(m.channel.id);
  if (chat && chat.users.includes(m.author.id)) {
    const otherId = chat.users.find(id => id !== m.author.id);
    const otherLang = getLang(otherId);
    const senderLang = getLang(m.author.id);
    const toOther = await translate(m.content, otherLang);
    const toSender = await translate(m.content, senderLang);

    if (toOther && toSender) {
      const author = await m.guild.members.fetch(m.author.id);
      const embedForOther = new EmbedBuilder()
        .setAuthor({ name: `${author.displayName}`, iconURL: author.user.displayAvatarURL() })
        .setDescription(`💬 ${toOther.text}`)
        .setColor('#00c7ff')
        .setFooter({ text: `Traducido a ${LANGUAGES.find(l => l.value === otherLang).label}` })
        .setTimestamp();

      const embedForSender = new EmbedBuilder()
        .setAuthor({ name: `Tú (${author.displayName})`, iconURL: author.user.displayAvatarURL() })
        .setDescription(`✉️ ${toSender.text}`)
        .setColor('#cccccc')
        .setFooter({ text: `Traducido a tu idioma: ${LANGUAGES.find(l => l.value === senderLang).label}` })
        .setTimestamp();

      const otherMention = `<@${otherId}>`;
      await m.channel.send({ content: otherMention, embeds: [embedForOther] });
      if (m.author.id !== client.user.id) {
        await m.channel.send({ content: `<@${m.author.id}>`, embeds: [embedForSender] });
      }
    }
  }

  if (!m.content.startsWith('.')) return;
  const [command, ...args] = m.content.slice(1).trim().split(/ +/);

  if (command === 'td') {
    if (!m.reference?.messageId) return m.reply(T(m.author.id, 'mustReply'));
    if (!prefs[m.author.id]) return askLangSelect(m);
    try {
      const ref = await m.channel.messages.fetch(m.reference.messageId);
      const res = await translate(ref.content, getLang(m.author.id));
      if (!res) return m.reply(T(m.author.id, 'timeout'));
      if (res.from === getLang(m.author.id)) return m.reply(T(m.author.id, 'alreadyInLang'));

      const embed = new EmbedBuilder()
        .setColor('#00c7ff')
        .setDescription(`${LANGUAGES.find(l => l.value === getLang(m.author.id)).emoji} : ${res.text}`);
      return m.reply({ embeds: [embed] });
    } catch {
      return m.reply('❌ No se pudo traducir el mensaje.');
    }
  }

  if (command === 'idioma') {
    return askLangSelect(m);
  }

  if (command === 'chat') {
    if (m.mentions.users.size !== 1) return m.reply('Debes mencionar exactamente a un usuario.');
    const other = m.mentions.users.first();
    if (other.id === m.author.id) return m.reply('No puedes chatear contigo mismo.');

    activeChats.set(m.channel.id, { users: [m.author.id, other.id] });

    const m1 = await m.guild.members.fetch(m.author.id);
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
    if (m.author.username !== 'flux_fer') return m.reply(T(m.author.id, 'notAuthorized'));
    if (activeChats.has(m.channel.id)) {
      activeChats.delete(m.channel.id);
      return m.reply(T(m.author.id, 'chatDeactivated'));
    }
    return m.reply(T(m.author.id, 'mustReply'));
  }
});

client.on('interactionCreate', async (i) => {
  if (i.isStringSelectMenu() && i.customId === 'selectLang') {
    const selectedLang = i.values[0];
    prefs[i.user.id] = selectedLang;
    save();
    await i.update({
      content: `✅ Idioma guardado: ${LANGUAGES.find(l => l.value === selectedLang).label}`,
      components: []
    });
  }
});

client.login(process.env.DISCORD_TOKEN);