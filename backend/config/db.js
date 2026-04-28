const { Pool } = require('pg');

const rawConnection = process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'password'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'shriram_clothings'}`;

const connectionString = rawConnection.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
const isNeon = connectionString.includes('neon.tech');
const useSSL = isNeon || process.env.DATABASE_SSL === 'true';

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    // Core tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255),
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'seller', 'admin')),
        avatar_url TEXT,
        phone VARCHAR(20),
        is_banned BOOLEAN DEFAULT FALSE,
        google_id VARCHAR(200),
        auth_provider VARCHAR(20) DEFAULT 'local' CHECK (auth_provider IN ('local','google')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        image_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS src_products (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        category_id INTEGER REFERENCES src_categories(id) ON DELETE SET NULL,
        seller_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        is_featured BOOLEAN DEFAULT FALSE,
        is_trending BOOLEAN DEFAULT FALSE,
        views INTEGER DEFAULT 0,
        admin_message TEXT,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_product_images (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES src_products(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS src_product_variants (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES src_products(id) ON DELETE CASCADE,
        size VARCHAR(10) NOT NULL CHECK (size IN ('XS','S','M','L','XL','XXL','Free')),
        stock INTEGER DEFAULT 0,
        extra_price DECIMAL(10,2) DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS src_cart (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES src_products(id) ON DELETE CASCADE,
        variant_id INTEGER REFERENCES src_product_variants(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, product_id, variant_id)
      );

      CREATE TABLE IF NOT EXISTS src_wishlist (
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES src_products(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS src_addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        full_name VARCHAR(200) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        landmark VARCHAR(200),
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_percent DECIMAL(5,2),
        discount_flat DECIMAL(10,2),
        min_order_amount DECIMAL(10,2) DEFAULT 0,
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(30) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        coupon_code VARCHAR(50),
        status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
        payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
        payment_method VARCHAR(50),
        razorpay_order_id VARCHAR(200),
        razorpay_payment_id VARCHAR(200),
        razorpay_signature VARCHAR(500),
        full_name VARCHAR(200) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        email VARCHAR(150) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        landmark VARCHAR(200),
        notes TEXT,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES src_orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES src_products(id) ON DELETE SET NULL,
        variant_id INTEGER REFERENCES src_product_variants(id) ON DELETE SET NULL,
        title VARCHAR(200),
        size VARCHAR(10),
        price DECIMAL(10,2) NOT NULL,
        quantity INTEGER NOT NULL,
        image_url TEXT
      );

      CREATE TABLE IF NOT EXISTS src_reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES src_products(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES src_orders(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS src_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_activity_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        action VARCHAR(200) NOT NULL,
        target_type VARCHAR(50),
        target_id INTEGER,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_password_resets (
        id SERIAL PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_banners (
        id SERIAL PRIMARY KEY,
        heading VARCHAR(200),
        subheading VARCHAR(300),
        cta_text VARCHAR(100),
        cta_link VARCHAR(300),
        desktop_image TEXT,
        mobile_image TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        starts_at TIMESTAMP,
        ends_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_homepage_sections (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200),
        subtitle VARCHAR(300),
        config JSONB DEFAULT '{}',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_reels (
        id SERIAL PRIMARY KEY,
        video_url TEXT NOT NULL,
        thumbnail_url TEXT,
        title VARCHAR(200),
        product_id INTEGER REFERENCES src_products(id) ON DELETE SET NULL,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_homepage_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_queries (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL,
        phone VARCHAR(20),
        subject VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        attachment_url TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','resolved')),
        priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
        admin_reply TEXT,
        replied_at TIMESTAMP,
        user_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        endpoint TEXT UNIQUE NOT NULL,
        keys JSONB NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_notification_campaigns (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        image_url TEXT,
        redirect_url TEXT,
        target VARCHAR(20) DEFAULT 'all' CHECK (target IN ('all','specific')),
        scheduled_at TIMESTAMP,
        sent_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sent')),
        sent_count INTEGER DEFAULT 0,
        click_count INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_cart_reminders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        type VARCHAR(20) CHECK (type IN ('cart','wishlist')),
        reminder_count INTEGER DEFAULT 0,
        last_reminded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Migrations: add columns if they don't exist ──
    await client.query(`
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS google_id VARCHAR(200);
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local';
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `).catch(() => {});

    // Seed default categories
    await client.query(`
      INSERT INTO src_categories (name, slug, sort_order) VALUES
        ('T-Shirts', 't-shirts', 1),
        ('Shirts', 'shirts', 2),
        ('Jeans', 'jeans', 3),
        ('Jackets', 'jackets', 4),
        ('Ethnic Wear', 'ethnic-wear', 5)
      ON CONFLICT (slug) DO NOTHING;
    `);

    console.log('✅ Shri Ram Clothings DB initialized');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
