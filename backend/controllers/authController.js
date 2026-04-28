const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Name, email and password are required' });
  try {
    const exists = await pool.query('SELECT id FROM src_users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ message: 'Email already registered' });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO src_users (name, email, password, phone) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role, avatar_url, phone',
      [name, email, hash, phone || null]
    );
    const user = result.rows[0];
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  try {
    const result = await pool.query('SELECT * FROM src_users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password || '')))
      return res.status(401).json({ message: 'Invalid credentials' });
    if (user.is_banned) return res.status(403).json({ message: 'Account has been banned' });
    const { password: _, ...safeUser } = user;
    res.json({ token: signToken(user), user: safeUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, avatar_url, phone, is_banned, created_at FROM src_users WHERE id=$1',
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'User not found' });
    if (result.rows[0].is_banned) return res.status(403).json({ message: 'Account banned' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  const avatar_url = req.file?.path;
  try {
    const fields = [], values = [];
    let idx = 1;
    if (name) { fields.push(`name=$${idx++}`); values.push(name); }
    if (phone !== undefined) { fields.push(`phone=$${idx++}`); values.push(phone); }
    if (avatar_url) { fields.push(`avatar_url=$${idx++}`); values.push(avatar_url); }
    if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });
    values.push(req.user.id);
    const result = await pool.query(
      `UPDATE src_users SET ${fields.join(',')} WHERE id=$${idx} RETURNING id, name, email, role, avatar_url, phone`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both passwords required' });
  try {
    const result = await pool.query('SELECT password FROM src_users WHERE id=$1', [req.user.id]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(currentPassword, user.password || '')))
      return res.status(401).json({ message: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE src_users SET password=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  try {
    const result = await pool.query('SELECT id, name FROM src_users WHERE email=$1', [email]);
    // Always return success to prevent email enumeration
    if (!result.rows.length) return res.json({ message: 'If this email exists, a reset link has been sent.' });
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await pool.query(
      'INSERT INTO src_password_resets (email, token, expires_at) VALUES ($1,$2,$3)',
      [email, token, expires]
    );
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendMail(email, 'Reset Your Password – Shri Ram Clothings',
      `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#f97316">Shri Ram Clothings</h2>
        <p>Hi ${result.rows[0].name},</p>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Reset Password</a>
        <p style="color:#888;font-size:12px">If you didn't request this, ignore this email.</p>
      </div>`
    );
    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token and password required' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  try {
    const result = await pool.query(
      'SELECT * FROM src_password_resets WHERE token=$1 AND used=FALSE AND expires_at > NOW()',
      [token]
    );
    if (!result.rows.length) return res.status(400).json({ message: 'Invalid or expired reset link' });
    const { email } = result.rows[0];
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE src_users SET password=$1 WHERE email=$2', [hash, email]);
    await pool.query('UPDATE src_password_resets SET used=TRUE WHERE token=$1', [token]);
    res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const googleLogin = async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Google credential required' });
  try {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    if (!email) return res.status(400).json({ message: 'Google account has no email' });

    // Check if user exists by email
    let result = await pool.query('SELECT * FROM src_users WHERE email=$1', [email]);
    let user = result.rows[0];

    if (user) {
      // User exists — update google_id if not set
      if (!user.google_id) {
        await pool.query(
          'UPDATE src_users SET google_id=$1, auth_provider=$2, avatar_url=COALESCE(avatar_url,$3) WHERE id=$4',
          [googleId, 'google', picture || null, user.id]
        );
      }
      if (user.is_banned) return res.status(403).json({ message: 'Account has been banned' });
    } else {
      // New user — create account
      const newUser = await pool.query(
        `INSERT INTO src_users (name, email, google_id, auth_provider, avatar_url)
         VALUES ($1,$2,$3,'google',$4)
         RETURNING id, name, email, role, avatar_url, phone, is_banned, created_at`,
        [name, email, googleId, picture || null]
      );
      user = newUser.rows[0];
    }

    // Re-fetch clean user
    const fresh = await pool.query(
      'SELECT id, name, email, role, avatar_url, phone, is_banned, created_at, auth_provider FROM src_users WHERE id=$1',
      [user.id]
    );
    const safeUser = fresh.rows[0];
    res.json({ token: signToken(safeUser), user: safeUser });
  } catch (err) {
    console.error('Google login error:', err.message);
    res.status(401).json({ message: 'Google authentication failed. Please try again.' });
  }
};

const sendOrderEmail = async (userEmail, userName, orderId, total, items) => {
  const itemRows = items.map(i => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.title} (${i.size})</td><td style="padding:8px;border-bottom:1px solid #eee">×${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee">₹${i.price * i.quantity}</td></tr>`).join('');
  await sendMail(userEmail, `Order Confirmed #${orderId} – Shri Ram Clothings`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#f97316">Shri Ram Clothings</h2>
      <p>Hi ${userName}, your order has been confirmed! 🎉</p>
      <p><strong>Order ID:</strong> #${orderId}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead><tr style="background:#f97316;color:#fff"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px">Qty</th><th style="padding:8px">Price</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <p style="font-size:18px"><strong>Total: ₹${total}</strong></p>
      <p style="color:#888;font-size:12px">Thank you for shopping with Shri Ram Clothings!</p>
    </div>`
  );
};

module.exports = { register, login, getMe, updateProfile, changePassword, forgotPassword, resetPassword, sendOrderEmail, googleLogin };
