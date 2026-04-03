const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createRide,
  getRide,
  getNearbyDrivers,
  acceptRide,
  updateStatus,
  getPendingRidesForDriver,
  getUserRideHistory,
  cancelRide
} = require('../controllers/rideController');

router.post('/', auth, createRide);
router.get('/nearby', auth, getNearbyDrivers);
router.get('/pending', auth, getPendingRidesForDriver);
router.get('/history', auth, getUserRideHistory);
router.get('/:id', auth, getRide);
router.put('/:id/accept', auth, acceptRide);
router.put('/:id/status', auth, updateStatus);
router.put('/:id/cancel', auth, cancelRide);

module.exports = router;
