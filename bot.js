const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType
} = require('discord.js');
const axios = require('axios');
const fs = require('fs');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const CHANNELS_TO_TRANSLATE = new Set([
  '1381953561008541920',
  '1386131661942554685',
  '1299860715884249088'
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
  { label: 'Chino (Simplificado)', value: 'zh-CN', emoji: '🇨🇳' }
];

const translations = {
  es: {
    mustReply: '⚠️ Usa el comando respondiendo a un mensaje.',
    timeout: '⏳ Tiempo agotado. Usa el comando nuevamente.',
    alreadyInLang: '⚠️ El mensaje ya está en tu idioma. No se puede traducir.',
    notYours: '⚠️ No puedes traducir tu propio idioma.',
    translationTitle: '📥 Traducción',
    deleteLabel: 'Eliminar mensaje',
    langSaved: '✅ Idioma guardado exitosamente.'
  },
  en: {
    mustReply: '⚠️ Use the command by replying to a message.',
    timeout: '⏳ Time ran out. Use the command again.',
    alreadyInLang: '⚠️ Message is already in your language. Cannot translate.',
    notYours: '⚠️ You cannot translate your own language.',
    translationTitle: '📥 Translation',
    deleteLabel: 'Delete message',
    langSaved: '✅ Language saved successfully.'
  }
};

const LANG_PREFS_FILE = './langPrefs.json';
let userLangPrefs = {};

function loadLangPrefs() {
  try {
    userLangPrefs = JSON.parse(fs.readFileSync(LANG_PREFS_FILE, 'utf-8'));
  } catch {
    userLangPrefs = {};
  }
}

function saveLangPrefs() {
  fs.writeFileSync(LANG_PREFS_FILE, JSON.stringify(userLangPrefs, null, 2));
}

function getUserLang(userId) {
  return userLangPrefs[userId] || 'es';
}

function t(userId, key) {
  const lang = getUserLang(userId);
  return translations[lang]?.[key] || translations['es'][key];
}

async function translateText(text, targetLang) {
  try {
    const url = `https://lingva.ml/api/v1/auto/${targetLang}/${encodeURIComponent(text)}`;
    const res = await axios.get(url);
    if (res.data?.translation) return { text: res.data.translation, from: res.data.from };
  } catch {}
  return null;
}

async function sendWarning(interactionOrMessage, text) {
  const reply = await interactionOrMessage.reply({ content: text, ephemeral: true });
  setTimeout(() => {
    if (reply?.delete) reply.delete().catch(() => {});
  }, 5000);
}

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  loadLangPrefs();
});

client.on('messageCreate', async msg => {
  if (msg.author.bot || !msg.content || !CHANNELS_TO_TRANSLATE.has(msg.channel.id)) return;
  if (!msg.content.toLowerCase().startsWith('.td')) return;

  if (!msg.reference?.messageId) return sendWarning(msg, t(msg.author.id, 'mustReply'));

  const ref = await msg.channel.messages.fetch(msg.reference.messageId);
  const original = ref.content;
  const uid = msg.author.id;
  const langPref = getUserLang(uid);

  if (userLangPrefs[uid]) {
    const res = await translateText(original, langPref);
    if (!res || res.text.toLowerCase() === original.toLowerCase()) {
      return sendWarning(msg, t(uid, 'alreadyInLang'));
    }
    if (res.from === langPref) {
      return sendWarning(msg, t(uid, 'notYours'));
    }

    const embed = new EmbedBuilder()
      .setColor('#00c7ff')
      .setTitle(`${LANGUAGES.find(l=>l.value===langPref)?.emoji} ${t(uid,'translationTitle')} (${LANGUAGES.find(l=>l.value===langPref).label})`)
      .setDescription(res.text)
      .setFooter({ text: '🌐 Traductor automático', iconURL: client.user.displayAvatarURL() });

    const btnDel = new ButtonBuilder()
      .setCustomId(`del-${uid}`)
      .setLabel(t(uid, 'deleteLabel'))
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(btnDel);

    return msg.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`select-lang-${uid}`)
    .setPlaceholder('🌍 Selecciona idioma de traducción')
    .addOptions(LANGUAGES.map(l => ({
      label: l.label,
      value: l.value,
      emoji: l.emoji
    })));

  const row = new ActionRowBuilder().addComponents(select);
  return msg.reply({ content: 'Selecciona idioma para guardar:', components: [row], ephemeral: true });
});

client.on('interactionCreate', async i => {
  const uid = i.user.id;

  if (i.isButton() && i.customId === `del-${uid}`) {
    await i.message.delete().catch(() => {});
    return;
  }

  if (!i.isStringSelectMenu()) return;
  const [action, , userId] = i.customId.split('-');
  if (userId !== uid) return i.reply({ content: 'Este menú no es para ti.', ephemeral: true });

  if (action === 'select' || action === 'change') {
    const sel = i.values[0];
    userLangPrefs[uid] = sel;
    saveLangPrefs();

    const emoji = LANGUAGES.find(l => l.value === sel)?.emoji || '🌍';

    await i.update({
      content: `${emoji} ${t(uid, 'langSaved')}`,
      components: [],
      ephemeral: true
    });

    const msg = await i.followUp({ content: '🎉 Idioma listo. Usa `.TD` para traducir.', ephemeral: true });
    setTimeout(() => msg.delete().catch(() => {}), 5000);
  }
});

client.login(DISCORD_TOKEN);