const express = require('express');
const Vehicle = require('../models/Vehicle');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const vehicles = await Vehicle.find({ enabled: true }).sort({ type: 1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
