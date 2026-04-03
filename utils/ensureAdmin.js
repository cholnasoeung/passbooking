const bcrypt = require('bcryptjs');
const User = require('../models/User');

const ensureAdminUser = async () => {
  const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@gmail.com';
  const password = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
  const name = process.env.INITIAL_ADMIN_NAME || 'Super Admin';

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log(`Upgraded existing account to admin: ${email}`);
    }
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const admin = new User({
    name,
    email,
    password: hashedPassword,
    role: 'admin'
  });
  await admin.save();
  console.log(`Initial admin user created: ${email}`);
};

module.exports = ensureAdminUser;
