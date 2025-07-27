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
    chatActivated: '💬 Chat de traducción automática ACTIVADO para los usuarios seleccionados.',
    chatDeactivated: '🛑 Chat de traducción automática FINALIZADO.',
    chatNoSession: '❌ No hay chat activo para finalizar.',
    chatSelectUsers: '🌐 Selecciona con quién quieres hablar (tú ya estás incluido):',
    notAuthorized: '⚠️ No eres el usuario autorizado para usar este comando.',
    selectOneUser: '⚠️ Debes seleccionar exactamente un usuario para chatear.',
    noSearchQuery: '❌ Por favor, escribe algo para buscar con /web <texto>.',
    noImagesFound: '❌ No encontré imágenes para esa búsqueda.',
    noActiveSearch: '❌ No hay búsqueda activa para navegar.',
    firstImage: '⚠️ Ya estás en la primera imagen.',
    lastImage: '⚠️ Ya estás en la última imagen.',
  },
  en: {
    mustReply: '⚠️ Use the command by replying to a message.',
    timeout: '⏳ Time ran out. Use the command again.',
    alreadyInLang: '⚠️ Message already in your language.',
    notYours: "⚠️ You can't translate your own language.",
    langSaved: '🎉 Language saved successfully.',
    chatActivated: '💬 Auto-translate chat ACTIVATED for selected users.',
    chatDeactivated: '🛑 Auto-translate chat STOPPED.',
    chatNoSession: '❌ No active chat session to stop.',
    chatSelectUsers: '🌐 Select who you want to chat with (you are included):',
    notAuthorized: '⚠️ You are not authorized to use this command.',
    selectOneUser: '⚠️ You must select exactly one user to chat with.',
    noSearchQuery: '❌ Please type something to search with /web <text>.',
    noImagesFound: '❌ No images found for that search.',
    noActiveSearch: '❌ No active search to navigate.',
    firstImage: '⚠️ You are already at the first image.',
    lastImage: '⚠️ You are already at the last image.',
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

const activeChats = new Map();

const GOOGLE_API_KEY = 'AIzaSyDIrZO_rzRxvf9YvbZK1yPdsj4nrc0nqwY';
const GOOGLE_CX = '34fe95d6cf39d4dd4';
const imageSearchCache = new Map();

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
          }[userLang] ||
          '⚠️ You are not allowed to send invite links due to restricted role. Message deleted.';
        await m.author.send({ content: translatedWarning });
      } catch {}
      return;
    }
  }

  if (m.content.toLowerCase().startsWith('/td')) {
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
      if (res.from === lang)
        return m.reply({ content: T(uid, 'alreadyInLang'), ephemeral: true });
      const e = new EmbedBuilder()
        .setColor('#00c7ff')
        .setDescription(`${LANGUAGES.find((l) => l.value === lang).emoji} : ${res.text}`);
      return m.reply({ embeds: [e], ephemeral: true });
    }
    await loading.delete().catch(() => {});
    const sel = new StringSelectMenuBuilder()
      .setCustomId(`select-${uid}`)
      .setPlaceholder('🌍 Selecciona idioma')
      .addOptions(
        LANGUAGES.map((l) => ({
          label: l.label,
          value: l.value,
          emoji: l.emoji,
        }))
      );
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

  if (m.content.toLowerCase().startsWith('/chat')) {
    const mention = m.mentions.users.first();
    if (!mention) return sendWarning(m, '❌ Debes mencionar al usuario con quien quieres chatear.');
    const user1 = m.author;
    const user2 = mention;
    if (user1.id === user2.id)
      return sendWarning(m, '⚠️ No puedes iniciar un chat contigo mismo.');
    activeChats.set(m.channel.id, { users: [user1.id, user2.id] });
    const member1 = await m.guild.members.fetch(user1.id);
    const member2 = await m.guild.members.fetch(user2.id);
    const embed = new EmbedBuilder()
      .setTitle('💬 Chat Automático Iniciado')
      .setDescription(
        `Chat iniciado entre:\n**${member1.nickname || member1.user.username}** <@${member1.id}>\n**${member2.nickname || member2.user.username}** <@${member2.id}>`
      )
      .setThumbnail(member1.user.displayAvatarURL({ extension: 'png', size: 64 }))
      .setImage(member2.user.displayAvatarURL({ extension: 'png', size: 64 }))
      .setColor('#00c7ff')
      .setTimestamp();
    return m.channel.send({ embeds: [embed] });
  }

  if (m.content.toLowerCase().startsWith('/dchat')) {
    if (m.author.username !== 'flux_fer')
      return sendWarning(m, T(m.author.id, 'notAuthorized'));
    if (activeChats.has(m.channel.id)) {
      activeChats.delete(m.channel.id);
      return m.reply({ content: T(m.author.id, 'chatDeactivated'), ephemeral: true });
    } else {
      return sendWarning(m, T(m.author.id, 'chatNoSession'));
    }
  }

  if (m.content.toLowerCase().startsWith('/web')) {
    const uid = m.author.id;
    const query = m.content.slice(4).trim();
    if (!query) return sendWarning(m, T(uid, 'noSearchQuery'));

    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&searchType=image&q=${encodeURIComponent(
      query
    )}&num=50`;

    try {
      const res = await axios.get(url);
      const items = res.data.items;
      if (!items || items.length === 0) return sendWarning(m, T(uid, 'noImagesFound'));

      imageSearchCache.set(uid, { items, index: 0, query });

      const currentImage = items[0];
      const embed = new EmbedBuilder()
        .setTitle(`Resultados para: ${query}`)
        .setImage(currentImage.link)
        .setFooter({ text: `Imagen 1 de ${items.length}` })
        .setColor('#00c7ff');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prevImage')
          .setLabel('⬅️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('nextImage')
          .setLabel('➡️')
          .setStyle(ButtonStyle.Primary)
      );

      await m.reply({ embeds: [embed], components: [row] });
    } catch (e) {
      return sendWarning(m, 'Error buscando imágenes.');
    }
  }
});

client.on('interactionCreate', async (i) => {
  const uid = i.user.id;

  if (i.isButton()) {
    if (!imageSearchCache.has(uid))
      return i.reply({ content: T(uid, 'noActiveSearch'), ephemeral: true });

    const cache = imageSearchCache.get(uid);
    const { items, index, query } = cache;

    if (i.customId === 'nextImage') {
      if (cache.index < cache.items.length - 1) {
        cache.index++;
        const image = cache.items[cache.index];
        const embed = new EmbedBuilder()
          .setTitle(`Resultados para: ${query}`)
          .setImage(image.link)
          .setFooter({ text: `Imagen ${cache.index + 1} de ${cache.items.length}` })
          .setColor('#00c7ff');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prevImage')
            .setLabel('⬅️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(cache.index === 0),
          new ButtonBuilder()
            .setCustomId('nextImage')
            .setLabel('➡️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(cache.index === cache.items.length - 1)
        );

        await i.update({ embeds: [embed], components: [row] });
      } else if (cache.items.length < 100) {
        const nextStart = cache.items.length + 1;
        const moreUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&searchType=image&q=${encodeURIComponent(
          cache.query
        )}&num=10&start=${nextStart}`;
        try {
          const moreRes = await axios.get(moreUrl);
          const moreItems = moreRes.data.items || [];
          if (moreItems.length === 0) {
            await i.reply({ content: T(uid, 'lastImage'), ephemeral: true });
            return;
          }
          cache.items.push(...moreItems);
          cache.index++;
          const image = cache.items[cache.index];
          const embed = new EmbedBuilder()
            .setTitle(`Resultados para: ${query}`)
            .setImage(image.link)
            .setFooter({ text: `Imagen ${cache.index + 1} de ${cache.items.length}` })
            .setColor('#00c7ff');

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('prevImage')
              .setLabel('⬅️')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(cache.index === 0),
            new ButtonBuilder()
              .setCustomId('nextImage')
              .setLabel('➡️')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(cache.index === cache.items.length - 1)
          );

          await i.update({ embeds: [embed], components: [row] });
        } catch {
          await i.reply({ content: '❌ Error cargando más imágenes.', ephemeral: true });
          return;
        }
      } else {
        await i.reply({ content: T(uid, 'lastImage'), ephemeral: true });
      }
      return;
    }

    if (i.customId === 'prevImage') {
      if (cache.index > 0) {
        cache.index--;
        const image = cache.items[cache.index];
        const embed = new EmbedBuilder()
          .setTitle(`Resultados para: ${query}`)
          .setImage(image.link)
          .setFooter({ text: `Imagen ${cache.index + 1} de ${cache.items.length}` })
          .setColor('#00c7ff');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prevImage')
            .setLabel('⬅️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(cache.index === 0),
          new ButtonBuilder()
            .setCustomId('nextImage')
            .setLabel('➡️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(cache.index === cache.items.length - 1)
        );

        await i.update({ embeds: [embed], components: [row] });
      } else {
        await i.reply({ content: T(uid, 'firstImage'), ephemeral: true });
      }
      return;
    }
  }

  if (i.isStringSelectMenu()) {
    if (i.customId.startsWith('select-')) {
      const [_, uid2] = i.customId.split('-');
      if (uid !== uid2)
        return i.reply({ content: 'No es tu menú.', ephemeral: true });
      const v = i.values[0];
      prefs[uid] = v;
      save();
      await i.update({
        content: `${LANGUAGES.find((l) => l.value === v).emoji} ${T(uid, 'langSaved')}`,
        components: [],
        ephemeral: true,
      });
      const note = await i.followUp({
        content: '🎉 Listo! Usa'.td ahora.',
        ephemeral: true,
      });
      setTimeout(() => note.delete().catch(() => {}), 5000);
      return;
    }
  }
});

client.login(process.env.DISCORD_TOKEN);