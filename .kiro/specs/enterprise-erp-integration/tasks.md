# Implementation Plan: Enterprise Retail ERP Integration

## Overview

Build a complete Enterprise Retail ERP integrated directly inside the existing Shri Ram Clothings Admin Dashboard at `/admin/*`. Each task delivers a self-contained, working module. Tasks are ordered by dependency: database schema first, then backend controllers/routes, then frontend components, then wiring everything together.

## Tasks

- [x] 1. Database schema — new tables and column extensions
  - Add `src_erp_suppliers` table to `initDB` in `backend/config/db.js`
  - Add `src_erp_purchase_orders` and `src_erp_purchase_items` tables
  - Add `src_erp_returns` and `src_erp_return_items` tables
  - Add `src_erp_attendance` table with unique constraint on `(employee_id, attendance_date)`
  - Add `ALTER TABLE IF NOT EXISTS` extensions to `src_erp_inventory_items`: `hsn_code`, `gst_rate`, `supplier_id`, `rack_code`, `shelf_code`, `expiry_date`, `is_active`
  - Add `ALTER TABLE IF NOT EXISTS` extensions to `src_erp_sales`: `split_payment JSONB`, `discount_amount`, `coupon_code`, `notes`, `cashier_id`
  - Add `ALTER TABLE IF NOT EXISTS` extensions to `src_erp_customers`: `gst_number`, `address`, `city`, `state`, `pincode`, `membership`, `notes`
  - Add shared `logAudit(pool, opts)` helper exported from `backend/config/db.js`
  - _Requirements: 1, 2, 3, 4, 5, 7, 8, 9, 14, 15, 17, 21_

- [x] 2. POS billing — backend
  - Create `backend/controllers/posController.js` with `searchProducts`, `createSale`, `holdBill`, `listHolds`, `resumeHold`, `deleteHold`
  - `createSale`: validate cart totals, deduct stock + insert inventory movement in single DB transaction, persist `split_payment` JSONB, update customer `loyalty_points`, call `logAudit`
  - `holdBill` saves cart JSON to `src_erp_pos_holds`; `resumeHold` returns cart JSON and deletes the hold
  - Create `backend/routes/pos.js` with `posGuard` (auth + requireAnyPermission erp.manage_pos / erp.manage_orders)
  - _Requirements: 4_
  - _Dependencies: 1_

- [x] 3. POS billing — frontend (`AdminPos.jsx`)
  - Create `frontend/src/pages/admin/erp/AdminPos.jsx`
  - Product search field with barcode keyboard-wedge detection (Enter key after numeric string ≥ 8 chars triggers barcode lookup)
  - Cart: add/remove/change-qty line items, live subtotal, discount, tax, round-off, grand total
  - Payment panel: Cash, UPI, Card, Wallet, Cheque, Gift Card, Store Credit, Bank; Split Payment with per-method amount fields and sum validation
  - Hold Bill and Resume Bill flows
  - Print invoice via `window.print()` using thermal-style CSS (`@media print`)
  - Success audio via `new Audio()` on completed sale
  - Recent 8 sales and held bill count displayed at bottom
  - _Requirements: 4_
  - _Dependencies: 2_

- [x] 4. Inventory management — backend
  - Create `backend/controllers/inventoryController.js` with `listItems`, `createItem`, `updateItem`, `deleteItem`, `getMovements`, `adjustStock`, `importItems`, `exportItems`
  - `createItem`: auto-generate SKU pattern `SRC-{YYYY}-{SEQ}` and EAN13 barcode if not supplied; enforce unique SKU and barcode per `business_id` with HTTP 409 on duplicate
  - `adjustStock`: insert `adjustment` movement + update `current_stock` in single DB transaction
  - `importItems`: parse CSV/Excel via `xlsx`, validate rows, skip invalid rows with per-row error list returned
  - `exportItems`: build Excel workbook via `xlsx` and stream as `attachment`
  - Create `backend/routes/inventory.js` with `inventoryGuard` (auth + requirePermission erp.manage_inventory)
  - _Requirements: 5, 6_
  - _Dependencies: 1_

- [x] 5. Inventory management — frontend (`AdminInventory.jsx`)
  - Create `frontend/src/pages/admin/erp/AdminInventory.jsx`
  - Paginated, searchable item list table with low-stock indicator (orange badge when `current_stock <= reorder_level`)
  - Add/edit item slide-in form with all fields: title, category, brand, supplier, SKU, barcode, HSN, GST rate, variant size, variant color, purchase price, selling price, MRP, reorder level, warehouse, rack code, shelf code, expiry date
  - Stock movement history drawer for selected item (append-only read)
  - Manual stock adjustment form with reason field
  - CSV/Excel import with per-row error list
  - Inline barcode preview (SVG bars computed from EAN13 encoding)
  - 50×25mm label print button using `window.print()` + `@media print` CSS
  - Excel export button
  - _Requirements: 5, 6_
  - _Dependencies: 4_

- [x] 6. Warehouse management — backend
  - Add `createWarehouseTransfer`, `recordDamage`, `recordStockCount` to `backend/controllers/erpController.js`
  - `createWarehouseTransfer`: validate source stock, insert `transfer_out` + `transfer_in` movements in single transaction; return HTTP 422 if insufficient stock
  - `recordDamage`: insert `damage` movement (negative quantity) + update `current_stock`
  - `recordStockCount`: insert `count` movement + set `current_stock` to counted value
  - Add routes to `backend/routes/erp.js`: `POST /warehouse/transfer`, `POST /warehouse/damage`, `POST /warehouse/count` all behind `warehouseGuard`
  - _Requirements: 7_
  - _Dependencies: 1_

- [x] 7. Warehouse management — frontend (`AdminWarehouse.jsx`)
  - Create `frontend/src/pages/admin/erp/AdminWarehouse.jsx`
  - Warehouse cards grid: name, SKU count, total stock units, low-stock item count
  - Stock transfer form: source warehouse select, destination warehouse select, item search, quantity
  - Damage entry form: item, quantity, reason
  - Stock count form: item, counted quantity
  - Movement feed: chronological list of transfer, damage, count, adjustment events
  - _Requirements: 7_
  - _Dependencies: 6_

- [x] 8. Customer CRM — backend
  - Create `backend/controllers/customerErpController.js` with `listCustomers`, `createCustomer`, `updateCustomer`, `getHistory`, `adjustBalance`, `exportCustomers`
  - `adjustBalance`: update `loyalty_points` or `store_credit` with required notes; call `logAudit` with amount, reason, actor
  - `exportCustomers`: Excel with all customer fields + computed `lifetime_spend` and `visit_count` columns
  - Create `backend/routes/customers.js` with `customerGuard` (auth + requireAnyPermission erp.manage_orders / erp.manage_users)
  - _Requirements: 8_
  - _Dependencies: 1_

- [x] 9. Customer CRM — frontend (`AdminCustomers.jsx`)
  - Create `frontend/src/pages/admin/erp/AdminCustomers.jsx`
  - Searchable customer list: name, phone, customer code, loyalty points, store credit, outstanding
  - Add/edit customer form
  - Purchase history side panel for selected customer (bills list, totals)
  - Loyalty/credit adjustment form with notes field
  - Excel export button
  - _Requirements: 8_
  - _Dependencies: 8_

- [x] 10. Suppliers — backend
  - Create `backend/controllers/supplierController.js` with `listSuppliers`, `createSupplier`, `updateSupplier`, `getSupplierLedger`
  - Create `backend/routes/suppliers.js` with `supplierGuard` (auth + requirePermission erp.manage_suppliers)
  - _Requirements: 9_
  - _Dependencies: 1_

- [x] 11. Suppliers — frontend (`AdminSuppliers.jsx`)
  - Create `frontend/src/pages/admin/erp/AdminSuppliers.jsx`
  - Supplier list: name, code, GST, balance due, is_active
  - Add/edit supplier form
  - Supplier ledger panel: chronological list of POs, GRNs, returns, payments
  - _Requirements: 9_
  - _Dependencies: 10_

- [x] 12. Purchases — backend
  - Create `backend/controllers/purchaseController.js` with `listPurchases`, `createPurchase`, `recordGRN`, `purchaseReturn`
  - `recordGRN`: insert `purchase` inventory movements for all received items + update `current_stock` + update `src_erp_suppliers.balance_due` — all in one DB transaction
  - `purchaseReturn`: insert `return` movements + reduce `supplier.balance_due`
  - Create `backend/routes/purchases.js` with `purchaseGuard` (auth + requirePermission erp.manage_suppliers)
  - _Requirements: 9_
  - _Dependencies: 1, 10_

- [x] 13. Purchases — frontend (`AdminPurchases.jsx`)
  - Create `frontend/src/pages/admin/erp/AdminPurchases.jsx`
  - PO list: supplier name, PO number, status, total, expected date
  - Create PO form: supplier select, line items (inventory item search, qty, unit cost, HSN, GST), freight
  - GRN entry panel for a selected PO: show ordered qty, input received qty per line
  - Purchase return form
  - Excel export button
  - _Requirements: 9_
  - _Dependencies: 12_

- [x] 14. Returns and exchanges — backend
  - Create `backend/controllers/returnController.js` with `listReturns`, `createReturn`
  - `createReturn`: insert `src_erp_returns` record + `src_erp_return_items` rows, restore stock via `return` movements, optionally credit `customer.store_credit` — all in one DB transaction; call `logAudit`
  - For exchange returns: create a linked draft sale pre-loaded with replacement items
  - Create `backend/routes/returns.js` with `posGuard`
  - _Requirements: 11_
  - _Dependencies: 1_

- [x] 15. Returns and exchanges — frontend (`AdminReturns.jsx`)
  - Create `frontend/src/pages/admin/erp/AdminReturns.jsx`
  - Bill lookup by bill number; display line items with return quantity selectors
  - Return outcome selector: Cash Refund, Store Credit, Exchange
  - Exchange flow: open new POS cart pre-loaded with replacement items
  - Credit Note print button using `window.print()`
  - Return history list
  - _Requirements: 11_
  - _Dependencies: 14_

- [x] 16. Reports — backend
  - Create `backend/controllers/reportController.js` with `salesReport`, `gstReport`, `profitReport`, `inventoryReport`, `customerReport`, `exportReport`
  - All queries accept `from`/`to` date params and are scoped by `business_id`
  - `gstReport`: group by `hsn_code` and `gst_rate`, produce GSTR-1/GSTR-3B-compatible output
  - `exportReport`: build multi-sheet Excel workbook via `xlsx` and stream as attachment
  - Create `backend/routes/reports.js` with `reportsGuard` (auth + requirePermission erp.view_reports)
  - _Requirements: 12_
  - _Dependencies: 1_

- [x] 17. Reports — frontend (`AdminReports.jsx`)
  - Create `frontend/src/pages/admin/erp/AdminReports.jsx`
  - Left sidebar report catalogue: Sales, GST, Profit & Loss, Inventory, Customers, Suppliers, Attendance
  - Date range filter with period presets (Today, 7d, 30d, 3m, 6m, 1y, Custom)
  - 7-day daily sales bar chart (reuse inline SVG `BarChart` from `AdminOverview.jsx`)
  - Payment method distribution bar chart
  - Top 10 products table
  - Excel export button per selected report
  - Loading skeleton while data fetches; error + retry state
  - _Requirements: 12_
  - _Dependencies: 16_

- [ ] 18. Sales Orders module — backend
  - Add `listSales`, `getSale`, `voidSale`, `issueCreditNote`, `exportSales` to a new `backend/controllers/salesOrderController.js`
  - `voidSale`: check status ≠ `void` (HTTP 409 if already void), update `status = 'void'`, insert `return` inventory movements for each line item, create `Audit_Log` entry — all in one DB transaction
  - `issueCreditNote`: increment `customer.store_credit` by credit note amount, record in customer statement, call `logAudit`
  - `exportSales`: Excel/CSV export scoped to `business_id` with date range, payment method, status, and cashier filters
  - Add `GET /sales`, `GET /sales/:id`, `POST /sales/:id/void`, `POST /sales/:id/credit-note`, `GET /sales/export` to a new `backend/routes/salesOrders.js` behind `salesGuard` (auth + requireAnyPermission erp.manage_orders / erp.manage_pos)
  - _Requirements: 10_
  - _Dependencies: 1, 2_

- [ ] 19. Sales Orders module — frontend (`AdminSalesOrders.jsx`)
  - Create `frontend/src/pages/admin/erp/AdminSalesOrders.jsx`
  - Paginated sales list filterable by date range, payment method, status (completed / void / returned), and cashier
  - Row actions: View, Reprint Invoice (renders `InvoicePrint.jsx` and calls `window.print()`), Void Sale (with confirmation dialog), Issue Credit Note
  - Credit Note modal: shows credit amount, updates customer store credit on confirm
  - Excel/CSV export button
  - _Requirements: 10_
  - _Dependencies: 18, 24_

- [-] 20. Employees — backend and frontend
  - Create `backend/controllers/employeeController.js` with `listEmployees`, `createEmployee`, `updateEmployee`
  - `createEmployee`: insert into `src_users` with assigned role + store/warehouse IDs; seed default permission rows for that role into `src_role_permissions`
  - Create `backend/routes/employees.js` with `employeeGuard` (auth + requirePermission erp.manage_users)
  - Create `frontend/src/pages/admin/erp/AdminEmployees.jsx`: employee list (name, role, store, employee code), add/edit form
  - _Requirements: 14_
  - _Dependencies: 1_

- [ ] 21. Attendance — backend and frontend
  - Create `backend/controllers/attendanceController.js` with `getMonthlyGrid`, `markAttendance`, `exportAttendance`
  - `markAttendance`: upsert on `(employee_id, attendance_date)` unique constraint
  - `exportAttendance`: monthly Excel export
  - Create `backend/routes/attendance.js` with `attendanceGuard` (auth + requirePermission erp.manage_users)
  - Create `frontend/src/pages/admin/erp/AdminAttendance.jsx`: monthly grid with employee rows × day columns, color-coded status (present=green, absent=red, half-day=yellow, leave=blue), click-to-mark panel, check-in/check-out time inputs, month prev/next navigation, Excel export
  - _Requirements: 14_
  - _Dependencies: 1, 20_

- [-] 22. Expenses — backend and frontend
  - Create `backend/controllers/expenseController.js` with `listExpenses`, `createExpense`, `updateExpense`, `deleteExpense`, `exportExpenses`
  - `createExpense`: validate amount > 0 (HTTP 422 otherwise), insert, call `logAudit`
  - `exportExpenses`: Excel download
  - Create `backend/routes/expenses.js` with `expenseGuard` (auth + requirePermission erp.manage_finance)
  - Create `frontend/src/pages/admin/erp/AdminExpenses.jsx`: expense list with category/date/mode filters, add/edit form, category summary cards, month-over-month inline bar chart, Excel export
  - _Requirements: 15_
  - _Dependencies: 1_

- [-] 23. Barcode Engine — frontend (`BarcodeEngine.jsx`)
  - Create `frontend/src/pages/admin/erp/BarcodeEngine.jsx` as a standalone ERP module
  - Barcode format selector: EAN13, EAN8, UPC-A, Code128, QR Code
  - EAN13 check-digit computation inline (no npm barcode library); Code128 encoding table inline
  - Auto-generate SKU using configurable prefix pattern `SRC-{YEAR}-{SEQUENCE}` when user does not provide one
  - Live barcode preview rendered as inline SVG `<rect>` bars before printing
  - 50×25mm label layout: barcode graphic, product title (truncated), SKU, selling price
  - Print copies selector (1–999); on "Print Labels" open browser print dialog with `@media print` CSS for 50×25mm paper
  - _Requirements: 6_
  - _Dependencies: 4_

- [ ] 24. Invoice print system (`InvoicePrint.jsx`)
  - Create `frontend/src/pages/admin/erp/InvoicePrint.jsx` as a reusable print-ready invoice renderer
  - Props: `layout` (58mm / 80mm / A4), `sale` object, `items` array, `business` profile
  - Renders: logo, business name/GST/address, bill number, date, cashier, item table (description, qty, rate, GST, total), subtotal, tax, discount, total, payment method breakdown, UPI QR (inline SVG)
  - CSS `@media print` rule hides admin sidebar/header and sets page size to selected layout
  - Reads invoice layout config from `src_businesses.settings` (set by Invoice Designer)
  - Used by POS billing (Task 3), Sales Orders reprint (Task 19), and Returns Credit Note (Task 15)
  - _Requirements: 13_
  - _Dependencies: 3_

- [ ] 25. Invoice Designer — backend and frontend (`InvoiceDesigner.jsx`)
  - Extend `backend/controllers/erpController.js` with `getInvoiceLayout` and `saveInvoiceLayout`
  - `saveInvoiceLayout`: persist layout JSON to `src_businesses.settings.invoice_layout`; validate required fields; call `logAudit`
  - Add `GET /settings/invoice-layout` and `PUT /settings/invoice-layout` to `backend/routes/erp.js` behind `settingsGuard`
  - Create `frontend/src/pages/admin/erp/InvoiceDesigner.jsx`
  - Template selector: 58mm Thermal, 80mm Thermal, A4 Portrait, A4 Landscape, Custom
  - Configurable elements: logo upload/replace, business name, GST number, address, tagline, barcode/QR toggle, item column visibility (description, qty, rate, total), footer text, thank-you message
  - Live preview panel updating in real time as settings change (renders `InvoicePrint.jsx` with sample data)
  - "Print Test Invoice" button: renders sample invoice and opens browser print dialog
  - Save button persists layout to backend
  - _Requirements: 13_
  - _Dependencies: 24_

- [ ] 26. ERP Settings — backend extension and frontend (`AdminSettings.jsx`)
  - Extend `backend/controllers/erpController.js` with `updateBusinessSettings`; updates `src_businesses` + `settings` JSONB for logo URL, loyalty rate, UPI IDs, invoice layout
  - Add `PUT /settings/business` to `backend/routes/erp.js` behind `settingsGuard`
  - Create `frontend/src/pages/admin/erp/AdminSettings.jsx` with tabs:
    - Business Profile (name, GST, phone, email, address, currency, timezone)
    - Logo Upload (Cloudinary upload, preview)
    - Loyalty Settings (points rate per ₹ spent, minimum redemption threshold)
    - UPI IDs (list of configured UPI IDs used at POS for QR generation)
    - Printer Profiles (58mm, 80mm, A4, barcode; set default per session)
    - Data Export (export all business data as ZIP of Excel files)
    - Data Import (import previously exported data with duplicate detection; HTTP 415 for unsupported format)
  - _Requirements: 16_
  - _Dependencies: 1_

- [ ] 27. Role management — backend and frontend (`AdminRoleManagement.jsx`)
  - Create `backend/controllers/roleController.js` with `listRolePermissions`, `updateRolePermissions`, `listAllPermissions`
  - `updateRolePermissions`: delete existing + insert new rows in single transaction; call `logAudit`
  - Create `backend/routes/roles.js` with `roleGuard` (auth + requireRole super_admin / business_owner / store_admin)
  - Create `frontend/src/pages/admin/erp/AdminRoleManagement.jsx`: role tabs (super_admin, business_owner, store_admin, store_manager, cashier, warehouse_manager, accountant, employee), permission checklist grouped by module, save button
  - _Requirements: 2_
  - _Dependencies: 1_

- [ ] 28. Audit Logs module — backend and frontend (`AdminAuditLogs.jsx`)
  - Add `listAuditLogs`, `exportAuditLogs` to `backend/controllers/erpController.js`
  - `listAuditLogs`: paginated query on `src_activity_logs` with filters: actor, action type, date range, target type — all scoped to `business_id` unless `super_admin`
  - Ensure no `UPDATE` or `DELETE` endpoint exists for `src_activity_logs`; any such attempt returns HTTP 405
  - `exportAuditLogs`: Excel/CSV export of filtered entries via `xlsx`
  - Add `GET /audit-logs` and `GET /audit-logs/export` to `backend/routes/erp.js` behind `reportsGuard`
  - Create `frontend/src/pages/admin/erp/AdminAuditLogs.jsx`
  - Paginated log list: timestamp, actor name, actor role, action description, target type, target ID — ordered by `created_at` descending
  - Filter bar: actor, action type, date range, target type
  - Skeleton loader while fetching; error message + retry button on failure
  - Excel/CSV export button
  - _Requirements: 17_
  - _Dependencies: 1_

- [ ] 29. Super Admin — backend extension and frontend (`AdminSuperAdmin.jsx`)
  - Extend `backend/controllers/erpController.js` with `createBusiness`, `updateBusiness`, `createStore`, `updateStore`, `createWarehouse`, `updateWarehouse`, `listDomains`, `createDomain`, `updateDomain`, `deleteDomain`
  - `updateBusiness` toggles `is_active`; auth middleware returns HTTP 403 "Business account is inactive" when `is_active = false`
  - `globalRevenueSummary`: aggregate sales across all businesses for current and previous month
  - Add routes to `backend/routes/erp.js`: `POST /businesses`, `PUT /businesses/:id`, `POST /stores`, `PUT /stores/:id`, `POST /warehouses`, `PUT /warehouses/:id`, `GET /domains`, `POST /domains`, `PUT /domains/:id`, `DELETE /domains/:id` — all behind `superAdminGuard`
  - Create `frontend/src/pages/admin/erp/AdminSuperAdmin.jsx` with tabs:
    - Businesses (list with name, slug, GST, store count, active status; create/edit/toggle forms)
    - Stores (list per business; create/edit/toggle)
    - Warehouses (list per business; create/edit/toggle)
    - Domain Mappings (table from `src_domains`; create/edit/delete)
    - Global Revenue (summary cards: current month revenue, previous month revenue, across all businesses)
  - RBAC guard: redirect to default module if authenticated user is not `super_admin`
  - _Requirements: 3, 20_
  - _Dependencies: 1_

- [ ] 30. Security hardening
  - Apply rate limiting middleware to all `/api/auth/*` routes: max 20 requests per IP per minute; return HTTP 429 on breach
  - Add input sanitization middleware for all ERP write endpoints: reject inputs exceeding column max length or containing null bytes with HTTP 422
  - Verify CORS `allowedOrigins` is read from `FRONTEND_URL` env var and all unlisted origins are rejected in production
  - Confirm all existing and new ERP controllers use only parameterized `$1`/`$2` pg placeholders — no string concatenation of user input
  - Add HTTP 4xx/5xx logging middleware that logs request method, path, and status code to the server console
  - _Requirements: 18_
  - _Dependencies: 2, 4, 8, 10, 12, 14, 16, 18, 20, 22_

- [ ] 31. Wire all new routes into `server.js`
  - Mount `/api/erp/pos` → `routes/pos.js`
  - Mount `/api/erp/inventory` → `routes/inventory.js`
  - Mount `/api/erp/customers` → `routes/customers.js`
  - Mount `/api/erp/suppliers` → `routes/suppliers.js`
  - Mount `/api/erp/purchases` → `routes/purchases.js`
  - Mount `/api/erp/returns` → `routes/returns.js`
  - Mount `/api/erp/reports` → `routes/reports.js`
  - Mount `/api/erp/employees` → `routes/employees.js`
  - Mount `/api/erp/attendance` → `routes/attendance.js`
  - Mount `/api/erp/expenses` → `routes/expenses.js`
  - Mount `/api/erp/roles` → `routes/roles.js`
  - Mount `/api/erp/sales` → `routes/salesOrders.js`
  - _Requirements: 21_
  - _Dependencies: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 21, 22, 27_

- [ ] 32. Wire all new frontend components into `AdminDashboard.jsx`
  - Add React `lazy` imports for all new ERP components at top of `AdminDashboard.jsx`
  - Add `case` entries in `renderSection` for: `pos`, `inventory`, `warehouse`, `customers`, `suppliers`, `purchases`, `returns`, `reports`, `sales-orders`, `employees`, `attendance`, `expenses`, `settings`, `invoice-designer`, `barcode-engine`, `role-management`, `audit-logs`, `super-admin`
  - Wrap `renderSection` output in `<Suspense fallback={<Loader />}>` if not already done
  - Add corresponding entries to `erpConfig.js` `ERP_NAV_GROUPS` for any new module not yet listed (sales-orders, invoice-designer, barcode-engine, audit-logs)
  - _Requirements: 1, 21_
  - _Dependencies: 3, 5, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29_

- [ ] 33. Enhanced ERP Dashboard KPIs (`AdminOverview.jsx`)
  - Extend `AdminOverview.jsx` to call `/api/erp/dashboard` and display ERP KPIs alongside existing commerce KPIs: bills today, active cashiers, inventory value, low stock count, held bills, profit estimate, pending payments, active products
  - Add inline SVG `BarChart` for 7-day daily sales trend (reuse or extract existing component from `AdminOverview.jsx`)
  - Add payment method distribution bar for the current month
  - Add recent 6 inventory movements feed below existing tables
  - Add top-5 ERP customers table ranked by revenue for current month
  - Add top-5 products table ranked by revenue for current month
  - Add manual ERP refresh button that re-fetches all dashboard data and re-renders charts and KPI cards
  - _Requirements: 19_
  - _Dependencies: 1_

## Notes

- All new ERP components go under `frontend/src/pages/admin/erp/` as `.jsx` files
- All new backend controllers go under `backend/controllers/` and routes under `backend/routes/`
- No new npm packages are needed — `xlsx`, `bcryptjs`, `jsonwebtoken`, `pg`, `axios`, `lucide-react`, `react-hot-toast` are all already installed
- Every backend query uses `pg` pool parameterized placeholders (`$1`, `$2`) — no raw string concatenation
- Every state-changing ERP action calls `logAudit` inside the same database transaction
- Inline styles follow the existing admin palette: dark sidebar `#0f172a`, content background `#f8fafc`, primary accent `#f97316`, text `#111827`, muted `#6b7280`
- Chart components (BarChart, LineChart) already exist in `AdminOverview.jsx` and should be extracted to a shared file or copy-pasted into new modules as needed
- Tasks marked with `*` are optional and can be skipped for faster MVP
- Tasks 1–16 are complete; Tasks 17–33 represent the remaining implementation work

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["17", "18", "20", "22", "23", "28", "33"] },
    { "id": 1, "tasks": ["19", "21", "24", "26", "27", "29", "30"] },
    { "id": 2, "tasks": ["25", "31"] },
    { "id": 3, "tasks": ["32"] }
  ]
}
```
