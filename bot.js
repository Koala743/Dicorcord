const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js'); const axios = require('axios'); const fs = require('fs'); const path = require('path');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN; const LANG_FILE = path.join(__dirname, 'preferredLanguages.json');

let userPreferredLanguages = {};

if (fs.existsSync(LANG_FILE)) { try { const data = fs.readFileSync(LANG_FILE, 'utf-8'); userPreferredLanguages = JSON.parse(data); } catch { userPreferredLanguages = {}; } }

function saveLanguages() { fs.writeFileSync(LANG_FILE, JSON.stringify(userPreferredLanguages, null, 2)); }

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers ] });

const CHANNELS_TO_TRANSLATE = new Set([ '1381953561008541920', '1386131661942554685', '1299860715884249088' ]);

const USERNAMES_TO_KICK = new Set([ 'darkness', 'vandaam_', 'dakigd', 'barnettmrz', 'ultiog', 'chilledbybreezy', 'iftee.', 'ghxst_walker', 'hikaishin', 'mixxlethereal', 'darknessrose6', 'yoursecondfan', 'z9gg0606', 'whoisaeiou' ]);

async function translateWithLingva(text, targetLang = 'es') { try { const url = https://lingva.ml/api/v1/auto/${targetLang}/${encodeURIComponent(text)}; const res = await axios.get(url); if (res.data && res.data.translation) return res.data.translation; return null; } catch { return null; } }

async function detectLanguage(text) { try { const url = https://lingva.ml/api/v1/auto/_/${encodeURIComponent(text)}; const res = await axios.get(url); if (res.data && res.data.info && res.data.info.detectedLanguage) { return res.data.info.detectedLanguage; } return 'es'; } catch { return 'es'; } }

async function detectUserPreferredLanguage(channel, userId) { try { const messages = await channel.messages.fetch({ limit: 50 }); const userMessages = messages .filter(msg => msg.author.id === userId && msg.content.trim().length > 0) .map(msg => msg.content.trim());

const counts = {};
for (const text of userMessages) {
  const lang = await detectLanguage(text);
  counts[lang] = (counts[lang] || 0) + 1;
}

let topLang = 'es';
let max = 0;
for (const lang in counts) {
  if (counts[lang] > max) {
    max = counts[lang];
    topLang = lang;
  }
}
return topLang;

} catch { return 'es'; } }

client.once('ready', async () => { console.log(✅ Bot conectado como ${client.user.tag});

const guilds = client.guilds.cache; for (const [guildId, guild] of guilds) { try { await guild.members.fetch(); guild.members.cache.forEach(member => { const username = member.user.username.toLowerCase(); if (USERNAMES_TO_KICK.has(username)) { member.kick('Expulsado automáticamente por estar en lista negra') .then(() => console.log(🚫 Expulsado: ${username})) .catch(err => console.log(❌ No se pudo expulsar a ${username}: ${err.message})); } }); } catch (err) { console.log(⚠️ Error en guild ${guild.name}: ${err.message}); } } });

client.on('messageCreate', async (message) => { if ( message.author.bot || !message.content || !CHANNELS_TO_TRANSLATE.has(message.channel.id) ) return;

const original = message.content.trim(); const words = original.split(/\s+/); const maxWordLength = Math.max(...words.map(w => w.length)); if (maxWordLength < 3) return;

const sinTexto = original .replace(/<a?:\w+:\d+>/g, '') .replace(/[\p{Emoji}\p{Punctuation}\p{Symbol}\s]/gu, '');

if (sinTexto.length === 0 || original.length < 2) return; if (original.toLowerCase().startsWith('.td')) return;

if (maxWordLength >= 3 && maxWordLength <= 5) { const translated = await translateWithLingva(original); if (translated && translated.toLowerCase() !== original.toLowerCase()) { const reply = await message.reply(📥 **Traducción al español:** ${translated}); setTimeout(() => reply.delete().catch(() => {}), 5000); } } });

client.on('messageCreate', async (message) => { if ( message.author.bot || !message.content.toLowerCase().startsWith('.td') || !message.reference || !CHANNELS_TO_TRANSLATE.has(message.channel.id) ) return;

try { const referenced = await message.channel.messages.fetch(message.reference.messageId); const originalText = referenced.content.trim(); if (!originalText) return;

const languageMenu = new ActionRowBuilder().addComponents(
  new StringSelectMenuBuilder()
    .setCustomId('select-lang')
    .setPlaceholder('🌐 Selecciona un idioma de destino')
    .addOptions([
      { label: 'Español', value: 'es' },
      { label: 'Inglés', value: 'en' },
      { label: 'Portugués', value: 'pt' },
      { label: 'Francés', value: 'fr' },
      { label: 'Alemán', value: 'de' },
      { label: 'Italiano', value: 'it' },
      { label: 'Japonés', value: 'ja' }
    ])
);

const menuMsg = await message.reply({
  content: 'Selecciona el idioma al que deseas traducir:',
  components: [languageMenu]
});

const collector = menuMsg.createMessageComponentCollector({
  componentType: ComponentType.StringSelect,
  time: 15000,
  max: 1
});

collector.on('collect', async (interaction) => {
  const targetLang = interaction.values[0];
  const translated = await translateWithLingva(originalText, targetLang);
  userPreferredLanguages[message.author.id] = targetLang;
  saveLanguages();
  if (translated) {
    await interaction.reply(`📥 **Traducción (${targetLang.toUpperCase()}):** ${translated}`);
  } else {
    await interaction.reply('❌ No se pudo traducir el mensaje.');
  }
});

collector.on('end', async (collected) => {
  await menuMsg.edit({ components: [] }).catch(() => {});
  if (collected.size === 0) {
    let userLang = userPreferredLanguages[message.author.id];
    if (!userLang) {
      userLang = await detectUserPreferredLanguage(message.channel, message.author.id);
      userPreferredLanguages[message.author.id] = userLang;
      saveLanguages();
    }
    const translation = await translateWithLingva(originalText, userLang);
    if (translation) {
      const langChangeMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`lang-change-${message.author.id}`)
          .setPlaceholder('⬇️ Cambiar idioma')
          .addOptions([
            { label: 'Español', value: 'es' },
            { label: 'Inglés', value: 'en' },
            { label: 'Portugués', value: 'pt' },
            { label: 'Francés', value: 'fr' },
            { label: 'Alemán', value: 'de' },
            { label: 'Italiano', value: 'it' },
            { label: 'Japonés', value: 'ja' }
          ])
      );

      await message.reply({
        content: `📥 **Traducción (${userLang.toUpperCase()}):** ${translation}`,
        components: [langChangeMenu]
      });
    }
  }
});

} catch { return; } });

client.on('interactionCreate', async (interaction) => { if (!interaction.isStringSelectMenu()) return;

if (interaction.customId.startsWith('lang-change-')) { const userId = interaction.customId.split('-').pop(); if (interaction.user.id !== userId) { return interaction.reply({ content: '❌ Solo tú puedes cambiar tu idioma.', ephemeral: true }); }

const newLang = interaction.values[0];
userPreferredLanguages[userId] = newLang;
saveLanguages();
await interaction.reply({ content: `✅ Idioma cambiado a **${newLang.toUpperCase()}** para tus futuras traducciones.`, ephemeral: true });

} });

client.login(DISCORD_TOKEN);

