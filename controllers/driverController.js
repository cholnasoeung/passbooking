const Driver = require('../models/Driver');
const User = require('../models/User');
const { getDriverAccess } = require('../utils/driverAccess');

exports.getDriverStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role');
    if (!user || user.role !== 'driver') {
      return res.status(403).json({ message: 'Driver account is not active' });
    }

    const driver = await Driver.findOne({ userId: req.user.id });
    if (!driver) return res.status(404).json({ message: 'Driver profile not found' });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleOnline = async (req, res) => {
  try {
    const { driver, error } = await getDriverAccess(req.user.id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    driver.isOnline = !driver.isOnline;
    await driver.save();

    res.json({ isOnline: driver.isOnline, message: `You are now ${driver.isOnline ? 'online' : 'offline'}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const { driver, error } = await getDriverAccess(req.user.id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const updatedDriver = await Driver.findOneAndUpdate(
      { _id: driver._id },
      { 'currentLocation.lat': lat, 'currentLocation.lng': lng },
      { new: true }
    );

    if (!updatedDriver) return res.status(404).json({ message: 'Driver profile not found' });

    res.json({ currentLocation: updatedDriver.currentLocation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
