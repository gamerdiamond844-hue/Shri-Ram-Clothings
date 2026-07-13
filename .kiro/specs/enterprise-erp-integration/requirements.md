# Requirements Document

## Introduction

This feature transforms the existing "Shri Ram Clothings" Admin Dashboard at `/admin/*` into a complete Enterprise Retail ERP without creating any separate website, subdomain, second login, or iframe. Every ERP module is built as a native React component inside the existing `/admin/*` route tree, sharing the same JWT authentication, role-based access control (RBAC), PostgreSQL database, Express.js API, and Vite/React frontend already in production.

The system is multi-business and multi-store: one platform hosts unlimited businesses, each with unlimited stores and warehouses, each with its own revenue streams, reports, settings, and branding. The application already has a working tenant middleware, RBAC permission system, domain mapping, and partial ERP tables. This spec covers the full implementation of all ERP modules that are currently rendered as placeholder stubs.

## Glossary

- **ERP**: Enterprise Resource Planning — the integrated set of business management modules described in this document.
- **Admin_Dashboard**: The React shell at `/admin/*` that renders the sidebar, header, and all module workspaces.
- **Module**: A first-class React component rendered inside the Admin_Dashboard's main content area for a specific ERP function (e.g., POS, Inventory).
- **Tenant**: The scoped business/store/warehouse context resolved by the existing `tenant` middleware from the request `Host` header.
- **Business**: A top-level retail entity in `src_businesses`, owned by a `business_owner`.
- **Store**: A physical or virtual retail location in `src_stores`, belonging to a Business.
- **Warehouse**: A storage facility in `src_warehouses`, belonging to a Business.
- **POS**: Point of Sale — the in-store billing terminal for completing sales transactions.
- **SKU**: Stock Keeping Unit — a unique alphanumeric product identifier.
- **Barcode**: A machine-readable code (EAN13, EAN8, UPC, Code128, or QR) attached to an inventory item.
- **GRN**: Goods Receipt Note — a document confirming receipt of goods from a supplier.
- **HSN**: Harmonized System Nomenclature — the Indian tax classification code used with GST.
- **GST**: Goods and Services Tax — the Indian indirect tax applied to products and services.
- **Credit_Note**: A document issued to a customer reducing the amount owed after a return or adjustment.
- **Debit_Note**: A document issued to a supplier increasing the amount owed after a purchase return.
- **Loyalty_Points**: Integer points accumulated by a customer based on purchases, redeemable against future bills.
- **Store_Credit**: Monetary balance held for a customer usable during checkout, stored in `src_erp_customers.store_credit`.
- **Hold_Bill**: A POS cart state saved to `src_erp_pos_holds` and later resumed without data loss.
- **Split_Payment**: A single bill settled with two or more payment methods, stored as JSONB in `src_erp_sales.split_payment`.
- **RBAC**: Role-Based Access Control — the existing permission engine using `src_permissions` and `src_role_permissions`.
- **Permission_Key**: A string identifier like `erp.manage_pos` checked by the `requirePermission` middleware.
- **Audit_Log**: An immutable record in `src_activity_logs` capturing every state-changing action in the ERP.
- **Inventory_Movement**: An append-only record in `src_erp_inventory_movements` tracking every stock change.
- **Thermal_Printer**: A receipt or label printer accepting ESC/POS or ZPL commands (58mm, 80mm, or label sizes).
- **Label_Printer**: A barcode label printer (e.g., TSC, Zebra) producing 50×25 mm labels.
- **Client_Side_Routing**: Navigation handled by React Router v7 with no full page reload and no iframe.
- **ERP_Config**: The `erpConfig.js` file defining all nav groups, module keys, permissions, and `canAccessModule` logic.

## Requirements

---

### Requirement 1: Integrated Admin Shell — No Separate ERP URL

**User Story:** As a business owner, I want the entire ERP to live inside the same admin website I already use, so that my team never has to navigate to a different URL or log in again.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL render all ERP modules under the `/admin/*` route tree using Client_Side_Routing, with no full page reload, no redirect to a different domain, and no iframe.
2. WHEN a user navigates to an ERP module path (e.g., `/admin/pos`), THE Admin_Dashboard SHALL display the corresponding module component in the main content area without unmounting the sidebar or header.
3. THE Admin_Dashboard SHALL continue to use the existing JWT token stored in the frontend AuthContext for all ERP API calls, with no second login flow.
4. WHEN a user's JWT token is invalid or expired during an ERP module action, THE Admin_Dashboard SHALL redirect the user to `/login` and clear the auth state.
5. THE ERP_Config SHALL remain the single source of truth for all nav group definitions, module keys, and permission mappings; no module SHALL be registered in the router without a corresponding entry in `erpConfig.js`.

---

### Requirement 2: Role-Based Access Control (RBAC) for All ERP Modules

**User Story:** As a super admin, I want every ERP module and API endpoint to enforce role and permission checks, so that a cashier cannot access finance reports and a warehouse manager cannot void invoices.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL call `canAccessModule(user, module)` from `erpConfig.js` before rendering any module; IF the user lacks the required role or permission, THEN THE Admin_Dashboard SHALL redirect to the user's default accessible module.
2. THE Backend SHALL apply `requireRole` or `requirePermission` middleware on every `/api/erp/*` endpoint; IF a request lacks the required role or permission, THEN THE Backend SHALL respond with HTTP 403.
3. THE Admin_Dashboard sidebar SHALL only display nav items for modules where `canAccessModule(user, item)` returns `true` for the currently authenticated user.
4. WHEN a `super_admin` is authenticated, THE RBAC_Engine SHALL grant access to all modules and all API endpoints without requiring individual permission records.
5. THE Role_Management_Module SHALL allow a `super_admin`, `business_owner`, or `store_admin` to assign Permission_Keys to roles; WHEN permissions are updated, THE Backend SHALL reflect the change on the next authenticated request without requiring a server restart.
6. THE Backend SHALL support the following roles with their default permission scopes:
   - `super_admin`: all permissions
   - `business_owner`: all ERP permissions within their business
   - `store_admin`: all store-level ERP permissions
   - `store_manager`: inventory, sales, customers, reports
   - `cashier`: POS, customers
   - `warehouse_manager`: inventory, warehouse
   - `accountant`: reports, expenses, purchases
   - `employee`: attendance only

---

### Requirement 3: Multi-Business and Multi-Store Tenancy

**User Story:** As a super admin managing multiple retail businesses on one platform, I want each business to have completely isolated data, reports, settings, and branding, so that store A never sees store B's revenue.

#### Acceptance Criteria

1. THE Backend SHALL scope all ERP queries (sales, inventory, customers, suppliers, expenses, attendance) to the authenticated user's `business_id` unless the user's role is `super_admin`.
2. WHEN a `super_admin` accesses any ERP endpoint without a Tenant context, THE Backend SHALL return aggregated data across all businesses or unscoped data as appropriate for the endpoint.
3. THE Super_Admin_Module SHALL allow creating, editing, and deactivating Businesses, Stores, and Warehouses; WHEN a Business is deactivated, THE Backend SHALL deny login for all users whose `business_id` matches that Business.
4. THE Backend tenant middleware SHALL continue to resolve Business, Store, and Warehouse scope from the request `Host` header for domain-mapped deployments.
5. WHEN a user's `business_id` differs from the Tenant resolved by the `Host` header and the user is not `super_admin`, THEN THE Backend SHALL respond with HTTP 403.

---

### Requirement 4: POS Billing Module

**User Story:** As a cashier, I want a fast in-store billing screen that supports barcode scanning, multiple payment methods, held bills, and instant invoice printing, so that I can serve customers without delays.

#### Acceptance Criteria

1. THE POS_Module SHALL display a product search field that accepts input from a USB, Bluetooth, or camera-based barcode scanner (keyboard-wedge mode) and resolves the scanned barcode to a product from `src_erp_inventory_items`.
2. WHEN a barcode is scanned or a product is searched, THE POS_Module SHALL add the matched product to the active cart, defaulting quantity to 1 and using the item's `selling_price`.
3. THE POS_Module SHALL support the following payment methods in a single bill: Cash, UPI, Card, Wallet, Cheque, Gift Card, Store_Credit, Bank, and Split_Payment.
4. WHEN a Split_Payment is selected, THE POS_Module SHALL allow the cashier to enter individual amounts for each method and SHALL validate that the sum of all method amounts equals the bill total before completing the sale.
5. THE POS_Module SHALL allow the cashier to hold the current cart via a "Hold Bill" action; WHEN held, THE Backend SHALL save the cart payload to `src_erp_pos_holds` with a unique `hold_code` and the bill SHALL be resumable by any cashier in the same store.
6. WHEN a bill is completed, THE Backend SHALL create a record in `src_erp_sales` and one `src_erp_sale_items` row per line item, decrement `current_stock` in `src_erp_inventory_items`, and append an `Inventory_Movement` record of type `sale`.
7. WHEN a bill is completed, THE POS_Module SHALL display a printable invoice and SHALL support printing to a connected Thermal_Printer (58mm or 80mm) via the browser print dialog.
8. WHEN a bill is completed, THE POS_Module SHALL play a success sound to confirm the transaction.
9. IF a scanned barcode does not match any item in `src_erp_inventory_items` for the current business, THEN THE POS_Module SHALL display an error message identifying the unrecognized barcode.
10. IF an item in the cart has `current_stock` of 0 at the time of checkout, THEN THE POS_Module SHALL display a stock warning and require explicit cashier confirmation before proceeding.
11. THE POS_Module SHALL display the last 8 completed bills and the count of currently held bills for the active session.
12. WHEN a customer is attached to a bill and the sale is completed, THE Backend SHALL update the customer's `loyalty_points` based on the business's configured loyalty rate and reduce `store_credit` if it was applied.

---

### Requirement 5: Inventory Management Module

**User Story:** As a store manager, I want to manage all products with full variant support (size, color, SKU, barcode), HSN/GST classification, and reorder levels, so that I always know what is in stock and when to reorder.

#### Acceptance Criteria

1. THE Inventory_Module SHALL allow creating, editing, and archiving inventory items with the fields: title, category, brand, supplier, SKU, barcode, HSN code, GST rate, variant size, variant color, purchase price, selling price, MRP, reorder level, warehouse, rack code, and shelf code.
2. THE Backend SHALL enforce SKU and barcode uniqueness per business; IF a duplicate SKU or barcode is submitted, THEN THE Backend SHALL respond with HTTP 409 and a descriptive error message.
3. WHEN an inventory item's `current_stock` reaches or falls below its `reorder_level`, THE Inventory_Module SHALL display a visual low-stock indicator on that item's row.
4. THE Inventory_Module SHALL display the complete movement history for any selected item by reading all `src_erp_inventory_movements` records for that item, ordered by `created_at` descending; THE Backend SHALL never overwrite or delete movement records.
5. WHEN an inventory adjustment (manual stock correction) is saved, THE Backend SHALL append an `Inventory_Movement` record of type `adjustment` with the quantity delta and the resulting `balance_after`; THE Backend SHALL update `current_stock` atomically using a database transaction.
6. THE Inventory_Module SHALL support bulk import of inventory items via CSV or Excel upload; WHEN a row fails validation, THE Backend SHALL skip that row and return a per-row error list without rolling back successfully imported rows.
7. THE Inventory_Module SHALL support exporting the current inventory list to Excel or CSV.
8. FOR ALL inventory adjustments, the `balance_after` field in `src_erp_inventory_movements` SHALL equal the `current_stock` value of the item immediately after the transaction is committed.

---

### Requirement 6: Barcode Engine Module

**User Story:** As a store admin, I want to auto-generate EAN13/EAN8/UPC/Code128/QR barcodes and SKUs for new products, and print 50×25 mm barcode labels to a TSC or Zebra printer, so that every item on the shelf can be scanned instantly.

#### Acceptance Criteria

1. THE Barcode_Engine_Module SHALL generate a valid barcode for a new inventory item in EAN13, EAN8, UPC-A, Code128, or QR Code format based on the selected format.
2. WHEN generating an EAN13 barcode, THE Barcode_Engine_Module SHALL compute and append the correct check digit so the resulting 13-digit code is a valid EAN13.
3. THE Barcode_Engine_Module SHALL auto-generate a unique SKU for a new item using a configurable prefix pattern (e.g., `SRC-{YEAR}-{SEQUENCE}`) if the user does not provide one manually.
4. THE Barcode_Engine_Module SHALL render a printable barcode label layout for 50×25 mm that includes the barcode graphic, product title (truncated to fit), SKU, and selling price.
5. WHEN the user clicks "Print Labels", THE Barcode_Engine_Module SHALL open the browser print dialog with the label layout pre-selected for 50×25 mm paper size.
6. THE Barcode_Engine_Module SHALL support printing multiple copies of a label (1 to 999) in a single print job.
7. WHEN a barcode image is generated, THE Barcode_Engine_Module SHALL display a preview of the barcode before printing.
8. FOR ALL generated EAN13 barcodes, parsing the barcode SHALL produce the original numeric string used to generate it (round-trip property).

---

### Requirement 7: Warehouse Management Module

**User Story:** As a warehouse manager, I want to manage unlimited warehouses with rack/shelf location tracking, perform stock transfers between warehouses, and record damage or lost stock, so that I know the exact location of every item.

#### Acceptance Criteria

1. THE Warehouse_Module SHALL list all warehouses belonging to the current business with per-warehouse totals for SKU count, stock units, and low-stock item count.
2. THE Warehouse_Module SHALL allow creating stock transfer requests between two warehouses; WHEN a transfer is confirmed, THE Backend SHALL append two `Inventory_Movement` records — one of type `transfer_out` for the source warehouse and one of type `transfer_in` for the destination warehouse — within a single database transaction.
3. IF the source warehouse has insufficient stock for a requested transfer quantity, THEN THE Backend SHALL reject the transfer with HTTP 422 and an error message specifying the available quantity.
4. THE Warehouse_Module SHALL allow recording damage or lost stock; WHEN a damage entry is saved, THE Backend SHALL append an `Inventory_Movement` of type `damage` with a negative quantity and update `current_stock` atomically.
5. THE Warehouse_Module SHALL allow performing a stock count (physical count reconciliation); WHEN a count is saved, THE Backend SHALL append an `Inventory_Movement` of type `count` with the quantity difference and update `current_stock` to match the counted value.
6. THE Warehouse_Module SHALL display a chronological transfer and event feed showing recent movements of types `transfer_in`, `transfer_out`, `damage`, `count`, and `adjustment` across all warehouses.

---

### Requirement 8: Customer CRM Module

**User Story:** As a store manager, I want a complete customer profile with loyalty points, store credit, outstanding balance, and full purchase history, so that I can build long-term customer relationships and resolve billing disputes quickly.

#### Acceptance Criteria

1. THE Customer_Module SHALL display a searchable list of all customers in `src_erp_customers` scoped to the current business, showing name, phone, customer code, loyalty points, store credit, and outstanding amount.
2. THE Customer_Module SHALL allow creating and editing customer profiles with: name, phone, email, GST number, address, city, state, and pincode.
3. WHEN a customer is selected, THE Customer_Module SHALL display the full purchase history by loading all `src_erp_sales` records where `customer_id` matches, ordered by `created_at` descending.
4. THE Customer_Module SHALL allow manually adjusting a customer's `loyalty_points` or `store_credit` with a required notes field; WHEN such an adjustment is saved, THE Backend SHALL append an `Audit_Log` entry recording the change, the amount, the reason, and the acting user.
5. THE Customer_Module SHALL allow marking a customer balance as having an outstanding amount and generating a statement of account showing all bills and payments.
6. WHEN exporting the customer list, THE Backend SHALL produce an Excel file containing all customer fields plus total lifetime spend and visit count.

---

### Requirement 9: Supplier Management and Purchases Module

**User Story:** As an accountant, I want to manage supplier profiles, raise purchase orders, record GRNs, and track supplier ledgers, so that I always know what we owe and what stock is incoming.

#### Acceptance Criteria

1. THE Supplier_Module SHALL display a list of all suppliers in `src_erp_suppliers` scoped to the current business, with name, code, GST number, and current balance due.
2. THE Supplier_Module SHALL allow creating and editing supplier profiles with: name, supplier code, phone, email, GST number, address, and payment terms in days.
3. THE Purchases_Module SHALL allow creating a Purchase Order (PO) with: supplier, expected delivery date, line items (each with inventory item, quantity, and unit cost), freight amount, and GST details.
4. WHEN a GRN is recorded against a PO, THE Backend SHALL append `Inventory_Movement` records of type `purchase` for each received item within a single database transaction, update `current_stock`, and update the supplier's `balance_due`.
5. THE Purchases_Module SHALL allow recording purchase returns (Debit_Note); WHEN a purchase return is saved, THE Backend SHALL append `Inventory_Movement` records of type `return` and reduce the supplier's `balance_due` accordingly.
6. THE Supplier_Module SHALL display a supplier ledger showing all POs, GRNs, returns, and payments for a selected supplier in chronological order.
7. THE Purchases_Module SHALL support exporting purchase reports to Excel and CSV.

---

### Requirement 10: Sales Orders and Invoice Lifecycle Module

**User Story:** As a store admin, I want to manage all sales orders and invoices — including reprint, void, and credit note issuance — so that every sale has a complete paper trail.

#### Acceptance Criteria

1. THE Sales_Module SHALL display a paginated list of all sales in `src_erp_sales` scoped to the current business, filterable by date range, payment method, status, and cashier.
2. THE Sales_Module SHALL allow reprinting any past invoice by fetching the sale and its items and rendering the same print layout used at POS billing time.
3. WHEN a `store_admin` or `business_owner` voids a completed sale, THE Backend SHALL update `src_erp_sales.status` to `void`, append `Inventory_Movement` records of type `return` to restore stock for each line item, and create an `Audit_Log` entry — all within a single database transaction.
4. THE Sales_Module SHALL allow issuing a Credit_Note against a voided or returned sale; WHEN a Credit_Note is issued, THE Backend SHALL increase the customer's `store_credit` by the credit note amount and record the transaction in the customer's statement.
5. IF a sale with status `void` is submitted for voiding again, THEN THE Backend SHALL respond with HTTP 409 indicating the sale is already void.
6. THE Sales_Module SHALL export filtered sales data to Excel and CSV.

---

### Requirement 11: Returns and Exchange Module

**User Story:** As a cashier, I want to process product returns and exchanges using a return reference or bill number, so that I can issue refunds or exchange items without manual workarounds.

#### Acceptance Criteria

1. THE Returns_Module SHALL allow initiating a return by entering the original bill number; WHEN found, THE Returns_Module SHALL display the bill's line items with checkboxes to select which items are being returned.
2. WHEN a return is confirmed, THE Backend SHALL append `Inventory_Movement` records of type `return` to restore stock for each returned item, update `src_erp_sales.status` to `returned` if all items are returned, and create an `Audit_Log` entry.
3. THE Returns_Module SHALL support three return outcomes: Cash Refund, Store_Credit top-up, or Exchange (which initiates a new POS cart pre-loaded with the exchanged items).
4. WHEN an exchange is processed, THE Backend SHALL complete the return and simultaneously create a new draft sale for the replacement items, keeping both transactions linked by a reference ID.
5. THE Returns_Module SHALL issue a Credit_Note PDF for any return that results in a Store_Credit top-up, and a Debit_Note PDF for returns sent back to the supplier.

---

### Requirement 12: Reports Module

**User Story:** As an accountant, I want access to 100+ pre-built reports covering sales, GST, profit, inventory, customers, and suppliers, with one-click export to Excel, CSV, and PDF, so that I can produce monthly and annual financial statements without third-party tools.

#### Acceptance Criteria

1. THE Reports_Module SHALL provide a report catalogue with categories: Sales Reports, GST Reports, Profit & Loss, Inventory Reports, Customer Reports, Supplier Reports, and Attendance Reports.
2. WHEN a report is selected and a date range is applied, THE Backend SHALL execute the appropriate aggregation query scoped to the current business and return the data within 5 seconds for datasets up to 100,000 rows.
3. THE Reports_Module SHALL support exporting any report to Excel (.xlsx), CSV, and print-to-PDF via the browser print dialog.
4. THE Reports_Module SHALL include a 7-day and 30-day sales trend chart on the reports overview page, reading from `src_erp_sales`.
5. THE Reports_Module SHALL provide a GST summary report that groups taxable sales by HSN code and GST rate for a selected period, suitable for filing GSTR-1 and GSTR-3B.
6. THE Reports_Module SHALL provide a profit estimate report combining sales revenue and expenses from `src_erp_expenses` for the selected period.
7. WHILE a report is loading, THE Reports_Module SHALL display a loading indicator; IF the Backend returns an error, THEN THE Reports_Module SHALL display the error message and a retry button.

---

### Requirement 13: Invoice Designer and Thermal Print System

**User Story:** As a business owner, I want to design my own invoice layout visually — choosing logo placement, QR code, columns, and font sizes — and print to 58mm, 80mm thermal rolls or A4, so that every bill looks professional with my branding.

#### Acceptance Criteria

1. THE Invoice_Designer_Module SHALL allow selecting a base template from: 58mm Thermal, 80mm Thermal, A4 Portrait, A4 Landscape, and Custom.
2. THE Invoice_Designer_Module SHALL allow configuring layout elements including: business logo (upload/replace), business name, GST number, address, tagline, barcode/QR on receipt, item columns (description, qty, rate, total), footer text, and a thank-you message.
3. THE Invoice_Designer_Module SHALL display a live preview of the invoice layout updating in real time as the user changes settings.
4. WHEN the invoice layout is saved, THE Backend SHALL persist the configuration in `src_businesses.settings` as a JSON object.
5. THE POS_Module SHALL read the saved invoice layout from `src_businesses.settings` and apply it when rendering the print invoice.
6. WHEN the user clicks "Print Test Invoice", THE Invoice_Designer_Module SHALL render a sample invoice with the current layout and open the browser print dialog.

---

### Requirement 14: Employee and Attendance Management

**User Story:** As a store admin, I want to manage employee records and track daily attendance with check-in and check-out times, so that I can calculate wages and monitor store coverage.

#### Acceptance Criteria

1. THE Employee_Module SHALL display a list of all users with non-customer roles scoped to the current business, showing name, role, store assignment, and employee code.
2. THE Employee_Module SHALL allow creating a new employee user with: name, email, phone, role, store assignment, warehouse assignment, and employee code.
3. WHEN an employee is created via the Employee_Module, THE Backend SHALL insert a record into `src_users` and seed the correct default permissions for the assigned role in `src_role_permissions`.
4. THE Attendance_Module SHALL display an attendance grid for the current month showing attendance status per employee per day, reading from `src_erp_attendance`.
5. THE Attendance_Module SHALL allow marking attendance for an employee for a selected date with status: present, absent, half-day, or leave, and recording check-in and check-out timestamps.
6. IF an attendance record already exists for an employee on a given date and a duplicate is submitted, THEN THE Backend SHALL update the existing record rather than creating a duplicate, enforcing the unique constraint on `(employee_id, attendance_date)`.
7. THE Attendance_Module SHALL export a monthly attendance report for the current business to Excel.

---

### Requirement 15: Expense Tracking Module

**User Story:** As an accountant, I want to record, categorize, and track all business expenses with approval status, so that I have a complete picture of operating costs for profit calculations.

#### Acceptance Criteria

1. THE Expense_Module SHALL display a list of all expenses in `src_erp_expenses` scoped to the current business, filterable by category, date range, and payment mode.
2. THE Expense_Module SHALL allow adding a new expense with: category, title, amount, payment mode, expense date, and notes.
3. WHEN a new expense is saved, THE Backend SHALL insert a record into `src_erp_expenses` and create an `Audit_Log` entry.
4. THE Expense_Module SHALL display category-wise expense totals and a month-over-month comparison chart.
5. THE Expense_Module SHALL export filtered expenses to Excel and CSV.
6. IF an expense amount is submitted as a negative number or zero, THEN THE Backend SHALL respond with HTTP 422 and an error message.

---

### Requirement 16: ERP Settings Module

**User Story:** As a business owner, I want a single settings panel to configure my company profile, GST details, logo, invoice layout, tax rates, currency, printer profiles, UPI ID, and backup/restore options, so that my ERP is tailored to my business without touching code.

#### Acceptance Criteria

1. THE Settings_Module SHALL allow editing the business profile: name, GST number, phone, email, address, currency, and timezone; WHEN saved, THE Backend SHALL update `src_businesses` for the current business.
2. THE Settings_Module SHALL allow uploading and replacing the business logo; WHEN uploaded, THE Backend SHALL store the Cloudinary URL in `src_businesses.settings.logo_url`.
3. THE Settings_Module SHALL allow configuring the loyalty points rate (points awarded per ₹ spent) and minimum redemption threshold; WHEN saved, THE Backend SHALL persist the values in `src_businesses.settings`.
4. THE Settings_Module SHALL allow configuring UPI payment IDs used at POS; WHEN a UPI ID is saved, THE POS_Module SHALL use it to generate dynamic QR codes during payment collection.
5. THE Settings_Module SHALL list configured printer profiles (58mm, 80mm, A4, barcode) and allow activating a default printer per session.
6. THE Settings_Module SHALL allow exporting all business data (customers, products, sales, expenses) to a single ZIP archive containing Excel files.
7. THE Settings_Module SHALL allow importing previously exported data; WHEN an import is confirmed, THE Backend SHALL validate the file format and insert records with duplicate detection.
8. IF an unsupported file format is submitted to the import endpoint, THEN THE Backend SHALL respond with HTTP 415 and a descriptive error.

---

### Requirement 17: Audit Logs Module

**User Story:** As a super admin, I want an immutable log of every state-changing action in the ERP, so that I can investigate discrepancies, detect unauthorized changes, and satisfy audit requirements.

#### Acceptance Criteria

1. THE Backend SHALL append an `Audit_Log` entry to `src_activity_logs` for every state-changing ERP action including: completing a sale, voiding a sale, issuing a credit note, adjusting stock, modifying a customer balance, changing role permissions, and updating settings.
2. THE Audit_Logs_Module SHALL display audit log entries with: timestamp, actor name, actor role, action description, target type, and target ID; entries SHALL be ordered by `created_at` descending.
3. THE Audit_Logs_Module SHALL support filtering by actor, action type, date range, and target type.
4. THE Backend SHALL never allow updating or deleting records from `src_activity_logs`; all ERP endpoints that would modify audit log data SHALL respond with HTTP 405.
5. THE Audit_Logs_Module SHALL export filtered audit log entries to Excel and CSV.
6. WHILE the audit log list is loading, THE Audit_Logs_Module SHALL display a skeleton loader; IF the Backend returns an error, THEN THE Audit_Logs_Module SHALL display the error message.

---

### Requirement 18: Security Hardening

**User Story:** As a super admin, I want the ERP to enforce JWT security, rate limiting, input sanitization, and SQL injection protection on all API endpoints, so that customer and financial data is protected from unauthorized access and common attacks.

#### Acceptance Criteria

1. THE Backend SHALL apply parameterized queries (via `pg` pool `$1`/`$2` placeholders) for all database interactions; no SQL string shall be constructed by concatenating untrusted user input.
2. THE Backend SHALL apply rate limiting to all authentication endpoints (`/api/auth/*`) with a maximum of 20 requests per IP per minute; IF the limit is exceeded, THEN THE Backend SHALL respond with HTTP 429.
3. THE Backend SHALL validate and sanitize all user-supplied string inputs for ERP write endpoints; IF an input exceeds the column's maximum length or contains null bytes, THEN THE Backend SHALL respond with HTTP 422.
4. THE Backend SHALL set CORS allowed origins from the `FRONTEND_URL` environment variable and reject cross-origin requests from unlisted origins in production.
5. WHEN a JWT token's `exp` claim is in the past, THE Backend auth middleware SHALL respond with HTTP 401 and the message "Invalid token".
6. THE Backend SHALL log all HTTP 4xx and 5xx responses with the request method, path, and status code to the server console to support incident investigation.

---

### Requirement 19: Enhanced ERP Dashboard (KPIs, Charts, Heatmaps)

**User Story:** As a business owner, I want the ERP dashboard to show live KPIs, revenue trend charts, payment method mix, top products, and a daily activity heatmap, so that I can assess business health at a glance the moment I open the admin panel.

#### Acceptance Criteria

1. THE ERP_Dashboard_Module SHALL display the following KPIs computed from `src_erp_sales`, `src_erp_expenses`, and `src_erp_inventory_items` scoped to the current business: today's sales, weekly sales, monthly sales, profit estimate (sales minus expenses), inventory value, pending payments, bills today, active products, low stock count, and active cashiers.
2. THE ERP_Dashboard_Module SHALL display a 7-day daily sales bar chart reading from `src_erp_sales` filtered by `status = 'completed'`.
3. THE ERP_Dashboard_Module SHALL display a payment method pie or donut chart for the current month.
4. THE ERP_Dashboard_Module SHALL display a top-5 products table ranked by revenue for the current month.
5. THE ERP_Dashboard_Module SHALL display a top-5 customers table ranked by revenue for the current month.
6. THE ERP_Dashboard_Module SHALL display the 6 most recent inventory movements from `src_erp_inventory_movements`.
7. WHEN the ERP_Dashboard_Module is first loaded, THE Frontend SHALL call `/api/erp/dashboard` and render KPI data within 3 seconds on a standard broadband connection.
8. THE ERP_Dashboard_Module SHALL include a manual refresh button; WHEN clicked, it SHALL re-fetch all dashboard data and re-render all charts and KPI cards.

---

### Requirement 20: Super Admin Module

**User Story:** As a super admin, I want a dedicated panel to manage all businesses, stores, and warehouses across the platform, view global revenue, and manage domain mappings, so that I can operate the entire multi-tenant platform from one place.

#### Acceptance Criteria

1. THE Super_Admin_Module SHALL be accessible only to users with role `super_admin`; IF a user with any other role attempts to access `/admin/super-admin`, THEN THE Admin_Dashboard SHALL redirect them to their default accessible module.
2. THE Super_Admin_Module SHALL list all businesses from `src_businesses` with their name, slug, GST number, store count, and active status.
3. THE Super_Admin_Module SHALL allow creating, editing, and toggling the `is_active` flag of any Business, Store, or Warehouse.
4. THE Super_Admin_Module SHALL display the domain mapping table from `src_domains` and allow creating, editing, and deleting domain-to-business/store/warehouse mappings.
5. WHEN a Business is deactivated by the super admin, THE Backend SHALL set `src_businesses.is_active = FALSE`; WHEN a user with that `business_id` next authenticates, THE Backend auth middleware SHALL return HTTP 403 with the message "Business account is inactive".
6. THE Super_Admin_Module SHALL display a global revenue summary aggregating sales across all businesses for the current month and the previous month.

---

### Requirement 21: Technology Stack Preservation and Module Architecture

**User Story:** As the development team, we want every new ERP module to follow the same patterns as existing admin pages — React components under `frontend/src/pages/admin/erp/`, new Express routes under `backend/routes/`, and SQL-only database access via the existing `pg` pool — so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE Frontend SHALL place every new ERP module React component under `frontend/src/pages/admin/erp/` as a dedicated `.jsx` file.
2. THE Backend SHALL add new ERP endpoint logic to dedicated controller files under `backend/controllers/` and register routes under `backend/routes/` mounted at `/api/erp/`.
3. THE Backend SHALL use only the existing `pg` pool from `backend/config/db.js` for database access; no ORM or alternative database client SHALL be introduced.
4. THE Frontend SHALL use only the existing `axios` instance (`frontend/src/utils/api.js`) for all ERP API calls; no additional HTTP client library SHALL be introduced.
5. THE AdminDashboard `renderSection` function SHALL be extended for each new module by adding a `case` for the module's `componentKey` that returns the new component with lazy loading via React `lazy`.
6. WHEN a new ERP module requires database tables or columns not already present in `initDB`, THE Backend `db.js` `initDB` function SHALL include `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements to create them idempotently.
7. THE Frontend SHALL not introduce any new CSS-in-JS library or CSS framework beyond the existing Tailwind CSS v4 and inline styles pattern already used across the admin pages.
