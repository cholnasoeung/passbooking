const Driver = require('../models/Driver');

exports.getDriverStatus = async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.id });
    if (!driver) return res.status(404).json({ message: 'Driver profile not found' });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleOnline = async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.id });
    if (!driver) return res.status(404).json({ message: 'Driver profile not found' });

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

    const driver = await Driver.findOneAndUpdate(
      { userId: req.user.id },
      { 'currentLocation.lat': lat, 'currentLocation.lng': lng },
      { new: true }
    );

    if (!driver) return res.status(404).json({ message: 'Driver profile not found' });

    res.json({ currentLocation: driver.currentLocation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
