import express from 'express';
import db from '../config/db.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let sql = `SELECT c.*, u.name as customer_name
    FROM consultations c LEFT JOIN users u ON c.user_id = u.id`;
  const params = [];

  if (req.user.role !== 'admin') {
    sql += ' WHERE c.user_id = ?';
    params.push(req.user.id);
    if (status) { sql += ' AND c.status = ?'; params.push(status); }
  } else {
    if (status) { sql += ' WHERE c.status = ?'; params.push(status); }
  }

  sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/available-slots', auth, (req, res) => {
  const { date, type } = req.query;
  if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

  const allSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  ];

  let sql = `SELECT preferred_time FROM consultations
    WHERE preferred_date = ? AND status NOT IN ('cancelled', 'no_show')`;
  const params = [date];

  if (type) {
    sql += ' AND consultation_type = ?';
    params.push(type);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const booked = rows.map(r => r.preferred_time);
    const available = allSlots.filter(slot => !booked.includes(slot));
    res.json({ date, available_slots: available, booked_slots: booked });
  });
});

router.get('/:id', auth, (req, res) => {
  let sql = `SELECT c.*, u.name as customer_name, u.email as customer_email,
    a.name as assigned_name
    FROM consultations c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN users a ON c.assigned_to = a.id
    WHERE c.id = ?`;
  const params = [req.params.id];

  if (req.user.role !== 'admin') {
    sql += ' AND c.user_id = ?';
    params.push(req.user.id);
  }

  db.get(sql, params, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Consultation not found' });
    res.json(row);
  });
});

router.post('/', auth, (req, res) => {
  const { topic, description, preferred_date, preferred_time, consultation_type } = req.body;

  if (!topic) return res.status(400).json({ error: 'topic is required' });

  db.get('SELECT name, email, phone FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    db.run(
      `INSERT INTO consultations (user_id, name, email, phone, topic, description, preferred_date, preferred_time, consultation_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        user.name,
        user.email,
        user.phone || null,
        topic,
        description || null,
        preferred_date || null,
        preferred_time || null,
        consultation_type || 'video',
      ],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        db.run(
          'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [req.user.id, 'Consultation Booked', `Your consultation request for "${topic}" has been submitted. We'll confirm shortly.`, 'consultation']
        );

        res.status(201).json({
          id: this.lastID,
          message: 'Consultation request submitted successfully',
        });
      }
    );
  });
});

router.post('/guest', (req, res) => {
  const { name, email, phone, topic, description, preferred_date, preferred_time, consultation_type } = req.body;

  if (!name || !email || !topic) {
    return res.status(400).json({ error: 'name, email, and topic are required' });
  }

  db.run(
    `INSERT INTO consultations (name, email, phone, topic, description, preferred_date, preferred_time, consultation_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, email, phone || null, topic, description || null, preferred_date || null, preferred_time || null, consultation_type || 'video'],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        id: this.lastID,
        message: 'Consultation request submitted. We will contact you at ' + email,
      });
    }
  );
});

router.put('/:id/confirm', auth, adminOnly, (req, res) => {
  db.run(
    "UPDATE consultations SET status = 'confirmed' WHERE id = ? AND status = 'pending'",
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Consultation not found or already confirmed' });

      db.get('SELECT * FROM consultations WHERE id = ?', [req.params.id], (err2, consultation) => {
        if (!err2 && consultation && consultation.user_id) {
          db.run(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [consultation.user_id, 'Consultation Confirmed', `Your consultation "${consultation.topic}" has been confirmed for ${consultation.preferred_date} at ${consultation.preferred_time}.`, 'consultation']
          );
        }
      });

      res.json({ message: 'Consultation confirmed' });
    }
  );
});

router.put('/:id/assign', auth, adminOnly, (req, res) => {
  const { assigned_to } = req.body;
  if (!assigned_to) return res.status(400).json({ error: 'assigned_to is required' });

  db.run(
    'UPDATE consultations SET assigned_to = ? WHERE id = ?',
    [assigned_to, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Consultation not found' });
      res.json({ message: 'Consultation assigned successfully' });
    }
  );
});

router.put('/:id/complete', auth, adminOnly, (req, res) => {
  const { outcome, notes } = req.body;

  db.run(
    "UPDATE consultations SET status = 'completed', outcome = COALESCE(?, outcome), notes = COALESCE(?, notes) WHERE id = ?",
    [outcome || null, notes || null, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Consultation not found' });

      db.get('SELECT * FROM consultations WHERE id = ?', [req.params.id], (err2, consultation) => {
        if (!err2 && consultation && consultation.user_id) {
          db.run(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [consultation.user_id, 'Consultation Completed', `Your consultation "${consultation.topic}" has been completed. Thank you!`, 'consultation']
          );
        }
      });

      res.json({ message: 'Consultation marked as completed' });
    }
  );
});

router.put('/:id/cancel', auth, (req, res) => {
  db.get('SELECT * FROM consultations WHERE id = ?', [req.params.id], (err, consultation) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });

    if (req.user.role !== 'admin' && consultation.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.run(
      "UPDATE consultations SET status = 'cancelled' WHERE id = ? AND status NOT IN ('completed', 'cancelled')",
      [req.params.id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(400).json({ error: 'Cannot cancel in current status' });
        res.json({ message: 'Consultation cancelled' });
      }
    );
  });
});

router.get('/admin/stats', auth, adminOnly, (req, res) => {
  db.all(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
    FROM consultations
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all(`
      SELECT topic, COUNT(*) as count FROM consultations
      GROUP BY topic ORDER BY count DESC LIMIT 10
    `, (err2, topics) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ ...rows[0], popular_topics: topics });
    });
  });
});

export default router;
