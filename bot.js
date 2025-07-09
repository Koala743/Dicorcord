const { 
  Client, 
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  Events,
  RESTPostAPIApplicationCommandsJSONBody
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

const userLangPrefs = new Map(); // userId => langCode

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
  { label: 'Chino (Simplificado)', value: 'zh-CN' },
  // agrega más si quieres
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
  if (
    message.author.bot || 
    !message.content || 
    !CHANNELS_TO_TRANSLATE.has(message.channel.id)
  ) return;

  if (!message.content.toLowerCase().startsWith('.td')) return;

  if (!message.reference || !message.reference.messageId) {
    message.reply('⚠️ Por favor usa el comando respondiendo a un mensaje.');
    return;
  }

  const langPref = userLangPrefs.get(message.author.id) || 'es';

  const row = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`select-lang-${message.author.id}`)
        .setPlaceholder('Selecciona el idioma de destino')
        .addOptions(LANGUAGES)
        .setMinValues(1)
        .setMaxValues(1)
    );

  const promptMsg = await message.reply({
    content: 'Selecciona el idioma al que quieres traducir el mensaje:',
    components: [row]
  });

  const filter = i => i.user.id === message.author.id && i.customId === `select-lang-${message.author.id}`;

  try {
    const interaction = await promptMsg.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 30000 });

    const targetLang = interaction.values[0];
    userLangPrefs.set(message.author.id, targetLang);

    await interaction.deferUpdate();

    const refMsg = await message.channel.messages.fetch(message.reference.messageId);
    const original = refMsg.content;

    const translated = await translateText(original, targetLang);

    if (!translated || translated.toLowerCase() === original.toLowerCase()) {
      await message.channel.send(`⚠️ No se pudo traducir o el texto ya está en el idioma seleccionado.`);
      return;
    }

    const rowChangeLang = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`change-lang-${message.author.id}`)
          .setPlaceholder(`Idioma actual: ${LANGUAGES.find(l => l.value === targetLang)?.label || targetLang}. Cambiar idioma`)
          .addOptions(LANGUAGES)
          .setMinValues(1)
          .setMaxValues(1)
      );

    await message.channel.send({
      content: `📥 **Traducción (${LANGUAGES.find(l => l.value === targetLang)?.label || targetLang}):** ${translated}`,
      components: [rowChangeLang]
    });

  } catch {
    message.reply('⏳ Tiempo de selección agotado. Por favor usa el comando nuevamente.');
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
    const targetLang = interaction.values[0];
    userLangPrefs.set(userId, targetLang);

    await interaction.update({ content: `Idioma cambiado a **${LANGUAGES.find(l => l.value === targetLang)?.label || targetLang}**. Usa .TD en respuesta para traducir mensajes.`, components: [] });
  }
});

client.login(DISCORD_TOKEN);