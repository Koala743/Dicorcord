const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildMembers
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
{ label: 'Chino (Simpl.)', value: 'zh-CN', emoji: '🇨🇳' },
{ label: 'Coreano', value: 'ko', emoji: '🇰🇷' },
{ label: 'Árabe', value: 'ar', emoji: '🇸🇦' },
{ label: 'Hindi', value: 'hi', emoji: '🇮🇳' }
];

const trans = {
es: {
mustReply: '⚠️ Usa el comando con un mensaje válido.',
timeout: '⏳ Tiempo agotado. Usa el comando nuevamente.',
alreadyInLang: '⚠️ El mensaje ya está en tu idioma.',
notAuthorized: '⚠️ No eres el usuario autorizado.',
noSearchQuery: '⚠️ Debes proporcionar texto para buscar.',
noImagesFound: '❌ No se encontraron imágenes para esa búsqueda.',
noValidImages: '❌ No se encontraron imágenes válidas.',
chatDeactivated: '🛑 Chat automático desactivado.'
}
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
return trans.es[k] || '';
}

// Función para validar que la URL de la imagen responde y es realmente imagen
async function isImageUrlValid(url) {
try {
const res = await axios.head(url, { timeout: 5000 });
const contentType = res.headers['content-type'];
return res.status === 200 && contentType && contentType.startsWith('image/');
} catch {
return false;
}
}

async function translate(text, lang) {
try {
const r = await axios.get(https://lingva.ml/api/v1/auto/${lang}/${encodeURIComponent(text)});
return r.data?.translation ? { text: r.data.translation, from: r.data.from } : null;
} catch {
return null;
}
}

const activeChats = new Map();
const imageSearchCache = new Map();

const GOOGLE_API_KEY = 'AIzaSyDIrZO_rzRxvf9YvbZK1yPdsj4nrc0nqwY';
const GOOGLE_CX = '34fe95d6cf39d4dd4';

client.once('ready', () => {
console.log(✅ Bot conectado como ${client.user.tag});
load();
});

client.on('messageCreate', async (m) => {
if (m.author.bot || !m.content) return;

const urlRegex = /https?://[^\s]+/i;

if (urlRegex.test(m.content)) {
try {
const member = await m.guild.members.fetch(m.author.id);
const allowedRoles = new Set([
'1305327128341905459', // Staff
'1244056080825454642', // Fundador
'1244039798696710212'  // Tester
]);
const hasAllowedRole = member.roles.cache.some(r => allowedRoles.has(r.id));
if (!hasAllowedRole) {
await m.delete().catch(() => {});
return;
}
} catch {}
}

if (!m.content.startsWith('.')) return;

const [command, ...args] = m.content.slice(1).trim().split(/ +/);

if (command === 'web') {
const query = args.join(' ');
if (!query) return m.reply(T(m.author.id, 'noSearchQuery'));

const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&searchType=image&q=${encodeURIComponent(query)}&num=50`;  
try {  
  const res = await axios.get(url);  
  let items = res.data.items || [];  
  items = items.filter(img => img.link && img.link.startsWith('http'));  
  if (!items.length) return m.reply(T(m.author.id, 'noValidImages'));  

  // Buscar primera imagen válida  
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
    .setDescription(`[Link de la imagen](${items[validIndex].link})`)  
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
return;

}

if (command === 'td') {
if (!CHANNELS.has(m.channel.id) || !m.reference?.messageId) return m.reply(T(m.author.id, 'mustReply'));
try {
const ref = await m.channel.messages.fetch(m.reference.messageId);
const res = await translate(ref.content, getLang(m.author.id));
if (!res) return m.reply(T(m.author.id, 'timeout'));
if (res.from === getLang(m.author.id)) return m.reply(T(m.author.id, 'alreadyInLang'));
const embed = new EmbedBuilder()
.setColor('#00c7ff')
.setDescription(${LANGUAGES.find(l => l.value === getLang(m.author.id)).emoji} : ${res.text});
return m.reply({ embeds: [embed] });
} catch {
return m.reply('No se pudo traducir el mensaje.');
}
}

if (command === 'chat') {
if (m.mentions.users.size !== 1) return m.reply('Debes mencionar exactamente a un usuario.');
const other = m.mentions.users.first();
if (other.id === m.author.id) return m.reply('No puedes chatear contigo mismo.');
activeChats.set(m.channel.id, { users: [m.author.id, other.id] });
const m1 = await m.guild.members.fetch(m.author.id);
const m2 = await m.guild.members.fetch(other.id);
const embed = new EmbedBuilder()
.setTitle('💬 Chat Automático Iniciado')
.setDescription(Chat entre **${m1.nickname || m1.user.username}** y **${m2.nickname || m2.user.username}**)
.setThumbnail(m1.user.displayAvatarURL({ size: 64 }))
.setImage(m2.user.displayAvatarURL({ size: 64 }))
.setColor('#00c7ff')
.setTimestamp();
return m.channel.send({ embeds: [embed] });
}

if (command === 'dchat') {
if (m.author.username !== 'flux_fer') return m.reply(T(m.author.id, 'notAuthorized'));
if (activeChats.has(m.channel.id)) {
activeChats.delete(m.channel.id);
return m.reply(T(m.author.id, 'chatDeactivated'));
}
return m.reply(T(m.author.id, 'mustReply'));
}
});

client.on('interactionCreate', async (i) => {
if (!i.isButton()) return;

const uid = i.user.id;
const cache = imageSearchCache.get(uid);
if (!cache) return i.deferUpdate();

let newIndex = cache.index;
if (i.customId === 'prevImage' && newIndex > 0) newIndex--;
if (i.customId === 'nextImage' && newIndex < cache.items.length - 1) newIndex++;

// Buscar imagen válida desde newIndex hacia adelante o hacia atrás dependiendo del botón
async function findValidImage(startIndex, direction) {
let i = startIndex;
while (i >= 0 && i < cache.items.length) {
if (await isImageUrlValid(cache.items[i].link)) return i;
i += direction;
}
return -1;
}

// direction: -1 para prev, +1 para next
const direction = newIndex < cache.index ? -1 : 1;
let validIndex = await findValidImage(newIndex, direction);

// Si no encontró en la dirección, intentar la actual posición
if (validIndex === -1 && (await isImageUrlValid(cache.items[cache.index].link))) {
validIndex = cache.index;
}

if (validIndex === -1) {
// No hay imágenes válidas, no actualiza para evitar error
return i.deferUpdate();
}

cache.index = validIndex;
const img = cache.items[validIndex];

const embed = new EmbedBuilder()
.setTitle(📷 Resultados para: ${cache.query})
.setImage(img.link)
.setDescription([Link de la imagen](${img.link}))
.setFooter({ text: Imagen ${validIndex + 1} de ${cache.items.length} })
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
});

client.login(process.env.DISCORD_TOKEN);

