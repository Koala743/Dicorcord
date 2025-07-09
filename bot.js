const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType
} = require('discord.js');
const axios = require('axios');

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

const userLangPrefs = new Map();

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

async function translateText(text, targetLang) {
  try {
    const url = `https://lingva.ml/api/v1/auto/${targetLang}/${encodeURIComponent(text)}`;
    const res = await axios.get(url);
    if (res.data && res.data.translation) return { translated: res.data.translation, detected: res.data.info?.detectedLanguage?.code };
    return null;
  } catch {
    return null;
  }
}

async function sendTranslatedWarning(channel, userId, text) {
  const lang = userLangPrefs.get(userId) || 'es';
  const result = await translateText(text, lang);
  const msg = await channel.send(result?.translated || text);
  setTimeout(() => msg.delete().catch(() => {}), 5000);
}

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content || !CHANNELS_TO_TRANSLATE.has(message.channel.id)) return;
  if (!message.content.toLowerCase().startsWith('.td')) return;

  if (!message.reference || !message.reference.messageId) {
    await sendTranslatedWarning(message.channel, message.author.id, '⚠️ Usa el comando respondiendo a un mensaje.');
    return;
  }

  const refMsg = await message.channel.messages.fetch(message.reference.messageId);
  const original = refMsg.content;

  const userId = message.author.id;
  const langPref = userLangPrefs.get(userId) || 'es';

  const result = await translateText(original, langPref);
  if (!result || !result.translated) {
    await sendTranslatedWarning(message.channel, userId, '⚠️ No se pudo traducir.');
    return;
  }

  if (result.detected && result.detected.toLowerCase() === langPref.toLowerCase()) {
    await sendTranslatedWarning(message.channel, userId, '⚠️ No se puede traducir a tu propio idioma. Selecciona uno diferente.');
    return;
  }

  const rowChangeLang = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`change-lang-${userId}`)
        .setPlaceholder(`Idioma actual: ${LANGUAGES.find(l => l.value === langPref)?.label || langPref}`)
        .addOptions(LANGUAGES)
        .setMinValues(1)
        .setMaxValues(1)
    );

  await message.channel.send({
    content: `📥 **Traducción (${LANGUAGES.find(l => l.value === langPref)?.label || langPref}):** ${result.translated}`,
    components: [rowChangeLang]
  });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  const userId = interaction.customId.split('-').pop();
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'Este menú no es para ti.', ephemeral: true });
    return;
  }

  if (interaction.customId.startsWith('change-lang-')) {
    const newLang = interaction.values[0];
    userLangPrefs.set(userId, newLang);

    await interaction.update({
      content: `✅ Idioma actualizado a **${LANGUAGES.find(l => l.value === newLang)?.label || newLang}**.`,
      components: []
    });
  }

  if (interaction.customId.startsWith('select-lang-')) {
    const selectedLang = interaction.values[0];
    userLangPrefs.set(userId, selectedLang);

    await interaction.deferUpdate();

    const message = await interaction.channel.messages.fetch(interaction.message.reference.messageId);
    const original = message.content;

    const result = await translateText(original, selectedLang);
    if (!result || !result.translated) {
      await sendTranslatedWarning(interaction.channel, userId, '⚠️ No se pudo traducir.');
      return;
    }

    if (result.detected && result.detected.toLowerCase() === selectedLang.toLowerCase()) {
      await sendTranslatedWarning(interaction.channel, userId, '⚠️ No se puede traducir a tu propio idioma. Selecciona uno diferente.');
      return;
    }

    const rowChangeLang = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`change-lang-${userId}`)
          .setPlaceholder(`Idioma actual: ${LANGUAGES.find(l => l.value === selectedLang)?.label || selectedLang}`)
          .addOptions(LANGUAGES)
          .setMinValues(1)
          .setMaxValues(1)
      );

    await interaction.channel.send({
      content: `📥 **Traducción (${LANGUAGES.find(l => l.value === selectedLang)?.label || selectedLang}):** ${result.translated}`,
      components: [rowChangeLang]
    });
  }
});

client.login(DISCORD_TOKEN);