import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { pathToFileURL } from 'url';
import { createPool } from './seed.js';

// Each staff account maps to an existing employee record (by employee_id)
// and creates/updates the user account the employee links to.
const staff = [
  { employeeId: 'EMP-001', email: 'aisha.d@reprint.co.za', name: 'Aisha Daniels', password: 'staff123', position: 'CEO' },
  { employeeId: 'EMP-002', email: 'thabo.m@reprint.co.za', name: 'Thabo Mokoena', password: 'staff123', position: '3D Print Technician' },
  { employeeId: 'EMP-003', email: 'chantelle.a@reprint.co.za', name: 'Chantelle Adams', password: 'staff123', position: 'Design Specialist' },
  { employeeId: 'EMP-004', email: 'kyle.b@reprint.co.za', name: 'Kyle Botha', password: 'staff123', position: 'Production Manager' },
  { employeeId: 'EMP-005', email: 'naledi.d@reprint.co.za', name: 'Naledi Dlamini', password: 'staff123', position: 'Sales Representative' },
  { employeeId: 'EMP-006', email: 'pieter.v@reprint.co.za', name: 'Pieter van Wyk', password: 'staff123', position: 'HR Coordinator' },
  { employeeId: 'EMP-007', email: 'zanele.n@reprint.co.za', name: 'Zanele Nkosi', password: 'staff123', position: 'Junior Designer' },
  { employeeId: 'EMP-008', email: 'tyler.j@reprint.co.za', name: 'Tyler Jacobs', password: 'staff123', position: 'Support Engineer' },
  { employeeId: 'EMP-009', email: 'megan.f@reprint.co.za', name: 'Megan Fourie', password: 'staff123', position: 'Finance Officer' },
  { employeeId: 'EMP-010', email: 'gift.m@reprint.co.za', name: 'Gift Mthembu', password: 'staff123', position: 'Warehouse Associate' },
];

export const seedStaff = async () => {
  const pool = createPool();

  for (const s of staff) {
    const hashed = await bcrypt.hash(s.password, 10);

    const [emps] = await pool.query('SELECT id, user_id FROM employees WHERE employee_id=?', [s.employeeId]);
    if (!emps.length) {
      console.log('skip, no employee for', s.employeeId);
      continue;
    }
    const empId = emps[0].id;
    const oldUserId = emps[0].user_id;

    const [existing] = await pool.query('SELECT id FROM users WHERE email=?', [s.email]);
    let staffUserId;
    if (existing.length) {
      staffUserId = existing[0].id;
      await pool.query('UPDATE users SET name=?, password=?, role=? WHERE id=?', [s.name, hashed, 'admin', staffUserId]);
    } else {
      const [ins] = await pool.query(
        'INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)',
        [s.name, s.email, hashed, 'admin']
      );
      staffUserId = ins.insertId;
    }

    await pool.query('UPDATE employees SET user_id=? WHERE id=?', [staffUserId, empId]);

    console.log(`linked ${s.email} (user ${staffUserId}) -> employee ${s.employeeId} (was user ${oldUserId})`);
  }

  await pool.end();
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  seedStaff()
    .then(() => console.log('done'))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}