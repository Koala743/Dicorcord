const chat = activeChats.get(m.channel.id);
if (chat) {
  const { users } = chat;
  if (users.includes(m.author.id)) {
    const otherUserId = users.find(u => u !== m.author.id);
    const toLang = getLang(otherUserId);
    const raw = m.content.trim();
    if (
      !raw ||
      m.stickers.size > 0 ||
      (raw.startsWith('.') && raw.length <= 5) ||
      (raw.length <= 20 && [...raw].every(c => {
        const cp = c.codePointAt(0);
        return cp > 0x1F000 && cp < 0x1FAFF;
      }))
    ) return;
    try {
      const res = await translate(raw, toLang);
      if (res && res.text) {
        const targetLangEmoji = LANGUAGES.find(l => l.value === toLang)?.emoji || '🌐';
        const embed = new EmbedBuilder()
          .setColor('#00c7ff')
          .setDescription(`**${targetLangEmoji} ${res.text}**\n\n*<@${m.author.id}> (${getLang(m.author.id)})*`);
        await m.channel.send({ embeds: [embed] });
      } else {
        await m.channel.send({
          content: `⚠️ No se pudo traducir el mensaje de <@${m.author.id}> al idioma de <@${otherUserId}>.`,
          ephemeral: true
        });
      }
    } catch (err) {
      console.error('Error en traducción:', err);
      await m.channel.send({
        content: `❌ Error al traducir el mensaje al idioma de <@${otherUserId}>.`,
        ephemeral: true
      });
    }
  }
}