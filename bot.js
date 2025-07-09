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
    langSaved: '🎉 Idioma guardado exitosamente.'
  },
  en: {
    mustReply: '⚠️ Use the command by replying to a message.',
    timeout: '⏳ Time ran out. Use the command again.',
    alreadyInLang: '⚠️ Message already in your language.',
    notYours: '⚠️ You cannot translate your own language.',
    translationTitle: '📥 Translation',
    deleteLabel: 'Delete message',
    langSaved: '🎉 Language saved successfully.'
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

client.once('ready', () => { load(); });

client.on('messageCreate', async m => {
  if (m.author.bot || !m.content || !CHANNELS.has(m.channel.id)) return;
  if (!m.content.toLowerCase().startsWith('.td')) return;

  if (!m.reference?.messageId) return m.reply({ content: T(m.author.id,'mustReply'), ephemeral: true });

  const ref = await m.channel.messages.fetch(m.reference.messageId);
  const txt = ref.content, uid = m.author.id;

  const loading = await m.reply({ content: '⌛ Traduciendo...', ephemeral: true });

  const lang = getLang(uid);
  if (prefs[uid]) {
    const res = await translate(txt, lang);
    await loading.delete().catch(()=>{});
    if (!res) return m.reply({ content: T(uid,'timeout'), ephemeral: true });
    if (res.from === lang) return m.reply({ content: T(uid,'alreadyInLang'), ephemeral: true });

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
});

client.on('interactionCreate', async i => {
  const uid = i.user.id;

  if (i.isButton() && i.customId === `del-${uid}`) {
    await i.message.delete().catch(()=>{});
    return;
  }

  if (!i.isStringSelectMenu()) return;
  const [ _, uid2 ] = i.customId.split('-');
  if (uid !== uid2) return i.reply({ content:'No es tu menú.', ephemeral:true });

  const v = i.values[0];
  prefs[uid] = v; save();
  await i.update({ content:`${LANGUAGES.find(l=>l.value===v).emoji} ${T(uid,'langSaved')}`, components:[], ephemeral:true });

  const note = await i.followUp({ content: '🎉 Listo! Usa `.TD` ahora.', ephemeral:true });
  setTimeout(() => note.delete().catch(()=>{}), 5000);
});

client.login(process.env.DISCORD_TOKEN);