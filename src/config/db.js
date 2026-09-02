import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'reprint_api',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Initialize tables on startup
const initDB = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('Connected to MySQL database');

    const schemaPath = path.join(import.meta.dirname, '../../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolons but skip empty statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      // Skip USE and CREATE DATABASE statements, handled by setup script
      if (stmt.toUpperCase().startsWith('USE ') || stmt.toUpperCase().startsWith('CREATE DATABASE')) continue;
      await conn.query(stmt);
    }

    conn.release();
    console.log('MySQL tables initialized');
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
};

initDB();

// Wrapper that provides sqlite3-compatible callback API
// so route files need zero changes
const db = {
  get(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    pool.query(sql, params)
      .then(([rows]) => {
        callback(null, rows[0] || undefined);
      })
      .catch(err => {
        callback(err);
      });
  },

  all(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    pool.query(sql, params)
      .then(([rows]) => {
        callback(null, rows);
      })
      .catch(err => {
        callback(err);
      });
  },

  run(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    pool.query(sql, params)
      .then(([result]) => {
        const context = {
          lastID: result.insertId,
          changes: result.affectedRows,
        };
        if (callback) callback.call(context, null);
      })
      .catch(err => {
        if (callback) callback.call({}, err);
      });
  },

  close() {
    return pool.end();
  },
};

export default db;
