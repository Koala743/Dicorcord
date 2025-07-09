const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  EmbedBuilder
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
  { label: 'Español', value: 'es' },
  { label: 'Inglés', value: 'en' },
  { label: 'Francés', value: 'fr' },
  { label: 'Alemán', value: 'de' },
  { label: 'Portugués', value: 'pt' },
  { label: 'Italiano', value: 'it' },
  { label: 'Ruso', value: 'ru' },
  { label: 'Japonés', value: 'ja' },
  { label: 'Coreano', value: 'ko' },
  { label: 'Chino (Simplificado)', value: 'zh-CN' }
];

const translations = {
  es: {
    mustReply: '⚠️ Usa el comando respondiendo a un mensaje.',
    timeout: '⏳ Tiempo agotado. Usa el comando nuevamente.',
    alreadyInLang: '⚠️ El mensaje ya está en tu idioma. No se puede traducir.',
    notYours: '⚠️ No puedes traducir tu propio idioma.',
    translation: '📥 Traducción'
  },
  en: {
    mustReply: '⚠️ Use the command by replying to a message.',
    timeout: '⏳ Time ran out. Use the command again.',
    alreadyInLang: '⚠️ Message is already in your language. Cannot translate.',
    notYours: '⚠️ You cannot translate your own language.',
    translation: '📥 Translation'
  },
  pt: {
    mustReply: '⚠️ Use o comando respondendo a uma mensagem.',
    timeout: '⏳ Tempo esgotado. Use o comando novamente.',
    alreadyInLang: '⚠️ A mensagem já está no seu idioma. Não é possível traduzir.',
    notYours: '⚠️ Você não pode traduzir seu próprio idioma.',
    translation: '📥 Tradução'
  }
};

const LANG_PREFS_FILE = './langPrefs.json';
let userLangPrefs = {};

function loadLangPrefs() {
  try {
    const data = fs.readFileSync(LANG_PREFS_FILE, 'utf-8');
    userLangPrefs = JSON.parse(data);
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
  return translations[lang]?.[key] || translations['es'][key] || key;
}

async function translateText(text, targetLang) {
  try {
    const url = `https://lingva.ml/api/v1/auto/${targetLang}/${encodeURIComponent(text)}`;
    const res = await axios.get(url);
    if (res.data && res.data.translation) return {
      translation: res.data.translation,
      from: res.data.from
    };
    return null;
  } catch {
    return null;
  }
}

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  loadLangPrefs();
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content || !CHANNELS_TO_TRANSLATE.has(message.channel.id)) return;

  if (!message.content.toLowerCase().startsWith('.td')) return;

  if (!message.reference || !message.reference.messageId) {
    await message.reply({ content: t(message.author.id, 'mustReply'), ephemeral: true });
    return;
  }

  const refMsg = await message.channel.messages.fetch(message.reference.messageId);
  const original = refMsg.content;
  const userId = message.author.id;
  const langPref = getUserLang(userId);

  if (userLangPrefs[userId]) {
    const result = await translateText(original, langPref);

    if (!result || result.translation.toLowerCase() === original.toLowerCase()) {
      await message.reply({ content: t(userId, 'alreadyInLang'), ephemeral: true });
      return;
    }

    if (result.from === langPref) {
      await message.reply({ content: t(userId, 'notYours'), ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#00c7ff')
      .setTitle(`${t(userId, 'translation')} (${LANGUAGES.find(l => l.value === langPref)?.label || langPref})`)
      .setDescription(result.translation)
      .setFooter({ text: '🌐 Traductor automático', iconURL: client.user.displayAvatarURL() });

    const rowChangeLang = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`change-lang-${userId}`)
          .setPlaceholder(`🌍 Cambiar idioma`)
          .addOptions(LANGUAGES)
          .setMinValues(1)
          .setMaxValues(1)
      );

    await message.reply({
      embeds: [embed],
      components: [rowChangeLang],
      ephemeral: true
    });
  } else {
    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select-lang-${userId}`)
          .setPlaceholder('🌍 Selecciona el idioma de destino')
          .addOptions(LANGUAGES)
          .setMinValues(1)
          .setMaxValues(1)
      );

    await message.reply({
      content: 'Selecciona el idioma para traducir:',
      components: [row],
      ephemeral: true
    });
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  const userId = interaction.customId.split('-').pop();
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'Este menú no es para ti.', ephemeral: true });
    return;
  }

  if (interaction.customId.startsWith('select-lang-') || interaction.customId.startsWith('change-lang-')) {
    const selectedLang = interaction.values[0];
    userLangPrefs[userId] = selectedLang;
    saveLangPrefs();

    await interaction.update({
      content: `✅ Idioma actualizado a **${LANGUAGES.find(l => l.value === selectedLang)?.label}**.`,
      components: [],
      ephemeral: true
    });
  }
});

client.login(DISCORD_TOKEN);