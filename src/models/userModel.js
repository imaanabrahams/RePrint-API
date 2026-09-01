import pool from '../config/db.js';

export const findUserByEmail = async (email) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
};

export const findEmployeeByUserId = async (userId) => {
  const [rows] = await pool.query('SELECT * FROM employees WHERE user_id = ?', [userId]);
  return rows[0];
};

export const createUser = async (name, email, hashedPassword, role = 'customer', phone = null, address = null) => {
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, hashedPassword, role, phone, address]
  );
  return result.insertId;
};

// Add these two functions below:
export const findUserById = async (id) => {
  const [rows] = await pool.query('SELECT id, name, email, role, phone, address FROM users WHERE id = ?', [id]);
  return rows[0];
};

export const getOrdersByUserId = async (userId) => {
  const [rows] = await pool.query('SELECT * FROM orders WHERE user_id = ?', [userId]);
  return rows;
};