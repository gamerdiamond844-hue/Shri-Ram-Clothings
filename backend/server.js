require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./config/db');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || /\.(vercel|onrender|ngrok)\.app$/.test(origin))
      return cb(null, true);
    process.env.NODE_ENV !== 'production' ? cb(null, true) : cb(new Error('CORS blocked'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/homepage', require('./routes/homepage'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/notifications', require('./routes/notifications'));

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
