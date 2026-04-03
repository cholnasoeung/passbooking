const mongoose = require('mongoose');
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const { getDriverAccess } = require('../utils/driverAccess');

function ensureValidRideId(id, res) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid ride id' });
    return false;
  }
  return true;
}

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
    const {
      pickup,
      destination,
      distance,
      duration,
      vehicleType,
      seats = 1
    } = req.body;

    if (!vehicleType) {
      return res.status(400).json({ message: 'Vehicle type is required' });
    }

    if (distance == null) {
      return res.status(400).json({ message: 'Distance is required' });
    }

    const vehicle = await Vehicle.findOne({ type: vehicleType, enabled: true });
    if (!vehicle) {
      return res.status(400).json({ message: 'Selected vehicle type is unavailable' });
    }

    const requestedSeats = Math.max(1, Math.floor(seats));
    if (requestedSeats > vehicle.maxSeats) {
      return res.status(400).json({ message: `You can only book up to ${vehicle.maxSeats} seats for ${vehicle.type}` });
    }

    const price = parseFloat(
      (vehicle.basePrice + (distance * vehicle.pricePerKm * requestedSeats)).toFixed(2)
    );

    const ride = new Ride({
      userId: req.user.id,
      pickup,
      destination,
      distance,
      duration,
      price,
      seats: requestedSeats,
      vehicleType,
      status: 'pending'
    });

    const onlineDrivers = await Driver.find({
      isOnline: true,
      isBlocked: { $ne: true },
      isApproved: true,
      vehicleId: vehicle._id
    });

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
    const populated = await ride.populate({
      path: 'driverId',
      populate: { path: 'userId', select: 'name email' }
    });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRide = async (req, res) => {
  try {
    if (!ensureValidRideId(req.params.id, res)) return;

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
    const { lat, lng, vehicleType } = req.query;
    const query = {
      isOnline: true,
      isBlocked: { $ne: true },
      isApproved: { $ne: false }
    };

    if (vehicleType) {
      const vehicle = await Vehicle.findOne({ type: vehicleType, enabled: true });
      if (vehicle) {
        query.vehicleId = vehicle._id;
      }
    }

    const drivers = await Driver.find(query).populate('userId', 'name');

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
    if (!ensureValidRideId(req.params.id, res)) return;

    const { driver, error } = await getDriverAccess(req.user.id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'pending') {
      return res.status(400).json({ message: 'Ride is no longer pending' });
    }
    if (ride.driverId && ride.driverId.toString() !== driver._id.toString()) {
      return res.status(403).json({ message: 'Ride is assigned to another driver' });
    }
    if (ride.vehicleType && driver.vehicleId && ride.vehicleType !== driver.vehicleId.type) {
      return res.status(403).json({ message: 'This ride requires a different vehicle type' });
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
    if (!ensureValidRideId(req.params.id, res)) return;

    const { status } = req.body;
    const validStatuses = ['pending', 'accepted', 'ongoing', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const { driver, error } = await getDriverAccess(req.user.id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    if (!ride.driverId || ride.driverId.toString() !== driver._id.toString()) {
      return res.status(403).json({ message: 'You can only update your assigned rides' });
    }

    ride.status = status;
    await ride.save();
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPendingRidesForDriver = async (req, res) => {
  try {
    const { driver, error } = await getDriverAccess(req.user.id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const pendingFilter = {
      status: 'pending',
      driverId: null
    };
    if (driver.vehicleId?.type) {
      pendingFilter.vehicleType = driver.vehicleId.type;
    }

    const rides = await Ride.find({
      $or: [
        pendingFilter,
        { status: 'pending', driverId: driver._id },
        { status: { $in: ['accepted', 'ongoing'] }, driverId: driver._id }
      ]
    }).populate('userId', 'name email');

    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserRideHistory = async (req, res) => {
  try {
    const rides = await Ride.find({ userId: req.user.id })
      .populate('driverId', {
        _id: 1,
        vehicleId: 1,
        currentLocation: 1
      })
      .populate({
        path: 'driverId',
        populate: { path: 'userId', select: 'name email' }
      })
      .sort({ createdAt: -1 });

    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.cancelRide = async (req, res) => {
  try {
    if (!ensureValidRideId(req.params.id, res)) return;

    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only cancel your own rides' });
    }

    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({ message: 'This ride cannot be cancelled' });
    }

    ride.status = 'cancelled';
    ride.driverId = null;
    await ride.save();

    res.json({ message: 'Ride cancelled successfully', ride });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
