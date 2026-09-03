import express from 'express';
import db from '../config/db.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();
router.get('/summary', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return db.get(
      "SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE user_id = ? AND status = 'completed'",
      [req.user.id],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ total_paid: row.total_paid });
      }
    );
  }

const generateInvoiceNumber = () => {
  const prefix = 'RP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

router.get('/', auth, (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let sql = `SELECT p.*, o.total_price as order_total, o.id as order_number
    FROM payments p JOIN orders o ON p.order_id = o.id`;
  const params = [];

  if (req.user.role !== 'admin') {
    sql += ' WHERE p.user_id = ?';
    params.push(req.user.id);
    if (status) { sql += ' AND p.status = ?'; params.push(status); }
  } else {
    if (status) { sql += ' WHERE p.status = ?'; params.push(status); }
  }

  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/:id', auth, (req, res) => {
  let sql = `SELECT p.*, o.total_price as order_total, o.id as order_number, u.name as customer_name
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?`;
  const params = [req.params.id];

  if (req.user.role !== 'admin') {
    sql += ' AND p.user_id = ?';
    params.push(req.user.id);
  }

  db.get(sql, params, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Payment not found' });
    res.json(row);
  });
});

router.post('/process', auth, (req, res) => {
  const { order_id, method, card_last4, billing_name, billing_email, notes } = req.body;

  if (!order_id || !method) {
    return res.status(400).json({ error: 'order_id and method are required' });
  }

  const validMethods = ['credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer'];
  if (!validMethods.includes(method)) {
    return res.status(400).json({ error: `Invalid method. Must be one of: ${validMethods.join(', ')}` });
  }

  db.get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [order_id, req.user.id], (err, order) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'cancelled') return res.status(400).json({ error: 'Cannot pay for cancelled order' });

    const transaction_id = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const paymentStatus = Math.random() > 0.05 ? 'completed' : 'failed';

    db.run(
      `INSERT INTO payments (order_id, user_id, amount, method, status, transaction_id, card_last4, billing_name, billing_email, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order_id, req.user.id, order.total_price, method, paymentStatus, transaction_id, card_last4 || null, billing_name || null, billing_email || null, notes || null],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        if (paymentStatus === 'completed') {
          db.run('UPDATE orders SET status = "confirmed", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [order_id]);
          db.run(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [req.user.id, 'Payment Received', `Your payment of $${order.total_price.toFixed(2)} for order #${order_id} was successful.`, 'payment']
          );
        }

        res.status(201).json({
          id: this.lastID,
          transaction_id,
          status: paymentStatus,
          amount: order.total_price,
          message: paymentStatus === 'completed' ? 'Payment processed successfully' : 'Payment failed. Please try again.',
        });
      }
    );
  });
});

router.post('/refund/:id', auth, (req, res) => {
  const { reason } = req.body;

  db.get('SELECT * FROM payments WHERE id = ?', [req.params.id], (err, payment) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (req.user.role !== 'admin' && payment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed payments can be refunded' });
    }

    db.run(
      "UPDATE payments SET status = 'refunded', notes = COALESCE(?, notes) WHERE id = ?",
      [reason || 'Refund requested', req.params.id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        db.run(
          'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [payment.user_id, 'Refund Processed', `Your payment of $${payment.amount.toFixed(2)} has been refunded.`, 'payment']
        );

        res.json({ message: 'Refund processed successfully', amount: payment.amount });
      }
    );
  });
});

router.get('/invoices/list', auth, (req, res) => {
  let sql = `SELECT i.*, u.name as customer_name, o.id as order_number
    FROM invoices i
    JOIN users u ON i.user_id = u.id
    JOIN orders o ON i.order_id = o.id`;
  const params = [];

  if (req.user.role !== 'admin') {
    sql += ' WHERE i.user_id = ?';
    params.push(req.user.id);
  }

  sql += ' ORDER BY i.created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/invoices', auth, (req, res) => {
  const { order_id, tax_rate, discount } = req.body;

  if (!order_id) return res.status(400).json({ error: 'order_id is required' });

  db.get('SELECT * FROM orders WHERE id = ?', [order_id], (err, order) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const invoice_number = generateInvoiceNumber();
    const subtotal = order.total_price;
    const tax = parseFloat(((tax_rate || 0.08) * subtotal).toFixed(2));
    const discountAmount = parseFloat((discount || 0).toFixed(2));
    const total = parseFloat((subtotal + tax - discountAmount).toFixed(2));

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    db.run(
      `INSERT INTO invoices (invoice_number, order_id, user_id, subtotal, tax, discount, total, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoice_number, order_id, order.user_id, subtotal, tax, discountAmount, total, dueDate.toISOString().split('T')[0]],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({
          id: this.lastID,
          invoice_number,
          subtotal,
          tax,
          discount: discountAmount,
          total,
          due_date: dueDate.toISOString().split('T')[0],
        });
      }
    );
  });
});

router.put('/invoices/:id/pay', auth, (req, res) => {
  db.run(
    "UPDATE invoices SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?",
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Invoice not found' });
      res.json({ message: 'Invoice marked as paid' });
    }
  );
});



  db.all(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) as total_refunds,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_payments,
      COUNT(*) as total_transactions,
      COALESCE(AVG(CASE WHEN status = 'completed' THEN amount END), 0) as avg_transaction
    FROM payments
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all(`
      SELECT method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payments WHERE status = 'completed'
      GROUP BY method
    `, (err2, methods) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ ...rows[0], by_method: methods });
    });
  });
});

export default router;
