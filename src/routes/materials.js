import express from 'express';
import db from '../config/db.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', (req, res) => {
  db.all('SELECT * FROM materials WHERE in_stock = 1 ORDER BY name', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/:id', (req, res) => {
  db.get('SELECT * FROM materials WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Material not found' });
    res.json(row);
  });
});

router.get('/price/estimate', (req, res) => {
  const { material_id, weight_grams } = req.query;
  if (!material_id || !weight_grams) {
    return res.status(400).json({ error: 'material_id and weight_grams are required' });
  }

  db.get('SELECT * FROM materials WHERE id = ?', [material_id], (err, material) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!material) return res.status(404).json({ error: 'Material not found' });

    const estimated_price = (material.price_per_gram * parseFloat(weight_grams)).toFixed(2);
    res.json({
      material: material.name,
      weight_grams: parseFloat(weight_grams),
      price_per_gram: material.price_per_gram,
      estimated_price: parseFloat(estimated_price),
    });
  });
});

router.post('/', auth, adminOnly, (req, res) => {
  const { name, description, color, price_per_gram, properties } = req.body;
  if (!name || !price_per_gram) {
    return res.status(400).json({ error: 'Name and price_per_gram are required' });
  }

  db.run(
    'INSERT INTO materials (name, description, color, price_per_gram, properties) VALUES (?, ?, ?, ?, ?)',
    [name, description || null, color || 'Various', price_per_gram, properties || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Material added successfully' });
    }
  );
});

export default router;
