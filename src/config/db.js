import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Kirsten.L1404',
  database: 'reprint_api',
  waitForConnections: true,
  connectionLimit: 10
});

export default pool;
