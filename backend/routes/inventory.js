'use strict';

const router  = require('express').Router();
const multer  = require('multer');
const { auth, requireRole, requirePermission } = require('../middleware/auth');
const inv     = require('../controllers/inventoryController');

const adminRoles = [
  'admin', 'super_admin', 'business_owner', 'store_admin', 'store_manager',
  'cashier', 'warehouse_manager', 'accountant', 'employee',
];
const adminGuard     = [auth, requireRole(...adminRoles)];
const inventoryGuard = [...adminGuard, requirePermission('erp.manage_inventory')];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

router.get('/items',               ...inventoryGuard,                       inv.listItems);
router.post('/items',              ...inventoryGuard,                       inv.createItem);
router.put('/items/:id',           ...inventoryGuard,                       inv.updateItem);
router.delete('/items/:id',        ...inventoryGuard,                       inv.deleteItem);
router.get('/items/:id/movements', ...inventoryGuard,                       inv.getMovements);
router.post('/adjust',             ...inventoryGuard,                       inv.adjustStock);
router.post('/import',             ...inventoryGuard, upload.single('file'), inv.importItems);
router.get('/export',              ...inventoryGuard,                       inv.exportItems);

module.exports = router;
