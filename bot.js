const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

async function registerCommands() {
	const commands = [
		new SlashCommandBuilder()
			.setName('ping')
			.setDescription('Verifica que el bot esté funcionando')
	];
	await client.application.commands.set(commands);
	console.log('✅ Comandos registrados');
}

client.once('ready', () => {
	console.log(`✅ Bot conectado: ${client.user.tag}`);
	console.log(`📍 Servidores: ${client.guilds.cache.size}`);
	console.log(`📍 Plataforma: ${process.platform}`);
	console.log(`📍 Node version: ${process.version}`);
	registerCommands();
});

client.on('interactionCreate', async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'ping') {
		const embed = new EmbedBuilder()
			.setTitle('🟢 Bot Activo')
			.setDescription(`**Latencia:** ${client.ws.ping}ms\n**Plataforma:** ${process.platform}\n**Node:** ${process.version}\n**Uptime:** ${Math.floor(client.uptime / 1000)}s`)
			.setColor('#00FF00')
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	}
});

process.on('unhandledRejection', error => {
	console.error('❌ Error:', error);
});

console.log('🚀 Iniciando bot...');
client.login(process.env.DISCORD_TOKEN);