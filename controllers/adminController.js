const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

exports.getAllUsers = async (_req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const driverProfile = await Driver.findOne({ userId: user._id });

    await Ride.deleteMany({ userId: user._id });

    if (driverProfile) {
      await Ride.deleteMany({ driverId: driverProfile._id });
      await Driver.findByIdAndDelete(driverProfile._id);
    }

    await User.findByIdAndDelete(user._id);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role, vehicleId } = req.body;
    const validRoles = ['user', 'driver', 'admin'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (req.user.id === req.params.id && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot remove your own admin access' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    if (role === 'driver') {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return res.status(400).json({ message: 'Valid vehicle is required for drivers' });
      }
      await Driver.findOneAndUpdate(
        { userId: user._id },
        {
          isOnline: false,
          isApproved: false,
          isBlocked: false,
          vehicleId: vehicle._id
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        }
      );
    } else {
      await Driver.findOneAndUpdate(
        { userId: user._id },
        { isOnline: false },
        { new: true }
      );
    }

    const updatedUser = await User.findById(user._id).select('-password');

    res.json({
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllDrivers = async (_req, res) => {
  try {
    const drivers = await Driver.find()
      .populate('userId', 'name email role createdAt')
      .populate('vehicleId')
      .sort({ createdAt: -1 });

    const activeDrivers = drivers
      .filter((driver) => driver.userId && driver.userId.role === 'driver')
      .map((driver) => ({
        ...driver.toObject(),
        status: driver.isBlocked ? 'blocked' : driver.isApproved === false ? 'pending' : 'approved'
      }));

    res.json(activeDrivers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.approveDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      {
        isApproved: true,
        isBlocked: false
      },
      { new: true }
    ).populate('userId', 'name email role');

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json({
      message: 'Driver approved successfully',
      driver
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.blockDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      {
        isBlocked: true,
        isOnline: false,
        isApproved: false
      },
      { new: true }
    ).populate('userId', 'name email role');

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    await Ride.updateMany(
      {
        driverId: driver._id,
        status: { $in: ['pending', 'accepted', 'ongoing'] }
      },
      {
        $set: {
          driverId: null,
          status: 'pending'
        }
      }
    );

    res.json({
      message: 'Driver blocked successfully',
      driver
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllRides = async (_req, res) => {
  try {
    const rides = await Ride.find()
      .populate('userId', 'name email')
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

exports.deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findByIdAndDelete(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    res.json({ message: 'Ride deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getVehicles = async (_req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ type: 1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createVehicle = async (req, res) => {
  try {
    const { type, basePrice, pricePerKm, maxSeats, enabled = true } = req.body;
    if (!type || basePrice == null || pricePerKm == null || maxSeats == null) {
      return res.status(400).json({ message: 'All vehicle fields are required' });
    }

    const existing = await Vehicle.findOne({ type });
    if (existing) {
      return res.status(400).json({ message: 'Vehicle type already exists' });
    }

    const vehicle = new Vehicle({
      type,
      basePrice,
      pricePerKm,
      maxSeats,
      enabled
    });
    await vehicle.save();

    res.status(201).json({ message: 'Vehicle created', vehicle });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const { type, basePrice, pricePerKm, maxSeats, enabled } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    if (type) vehicle.type = type;
    if (basePrice != null) vehicle.basePrice = basePrice;
    if (pricePerKm != null) vehicle.pricePerKm = pricePerKm;
    if (maxSeats != null) vehicle.maxSeats = maxSeats;
    if (enabled != null) vehicle.enabled = enabled;

    await vehicle.save();
    res.json({ message: 'Vehicle updated', vehicle });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.enableDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      {
        isBlocked: false,
        isApproved: true
      },
      { new: true }
    ).populate('userId', 'name email role').populate('vehicleId');

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json({
      message: 'Driver enabled successfully',
      driver
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDashboardStats = async (_req, res) => {
  try {
    const [
      totalUsers,
      totalDrivers,
      totalRides,
      activeRides,
      completedRides,
      revenueResult
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'driver' }),
      Ride.countDocuments(),
      Ride.countDocuments({ status: { $in: ['pending', 'accepted', 'ongoing'] } }),
      Ride.countDocuments({ status: 'completed' }),
      Ride.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, totalRevenue: { $sum: '$price' } } }
      ])
    ]);

    res.json({
      totalUsers,
      totalDrivers,
      totalRides,
      activeRides,
      completedRides,
      totalRevenue: revenueResult[0]?.totalRevenue || 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
