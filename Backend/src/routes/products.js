import express from 'express';
import db from '../config/db.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { category, search, min_price, max_price, sort } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (min_price) {
    sql += ' AND base_price >= ?';
    params.push(parseFloat(min_price));
  }
  if (max_price) {
    sql += ' AND base_price <= ?';
    params.push(parseFloat(max_price));
  }

  if (sort === 'price_asc') sql += ' ORDER BY base_price ASC';
  else if (sort === 'price_desc') sql += ' ORDER BY base_price DESC';
  else if (sort === 'newest') sql += ' ORDER BY created_at DESC';
  else sql += ' ORDER BY name ASC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/categories', (req, res) => {
  db.all('SELECT DISTINCT category FROM products ORDER BY category', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.category));
  });
});

router.get('/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json(row);
  });
});

router.post('/', auth, adminOnly, (req, res) => {
  const { name, description, category, base_price, image_url, customizable, estimated_days } = req.body;
  if (!name || !category || !base_price) {
    return res.status(400).json({ error: 'Name, category, and base_price are required' });
  }

  db.run(
    'INSERT INTO products (name, description, category, base_price, image_url, customizable, estimated_days) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, description || null, category, base_price, image_url || null, customizable ?? 1, estimated_days || 3],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Product created successfully' });
    }
  );
});

router.put('/:id', auth, adminOnly, (req, res) => {
  const { name, description, category, base_price, image_url, customizable, estimated_days } = req.body;

  db.run(
    `UPDATE products SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      category = COALESCE(?, category),
      base_price = COALESCE(?, base_price),
      image_url = COALESCE(?, image_url),
      customizable = COALESCE(?, customizable),
      estimated_days = COALESCE(?, estimated_days)
    WHERE id = ?`,
    [name, description, category, base_price, image_url, customizable, estimated_days, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
      res.json({ message: 'Product updated successfully' });
    }
  );
});

router.delete('/:id', auth, adminOnly, (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  });
});

router.get('/:id/reviews', (req, res) => {
  db.all(
    `SELECT r.*, u.name as user_name FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.product_id = ? ORDER BY r.created_at DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/:id/reviews', auth, (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  db.run(
    'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)',
    [req.user.id, req.params.id, rating, comment || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Review added successfully' });
    }
  );
});

export default router;
