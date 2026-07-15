const { pool } = require('../config/db');

const listChatMessages = async (req, res) => {
  try {
    const businessId = req.user.business_id;
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const result = await pool.query(
      `SELECT m.id, m.message, m.created_at, m.sender_user_id, u.name AS sender_name, u.avatar_url, m.store_id
       FROM src_internal_chat_messages m
       LEFT JOIN src_users u ON u.id = m.sender_user_id
       WHERE m.business_id = $1
       ORDER BY m.created_at ASC
       LIMIT 500`,
      [businessId]
    );

    res.json({ messages: result.rows });
  } catch (err) {
    console.error('listChatMessages error:', err.message);
    res.status(500).json({ message: 'Failed to list chat messages' });
  }
};

const createChatMessage = async (req, res) => {
  try {
    const businessId = req.user.business_id;
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const { message, store_id } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ message: 'Message text is required' });

    const result = await pool.query(
      `INSERT INTO src_internal_chat_messages (business_id, sender_user_id, store_id, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [businessId, req.user.id, store_id || null, message.trim()]
    );

    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error('createChatMessage error:', err.message);
    res.status(500).json({ message: 'Failed to create chat message' });
  }
};

const listMeetings = async (req, res) => {
  try {
    const businessId = req.user.business_id;
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const result = await pool.query(
      `SELECT m.id, m.title, m.room_name, m.mode, m.is_audio_only, m.created_at, u.name AS created_by_name
       FROM src_internal_meetings m
       LEFT JOIN src_users u ON u.id = m.created_by
       WHERE m.business_id = $1
       ORDER BY m.created_at DESC
       LIMIT 200`,
      [businessId]
    );

    res.json({ meetings: result.rows });
  } catch (err) {
    console.error('listMeetings error:', err.message);
    res.status(500).json({ message: 'Failed to list meetings' });
  }
};

const createMeeting = async (req, res) => {
  try {
    const businessId = req.user.business_id;
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const { title, mode, is_audio_only } = req.body;
    if (!title || !mode || !['video', 'voice'].includes(mode)) return res.status(400).json({ message: 'Valid title and mode are required' });

    const roomName = `${businessId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const result = await pool.query(
      `INSERT INTO src_internal_meetings (business_id, created_by, title, room_name, mode, is_audio_only)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [businessId, req.user.id, title.trim(), roomName, mode, !!is_audio_only]
    );

    res.status(201).json({ meeting: result.rows[0] });
  } catch (err) {
    console.error('createMeeting error:', err.message);
    res.status(500).json({ message: 'Failed to create meeting' });
  }
};

module.exports = {
  listChatMessages,
  createChatMessage,
  listMeetings,
  createMeeting,
};
