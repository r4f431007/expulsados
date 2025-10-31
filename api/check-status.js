import mysql from 'mysql2/promise';

let connection = null;

async function getConnection() {
  if (!connection) {
    try {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT) || 3306
      });
      console.log('Database connection established');
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
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
    console.log('Request body:', req.body);
    
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required',
        found: false 
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    console.log('Searching for email:', cleanEmail);

    const conn = await getConnection();
    
    const [rows] = await conn.execute(
      'SELECT discord_role FROM students_score WHERE email = ?',
      [cleanEmail]
    );

    console.log('Query results:', rows);

    if (rows.length === 0) {
      return res.status(200).json({ 
        found: false,
        message: 'Estudiante no encontrado' 
      });
    }

    const discordRole = rows[0].discord_role;
    const willBeExpelled = discordRole === 'NO';

    return res.status(200).json({
      found: true,
      willBeExpelled: willBeExpelled,
      message: willBeExpelled ? 'SI' : 'NO'
    });

  } catch (error) {
    console.error('Error details:', error);
    return res.status(500).json({ 
      error: 'Error al consultar la base de datos',
      message: error.message,
      found: false
    });
  }
}