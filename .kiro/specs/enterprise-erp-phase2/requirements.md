# Requirements Document

## Introduction

Phase 2 of the Shri Ram Clothings Enterprise ERP platform extends the fully-deployed Phase 1 system (React 19 + Vite frontend, Express.js + PostgreSQL backend, Socket.IO real-time layer). Phase 2 replaces the Jitsi-embedded communications with a fully owned WebRTC platform, adds POS shift management, enhances warehouse management with zone/rack/bin hierarchy and approval workflows, introduces login history and device tracking, builds advanced multi-dimensional analytics dashboards, extends RBAC with 50+ granular permissions, enforces store-level data isolation across all controllers, enhances the notification system with templates and triggers, adds a full data export/import system, and fixes all known bugs across existing modules.

All new backend code uses parameterized `pg` queries. All new frontend code uses the existing React 19 / Tailwind CSS / Lucide React / inline-styles pattern. No new npm packages may be added unless the required functionality is completely impossible with existing dependencies (`axios`, `socket.io-client`, `react`, `react-router-dom`, `react-hot-toast`, `framer-motion`, `lucide-react`, `tailwindcss`, `socket.io`, `pg`, `jsonwebtoken`, `bcryptjs`, `multer`, `xlsx`, `nodemailer`, `web-push`, `node-cron`).

## Glossary

- **Business_Owner**: User with `business_owner` role; has full access to their business's data.
- **Super_Admin**: Platform-level administrator; can see all businesses and stores.
- **Store_Admin / Store_Manager / Cashier**: Store-scoped roles that must be restricted to their own `store_id`.
- **Warehouse_Manager**: User scoped to a specific warehouse.
- **ERP_System**: The combined Express.js backend + React frontend for the Shri Ram Clothings ERP.
- **Socket_Server**: The Socket.IO server running in `server.js`.
- **WebRTC_Engine**: The browser-native `RTCPeerConnection` + `RTCDataChannel` + ICE/STUN signalling layer added in Phase 2.
- **POS_Session**: A cashier shift tied to a physical counter/device, requiring opening-cash entry and closing reconciliation.
- **POS_Device**: A registered terminal (tablet, desktop, phone) bound to a store with a unique `device_id`.
- **Zone**: A logical area within a warehouse (receiving, dispatch, storage, returns, damaged).
- **Rack**: A physical rack within a zone with a defined capacity.
- **Bin**: The smallest storage unit within a rack, holding specific SKUs.
- **Transfer_Approval**: A two-step workflow where a warehouse transfer request is created by one user and approved/rejected by another.
- **Login_Session**: A record of one authentication event containing IP, user-agent, device fingerprint, and geolocation.
- **Notification_Template**: A reusable title+body template keyed by `template_key` for programmatic notification creation.
- **Analytics_Dashboard**: A set of SVG-rendered charts per module (Revenue, Sales, Inventory, Attendance, Payroll, Warehouse, Communication, Growth).
- **Permission**: A named capability string in format `module.action` (e.g., `pos.open_shift`, `warehouse.approve_transfer`).
- **Granular_RBAC**: Role-based access control enforced at the individual API endpoint and UI component level using the 50+ named permissions.
- **Store_Scoping**: Automatic filtering of all database queries by `store_id` for store-scoped roles.
- **Data_Export_ZIP**: A ZIP archive containing one Excel file per data domain, generated server-side using `xlsx` and streamed to the browser.

---

## Requirements

### Requirement 1: Own-Backend Communication Platform — Group Chat

**User Story:** As an ERP user, I want a feature-complete group chat system backed by our own database, so that I can communicate with colleagues without relying on any third-party hosted service.

#### Acceptance Criteria

1. THE ERP_System SHALL create six new PostgreSQL tables: `src_chat_groups`, `src_chat_group_members`, `src_chat_messages`, `src_call_sessions`, `src_message_pins`, and `src_blocked_users`, with the exact columns specified in the Phase 2 technical brief.
2. WHEN a Business_Owner or Store_Admin creates a group, THE ERP_System SHALL insert a record into `src_chat_groups` scoped to `business_id` and optionally `store_id`, returning the created group with its `id`.
3. WHEN a user sends a message to a group, THE ERP_System SHALL insert the message into `src_chat_messages` with `group_id` set and `thread_id` NULL, and emit a `message:send` Socket.IO event to all members of that group's Socket.IO room.
4. WHEN a user sends a private message, THE ERP_System SHALL insert the message into `src_chat_messages` with `thread_id` set and `group_id` NULL, and emit a `message:send` event to the recipient's `user:<id>` Socket.IO room.
5. WHEN a user edits a message they own, THE ERP_System SHALL update `content`, set `is_edited=TRUE` and `edited_at=NOW()`, and emit `message:edit` to all relevant room members.
6. WHEN a user deletes a message with `deleted_for_everyone=TRUE`, THE ERP_System SHALL set `is_deleted=TRUE` and `deleted_for_everyone=TRUE` on the record and emit `message:delete`; THE ERP_System SHALL NOT physically remove the row.
7. WHEN `getMessages` is called with a cursor, THE ERP_System SHALL return messages paginated with 50 messages per page, ordered by `created_at DESC`, excluding rows where `is_deleted=TRUE AND deleted_for_everyone=TRUE` for non-admin callers.
8. WHEN a user reacts to a message, THE ERP_System SHALL merge the emoji key into the `reactions JSONB` column using a JSONB update and emit `message:react` to the room.
9. WHEN a message is read by a user, THE ERP_System SHALL add the user's id to `read_by JSONB` and emit `message:read` back to the sender's room.
10. THE ERP_System SHALL expose endpoints `pinMessage`, `unpinMessage`, `listPinnedMessages`, `starMessage`, `unstarMessage`, `listStarredMessages`, `forwardMessage`, and `searchMessages` in `communicationsController.js`, all scoped by `business_id`.
11. WHEN `searchMessages` is called with a query string of at least 3 characters, THE ERP_System SHALL perform a case-insensitive full-text search on `content` within the business scope and return up to 50 matches with highlighted context.
12. WHEN a user is blocked by another user, THE ERP_System SHALL insert into `src_blocked_users` and prevent the blocked user's messages from appearing in the blocker's message list.

---

### Requirement 2: Own-Backend Communication Platform — WebRTC Calls

**User Story:** As an ERP user, I want to make audio and video calls directly within the ERP panel using our own WebRTC infrastructure, so that I am not dependent on Jitsi or any external meeting service.

#### Acceptance Criteria

1. THE ERP_System SHALL remove all references to `meet.jit.si` and the `JitsiMeetExternalAPI` script from `AdminVideoCalls.jsx` and `AdminVoiceCalls.jsx`.
2. WHEN a caller initiates a call, THE Socket_Server SHALL emit `call:initiate` containing `{callId, callerId, calleeId, callType, offer}` to the callee's `user:<id>` room, and insert a record into `src_call_sessions` with `status='ringing'`.
3. WHEN the callee accepts, THE Socket_Server SHALL relay `call:accept` containing the SDP answer back to the caller, and update `src_call_sessions` to `status='active'` and `started_at=NOW()`.
4. WHEN the callee rejects, THE Socket_Server SHALL emit `call:reject` to the caller and update `src_call_sessions` to `status='rejected'`.
5. WHEN either party ends the call, THE Socket_Server SHALL emit `call:end` to all call participants and update `src_call_sessions` with `status='ended'`, `ended_at=NOW()`, and `duration_seconds` calculated from `started_at`.
6. THE Socket_Server SHALL relay `call:ice-candidate` messages between both call participants to complete ICE negotiation.
7. THE WebRTC_Engine SHALL use `stun:stun.l.google.com:19302` and `stun:stun1.l.google.com:19302` as ICE STUN servers in `RTCPeerConnection` configuration.
8. WHEN a call goes unanswered for 60 seconds, THE ERP_System SHALL automatically update `src_call_sessions` to `status='missed'` and emit `call:end` to the caller.
9. THE `AdminVideoCalls.jsx` component SHALL render a full-screen overlay with: participant video tiles, mute/unmute toggle, camera on/off toggle, screen share button, raise-hand indicator, and a connection-quality badge showing "Good / Fair / Poor" based on ICE connection state.
10. THE `AdminVoiceCalls.jsx` component SHALL render an audio-call overlay with: mute toggle, hold toggle, speaker selection (where browser API permits), a live call-duration timer counting up from 00:00, and a reconnect button.
11. WHEN the ICE connection state becomes `failed` or `disconnected`, THE WebRTC_Engine SHALL attempt one automatic reconnect by re-triggering the offer/answer exchange before showing the reconnect button.
12. THE ERP_System SHALL expose `initiateCall`, `acceptCall`, `rejectCall`, `endCall`, and `listCallHistory` REST endpoints in `communicationsController.js`, all requiring JWT authentication.

---

### Requirement 3: Own-Backend Communication Platform — Admin Moderation & Media

**User Story:** As a Super_Admin or Business_Owner, I want to view all conversations, deleted messages, and call logs, and moderate content, so that I can maintain compliance and workplace standards.

#### Acceptance Criteria

1. WHEN a Super_Admin calls `adminGetAllConversations`, THE ERP_System SHALL return all private threads and groups within the business scope, including participant names, last message preview, and unread count.
2. WHEN a Super_Admin calls `adminGetDeletedMessages`, THE ERP_System SHALL return all rows from `src_chat_messages` where `is_deleted=TRUE`, including the original `content`, `sender_id`, deletion timestamp, and whether it was deleted for everyone.
3. WHEN a Super_Admin calls `adminGetCallLogs`, THE ERP_System SHALL return all rows from `src_call_sessions` for the business, including caller name, callee name, call type, status, duration, and timestamp.
4. THE `AdminConversationMonitor.jsx` component SHALL display three tabs: Active Conversations, Deleted Messages, and Call Logs, each with sortable columns and a date-range filter.
5. WHEN a user calls `getMediaGallery` for a thread or group, THE ERP_System SHALL return all messages where `message_type IN ('image','video','document')` ordered by `created_at DESC`, with `attachment_url`, `attachment_name`, `attachment_size`, and `message_type`.
6. WHEN a message is reported via `reportMessage`, THE ERP_System SHALL insert into `src_moderation_logs` and notify the Super_Admin via the notification system.
7. THE `AdminChatSupport.jsx` component SHALL render: group list sidebar, message thread with emoji picker (using Unicode emoji codes without external library), reply-to-message threading (showing quoted parent), file/image attachment preview, voice note record button (using `MediaRecorder` browser API), pinned messages banner, full-text search bar, and unread count badge per group.
8. THE `AdminPrivateChat.jsx` component SHALL render all features listed in 3.7 plus a block/report menu on the participant's name.

---

### Requirement 4: POS Shift Management

**User Story:** As a Store_Admin, I want to manage cashier shifts with opening and closing cash entries and device registration, so that I can reconcile daily cash and track who operated each terminal.

#### Acceptance Criteria

1. THE ERP_System SHALL add columns `opening_cash`, `closing_cash`, `expected_cash`, `difference`, `notes`, `approved_by`, `device_id`, and `counter_name` to the existing `src_erp_pos_sessions` table via an ALTER TABLE migration.
2. THE ERP_System SHALL create a new `src_erp_pos_devices` table with columns: `id`, `business_id`, `store_id`, `device_name`, `device_type`, `serial_number`, `assigned_employee_id`, `is_active`, `last_active_at`, `created_at`.
3. WHEN a cashier opens a shift via `openShift`, THE ERP_System SHALL require `opening_cash` (numeric, ≥ 0) and `device_id` in the request body; IF either is missing THEN THE ERP_System SHALL return HTTP 400 with a descriptive error message.
4. WHEN a cashier closes a shift via `closeShift`, THE ERP_System SHALL calculate `expected_cash = opening_cash + sum(cash sales during shift)`, compute `difference = closing_cash - expected_cash`, and record `approved_by = NULL` (pending reconciliation approval).
5. WHEN a Store_Admin reconciles a shift via `reconcileShift`, THE ERP_System SHALL set `approved_by = req.user.id` and update the session status to `'reconciled'`.
6. THE `AdminPos.jsx` component SHALL display a shift-opening modal on load IF no active session exists for the current user and device; THE ERP_System SHALL prevent any sale from being created IF no active session exists for the cashier.
7. THE `AdminPosShifts.jsx` page SHALL display shift history with columns: date, cashier name, device, opening cash, closing cash, expected cash, difference, status; and allow filtering by date range and store.
8. WHEN a POS device is registered via `registerDevice`, THE ERP_System SHALL insert into `src_erp_pos_devices` scoped by `business_id` and `store_id`.
9. THE `AdminPosShifts.jsx` page SHALL include a Device Management tab that lists all registered devices and allows deactivation.

---

### Requirement 5: Enhanced Warehouse Management — Zones, Racks, Bins

**User Story:** As a Warehouse_Manager, I want to organise stock into zones, racks, and bins within each warehouse, so that I can locate and move items with precision.

#### Acceptance Criteria

1. THE ERP_System SHALL create three new PostgreSQL tables: `src_warehouse_zones`, `src_warehouse_racks`, and `src_warehouse_bins` with the columns specified in the Phase 2 technical brief.
2. WHEN a user calls `createZone`, THE ERP_System SHALL validate that `zone_type IN ('receiving','dispatch','storage','returns','damaged')` and that `warehouse_id` belongs to the user's business; IF validation fails THEN THE ERP_System SHALL return HTTP 400.
3. WHEN a user calls `createBin`, THE ERP_System SHALL validate that `rack_id` belongs to a rack within the user's business; THE ERP_System SHALL update `rack.capacity` accounting and return the created bin.
4. THE `AdminWarehouse.jsx` component SHALL add a "Zone / Rack / Bin" tab that renders a three-column drill-down: selecting a warehouse shows its zones; selecting a zone shows its racks; selecting a rack shows its bins with current items.

---

### Requirement 6: Enhanced Warehouse Management — Transfer Approval Workflow

**User Story:** As a Business_Owner, I want warehouse transfers to go through an approval process, so that unauthorised stock movements are prevented.

#### Acceptance Criteria

1. THE ERP_System SHALL create a `src_transfer_approvals` table with columns: `id`, `transfer_id`, `requested_by`, `approved_by`, `status` (pending/approved/rejected), `notes`, `created_at`.
2. WHEN a Warehouse_Manager calls `requestTransfer`, THE ERP_System SHALL insert a record into `src_transfer_approvals` with `status='pending'` and trigger a notification to all users with the `warehouse.approve_transfer` permission.
3. WHEN a Store_Admin or Business_Owner calls `approveTransfer`, THE ERP_System SHALL update `status='approved'`, execute the stock movement transaction, and notify the requester.
4. WHEN a Store_Admin or Business_Owner calls `rejectTransfer`, THE ERP_System SHALL update `status='rejected'`, add the rejection `notes`, and notify the requester.
5. THE `AdminWarehouse.jsx` component SHALL display a "Pending Approvals" badge on the tab and an approval queue with approve/reject buttons visible only to users with `warehouse.approve_transfer` permission.
6. WHEN `getWarehouseAnalytics` is called, THE ERP_System SHALL return: stock value per zone, movement trend for the last 30 days (daily), and utilisation rate (items / capacity) per rack.

---

### Requirement 7: Login History, Device Tracking, and Session Management

**User Story:** As a Business_Owner, I want to see a full log of all login events for all my users, with device and location details, and be able to terminate suspicious sessions remotely, so that I can protect account security.

#### Acceptance Criteria

1. THE ERP_System SHALL add columns `device_fingerprint` (VARCHAR 255), `location_city` (VARCHAR 100), `location_country` (VARCHAR 100), and `is_suspicious` (BOOLEAN DEFAULT FALSE) to the existing `src_login_sessions` table via an ALTER TABLE migration.
2. WHEN a user logs in via `login`, THE ERP_System SHALL parse the `User-Agent` header to extract `device_type` (mobile/tablet/desktop), `browser`, and `os`, and store them alongside `ip_address` in `src_login_sessions`.
3. WHEN a login originates from a new IP not seen in the last 30 days for that user, THE ERP_System SHALL set `is_suspicious=TRUE` on the new session record.
4. THE ERP_System SHALL expose `getLoginHistory` (returns last 100 events for a user), `getActiveSessions` (returns sessions where `is_active=TRUE`), `terminateSession` (sets `is_active=FALSE` on one session), and `terminateAllSessions` (sets `is_active=FALSE` on all sessions except current) endpoints in `authController.js`.
5. WHEN `terminateSession` is called for a session belonging to a different user, THE ERP_System SHALL return HTTP 403 UNLESS the caller is a Super_Admin or Business_Owner.
6. THE `AdminLoginHistory.jsx` page SHALL render: a table of login events with columns timestamp, IP address, location, device type, browser, OS, status (active/ended), suspicious flag; an "Active Sessions" panel below the table showing only active sessions with a "Terminate" button per row; and a red alert banner at the top if any `is_suspicious=TRUE` session exists.

---

### Requirement 8: Advanced Analytics Dashboards

**User Story:** As a Business_Owner, I want a dedicated analytics panel with eight domain-specific dashboards rendered as inline SVG charts, so that I can make data-driven decisions without leaving the ERP.

#### Acceptance Criteria

1. THE ERP_System SHALL add eight analytics endpoints to `reportController.js`: `getRevenueAnalytics`, `getSalesAnalytics`, `getInventoryAnalytics`, `getAttendanceAnalytics`, `getPayrollAnalytics`, `getWarehouseAnalytics`, `getCommunicationAnalytics`, and `getGrowthAnalytics`, all accepting a `period` query parameter (`day`, `week`, `month`, `year`) and optional `from`/`to` date range.
2. WHEN `getRevenueAnalytics` is called, THE ERP_System SHALL return: daily revenue array for the selected period, comparison array for the prior equivalent period, total revenue, and percentage change vs prior period.
3. WHEN `getGrowthAnalytics` is called, THE ERP_System SHALL return month-over-month (MoM) and year-over-year (YoY) revenue growth rates as percentages, with the underlying monthly and yearly revenue arrays.
4. WHEN `getSalesAnalytics` is called, THE ERP_System SHALL return breakdown by store, by cashier, by product category, and by payment method, each as an array of `{label, value}` objects.
5. THE `AdminAnalytics.jsx` component SHALL render eight tab-panels; each panel SHALL contain at least one inline SVG chart (line, bar, pie, or area as appropriate) with labelled axes and a legend; THE component SHALL NOT import any charting library.
6. THE `AdminAnalytics.jsx` component SHALL include a date-range selector with five presets: Today, Last 7 Days, Last 30 Days, Last 3 Months, This Year; selecting a preset SHALL re-fetch all analytics endpoints for the active tab.
7. THE `AdminAnalytics.jsx` component SHALL include an "Export to Excel" button per tab that downloads a single `.xlsx` file using the existing `/erp/reports/export` endpoint, and a "Print" button that triggers `window.print()` with an appropriate CSS print media query.
8. WHEN `getCommunicationAnalytics` is called, THE ERP_System SHALL return: total messages sent per day, total call minutes per day, and count of active users in the last 7 days, all scoped by `business_id`.

---

### Requirement 9: Enhanced RBAC — Granular Permissions

**User Story:** As a Super_Admin, I want 50+ specific permissions covering every ERP action, so that I can configure roles with precise, least-privilege access.

#### Acceptance Criteria

1. THE ERP_System SHALL seed at minimum 50 named permissions in the `src_permissions` table grouped into 11 categories: POS, Inventory, Warehouse, Sales, Purchases, HR, Finance, Reports, Settings, Communication, and Admin; each permission SHALL follow the `module.action` naming convention.
2. THE permissions seed SHALL include at minimum: `pos.open_shift`, `pos.close_shift`, `pos.void_bill`, `pos.apply_discount`, `inventory.adjust`, `inventory.import`, `inventory.export`, `warehouse.transfer`, `warehouse.approve_transfer`, `warehouse.manage_zones`, `reports.export`, `reports.analytics`, `customers.delete`, `customers.export`, `suppliers.delete`, `employees.salary`, `employees.delete`, `settings.backup`, `settings.restore`, `communication.moderate`, `communication.call`, `admin.manage_roles`, `admin.view_audit`, `admin.manage_users`.
3. WHEN the `AdminRoleManagement.jsx` page loads, THE ERP_System SHALL return all permissions grouped by their 11 categories from `GET /erp/roles/permissions`.
4. THE `AdminRoleManagement.jsx` component SHALL render a visual permission matrix: the left panel lists roles; the right panel shows permission checkboxes grouped by category with a header count badge.
5. THE `AdminRoleManagement.jsx` component SHALL include three preset buttons: "Cashier Preset" (enables only POS and Communication permissions), "Manager Preset" (enables POS, Inventory, Sales, Reports, Communication), and "Accountant Preset" (enables Finance, Reports, Purchases); clicking a preset SHALL populate the checkboxes for the active role.

---

### Requirement 10: Store-Level Data Isolation Enforcement

**User Story:** As a Business_Owner, I want store-scoped roles to be unable to access data from other stores, so that each branch's data remains confidential and secure.

#### Acceptance Criteria

1. THE ERP_System SHALL add a `getScopedStoreId` helper function to every controller that currently lacks it: `posController.js`, `inventoryController.js`, `customerErpController.js`, `supplierController.js`, `purchaseController.js`, `returnController.js`, `attendanceController.js`, `expenseController.js`, and `payrollController.js`.
2. WHEN a user with role `store_admin`, `store_manager`, or `cashier` calls any ERP list or create endpoint, THE ERP_System SHALL automatically append `AND store_id = $n` to every query where `store_id` is a column on the target table.
3. WHEN a store-scoped user attempts to retrieve, update, or delete a record whose `store_id` does not match the user's `store_id`, THE ERP_System SHALL return HTTP 403 with message `"Access denied: store scope violation"`.
4. THE ERP_System SHALL add a `warehouse_id` scope check: WHEN a `warehouse_manager` user calls any inventory endpoint, THE ERP_System SHALL filter by `warehouse_id = req.user.warehouse_id`.
5. WHEN a `super_admin` calls any endpoint with no tenant context, THE ERP_System SHALL NOT apply any store or business filter, enabling cross-business oversight.

---

### Requirement 11: Notification System Enhancement

**User Story:** As a Business_Owner, I want notifications to be created from reusable templates and triggered automatically by ERP events, so that users are always informed about actionable items without manual admin intervention.

#### Acceptance Criteria

1. THE ERP_System SHALL create a `src_notification_templates` table with columns: `id`, `template_key` (UNIQUE), `title_template`, `body_template`, `type`, `is_active`, `created_at`.
2. THE ERP_System SHALL add columns `reference_id` (INTEGER), `reference_type` (VARCHAR 50), and `action_url` (VARCHAR 255) to the existing `src_notifications` table via an ALTER TABLE migration.
3. THE ERP_System SHALL seed notification templates for: `low_stock` (inventory item below reorder level), `transfer_pending` (warehouse transfer awaiting approval), `new_message` (private chat), `missed_call`, `payroll_processed`, `attendance_marked`, and `suspicious_login`.
4. WHEN inventory stock falls to or below `reorder_level` after a sale, THE ERP_System SHALL call `createNotification` with `template_key='low_stock'` targeting all users with `inventory.adjust` permission in the business.
5. WHEN a new private message is sent, THE ERP_System SHALL call `createNotification` with `template_key='new_message'` targeting the recipient, with `action_url='/admin/private-chat'` and `reference_id=thread_id`.
6. THE ERP_System SHALL expose `markAllRead`, `deleteNotification`, and `getUnreadCount` endpoints in `notificationController.js`.
7. THE notification bell in `AdminDashboard.jsx` SHALL display an unread count badge; clicking it SHALL open a dropdown with three tabs: ERP notifications, Chat notifications, System notifications; each notification row SHALL be clickable and navigate to `action_url`.
8. THE ERP_System SHALL emit a Socket.IO `notification:new` event to the target user's `user:<id>` room whenever a notification is created, so the unread badge updates in real time without polling.

---

### Requirement 12: Data Export and Import System

**User Story:** As a Business_Owner, I want to export all business data as a ZIP of Excel files and re-import it later, so that I can back up, migrate, or audit the data offline.

#### Acceptance Criteria

1. WHEN `exportAllData` is called, THE ERP_System SHALL query all major data tables scoped by `business_id` (customers, inventory items, sales, sale items, purchases, expenses, attendance records, payroll records, employees, suppliers), build one XLSX sheet per domain using the existing `xlsx` package, zip all sheets into one archive using Node.js `zlib` streams or the built-in `archiver` pattern with `Buffer` concatenation, and stream the response with `Content-Type: application/zip` and `Content-Disposition: attachment; filename="export-YYYYMMDD.zip"`.
2. WHEN `importAllData` is called with a previously exported ZIP, THE ERP_System SHALL parse each sheet, validate required columns for each domain (e.g., `sku` and `title` for inventory, `customer_code` and `name` for customers), perform `INSERT ... ON CONFLICT DO NOTHING` for duplicate detection, and return a summary `{domain, inserted, skipped, errors[]}` array.
3. IF any sheet in the import fails validation, THE ERP_System SHALL skip that sheet entirely, include its errors in the response, and continue processing remaining sheets.
4. THE `AdminSettings.jsx` component SHALL add a "Data Management" tab containing: a "Full Export" button that triggers the ZIP download, individual "Export" buttons for each module, an "Import Data" section with a file upload input accepting `.zip` files only, a preview table showing domain/inserted/skipped/errors after upload, and a "Confirm Import" button that calls the import endpoint.

---

### Requirement 13: Bug Fixes — Existing Module Audit

**User Story:** As a developer, I want all known bugs in Phase 1 modules to be fixed, so that the ERP operates reliably across all browsers and edge cases.

#### Acceptance Criteria

1. WHEN `AdminPos.jsx` scans a barcode with a USB or keyboard scanner, THE ERP_System SHALL correctly match the barcode against `src_erp_inventory_items.barcode` using an exact match before falling back to SKU and title ILIKE search; the search input SHALL have `autoComplete="off"` and accept rapid keystroke input without losing characters.
2. WHEN a split payment is submitted in `AdminPos.jsx` with amounts that do not sum to the total within ±₹1 tolerance, THE ERP_System SHALL display an inline validation error message below the split payment row, NOT a toast.
3. WHEN thermal print is triggered in `AdminPos.jsx`, the print CSS SHALL include `@media print { body { width: 80mm; } }` and hide all non-invoice elements.
4. WHEN `AdminInventory.jsx` CSV import encounters row-level errors, THE ERP_System SHALL return `{success: false, errors: [{row, message}]}` and the frontend SHALL render each error in a red-bordered table below the import button.
5. WHEN `AdminInventory.jsx` barcode preview is shown, THE component SHALL render the barcode as a valid SVG string using the existing `BarcodeEngine.jsx` component, NOT attempt to load an external barcode library.
6. WHEN `AdminWarehouse.jsx` transfer form is submitted, THE ERP_System SHALL verify that `current_stock >= quantity` in the source warehouse before committing; IF insufficient THEN the backend SHALL return HTTP 422 and the frontend SHALL display the error inline.
7. WHEN `AdminReports.jsx` loads any of the 7 report types, THE ERP_System SHALL return a non-empty response even if no data exists (empty arrays, zeros for numeric fields); the frontend SHALL display a "No data for this period" message rather than a blank or crashed panel.
8. WHEN `AdminAttendance.jsx` renders the monthly grid, THE component SHALL correctly handle February (28/29 days) and months with 30 or 31 days without rendering blank columns or crashing.
9. WHEN the payroll export button is clicked in `AdminPayroll.jsx`, the frontend SHALL call `GET /api/erp/payroll/export` (NOT `/erp/payroll/export` without the `/api` prefix) and receive a valid XLSX blob.
10. ALL forms in Phase 1 modules SHALL display `required` field validation messages using HTML5 `setCustomValidity` or a consistent inline error pattern BEFORE making any API call.
11. ALL export buttons across the ERP SHALL use `URL.createObjectURL(blob)` → `<a>.click()` → `URL.revokeObjectURL()` in that exact order to ensure correct downloads in Chromium, Firefox, and Safari.
12. ALL sidebar navigation items in `erpConfig.js` SHALL resolve to existing, mounted React components; any `componentKey` without a corresponding component import in `AdminModuleWorkspace.jsx` SHALL be added.
