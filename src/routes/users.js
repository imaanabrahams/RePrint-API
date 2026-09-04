import express from 'express';
import db from '../config/db.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', auth, (req, res) => {
  const userId = req.user.id;
  const queries = {
    totalOrders: { sql: 'SELECT COUNT(*) as count FROM orders WHERE user_id = ?', params: [userId] },
    activeOrders: { sql: "SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status NOT IN ('delivered','cancelled')", params: [userId] },
    totalSpent: { sql: "SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE user_id = ? AND status != 'cancelled'", params: [userId] },
    designs: { sql: 'SELECT COUNT(*) as count FROM designs WHERE user_id = ?', params: [userId] },
    pendingDesigns: { sql: "SELECT COUNT(*) as count FROM designs WHERE user_id = ? AND status = 'submitted'", params: [userId] },
    consultations: { sql: 'SELECT COUNT(*) as count FROM consultations WHERE user_id = ?', params: [userId] },
    pendingConsultations: { sql: "SELECT COUNT(*) as count FROM consultations WHERE user_id = ? AND status = 'pending'", params: [userId] },
    unreadNotifications: { sql: 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0', params: [userId] },
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, { sql, params }]) => {
    db.get(sql, params, (err, row) => {
      results[key] = err ? 0 : (row.count ?? row.total ?? 0);
      completed++;
      if (completed === total) res.json(results);
    });
  });
});

router.get('/orders', auth, (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let sql = `SELECT o.*, p.name as product_name, m.name as material_name, d.name as design_name
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN materials m ON o.material_id = m.id
    LEFT JOIN designs d ON o.design_id = d.id
    WHERE o.user_id = ?`;
  const params = [req.user.id];

  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/notifications', auth, (req, res) => {
  const { unread_only } = req.query;
  let sql = 'SELECT * FROM notifications WHERE user_id = ?';
  const params = [req.user.id];

  if (unread_only === 'true') sql += ' AND `read` = 0';
  

  sql += ' ORDER BY created_at DESC LIMIT 50';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.put('/notifications/:id/read', auth, (req, res) => {
  db.run(
    'UPDATE notifications SET `read` = 1 WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Notification not found' });
      res.json({ message: 'Notification marked as read' });
    }
  );
});

router.put('/notifications/read-all', auth, (req, res) => {
  db.run(
    'UPDATE notifications SET `read` = 1 WHERE user_id = ? AND `read` = 0',
    [req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'All notifications marked as read', count: this.changes });
    }
  );
});

router.get('/addresses', auth, (req, res) => {
  db.get('SELECT address, phone FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || {});
  });
});

router.put('/profile', auth, (req, res) => {
  const { name, phone, address } = req.body;
  db.run(
    'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?',
    [name || null, phone || null, address || null, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

router.get('/wishlist', auth, (req, res) => {
  db.all(
    `SELECT p.* FROM products p
     JOIN wishlist w ON p.id = w.product_id
     WHERE w.user_id = ?
     ORDER BY w.created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) {
        if (err.message.includes('no such table')) return res.json([]);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

router.post ('/wishlist/:productId', auth, (req, res) => {
  db.run(
    'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)',
    [req.user.id, req.params.productId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Added to wishlist' });
    }
  );
});

router.delete('/wishlist/:productId', auth, (req, res) => {
  db.run(
    'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?',
    [req.user.id, req.params.productId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Removed from wishlist' });
    }
  );
});

export default router;
