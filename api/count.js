let cachedCount = null;
let lastUpdate = null;
const CACHE_DURATION = 60000;

async function getExpulsadosCount() {
  if (cachedCount !== null && lastUpdate && Date.now() - lastUpdate < CACHE_DURATION) {
    return cachedCount;
  }

  const DISCORD_API = 'https://discord.com/api/v10';
  const guildId = process.env.DISCORD_GUILD_ID;
  const token = process.env.DISCORD_BOT_TOKEN;

  const headers = {
    'Authorization': `Bot ${token}`,
    'Content-Type': 'application/json'
  };

  const rolesResponse = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers
  });

  if (!rolesResponse.ok) {
    throw new Error(`Discord API error: ${rolesResponse.status}`);
  }

  const roles = await rolesResponse.json();

  const membersResponse = await fetch(`${DISCORD_API}/guilds/${guildId}/members?limit=1000`, {
    headers
  });

  if (!membersResponse.ok) {
    throw new Error(`Discord API error: ${membersResponse.status}`);
  }

  const members = await membersResponse.json();

  const roleTotalId = process.env.ROLE_TOTAL_ID;
  const roleActivosId = process.env.ROLE_ACTIVOS_ID;
  const roleOficialesId = '1430993841670066381';

  const totalMembers = members.filter(m => m.roles.includes(roleTotalId)).length;
  const activosMembers = members.filter(m => m.roles.includes(roleActivosId)).length;
  const oficialesMembers = members.filter(m => m.roles.includes(roleOficialesId)).length;

  cachedCount = {
    expulsados: totalMembers - activosMembers,
    total: totalMembers,
    oficiales: oficialesMembers,
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