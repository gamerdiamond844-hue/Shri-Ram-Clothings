const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const erp = require('../controllers/erpController');
const domainCtrl = require('../controllers/domainController');

const adminGuard = [auth, requireRole('admin', 'super_admin', 'business_owner', 'store_admin', 'store_manager', 'cashier', 'warehouse_manager', 'accountant')];
const superAdminGuard = [auth, requireRole('super_admin')];

router.get('/dashboard', ...adminGuard, erp.getDashboard);
router.get('/modules', ...adminGuard, erp.getModules);
router.get('/settings', ...adminGuard, erp.getSettings);
router.get('/tenant', ...adminGuard, erp.getTenantInfo);

router.get('/businesses', ...superAdminGuard, erp.listBusinesses);
router.get('/stores', ...superAdminGuard, erp.listStores);
router.get('/warehouses', ...superAdminGuard, erp.listWarehouses);

router.get('/domains', ...superAdminGuard, domainCtrl.listDomains);
router.post('/domains', ...superAdminGuard, domainCtrl.createDomain);
router.put('/domains/:id', ...superAdminGuard, domainCtrl.updateDomain);
router.delete('/domains/:id', ...superAdminGuard, domainCtrl.deleteDomain);

module.exports = router;
