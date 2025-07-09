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
    if (res.data && res.data.translation) return res.data.translation;
    return null;
  } catch {
    return null;
  }
}

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content || !CHANNELS_TO_TRANSLATE.has(message.channel.id)) return;

  if (!message.content.toLowerCase().startsWith('.td')) return;

  if (!message.reference || !message.reference.messageId) {
    message.reply('⚠️ Usa el comando respondiendo a un mensaje.');
    return;
  }

  const refMsg = await message.channel.messages.fetch(message.reference.messageId);
  const original = refMsg.content;

  const userId = message.author.id;
  const langPref = userLangPrefs.get(userId);

  if (langPref) {
    const translated = await translateText(original, langPref);
    if (!translated || translated.toLowerCase() === original.toLowerCase()) {
      await message.channel.send(`⚠️ No se pudo traducir.`);
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
      content: `📥 **Traducción (${LANGUAGES.find(l => l.value === langPref)?.label || langPref}):** ${translated}`,
      components: [rowChangeLang]
    });
  } else {
    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select-lang-${userId}`)
          .setPlaceholder('Selecciona el idioma de destino')
          .addOptions(LANGUAGES)
          .setMinValues(1)
          .setMaxValues(1)
      );

    const promptMsg = await message.reply({
      content: 'Selecciona el idioma para traducir:',
      components: [row]
    });

    const filter = i => i.user.id === userId && i.customId === `select-lang-${userId}`;

    try {
      const interaction = await promptMsg.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 30000 });

      const selectedLang = interaction.values[0];
      userLangPrefs.set(userId, selectedLang);

      await interaction.deferUpdate();

      const translated = await translateText(original, selectedLang);
      if (!translated || translated.toLowerCase() === original.toLowerCase()) {
        await message.channel.send(`⚠️ No se pudo traducir.`);
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

      await message.channel.send({
        content: `📥 **Traducción (${LANGUAGES.find(l => l.value === selectedLang)?.label || selectedLang}):** ${translated}`,
        components: [rowChangeLang]
      });

    } catch {
      message.reply('⏳ Tiempo agotado. Usa el comando nuevamente.');
    }
  }
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
});

client.login(DISCORD_TOKEN);