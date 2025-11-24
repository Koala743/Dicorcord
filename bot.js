const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const puppeteer = require('puppeteer');

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

async function bypassAndExtractKey(url) {
	let browser;
	try {
		browser = await puppeteer.launch({
			headless: 'new',
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-accelerated-2d-canvas',
				'--no-first-run',
				'--no-zygote',
				'--single-process',
				'--disable-gpu'
			]
		});

		const page = await browser.newPage();
		const detectedKeys = new Set();
		const events = [];

		await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
		await page.setViewport({ width: 1920, height: 1080 });

		await page.evaluateOnNewDocument(() => {
			Object.defineProperty(navigator, 'webdriver', { get: () => false });
			window.chrome = { runtime: {} };
			Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
			Object.defineProperty(navigator, 'languages', { get: () => ['es-ES', 'es', 'en'] });
		});

		await page.exposeFunction('keyDetected', (key) => {
			if (key && key.startsWith('FREE_') && key.length >= 35) {
				detectedKeys.add(key);
				console.log('✅ KEY DETECTADA:', key);
			}
		});

		await page.exposeFunction('logEvent', (event) => {
			events.push(event);
		});

		await page.evaluateOnNewDocument(() => {
			const keyPattern = /FREE_[a-zA-Z0-9]{30,}/g;

			function scanForKeys(text) {
				if (text && typeof text === 'string') {
					const matches = text.match(keyPattern);
					if (matches) {
						matches.forEach(key => window.keyDetected(key));
					}
				}
			}

			const originalFetch = window.fetch;
			window.fetch = function(...args) {
				window.logEvent({ type: 'fetch', url: args[0] });
				return originalFetch.apply(this, args).then(response => {
					response.clone().text().then(text => {
						scanForKeys(text);
						window.logEvent({ type: 'fetch-response', url: args[0], hasKey: text.includes('FREE_') });
					});
					return response;
				});
			};

			const originalXHR = window.XMLHttpRequest.prototype.open;
			window.XMLHttpRequest.prototype.open = function(...args) {
				window.logEvent({ type: 'xhr', url: args[1] });
				this.addEventListener('load', function() {
					scanForKeys(this.responseText);
					window.logEvent({ type: 'xhr-response', url: args[1], hasKey: this.responseText.includes('FREE_') });
				});
				return originalXHR.apply(this, args);
			};

			const originalSetAttribute = Element.prototype.setAttribute;
			Element.prototype.setAttribute = function(name, value) {
				scanForKeys(String(value));
				return originalSetAttribute.call(this, name, value);
			};

			const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
			Object.defineProperty(Element.prototype, 'innerHTML', {
				set: function(value) {
					scanForKeys(String(value));
					return originalInnerHTML.set.call(this, value);
				},
				get: originalInnerHTML.get
			});

			const originalTextContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
			Object.defineProperty(Node.prototype, 'textContent', {
				set: function(value) {
					scanForKeys(String(value));
					return originalTextContent.set.call(this, value);
				},
				get: originalTextContent.get
			});

			const originalConsoleLog = console.log;
			console.log = function(...args) {
				args.forEach(arg => scanForKeys(String(arg)));
				return originalConsoleLog.apply(this, args);
			};

			const observer = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					if (mutation.type === 'childList') {
						mutation.addedNodes.forEach((node) => {
							if (node.nodeType === 1) {
								scanForKeys(node.textContent);
								scanForKeys(node.innerHTML);
								const attrs = node.attributes;
								if (attrs) {
									for (let i = 0; i < attrs.length; i++) {
										scanForKeys(attrs[i].value);
									}
								}
							}
						});
					}
					if (mutation.type === 'characterData') {
						scanForKeys(mutation.target.textContent);
					}
					if (mutation.type === 'attributes') {
						const value = mutation.target.getAttribute(mutation.attributeName);
						scanForKeys(value);
					}
				});
			});

			observer.observe(document.documentElement, {
				childList: true,
				subtree: true,
				characterData: true,
				attributes: true
			});

			setInterval(() => {
				const allText = document.body.innerText || document.body.textContent || '';
				scanForKeys(allText);

				const allHTML = document.documentElement.outerHTML;
				scanForKeys(allHTML);

				document.querySelectorAll('input, textarea, [data-key], [data-code], .key, .code, #key, #code').forEach(el => {
					scanForKeys(el.value || el.textContent || el.getAttribute('data-key') || el.getAttribute('data-code'));
				});

				try {
					Object.keys(window).forEach(key => {
						if (typeof window[key] === 'string') {
							scanForKeys(window[key]);
						}
					});
				} catch (e) {}

				try {
					Object.keys(localStorage || {}).forEach(key => {
						scanForKeys(localStorage.getItem(key));
					});
					Object.keys(sessionStorage || {}).forEach(key => {
						scanForKeys(sessionStorage.getItem(key));
					});
				} catch (e) {}

			}, 500);
		});

		console.log('🔍 Navegando a:', url);
		await page.goto(url, { 
			waitUntil: 'networkidle0', 
			timeout: 60000 
		});

		console.log('⏳ Esperando carga inicial...');
		await page.waitForTimeout(3000);

		try {
			await page.waitForSelector('body', { timeout: 5000 });
		} catch (e) {
			console.log('⚠️ No se encontró selector body');
		}

		console.log('🖱️ Intentando interacciones...');
		try {
			const buttons = await page.$$('button, [role="button"], .btn, input[type="submit"]');
			for (let i = 0; i < Math.min(buttons.length, 5); i++) {
				try {
					await buttons[i].click();
					await page.waitForTimeout(2000);
				} catch (e) {}
			}
		} catch (e) {
			console.log('⚠️ No se encontraron botones para hacer click');
		}

		console.log('📜 Scrolleando página...');
		await page.evaluate(() => {
			window.scrollTo(0, document.body.scrollHeight / 2);
		});
		await page.waitForTimeout(2000);

		await page.evaluate(() => {
			window.scrollTo(0, document.body.scrollHeight);
		});
		await page.waitForTimeout(2000);

		console.log('⏳ Esperando generación de keys (20 segundos más)...');
		await page.waitForTimeout(20000);

		const pageContent = await page.evaluate(() => {
			const keyPattern = /FREE_[a-zA-Z0-9]{30,}/g;
			const found = new Set();

			const allText = document.body.innerText || document.body.textContent || '';
			const textMatches = allText.match(keyPattern);
			if (textMatches) textMatches.forEach(k => found.add(k));

			const allHTML = document.documentElement.outerHTML;
			const htmlMatches = allHTML.match(keyPattern);
			if (htmlMatches) htmlMatches.forEach(k => found.add(k));

			document.querySelectorAll('*').forEach(el => {
				const matches = (el.textContent || '').match(keyPattern);
				if (matches) matches.forEach(k => found.add(k));
				
				Array.from(el.attributes || []).forEach(attr => {
					const attrMatches = (attr.value || '').match(keyPattern);
					if (attrMatches) attrMatches.forEach(k => found.add(k));
				});
			});

			const scripts = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join(' ');
			const scriptMatches = scripts.match(keyPattern);
			if (scriptMatches) scriptMatches.forEach(k => found.add(k));

			return {
				keys: Array.from(found),
				title: document.title,
				url: window.location.href,
				bodyLength: document.body.innerHTML.length
			};
		});

		pageContent.keys.forEach(key => detectedKeys.add(key));

		await browser.close();

		return {
			keys: Array.from(detectedKeys),
			events: events,
			pageInfo: pageContent
		};

	} catch (error) {
		if (browser) await browser.close();
		throw error;
	}
}

async function registerCommands() {
	const commands = [
		new SlashCommandBuilder()
			.setName('bypass')
			.setDescription('Extrae la key con Puppeteer (Railway)')
			.addStringOption(option =>
				option.setName('url').setDescription('URL de Platoboost').setRequired(true)
			)
	];
	await client.application.commands.set(commands);
	console.log('✅ Comandos registrados');
}

client.once('ready', () => {
	console.log(`✅ Bot: ${client.user.tag}`);
	console.log(`📍 Plataforma: ${process.platform}`);
	registerCommands();
});

client.on('interactionCreate', async (interaction) => {
	if (!interaction.isChatInputCommand() || interaction.commandName !== 'bypass') return;

	const url = interaction.options.getString('url');
	await interaction.deferReply({ ephemeral: true });

	const loadingEmbed = new EmbedBuilder()
		.setTitle('🔍 Bypass con Puppeteer Mejorado')
		.setDescription(`**URL:** ${url}\n\n⏳ Iniciando Chrome headless...\n⏳ Inyectando detectores de eventos...\n⏳ Interceptando fetch/XHR...\n⏳ Rastreando mutaciones DOM...\n⏳ Haciendo clicks en botones...\n⏳ Scrolleando página...\n⏳ Escaneando scripts...\n⏳ Buscando keys FREE_...\n\n**Esto puede tomar hasta 60 segundos**`)
		.setColor('#FFA500')
		.setTimestamp();

	await interaction.editReply({ embeds: [loadingEmbed] });

	try {
		const result = await bypassAndExtractKey(url);

		if (result.keys.length === 0) {
			const embed = new EmbedBuilder()
				.setTitle('❌ No se encontraron Keys')
				.setDescription(`**URL Original:** ${url}\n**URL Final:** ${result.pageInfo.url}\n**Título:** ${result.pageInfo.title}\n**Tamaño del body:** ${result.pageInfo.bodyLength} caracteres\n**Eventos detectados:** ${result.events.length}\n\nNo se detectó ninguna key con formato \`FREE_\`\n\n**Posibles razones:**\n• La key requiere completar captcha o tareas específicas\n• Se genera después de cierto tiempo o interacción especial\n• Usa formato diferente al esperado\n• La URL ha expirado o requiere autenticación\n• Necesita cookies o sesión de usuario real`)
				.setColor('#FF0000')
				.setTimestamp();

			if (result.events.length > 0) {
				const eventsText = result.events.slice(0, 10).map((e, i) => `${i + 1}. ${e.type}: ${e.url || JSON.stringify(e)}`).join('\n');
				embed.addFields({ name: '📊 Eventos detectados', value: `\`\`\`\n${eventsText}\n\`\`\`` });
			}

			return interaction.editReply({ embeds: [embed] });
		}

		const keysText = result.keys.map((k, i) => `**Key ${i + 1}:**\n\`\`\`\n${k}\n\`\`\``).join('\n\n');

		const successEmbed = new EmbedBuilder()
			.setTitle('✅ KEY(S) EXTRAÍDA(S) CON PUPPETEER')
			.setDescription(`**URL Original:** ${url}\n**URL Final:** ${result.pageInfo.url}\n**Título:** ${result.pageInfo.title}\n**Usuario:** ${interaction.user.tag}\n**Eventos:** ${result.events.length}\n\n${keysText}\n\n**🎯 Método:** Puppeteer + MutationObserver + Interacciones\n**💡 Tip:** Copia la key antes de cerrar`)
			.setColor('#00FF00')
			.setFooter({ text: `Total: ${result.keys.length} key(s) detectada(s)` })
			.setTimestamp();

		console.log(`✅ Keys extraídas para ${interaction.user.tag}:`, result.keys);

		return interaction.editReply({ embeds: [successEmbed] });

	} catch (error) {
		console.error('❌ Error:', error);
		const errorEmbed = new EmbedBuilder()
			.setTitle('❌ Error al Procesar')
			.setDescription(`**Error:** ${error.message}\n\n**URL:** ${url}\n\n**Stack:**\n\`\`\`${error.stack?.substring(0, 500)}\`\`\`\n\n**Solución:**\n• Verifica que estés en Railway\n• Asegúrate de tener Puppeteer instalado\n• Revisa los logs del servidor\n• Intenta de nuevo en unos minutos`)
			.setColor('#FF0000')
			.setTimestamp();

		return interaction.editReply({ embeds: [errorEmbed] });
	}
});

process.on('unhandledRejection', error => {
	console.error('❌ Error no manejado:', error);
});

client.login(process.env.DISCORD_TOKEN);