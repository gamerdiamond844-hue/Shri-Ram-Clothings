# Phase 2 Implementation Tasks

## Overview
All 33 Phase 1 tasks are complete. These tasks implement the remaining enterprise features.

## Tasks

- [ ] P2-1. Chat schema extensions — message status, reactions, edit/delete, pin, star
  - Add columns to `src_private_chat_messages`: `status` (sent/delivered/read), `edited_at TIMESTAMP`, `deleted_for_sender BOOLEAN`, `deleted_for_all BOOLEAN`, `reply_to_id INTEGER REFERENCES src_private_chat_messages(id)`, `is_pinned BOOLEAN DEFAULT FALSE`, `is_starred_by JSONB DEFAULT '[]'`
  - Create `src_message_reactions (id, message_id, user_id, emoji, created_at)`
  - Create `src_erp_call_logs (id, business_id, caller_id, callee_id, start_time, end_time, duration_seconds, call_type, status, created_at)`
  - Create `src_warehouse_zones (id, warehouse_id, business_id, name, zone_type, capacity, is_active, created_at)`
  - Create `src_warehouse_bins (id, zone_id, warehouse_id, business_id, bin_code, description, is_active, created_at)`
  - Add `session_id INTEGER` column to `src_erp_sales` referencing `src_erp_pos_sessions`
  - Add `zone_id INTEGER, bin_id INTEGER` columns to `src_erp_inventory_items`
  - Add transfer approval columns to `src_erp_inventory_movements`: `approval_status VARCHAR(20) DEFAULT 'completed'`, `approved_by INTEGER`, `approved_at TIMESTAMP`
  - Create `src_erp_transfer_requests (id, business_id, inventory_item_id, from_warehouse_id, to_warehouse_id, quantity, notes, status, requested_by, approved_by, created_at, updated_at)`
  - _Dependencies: Phase 1 complete_

- [ ] P2-2. Chat backend — read receipts, reactions, edit, delete, pin, star
  - Extend `communicationsController.js` with: `markMessagesRead`, `addReaction`, `removeReaction`, `editMessage`, `deleteMessageForMe`, `deleteMessageForAll`, `pinMessage`, `starMessage`, `getStarredMessages`, `searchThreadMessages`, `getThreadMedia`
  - `markMessagesRead`: update `status='read'` for all messages in thread sent by the other party; emit `read_receipt` via Socket.IO
  - `addReaction`: upsert into `src_message_reactions`; emit `reaction:update` to thread participants
  - `editMessage`: update `message` + set `edited_at=NOW()`; only within 24h; emit `message:edit`
  - `deleteMessageForAll`: set `deleted_for_all=TRUE`; emit `message:delete`
  - Add routes to `communications.js`: `POST /private-threads/:id/messages/:msgId/react`, `DELETE /private-threads/:id/messages/:msgId/react`, `PUT /private-threads/:id/messages/:msgId`, `DELETE /private-threads/:id/messages/:msgId`, `POST /private-threads/:id/messages/:msgId/pin`, `GET /starred-messages`, `POST /messages/:msgId/star`, `GET /private-threads/:id/media`
  - Update Socket.IO handler in `server.js` to: emit `read_receipt` on thread join, handle `reaction:add`, `message:edit`, `message:delete` events
  - _Dependencies: P2-1_

- [ ] P2-3. Chat frontend — full-featured `AdminPrivateChat.jsx`
  - Rewrite `AdminPrivateChat.jsx` with:
    - Thread list with unread count badge (orange), last message preview, online indicator
    - Message bubbles: own messages right-aligned (orange), others left-aligned (grey)
    - Delivered/read tick icons (single tick = delivered, double tick = read, blue = seen)
    - Emoji reaction bar on hover (6 quick emojis + picker button)
    - Reply-to: quote bar above input when replying
    - Message context menu (right-click / long-press): Reply, Forward, Copy, Edit (own), Delete for Me, Delete for Everyone (own), Pin, Star
    - Pinned messages drawer accessible from thread header pin icon
    - Media gallery tab in thread header — grid of all shared images/files
    - Search bar within thread (client-side filter on loaded messages)
    - Starred Messages panel accessible from sidebar star icon
    - Thread options: Mute, Archive, Block
    - Typing indicator ("User is typing…")
    - Scroll-to-bottom button when not at bottom
    - Real-time updates via Socket.IO for all events
  - _Dependencies: P2-2_

- [ ] P2-4. WebRTC calling — backend signalling
  - Add Socket.IO event handlers in `server.js` for WebRTC signalling:
    - `call:initiate` → store pending call, emit `call:incoming` to callee's user room
    - `call:accept` → emit `call:accepted` to caller
    - `call:reject` → emit `call:rejected` to caller; insert call log with status `missed`
    - `call:ice-candidate` → relay ICE candidate to other peer
    - `call:offer` → relay SDP offer to callee
    - `call:answer` → relay SDP answer to caller
    - `call:end` → emit `call:ended` to both peers; insert/update `src_erp_call_logs`
    - `call:busy` → emit `call:busy` to caller if callee is already in a call
  - Add REST endpoint `GET /api/erp/communications/call-logs` → list call logs for current user (paginated, filterable by type/date)
  - Add REST endpoint `GET /api/erp/communications/call-logs/all` (admin only) → all call logs for business
  - _Dependencies: P2-1_

- [ ] P2-5. WebRTC calling — frontend `AdminPrivateChat.jsx` + `AdminVoiceCalls.jsx` + `AdminVideoCalls.jsx`
  - Add in-app calling to `AdminPrivateChat.jsx`:
    - Phone icon (voice) and video icon in thread header to initiate calls
    - Incoming call modal overlay: caller name/avatar, Accept (green) and Reject (red) buttons
    - Active call panel: local video (small, top-right corner), remote video (full), mute, camera toggle, end call, duration timer
    - Call uses `RTCPeerConnection` with STUN server `stun:stun.l.google.com:19302`
    - ICE candidates exchanged via Socket.IO `call:ice-candidate` events
  - Rewrite `AdminVoiceCalls.jsx` and `AdminVideoCalls.jsx` to use the same in-house WebRTC stack:
    - List of active users in the business (online indicator from Socket.IO)
    - Click to call any user
    - Call history table from `GET /api/erp/communications/call-logs`
    - No Jitsi dependency
  - _Dependencies: P2-4_

- [ ] P2-6. POS Shift Management — backend
  - Extend `posController.js` with: `openShift`, `closeShift`, `getActiveShift`, `listShifts`
  - `openShift`: insert into `src_erp_pos_sessions` with `status='open'`; return 409 if cashier already has open shift
  - `closeShift`: compute `total_sales` from completed bills in this session; update session with `closing_cash`, `total_bills`, `total_sales`, `closed_at`, `status='closed'`; call `logAudit`
  - `getActiveShift`: return current open session for authenticated user+store
  - `listShifts`: paginated list of sessions for store with cashier name join
  - Add routes to `routes/pos.js`: `POST /shift/open`, `POST /shift/close`, `GET /shift/active`, `GET /shifts`
  - Update `createSale` to attach `session_id` from the active open shift
  - _Dependencies: P2-1_

- [ ] P2-7. POS Shift Management — frontend
  - Add shift gate to `AdminPos.jsx`: IF no active shift, render ShiftOpenForm (opening cash input, start shift button); ELSE render full POS UI with shift info bar (shift #, cashier, opened at, running total)
  - Add "Close Shift" button to POS that opens ShiftCloseModal: expected cash, actual cash input, variance display, confirm close
  - Add "Shift History" tab to `AdminPos.jsx` (or separate panel) showing past shifts table
  - _Dependencies: P2-6_

- [ ] P2-8. Advanced Warehouse — zones, bins, transfer approvals
  - Extend `erpController.js` (or new `warehouseController.js`) with:
    - `listZones`, `createZone`, `updateZone` — scoped to warehouse_id + business_id
    - `listBins`, `createBin`, `updateBin` — scoped to zone_id
    - `createTransferRequest`: insert into `src_erp_transfer_requests` with status `pending_approval`; emit Socket.IO notification to warehouse managers
    - `listTransferRequests`: list pending/all transfers for business with filters
    - `approveTransfer`: requires `erp.approve_transfers` permission; check stock, insert movements, update request status to `completed`; call `logAudit`
    - `rejectTransfer`: update status to `rejected`; call `logAudit`
  - Add routes to `routes/erp.js` or new `routes/warehouse.js`:
    - `GET/POST /warehouse/zones`, `PUT /warehouse/zones/:id`
    - `GET/POST /warehouse/bins`, `PUT /warehouse/bins/:id`
    - `GET/POST /warehouse/transfer-requests`, `POST /warehouse/transfer-requests/:id/approve`, `POST /warehouse/transfer-requests/:id/reject`
  - Seed `erp.approve_transfers` permission into `src_permissions`
  - _Dependencies: P2-1_

- [ ] P2-9. Advanced Warehouse — frontend `AdminWarehouse.jsx`
  - Add "Zones & Bins" tab to `AdminWarehouse.jsx`:
    - Per-warehouse zone list with create/edit forms
    - Per-zone bin list with create/edit forms
  - Add "Transfer Requests" tab:
    - Create transfer request form (item, from warehouse, to warehouse, quantity, notes)
    - Pending requests table with Approve / Reject buttons (shown only to users with `erp.approve_transfers`)
    - Transfer history table with status badges
  - Update stock transfer UI to use the approval workflow (replace old direct-transfer form)
  - _Dependencies: P2-8_

- [ ] P2-10. Login history & session tracking — backend
  - Extend `authController.js` `login` function to insert into `src_login_sessions` using `req.ip`, `req.headers['user-agent']` (parse browser/OS/device with basic UA parsing — no new npm package, inline regex)
  - Add `POST /api/auth/logout` route that sets `is_active=FALSE` on the user's latest active session
  - Extend `auth` middleware to check if the user has any active session; IF `src_login_sessions` has no `is_active=TRUE` row for this user (i.e., force-terminated), return HTTP 401 — gate only on admin-role users to avoid performance impact on customer-facing APIs
  - Add `GET /api/erp/sessions/live` (super_admin only) → all active sessions across business
  - Add `DELETE /api/erp/sessions/:sessionId` (super_admin only) → force-terminate session
  - Add `GET /api/erp/sessions/history?userId=` → login history for a user (last 200)
  - _Dependencies: Phase 1 complete (src_login_sessions table already exists in db.js)_

- [ ] P2-11. Login history — frontend
  - Add "Live Sessions" tab to `AdminSuperAdmin.jsx`:
    - Table of active sessions: user name, role, IP, browser, OS, logged in at, Force Logout button
    - Auto-refresh every 30 seconds
  - Add "Login History" tab to `AdminSuperAdmin.jsx`:
    - User selector, date range filter, session table (IP, browser, OS, logged in, logged out, duration)
  - Add a "My Sessions" view to the employee profile / settings page showing own login history
  - _Dependencies: P2-10_

- [ ] P2-12. Role-based dashboard — backend endpoint
  - Add `GET /api/erp/dashboard/role` endpoint in `erpController.js`
  - Returns different data payloads based on `req.user.role`:
    - `super_admin`/`admin`: cross-business totals, top 5 businesses by revenue, total platform users, total sales all time
    - `business_owner`: business-scoped: stores breakdown, monthly revenue trend (12 months), top 5 stores, expense vs profit
    - `store_admin`/`store_manager`: store-scoped: today's bills, cashier activity, low stock alerts, top 5 products this month
    - `warehouse_manager`: warehouse-scoped: stock value, pending transfer requests, out-of-stock count, recent movements
    - `accountant`: business-scoped: P&L this month, expense by category, outstanding payables, GST liability estimate
    - `cashier`/`employee`: personal bills today, attendance this month (present/absent/leave count)
  - _Dependencies: Phase 1 complete_

- [ ] P2-13. Role-based dashboard — frontend `AdminOverview.jsx`
  - Extend the existing `AdminOverview.jsx` role-based ERP section to call `GET /api/erp/dashboard/role`
  - Render role-specific KPI cards and charts using the existing inline SVG `BarChart` and `LineChart` components
  - Each role variant uses a distinct colour accent (super_admin: purple, business_owner: orange, store_manager: blue, warehouse: green, accountant: teal, cashier: grey)
  - Add a 12-month revenue trend chart for business_owner role
  - Add store-breakdown table (store name, revenue this month, bills count) for business_owner
  - Add "Export Dashboard" button that triggers browser print (PDF)
  - _Dependencies: P2-12_

- [ ] P2-14. Super Admin System Health & Global Analytics
  - Add "System Health" tab to `AdminSuperAdmin.jsx`:
    - Cards: Total Businesses, Total Stores, Total Users, Total Products, Total Sales (all time), Inventory Value, Server Uptime
    - Data from new `GET /api/erp/system/health` endpoint (super_admin only)
  - Add "Global Revenue" tab:
    - Monthly revenue per business as a horizontal bar chart (inline SVG)
    - Cumulative platform revenue number
    - Data from `GET /api/erp/system/global-revenue`
  - Add "All Users" tab:
    - Searchable, paginated user table across all businesses: name, email, role, business name, last login, active session indicator
    - Data from `GET /api/erp/system/users`
  - _Dependencies: P2-10, P2-12_

- [ ] P2-15. Data isolation audit & fixes
  - Audit every ERP controller for missing `business_id` / `store_id` scope:
    - `inventoryController.js` — verify all queries include `business_id = $N`
    - `posController.js` — verify hold bills and sales are scoped
    - `customerErpController.js` — verify customer list, history, adjustments
    - `supplierController.js` — verify supplier list and ledger
    - `purchaseController.js` — verify POs and GRNs
    - `returnController.js` — verify returns
    - `reportController.js` — verify all report queries
    - `attendanceController.js` — verify grid and export
    - `expenseController.js` — verify list and export
    - `payrollController.js` — verify list and export
  - For any query found without proper business scoping, add the missing WHERE clause
  - Add an integration test script `backend/scripts/isolation_audit.js` that queries each table without business_id scope and reports unscoped rows
  - _Dependencies: Phase 1 complete_

## Notes

- No new npm packages. Use existing: `socket.io`, `pg`, `xlsx`, `jsonwebtoken`, `bcryptjs`, `lucide-react`, `react-hot-toast`
- WebRTC uses browser native APIs — no additional library needed
- All new Socket.IO events follow the pattern: `namespace:action` (e.g., `call:initiate`, `message:edit`)
- Inline SVG charts — reuse existing BarChart and LineChart components from AdminOverview.jsx
- Every new backend function calls `logAudit` for state-changing operations
- All new routes are added to existing route files — no new server.js mounts needed (all under `/api/erp/communications`, `/api/erp`, `/api/auth`)
