import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Tag, FolderOpen, LogOut, Menu, X, Layout, MessageSquare, Bell, Users, Truck } from 'lucide-react';
import AdminOverview from './AdminOverview';
import AdminProducts from './AdminProducts';
import AdminOrders from './AdminOrders';
import AdminDelivery from './AdminDelivery';
import AdminCoupons from './AdminCoupons';
import AdminCategories from './AdminCategories';
import AdminHomepage from './AdminHomepage';
import AdminQueries from './AdminQueries';
import AdminNotifications from './AdminNotifications';
import AdminUsers from './AdminUsers';

const NAV = [
  { key: 'overview',       label: 'Overview',       icon: LayoutDashboard },
  { key: 'homepage',       label: 'Homepage',       icon: Layout },
  { key: 'products',       label: 'Products',       icon: Package },
  { key: 'orders',         label: 'Orders',         icon: ShoppingBag },
  { key: 'delivery',       label: 'Delivery',       icon: Truck },
  { key: 'users',          label: 'Users',          icon: Users },
  { key: 'queries',        label: 'Queries',        icon: MessageSquare },
  { key: 'notifications',  label: 'Notifications',  icon: Bell },
  { key: 'categories',     label: 'Categories',     icon: FolderOpen },
  { key: 'coupons',        label: 'Coupons',        icon: Tag },
];

const SECTIONS = {
  overview:      <AdminOverview />,
  homepage:      <AdminHomepage />,
  products:      <AdminProducts />,
  orders:        <AdminOrders />,
  delivery:      <AdminDelivery />,
  users:         <AdminUsers />,
  queries:       <AdminQueries />,
  notifications: <AdminNotifications />,
  categories:    <AdminCategories />,
  coupons:       <AdminCoupons />,
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  const Sidebar = () => (
    <aside style={{
      width: 240, background: '#111827', display: 'flex', flexDirection: 'column',
      height: '100%', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.jpg" alt="SR" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Shri Ram</div>
            <div style={{ color: '#f97316', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 1 }}>Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ key, label, icon: Icon }) => (
          <button key={key}
            onClick={() => { setSection(key); setSidebarOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, textAlign: 'left', width: '100%',
              background: section === key ? '#f97316' : 'transparent',
              color: section === key ? '#fff' : '#9ca3af',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (section !== key) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; } }}
            onMouseLeave={e => { if (section !== key) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; } }}>
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '12px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Administrator</div>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, color: '#f87171', background: 'transparent', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f9fafb' }}>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex" style={{ height: '100vh', position: 'sticky', top: 0 }}>
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: 'relative', zIndex: 51, height: '100%' }}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          background: '#fff', borderBottom: '1px solid #f3f4f6',
          padding: '0 20px', height: 56, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, color: '#374151' }}>
              <Menu size={20} />
            </button>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>{section}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 12, color: '#9ca3af' }} className="hidden sm:inline">Shri Ram Clothings</span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {SECTIONS[section]}
        </main>
      </div>
    </div>
  );
}
