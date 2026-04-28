import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Search, Menu, X, User, LogOut, Package, LayoutDashboard, ChevronDown, Heart } from 'lucide-react';

export default function Navbar() {
  const { user, logout, cartCount, wishlistCount } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const dropRef = useRef(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const fn = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => { setMenuOpen(false); setDropOpen(false); setSearchOpen(false); }, [pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQ.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(searchQ.trim())}`);
    setSearchOpen(false); setSearchQ('');
  };

  const cats = [
    { label: 'T-Shirts', slug: 't-shirts' }, { label: 'Shirts', slug: 'shirts' },
    { label: 'Jeans', slug: 'jeans' }, { label: 'Jackets', slug: 'jackets' },
    { label: 'Ethnic Wear', slug: 'ethnic-wear' },
  ];

  const iconBtn = { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, color: '#6b7280', transition: 'all 0.15s', position: 'relative', textDecoration: 'none' };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      {/* Announcement bar */}
      <div style={{ background: '#111827', color: '#d1d5db', textAlign: 'center', fontSize: 12, padding: '8px 16px', fontWeight: 500 }}>
        🎉 Free Shipping on orders above ₹999 &nbsp;·&nbsp; Use code <strong style={{ color: '#fb923c' }}>WELCOME10</strong> for 10% off
      </div>

      {/* Main nav */}
      <nav style={{ background: scrolled ? 'rgba(255,255,255,0.95)' : '#fff', backdropFilter: scrolled ? 'blur(12px)' : 'none', borderBottom: '1px solid #f3f4f6', boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s' }}>
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <img src="/logo.jpg" alt="Shri Ram Clothings" style={{ height: 38, width: 'auto', borderRadius: 8, objectFit: 'contain' }} />
            <div style={{ display: 'none' }} className="hide-mobile-block">
              <div className="font-display" style={{ fontWeight: 700, fontSize: 15, color: '#111827', lineHeight: 1.1 }}>Shri Ram</div>
              <div style={{ fontSize: 9, color: '#f97316', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 1 }}>Clothings</div>
            </div>
          </Link>

          {/* Desktop nav - hidden on mobile */}
          <div className="hide-mobile" style={{ alignItems: 'center', gap: 28 }}>
            <Link to="/" style={{ fontSize: 13, fontWeight: 500, color: pathname === '/' ? '#f97316' : '#374151', textDecoration: 'none' }}>Home</Link>

            {/* Shop dropdown */}
            <div style={{ position: 'relative' }}
            onMouseEnter={e => { const dd = e.currentTarget.querySelector('.shop-dd'); dd.style.opacity = '1'; dd.style.visibility = 'visible'; }}
              onMouseLeave={e => { const dd = e.currentTarget.querySelector('.shop-dd'); dd.style.opacity = '0'; dd.style.visibility = 'hidden'; }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                Shop <ChevronDown size={13} />
              </button>
              <div className="shop-dd" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8, width: 180, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #f3f4f6', padding: '6px 0', opacity: 0, visibility: 'hidden', transition: 'all 0.15s', zIndex: 200 }}>
                <Link to="/shop" style={{ display: 'block', padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#111827', textDecoration: 'none' }}>All Products</Link>
                <div style={{ height: 1, background: '#f9fafb', margin: '4px 0' }} />
                {cats.map(c => (
                  <Link key={c.slug} to={`/shop?category=${c.slug}`} style={{ display: 'block', padding: '7px 16px', fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>{c.label}</Link>
                ))}
              </div>
            </div>

            <Link to="/shop?featured=true" style={{ fontSize: 13, fontWeight: 500, color: '#374151', textDecoration: 'none' }}>New Arrivals</Link>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button onClick={() => setSearchOpen(s => !s)} style={iconBtn}><Search size={18} /></button>

            {user ? (
              <>
                <Link to="/wishlist" style={{ ...iconBtn }}>
                  <Heart size={18} />
                  {wishlistCount > 0 && <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{wishlistCount > 9 ? '9+' : wishlistCount}</span>}
                </Link>
                <Link to="/cart" style={{ ...iconBtn }}>
                  <ShoppingCart size={18} />
                  {cartCount > 0 && <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, background: '#f97316', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{cartCount > 9 ? '9+' : cartCount}</span>}
                </Link>

                <div ref={dropRef} style={{ position: 'relative', marginLeft: 4 }}>
                  <button onClick={() => setDropOpen(d => !d)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8 }}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fed7aa' }} />
                      : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{user.name?.[0]?.toUpperCase()}</div>
                    }
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: window.innerWidth < 640 ? 'none' : 'block' }}>{user.name?.split(' ')[0]}</span>
                    <ChevronDown size={12} style={{ color: '#9ca3af' }} />
                  </button>

                  {dropOpen && (
                    <div className="fade-in" style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, width: 200, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #f3f4f6', overflow: 'hidden', zIndex: 200 }}>
                      <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, textTransform: 'capitalize' }}>{user.role}</div>
                      </div>
                      {[{ to: '/profile', icon: User, label: 'My Profile' }, { to: '/orders', icon: Package, label: 'My Orders' }, { to: '/wishlist', icon: Heart, label: 'Wishlist' }].map(({ to, icon: Icon, label }) => (
                        <Link key={to} to={to} onClick={() => setDropOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', fontSize: 13, color: '#374151', textDecoration: 'none' }}><Icon size={14} style={{ color: '#9ca3af' }} />{label}</Link>
                      ))}
                      {user.role === 'admin' && (
                        <Link to="/admin" onClick={() => setDropOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', fontSize: 13, color: '#f97316', fontWeight: 600, textDecoration: 'none' }}><LayoutDashboard size={14} />Admin Panel</Link>
                      )}
                      <div style={{ height: 1, background: '#f3f4f6' }} />
                      <button onClick={() => { logout(); navigate('/'); setDropOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', fontSize: 13, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={14} />Sign Out</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }} className="hide-mobile-flex">
                <Link to="/login" style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#374151', textDecoration: 'none', borderRadius: 8 }}>Login</Link>
                <Link to="/register" className="btn-orange" style={{ padding: '8px 16px', fontSize: 13, borderRadius: 8 }}>Register</Link>
              </div>
            )}

            {/* Hamburger - mobile only */}
            <button onClick={() => setMenuOpen(m => !m)} className="hide-desktop" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, color: '#374151', marginLeft: 4 }}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="fade-in" style={{ borderTop: '1px solid #f3f4f6', background: '#fff', padding: '12px 16px' }}>
            <form onSubmit={handleSearch} style={{ maxWidth: 480, margin: '0 auto', display: 'flex', gap: 8 }}>
              <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search T-Shirts, Jeans, Jackets..."
                style={{ flex: 1, padding: '9px 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 10, outline: 'none', fontFamily: 'inherit' }} />
              <button type="submit" className="btn-orange" style={{ padding: '9px 18px', fontSize: 13, borderRadius: 10 }}>Search</button>
            </form>
          </div>
        )}

        {/* Mobile menu */}
        {menuOpen && (
          <div className="fade-in" style={{ borderTop: '1px solid #f3f4f6', background: '#fff' }}>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[['/', 'Home'], ['/shop', 'All Products'], ['/shop?featured=true', 'New Arrivals']].map(([to, label]) => (
                <Link key={to} to={to} style={{ display: 'block', padding: '10px 12px', fontSize: 14, fontWeight: 500, color: '#374151', textDecoration: 'none', borderRadius: 8 }}>{label}</Link>
              ))}
              <div style={{ paddingLeft: 12 }}>
                {cats.map(c => (
                  <Link key={c.slug} to={`/shop?category=${c.slug}`} style={{ display: 'block', padding: '8px 12px', fontSize: 13, color: '#6b7280', textDecoration: 'none', borderRadius: 8 }}>{c.label}</Link>
                ))}
              </div>
              <div style={{ height: 1, background: '#f3f4f6', margin: '8px 0' }} />
              {user ? (
                <>
                  <Link to="/cart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', fontSize: 14, color: '#374151', textDecoration: 'none', borderRadius: 8 }}>
                    <span>Cart</span>
                    {cartCount > 0 && <span style={{ background: '#f97316', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>{cartCount}</span>}
                  </Link>
                  <Link to="/wishlist" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', fontSize: 14, color: '#374151', textDecoration: 'none', borderRadius: 8 }}>
                    <span>Wishlist</span>
                    {wishlistCount > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>{wishlistCount}</span>}
                  </Link>
                  <Link to="/orders" style={{ display: 'block', padding: '10px 12px', fontSize: 14, color: '#374151', textDecoration: 'none', borderRadius: 8 }}>My Orders</Link>
                  <Link to="/profile" style={{ display: 'block', padding: '10px 12px', fontSize: 14, color: '#374151', textDecoration: 'none', borderRadius: 8 }}>Profile</Link>
                  {user.role === 'admin' && <Link to="/admin" style={{ display: 'block', padding: '10px 12px', fontSize: 14, color: '#f97316', fontWeight: 600, textDecoration: 'none', borderRadius: 8 }}>Admin Panel</Link>}
                  <button onClick={() => { logout(); navigate('/'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', fontSize: 14, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8 }}>Sign Out</button>
                </>
              ) : (
                <div style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
                  <Link to="/login" style={{ flex: 1, textAlign: 'center', padding: '10px', fontSize: 14, fontWeight: 600, color: '#374151', textDecoration: 'none', border: '1.5px solid #e5e7eb', borderRadius: 10 }}>Login</Link>
                  <Link to="/register" className="btn-orange" style={{ flex: 1, textAlign: 'center', padding: '10px', fontSize: 14, borderRadius: 10 }}>Register</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
