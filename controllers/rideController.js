const Ride = require('../models/Ride');
const Driver = require('../models/Driver');

// Haversine formula: returns distance in km
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

exports.createRide = async (req, res) => {
  try {
    const { pickup, destination, distance, duration } = req.body;
    const price = parseFloat((distance * 0.5).toFixed(2));

    const ride = new Ride({
      userId: req.user.id,
      pickup,
      destination,
      distance,
      duration,
      price,
      status: 'pending'
    });

    // Auto-assign nearest online driver
    const onlineDrivers = await Driver.find({ isOnline: true });

    if (onlineDrivers.length > 0) {
      let nearestDriver = null;
      let minDist = Infinity;

      for (const driver of onlineDrivers) {
        const d = haversineDistance(
          pickup.lat, pickup.lng,
          driver.currentLocation.lat, driver.currentLocation.lng
        );
        if (d < minDist) {
          minDist = d;
          nearestDriver = driver;
        }
      }

      if (nearestDriver) {
        ride.driverId = nearestDriver._id;
      }
    }

    await ride.save();
    const populated = await ride.populate('driverId');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('userId', 'name email')
      .populate({ path: 'driverId', populate: { path: 'userId', select: 'name' } });

    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getNearbyDrivers = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const drivers = await Driver.find({ isOnline: true }).populate('userId', 'name');

    const result = drivers
      .map((d) => ({
        ...d.toObject(),
        distance: haversineDistance(
          parseFloat(lat), parseFloat(lng),
          d.currentLocation.lat, d.currentLocation.lng
        )
      }))
      .sort((a, b) => a.distance - b.distance);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.acceptRide = async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.id });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'pending') {
      return res.status(400).json({ message: 'Ride is no longer pending' });
    }

    ride.driverId = driver._id;
    ride.status = 'accepted';
    await ride.save();

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'accepted', 'ongoing', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const ride = await Ride.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPendingRidesForDriver = async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.id });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const rides = await Ride.find({
      $or: [
        { status: 'pending', driverId: null },
        { status: 'pending', driverId: driver._id },
        { status: { $in: ['accepted', 'ongoing'] }, driverId: driver._id }
      ]
    }).populate('userId', 'name email');

    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
