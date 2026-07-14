require('dotenv').config();
const jwt = require('jsonwebtoken');
const { pool, initDB } = require('../config/db');

async function run() {
  await initDB();
  const email = process.env.ADMIN_EMAIL || 'admin@shriramclothings.in';
  const r = await pool.query('SELECT id, role, business_id, store_id, warehouse_id FROM src_users WHERE email=$1', [email]);
  if (!r.rows.length) {
    console.error('Admin user not found. Run createAdmin.js first.');
    process.exit(1);
  }
  const user = r.rows[0];
  const token = jwt.sign({ id: user.id, role: user.role, business_id: user.business_id || null, store_id: user.store_id || null, warehouse_id: user.warehouse_id || null }, process.env.JWT_SECRET, { expiresIn: '7d' });
  console.log(token);
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
