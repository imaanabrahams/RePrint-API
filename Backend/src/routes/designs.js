import express from 'express';
import db from '../config/db.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, (req, res) => {
  db.all(
    `SELECT d.*, p.name as product_name, m.name as material_name
     FROM designs d
     LEFT JOIN products p ON d.product_id = p.id
     LEFT JOIN materials m ON d.material_id = m.id
     WHERE d.user_id = ?
     ORDER BY d.created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.get('/:id', auth, (req, res) => {
  db.get('SELECT * FROM designs WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Design not found' });
    res.json(row);
  });
});

router.post('/', auth, (req, res) => {
  const { name, description, file_url, dimensions, customizations, estimated_price, preview_url } = req.body;

  if (!name) return res.status(400).json({ error: 'Design name is required' });

  db.run(
    `INSERT INTO designs (user_id, name, description, file_url, dimensions, customizations, estimated_price, preview_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      name,
      description || null,
      file_url || null,
      dimensions ? JSON.stringify(dimensions) : null,
      customizations ? JSON.stringify(customizations) : null,
      estimated_price || null,
      preview_url || null,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Design created successfully' });
    }
  );
});

router.put('/:id', auth, (req, res) => {
  const { name, description, file_url, dimensions, customizations, estimated_price, preview_url } = req.body;

  db.run(
    `UPDATE designs SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      file_url = COALESCE(?, file_url),
      dimensions = COALESCE(?, dimensions),
      customizations = COALESCE(?, customizations),
      estimated_price = COALESCE(?, estimated_price),
      preview_url = COALESCE(?, preview_url)
    WHERE id = ? AND user_id = ?`,
    [
      name,
      description,
      file_url,
      dimensions ? JSON.stringify(dimensions) : null,
      customizations ? JSON.stringify(customizations) : null,
      estimated_price,
      preview_url,
      req.params.id,
      req.user.id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Design not found' });
      res.json({ message: 'Design updated successfully' });
    }
  );
});

router.post('/:id/submit', auth, (req, res) => {
  db.run(
    "UPDATE designs SET status = 'submitted' WHERE id = ? AND user_id = ? AND status = 'draft'",
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Design not found or already submitted' });
      res.json({ message: 'Design submitted for review' });
    }
  );
});

router.get('/templates/all', (req, res) => {
  const templates = [
    { id: 1, name: 'Phone Case Template', category: 'Accessories', description: 'Base template for phone cases', customizable_params: '{"phone_model":["iPhone 15","iPhone 14","Samsung S24","Pixel 8"],"pattern":["solid","geometric","organic","minimal"],"color":["red","blue","green","black","white","custom"]}' },
    { id: 2, name: 'Keychain Template', category: 'Accessories', description: 'Base template for keychains', customizable_params: '{"shape":["circle","square","heart","star","custom"],"text":["short_text"],"infill":[25,50,75,100]}' },
    { id: 3, name: 'Figurine Template', category: 'Hobby', description: 'Base template for figurines', customizable_params: '{"style":["realistic","cartoon","pixel","low_poly"],"size":["small","medium","large"],"base":["included","excluded"]}' },
    { id: 4, name: 'Plant Pot Template', category: 'Garden', description: 'Base template for plant pots', customizable_params: '{"style":["geometric","smooth","ribbed","hexagonal"],"size":["small","medium","large"],"drainage_hole":["yes","no"]}' },
    { id: 5, name: 'Vase Template', category: 'Decor', description: 'Base template for vases', customizable_params: '{"shape":["cylinder","cone","sphere","twisted"],"height":["15cm","25cm","35cm"],"wall_thickness":["thin","medium","thick"]}' },
  ];

  res.json(templates);
});

router.get('/customize/price', auth, (req, res) => {
  const { template_id, material_id, size, infill } = req.query;

  if (!template_id || !material_id) {
    return res.status(400).json({ error: 'template_id and material_id are required' });
  }

  db.get('SELECT price_per_gram FROM materials WHERE id = ?', [material_id], (err, material) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!material) return res.status(404).json({ error: 'Material not found' });

    const sizeMultiplier = { small: 20, medium: 50, large: 100 };
    const infillRate = (parseInt(infill) || 50) / 100;
    const estimatedWeight = (sizeMultiplier[size] || 50) * (0.5 + infillRate * 0.5);
    const estimated_price = parseFloat((material.price_per_gram * estimatedWeight).toFixed(2));

    res.json({
      template_id: parseInt(template_id),
      material: material.name,
      size: size || 'medium',
      infill: parseInt(infill) || 50,
      estimated_weight_grams: estimatedWeight,
      estimated_price,
    });
  });
});

export default router;
