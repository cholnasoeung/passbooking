const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  isOnline: { type: Boolean, default: false },
  currentLocation: {
    lat: { type: Number, default: 11.5564 },  // Phnom Penh default
    lng: { type: Number, default: 104.9282 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
