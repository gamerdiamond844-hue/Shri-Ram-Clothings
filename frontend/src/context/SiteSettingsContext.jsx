import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const SiteSettingsContext = createContext({});

const DEFAULTS = {
  hero_heading: 'Dress Like Royalty',
  hero_subheading: "Premium men's fashion for the modern Indian man.",
  hero_cta_text: 'Shop Now',
  hero_cta_link: '/shop',
  announcement_text: '🎉 Free Shipping on orders above ₹999 · Use code WELCOME10 for 10% off',
  seo_title: "Shri Ram Clothings – Premium Men's Fashion Online",
  seo_description: "Shop premium men's clothing at Shri Ram Clothings. T-Shirts, Shirts, Jeans, Jackets & Ethnic Wear. Fast delivery across India.",
  seo_keywords: "men's clothing, t-shirts, shirts, jeans, jackets, ethnic wear, Indian fashion",
};

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/homepage/settings', {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      });
      const data = res.data || {};
      // Merge with defaults so missing keys fall back gracefully
      setSettings({ ...DEFAULTS, ...data });
    } catch {
      // Keep defaults on error
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Apply SEO tags whenever settings change
  useEffect(() => {
    if (!loaded) return;

    // Page title
    if (settings.seo_title) {
      document.title = settings.seo_title;
    }

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', settings.seo_description || DEFAULTS.seo_description);

    // Meta keywords
    let metaKw = document.querySelector('meta[name="keywords"]');
    if (!metaKw) {
      metaKw = document.createElement('meta');
      metaKw.setAttribute('name', 'keywords');
      document.head.appendChild(metaKw);
    }
    metaKw.setAttribute('content', settings.seo_keywords || DEFAULTS.seo_keywords);

    // OG title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', settings.seo_title || DEFAULTS.seo_title);

    // OG description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', settings.seo_description || DEFAULTS.seo_description);

  }, [settings, loaded]);

  return (
    <SiteSettingsContext.Provider value={{ settings, fetchSettings, loaded }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
