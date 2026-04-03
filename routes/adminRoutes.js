const express = require('express');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const {
  getAllUsers,
  deleteUser,
  updateUserRole,
  getAllDrivers,
  approveDriver,
  blockDriver,
  getAllRides,
  deleteRide,
  getDashboardStats
} = require('../controllers/adminController');

const router = express.Router();

router.use(auth, requireAdmin);

router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/role', updateUserRole);

router.get('/drivers', getAllDrivers);
router.put('/drivers/:id/approve', approveDriver);
router.put('/drivers/:id/block', blockDriver);

router.get('/rides', getAllRides);
router.delete('/rides/:id', deleteRide);

router.get('/stats', getDashboardStats);

module.exports = router;
