# Design Document

## Overview

This document describes the technical design for transforming the existing Shri Ram Clothings Admin Dashboard at `/admin/*` into a complete Enterprise Retail ERP. All modules are native React components inside the existing React + Vite + Express.js + PostgreSQL application. No new framework, ORM, or separate service is introduced.

## Architecture

```
Browser (React 19 + React Router v7 + Tailwind CSS v4)
  └── /admin/* → AdminDashboard shell
       ├── Sidebar (erpConfig.js nav groups, RBAC-filtered)
       ├── Header (breadcrumb, tenant name, online indicator)
       └── <main> → renderSection(section) → ERP module component
            ├── /admin/dashboard   → AdminOverview (enhanced)
            ├── /admin/pos         → AdminPos (new)
            ├── /admin/inventory   → AdminInventory (new)
            ├── /admin/warehouse   → AdminWarehouse (new)
            ├── /admin/customers   → AdminCustomers (new)
            ├── /admin/suppliers   → AdminSuppliers (new)
            ├── /admin/purchases   → AdminPurchases (new)
            ├── /admin/returns     → AdminReturns (new)
            ├── /admin/reports     → AdminReports (new)
            ├── /admin/employees   → AdminEmployees (new)
            ├── /admin/attendance  → AdminAttendance (new)
            ├── /admin/expenses    → AdminExpenses (new)
            ├── /admin/settings    → AdminSettings (new)
            ├── /admin/role-management → AdminRoleManagement (new)
            ├── /admin/super-admin → AdminSuperAdmin (new)
            └── ... (existing: products, sales, delivery, etc.)

Express.js API (existing + new routes)
  └── /api/erp/*
       ├── /pos/*         (new)
       ├── /inventory/*   (new)
       ├── /customers/*   (new)
       ├── /suppliers/*   (new)
       ├── /purchases/*   (new)
       ├── /returns/*     (new)
       ├── /reports/*     (new)
       ├── /employees/*   (new)
       ├── /attendance/*  (new)
       ├── /expenses/*    (new)
       ├── /settings/*    (new)
       └── existing: /dashboard, /bootstrap, /pos/overview, etc.

PostgreSQL (Neon) — existing pool from config/db.js
```

## Frontend Architecture

### File Structure (New Files Only)

```
frontend/src/pages/admin/erp/
  AdminPos.jsx              — POS billing terminal
  AdminInventory.jsx        — Inventory management + stock movements
  AdminWarehouse.jsx        — Warehouse list + transfers + movements
  AdminCustomers.jsx        — Customer CRM
  AdminSuppliers.jsx        — Supplier management
  AdminPurchases.jsx        — Purchase orders + GRN
  AdminReturns.jsx          — Returns + exchanges
  AdminReports.jsx          — 100+ reports + export
  AdminEmployees.jsx        — Employee master
  AdminAttendance.jsx       — Attendance tracking
  AdminExpenses.jsx         — Expense tracking
  AdminSettings.jsx         — Business/ERP settings
  AdminRoleManagement.jsx   — Role + permission management
  AdminSuperAdmin.jsx       — Super admin panel
  BarcodeEngine.jsx         — Barcode/SKU generator + label printer
  InvoiceDesigner.jsx       — Invoice layout designer
  InvoicePrint.jsx          — Print-ready invoice renderer

backend/controllers/
  posController.js          — POS sale create, hold, resume
  inventoryController.js    — Inventory CRUD + movements + import/export
  customerErpController.js  — Customer CRM CRUD + statement
  supplierController.js     — Supplier CRUD + ledger
  purchaseController.js     — PO + GRN + purchase returns
  returnController.js       — Sales returns + exchanges
  reportController.js       — Report queries + Excel export
  employeeController.js     — Employee CRUD
  attendanceController.js   — Attendance CRUD + export
  expenseController.js      — Expense CRUD + export
  erpSettingsController.js  — Settings read/write
  roleController.js         — Role + permission management
  superAdminController.js   — Businesses/stores/warehouses CRUD

backend/routes/
  pos.js          → mounted at /api/erp/pos
  inventory.js    → mounted at /api/erp/inventory
  customers.js    → mounted at /api/erp/customers
  suppliers.js    → mounted at /api/erp/suppliers
  purchases.js    → mounted at /api/erp/purchases
  returns.js      → mounted at /api/erp/returns
  reports.js      → mounted at /api/erp/reports
  employees.js    → mounted at /api/erp/employees
  attendance.js   → mounted at /api/erp/attendance
  expenses.js     → mounted at /api/erp/expenses
  erpSettings.js  → mounted at /api/erp/settings (extend existing)
  roles.js        → mounted at /api/erp/roles
  superAdmin.js   → mounted at /api/erp/super-admin
```

### Component Conventions

- Every new ERP component follows the same pattern as `AdminProducts.jsx`:
  - `useState` + `useCallback` + `useEffect` for data fetching
  - `api.get/post/put/delete` from `../../utils/api` (existing axios instance)
  - `toast.success/error` from `react-hot-toast`
  - Inline styles matching the existing admin palette (`#111827`, `#f97316`, `#f9fafb`, etc.)
  - No new npm packages for UI — Tailwind utility classes and inline styles only
  - Lucide icons from `lucide-react`

### erpConfig.js Extension

The existing `erpConfig.js` `ERP_NAV_GROUPS` already lists all modules. The `AdminDashboard.jsx` `renderSection` switch will be extended with a `case` for each new `componentKey` pointing to the new components via React `lazy`:

```js
// AdminDashboard.jsx renderSection additions (lazy imports at top)
case 'pos':           return <AdminPos />;
case 'inventory':     return <AdminInventory />;
case 'warehouse':     return <AdminWarehouse />;
case 'customers':     return <AdminCustomers />;
case 'suppliers':     return <AdminSuppliers />;
case 'purchases':     return <AdminPurchases />;
case 'returns':       return <AdminReturns />;
case 'reports':       return <AdminReports />;
case 'employees':     return <AdminEmployees />;
case 'attendance':    return <AdminAttendance />;
case 'expenses':      return <AdminExpenses />;
case 'settings':      return <AdminSettings />;
case 'role-management': return <AdminRoleManagement />;
case 'super-admin':   return <AdminSuperAdmin />;
```

## Database Design

### New Tables (created idempotently in `initDB`)

#### `src_erp_suppliers`
```sql
CREATE TABLE IF NOT EXISTS src_erp_suppliers (
  id            SERIAL PRIMARY KEY,
  business_id   INTEGER REFERENCES src_businesses(id),
  supplier_code TEXT UNIQUE,
  name          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  gst_number    TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  pincode       TEXT,
  payment_terms INTEGER DEFAULT 30,  -- days
  balance_due   NUMERIC(12,2) DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### `src_erp_purchase_orders`
```sql
CREATE TABLE IF NOT EXISTS src_erp_purchase_orders (
  id              SERIAL PRIMARY KEY,
  business_id     INTEGER REFERENCES src_businesses(id),
  po_number       TEXT UNIQUE NOT NULL,
  supplier_id     INTEGER REFERENCES src_erp_suppliers(id),
  status          TEXT DEFAULT 'draft',  -- draft, ordered, partial, received, cancelled
  expected_date   DATE,
  freight_amount  NUMERIC(10,2) DEFAULT 0,
  subtotal        NUMERIC(12,2) DEFAULT 0,
  tax_amount      NUMERIC(10,2) DEFAULT 0,
  total           NUMERIC(12,2) DEFAULT 0,
  notes           TEXT,
  created_by      INTEGER REFERENCES src_users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `src_erp_purchase_items`
```sql
CREATE TABLE IF NOT EXISTS src_erp_purchase_items (
  id                  SERIAL PRIMARY KEY,
  purchase_order_id   INTEGER REFERENCES src_erp_purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id   INTEGER REFERENCES src_erp_inventory_items(id),
  title               TEXT,
  quantity_ordered    INTEGER NOT NULL,
  quantity_received   INTEGER DEFAULT 0,
  unit_cost           NUMERIC(10,2) NOT NULL,
  hsn_code            TEXT,
  gst_rate            NUMERIC(5,2) DEFAULT 0,
  line_total          NUMERIC(12,2),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

#### `src_erp_returns`
```sql
CREATE TABLE IF NOT EXISTS src_erp_returns (
  id              SERIAL PRIMARY KEY,
  business_id     INTEGER REFERENCES src_businesses(id),
  return_no       TEXT UNIQUE NOT NULL,
  original_sale_id INTEGER REFERENCES src_erp_sales(id),
  return_type     TEXT DEFAULT 'refund',  -- refund, store_credit, exchange
  status          TEXT DEFAULT 'pending', -- pending, completed, cancelled
  total_amount    NUMERIC(12,2) DEFAULT 0,
  notes           TEXT,
  processed_by    INTEGER REFERENCES src_users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `src_erp_return_items`
```sql
CREATE TABLE IF NOT EXISTS src_erp_return_items (
  id                  SERIAL PRIMARY KEY,
  return_id           INTEGER REFERENCES src_erp_returns(id) ON DELETE CASCADE,
  sale_item_id        INTEGER REFERENCES src_erp_sale_items(id),
  inventory_item_id   INTEGER REFERENCES src_erp_inventory_items(id),
  title               TEXT,
  quantity            INTEGER NOT NULL,
  unit_price          NUMERIC(10,2),
  line_total          NUMERIC(12,2),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

#### `src_erp_attendance`
```sql
CREATE TABLE IF NOT EXISTS src_erp_attendance (
  id              SERIAL PRIMARY KEY,
  business_id     INTEGER REFERENCES src_businesses(id),
  employee_id     INTEGER REFERENCES src_users(id),
  attendance_date DATE NOT NULL,
  status          TEXT DEFAULT 'present',  -- present, absent, half_day, leave
  check_in        TIME,
  check_out       TIME,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, attendance_date)
);
```

### Existing Tables Extended

#### `src_erp_inventory_items` — Add columns if not present
```sql
ALTER TABLE src_erp_inventory_items
  ADD COLUMN IF NOT EXISTS hsn_code       TEXT,
  ADD COLUMN IF NOT EXISTS gst_rate       NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variant_color  TEXT,
  ADD COLUMN IF NOT EXISTS variant_size   TEXT,
  ADD COLUMN IF NOT EXISTS supplier_id    INTEGER REFERENCES src_erp_suppliers(id),
  ADD COLUMN IF NOT EXISTS rack_code      TEXT,
  ADD COLUMN IF NOT EXISTS shelf_code     TEXT,
  ADD COLUMN IF NOT EXISTS expiry_date    DATE,
  ADD COLUMN IF NOT EXISTS is_active      BOOLEAN DEFAULT TRUE;
```

#### `src_erp_sales` — Add columns if not present
```sql
ALTER TABLE src_erp_sales
  ADD COLUMN IF NOT EXISTS split_payment  JSONB,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code    TEXT,
  ADD COLUMN IF NOT EXISTS notes          TEXT,
  ADD COLUMN IF NOT EXISTS cashier_id     INTEGER REFERENCES src_users(id);
```

#### `src_erp_customers` — Add columns if not present
```sql
ALTER TABLE src_erp_customers
  ADD COLUMN IF NOT EXISTS gst_number     TEXT,
  ADD COLUMN IF NOT EXISTS address        TEXT,
  ADD COLUMN IF NOT EXISTS city           TEXT,
  ADD COLUMN IF NOT EXISTS state          TEXT,
  ADD COLUMN IF NOT EXISTS pincode        TEXT,
  ADD COLUMN IF NOT EXISTS membership     TEXT DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS notes          TEXT;
```

## API Design

### POS Module (`/api/erp/pos/*`)

| Method | Endpoint | Guard | Description |
|--------|----------|-------|-------------|
| GET | `/pos/overview` | posGuard | Dashboard metrics, recent sales, held bills |
| GET | `/pos/search` | posGuard | Search products by barcode/SKU/title |
| POST | `/pos/sale` | posGuard | Create completed sale + stock deduction |
| POST | `/pos/hold` | posGuard | Save cart as hold bill |
| GET | `/pos/holds` | posGuard | List held bills for business |
| POST | `/pos/holds/:holdCode/resume` | posGuard | Resume a held bill (returns cart data) |
| DELETE | `/pos/holds/:holdCode` | posGuard | Delete a held bill |

### Inventory Module (`/api/erp/inventory/*`)

| Method | Endpoint | Guard | Description |
|--------|----------|-------|-------------|
| GET | `/inventory/items` | inventoryGuard | Paginated list with filters |
| POST | `/inventory/items` | inventoryGuard | Create item + auto-SKU/barcode |
| PUT | `/inventory/items/:id` | inventoryGuard | Update item |
| DELETE | `/inventory/items/:id` | inventoryGuard | Soft-delete (set is_active=false) |
| GET | `/inventory/items/:id/movements` | inventoryGuard | Full movement history |
| POST | `/inventory/adjust` | inventoryGuard | Manual stock adjustment |
| POST | `/inventory/import` | inventoryGuard | Bulk CSV/Excel import |
| GET | `/inventory/export` | inventoryGuard | Export to Excel |

### Customers Module (`/api/erp/customers/*`)

| Method | Endpoint | Guard | Description |
|--------|----------|-------|-------------|
| GET | `/customers` | customerGuard | Paginated list |
| POST | `/customers` | customerGuard | Create customer |
| PUT | `/customers/:id` | customerGuard | Update customer |
| GET | `/customers/:id/history` | customerGuard | Purchase history |
| POST | `/customers/:id/adjust` | customerGuard | Adjust loyalty/credit |
| GET | `/customers/export` | customerGuard | Export to Excel |

### Suppliers + Purchases (`/api/erp/suppliers/*`, `/api/erp/purchases/*`)

| Method | Endpoint | Guard | Description |
|--------|----------|-------|-------------|
| GET | `/suppliers` | supplierGuard | List suppliers |
| POST | `/suppliers` | supplierGuard | Create supplier |
| PUT | `/suppliers/:id` | supplierGuard | Update supplier |
| GET | `/suppliers/:id/ledger` | supplierGuard | Supplier ledger |
| GET | `/purchases` | purchaseGuard | List POs |
| POST | `/purchases` | purchaseGuard | Create PO |
| POST | `/purchases/:id/grn` | purchaseGuard | Record GRN + stock in |
| POST | `/purchases/:id/return` | purchaseGuard | Purchase return |

### Returns (`/api/erp/returns/*`)

| Method | Endpoint | Guard | Description |
|--------|----------|-------|-------------|
| POST | `/returns` | posGuard | Create return (refund/credit/exchange) |
| GET | `/returns` | posGuard | List returns |

### Reports (`/api/erp/reports/*`)

| Method | Endpoint | Guard | Description |
|--------|----------|-------|-------------|
| GET | `/reports/sales` | reportsGuard | Sales summary by date range |
| GET | `/reports/gst` | reportsGuard | GST summary by HSN code |
| GET | `/reports/profit` | reportsGuard | Profit estimate |
| GET | `/reports/inventory` | reportsGuard | Inventory valuation |
| GET | `/reports/customers` | reportsGuard | Customer report |
| GET | `/reports/export` | reportsGuard | Excel export of selected report |

### Employees + Attendance

| Method | Endpoint | Guard | Description |
|--------|----------|-------|-------------|
| GET | `/employees` | employeeGuard | List employees |
| POST | `/employees` | employeeGuard | Create employee user |
| PUT | `/employees/:id` | employeeGuard | Update employee |
| GET | `/attendance` | attendanceGuard | Monthly attendance grid |
| POST | `/attendance` | attendanceGuard | Mark/update attendance |
| GET | `/attendance/export` | attendanceGuard | Excel export |

### Expenses

| Method | Endpoint | Guard | Description |
|--------|----------|-------|-------------|
| GET | `/expenses` | expenseGuard | List expenses |
| POST | `/expenses` | expenseGuard | Create expense |
| PUT | `/expenses/:id` | expenseGuard | Update expense |
| DELETE | `/expenses/:id` | expenseGuard | Delete expense |
| GET | `/expenses/export` | expenseGuard | Excel export |

### Settings + Roles

| Method | Endpoint | Guard | Description |
|--------|----------|-------|-------------|
| GET | `/erp/settings` | settingsGuard | Existing — get all settings |
| PUT | `/erp/settings/business` | settingsGuard | Update business profile |
| GET | `/erp/roles` | roleGuard | List roles and their permissions |
| PUT | `/erp/roles/:role` | roleGuard | Update permissions for a role |

### Super Admin

| Method | Endpoint | Guard | Description |
|--------|----------|-------|-------------|
| GET | `/erp/businesses` | superAdminGuard | List all businesses |
| POST | `/erp/businesses` | superAdminGuard | Create business |
| PUT | `/erp/businesses/:id` | superAdminGuard | Update/toggle business |
| POST | `/erp/stores` | superAdminGuard | Create store |
| PUT | `/erp/stores/:id` | superAdminGuard | Update/toggle store |
| POST | `/erp/warehouses` | superAdminGuard | Create warehouse |
| PUT | `/erp/warehouses/:id` | superAdminGuard | Update/toggle warehouse |

## Key Design Decisions

### 1. Module Dispatch Pattern
`AdminDashboard.jsx` uses a single `renderSection(section)` switch. Each new ERP module is a new `case`. Components are lazy-loaded via `React.lazy` to keep the initial bundle small. The `erpConfig.js` `ERP_MODULE_MAP` remains the single source of truth — no route is added to the app router; all navigation is state-driven inside the admin shell.

### 2. Stock Movement Immutability
`src_erp_inventory_movements` is append-only. Every stock change (sale, purchase, return, adjustment, transfer, damage, count) creates a new row. `current_stock` on `src_erp_inventory_items` is the live denormalized count updated in a database transaction alongside the movement insert. This gives a complete audit trail without sacrificing query performance.

### 3. POS Barcode Scanning
Barcode scanners in keyboard-wedge mode produce keystrokes followed by Enter. The POS search input listens for `keydown` events; when Enter is detected and the input value looks like a barcode (numeric, ≥8 chars), it queries `/api/erp/pos/search?barcode=...`. No special driver or Web USB API is needed.

### 4. Split Payment Storage
Split payment details are stored as a JSONB array in `src_erp_sales.split_payment`. Example: `[{"method":"cash","amount":500},{"method":"upi","amount":300}]`. The total of all entries is validated server-side to equal `src_erp_sales.total` before the sale is committed.

### 5. Excel Export
All export endpoints use the existing `xlsx` package (`require('xlsx')`) already in `backend/package.json`. No new dependency is needed. The controller builds a workbook in memory and sends it with `Content-Disposition: attachment; filename=...xlsx`.

### 6. Barcode Generation (Frontend-only)
Barcode images are rendered client-side as SVG using a small inline implementation based on EAN13/Code128 encoding tables. No npm barcode library is added. For label printing, the browser print dialog is used with a CSS `@media print` stylesheet that scales to 50×25mm.

### 7. Tenant Scoping Pattern
Every new controller follows the same pattern as `erpController.js`:
```js
const businessId = req.tenant?.business_id || req.user?.business_id || null;
// If no businessId and not super_admin: return all or 403 depending on endpoint
```

### 8. initDB Idempotency
All new `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements are added to `backend/config/db.js` `initDB()`. This ensures the schema is always up-to-date on server start without a separate migration tool.

### 9. Audit Logging Helper
A shared `logAudit(pool, { adminId, action, targetType, targetId, details })` helper function is added to `backend/config/db.js`. Every state-changing controller calls this helper inside the same database transaction as the main write.

### 10. No New Frontend Dependencies
The entire ERP frontend is built with:
- React 19 hooks (already installed)
- React Router v7 (already installed)
- Lucide React icons (already installed)
- Tailwind CSS v4 utility classes (already installed)
- Inline styles matching the existing admin design system
- `axios` via the existing `utils/api.js` instance
- `react-hot-toast` (already installed)

No charting library is added. Revenue trend bars are rendered as inline SVG `<rect>` elements, exactly as done in the existing `AdminOverview.jsx` `BarChart` and `LineChart` components.
