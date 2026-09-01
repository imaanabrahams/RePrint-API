import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (name, email, password, phone, address) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, phone || null, address || null],
        function (err) {
          if (err) reject(err);
          resolve({ id: this.lastID });
        }
      );
    });

    const token = jwt.sign({ id: result.id, email, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: result.id, name, email, role: 'customer' },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Staff login — accepts employee ID (e.g. EMP-001) or work email + password.
// Only users linked to an employee record (or admins) may use the staff portal.
router.post('/staff-login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Employee ID / email and password are required' });

    let user = null;

    if (String(identifier).includes('@')) {
      user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [identifier], (err, row) => err ? reject(err) : resolve(row));
      });
    } else {
      // resolve employee by employee_id, then find its linked user
      const emp = await new Promise((resolve, reject) => {
        db.get('SELECT user_id FROM employees WHERE employee_id = ?', [identifier], (err, row) => err ? reject(err) : resolve(row));
      });
      if (emp) {
        user = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM users WHERE id = ?', [emp.user_id], (err, row) => err ? reject(err) : resolve(row));
        });
      }
    }

    if (!user) return res.status(401).json({ error: 'No staff account found for that ID or email' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    // Confirm the user is actually staff (has an employee record) or an admin
    const isStaff = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM employees WHERE user_id = ?', [user.id], (err, row) => {
        if (err) return reject(err);
        resolve(!!row);
      });
    });
    if (!isStaff && user.role !== 'admin') {
      return res.status(403).json({ error: 'This account does not have staff access' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Staff login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, name, email, role, phone, address, created_at FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/me', auth, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?',
        [name || null, phone || null, address || null, req.user.id],
        (err) => (err ? reject(err) : resolve())
      );
    });

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
