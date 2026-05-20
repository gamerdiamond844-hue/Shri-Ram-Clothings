const { pool } = require('../config/db');
const { cloudinary } = require('../config/cloudinary');

const slugify = (value) => value
  .toString()
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-_]+/g, '-')
  .replace(/--+/g, '-')
  .replace(/^-+|-+$/g, '') || `folder-${Date.now()}`;

const ensureRootFolder = async (client) => {
  const root = await client.query(`SELECT id FROM src_admin_cloud_folders WHERE path = '/' LIMIT 1`);
  if (root.rows.length) return root.rows[0].id;
  const result = await client.query(
    `INSERT INTO src_admin_cloud_folders (name, slug, parent_id, path, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    ['Root', 'root', null, '/', null]
  );
  return result.rows[0].id;
};

const buildResourceFolder = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'admin-cloud/images';
  if (mimetype.startsWith('video/')) return 'admin-cloud/videos';
  if (mimetype.startsWith('audio/')) return 'admin-cloud/audio';
  if (mimetype === 'application/pdf') return 'admin-cloud/documents';
  if (mimetype.includes('word') || mimetype.includes('excel') || mimetype.includes('spreadsheet') || mimetype.includes('text') || mimetype.includes('json')) return 'admin-cloud/documents';
  if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('compressed')) return 'admin-cloud/backups';
  return 'admin-cloud/private';
};

const getThumbnailUrl = (public_id, resource_type, format) => {
  if (!public_id) return null;
  if (resource_type === 'image') {
    return cloudinary.url(public_id, {
      type: 'authenticated',
      resource_type: 'image',
      secure: true,
      sign_url: true,
      transformation: [{ width: 480, height: 320, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
    });
  }
  if (resource_type === 'video') {
    return cloudinary.url(public_id, {
      type: 'authenticated',
      resource_type: 'video',
      secure: true,
      sign_url: true,
      transformation: [{ width: 480, height: 320, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
    });
  }
  return null;
};

const mapFile = (row) => ({
  ...row,
  human_size: row.size_bytes ? `${(row.size_bytes / 1024 / 1024).toFixed(2)} MB` : '0 MB',
  preview_url: row.thumbnail_url || row.secure_url,
});

const uploadFiles = async (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ message: 'No files uploaded' });
  const { folder_id } = req.body;
  const client = await pool.connect();
  try {
    const rootId = await ensureRootFolder(client);
    const folderId = folder_id ? parseInt(folder_id, 10) : rootId;
    const folderRow = await client.query('SELECT id FROM src_admin_cloud_folders WHERE id=$1 LIMIT 1', [folderId]);
    if (!folderRow.rows.length) return res.status(400).json({ message: 'Invalid folder selected' });

    const inserted = [];
    for (const file of req.files) {
      const publicId = file.filename || file.public_id || null;
      const secureUrl = file.path || file.secure_url || null;
      const resourceType = file.mimetype.startsWith('image/') ? 'image'
        : file.mimetype.startsWith('video/') ? 'video'
          : file.mimetype.startsWith('audio/') ? 'audio'
            : 'raw';
      const format = file.format || file.mimetype.split('/')[1] || null;

      if (!publicId || !secureUrl) {
        throw new Error('Cloudinary upload response missing public_id or secure_url');
      }

      const result = await client.query(
        `INSERT INTO src_admin_cloud_files (
          public_id, original_filename, display_name, description, folder_id,
          resource_type, format, mime_type, size_bytes, width, height,
          secure_url, thumbnail_url, cdn_url, metadata, tags, status,
          is_favorite, is_trashed, uploaded_by, uploaded_at, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
        RETURNING *`,
        [
          publicId,
          file.originalname,
          file.originalname,
          null,
          folderId,
          resourceType,
          format,
          file.mimetype,
          file.size,
          file.width || null,
          file.height || null,
          secureUrl,
          getThumbnailUrl(publicId, resourceType, format) || secureUrl,
          secureUrl,
          JSON.stringify({ bytes: file.size, original_name: file.originalname }),
          [],
          'active',
          false,
          false,
          req.user.id,
          new Date(),
          new Date(),
          new Date(),
        ]
      );
      inserted.push(mapFile(result.rows[0]));
    }

    res.json({ files: inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Upload failed' });
  } finally {
    client.release();
  }
};

const listFiles = async (req, res) => {
  const {
    folder_id, search, type, trashed, favorite, tags, sort = 'uploaded_at', order = 'desc', page = 1, limit = 24,
  } = req.query;
  const values = [];
  const where = ['deleted_at IS NULL'];
  if (trashed === 'true') where.push('is_trashed = TRUE');
  else where.push('is_trashed = FALSE');
  if (folder_id) { values.push(folder_id); where.push(`folder_id = $${values.length}`); }
  if (type) { values.push(type); where.push(`resource_type = $${values.length}`); }
  if (favorite === 'true') where.push('is_favorite = TRUE');
  if (search) { values.push(`%${search}%`); where.push(`(display_name ILIKE $${values.length} OR original_filename ILIKE $${values.length} OR tags::text ILIKE $${values.length})`); }
  if (tags) { values.push(tags); where.push(`tags && $${values.length}`); }

  const allowedSort = ['display_name', 'uploaded_at', 'size_bytes', 'resource_type', 'created_at'];
  const orderBy = allowedSort.includes(sort) ? sort : 'uploaded_at';
  const direction = order === 'asc' ? 'ASC' : 'DESC';
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, parseInt(limit, 10) || 24);
  const offset = (pageNum - 1) * pageSize;

  try {
    const total = await pool.query(`SELECT COUNT(*) AS count FROM src_admin_cloud_files WHERE ${where.join(' AND ')}`, values);
    const files = await pool.query(
      `SELECT * FROM src_admin_cloud_files WHERE ${where.join(' AND ')} ORDER BY ${orderBy} ${direction} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, offset]
    );

    res.json({
      page: pageNum,
      limit: pageSize,
      total: parseInt(total.rows[0].count, 10),
      pages: Math.ceil(parseInt(total.rows[0].count, 10) / pageSize),
      files: files.rows.map(mapFile),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Failed to list files' });
  }
};

const getFile = async (req, res) => {
  const { id } = req.params;
  try {
    const file = await pool.query('SELECT * FROM src_admin_cloud_files WHERE id=$1 AND deleted_at IS NULL LIMIT 1', [id]);
    if (!file.rows.length) return res.status(404).json({ message: 'File not found' });
    res.json(mapFile(file.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Failed to fetch file' });
  }
};

const getSecureUrl = async (req, res) => {
  const { id } = req.params;
  try {
    const fileRes = await pool.query('SELECT public_id, resource_type, format FROM src_admin_cloud_files WHERE id=$1 AND deleted_at IS NULL LIMIT 1', [id]);
    if (!fileRes.rows.length) return res.status(404).json({ message: 'File not found' });
    const file = fileRes.rows[0];
    const url = cloudinary.url(file.public_id, {
      type: 'authenticated',
      resource_type: file.resource_type || 'auto',
      secure: true,
      sign_url: true,
      format: file.format,
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Failed to generate secure url' });
  }
};

const updateFile = async (req, res) => {
  const { id } = req.params;
  const { display_name, description, folder_id, tags, is_favorite } = req.body;
  const updates = [];
  const values = [];
  if (display_name) { values.push(display_name); updates.push(`display_name = $${values.length}`); }
  if (description !== undefined) { values.push(description); updates.push(`description = $${values.length}`); }
  if (folder_id) { values.push(folder_id); updates.push(`folder_id = $${values.length}`); }
  if (tags !== undefined) { values.push(Array.isArray(tags) ? tags : [tags]); updates.push(`tags = $${values.length}`); }
  if (is_favorite !== undefined) { values.push(is_favorite === true || is_favorite === 'true'); updates.push(`is_favorite = $${values.length}`); }
  if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });
  values.push(id);
  try {
    const updated = await pool.query(
      `UPDATE src_admin_cloud_files SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length} AND deleted_at IS NULL RETURNING *`,
      values
    );
    if (!updated.rows.length) return res.status(404).json({ message: 'File not found' });
    res.json(mapFile(updated.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Update failed' });
  }
};

const trashFile = async (req, res) => {
  const { id } = req.params;
  const { hard } = req.query;
  const client = await pool.connect();
  try {
    const file = await client.query('SELECT * FROM src_admin_cloud_files WHERE id=$1 LIMIT 1', [id]);
    if (!file.rows.length) return res.status(404).json({ message: 'File not found' });
    const current = file.rows[0];
    if (hard === 'true') {
      await cloudinary.uploader.destroy(current.public_id, { resource_type: current.resource_type || 'auto', type: 'authenticated' });
      await client.query('DELETE FROM src_admin_cloud_files WHERE id=$1', [id]);
      return res.json({ message: 'File permanently deleted' });
    }
    await client.query('UPDATE src_admin_cloud_files SET is_trashed = TRUE, trashed_at = NOW(), updated_at = NOW() WHERE id=$1', [id]);
    res.json({ message: 'File moved to trash' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Delete failed' });
  } finally {
    client.release();
  }
};

const restoreFile = async (req, res) => {
  const { id } = req.params;
  try {
    const restored = await pool.query(
      'UPDATE src_admin_cloud_files SET is_trashed = FALSE, trashed_at = NULL, updated_at = NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING *',
      [id]
    );
    if (!restored.rows.length) return res.status(404).json({ message: 'File not found or already deleted' });
    res.json(mapFile(restored.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Restore failed' });
  }
};

const getFolders = async (req, res) => {
  try {
    const folders = await pool.query('SELECT id, name, slug, parent_id, path, created_by, created_at FROM src_admin_cloud_folders ORDER BY path, name');
    res.json({ folders: folders.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Failed to load folders' });
  }
};

const createFolder = async (req, res) => {
  const { name, parent_id } = req.body;
  if (!name) return res.status(400).json({ message: 'Folder name is required' });
  const client = await pool.connect();
  try {
    const rootId = await ensureRootFolder(client);
    const parentId = parent_id ? parseInt(parent_id, 10) : rootId;
    const parent = await client.query('SELECT id, path FROM src_admin_cloud_folders WHERE id=$1 LIMIT 1', [parentId]);
    if (!parent.rows.length) return res.status(400).json({ message: 'Parent folder not found' });
    const slug = slugify(name);
    const path = `${parent.rows[0].path}${slug}/`;
    const existing = await client.query('SELECT id FROM src_admin_cloud_folders WHERE path=$1 LIMIT 1', [path]);
    if (existing.rows.length) return res.status(409).json({ message: 'Folder already exists' });

    const created = await client.query(
      'INSERT INTO src_admin_cloud_folders (name, slug, parent_id, path, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, slug, parentId, path, req.user.id]
    );
    res.json(created.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Failed to create folder' });
  } finally {
    client.release();
  }
};

const updateFolder = async (req, res) => {
  const { id } = req.params;
  const { name, parent_id } = req.body;
  const updates = [];
  const values = [];
  if (name) { values.push(name); updates.push(`name = $${values.length}`); }
  if (parent_id !== undefined) { values.push(parent_id); updates.push(`parent_id = $${values.length}`); }
  if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });
  values.push(id);
  try {
    const result = await pool.query(`UPDATE src_admin_cloud_folders SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`, values);
    if (!result.rows.length) return res.status(404).json({ message: 'Folder not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Failed to update folder' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const totals = await pool.query(`
      SELECT
        COUNT(*)::int AS total_files,
        COALESCE(SUM(size_bytes), 0)::bigint AS total_bytes,
        COUNT(*) FILTER (WHERE resource_type='image')::int AS image_files,
        COUNT(*) FILTER (WHERE resource_type='video')::int AS video_files,
        COUNT(*) FILTER (WHERE resource_type='audio')::int AS audio_files,
        COUNT(*) FILTER (WHERE is_trashed)::int AS trashed_files,
        COUNT(*) FILTER (WHERE is_favorite)::int AS favorites
      FROM src_admin_cloud_files
      WHERE deleted_at IS NULL
    `);
    const recent = await pool.query(`
      SELECT id, display_name, resource_type, size_bytes, secure_url, uploaded_at
      FROM src_admin_cloud_files
      WHERE deleted_at IS NULL
      ORDER BY uploaded_at DESC
      LIMIT 6
    `);
    const largest = await pool.query(`
      SELECT id, display_name, resource_type, size_bytes, secure_url
      FROM src_admin_cloud_files
      WHERE deleted_at IS NULL
      ORDER BY size_bytes DESC
      LIMIT 4
    `);
    const result = totals.rows[0];
    res.json({
      total_files: result.total_files,
      total_bytes: parseInt(result.total_bytes, 10),
      image_files: result.image_files,
      video_files: result.video_files,
      audio_files: result.audio_files,
      trashed_files: result.trashed_files,
      favorites: result.favorites,
      largest_files: largest.rows.map(mapFile),
      recent_files: recent.rows.map(mapFile),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Failed to fetch analytics' });
  }
};

const getUploadSignature = async (req, res) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request({ timestamp }, process.env.CLOUDINARY_API_SECRET);
    res.json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      signature,
      timestamp,
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/upload`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create upload signature' });
  }
};

module.exports = {
  uploadFiles,
  listFiles,
  getFile,
  updateFile,
  trashFile,
  restoreFile,
  getFolders,
  createFolder,
  updateFolder,
  getAnalytics,
  getSecureUrl,
  getUploadSignature,
};
