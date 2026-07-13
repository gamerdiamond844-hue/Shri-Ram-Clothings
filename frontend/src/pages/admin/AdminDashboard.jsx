import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BadgePercent,
  BarChart3,
  Bell,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Cloud,
  Cpu,
  Crown,
  FileClock,
  FolderOpen,
  KeyRound,
  Layout,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  MessageSquare,
  Package,
  ReceiptText,
  ScanLine,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Truck,
  Undo2,
  UsersRound,
  Wallet,
  Warehouse,
} from 'lucide-react';
import api from '../../utils/api';
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
import AdminReviews from './AdminReviews';
import AdminCloudStorage from './AdminCloudStorage';
import AdminErp from './AdminErp';
import AdminPos from './erp/AdminPos';
import AdminInventory from './erp/AdminInventory';
import AdminWarehouse from './erp/AdminWarehouse';
import AdminCustomers from './erp/AdminCustomers';
import AdminSuppliers from './erp/AdminSuppliers';
import AdminPurchases from './erp/AdminPurchases';
import AdminReturns from './erp/AdminReturns';
import AdminReports from './erp/AdminReports';
import AdminEmployees from './erp/AdminEmployees';
import AdminAttendance from './erp/AdminAttendance';
import AdminExpenses from './erp/AdminExpenses';
import AdminAuditLogs from './erp/AdminAuditLogs';
import BarcodeEngine from './erp/BarcodeEngine';
import AdminSalesOrders from './erp/AdminSalesOrders';
import AdminModuleWorkspace from './AdminModuleWorkspace';
import { ADMIN_ROUTE_ALIASES, ERP_MODULE_MAP, getVisibleNavGroups, canAccessModule } from './erpConfig';

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const iconMap = {
  LayoutDashboard,
  Cpu,
  ScanLine,
  Boxes,
  Package,
  FolderOpen,
  BadgePercent,
  UsersRound,
  Truck,
  ShoppingCart,
  ReceiptText,
  Undo2,
  Warehouse,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  Wallet,
  Bell,
  Settings,
  Building2,
  Store,
  ShieldCheck,
  KeyRound,
  FileClock,
  Crown,
  Layout,
  MapPinned,
  MessageSquare,
  Star,
  Tag,
  Cloud,
};

const cardStyle = {
  background: '#111827',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 16,
  padding: 14,
  display: 'grid',
  gap: 4,
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [section, setSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cloudMetrics, setCloudMetrics] = useState(null);
  const [erpBootstrap, setErpBootstrap] = useState(null);

  const visibleGroups = useMemo(() => getVisibleNavGroups(user), [user]);
  const visibleItems = useMemo(() => visibleGroups.flatMap((group) => group.items), [visibleGroups]);
  const defaultSection = visibleItems.find((item) => item.key === 'dashboard')?.key || visibleItems[0]?.key || 'dashboard';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderSection = (currentSection) => {
    const module = ERP_MODULE_MAP[currentSection];
    const componentKey = module?.componentKey || currentSection;

    switch (componentKey) {
      case 'dashboard':
        return <AdminOverview onOpenCloud={() => navigate('/admin/cloud')} />;
      case 'erp':
        return <AdminErp />;
      case 'pos':
        return <AdminPos />;
      case 'inventory':
        return <AdminInventory />;
      case 'warehouse':
        return <AdminWarehouse />;
      case 'customers':
        return <AdminCustomers />;
      case 'suppliers':
        return <AdminSuppliers />;
      case 'purchases':
        return <AdminPurchases />;
      case 'returns':
        return <AdminReturns />;
      case 'reports':
        return <AdminReports />;
      case 'employees':
        return <AdminEmployees />;
      case 'attendance':
        return <AdminAttendance />;
      case 'expenses':
        return <AdminExpenses />;
      case 'audit-logs':
        return <AdminAuditLogs />;
      case 'barcode-engine':
        return <BarcodeEngine />;
      case 'sales-orders':
        return <AdminSalesOrders />;
      case 'homepage':
        return <AdminHomepage />;
      case 'products':
        return <AdminProducts />;
      case 'sales':
        return <AdminOrders />;
      case 'delivery':
        return <AdminDelivery />;
      case 'cloud':
        return <AdminCloudStorage />;
      case 'reviews':
        return <AdminReviews />;
      case 'user-management':
        return <AdminUsers />;
      case 'queries':
        return <AdminQueries />;
      case 'notifications':
        return <AdminNotifications />;
      case 'categories':
        return <AdminCategories />;
      case 'coupons':
        return <AdminCoupons />;
      default:
        return <AdminModuleWorkspace module={module} user={user} />;
    }
  };

  useEffect(() => {
    if (!user) return;

    Promise.allSettled([
      api.get('/admin/cloud/analytics'),
      api.get('/erp/bootstrap'),
    ]).then(([cloudResult, erpResult]) => {
      setCloudMetrics(cloudResult.status === 'fulfilled' ? cloudResult.value.data : null);
      setErpBootstrap(erpResult.status === 'fulfilled' ? erpResult.value.data : null);
    });
  }, [user]);

  useEffect(() => {
    const rawPath = location.pathname.replace(/^\/admin\/?/, '');
    const candidate = rawPath.split('/')[0] || 'dashboard';
    const normalized = ADMIN_ROUTE_ALIASES[candidate] || candidate;
    const targetModule = ERP_MODULE_MAP[normalized];

    if (!targetModule || !canAccessModule(user, targetModule)) {
      const fallbackPath = defaultSection === 'dashboard' ? '/admin/dashboard' : `/admin/${defaultSection}`;
      if (location.pathname !== fallbackPath) {
        navigate(fallbackPath, { replace: true });
      }
      setSection(defaultSection);
      return;
    }

    setSection(normalized);
  }, [defaultSection, location.pathname, navigate, user]);

  const activeNav = ERP_MODULE_MAP[section] || ERP_MODULE_MAP[defaultSection] || { label: 'Dashboard', description: 'Admin workspace' };
  const activeSection = renderSection(section);

  const Sidebar = () => (
    <aside
      style={{
        width: 290,
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
      }}
    >
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.jpg" alt="SR" style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>Shri Ram Clothings</div>
            <div style={{ color: '#f97316', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>Integrated ERP Admin</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', display: 'grid', gap: 14 }}>
        {visibleGroups.map((group) => (
          <div key={group.key} style={{ display: 'grid', gap: 4 }}>
            <div style={{ padding: '0 10px 6px', fontSize: 10, color: '#64748b', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
              {group.label}
            </div>
            {group.items.map(({ key, label, icon }) => {
              const Icon = iconMap[icon] || LayoutDashboard;
              const isActive = section === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    navigate(key === 'dashboard' ? '/admin/dashboard' : `/admin/${key}`);
                    setSidebarOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'left',
                    width: '100%',
                    background: isActive ? '#f97316' : 'transparent',
                    color: isActive ? '#fff' : '#cbd5e1',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#cbd5e1';
                    }
                  }}
                >
                  <Icon size={17} />
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: '10px 12px 0', display: 'grid', gap: 10 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>ERP scope</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{visibleItems.length}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Visible modules for this signed-in role</div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Revenue 30d</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
            ₹{Number(erpBootstrap?.summary?.revenue_30d || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {erpBootstrap?.summary?.orders_30d || 0} orders in the last 30 days
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Cloud usage</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{cloudMetrics ? formatBytes(cloudMetrics.total_bytes) : 'Loading...'}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{cloudMetrics ? `${cloudMetrics.total_files} files stored` : 'Secure admin vault'}</div>
        </div>
      </div>

      <div style={{ padding: '12px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', marginBottom: 4 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'rgba(249,115,22,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f97316',
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{String(user?.role || 'user').replace(/_/g, ' ')}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '9px 14px',
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: '#f87171',
            background: 'transparent',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8fafc' }}>
      <div className="hidden lg:flex" style={{ height: '100vh', position: 'sticky', top: 0 }}>
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.66)' }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: 'relative', zIndex: 51, height: '100%' }}>
            <Sidebar />
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <header
          style={{
            background: '#fff',
            borderBottom: '1px solid #e5e7eb',
            padding: '0 20px',
            minHeight: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #e5e7eb', cursor: 'pointer', borderRadius: 10, color: '#374151' }}
            >
              <Menu size={20} />
            </button>

            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>{activeNav.label}</h1>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280', maxWidth: 720 }}>
                {activeNav.description || 'Integrated admin workspace inside the same website and authentication system.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'grid', justifyItems: 'end' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{erpBootstrap?.tenant?.business_name || 'Shri Ram Clothings'}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {erpBootstrap?.tenant?.store_name || 'Main admin workspace'}
              </div>
            </div>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {activeSection}
        </main>
      </div>
    </div>
  );
}
