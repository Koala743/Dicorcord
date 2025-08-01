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
    noSearchQuery: '⚠️ Debes escribir algo para buscar.',
    noValidImages: '❌ No se encontraron imágenes válidas.',
    sameLanguage: '⚠️ Ambos usuarios tienen el mismo idioma, no se inició el chat.',
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
    noSearchQuery: '⚠️ You must provide a search query.',
    noValidImages: '❌ No valid images found.',
    sameLanguage: '⚠️ Both users have the same language, chat not started.',
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

async function isImageUrlValid(url) {
  try {
    const res = await axios.head(url, { timeout: 5000 });
    const contentType = res.headers['content-type'];
    return res.status === 200 && contentType && contentType.startsWith('image/');
  } catch {
    return false;
  }
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
const imageSearchCache = new Map();

const GOOGLE_API_KEY = 'AIzaSyDIrZO_rzRxvf9YvbZK1yPdsj4nrc0nqwY';
const GOOGLE_CX = '34fe95d6cf39d4dd4';

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  load();
});

client.on('messageCreate', async (m) => {
  if (m.author.bot || !m.content) return;

  // Manejo de invitaciones
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

 
  const chat = activeChats.get(m.channel.id);
if (chat) {
  const { users } = chat;
  if (users.includes(m.author.id)) {
    const otherUserId = users.find((u) => u !== m.author.id);
    const toLang = getLang(otherUserId);
    const raw = m.content.trim();
    try {
      const res = await translate(raw, toLang);
      if (res && res.text) {
        const targetLangEmoji = LANGUAGES.find((l) => l.value === toLang)?.emoji || '🌐';
        const embed = new EmbedBuilder()
          .setColor('#00c7ff')
          .setDescription(`**${targetLangEmoji} ${res.text}**\n\n*<@${m.author.id}> (${getLang(m.author.id)})*`);
        await m.channel.send({ embeds: [embed] });
      } else {
        await m.channel.send({
          content: `⚠️ No se pudo traducir el mensaje de <@${m.author.id}> al idioma de <@${otherUserId}>.`,
          ephemeral: true,
        });
      }
    } catch (err) {
      console.error('Error en traducción:', err);
      await m.channel.send({
        content: `❌ Error al traducir el mensaje al idioma de <@${otherUserId}>.`,
        ephemeral: true,
      });
    }
  }
}

  if (!m.content.startsWith('.')) return;
  const [command, ...args] = m.content.slice(1).trim().split(/ +/);

  if (command === 'web') {
    const query = args.join(' ');
    if (!query) return m.reply(T(m.author.id, 'noSearchQuery'));

    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&searchType=image&q=${encodeURIComponent(query)}&num=10`;

    try {
      const res = await axios.get(url);
      let items = res.data.items || [];
      items = items.filter(img => img.link && img.link.startsWith('http'));

      if (!items.length) return m.reply(T(m.author.id, 'noValidImages'));

      let validIndex = -1;
      for (let i = 0; i < items.length; i++) {
        if (await isImageUrlValid(items[i].link)) {
          validIndex = i;
          break;
        }
      }

      if (validIndex === -1) return m.reply(T(m.author.id, 'noValidImages'));

      imageSearchCache.set(m.author.id, { items, index: validIndex, query });

      const embed = new EmbedBuilder()
        .setTitle(`📷 Resultados para: ${query}`)
        .setImage(items[validIndex].link)
        .setDescription(`[Página donde está la imagen](${items[validIndex].image.contextLink})`)
        .setFooter({ text: `Imagen ${validIndex + 1} de ${items.length}` })
        .setColor('#00c7ff');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prevImage')
          .setLabel('⬅️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(validIndex === 0),
        new ButtonBuilder()
          .setCustomId('nextImage')
          .setLabel('➡️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(validIndex === items.length - 1)
      );

      await m.channel.send({ embeds: [embed], components: [row] });
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      return m.reply(`❌ Error buscando imágenes: ${errMsg}`);
    }
  }

if (command === 'Lista') {
  const query = args.join(' ');
  if (!query) return m.reply('⚠️ Debes escribir algo para buscar.');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`xxxsite-${m.author.id}-${encodeURIComponent(query)}`)
    .setPlaceholder('🌐 Elige la página para buscar videos')
    .addOptions([
      {
        label: 'Xvideos',
        value: 'xvideos.es',
        emoji: '🔴',
        description: 'Buscar en Xvideos',
      },
      {
        label: 'Pornhub',
        value: 'es.pornhub.com',
        emoji: '🟠',
        description: 'Buscar en Pornhub',
      },
      {
        label: 'Hentaila',
        value: 'hentaila.tv',
        emoji: '🟣',
        description: 'Buscar en Hentaila',
      }
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await m.reply({
    content: '🔞 ¿Dónde quieres buscar?',
    components: [row],
    ephemeral: true,
  });
}



  if (command === 'mp4') {
    const query = args.join(' ');
    if (!query) return m.reply('⚠️ Debes escribir algo para buscar el video.');

    try {
      const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: query,
          key: GOOGLE_API_KEY,
          maxResults: 1,
          type: 'video'
        }
      });

      const item = res.data.items?.[0];
      if (!item) return m.reply('❌ No se encontró ningún video.');

      const videoId = item.id.videoId;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const title = item.snippet.title;

      await m.channel.send('🎬 **' + title + '**');
      return m.channel.send(videoUrl);
    } catch {
      return m.reply('❌ Error al buscar el video.');
    }
  }

  if (command === 'xml') {
    const query = args.join(' ');
    if (!query) return m.reply('⚠️ ¡Escribe algo para buscar un video, compa!');

    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query + ' site:www.xnxx.es')}&num=5`;

      const res = await axios.get(url);
      const items = res.data.items;
      if (!items || items.length === 0) return m.reply('❌ No se encontraron videos, ¡intenta otra cosa!');

      const video = items.find(item => item.link.includes('/video-')) || items[0];
      const title = video.title;
      const link = video.link;
      const context = video.displayLink;
      const thumb = video.pagemap?.cse_thumbnail?.[0]?.src;

      const embed = new EmbedBuilder()
        .setTitle(`🎬 ${title.slice(0, 80)}...`)
        .setDescription(`**🔥 Clic para ver el video 🔥**\n[📺 Ir al video](${link})\n\n🌐 **Fuente**: ${context}`)
        .setColor('#ff0066')
        .setThumbnail(thumb || 'https://i.imgur.com/defaultThumbnail.png')
        .setFooter({ text: 'Buscado con Bot_v, ¡a darle caña!', iconURL: 'https://i.imgur.com/botIcon.png' })
        .setTimestamp()
        .addFields({ name: '⚠️ Nota', value: 'Este enlace lleva a la página del video' });

      await m.channel.send({ embeds: [embed] });
    } catch {
      return m.reply('❌ ¡Algo salió mal, compa! Intenta de nuevo.');
    }
  }

  if (command === 'td') {
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

  if (command === 'chat') {
    const mention = m.mentions.users.first();
    if (!mention) return sendWarning(m, '❌ Debes mencionar al usuario con quien quieres chatear.');
    const user1 = m.author;
    const user2 = mention;
    if (user1.id === user2.id) return sendWarning(m, '⚠️ No puedes iniciar un chat contigo mismo.');

    // Verificar si los idiomas son iguales
    const lang1 = getLang(user1.id);
    const lang2 = getLang(user2.id);
    if (lang1 === lang2) return sendWarning(m, T(user1.id, 'sameLanguage'));

    // Iniciar el chat
    activeChats.set(m.channel.id, { users: [user1.id, user2.id] });
    const member1 = await m.guild.members.fetch(user1.id);
    const member2 = await m.guild.members.fetch(user2.id);
    const embed = new EmbedBuilder()
      .setTitle('💬 Chat Automático Iniciado')
      .setDescription(
        `Chat iniciado entre:\n**${member1.nickname || member1.user.username}** <@${member1.id}> (${lang1})\n**${member2.nickname || member2.user.username}** <@${member2.id}> (${lang2})`
      )
      .setThumbnail(member1.user.displayAvatarURL({ extension: 'png', size: 64 }))
      .setImage(member2.user.displayAvatarURL({ extension: 'png', size: 64 }))
      .setColor('#00c7ff')
      .setTimestamp();
    return m.channel.send({ embeds: [embed] });
  }

  if (command === 'dchat') {
    if (m.author.username !== 'flux_fer')
      return sendWarning(m, T(m.author.id, 'notAuthorized'));
    if (activeChats.has(m.channel.id)) {
      activeChats.delete(m.channel.id);
      return m.reply({ content: T(m.author.id, 'chatDeactivated'), ephemeral: true });
    } else {
      return sendWarning(m, T(m.author.id, 'chatNoSession'));
    }
  }

  if (command === 'ID') {
    const uid = m.author.id;
    const sel = new StringSelectMenuBuilder()
      .setCustomId(`select-${uid}`)
      .setPlaceholder('🌍 Selecciona idioma')
      .addOptions(LANGUAGES.map((l) => ({ label: l.label, value: l.value, emoji: l.emoji })));

    return m.reply({
      content: 'Selecciona un nuevo idioma para guardar:',
      components: [new ActionRowBuilder().addComponents(sel)],
      ephemeral: true,
    });
  }
});

client.on('interactionCreate', async (i) => {
  const uid = i.user.id;


if (i.isStringSelectMenu() && i.customId.startsWith('xxxsite-')) {
  const [_, uid, rawQuery] = i.customId.split('-');
  if (i.user.id !== uid) return i.reply({ content: '❌ Este menú no es para ti.', ephemeral: true });

  const query = decodeURIComponent(rawQuery);
  const site = i.values[0];

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(`${query} site:${site}`)}&num=5`;
    const res = await axios.get(url);
    const items = res.data.items;
    if (!items || items.length === 0)
      return i.update({ content: '❌ No se encontraron resultados.', components: [] });

    const result = items.find(item =>
      item.link.includes('/video.') ||
      item.link.includes('/view_video.php') ||
      item.link.includes('/ver/')
    ) || items[0];

    const link = result.link;
    const title = result.title;

    await i.update({
      content: `🔞 **${title}**\n👉 [Haz clic aquí para verlo directamente](${link})`,
      components: [],
      ephemeral: true,
    });

  } catch (err) {
    await i.update({ content: '❌ Error al buscar. Intenta de nuevo más tarde.', components: [] });
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
      const note = await i.followUp({ content: '🎉 Listo! Usa `.td` o `.chat` ahora.', ephemeral: true });
      setTimeout(() => note.delete().catch(() => {}), 5000);
      return;
    }
  }

  if (i.isButton()) {
    const cache = imageSearchCache.get(uid);
    if (!cache) return i.deferUpdate();

    let newIndex = cache.index;
    if (i.customId === 'prevImage' && newIndex > 0) newIndex--;
    if (i.customId === 'nextImage' && newIndex < cache.items.length - 1) newIndex++;

    async function findValidImage(startIndex, direction) {
      let idx = startIndex;
      while (idx >= 0 && idx < cache.items.length) {
        if (await isImageUrlValid(cache.items[idx].link)) return idx;
        idx += direction;
      }
      return -1;
    }

    const direction = newIndex < cache.index ? -1 : 1;
    let validIndex = await findValidImage(newIndex, direction);

    if (validIndex === -1 && (await isImageUrlValid(cache.items[cache.index].link))) {
      validIndex = cache.index;
    }

    if (validIndex === -1) return i.deferUpdate();

    cache.index = validIndex;
    const img = cache.items[validIndex];

    const embed = new EmbedBuilder()
      .setTitle(`📷 Resultados para: ${cache.query}`)
      .setImage(img.link)
      .setDescription(`[Página donde está la imagen](${img.image.contextLink})`)
      .setFooter({ text: `Imagen ${validIndex + 1} de ${cache.items.length}` })
      .setColor('#00c7ff');

    await i.update({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prevImage')
            .setLabel('⬅️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(validIndex === 0),
          new ButtonBuilder()
            .setCustomId('nextImage')
            .setLabel('➡️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(validIndex === cache.items.length - 1)
        )
      ]
    });
  }
});

client.login(process.env.DISCORD_TOKEN);