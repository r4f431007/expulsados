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

async function getExpulsadosCount() {
  if (cachedCount !== null && lastUpdate && Date.now() - lastUpdate < CACHE_DURATION) {
    return cachedCount;
  }

  await client.login(process.env.DISCORD_BOT_TOKEN);
  
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  await guild.members.fetch();

  const roleTotalMembers = guild.roles.cache.get(process.env.ROLE_TOTAL_ID)?.members.size || 0;
  const roleActivosMembers = guild.roles.cache.get(process.env.ROLE_ACTIVOS_ID)?.members.size || 0;

  cachedCount = roleTotalMembers - roleActivosMembers;
  lastUpdate = Date.now();

  return cachedCount;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const count = await getExpulsadosCount();
    
    res.status(200).json({
      expulsados: count,
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