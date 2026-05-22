# Canonical / Indexing / SEO Identity Fix Report

Official canonical domain (enforced throughout): **https://www.shriramclothings.in**

## 1) What was wrong

### A. Wrong canonical domain declared site-wide
The frontend entry HTML was declaring and publishing SEO identity for **`https://shriramclothings.com`** via:
- `<link rel="canonical">`
- `og:url`, `og:image`
- `twitter:image`
- JSON‑LD Organization `"url"` and `"logo"`

This creates mixed-domain signals (canonical + social + structured data), which commonly causes Google Search Console canonical/indexing inconsistency.

### B. SPA routes had no per-route canonical handling
Because this is a **Vite + React SPA** (client-side routing), the canonical/OG URL would not automatically update when navigating to `/shop`, `/product/:id`, etc. That makes Google and social scrapers see inconsistent URLs.

### C. Favicon/manifest setup was not Google-friendly
The site used `logo.jpg` as the favicon and did not provide standard favicon/manifest files, which commonly causes:
- missing favicon in browser tabs
- favicon not being picked up by Google
- inconsistent icon fetching / caching behavior

### D. Hardcoded `.com` branding in multiple places
There were several `.com` hardcoded references in frontend/backend defaults (support email, admin email, etc.) which are part of site identity and can leak into metadata and public pages.

## 2) Fixes applied (high impact changes)

### A. Canonical + OG/Twitter + JSON-LD corrected to `.in`
Updated frontend static SEO identity to only publish:
- **Canonical**: `https://www.shriramclothings.in/`
- **OG URL**: `https://www.shriramclothings.in/`
- **Twitter URL**: `https://www.shriramclothings.in/`
- **OG/Twitter images**: `https://www.shriramclothings.in/og-image.jpg`
- **JSON‑LD Organization URL/logo**: `https://www.shriramclothings.in/` and `https://www.shriramclothings.in/logo.jpg`

### B. Per-route canonical/OG URL normalization (SPA-safe)
Added a lightweight client-side SEO synchronizer so that when the user navigates inside the SPA, the following always match the **current route** on the official domain:
- `link[rel="canonical"]`
- `meta[property="og:url"]`
- `meta[name="twitter:url"]`

### C. Sitemap base locked to the official domain
The backend sitemap generator already supported a `SITE_URL` base; we ensured defaults and env examples are explicitly set to:
- `SITE_URL=https://www.shriramclothings.in`

This guarantees `<loc>` entries in `sitemap.xml` are only on the official domain.

### D. Robots.txt already correct
`robots.txt` already allows indexing and points to:
- `Sitemap: https://www.shriramclothings.in/sitemap.xml`

### E. Google-friendly favicon + manifest + OG image
Generated and added a complete standard set of public assets:
- `favicon.ico` (multi-size)
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png` (180×180)
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`
- `site.webmanifest`
- `og-image.jpg` (1200×630)

Also bumped the service worker cache version to reduce stale asset caching.

### F. Redirects (canonical host enforcement at edge)
Added Vercel host-based **301 redirects** so requests are normalized to the official canonical host:
- `shriramclothings.in/*` → `https://www.shriramclothings.in/*`
- `shriramclothings.com/*` → `https://www.shriramclothings.in/*`
- `www.shriramclothings.com/*` → `https://www.shriramclothings.in/*`

Important: the `.com` redirects will only execute if the `.com` domain is configured to point to (or be an alias of) the same deployment at the DNS/hosting level.

## 3) Files changed / added

### Frontend (SEO identity, canonical, icons)
- `frontend/index.html` — fixed canonical/OG/Twitter/JSON‑LD + added manifest/favicon tags
- `frontend/src/components/SeoManager.jsx` — **new**: keeps canonical + OG/Twitter URLs aligned to official domain per SPA route
- `frontend/src/App.jsx` — mounts `SeoManager`
- `frontend/public/` — **new assets**:
  - `favicon.ico`
  - `favicon-16x16.png`
  - `favicon-32x32.png`
  - `apple-touch-icon.png`
  - `android-chrome-192x192.png`
  - `android-chrome-512x512.png`
  - `site.webmanifest`
  - `og-image.jpg`
- `frontend/public/sw.js` — cache version bump
- `frontend/.env.example` — added `VITE_SITE_URL=https://www.shriramclothings.in`

### Frontend (remove `.com` hardcoding in UI/legal)
- `frontend/src/context/SiteSettingsContext.jsx`
- `frontend/src/components/Footer.jsx`
- `frontend/src/pages/Contact.jsx`
- `frontend/src/pages/admin/AdminHpSettings.jsx`
- `frontend/src/pages/legal/LegalPage.jsx`

### Backend (remove `.com` identity defaults + sitemap base)
- `backend/controllers/notificationController.js`
- `backend/createAdmin.js`
- `backend/config/db.js` (default support email seed)
- `backend/.env` (support email + explicit `SITE_URL`)
- `backend/.env.example` (explicit `SITE_URL`)

### Deployment
- `vercel.json` — added host-based 301 redirects
- `frontend/vercel.json` — added host-based 301 redirects
- `render.yaml` — added `SITE_URL=https://www.shriramclothings.in`

## 4) Verification performed

- Built the frontend successfully (`vite build`) to ensure the changes compile.
- Confirmed the generated icon/manifest/image assets return **HTTP 200** when served from the built site.
- Confirmed **no remaining `shriramclothings.com`** references in the production build output (dist).

## 5) Remaining / external items (not fixable purely in code)

### A. Google Search Console actions (recommended)
1. Add/verify properties for:
   - `https://www.shriramclothings.in` (and optionally domain property)
2. Submit sitemap:
   - `https://www.shriramclothings.in/sitemap.xml`
3. Inspect a few key URLs (Home, Shop, Product page) and “Request indexing”.

### B. Ensure old domains truly redirect at the platform/DNS level
To fully remove mixed signals, ensure:
- `shriramclothings.com` and `www.shriramclothings.com` point to the same Vercel project (as aliases) **or** are redirected at registrar/DNS/hosting to the `.in` domain.

## 6) Notes / risk controls
- Changes were limited to SEO identity, metadata, icons, and safe redirects; no UI functionality was removed.
- The backend `.env` file appears committed with sensitive values; for security best practice, rotate secrets and avoid committing production secrets to git.

