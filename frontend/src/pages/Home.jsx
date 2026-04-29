import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Shield, RefreshCw, Headphones, ChevronLeft, ChevronRight, Volume2, VolumeX, ShoppingBag } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import api from '../utils/api';
import { useSiteSettings } from '../context/SiteSettingsContext';

const FEATURES = [
  { icon: Truck,      title: 'Free Shipping',  desc: 'On orders above ₹999' },
  { icon: Shield,     title: 'Secure Payment', desc: '100% safe & encrypted' },
  { icon: RefreshCw,  title: 'Easy Returns',   desc: '7-day return policy' },
  { icon: Headphones, title: '24/7 Support',   desc: 'Always here to help' },
];

// ── Hero Banner Slider ────────────────────────────────────────────────────────
function HeroBanner({ banners, settings }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  // No banners — show static hero
  if (!banners.length) {
    return (
      <section style={{ background: '#111827', padding: '80px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: 'rgba(249,115,22,0.08)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div className="wrap">
          <div style={{ maxWidth: 560 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(249,115,22,0.12)', color: '#fb923c', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 100, marginBottom: 20 }}>
              ✦ New Collection 2024
            </div>
            <h1 className="font-display" style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, marginBottom: 20 }}>
              <span className="gradient-text">{settings.hero_heading}</span>
            </h1>
            <p style={{ fontSize: 16, color: '#9ca3af', lineHeight: 1.7, marginBottom: 32, maxWidth: 420 }}>
              {settings.hero_subheading}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Link to={settings.hero_cta_link || '/shop'} className="btn-orange" style={{ padding: '13px 28px', borderRadius: 12, fontSize: 14 }}>
                {settings.hero_cta_text} <ArrowRight size={16} />
              </Link>
              <Link to="/shop?featured=true" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '13px 28px', fontSize: 14, fontWeight: 600, color: '#d1d5db', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 12, textDecoration: 'none' }}>
                New Arrivals
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const b = banners[current];
  const isMobile = window.innerWidth < 640;
  const img = (isMobile && b.mobile_image) ? b.mobile_image : b.desktop_image;

  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: '#111827' }}>
      {/* Slides */}
      <div style={{ position: 'relative', minHeight: 'clamp(300px, 55vw, 600px)' }}>
        {banners.map((ban, i) => {
          const bgImg = (isMobile && ban.mobile_image) ? ban.mobile_image : ban.desktop_image;
          return (
            <div key={ban.id} style={{
              position: 'absolute', inset: 0, transition: 'opacity 0.6s ease',
              opacity: i === current ? 1 : 0, pointerEvents: i === current ? 'auto' : 'none',
            }}>
              {bgImg && (
                <img src={bgImg} alt={ban.heading || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />

              {/* Text overlay */}
              {(ban.heading || ban.cta_text) && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                  <div className="wrap">
                    <div style={{ maxWidth: 520 }}>
                      {ban.heading && (
                        <h2 className="font-display" style={{ fontSize: 'clamp(28px, 5vw, 60px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 12 }}>
                          {ban.heading}
                        </h2>
                      )}
                      {ban.subheading && (
                        <p style={{ fontSize: 'clamp(13px, 2vw, 17px)', color: 'rgba(255,255,255,0.85)', marginBottom: 24, lineHeight: 1.6 }}>
                          {ban.subheading}
                        </p>
                      )}
                      {ban.cta_text && (
                        <Link to={ban.cta_link || '/shop'} className="btn-orange" style={{ padding: '12px 28px', borderRadius: 12, fontSize: 14 }}>
                          {ban.cta_text} <ArrowRight size={15} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Arrows */}
      {banners.length > 1 && (
        <>
          <button onClick={() => setCurrent(c => (c - 1 + banners.length) % banners.length)}
            style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', backdropFilter: 'blur(4px)' }}>
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrent(c => (c + 1) % banners.length)}
            style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', backdropFilter: 'blur(4px)' }}>
            <ChevronRight size={20} />
          </button>

          {/* Dots */}
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                style={{ width: i === current ? 20 : 6, height: 6, borderRadius: 3, background: i === current ? '#f97316' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ── Reels Section ─────────────────────────────────────────────────────────────
function ReelsSection({ reels }) {
  const [muted, setMuted] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const videoRefs = useRef([]);

  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === activeIdx) { v.play().catch(() => {}); }
      else { v.pause(); v.currentTime = 0; }
    });
  }, [activeIdx]);

  if (!reels.length) return null;

  return (
    <section style={{ background: '#0f0f0f', padding: '56px 0' }}>
      <div className="wrap">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>🎬 Style Reels</div>
            <h2 className="font-display" style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 900, color: '#fff' }}>Shop the Look</h2>
          </div>
          <button onClick={() => setMuted(m => !m)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {reels.map((reel, i) => (
            <div key={reel.id}
              onClick={() => setActiveIdx(i)}
              style={{
                position: 'relative', flexShrink: 0,
                width: i === activeIdx ? 180 : 120,
                borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                aspectRatio: '9/16', background: '#1a1a1a',
                border: i === activeIdx ? '2px solid #f97316' : '2px solid transparent',
                transition: 'all 0.3s ease',
              }}>
              <video
                ref={el => videoRefs.current[i] = el}
                src={reel.video_url}
                poster={reel.thumbnail_url || undefined}
                muted={muted}
                loop
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />

              {/* Gradient overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)' }} />

              {/* Info */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 8px' }}>
                {reel.title && (
                  <div style={{ fontSize: 10, color: '#fff', fontWeight: 600, lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {reel.title}
                  </div>
                )}
                {reel.product_id && (
                  <Link to={`/product/${reel.product_id}`}
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f97316', color: '#fff', fontSize: 9, fontWeight: 700, padding: '4px 8px', borderRadius: 6, textDecoration: 'none' }}>
                    <ShoppingBag size={9} /> Shop Now
                  </Link>
                )}
              </div>

              {/* Play indicator */}
              {i !== activeIdx && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>▶</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Product Section ───────────────────────────────────────────────────────────
function ProductSection({ section }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ limit: 8 });
    if (section.type === 'featured_products') params.set('featured', 'true');
    if (section.type === 'trending_products') params.set('trending', 'true');
    if (section.type === 'new_arrivals')      params.set('sort', 'newest');
    if (section.type === 'best_sellers')      params.set('sort', 'popular');
    api.get(`/products?${params}`)
      .then(r => setProducts(r.data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [section.type]);

  if (!loading && !products.length) return null;

  return (
    <section style={{ background: section.type === 'trending_products' || section.type === 'best_sellers' ? '#f9fafb' : '#fff', padding: '64px 0' }}>
      <div className="wrap">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              {section.type === 'featured_products' && 'Handpicked'}
              {section.type === 'trending_products' && '🔥 Hot Right Now'}
              {section.type === 'new_arrivals'      && '✨ Just In'}
              {section.type === 'best_sellers'      && '🏆 Top Picks'}
            </div>
            <h2 className="font-display" style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#111827' }}>
              {section.title || {
                featured_products: 'Featured Collection',
                trending_products: 'Trending Now',
                new_arrivals:      'New Arrivals',
                best_sellers:      'Best Sellers',
              }[section.type]}
            </h2>
            {section.subtitle && <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{section.subtitle}</p>}
          </div>
          <Link to="/shop" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#f97316', textDecoration: 'none' }}>
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid-2-3-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '3/4', borderRadius: 16 }} />
            ))}
          </div>
        ) : (
          <div className="grid-2-3-4">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Categories Section ────────────────────────────────────────────────────────
// Fallback images from Unsplash for categories without uploaded images
const CAT_FALLBACKS = {
  't-shirts':    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
  'shirts':      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80',
  'jeans':       'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80',
  'jackets':     'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',
  'ethnic-wear': 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=80',
};
const CAT_DEFAULT = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80';

function CategoriesSection({ section }) {
  const [cats, setCats] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    api.get('/products/categories')
      .then(r => setCats(r.data || []))
      .catch(() => setCats([]))
      .finally(() => setLoadingCats(false));
  }, []);

  return (
    <section style={{ background: '#111827', padding: '64px 0' }}>
      <div className="wrap">
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Collections</div>
          <h2 className="font-display" style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, color: '#fff' }}>
            {section.title || 'Shop by Style'}
          </h2>
          {section.subtitle && <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>{section.subtitle}</p>}
        </div>

        {loadingCats ? (
          <div className="grid-2-3-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '4/5', borderRadius: 16 }} />
            ))}
          </div>
        ) : (
          <div className="grid-2-3-5">
            {cats.map(cat => {
              const img = cat.image_url || CAT_FALLBACKS[cat.slug] || CAT_DEFAULT;
              return (
                <Link
                  key={cat.slug}
                  to={`/shop?category=${cat.slug}`}
                  style={{ display: 'block', position: 'relative', borderRadius: 16, overflow: 'hidden', textDecoration: 'none', aspectRatio: '4/5', background: '#1a1a1a' }}
                  onMouseEnter={e => {
                    const img = e.currentTarget.querySelector('img');
                    const overlay = e.currentTarget.querySelector('.cat-overlay');
                    const label = e.currentTarget.querySelector('.cat-label');
                    if (img) img.style.transform = 'scale(1.08)';
                    if (overlay) overlay.style.background = 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)';
                    if (label) label.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={e => {
                    const img = e.currentTarget.querySelector('img');
                    const overlay = e.currentTarget.querySelector('.cat-overlay');
                    const label = e.currentTarget.querySelector('.cat-label');
                    if (img) img.style.transform = 'scale(1)';
                    if (overlay) overlay.style.background = 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)';
                    if (label) label.style.transform = 'translateY(0)';
                  }}>

                  {/* Category image */}
                  <img
                    src={img}
                    alt={cat.name}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)' }}
                  />

                  {/* Gradient overlay */}
                  <div
                    className="cat-overlay"
                    style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)', transition: 'background 0.3s ease' }}
                  />

                  {/* Category label */}
                  <div
                    className="cat-label"
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 14px', transition: 'transform 0.3s ease' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.02em' }}>{cat.name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 3, fontWeight: 500 }}>
                      {cat.product_count || 0} items
                    </p>
                  </div>

                  {/* Shop arrow on hover */}
                  <div style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <ArrowRight size={14} color="#fff" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Offer Banner Section ──────────────────────────────────────────────────────
function OfferBannerSection({ section }) {
  return (
    <section style={{ background: '#111827', padding: '64px 0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: 0, top: 0, width: 300, height: 300, background: 'rgba(249,115,22,0.08)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div className="wrap" style={{ textAlign: 'center', position: 'relative' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#fb923c', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Limited Time</div>
        <h2 className="font-display" style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: '#fff', marginBottom: 12 }}>
          {section.title || 'New Arrivals Every Week'}
        </h2>
        <p style={{ color: '#9ca3af', marginBottom: 32, fontSize: 15 }}>
          {section.subtitle || 'Stay ahead of fashion. Fresh styles added weekly.'}
        </p>
        <Link to="/shop" className="btn-orange" style={{ padding: '14px 36px', borderRadius: 12, fontSize: 14 }}>
          Explore Collection <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

// ── Main Home Component ───────────────────────────────────────────────────────
export default function Home() {
  const { settings } = useSiteSettings();
  const [banners, setBanners]   = useState([]);
  const [sections, setSections] = useState([]);
  const [reels, setReels]       = useState([]);
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/homepage/banners').catch(() => ({ data: [] })),
      api.get('/homepage/sections').catch(() => ({ data: [] })),
      api.get('/homepage/reels').catch(() => ({ data: [] })),
    ]).then(([b, s, r]) => {
      setBanners(b.data || []);
      setSections(s.data || []);
      setReels(r.data || []);
    }).finally(() => setLoaded(true));
  }, []);

  // Render a section based on its type
  const renderSection = (section) => {
    switch (section.type) {
      case 'featured_products':
      case 'trending_products':
      case 'new_arrivals':
      case 'best_sellers':
        return <ProductSection key={section.id} section={section} />;
      case 'categories':
        return <CategoriesSection key={section.id} section={section} />;
      case 'offer_banner':
        return <OfferBannerSection key={section.id} section={section} />;
      case 'reels':
        return reels.length > 0 ? <ReelsSection key={section.id} reels={reels} /> : null;
      default:
        return null;
    }
  };

  // If no sections configured, show default layout
  const hasCustomSections = sections.length > 0;

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>

      {/* Hero Banner */}
      <HeroBanner banners={banners} settings={settings} />

      {/* Features strip */}
      <section style={{ background: '#fff', borderBottom: '1px solid #f3f4f6', padding: '24px 0' }}>
        <div className="wrap">
          <div className="grid-features">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, background: '#fff7ed', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={17} color="#f97316" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{title}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic sections OR default layout */}
      {hasCustomSections ? (
        sections.map(s => renderSection(s))
      ) : (
        <>
          {/* Default: Categories */}
          <CategoriesSection section={{ title: 'Shop by Style' }} />

          {/* Default: Featured */}
          <ProductSection section={{ type: 'featured_products', title: 'Featured Collection' }} />

          {/* Default: CTA Banner */}
          <OfferBannerSection section={{ title: 'New Arrivals Every Week', subtitle: 'Stay ahead of fashion. Fresh styles added weekly.' }} />

          {/* Default: Trending */}
          <ProductSection section={{ type: 'trending_products', title: 'Trending Now' }} />

          {/* Reels if any */}
          {reels.length > 0 && <ReelsSection reels={reels} />}
        </>
      )}
    </div>
  );
}
