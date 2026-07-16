const { pool } = require('../config/db');
const { sendPushToUser } = require('./notificationController');

const getScopedBusinessId = (req) => req.tenant?.business_id || req.user?.business_id || null;
const getScopedStoreId = (req) => {
  if (req.tenant?.store_id) return req.tenant.store_id;
  if (['cashier', 'store_manager', 'store_admin', 'employee'].includes(req.user?.role)) {
    return req.user?.store_id || null;
  }
  return null;
};

const isAdminOversightRole = (role) => ['admin', 'super_admin', 'business_owner', 'store_admin'].includes(role);

const validateLocationForBusiness = async (businessId, store_id) => {
  if (store_id !== undefined && store_id !== null) {
    const storeRes = await pool.query(
      'SELECT id FROM src_stores WHERE id = $1 AND business_id = $2',
      [store_id, businessId]
    );
    if (!storeRes.rows.length) {
      return { valid: false, message: 'Invalid store selected for this business' };
    }
  }
  return { valid: true };
};

const resolveParticipant = async (businessId, participantId, email, phone) => {
  if (participantId) {
    const userRes = await pool.query(
      'SELECT id, name, email, phone, avatar_url, role FROM src_users WHERE id = $1 AND business_id = $2 AND is_banned = FALSE',
      [participantId, businessId]
    );
    return userRes.rows[0] || null;
  }

  if (email) {
    const userRes = await pool.query(
      'SELECT id, name, email, phone, avatar_url, role FROM src_users WHERE LOWER(email) = LOWER($1) AND business_id = $2 AND is_banned = FALSE',
      [email.trim(), businessId]
    );
    return userRes.rows[0] || null;
  }

  if (phone) {
    const userRes = await pool.query(
      'SELECT id, name, email, phone, avatar_url, role FROM src_users WHERE phone = $1 AND business_id = $2 AND is_banned = FALSE',
      [phone.trim(), businessId]
    );
    return userRes.rows[0] || null;
  }

  return null;
};

const searchUsers = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.json([]);

    const result = await pool.query(
      `SELECT id, name, email, phone, avatar_url, role
       FROM src_users
       WHERE business_id = $1
         AND is_banned = FALSE
         AND id != $2
         AND (name ILIKE $3 OR email ILIKE $3 OR phone ILIKE $3)
       ORDER BY CASE WHEN email ILIKE $3 THEN 0 ELSE 1 END, name ASC
       LIMIT 20`,
      [businessId, req.user.id, `%${q}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('searchUsers error:', err.message);
    res.status(500).json({ message: 'Failed to search users' });
  }
};

const normalizeThreadParticipantIds = (userA, userB) => {
  const one = Number(userA);
  const two = Number(userB);
  return one < two ? [one, two] : [two, one];
};

const createPrivateThread = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const storeId = getScopedStoreId(req);
    const { participant_id, email, phone } = req.body;

    const participant = await resolveParticipant(businessId, participant_id, email, phone);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });
    if (participant.id === req.user.id) return res.status(400).json({ message: 'Cannot create thread with yourself' });

    const [userOneId, userTwoId] = normalizeThreadParticipantIds(req.user.id, participant.id);
    const threadRes = await pool.query(
      `INSERT INTO src_private_chat_threads (business_id, store_id, user_one_id, user_two_id, created_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_one_id, user_two_id)
       DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [businessId, storeId, userOneId, userTwoId, req.user.id]
    );

    const thread = threadRes.rows[0];
    res.status(201).json({ thread, participant });
  } catch (err) {
    console.error('createPrivateThread error:', err.message);
    res.status(500).json({ message: 'Failed to create private thread' });
  }
};

const listPrivateThreads = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const result = await pool.query(
      `SELECT t.id,
          t.user_one_id,
          t.user_two_id,
          t.store_id,
          t.updated_at,
          COALESCE((SELECT m.message FROM src_private_chat_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1), '') AS last_message,
          COALESCE((SELECT m.created_at FROM src_private_chat_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1), t.created_at) AS last_message_at,
          CASE WHEN t.user_one_id = $1 THEN u2.id ELSE u1.id END AS participant_id,
          CASE WHEN t.user_one_id = $1 THEN u2.name ELSE u1.name END AS participant_name,
          CASE WHEN t.user_one_id = $1 THEN u2.email ELSE u1.email END AS participant_email,
          CASE WHEN t.user_one_id = $1 THEN u2.phone ELSE u1.phone END AS participant_phone,
          CASE WHEN t.user_one_id = $1 THEN u2.avatar_url ELSE u1.avatar_url END AS participant_avatar_url
       FROM src_private_chat_threads t
       LEFT JOIN src_users u1 ON u1.id = t.user_one_id
       LEFT JOIN src_users u2 ON u2.id = t.user_two_id
       WHERE t.business_id = $2
         AND ($1 = t.user_one_id OR $1 = t.user_two_id)
       ORDER BY last_message_at DESC
       LIMIT 50`,
      [req.user.id, businessId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('listPrivateThreads error:', err.message);
    res.status(500).json({ message: 'Failed to list private threads' });
  }
};

const getThreadById = async (threadId, businessId = null) => {
  const query = businessId
    ? 'SELECT * FROM src_private_chat_threads WHERE id = $1 AND business_id = $2'
    : 'SELECT * FROM src_private_chat_threads WHERE id = $1';
  const params = businessId ? [threadId, businessId] : [threadId];
  const threadRes = await pool.query(query, params);
  return threadRes.rows[0] || null;
};

const listPrivateMessages = async (req, res) => {
  try {
    const { threadId } = req.params;
    const businessId = getScopedBusinessId(req);
    const thread = await getThreadById(threadId, businessId);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const isParticipant = [thread.user_one_id, thread.user_two_id].includes(req.user.id);
    if (!isParticipant && !isAdminOversightRole(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messagesRes = await pool.query(
      `SELECT m.id, m.sender_user_id, m.message, m.attachment_url, m.message_type, m.created_at,
              u.name AS sender_name, u.avatar_url
       FROM src_private_chat_messages m
       LEFT JOIN src_users u ON u.id = m.sender_user_id
       WHERE m.thread_id = $1
       ORDER BY m.created_at ASC`,
      [thread.id]
    );

    res.json({ thread, messages: messagesRes.rows });
  } catch (err) {
    console.error('listPrivateMessages error:', err.message);
    res.status(500).json({ message: 'Failed to load private messages' });
  }
};

const sendPrivateMessage = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { message, attachment_url, message_type = 'text' } = req.body;
    if (!message?.trim() && !attachment_url) return res.status(400).json({ message: 'Message text or attachment required' });

    const businessId = getScopedBusinessId(req);
    const thread = await getThreadById(threadId, businessId);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const isParticipant = [thread.user_one_id, thread.user_two_id].includes(req.user.id);
    if (!isParticipant && !isAdminOversightRole(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const recipientId = thread.user_one_id === req.user.id ? thread.user_two_id : thread.user_one_id;
    const insertRes = await pool.query(
      `INSERT INTO src_private_chat_messages (thread_id, sender_user_id, message, attachment_url, message_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [thread.id, req.user.id, message?.trim() || null, attachment_url || null, message_type || 'text']
    );

    await pool.query('UPDATE src_private_chat_threads SET updated_at = NOW() WHERE id = $1', [thread.id]);
    await pool.query('INSERT INTO src_notifications (user_id, message, type) VALUES ($1, $2, $3)', [recipientId, `New private message from ${req.user.name}`, 'chat']);
    sendPushToUser(recipientId, {
      title: 'New private message',
      body: `${req.user.name} sent you a private message.`,
      icon: '/logo.jpg',
      badge: '/logo.jpg',
      data: { url: '/admin/private-chat' },
      tag: `pm-${thread.id}`,
    }).catch(() => {});

    const messageRecord = insertRes.rows[0];
    const senderRes = await pool.query('SELECT name, avatar_url FROM src_users WHERE id = $1', [req.user.id]);
    res.status(201).json({
      message: {
        ...messageRecord,
        sender_name: senderRes.rows[0]?.name,
        avatar_url: senderRes.rows[0]?.avatar_url,
      },
    });
  } catch (err) {
    console.error('sendPrivateMessage error:', err.message);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

const adminListAllThreads = async (req, res) => {
  try {
    if (!isAdminOversightRole(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const search = (req.query.search || '').trim();
    const values = [];
    let whereClause = 'WHERE t.business_id = $1';
    values.push(getScopedBusinessId(req));

    if (search) {
      values.push(`%${search}%`);
      whereClause += ` AND (
        u1.name ILIKE $${values.length} OR u1.email ILIKE $${values.length} OR u1.phone ILIKE $${values.length}
        OR u2.name ILIKE $${values.length} OR u2.email ILIKE $${values.length} OR u2.phone ILIKE $${values.length}
      )`;
    }

    const result = await pool.query(
      `SELECT t.id,
          t.user_one_id,
          t.user_two_id,
          t.store_id,
          t.updated_at,
          COALESCE((SELECT m.message FROM src_private_chat_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1), '') AS last_message,
          COALESCE((SELECT m.created_at FROM src_private_chat_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1), t.created_at) AS last_message_at,
          u1.id AS user_one_id,
          u1.name AS user_one_name,
          u1.email AS user_one_email,
          u1.phone AS user_one_phone,
          u1.avatar_url AS user_one_avatar_url,
          u2.id AS user_two_id,
          u2.name AS user_two_name,
          u2.email AS user_two_email,
          u2.phone AS user_two_phone,
          u2.avatar_url AS user_two_avatar_url
       FROM src_private_chat_threads t
       LEFT JOIN src_users u1 ON u1.id = t.user_one_id
       LEFT JOIN src_users u2 ON u2.id = t.user_two_id
       ${whereClause}
       ORDER BY last_message_at DESC
       LIMIT 100`,
      values
    );

    res.json(result.rows);
  } catch (err) {
    console.error('adminListAllThreads error:', err.message);
    res.status(500).json({ message: 'Failed to list conversations' });
  }
};

const listChatMessages = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const storeId = getScopedStoreId(req);

    const result = await pool.query(
      `SELECT m.id, m.message, m.created_at, m.sender_user_id, u.name AS sender_name, u.avatar_url, m.store_id
       FROM src_internal_chat_messages m
       LEFT JOIN src_users u ON u.id = m.sender_user_id
       WHERE m.business_id = $1
         ${storeId ? 'AND (m.store_id IS NULL OR m.store_id = $2)' : ''}
       ORDER BY m.created_at ASC
       LIMIT 500`,
      storeId ? [businessId, storeId] : [businessId]
    );

    res.json({ messages: result.rows });
  } catch (err) {
    console.error('listChatMessages error:', err.message);
    res.status(500).json({ message: 'Failed to list chat messages' });
  }
};

const createChatMessage = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const storeContextId = getScopedStoreId(req);
    const { message, store_id } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ message: 'Message text is required' });

    const resolvedStoreId = storeContextId || store_id || null;
    if (store_id && storeContextId && Number(store_id) !== Number(storeContextId)) {
      return res.status(403).json({ message: 'Cannot post messages to another store' });
    }

    const validation = await validateLocationForBusiness(businessId, resolvedStoreId);
    if (!validation.valid) return res.status(400).json({ message: validation.message });

    const result = await pool.query(
      `INSERT INTO src_internal_chat_messages (business_id, sender_user_id, store_id, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [businessId, req.user.id, resolvedStoreId, message.trim()]
    );

    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error('createChatMessage error:', err.message);
    res.status(500).json({ message: 'Failed to create chat message' });
  }
};

const listMeetings = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
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
    const businessId = getScopedBusinessId(req);
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
  searchUsers,
  createPrivateThread,
  listPrivateThreads,
  listPrivateMessages,
  sendPrivateMessage,
  adminListAllThreads,
};
