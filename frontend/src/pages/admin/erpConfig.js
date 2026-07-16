export const ADMIN_ACCESS_ROLES = [
  'admin',
  'super_admin',
  'business_owner',
  'store_admin',
  'store_manager',
  'cashier',
  'warehouse_manager',
  'accountant',
  'employee',
];

export const ERP_NAV_GROUPS = [
  {
    key: 'retail-erp',
    label: 'Retail ERP',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', componentKey: 'dashboard', permissions: ['erp.view_dashboard'], description: 'Unified enterprise dashboard with tenant-aware KPIs and live activity.' },
      { key: 'erp', label: 'Retail ERP', icon: 'Cpu', componentKey: 'erp', permissions: ['erp.view_dashboard'], description: 'ERP command center for business, store, and tenant context.' },
      { key: 'pos', label: 'POS Billing', icon: 'ScanLine', componentKey: 'pos', permissions: ['erp.manage_pos', 'erp.manage_orders', 'erp.manage_finance'], description: 'Fast billing workspace for barcode, split payments, hold bills, and invoicing.' },
      { key: 'inventory', label: 'Inventory', icon: 'Boxes', componentKey: 'inventory', permissions: ['erp.manage_inventory'], description: 'Stock, batch, serial, movement history, and reorder control.' },
      { key: 'products', label: 'Products', icon: 'Package', componentKey: 'products', permissions: ['erp.manage_inventory'], description: 'Product catalog, pricing, variants, and merchandising controls.' },
      { key: 'categories', label: 'Categories', icon: 'FolderOpen', componentKey: 'categories', permissions: ['erp.manage_inventory'], description: 'Category hierarchy and product grouping controls.' },
      { key: 'brands', label: 'Brands', icon: 'BadgePercent', permissions: ['erp.manage_inventory'], description: 'Brand master data and merchandising segmentation.' },
      { key: 'customers', label: 'Customers', icon: 'UsersRound', permissions: ['erp.manage_orders', 'erp.manage_users'], description: 'Customer CRM, loyalty, credits, and purchase history.' },
      { key: 'suppliers', label: 'Suppliers', icon: 'Truck', permissions: ['erp.manage_suppliers'], description: 'Supplier profiles, ledgers, and procurement relationships.' },
      { key: 'purchases', label: 'Purchases', icon: 'ShoppingCart', permissions: ['erp.manage_suppliers'], description: 'Purchase orders, GRN, returns, freight, and allocations.' },
      { key: 'sales', label: 'Sales', icon: 'ReceiptText', componentKey: 'sales', permissions: ['erp.manage_orders'], description: 'Sales orders, invoices, payment state, and downstream fulfillment.' },
      { key: 'returns', label: 'Returns', icon: 'Undo2', permissions: ['erp.manage_orders'], description: 'Returns, exchanges, credit notes, and cancellation workflows.' },
      { key: 'warehouse', label: 'Warehouse', icon: 'Warehouse', componentKey: 'warehouse', permissions: ['erp.manage_warehouse', 'erp.manage_inventory'], description: 'Warehouses, transfers, rack management, and stock counting.' },
      { key: 'reports', label: 'Reports', icon: 'BarChart3', componentKey: 'reports', permissions: ['erp.view_reports'], description: 'Operational and financial reporting with export-ready views.' },
      { key: 'employees', label: 'Employees', icon: 'BriefcaseBusiness', permissions: ['erp.manage_users'], description: 'Employee master records, assignments, and access mapping.' },
      { key: 'attendance', label: 'Attendance', icon: 'CalendarClock', permissions: ['erp.manage_users'], description: 'Attendance capture, shift visibility, and workforce summaries.' },
      { key: 'payroll', label: 'Payroll', icon: 'DollarSign', permissions: ['erp.manage_users'], description: 'Employee payroll, salary processing, and payment tracking.' },
      { key: 'expenses', label: 'Expenses', icon: 'Wallet', permissions: ['erp.manage_finance'], description: 'Expense capture, approvals, and business cost tracking.' },
      { key: 'notifications', label: 'Notifications', icon: 'Bell', componentKey: 'notifications', permissions: ['erp.manage_notifications'], description: 'Push campaigns, alerts, and internal communications.' },
      { key: 'settings', label: 'Settings', icon: 'Settings', componentKey: 'settings', permissions: ['erp.manage_settings'], description: 'Core ERP behavior, taxes, invoice, printers, and integration settings.' },
      { key: 'business-settings', label: 'Business Settings', icon: 'Building2', componentKey: 'settings', permissions: ['erp.manage_settings'], description: 'Business-level branding, GST, financial year, and local configuration.' },
      { key: 'store-management', label: 'Store Management', icon: 'Store', permissions: ['erp.manage_settings'], description: 'Store setup, mapping, and branch-level operational settings.' },
      { key: 'user-management', label: 'User Management', icon: 'ShieldCheck', componentKey: 'user-management', permissions: ['erp.manage_users'], description: 'Users, employees, and operational account administration.' },
      { key: 'role-management', label: 'Role Management', icon: 'KeyRound', roles: ['super_admin', 'business_owner', 'store_admin'], description: 'Role templates and permission assignments across the ERP.' },
      { key: 'audit-logs', label: 'Audit Logs', icon: 'FileClock', componentKey: 'audit-logs', permissions: ['erp.view_audit_logs'], description: 'Immutable activity tracking for admin, ERP, and stock events.' },
      { key: 'barcode-engine', label: 'Barcode Engine', icon: 'ScanLine', componentKey: 'barcode-engine', permissions: ['erp.manage_inventory'], description: 'Generate EAN13/Code128 barcodes and print 50×25mm product labels.' },
      { key: 'invoice-designer', label: 'Invoice Designer', icon: 'Layout', componentKey: 'invoice-designer', permissions: ['erp.manage_settings'], description: 'Design invoice layout for thermal and A4 printing with live preview.' },
      { key: 'super-admin', label: 'Super Admin', icon: 'Crown', roles: ['super_admin'], description: 'Global businesses, stores, warehouses, and platform-wide controls.' },
    ],
  },
  {
    key: 'commerce-admin',
    label: 'Commerce Admin',
    items: [
      { key: 'homepage', label: 'Homepage', icon: 'Layout', componentKey: 'homepage', roles: ['admin', 'super_admin'], description: 'Current storefront layout, banners, and content controls.' },
      { key: 'delivery', label: 'Delivery', icon: 'MapPinned', componentKey: 'delivery', roles: ['admin', 'super_admin'], description: 'Shipment flow, delivery status, and logistics coordination.' },
      { key: 'queries', label: 'Queries', icon: 'MessageSquare', componentKey: 'queries', roles: ['admin', 'super_admin'], description: 'Customer support queue and issue tracking.' },
      { key: 'reviews', label: 'Reviews', icon: 'Star', componentKey: 'reviews', roles: ['admin', 'super_admin'], description: 'Review moderation and product feedback visibility.' },
      { key: 'coupons', label: 'Coupons', icon: 'Tag', componentKey: 'coupons', roles: ['admin', 'super_admin'], description: 'Coupon lifecycle and promotional management.' },
      { key: 'cloud', label: 'Cloud Vault', icon: 'Cloud', componentKey: 'cloud', roles: ['admin', 'super_admin'], description: 'Admin media vault and secure cloud asset controls.' },
    ],
  },
  {
    key: 'internal-communications',
    label: 'Internal Communications',
    items: [
      { key: 'chat-support', label: 'Chat Support', icon: 'MessageSquare', componentKey: 'chat-support', roles: ['admin','super_admin','business_owner','store_admin','store_manager','cashier','warehouse_manager','accountant','employee'], description: 'Internal chat for admin and employee collaboration.' },
      { key: 'private-chat', label: 'Private Messages', icon: 'MessageCircle', componentKey: 'private-chat', roles: ['admin','super_admin','business_owner','store_admin','store_manager','cashier','warehouse_manager','accountant','employee'], description: 'Search users by email or phone and exchange private messages.' },
      { key: 'video-calls', label: 'Video Calls', icon: 'Video', componentKey: 'video-calls', roles: ['admin','super_admin','business_owner','store_admin','store_manager','cashier','warehouse_manager','accountant','employee'], description: 'Launch or join internal video meetings for the team.' },
      { key: 'voice-calls', label: 'Voice Calls', icon: 'Phone', componentKey: 'voice-calls', roles: ['admin','super_admin','business_owner','store_admin','store_manager','cashier','warehouse_manager','accountant','employee'], description: 'Internal voice call panel for admin and employee communications.' },
      { key: 'conversations', label: 'Conversation Monitor', icon: 'Eye', componentKey: 'conversations', roles: ['admin','super_admin','business_owner','store_admin','store_manager','cashier','warehouse_manager','accountant'], description: 'View any private conversation for security and auditing purposes.' },
    ],
  },
];

export const ADMIN_ROUTE_ALIASES = {
  overview: 'dashboard',
  orders: 'sales',
  'sales-orders': 'sales',
  users: 'user-management',
};

export const ERP_MODULE_MAP = Object.fromEntries(
  ERP_NAV_GROUPS.flatMap((group) => group.items).map((item) => [item.key, item])
);

export const canAccessModule = (user, module) => {
  if (!user || !module) return false;

  // super_admin and admin get full access to everything
  if (user.role === 'super_admin' || user.role === 'admin') return true;

  // Role-restricted items (e.g. super-admin panel)
  if (module.roles?.length) {
    return module.roles.includes(user.role);
  }

  // Permission-restricted items
  if (!module.permissions?.length) {
    return true; // no restrictions = visible to all authenticated admin roles
  }

  const userPermissions = user.permissions || [];
  return module.permissions.some((permission) => userPermissions.includes(permission));
};

export const getVisibleNavGroups = (user) => {
  // If no user yet, return empty
  if (!user) return [];

  // admin and super_admin see everything
  if (user.role === 'admin' || user.role === 'super_admin') {
    return ERP_NAV_GROUPS;
  }

  return ERP_NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessModule(user, item)),
    }))
    .filter((group) => group.items.length > 0);
};
