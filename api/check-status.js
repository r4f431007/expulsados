import mysql from 'mysql2/promise';

let connection = null;

async function getConnection() {
  if (!connection) {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });
  }
  return connection;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const conn = await getConnection();
    
    const [rows] = await conn.execute(
      'SELECT discord_role FROM students_score WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        found: false,
        message: 'Estudiante no encontrado' 
      });
    }

    const discordRole = rows[0].discord_role;
    const willBeExpelled = discordRole === 'NO';

    res.status(200).json({
      found: true,
      willBeExpelled: willBeExpelled,
      message: willBeExpelled ? 'SI' : 'NO'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Error al consultar la base de datos',
      message: error.message 
    });
  }
}