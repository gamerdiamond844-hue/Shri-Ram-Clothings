const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');

const genTicketId = () => 'SRC-' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).slice(2,5).toUpperCase();

// ── Public: Submit query ──────────────────────────────────────────────────────
const submitQuery = async (req, res) => {
  const { name, email, phone, subject, message, priority } = req.body;
  if (!name || !email || !subject || !message)
    return res.status(400).json({ message: 'Name, email, subject and message are required' });

  const attachment_url = req.file?.path || null;
  const ticket_id = genTicketId();
  const user_id = req.user?.id || null;

  try {
    const result = await pool.query(
      `INSERT INTO src_queries (ticket_id, name, email, phone, subject, message, attachment_url, priority, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [ticket_id, name, email, phone || null, subject, message, attachment_url, priority || 'medium', user_id]
    );
    const query = result.rows[0];

    // Auto-reply to customer
    await sendMail(email, `We received your query — Ticket #${ticket_id}`,
      `<div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#f97316">Shri Ram Clothings — Support</h2>
        <p>Hi ${name},</p>
        <p>Thank you for reaching out! We've received your query and our team will respond within <strong>24–48 hours</strong>.</p>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
          <p><strong>Ticket ID:</strong> ${ticket_id}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong> ${message}</p>
        </div>
        <p style="color:#888;font-size:12px">Please keep your Ticket ID for reference.</p>
      </div>`
    ).catch(() => {});

    // Notify admin
    const adminRes = await pool.query("SELECT email FROM src_users WHERE role='admin' LIMIT 1");
    if (adminRes.rows.length) {
      await sendMail(adminRes.rows[0].email, `New Support Query #${ticket_id} — ${subject}`,
        `<div style="font-family:sans-serif;max-width:560px;margin:auto">
          <h2 style="color:#f97316">New Customer Query</h2>
          <p><strong>Ticket:</strong> ${ticket_id}</p>
          <p><strong>From:</strong> ${name} (${email})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong> ${message}</p>
        </div>`
      ).catch(() => {});
    }

    res.status(201).json({ message: 'Query submitted successfully', ticket_id, query });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Public: Track query by ticket_id + email ─────────────────────────────────
const trackQuery = async (req, res) => {
  const { ticket_id, email } = req.query;
  if (!ticket_id?.trim()) return res.status(400).json({ message: 'Ticket ID is required' });
  try {
    const result = await pool.query(
      `SELECT ticket_id, name, subject, message, status, priority,
              admin_reply, replied_at, created_at, updated_at, attachment_url
       FROM src_queries
       WHERE UPPER(ticket_id) = UPPER($1)`,
      [ticket_id.trim()]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'No query found with this Ticket ID. Please check and try again.' });
    const q = result.rows[0];
    // If email provided, verify it matches (extra security)
    if (email && email.trim()) {
      const full = await pool.query('SELECT email FROM src_queries WHERE UPPER(ticket_id)=UPPER($1)', [ticket_id.trim()]);
      if (full.rows[0]?.email?.toLowerCase() !== email.trim().toLowerCase()) {
        return res.status(403).json({ message: 'Email does not match this ticket. Please check and try again.' });
      }
    }
    res.json(q);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Admin: Get all queries ────────────────────────────────────────────────────
const getQueries = async (req, res) => {
  const { page = 1, limit = 20, status, priority, search } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let idx = 1;

  if (status)   { conditions.push(`status=$${idx++}`);                                    values.push(status); }
  if (priority) { conditions.push(`priority=$${idx++}`);                                  values.push(priority); }
  if (search)   { conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR ticket_id ILIKE $${idx})`); values.push(`%${search}%`); idx++; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  try {
    const count  = await pool.query(`SELECT COUNT(*) FROM src_queries ${where}`, values);
    values.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM src_queries ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
      values
    );
    res.json({ queries: result.rows, total: parseInt(count.rows[0].count) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Admin: Get single query ───────────────────────────────────────────────────
const getQuery = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM src_queries WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Query not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Admin: Update status / priority ──────────────────────────────────────────
const updateQuery = async (req, res) => {
  const { status, priority } = req.body;
  try {
    const fields = [], values = [];
    let idx = 1;
    if (status)   { fields.push(`status=$${idx++}`);   values.push(status); }
    if (priority) { fields.push(`priority=$${idx++}`); values.push(priority); }
    if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });
    fields.push(`updated_at=NOW()`);
    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE src_queries SET ${fields.join(',')} WHERE id=$${idx} RETURNING *`, values
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Admin: Reply to query ─────────────────────────────────────────────────────
const replyQuery = async (req, res) => {
  const { reply } = req.body;
  if (!reply?.trim()) return res.status(400).json({ message: 'Reply message required' });
  try {
    const result = await pool.query(
      `UPDATE src_queries SET admin_reply=$1, replied_at=NOW(), status='resolved', updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [reply, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Query not found' });
    const q = result.rows[0];

    // Email customer
    await sendMail(q.email, `Response to your query #${q.ticket_id} — Shri Ram Clothings`,
      `<div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#f97316">Shri Ram Clothings — Support Reply</h2>
        <p>Hi ${q.name},</p>
        <p>Our team has responded to your query <strong>#${q.ticket_id}</strong>.</p>
        <div style="background:#fff7ed;border-left:4px solid #f97316;padding:16px;margin:16px 0;border-radius:0 8px 8px 0">
          <p style="font-weight:600;margin-bottom:8px">Admin Response:</p>
          <p>${reply}</p>
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:12px;margin-top:16px">
          <p style="font-size:12px;color:#888"><strong>Your original message:</strong> ${q.message}</p>
        </div>
        <p style="color:#888;font-size:12px;margin-top:16px">If you have further questions, please submit a new query.</p>
      </div>`
    ).catch(() => {});

    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Admin: Delete query ───────────────────────────────────────────────────────
const deleteQuery = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_queries WHERE id=$1', [req.params.id]);
    res.json({ message: 'Query deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Admin: Stats ──────────────────────────────────────────────────────────────
const getQueryStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status='pending') as pending,
        COUNT(*) FILTER (WHERE status='in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status='resolved') as resolved,
        COUNT(*) FILTER (WHERE priority='high') as high_priority
      FROM src_queries
    `);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Admin: Export CSV ─────────────────────────────────────────────────────────
const exportQueries = async (req, res) => {
  try {
    const result = await pool.query('SELECT ticket_id,name,email,phone,subject,status,priority,created_at,replied_at FROM src_queries ORDER BY created_at DESC');
    const headers = ['Ticket ID','Name','Email','Phone','Subject','Status','Priority','Created At','Replied At'];
    const rows = result.rows.map(r => [
      r.ticket_id, r.name, r.email, r.phone || '', r.subject,
      r.status, r.priority,
      new Date(r.created_at).toLocaleString('en-IN'),
      r.replied_at ? new Date(r.replied_at).toLocaleString('en-IN') : '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="queries.csv"');
    res.send(csv);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { submitQuery, trackQuery, getQueries, getQuery, updateQuery, replyQuery, deleteQuery, getQueryStats, exportQueries };
