import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Clock, MessageCircle, Copy, ExternalLink, ChevronUp, Send } from 'lucide-react';
import { useSiteSettings } from '../context/SiteSettingsContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

// ── Social icon SVGs ──────────────────────────────────────────────────────────
const InstagramIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);
const FacebookIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const YoutubeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
  </svg>
);
const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const QUICK_LINKS = [
  ['Home', '/'],
  ['Shop', '/shop'],
  ['New Arrivals', '/shop?featured=true'],
  ['Track Order', '/orders'],
  ['Contact Us', '/contact'],
  ['Track Query', '/track-query'],
];

const POLICY_LINKS = [
  ['Privacy Policy', '/privacy'],
  ['Terms & Conditions', '/terms'],
  ['Return Policy', '/return-policy'],
  ['Refund Policy', '/refund'],
  ['Shipping Policy', '/shipping'],
  ['Cancellation Policy', '/cancellation'],
  ['Cookies Policy', '/cookies'],
  ['Legal Notice', '/legal'],
];

const CATEGORIES = [
  ['T-Shirts', '/shop?category=t-shirts'],
  ['Shirts', '/shop?category=shirts'],
  ['Jeans', '/shop?category=jeans'],
  ['Jackets', '/shop?category=jackets'],
  ['Ethnic Wear', '/shop?category=ethnic-wear'],
];

// ── Scroll to top button ──────────────────────────────────────────────────────
export function ScrollToTopBtn() {
  const [visible, setVisible] = useState(false);
  if (typeof window !== 'undefined') {
    window.onscroll = () => setVisible(window.scrollY > 400);
  }
  if (!visible) return null;
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{ position: 'fixed', bottom: 90, right: 20, width: 44, height: 44, borderRadius: '50%', background: '#f97316', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(249,115,22,0.4)', zIndex: 998, transition: 'all 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      title="Scroll to top">
      <ChevronUp size={20} color="#fff" />
    </button>
  );
}

// ── Floating WhatsApp button ──────────────────────────────────────────────────
export function FloatingWhatsApp({ phone }) {
  const number = (phone || '919876543210').replace(/\D/g, '');
  return (
    <a href={`https://wa.me/${number}?text=Hi! I need help with my order.`}
      target="_blank" rel="noopener noreferrer"
      style={{ position: 'fixed', bottom: 24, right: 20, width: 52, height: 52, borderRadius: '50%', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,211,102,0.45)', zIndex: 999, textDecoration: 'none', transition: 'all 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      title="Chat on WhatsApp">
      <WhatsAppIcon />
    </a>
  );
}

// ── Main Footer ───────────────────────────────────────────────────────────────
export default function Footer() {
  const { settings } = useSiteSettings();
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const phone = settings.footer_phone || '+91 98765 43210';
  const emailAddr = settings.footer_email || 'support@shriramclothings.in';
  const whatsapp = (settings.footer_whatsapp || '919876543210').replace(/\D/g, '');
  const address = settings.footer_address || 'Silver Square Link, Near Sravan Choukdi, Bharuch, Gujarat – 392001, India';
  const mapsUrl = settings.footer_maps_url || 'https://maps.google.com/?q=Bharuch,Gujarat,India';
  const hours = settings.footer_hours || 'Mon – Sat: 9:00 AM to 8:00 PM';
  const description = settings.footer_description || "Premium Men's Fashion Brand delivering trendy and high-quality clothing across India.";

  const copyAddress = () => {
    navigator.clipboard.writeText(address).then(() => toast.success('Address copied!')).catch(() => toast.error('Copy failed'));
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) return toast.error('Enter a valid email address');
    setSubscribing(true);
    try {
      await api.post('/homepage/newsletter', { email });
      toast.success(' Subscribed! Welcome to Shri Ram Clothings.');
      setEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Subscription failed. Try again.');
    } finally { setSubscribing(false); }
  };

  const linkStyle = { fontSize: 13, color: '#6b7280', textDecoration: 'none', transition: 'color 0.15s', display: 'flex', alignItems: 'center', gap: 6 };
  const hoverOrange = (e) => e.currentTarget.style.color = '#fb923c';
  const unhoverOrange = (e) => e.currentTarget.style.color = '#6b7280';

  return (
    <>
      <footer style={{ background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)', color: '#9ca3af', borderTop: '1px solid rgba(249,115,22,0.15)' }}>

        {/* ── Newsletter Strip ── */}
        <div style={{ background: 'rgba(249,115,22,0.06)', borderBottom: '1px solid rgba(249,115,22,0.1)', padding: '28px 0' }}>
          <div className="wrap">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Stay in Style </p>
                <p style={{ fontSize: 13, color: '#6b7280' }}>Subscribe for exclusive offers, new arrivals & style tips.</p>
              </div>
              <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  style={{ padding: '10px 16px', fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 10, outline: 'none', color: '#fff', fontFamily: 'inherit', width: 260 }}
                  onFocus={e => e.target.style.borderColor = '#f97316'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button type="submit" disabled={subscribing}
                  style={{ padding: '10px 20px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: subscribing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: subscribing ? 0.7 : 1, transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!subscribing) e.currentTarget.style.background = '#ea580c'; }}
                  onMouseLeave={e => e.currentTarget.style.background = '#f97316'}>
                  <Send size={14} /> {subscribing ? 'Subscribing...' : 'Subscribe'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── Main Footer Grid ── */}
        <div className="wrap" style={{ paddingTop: 56, paddingBottom: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px 32px', marginBottom: 48 }}>

            {/* Brand */}
            <div style={{ gridColumn: 'span 1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <img src="/logo.jpg" alt="Shri Ram Clothings" style={{ height: 46, width: 'auto', borderRadius: 10, objectFit: 'contain', flexShrink: 0 }} />
                <div>
                  <div className="font-display" style={{ fontWeight: 800, fontSize: 16, color: '#fff', lineHeight: 1.1 }}>Shri Ram</div>
                  <div style={{ fontSize: 9, color: '#f97316', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2 }}>Clothings</div>
                </div>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.75, color: '#6b7280', marginBottom: 22, maxWidth: 240 }}>{description}</p>

              {/* Social icons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { href: settings.footer_instagram || '#', Icon: InstagramIcon, label: 'Instagram', hoverColor: '#e1306c' },
                  { href: settings.footer_facebook || '#', Icon: FacebookIcon, label: 'Facebook', hoverColor: '#1877f2' },
                  { href: settings.footer_youtube || '#', Icon: YoutubeIcon, label: 'YouTube', hoverColor: '#ff0000' },
                  { href: `https://wa.me/${whatsapp}`, Icon: WhatsAppIcon, label: 'WhatsApp', hoverColor: '#25d366' },
                ].map(({ href, Icon, label, hoverColor }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={label}
                    style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', textDecoration: 'none', transition: 'all 0.2s', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.background = hoverColor; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = hoverColor; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${hoverColor}55`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <Icon size={15} />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Quick Links</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {QUICK_LINKS.map(([label, to]) => (
                  <Link key={label} to={to} style={linkStyle} onMouseEnter={hoverOrange} onMouseLeave={unhoverOrange}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Categories</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {CATEGORIES.map(([label, to]) => (
                  <Link key={label} to={to} style={linkStyle} onMouseEnter={hoverOrange} onMouseLeave={unhoverOrange}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
                    {label}
                  </Link>
                ))}
                <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Policies</p>
                  {POLICY_LINKS.map(([label, to]) => (
                    <Link key={label} to={to} style={{ ...linkStyle, marginBottom: 10 }} onMouseEnter={hoverOrange} onMouseLeave={unhoverOrange}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#374151', flexShrink: 0 }} />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact + Address */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Customer Support</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Phone */}
                <a href={`tel:${phone.replace(/\s/g, '')}`}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textDecoration: 'none', color: '#6b7280', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fb923c'}
                  onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}>
                  <div style={{ width: 28, height: 28, background: 'rgba(249,115,22,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={13} color="#f97316" />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Call Us</p>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{phone}</p>
                  </div>
                </a>

                {/* WhatsApp */}
                <a href={`https://wa.me/${whatsapp}?text=Hi! I need help.`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textDecoration: 'none', color: '#6b7280', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#25d366'}
                  onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}>
                  <div style={{ width: 28, height: 28, background: 'rgba(37,211,102,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#25d366' }}>
                    <WhatsAppIcon />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>WhatsApp</p>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>Chat with us</p>
                  </div>
                </a>

                {/* Email */}
                <a href={`mailto:${emailAddr}`}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textDecoration: 'none', color: '#6b7280', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fb923c'}
                  onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}>
                  <div style={{ width: 28, height: 28, background: 'rgba(249,115,22,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={13} color="#f97316" />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Email</p>
                    <p style={{ fontSize: 12, fontWeight: 600, wordBreak: 'break-all' }}>{emailAddr}</p>
                  </div>
                </a>

                {/* Hours */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 28, height: 28, background: 'rgba(249,115,22,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={13} color="#f97316" />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Working Hours</p>
                    <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{hours}</p>
                  </div>
                </div>

                {/* Address */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 28, height: 28, background: 'rgba(249,115,22,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MapPin size={13} color="#f97316" />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Store Address</p>
                    <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, marginBottom: 8 }}>{address}</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '4px 10px', borderRadius: 6, textDecoration: 'none', border: '1px solid rgba(249,115,22,0.2)', transition: 'all 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f97316' + ' ' + (e.currentTarget.style.color = '#fff')}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.1)'; e.currentTarget.style.color = '#f97316'; }}>
                        <ExternalLink size={10} /> Maps
                      </a>
                      <button onClick={copyAddress}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#6b7280', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
                        <Copy size={10} /> Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom bar ── */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 12, color: '#4b5563' }}>© {new Date().getFullYear()} Shri Ram Clothings. All Rights Reserved.</p>
              <p style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>Platform Managed & Operated by <span style={{ color: '#6b7280' }}>Dinesh Global Enterprise Private Limited</span></p>
              <p style={{ fontSize: 10, color: '#374151', marginTop: 1 }}>Designed for Premium Men's Fashion Experience</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {POLICY_LINKS.map(([label, to]) => (
                <Link key={label} to={to} style={{ fontSize: 11, color: '#4b5563', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = '#fb923c'}
                  onMouseLeave={e => e.target.style.color = '#4b5563'}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Floating buttons */}
      <FloatingWhatsApp phone={settings.footer_whatsapp} />
      <ScrollToTopBtn />
    </>
  );
}
