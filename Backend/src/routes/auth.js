import express from 'express';
import bcrypt from 'bcrypt';
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
    const crypto = await import('node:crypto');
    const verificationToken = crypto.randomUUID();

    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (name, email, password, phone, address, verification_token) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, hashedPassword, phone || null, address || null, verificationToken],
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
      verificationToken,
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

// ---- Forgot / Reset password & Email verification ----

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => err ? reject(err) : resolve(row));
    });

    // Always return success so we don't leak which emails exist
    if (user) {
      const crypto = await import('node:crypto');
      const resetToken = crypto.randomUUID();
      const expires = new Date(Date.now() + 3600_000); // 1 hour
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
          [resetToken, expires, user.id],
          (err) => (err ? reject(err) : resolve())
        );
      });
    }

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });

    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
        [token],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
        [hashedPassword, user.id],
        (err) => (err ? reject(err) : resolve())
      );
    });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Verification token is required' });

    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM users WHERE verification_token = ?',
        [token],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE id = ?',
        [user.id],
        (err) => (err ? reject(err) : resolve())
      );
    });

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
