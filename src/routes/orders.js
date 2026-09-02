import express from 'express';
import db from '../config/db.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let sql = `SELECT o.*, p.name as product_name, m.name as material_name, d.name as design_name
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN materials m ON o.material_id = m.id
    LEFT JOIN designs d ON o.design_id = d.id`;
  const params = [];

  if (req.user.role === 'admin') {
    if (status) {
      sql += ' WHERE o.status = ?';
      params.push(status);
    }
  } else {
    sql += ' WHERE o.user_id = ?';
    params.push(req.user.id);
    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
  }

  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/stats', auth, adminOnly, (req, res) => {
  db.all(`
    SELECT
      COUNT(*) as total_orders,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN status = 'printing' THEN 1 ELSE 0 END) as printing,
      SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(total_price) as total_revenue
    FROM orders
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows[0]);
  });
});

router.get('/:id', auth, (req, res) => {
  const sql = `SELECT o.*, p.name as product_name, p.description as product_description,
    m.name as material_name, d.name as design_name, d.customizations as design_customizations,
    u.name as customer_name, u.email as customer_email
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN materials m ON o.material_id = m.id
    LEFT JOIN designs d ON o.design_id = d.id
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?`;

  db.get(sql, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin' && row.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(row);
  });
});

router.post('/', auth, (req, res) => {
  const { product_id, design_id, material_id, quantity, customizations, shipping_address, notes } = req.body;

  if (!material_id) return res.status(400).json({ error: 'Material is required' });
  if (!product_id && !design_id) return res.status(400).json({ error: 'Either product_id or design_id is required' });

  const calculatePrice = () => {
    return new Promise((resolve, reject) => {
      if (design_id) {
        db.get('SELECT estimated_price FROM designs WHERE id = ?', [design_id], (err, row) => {
          if (err) reject(err);
          if (!row) reject(new Error('Design not found'));
          resolve(row.estimated_price || 0);
        });
      } else {
        db.get('SELECT base_price FROM products WHERE id = ?', [product_id], (err, row) => {
          if (err) reject(err);
          if (!row) reject(new Error('Product not found'));
          resolve(row.base_price);
        });
      }
    });
  };

  const getMaterialMultiplier = () => {
    return new Promise((resolve, reject) => {
      db.get('SELECT price_per_gram FROM materials WHERE id = ?', [material_id], (err, row) => {
        if (err) reject(err);
        if (!row) reject(new Error('Material not found'));
        resolve(row.price_per_gram);
      });
    });
  };

  Promise.all([calculatePrice(), getMaterialMultiplier()])
    .then(([basePrice, materialPrice]) => {
      const qty = parseInt(quantity) || 1;
      const total_price = parseFloat(((basePrice + materialPrice * 50) * qty).toFixed(2));

      db.run(
        `INSERT INTO orders (user_id, product_id, design_id, material_id, quantity, customizations, total_price, shipping_address, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          product_id || null,
          design_id || null,
          material_id,
          qty,
          customizations ? JSON.stringify(customizations) : null,
          total_price,
          shipping_address || null,
          notes || null,
        ],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.status(201).json({
            id: this.lastID,
            total_price,
            message: 'Order placed successfully',
          });
        }
      );
    })
    .catch(err => res.status(400).json({ error: err.message }));
});

router.put('/:id/status', auth, adminOnly, (req, res) => {
  const { status, tracking_number } = req.body;
  const validStatuses = ['pending', 'confirmed', 'printing', 'quality_check', 'shipped', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  db.run(
    'UPDATE orders SET status = ?, tracking_number = COALESCE(?, tracking_number), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, tracking_number || null, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Order not found' });
      res.json({ message: 'Order status updated successfully' });
    }
  );
});

router.delete('/:id', auth, (req, res) => {
  db.get('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, order) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!['pending', 'confirmed'].includes(order.status) && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Cannot cancel order in current status' });
    }

    db.run(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['cancelled', req.params.id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Order cancelled successfully' });
      }
    );
  });
});

export default router;
