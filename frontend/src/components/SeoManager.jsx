import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const normalizeBase = (url) => String(url || '').trim().replace(/\/+$/, '');

const SITE_URL = normalizeBase(import.meta.env.VITE_SITE_URL || 'https://www.shriramclothings.in');
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

function ensureMeta({ selector, createAttrs, setAttrs }) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    Object.entries(createAttrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  Object.entries(setAttrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function ensureLink({ selector, createAttrs, setAttrs }) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('link');
    Object.entries(createAttrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  Object.entries(setAttrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

/**
 * Keeps canonical + social URLs consistent with the ONE official domain:
 * https://www.shriramclothings.in
 *
 * Note: This is client-side. For best SEO, ensure server-side/static meta is also correct (index.html).
 */
export default function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    // Build absolute URL for current SPA route
    const path = `${location.pathname || '/'}${location.search || ''}`;
    const absoluteUrl = `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

    // Canonical
    ensureLink({
      selector: 'link[rel="canonical"]',
      createAttrs: { rel: 'canonical' },
      setAttrs: { href: absoluteUrl },
    });

    // OG/Twitter canonical URL
    ensureMeta({
      selector: 'meta[property="og:url"]',
      createAttrs: { property: 'og:url' },
      setAttrs: { content: absoluteUrl },
    });
    ensureMeta({
      selector: 'meta[name="twitter:url"]',
      createAttrs: { name: 'twitter:url' },
      setAttrs: { content: absoluteUrl },
    });

    // Ensure OG/Twitter images are absolute + on the official domain
    ensureMeta({
      selector: 'meta[property="og:image"]',
      createAttrs: { property: 'og:image' },
      setAttrs: { content: DEFAULT_OG_IMAGE },
    });
    ensureMeta({
      selector: 'meta[name="twitter:image"]',
      createAttrs: { name: 'twitter:image' },
      setAttrs: { content: DEFAULT_OG_IMAGE },
    });

    // Keep JSON-LD Organization identity aligned
    const ld = document.head.querySelector('script[type="application/ld+json"]');
    if (ld?.textContent) {
      try {
        const data = JSON.parse(ld.textContent);
        if (data && typeof data === 'object' && data['@type'] === 'Organization') {
          data.url = `${SITE_URL}/`;
          data.logo = `${SITE_URL}/logo.jpg`;
          ld.textContent = JSON.stringify(data);
        }
      } catch {
        // ignore invalid JSON-LD
      }
    }
  }, [location.pathname, location.search]);

  return null;
}

