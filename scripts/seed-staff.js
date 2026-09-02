import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'reprint_api',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5,
});

// Each staff account maps to an existing employee record (by position/department)
// and to the user account the employee currently links to (all currently user_id=1).
const staff = [
  { employeeId: 'EMP-001', email: 'aisha.d@reprint.co.za', name: 'Aisha Daniels', password: 'staff123', position: 'CEO' },
  { employeeId: 'EMP-002', email: 'thabo.m@reprint.co.za', name: 'Thabo Mokoena', password: 'staff123', position: '3D Print Technician' },
  { employeeId: 'EMP-003', email: 'chantelle.a@reprint.co.za', name: 'Chantelle Adams', password: 'staff123', position: 'Design Specialist' },
];

const run = async () => {
  for (const s of staff) {
    const hashed = await bcrypt.hash(s.password, 10);

    const emp = await pool.query('SELECT id, user_id FROM employees WHERE employee_id=?', [s.employeeId]);
    if (!emp[0].length) {
      console.log('skip, no employee for', s.employeeId);
      continue;
    }
    const empId = emp[0][0].id;
    const oldUserId = emp[0][0].user_id;

    // find or create a user for this staff email
    const existing = await pool.query('SELECT id FROM users WHERE email=?', [s.email]);
    let staffUserId;
    if (existing[0].length) {
      staffUserId = existing[0][0].id;
      await pool.query('UPDATE users SET name=?, password=?, role=? WHERE id=?', [s.name, hashed, 'admin', staffUserId]);
    } else {
      const ins = await pool.query(
        'INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)',
        [s.name, s.email, hashed, 'admin']
      );
      staffUserId = ins[0].insertId;
    }

    // point the employee record at the staff user
    await pool.query('UPDATE employees SET user_id=? WHERE id=?', [staffUserId, empId]);

    console.log(`linked ${s.email} (user ${staffUserId}) -> employee ${s.employeeId} (was user ${oldUserId})`);
  }
  await pool.end();
};

run().then(() => console.log('done')).catch(e => { console.error(e); process.exit(1); });