const router = require('express').Router();
const { auth, requireRole, requirePermission, requireAnyPermission } = require('../middleware/auth');
const erp = require('../controllers/erpController');
const domainCtrl = require('../controllers/domainController');

const adminRoles = ['admin', 'super_admin', 'business_owner', 'store_admin', 'store_manager', 'cashier', 'warehouse_manager', 'accountant', 'employee'];
const adminGuard = [auth, requireRole(...adminRoles)];
const superAdminGuard = [auth, requireRole('super_admin')];
const dashboardGuard = [...adminGuard, requirePermission('erp.view_dashboard')];
const posGuard = [...adminGuard, requireAnyPermission('erp.manage_pos', 'erp.manage_orders', 'erp.manage_finance')];
const inventoryGuard = [...adminGuard, requirePermission('erp.manage_inventory')];
const warehouseGuard = [...adminGuard, requireAnyPermission('erp.manage_warehouse', 'erp.manage_inventory')];
const reportsGuard = [...adminGuard, requirePermission('erp.view_reports')];
const settingsGuard = [...adminGuard, requirePermission('erp.manage_settings')];
const auditGuard = [...adminGuard, requirePermission('erp.view_audit_logs')];

router.get('/dashboard', ...dashboardGuard, erp.getDashboard);
router.get('/bootstrap', ...dashboardGuard, erp.getBootstrap);
router.get('/modules', ...adminGuard, erp.getModules);
router.get('/tenant', ...adminGuard, erp.getTenantInfo);
router.get('/pos/overview', ...posGuard, erp.getPosOverview);
router.get('/inventory/overview', ...inventoryGuard, erp.getInventoryOverview);
router.get('/warehouse/overview', ...warehouseGuard, erp.getWarehouseOverview);
router.post('/warehouse/transfer', ...warehouseGuard, erp.createWarehouseTransfer);
router.post('/warehouse/damage',   ...warehouseGuard, erp.recordDamage);
router.post('/warehouse/count',    ...warehouseGuard, erp.recordStockCount);
router.get('/reports/overview', ...reportsGuard, erp.getReportsOverview);
router.get('/audit-logs', ...auditGuard, erp.getAuditLogs);
router.get('/audit-logs/paginated', ...auditGuard, erp.listAuditLogs);
router.get('/audit-logs/export',    ...auditGuard, erp.exportAuditLogs);
router.get('/settings', ...settingsGuard, erp.getSettings);
router.put('/settings', ...settingsGuard, erp.updateSettings);

// Store Management
router.post('/stores', ...settingsGuard, erp.createStore);
router.put('/stores/:id', ...settingsGuard, erp.updateStore);
router.delete('/stores/:id', ...settingsGuard, erp.deleteStore);

router.get('/businesses', ...superAdminGuard, erp.listBusinesses);
router.get('/stores', ...settingsGuard, erp.listStores);
router.get('/warehouses', ...superAdminGuard, erp.listWarehouses);

router.get('/domains', ...superAdminGuard, domainCtrl.listDomains);
router.post('/domains', ...superAdminGuard, domainCtrl.createDomain);
router.put('/domains/:id', ...superAdminGuard, domainCtrl.updateDomain);
router.delete('/domains/:id', ...superAdminGuard, domainCtrl.deleteDomain);

module.exports = router;
