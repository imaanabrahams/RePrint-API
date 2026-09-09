import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const setup = async () => {
  // Connect without database to create it
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306,
  });

  console.log('Connected to MySQL server');

  // Read and execute schema
  const schemaPath = path.join(import.meta.dirname, '../../schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Split by semicolons and execute each statement
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
    } catch (err) {
      // Skip duplicate database/table errors on re-run
      if (err.code !== 'ER_DB_CREATE_EXISTS' && err.code !== 'ER_TABLE_EXISTS_ERROR') {
        console.error('Error executing statement:', err.message);
        console.error('Statement:', stmt.substring(0, 80) + '...');
      }
    }
  }

  // Migrate existing tables with new columns (idempotent)
  const productColumns = {
    rating: 'DECIMAL(2,1) DEFAULT 4.5',
    reviews: 'INT DEFAULT 0',
    featured: 'BOOLEAN DEFAULT FALSE',
    options: 'JSON',
  };

  for (const [column, definition] of Object.entries(productColumns)) {
    const [rows] = await conn.query(
      'SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [process.env.DB_NAME || 'reprint_api', 'products', column]
    );
    if (rows[0].count === 0) {
      await conn.query(`ALTER TABLE products ADD COLUMN ${column} ${definition}`);
      console.log(`Added column products.${column}`);
    }
  }

  console.log('Database "reprint_api" created and tables initialized successfully!');
  console.log('');
  console.log('You can now:');
  console.log('  1. Run "npm run seed" to populate with sample data');
  console.log('  2. Run "npm run dev" to start the API server');
  console.log('  3. Open MySQL Workbench to view/edit data at localhost:3307');

  await conn.end();
};

setup().catch(err => {
  console.error('Setup failed:', err.message || err);
  process.exit(1);
});
