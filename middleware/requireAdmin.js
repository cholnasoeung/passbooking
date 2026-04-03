const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('role');

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user.role = user.role;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
