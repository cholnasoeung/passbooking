const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getDriverStatus,
  toggleOnline,
  updateLocation
} = require('../controllers/driverController');

router.get('/status', auth, getDriverStatus);
router.put('/online', auth, toggleOnline);
router.put('/location', auth, updateLocation);

module.exports = router;
