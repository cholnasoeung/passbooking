const Driver = require('../models/Driver');
const User = require('../models/User');

exports.getDriverAccess = async (userId) => {
  const user = await User.findById(userId).select('role');
  if (!user || user.role !== 'driver') {
    return {
      error: {
        status: 403,
        message: 'Driver account is not active'
      }
    };
  }

  const driver = await Driver.findOne({ userId }).populate('vehicleId');
  if (!driver) {
    return {
      error: {
        status: 404,
        message: 'Driver profile not found'
      }
    };
  }

  if (driver.isBlocked) {
    return {
      error: {
        status: 403,
        message: 'Driver account is blocked'
      }
    };
  }

  if (driver.isApproved === false) {
    return {
      error: {
        status: 403,
        message: 'Driver account is awaiting admin approval'
      }
    };
  }

  return { driver, user };
};
