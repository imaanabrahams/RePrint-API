import express from 'express';
import db from '../config/db.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.use(auth, adminOnly);

router.get('/dashboard', (req, res) => {
  const queries = {
    users: 'SELECT COUNT(*) as count FROM users',
    orders: 'SELECT COUNT(*) as count FROM orders',
    revenue: 'SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE status != "cancelled"',
    products: 'SELECT COUNT(*) as count FROM products',
    designs: 'SELECT COUNT(*) as count FROM designs WHERE status = "submitted"',
    materials: 'SELECT COUNT(*) as count FROM materials WHERE in_stock = 1',
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, sql]) => {
    db.get(sql, (err, row) => {
      results[key] = err ? 0 : (row.count ?? row.total);
      completed++;
      if (completed === total) {
        res.json(results);
      }
    });
  });
});

router.get('/users', (req, res) => {
  db.all('SELECT id, name, email, role, phone, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/orders/all', (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let sql = `SELECT o.*, p.name as product_name, m.name as material_name, u.name as customer_name
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN materials m ON o.material_id = m.id
    JOIN users u ON o.user_id = u.id`;
  const params = [];

  if (status) {
    sql += ' WHERE o.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/designs/pending', (req, res) => {
  db.all(
    `SELECT d.*, u.name as customer_name, u.email as customer_email
     FROM designs d JOIN users u ON d.user_id = u.id
     WHERE d.status = 'submitted' ORDER BY d.created_at ASC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.put('/designs/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['approved', 'rejected'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }

  db.run(
    'UPDATE designs SET status = ? WHERE id = ?',
    [status, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Design not found' });
      res.json({ message: `Design ${status}` });
    }
  );
});

export default router;
