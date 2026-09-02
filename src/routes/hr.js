import express from 'express';
import db from '../config/db.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.use(auth, adminOnly);

router.get('/employees', (req, res) => {
  const { department, status } = req.query;
  let sql = `SELECT e.*, u.name, u.email, u.phone
    FROM employees e JOIN users u ON e.user_id = u.id WHERE 1=1`;
  const params = [];

  if (department) { sql += ' AND e.department = ?'; params.push(department); }
  if (status) { sql += ' AND e.status = ?'; params.push(status); }

  sql += ' ORDER BY e.created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/employees/:id', (req, res) => {
  db.get(
    `SELECT e.*, u.name, u.email, u.phone
     FROM employees e JOIN users u ON e.user_id = u.id WHERE e.id = ?`,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Employee not found' });
      res.json(row);
    }
  );
});

router.post('/employees', (req, res) => {
  const { user_id, employee_id, position, department, hire_date, salary, employment_type, emergency_contact, emergency_phone } = req.body;

  if (!user_id || !employee_id || !position || !department || !hire_date) {
    return res.status(400).json({ error: 'user_id, employee_id, position, department, and hire_date are required' });
  }

  db.run(
    `INSERT INTO employees (user_id, employee_id, position, department, hire_date, salary, employment_type, emergency_contact, emergency_phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_id, employee_id, position, department, hire_date, salary || null, employment_type || 'full_time', emergency_contact || null, emergency_phone || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Employee added successfully' });
    }
  );
});

router.put('/employees/:id', (req, res) => {
  const { position, department, salary, employment_type, status, emergency_contact, emergency_phone } = req.body;

  db.run(
    `UPDATE employees SET
      position = COALESCE(?, position),
      department = COALESCE(?, department),
      salary = COALESCE(?, salary),
      employment_type = COALESCE(?, employment_type),
      status = COALESCE(?, status),
      emergency_contact = COALESCE(?, emergency_contact),
      emergency_phone = COALESCE(?, emergency_phone)
    WHERE id = ?`,
    [position, department, salary, employment_type, status, emergency_contact, emergency_phone, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Employee not found' });
      res.json({ message: 'Employee updated successfully' });
    }
  );
});

router.delete('/employees/:id', (req, res) => {
  db.run('DELETE FROM employees WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee removed successfully' });
  });
});

router.get('/shifts', (req, res) => {
  const { date, employee_id, department } = req.query;
  let sql = `SELECT s.*, e.employee_id as emp_code, e.position, e.department, u.name as employee_name
    FROM shifts s
    JOIN employees e ON s.employee_id = e.id
    JOIN users u ON e.user_id = u.id WHERE 1=1`;
  const params = [];

  if (date) { sql += ' AND s.shift_date = ?'; params.push(date); }
  if (employee_id) { sql += ' AND s.employee_id = ?'; params.push(employee_id); }
  if (department) { sql += ' AND e.department = ?'; params.push(department); }

  sql += ' ORDER BY s.shift_date DESC, s.start_time ASC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/shifts', (req, res) => {
  const { employee_id, shift_date, start_time, end_time, break_minutes, notes } = req.body;

  if (!employee_id || !shift_date || !start_time || !end_time) {
    return res.status(400).json({ error: 'employee_id, shift_date, start_time, and end_time are required' });
  }

  db.run(
    `INSERT INTO shifts (employee_id, shift_date, start_time, end_time, break_minutes, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [employee_id, shift_date, start_time, end_time, break_minutes || 30, notes || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Shift scheduled successfully' });
    }
  );
});

router.post('/shifts/bulk', (req, res) => {
  const { shifts } = req.body;
  if (!Array.isArray(shifts) || shifts.length === 0) {
    return res.status(400).json({ error: 'shifts array is required' });
  }

  let inserted = 0;
  let errors = [];

  shifts.forEach((s, i) => {
    db.run(
      `INSERT INTO shifts (employee_id, shift_date, start_time, end_time, break_minutes, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [s.employee_id, s.shift_date, s.start_time, s.end_time, s.break_minutes || 30, s.notes || null],
      function (err) {
        if (err) errors.push({ index: i, error: err.message });
        else inserted++;
        if (inserted + errors.length === shifts.length) {
          res.status(201).json({ inserted, errors, message: `${inserted} shifts created` });
        }
      }
    );
  });
});

router.put('/shifts/:id', (req, res) => {
  const { start_time, end_time, break_minutes, status, notes } = req.body;

  db.run(
    `UPDATE shifts SET
      start_time = COALESCE(?, start_time),
      end_time = COALESCE(?, end_time),
      break_minutes = COALESCE(?, break_minutes),
      status = COALESCE(?, status),
      notes = COALESCE(?, notes)
    WHERE id = ?`,
    [start_time, end_time, break_minutes, status, notes, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Shift not found' });
      res.json({ message: 'Shift updated successfully' });
    }
  );
});

router.get('/schedule/weekly', (req, res) => {
  const { week_start } = req.query;
  if (!week_start) return res.status(400).json({ error: 'week_start (YYYY-MM-DD) is required' });

  const endDate = new Date(week_start);
  endDate.setDate(endDate.getDate() + 6);

  db.all(
    `SELECT s.*, e.employee_id as emp_code, e.position, e.department, u.name as employee_name
     FROM shifts s
     JOIN employees e ON s.employee_id = e.id
     JOIN users u ON e.user_id = u.id
     WHERE s.shift_date BETWEEN ? AND ?
     ORDER BY s.shift_date, s.start_time`,
    [week_start, endDate.toISOString().split('T')[0]],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const schedule = {};
      rows.forEach(row => {
        if (!schedule[row.shift_date]) schedule[row.shift_date] = [];
        schedule[row.shift_date].push(row);
      });

      res.json(schedule);
    }
  );
});

router.get('/reports/overview', (req, res) => {
  const queries = {
    totalEmployees: 'SELECT COUNT(*) as count FROM employees WHERE status = "active"',
    byDepartment: 'SELECT department, COUNT(*) as count FROM employees WHERE status = "active" GROUP BY department',
    byType: 'SELECT employment_type, COUNT(*) as count FROM employees WHERE status = "active" GROUP BY employment_type',
    recentHires: `SELECT e.*, u.name FROM employees e JOIN users u ON e.user_id = u.id
      ORDER BY e.hire_date DESC LIMIT 5`,
    totalPayroll: 'SELECT COALESCE(SUM(salary), 0) as total FROM employees WHERE status = "active" AND salary IS NOT NULL',
    shiftsToday: `SELECT COUNT(*) as count FROM shifts
      WHERE shift_date = CURDATE() AND status != 'cancelled'`,
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, sql]) => {
    db.all(sql, (err, rows) => {
      if (key === 'totalEmployees' || key === 'shiftsToday' || key === 'totalPayroll') {
        results[key] = err ? 0 : (rows[0]?.count ?? rows[0]?.total ?? 0);
      } else {
        results[key] = err ? [] : rows;
      }
      completed++;
      if (completed === total) res.json(results);
    });
  });
});

export default router;
