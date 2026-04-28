require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, initDB } = require('./config/db');

async function createAdmin() {
  await initDB();
  const email = process.env.ADMIN_EMAIL || 'admin@shriramclothings.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@2024';
  const name = 'Admin';
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO src_users (name, email, password, role) VALUES ($1,$2,$3,'admin')
     ON CONFLICT (email) DO UPDATE SET password=$3, role='admin'`,
    [name, email, hash]
  );
  console.log(`✅ Admin created: ${email} / ${password}`);
  process.exit(0);
}

createAdmin().catch(err => { console.error(err.message); process.exit(1); });
