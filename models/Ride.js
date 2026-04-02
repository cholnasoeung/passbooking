const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  pickup: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  destination: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  distance: { type: Number, default: 0 },      // in km
  duration: { type: String, default: '' },
  price: { type: Number, default: 0 },          // distance * 0.5
  status: {
    type: String,
    enum: ['pending', 'accepted', 'ongoing', 'completed'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema);
