require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./config/db');

const app = express();

const normalizeOrigin = (o) => (o || '').trim().replace(/\/+$/, '');

// Support single or comma-separated FRONTEND_URL values
const envOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = [
  ...envOrigins,
  'http://localhost:5173',
  'http://localhost:3000',
].map(normalizeOrigin);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow server-to-server / curl
    const o = normalizeOrigin(origin);
    if (allowedOrigins.includes(o)) return cb(null, true);
    if (/\.vercel\.app$/.test(o)) return cb(null, true);
    if (/\.onrender\.com$/.test(o)) return cb(null, true);
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    return cb(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require('./middleware/tenant').tenant);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/erp', require('./routes/erp'));
app.use('/api/erp/pos', require('./routes/pos'));
app.use('/api/erp/inventory', require('./routes/inventory'));
app.use('/api/erp/customers', require('./routes/customers'));
app.use('/api/erp/brands', require('./routes/brands'));
app.use('/api/erp/suppliers', require('./routes/suppliers'));
app.use('/api/erp/purchases', require('./routes/purchases'));
app.use('/api/erp/returns', require('./routes/returns'));
app.use('/api/erp/reports', require('./routes/reports'));
app.use('/api/erp/employees', require('./routes/employees'));
app.use('/api/erp/attendance', require('./routes/attendance'));
app.use('/api/erp/expenses', require('./routes/expenses'));
app.use('/api/erp/roles', require('./routes/roles'));
app.use('/api/erp/sales', require('./routes/salesOrders'));
app.use('/api/homepage', require('./routes/homepage'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/notifications', require('./routes/notifications'));

// ── Public: Dynamic sitemap.xml ──
app.get('/sitemap.xml', async (req, res) => {
  const escapeXml = (s = '') =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const toLastMod = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const SITE_URL = (process.env.SITE_URL || 'https://www.shriramclothings.in').replace(/\/+$/, '');

  const staticRoutes = [
    { path: '/', changefreq: 'daily', priority: 1.0 },
    { path: '/shop', changefreq: 'daily', priority: 0.9 },
    { path: '/contact', changefreq: 'monthly', priority: 0.6 },
    { path: '/privacy', changefreq: 'yearly', priority: 0.3 },
    { path: '/terms', changefreq: 'yearly', priority: 0.3 },
    { path: '/refund', changefreq: 'yearly', priority: 0.3 },
    { path: '/return-policy', changefreq: 'yearly', priority: 0.3 },
    { path: '/shipping', changefreq: 'yearly', priority: 0.3 },
    { path: '/cancellation', changefreq: 'yearly', priority: 0.3 },
    { path: '/cookies', changefreq: 'yearly', priority: 0.3 },
    { path: '/disclaimer', changefreq: 'yearly', priority: 0.3 },
    { path: '/legal', changefreq: 'yearly', priority: 0.3 },
  ];

  const makeUrlEntry = ({ loc, lastmod, changefreq, priority }) => {
    const parts = [
      '  <url>',
      `    <loc>${escapeXml(loc)}</loc>`,
    ];
    if (lastmod) parts.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
    if (changefreq) parts.push(`    <changefreq>${escapeXml(changefreq)}</changefreq>`);
    if (priority !== undefined && priority !== null) parts.push(`    <priority>${priority}</priority>`);
    parts.push('  </url>');
    return parts.join('\n');
  };

  const buildXml = (urls) =>
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(makeUrlEntry).join('\n') +
    `\n</urlset>\n`;

  try {
    const { pool } = require('./config/db');

    const productsRes = await pool.query(
      `SELECT id, created_at
       FROM src_products
       WHERE status = 'approved' AND deleted_at IS NULL
       ORDER BY created_at DESC`
    );

    const urls = [
      ...staticRoutes.map(r => ({
        loc: `${SITE_URL}${r.path}`,
        changefreq: r.changefreq,
        priority: r.priority,
      })),
      ...productsRes.rows.map(p => ({
        loc: `${SITE_URL}/product/${encodeURIComponent(p.id)}`,
        lastmod: toLastMod(p.created_at),
        changefreq: 'weekly',
        priority: 0.7,
      })),
    ];

    res.setHeader('X-SRC-Sitemap', 'v2');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // cache 1 hour
    return res.status(200).send(buildXml(urls));
  } catch (err) {
    console.error('Sitemap error:', err.message);
    // Fallback: still return a valid sitemap with static URLs only
    const fallbackUrls = staticRoutes.map(r => ({
      loc: `${SITE_URL}${r.path}`,
      changefreq: r.changefreq,
      priority: r.priority,
    }));
    res.setHeader('X-SRC-Sitemap', 'v2-fallback');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buildXml(fallbackUrls));
  }
});

app.get('/api/health', (_, res) => res.json({ status: 'ok', brand: 'Shri Ram Clothings', timestamp: new Date() }));
app.get('/', (_, res) => res.json({ name: 'Shri Ram Clothings API', status: 'running', version: '1.0.0' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Shri Ram Clothings API running on port ${PORT}`));

  // ── Cron: Cart reminders every 6 hours ──
  const cron = require('node-cron');
  const { sendCartReminders } = require('./controllers/notificationController');
  cron.schedule('0 */6 * * *', () => {
    console.log('⏰ Running cart reminder cron...');
    sendCartReminders();
  });

  // ── Cron: Delhivery tracking sync every 3 hours ──
  const { syncTracking } = require('./controllers/shipmentController');
  cron.schedule('0 */3 * * *', () => {
    console.log('🚚 Running Delhivery tracking sync...');
    syncTracking();
  });

  // ── Cron: Send scheduled campaigns every minute ──
  const { pool } = require('./config/db');
  const { sendCampaign } = require('./controllers/notificationController');
  cron.schedule('* * * * *', async () => {
    try {
      const due = await pool.query(
        `SELECT id FROM src_notification_campaigns WHERE status='scheduled' AND scheduled_at <= NOW()`
      );
      for (const c of due.rows) {
        await sendCampaign({ params: { id: c.id }, user: { id: 0 } }, { json: () => {} });
      }
    } catch {}
  });

}).catch(err => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
