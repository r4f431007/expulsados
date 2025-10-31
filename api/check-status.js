import mysql from 'mysql2/promise';

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
    console.log('Database pool created');
  }
  return pool;
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

  let connection = null;

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

    const poolConnection = getPool();
    connection = await poolConnection.getConnection();
    
    const [rows] = await connection.execute(
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
  } finally {
    if (connection) {
      connection.release();
    }
  }
}