require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const puppeteer = require('puppeteer')
const express = require('express')

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const CHANNEL_ID = process.env.CHANNEL_ID || '1399055361197211721'
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS or 5000) || 5000
const PORT = parseInt(process.env.PORT || '3000')

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
})

let browser = null
const monitored = new Map()
async function ensureBrowser(){
  if(!browser){
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  }
}
async function scrapeForKey(url){
  await ensureBrowser()
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36')
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
  await page.waitForTimeout(2000)
  const html = await page.content()
  await page.close()
  const regex = /(FREE_[A-Za-z0-9\-_]+)/g
  const matches = html.match(regex)
  if(matches && matches.length) return matches[0]
  return null
}
async function pollUrl(url){
  try{
    const found = await scrapeForKey(url)
    const info = monitored.get(url) || { lastKey: null }
    if(found && found !== info.lastKey){
      info.lastKey = found
      monitored.set(url, info)
      const ch = await client.channels.fetch(CHANNEL_ID).catch(()=>null)
      const msg = `🔔 KEY DETECTADA\n${found}\nURL: ${url}`
      if(ch && ch.send) ch.send(msg).catch(()=>{})
    } else {
      monitored.set(url, info)
    }
  }catch(e){
    const info = monitored.get(url) || { lastKey: null, lastError: null }
    info.lastError = e.message
    monitored.set(url, info)
  }
}
setInterval(async ()=>{
  const urls = Array.from(monitored.keys())
  for(const u of urls){
    pollUrl(u)
  }
}, POLL_INTERVAL_MS)
client.on('messageCreate', async (msg)=>{
  if(msg.author.bot) return
  const content = msg.content.trim()
  if(content.startsWith('!platoboost')){
    const parts = content.split(/\s+/)
    if(parts.length < 2){
      msg.reply('Pásame un link después del comando.')
      return
    }
    const url = parts[1]
    msg.reply('🔎 Revisando link, espera...').then(async ()=>{
      try{
        const key = await scrapeForKey(url)
        if(key) msg.reply('✅ Key encontrada: `' + key + '`')
        else msg.reply('❌ No encontré ninguna key en ese link.')
      }catch(err){
        msg.reply('⚠️ Error: ' + err.message)
      }
    }).catch(()=>{})
    return
  }
  if(content.startsWith('!monitor')){
    const parts = content.split(/\s+/)
    const sub = parts[1] and parts[1].toLowerCase() or ''
    if(sub === 'add' && parts[2]){
      const url = parts[2]
      monitored.set(url, { lastKey: null })
      msg.reply('✓ URL añadida al monitor: ' + url)
      return
    }
    if(sub === 'remove' && parts[2]){
      const url = parts[2]
      monitored.delete(url)
      msg.reply('✓ URL removida del monitor: ' + url)
      return
    }
    if(sub === 'list'){
      const list = Array.from(monitored.keys())
      if(list.length === 0) msg.reply('No hay URLs en monitoreo.')
      else msg.reply('URLs monitoreadas:\n' + list.join('\n'))
      return
    }
    msg.reply('Usos:\n!monitor add <url>\n!monitor remove <url>\n!monitor list\n!platoboost <url>')
    return
  }
})
client.once('ready', ()=>{ console.log('Bot listo ->', client.user.tag) })
client.login(DISCORD_TOKEN)

const app = express()
app.get('/status', (req,res)=>{
  const out = {}
  for(const [k,v] of monitored.entries()){
    out[k] = { lastKey: v.lastKey || null, lastError: v.lastError || null }
  }
  res.json({ running: !!browser, monitored: out })
})
app.listen(PORT, ()=>console.log('Status HTTP en puerto', PORT))

process.on('SIGINT', async ()=>{ if(browser) await browser.close(); process.exit() })
process.on('SIGTERM', async ()=>{ if(browser) await browser.close(); process.exit() })