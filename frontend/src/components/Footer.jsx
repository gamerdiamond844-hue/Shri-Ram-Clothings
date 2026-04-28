import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ background: '#111827', color: '#9ca3af' }}>
      <div className="wrap" style={{ paddingTop: 56, paddingBottom: 32 }}>

        {/* Grid */}
        <div className="grid-footer" style={{ marginBottom: 48 }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <img src="/logo.jpg" alt="Shri Ram Clothings" style={{ height: 44, width: 'auto', borderRadius: 8, objectFit: 'contain', flexShrink: 0 }} />
              <div>
                <div className="font-display" style={{ fontWeight: 700, fontSize: 15, color: '#fff', lineHeight: 1.1 }}>Shri Ram</div>
                <div style={{ fontSize: 9, color: '#fb923c', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2 }}>Clothings</div>
              </div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#6b7280', marginBottom: 20, maxWidth: 240 }}>
              Premium men's fashion for the modern Indian man. Quality, style, and tradition.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['I', 'Instagram'], ['F', 'Facebook'], ['Y', 'YouTube']].map(([l, name]) => (
                <a key={name} href="#" title={name}
                  style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#9ca3af', textDecoration: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f97316'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#f97316'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                  {l}
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>Shop</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['All Products', '/shop'], ['T-Shirts', '/shop?category=t-shirts'], ['Shirts', '/shop?category=shirts'], ['Jeans', '/shop?category=jeans'], ['Jackets', '/shop?category=jackets'], ['Ethnic Wear', '/shop?category=ethnic-wear']].map(([label, to]) => (
                <Link key={label} to={to} style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = '#fb923c'}
                  onMouseLeave={e => e.target.style.color = '#6b7280'}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Account */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>Account</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['Login', '/login'], ['Register', '/register'], ['My Orders', '/orders'], ['Profile', '/profile'], ['Contact Us', '/contact'], ['Track Query', '/track-query']].map(([label, to]) => (
                <Link key={label} to={to} style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = '#fb923c'}
                  onMouseLeave={e => e.target.style.color = '#6b7280'}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>Contact</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: Mail,   text: 'support@shriramclothings.com' },
                { icon: Phone,  text: '+91 98765 43210' },
                { icon: MapPin, text: 'Mumbai, Maharashtra, India' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Icon size={14} style={{ color: '#f97316', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
          className="sm:flex-row sm:justify-between">
          <p style={{ fontSize: 12, color: '#4b5563' }}>© {new Date().getFullYear()} Shri Ram Clothings. All rights reserved.</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['Terms', '/terms'], ['Privacy', '/privacy'], ['Refund Policy', '/refund']].map(([label, to]) => (
              <Link key={label} to={to} style={{ fontSize: 12, color: '#4b5563', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = '#fb923c'}
                onMouseLeave={e => e.target.style.color = '#4b5563'}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
