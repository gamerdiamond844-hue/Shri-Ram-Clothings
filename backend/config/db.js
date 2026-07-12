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
      CREATE TABLE IF NOT EXISTS src_businesses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        owner_id INTEGER,
        gst_number VARCHAR(50),
        phone VARCHAR(30),
        email VARCHAR(150),
        address TEXT,
        currency VARCHAR(10) DEFAULT 'INR',
        timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
        settings JSONB DEFAULT '{}'::jsonb,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_stores (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        store_code VARCHAR(30) UNIQUE,
        address TEXT,
        phone VARCHAR(30),
        email VARCHAR(150),
        manager_id INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_warehouses (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        address TEXT,
        phone VARCHAR(30),
        manager_id INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255),
        role VARCHAR(30) DEFAULT 'user' CHECK (role IN ('user', 'seller', 'admin', 'super_admin', 'business_owner', 'store_admin', 'store_manager', 'cashier', 'warehouse_manager', 'accountant', 'employee')),
        avatar_url TEXT,
        phone VARCHAR(20),
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE SET NULL,
        store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        warehouse_id INTEGER REFERENCES src_warehouses(id) ON DELETE SET NULL,
        employee_code VARCHAR(30) UNIQUE,
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
        paytm_txn_id VARCHAR(200),
        paytm_order_id VARCHAR(200),
        paytm_signature VARCHAR(500),
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
        rating_label VARCHAR(50) NOT NULL DEFAULT 'Excellent',
        suggestion VARCHAR(150),
        comment TEXT,
        image_url TEXT,
        is_hidden BOOLEAN DEFAULT FALSE,
        is_pinned BOOLEAN DEFAULT FALSE,
        admin_note TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
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

      CREATE TABLE IF NOT EXISTS src_permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) UNIQUE NOT NULL,
        description TEXT,
        group_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_role_permissions (
        role VARCHAR(50) NOT NULL,
        permission_id INTEGER REFERENCES src_permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role, permission_id)
      );

      CREATE TABLE IF NOT EXISTS src_domains (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        warehouse_id INTEGER REFERENCES src_warehouses(id) ON DELETE SET NULL,
        host VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) DEFAULT 'business',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
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

      CREATE TABLE IF NOT EXISTS src_admin_cloud_folders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(250) UNIQUE NOT NULL,
        parent_id INTEGER REFERENCES src_admin_cloud_folders(id) ON DELETE CASCADE,
        path TEXT NOT NULL,
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_admin_cloud_files (
        id SERIAL PRIMARY KEY,
        public_id TEXT NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        folder_id INTEGER REFERENCES src_admin_cloud_folders(id) ON DELETE SET NULL,
        resource_type VARCHAR(50) NOT NULL,
        format VARCHAR(50),
        mime_type VARCHAR(100),
        size_bytes BIGINT DEFAULT 0,
        width INTEGER,
        height INTEGER,
        secure_url TEXT NOT NULL,
        thumbnail_url TEXT,
        cdn_url TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
        is_favorite BOOLEAN DEFAULT FALSE,
        is_trashed BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP,
        uploaded_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_admin_cloud_files_folder_id ON src_admin_cloud_files(folder_id);
      CREATE INDEX IF NOT EXISTS idx_admin_cloud_files_is_trashed ON src_admin_cloud_files(is_trashed);
      CREATE INDEX IF NOT EXISTS idx_admin_cloud_files_display_name ON src_admin_cloud_files USING gin (to_tsvector('english', display_name));
      CREATE INDEX IF NOT EXISTS idx_admin_cloud_files_tags ON src_admin_cloud_files USING gin (tags);

      CREATE TABLE IF NOT EXISTS src_admin_cloud_history (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        file_id INTEGER REFERENCES src_admin_cloud_files(id) ON DELETE CASCADE,
        folder_id INTEGER REFERENCES src_admin_cloud_folders(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Migrations: add columns if they don't exist ──
    await client.query(`
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS google_id VARCHAR(200);
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local';
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(100);
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS shipment_status VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS estimated_delivery DATE;
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP;
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS tracking_synced_at TIMESTAMP;

      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS is_free_delivery BOOLEAN DEFAULT FALSE;
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS free_delivery_expiry TIMESTAMP;
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS free_delivery_note VARCHAR(300);

      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS free_delivery_applied BOOLEAN DEFAULT FALSE;
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10,2) DEFAULT 0;

      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS rating_label VARCHAR(50) NOT NULL DEFAULT 'Excellent';
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS suggestion VARCHAR(150);
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS comment TEXT;
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS admin_note TEXT;
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `).catch(() => {});

    // Tracking logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_tracking_logs (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES src_orders(id) ON DELETE CASCADE,
        awb VARCHAR(100),
        status VARCHAR(200),
        location VARCHAR(300),
        instructions TEXT,
        scanned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Newsletter subscribers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_newsletter_subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(150) UNIQUE NOT NULL,
        name VARCHAR(100),
        subscribed_at TIMESTAMP DEFAULT NOW(),
        unsubscribed_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_newsletter_email ON src_newsletter_subscribers(email);
      CREATE INDEX IF NOT EXISTS idx_newsletter_active ON src_newsletter_subscribers(is_active);
    `);

    // Footer settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_footer_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        type VARCHAR(20) DEFAULT 'text',
        updated_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed footer settings with defaults
    await client.query(`
      INSERT INTO src_footer_settings (key, value, type) VALUES
        ('store_name', 'Shri Ram Clothings', 'text'),
        ('store_address', 'Silver Square Link, Near Sravan Choukdi, Bharuch, Gujarat – 392001, India', 'text'),
        ('phone_number', '+91 9876543210', 'text'),
        ('whatsapp_number', '919876543210', 'text'),
        ('support_email', 'support@shriramclothings.in', 'text'),
        ('working_hours', 'Mon – Sat: 9:00 AM to 8:00 PM', 'text'),
        ('brand_description', 'Premium Men''s Fashion Brand delivering trendy and high-quality clothing across India.', 'text'),
        ('google_maps_url', 'https://maps.google.com/?q=Bharuch,Gujarat,India', 'url'),
        ('instagram_url', '#', 'url'),
        ('facebook_url', '#', 'url'),
        ('youtube_url', '#', 'url'),
        ('copyright_text', '© 2026 Shri Ram Clothings. All Rights Reserved.', 'text'),
        ('tagline', 'Designed for Premium Men''s Fashion Experience', 'text')
      ON CONFLICT (key) DO NOTHING;
    `);

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

    // Seed ERP permissions
    await client.query(`
      INSERT INTO src_permissions (name, description, group_name) VALUES
        ('erp.view_dashboard', 'View ERP dashboard', 'ERP'),
        ('erp.manage_domains', 'Manage tenant domains', 'ERP'),
        ('erp.manage_users', 'Manage users and employees', 'ERP'),
        ('erp.manage_orders', 'Manage orders and shipments', 'ERP'),
        ('erp.manage_inventory', 'Manage inventory and products', 'ERP'),
        ('erp.manage_finance', 'Manage invoices, payments and reports', 'ERP'),
        ('erp.manage_notifications', 'Send notifications and campaigns', 'ERP'),
        ('erp.view_reports', 'View sales and business reports', 'ERP'),
        ('erp.manage_settings', 'Manage business settings', 'ERP'),
        ('erp.manage_suppliers', 'Manage suppliers and purchase orders', 'ERP')
      ON CONFLICT (name) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'super_admin', p.id FROM src_permissions p
        WHERE p.name LIKE 'erp.%'
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'admin', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard','erp.manage_users','erp.manage_orders','erp.manage_inventory','erp.view_reports','erp.manage_settings','erp.manage_notifications')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'business_owner', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard','erp.manage_users','erp.manage_orders','erp.manage_inventory','erp.view_reports','erp.manage_settings','erp.manage_finance')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'store_admin', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard','erp.manage_orders','erp.manage_inventory','erp.manage_users','erp.manage_notifications')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'store_manager', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard','erp.manage_orders','erp.manage_inventory','erp.manage_notifications')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'cashier', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard','erp.manage_orders','erp.manage_finance')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'warehouse_manager', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard','erp.manage_inventory','erp.manage_orders')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'accountant', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard','erp.manage_finance','erp.view_reports')
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Shri Ram Clothings DB initialized');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
