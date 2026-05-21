import fs from 'node:fs/promises';
import path from 'node:path';

const SITE_URL =
  (process.env.SITEMAP_SITE_URL || process.env.SITE_URL || 'https://www.shriramclothings.in').replace(/\/+$/, '');

const API_BASE_RAW = (process.env.SITEMAP_API_URL || process.env.VITE_API_URL || '').trim();

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const OUT_FILE = path.join(PUBLIC_DIR, 'sitemap.xml');

const staticRoutes = [
  { path: '/', changefreq: 'daily', priority: 1.0 },
  { path: '/shop', changefreq: 'daily', priority: 0.9 },
  { path: '/contact', changefreq: 'monthly', priority: 0.6 },

  // Legal / policy pages
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

async function fetchAllProducts() {
  if (!API_BASE_RAW) {
    console.warn('[sitemap] VITE_API_URL not set. Skipping product URLs.');
    return [];
  }

  const apiBase = API_BASE_RAW.replace(/\/+$/, '');
  const productsBase = apiBase.endsWith('/api') ? `${apiBase}/products` : `${apiBase}/api/products`;

  const limit = 500;
  let page = 1;
  let total = Infinity;
  const products = [];

  while ((page - 1) * limit < total) {
    const url = new URL(productsBase);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`[sitemap] Failed to fetch products: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    total = Number(data?.total ?? 0);
    const rows = Array.isArray(data?.products) ? data.products : [];
    products.push(...rows);
    page += 1;

    // Safety guard
    if (page > 200) break;
  }

  return products;
}

async function main() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });

  let productUrls = [];
  try {
    const products = await fetchAllProducts();
    productUrls = products.map((p) => ({
      loc: `${SITE_URL}/product/${encodeURIComponent(p.id)}`,
      lastmod: toLastMod(p.updated_at || p.created_at),
      changefreq: 'weekly',
      priority: 0.7,
    }));
    console.log(`[sitemap] Products added: ${productUrls.length}`);
  } catch (e) {
    console.warn(String(e?.message || e));
    console.warn('[sitemap] Continuing with static routes only.');
  }

  const staticUrls = staticRoutes.map((r) => ({
    loc: `${SITE_URL}${r.path}`,
    changefreq: r.changefreq,
    priority: r.priority,
  }));

  const all = [...staticUrls, ...productUrls];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    all.map(makeUrlEntry).join('\n') +
    `\n</urlset>\n`;

  await fs.writeFile(OUT_FILE, xml, 'utf8');
  console.log(`[sitemap] Written: ${OUT_FILE}`);
}

main();

