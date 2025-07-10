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
    mustReply: '⚠️ Usa el comando respondiendo a un mensaje.',
    timeout: '⏳ Tiempo agotado. Usa el comando nuevamente.',
    alreadyInLang: '⚠️ El mensaje ya está en tu idioma.',
    notYours: '⚠️ No puedes traducir tu propio idioma.',
    langSaved: '🎉 Idioma guardado exitosamente.',
    dtSuccess: '✅ Mensajes eliminados exitosamente.',
    dtFail: '❌ No se pudo eliminar mensajes. ¿Tengo permisos?',
    dtChannelNotAllowed: '⚠️ No puedes usar `.DT` en este canal.',
    dtChooseAmount: '🗑️ Selecciona la cantidad de mensajes a eliminar:',
    noPermDT: '⚠️ Solo el usuario **flux_fer** puede usar este comando.',
  },
  en: {
    mustReply: '⚠️ Use the command by replying to a message.',
    timeout: '⏳ Time ran out. Use the command again.',
    alreadyInLang: '⚠️ Message already in your language.',
    notYours: '⚠️ You cannot translate your own language.',
    langSaved: '🎉 Language saved successfully.',
    dtSuccess: '✅ Messages deleted successfully.',
    dtFail: '❌ Could not delete messages. Do I have permissions?',
    dtChannelNotAllowed: '⚠️ You cannot use `.DT` in this channel.',
    dtChooseAmount: '🗑️ Select the amount of messages to delete:',
    noPermDT: '⚠️ Only user **flux_fer** can use this command.',
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
  return trans[getLang(u)][k] || trans['es'][k];
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

client.on('messageCreate', async (m) => {
  if (m.author.bot || !m.content) return;

  // 🔒 Bloqueo de invitaciones por rol
  const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/)/i;
  const restrictedRole = '1244039798696710211';
  const allowedRoles = new Set([
    '1244056080825454642',
    '1305327128341905459',
    '1244039798696710212',
  ]);

  if (inviteRegex.test(m.content) && m.member) {
    const hasRestricted = m.member.roles.cache.has(restrictedRole);
    const hasAllowed = m.member.roles.cache.some(r => allowedRoles.has(r.id));

    if (hasRestricted && !hasAllowed) {
      try {
        await m.delete();
        await m.author.send({
          content: `⚠️ Tu mensaje que contenía un enlace de invitación de Discord fue eliminado automáticamente porque tienes un rol restringido.`,
        });
        console.log(`🛑 Invitación eliminada de ${m.author.tag}`);
      } catch (err) {
        console.warn(`❌ No se pudo eliminar o enviar DM a ${m.author.tag}:`, err.message);
      }
      return;
    }
  }

  const content = m.content.trim();

  if (content.toLowerCase().startsWith('.dt')) {
    if (m.author.username !== 'flux_fer') {
      return sendWarning(m, T(m.author.id, 'noPermDT'));
    }

    const uid = m.author.id;

    const buttons = [5, 10, 25, 50, 100, 200, 300, 400].map((num) =>
      new ButtonBuilder()
        .setCustomId(`delAmount-${uid}-${num}`)
        .setLabel(num.toString())
        .setStyle('Secondary')
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    return m.reply({
      content: T(uid, 'dtChooseAmount'),
      components: rows,
      ephemeral: true,
    });
  }

  if (content.toLowerCase().startsWith('.td')) {
    if (!CHANNELS.has(m.channel.id)) return;

    if (!m.reference?.messageId) return sendWarning(m, T(m.author.id, 'mustReply'));

    const ref = await m.channel.messages.fetch(m.reference.messageId);
    const txt = ref.content,
      uid = m.author.id;

    const loading = await m.reply({ content: '⌛ Traduciendo...', ephemeral: true });

    const lang = getLang(uid);
    if (prefs[uid]) {
      const res = await translate(txt, lang);
      await loading.delete().catch(() => {});
      if (!res) return m.reply({ content: T(uid, 'timeout'), ephemeral: true });
      if (res.from === lang) return m.reply({ content: T(uid, 'alreadyInLang'), ephemeral: true });

      const e = new EmbedBuilder()
        .setColor('#00c7ff')
        .setDescription(`${LANGUAGES.find((l) => l.value === lang).emoji} : ${res.text}`);

      return m.reply({ embeds: [e], ephemeral: true });
    }

    await loading.delete().catch(() => {});

    const sel = new StringSelectMenuBuilder()
      .setCustomId(`select-${uid}`)
      .setPlaceholder('🌍 Selecciona idioma')
      .addOptions(LANGUAGES.map((l) => ({ label: l.label, value: l.value, emoji: l.emoji })));

    m.reply({
      content: 'Selecciona idioma para guardar:',
      components: [new ActionRowBuilder().addComponents(sel)],
      ephemeral: true,
    });
  }
});

client.on('interactionCreate', async (i) => {
  const uid = i.user.id;

  if (i.isButton()) {
    if (i.customId.startsWith(`delAmount-${uid}-`)) {
      const amount = parseInt(i.customId.split('-')[2], 10);
      try {
        await i.deferReply({ ephemeral: true });
        await i.channel.bulkDelete(amount + 1, true);
        await i.editReply({ content: T(uid, 'dtSuccess') });
      } catch {
        await i.editReply({ content: T(uid, 'dtFail') });
      }
      return;
    }
  }

  if (!i.isStringSelectMenu()) return;
  const [_, uid2] = i.customId.split('-');
  if (uid !== uid2) return i.reply({ content: 'No es tu menú.', ephemeral: true });

  const v = i.values[0];
  prefs[uid] = v;
  save();
  await i.update({
    content: `${LANGUAGES.find((l) => l.value === v).emoji} ${T(uid, 'langSaved')}`,
    components: [],
    ephemeral: true,
  });

  const note = await i.followUp({ content: '🎉 Listo! Usa `.TD` ahora.', ephemeral: true });
  setTimeout(() => note.delete().catch(() => {}), 5000);
});

client.login(process.env.DISCORD_TOKEN);