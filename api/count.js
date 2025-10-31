import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

let cachedCount = null;
let lastUpdate = null;
const CACHE_DURATION = 60000;
let isClientReady = false;
let loginPromise = null;

async function ensureClientReady() {
  if (isClientReady) {
    return;
  }

  if (loginPromise) {
    await loginPromise;
    return;
  }

  loginPromise = new Promise((resolve, reject) => {
    client.once('ready', () => {
      console.log('Discord bot connected');
      isClientReady = true;
      resolve();
    });

    client.on('error', (error) => {
      console.error('Discord client error:', error);
    });

    client.login(process.env.DISCORD_BOT_TOKEN).catch(reject);
  });

  await loginPromise;
}

async function getExpulsadosCount() {
  if (cachedCount !== null && lastUpdate && Date.now() - lastUpdate < CACHE_DURATION) {
    return cachedCount;
  }

  await ensureClientReady();
  
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  await guild.members.fetch();

  const roleTotalMembers = guild.roles.cache.get(process.env.ROLE_TOTAL_ID)?.members.size || 0;
  const roleActivosMembers = guild.roles.cache.get(process.env.ROLE_ACTIVOS_ID)?.members.size || 0;
  const roleOficialesMembers = guild.roles.cache.get('1430993841670066381')?.members.size || 0;

  cachedCount = {
    expulsados: roleTotalMembers - roleActivosMembers,
    total: roleTotalMembers,
    oficiales: roleOficialesMembers,
    timestamp: Date.now()
  };
  lastUpdate = Date.now();

  return cachedCount;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = await getExpulsadosCount();
    
    res.status(200).json({
      expulsados: data.expulsados,
      total: data.total,
      oficiales: data.oficiales,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Error al obtener datos',
      message: error.message 
    });
  }
}