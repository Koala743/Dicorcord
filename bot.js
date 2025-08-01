const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
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

async function translate(text, lang) { 
  try { 
    const r = await axios.get(`https://lingva.ml/api/v1/auto/${lang}/${encodeURIComponent(text)}`); 
    return r.data?.translation ? { text: r.data.translation, from: r.data.from } : null; 
  } catch { 
    return null; 
  } 
}

async function askLangSelect(message) { 
  const select = new StringSelectMenuBuilder()
    .setCustomId('selectLang')
    .setPlaceholder('🌐 Selecciona tu idioma preferido')
    .addOptions(LANGUAGES.map(lang => ({ label: lang.label, value: lang.value, emoji: lang.emoji })));

  const row = new ActionRowBuilder().addComponents(select);
  await message.reply({ content: '🌍 Por favor selecciona tu idioma:', components: [row] });
}

const activeChats = new Map();

client.once('ready', () => { 
  console.log(`✅ Bot conectado como ${client.user.tag}`); 
  load(); 
});

client.on('messageCreate', async (m) => { 
  if (m.author.bot || !m.content) return;

  // === NUEVO: Chat automático simplificado ===
  const chat = activeChats.get(m.channel.id);
  if (chat && chat.users.includes(m.author.id)) {
    const [u1, u2] = chat.users;
    // Si uno no tiene idioma guardado, no traduce
    if (!prefs[u1] || !prefs[u2]) return;

    const targetId = m.author.id === u1 ? u2 : u1;
    const targetLang = getLang(targetId);

    const translated = await translate(m.content, targetLang);
    if (translated?.text) {
      await m.channel.send(`🌐 <@${targetId}>: ${LANGUAGES.find(l => l.value === targetLang).emoji} ${translated.text}`);
    }
    return; // Evita que se ejecute más código en este evento
  }

  // Comandos solo si el mensaje empieza con "."
  if (!m.content.startsWith('.')) return;

  const [command, ...args] = m.content.slice(1).trim().split(/ +/);

  if (command === 'td') { 
    if (!m.reference?.messageId) return m.reply(T(m.author.id, 'mustReply')); 
    if (!prefs[m.author.id]) return askLangSelect(m); 
    try { 
      const ref = await m.channel.messages.fetch(m.reference.messageId); 
      const res = await translate(ref.content, getLang(m.author.id)); 
      if (!res) return m.reply(T(m.author.id, 'timeout')); 
      if (res.from === getLang(m.author.id)) return m.reply(T(m.author.id, 'alreadyInLang'));

      const embed = {
        color: 0x00c7ff,
        description: `${LANGUAGES.find(l => l.value === getLang(m.author.id)).emoji} : ${res.text}`
      };
      return m.reply({ embeds: [embed] }); 
    } catch { 
      return m.reply('❌ No se pudo traducir el mensaje.'); 
    }  
  }

  if (command === 'idioma') { 
    return askLangSelect(m); 
  }

  if (command === 'chat') { 
    if (m.mentions.users.size !== 1) return m.reply('Debes mencionar exactamente a un usuario.'); 
    const other = m.mentions.users.first(); 
    if (other.id === m.author.id) return m.reply('No puedes chatear contigo mismo.');

    activeChats.set(m.channel.id, { users: [m.author.id, other.id] }); 

    return m.channel.send(`💬 Chat automático iniciado entre <@${m.author.id}> y <@${other.id}>.\n\nRecuerda que ambos deben tener un idioma guardado para que las traducciones funcionen automáticamente.`); 
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
  if (i.isStringSelectMenu() && i.customId === 'selectLang') { 
    const selectedLang = i.values[0]; 
    prefs[i.user.id] = selectedLang; 
    save(); 
    await i.update({ content: `✅ Idioma guardado: ${LANGUAGES.find(l => l.value === selectedLang).label}`, components: [] }); 
  } 
});

client.login(process.env.DISCORD_TOKEN);