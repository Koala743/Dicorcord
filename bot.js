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
    dtChooseAmount: '🗑️ Selecciona la cantidad de mensajes a eliminar:',
    noPermDT: '⚠️ Solo el usuario **flux_fer** puede usar este comando.',
    chatActivated: '💬 Chat de traducción automática ACTIVADO para los usuarios seleccionados.',
    chatDeactivated: '🛑 Chat de traducción automática FINALIZADO.',
    chatNoSession: '❌ No hay chat activo para finalizar.',
    chatSelectUsers: '🌐 Selecciona con quién quieres hablar (tú ya estás incluido):',
    notAuthorized: '⚠️ No eres el usuario autorizado para usar este comando.',
    selectOneUser: '⚠️ Debes seleccionar exactamente un usuario para chatear.',
  },
  en: {
    mustReply: '⚠️ Use the command by replying to a message.',
    timeout: '⏳ Time ran out. Use the command again.',
    alreadyInLang: '⚠️ Message already in your language.',
    notYours: "⚠️ You can't translate your own language.",
    langSaved: '🎉 Language saved successfully.',
    dtSuccess: '✅ Messages deleted successfully.',
    dtFail: "❌ Couldn't delete messages. Do I have permissions?",
    dtChooseAmount: '🗑️ Select the amount of messages to delete:',
    noPermDT: '⚠️ Only user **flux_fer** can use this command.',
    chatActivated: '💬 Auto-translate chat ACTIVATED for selected users.',
    chatDeactivated: '🛑 Auto-translate chat STOPPED.',
    chatNoSession: '❌ No active chat session to stop.',
    chatSelectUsers: '🌐 Select who you want to chat with (you are included):',
    notAuthorized: '⚠️ You are not authorized to use this command.',
    selectOneUser: '⚠️ You must select exactly one user to chat with.',
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
  return trans[getLang(u)]?.[k] || trans['es'][k];
}

async function translate(t, lang) {
  try {
    const r = await axios.get(
      `https://lingva.ml/api/v1/auto/${lang}/${encodeURIComponent(t)}`
    );
    if (r.data?.translation)
      return { text: r.data.translation, from: r.data.from };
  } catch {}
  return null;
}

async function sendWarning(interactionOrMessage, text) {
  const reply = await interactionOrMessage.reply({ content: text, ephemeral: true });
  setTimeout(() => {
    if (reply?.delete) reply.delete().catch(() => {});
  }, 5000);
}

const activeChats = new Map();
const activeIASessions = new Map();

const SYSTEM_GOKI_INSTRUCTION = `
Eres Goki, una mujer inteligente, amable y simpática. Respondes con conocimiento, paciencia y buen humor.
Explica cosas claramente y sé amigable.
`;

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  load();
});

client.on('messageCreate', async (m) => {
  if (m.author.bot || !m.content) return;

  const inviteRegex = /(discord.gg\/|discord.com\/invite\/)/i;
  const restrictedRole = '1244039798696710211';
  const allowedRoles = new Set([
    '1244056080825454642',
    '1305327128341905459',
    '1244039798696710212',
  ]);

  if (inviteRegex.test(m.content) && m.member) {
    const hasRestricted = m.member.roles.cache.has(restrictedRole);
    const hasAllowed = m.member.roles.cache.some((r) => allowedRoles.has(r.id));
    if (hasRestricted && !hasAllowed) {
      try {
        await m.delete();
        const uid = m.author.id;
        const userLang = getLang(uid);
        const translatedWarning =
          {
            es: '⚠️ No podés enviar enlaces de invitación porque tenés el rol de **Miembro**, el cual está restringido. Tu mensaje fue eliminado automáticamente.',
            en: '⚠️ You are not allowed to send invite links because you have the **Member** role, which is restricted. Your message was automatically deleted.',
            pt: '⚠️ Você não pode enviar links de convite porque possui o cargo de **Membro**, que é restrito. Sua mensagem foi excluída automaticamente.',
            fr: '⚠️ Vous ne pouvez pas envoyer de liens d\'invitation car vous avez le rôle de **Membre**, qui est restreint. Votre message a été supprimé automatiquement.',
            de: '⚠️ Du darfst keine Einladungslinks senden, da du die **Mitglied**-Rolle hast, die eingeschränkt ist. Deine Nachricht wurde automatisch gelöscht.',
          }[userLang] || '⚠️ You are not allowed to send invite links due to restricted role. Message deleted.';

        await m.author.send({ content: translatedWarning });
      } catch {}
      return;
    }
  }

  if (m.content.toLowerCase().startsWith('.dt')) {
    if (m.author.username !== 'flux_fer') {
      return sendWarning(m, T(m.author.id, 'noPermDT'));
    }
    const uid = m.author.id;
    const buttons = [5, 10, 25, 50, 100, 200, 300, 400].map((num) =>
      new ButtonBuilder()
        .setCustomId(`delAmount-${uid}-${num}`)
        .setLabel(num.toString())
        .setStyle(ButtonStyle.Secondary)
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

  if (m.content.toLowerCase().startsWith('.td')) {
    if (!CHANNELS.has(m.channel.id)) return sendWarning(m, T(m.author.id, 'mustReply'));
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

  const chat = activeChats.get(m.channel.id);
  if (chat) {
    const { users } = chat;
    if (users.includes(m.author.id)) {
      const otherUserId = users.find((u) => u !== m.author.id);
      const fromLang = getLang(m.author.id);
      const toLang = getLang(otherUserId);

      const raw = m.content.trim();

      if (
        !raw ||
        m.stickers.size > 0 ||
        /^<a?:.+?:\d+>$/.test(raw) ||
        /^(\p{Emoji_Presentation}|\p{Emoji})+$/u.test(raw) ||
        /^\.\w{1,4}$/i.test(raw)
      )
        return;

      if (fromLang !== toLang) {
        const res = await translate(raw, toLang);
        if (res && res.text) {
          m.channel.send({
            content: `${LANGUAGES.find((l) => l.value === toLang)?.emoji || ''} **Traducción para <@${otherUserId}>:** ${res.text}`,
          });
        }
      }
    }
  }

  if (m.content.toLowerCase() === '.ia') {
    if (activeIASessions.has(m.channel.id)) {
      if (activeIASessions.get(m.channel.id).userId === m.author.id) {
        return m.reply('🟢 Ya tienes la sesión de IA activa en este canal.');
      } else {
        return m.reply('⚠️ Ya hay una sesión activa con otro usuario en este canal.');
      }
    }
    activeIASessions.set(m.channel.id, {
      userId: m.author.id,
      history: [{ role: 'system', content: SYSTEM_GOKI_INSTRUCTION }],
    });
    return m.reply('🤖 Sesión de IA activada. ¡Habla conmigo cuando quieras!');
  }

  if (m.content.toLowerCase() === '.finia') {
    const session = activeIASessions.get(m.channel.id);
    if (!session || session.userId !== m.author.id) {
      return m.reply('⚠️ No tienes una sesión de IA activa en este canal.');
    }
    activeIASessions.delete(m.channel.id);
    return m.reply('🛑 Sesión de IA finalizada. ¡Hasta luego!');
  }

  const session = activeIASessions.get(m.channel.id);
  if (session && session.userId === m.author.id) {
    session.history.push({ role: 'user', content: m.content.trim() });

    const contents = session.history.map((m) => ({
      parts: [{ text: `${m.role === 'user' ? 'Usuario' : m.role}: ${m.content}` }],
    }));

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyA0uaisYn1uS0Eb-18cdUNmdWDvYkWi260`,
        { contents },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No entendí bien, ¿puedes repetir?';

      session.history.push({ role: 'assistant', content: aiResponse });

      m.reply(aiResponse);
    } catch {
      m.reply('❌ Hubo un error al conectar con la IA. Intenta más tarde.');
    }
    return;
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

  if (i.isStringSelectMenu()) {
    if (i.customId.startsWith('select-')) {
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
      return;
    }
  }
});

client.login(process.env.DISCORD_TOKEN);