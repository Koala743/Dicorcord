const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType
} = require('discord.js');
const axios = require('axios');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const CHANNELS = new Set([
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
  { label: 'Chino (Simpl.)', value: 'zh-CN', emoji: '🇨🇳' }
];

const trans = {
  es: {
    mustReply: '⚠️ Usa el comando respondiendo a un mensaje.',
    timeout: '⏳ Tiempo agotado. Usa el comando nuevamente.',
    alreadyInLang: '⚠️ El mensaje ya está en tu idioma.',
    notYours: '⚠️ No puedes traducir tu propio idioma.',
    translationTitle: '📥 Traducción',
    deleteLabel: 'Eliminar mensaje',
    langSaved: '🎉 Idioma guardado exitosamente.',
    enterAmount: 'Por favor ingresa la cantidad de mensajes a eliminar:',
    deleteSuccess: '✅ Mensajes eliminados correctamente.',
    deleteInvalid: '⚠️ Por favor ingresa un número válido entre 1 y 100.'
  },
  en: {
    mustReply: '⚠️ Use the command by replying to a message.',
    timeout: '⏳ Time ran out. Use the command again.',
    alreadyInLang: '⚠️ Message already in your language.',
    notYours: '⚠️ You cannot translate your own language.',
    translationTitle: '📥 Translation',
    deleteLabel: 'Delete message',
    langSaved: '🎉 Language saved successfully.',
    enterAmount: 'Please enter the amount of messages to delete:',
    deleteSuccess: '✅ Messages deleted successfully.',
    deleteInvalid: '⚠️ Please enter a valid number between 1 and 100.'
  }
};

const PREFS = './langPrefs.json';
let prefs = {};

function load() { try { prefs = JSON.parse(fs.readFileSync(PREFS)); } catch { prefs = {}; } }
function save() { fs.writeFileSync(PREFS, JSON.stringify(prefs,null,2)); }
function getLang(u) { return prefs[u] || 'es'; }
function T(u,k) { return trans[getLang(u)][k] || trans['es'][k]; }

async function translate(t, lang) {
  try {
    const r = await axios.get(`https://lingva.ml/api/v1/auto/${lang}/${encodeURIComponent(t)}`);
    if (r.data?.translation) return { text: r.data.translation, from: r.data.from };
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
  load();
});

client.on('messageCreate', async m => {
  if (m.author.bot || !m.content) return;

  const contentLower = m.content.toLowerCase();

  if (contentLower.startsWith('.td')) {
    if (!m.reference?.messageId) return sendWarning(m, T(m.author.id,'mustReply'));
    const ref = await m.channel.messages.fetch(m.reference.messageId);
    const txt = ref.content, uid = m.author.id;
    const loading = await m.reply({ content: '⌛ Traduciendo...', ephemeral: true });
    const lang = getLang(uid);

    if (prefs[uid]) {
      const res = await translate(txt, lang);
      await loading.delete().catch(()=>{});
      if (!res) return sendWarning(m, T(uid,'timeout'));
      if (res.from === lang) return sendWarning(m, T(uid,'alreadyInLang'));

      const e = new EmbedBuilder()
        .setColor('#00c7ff')
        .setTitle(`${LANGUAGES.find(l=>l.value===lang).emoji} ${T(uid,'translationTitle')} (${LANGUAGES.find(l=>l.value===lang).label})`)
        .setDescription(res.text)
        .setFooter({ text: '🌐 Traductor automático' });

      const btn = new ButtonBuilder()
        .setCustomId(`del-${uid}`)
        .setLabel(T(uid,'deleteLabel'))
        .setStyle(ButtonStyle.Danger);

      return m.reply({ embeds:[e], components:[new ActionRowBuilder().addComponents(btn)], ephemeral:true });
    }

    await loading.delete().catch(()=>{});

    const sel = new StringSelectMenuBuilder()
      .setCustomId(`select-${uid}`)
      .setPlaceholder('🌍 Selecciona idioma')
      .addOptions(LANGUAGES.map(l=>({ label:l.label, value:l.value, emoji:l.emoji })));

    m.reply({ content: 'Selecciona idioma para guardar:', components:[new ActionRowBuilder().addComponents(sel)], ephemeral:true });

  } else if (contentLower.startsWith('.dt')) {
    // .DT command: show modal to ask number of messages to delete
    if (!m.reference?.messageId) return sendWarning(m, T(m.author.id, 'mustReply'));

    // Show modal to user
    const modal = new ModalBuilder()
      .setCustomId(`deleteModal-${m.author.id}`)
      .setTitle('Eliminar mensajes');

    const input = new TextInputBuilder()
      .setCustomId('amountInput')
      .setLabel(T(m.author.id, 'enterAmount'))
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('1-100')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await m.channel.sendTyping();
    await m.reply({ content: '📝 Abriendo cuadro para cantidad...', ephemeral: true });
    await m.awaitMessageComponent({ componentType: 'BUTTON', time: 1000 }).catch(() => {});
    return m.client.application?.commands ? await m.client.application.commands : null;

    return m.showModal(modal); // show modal to user, must be from interaction, workaround below
  }
});

// Interaction handler for modal and buttons
client.on('interactionCreate', async interaction => {
  const uid = interaction.user.id;

  if (interaction.isButton()) {
    if (interaction.customId === `del-${uid}`) {
      await interaction.message.delete().catch(() => {});
      return;
    }
  }

  if (interaction.isStringSelectMenu()) {
    const [action, uid2] = interaction.customId.split('-');
    if (uid !== uid2) return interaction.reply({ content: 'No es tu menú.', ephemeral: true });

    const v = interaction.values[0];
    prefs[uid] = v;
    save();

    await interaction.update({ content: `${LANGUAGES.find(l => l.value === v).emoji} ${T(uid,'langSaved')}`, components: [], ephemeral: true });
    const note = await interaction.followUp({ content: '🎉 Listo! Usa `.TD` ahora.', ephemeral: true });
    setTimeout(() => note.delete().catch(() => {}), 5000);
    return;
  }

  if (interaction.type === InteractionType.ModalSubmit) {
    if (interaction.customId === `deleteModal-${uid}`) {
      const amountStr = interaction.fields.getTextInputValue('amountInput');
      const amount = parseInt(amountStr, 10);

      if (isNaN(amount) || amount < 1 || amount > 100) {
        await interaction.reply({ content: T(uid, 'deleteInvalid'), ephemeral: true });
        return;
      }

      // Delete amount messages, including command message
      const fetched = await interaction.channel.messages.fetch({ limit: amount });
      try {
        await interaction.channel.bulkDelete(fetched, true);
        await interaction.reply({ content: T(uid, 'deleteSuccess'), ephemeral: true });
      } catch (e) {
        await interaction.reply({ content: '⚠️ Error al eliminar mensajes.', ephemeral: true });
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);