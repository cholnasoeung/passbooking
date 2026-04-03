const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['tuktuk', 'moto', 'car', 'taxi'],
    required: true,
    unique: true
  },
  basePrice: { type: Number, required: true, min: 0 },
  pricePerKm: { type: Number, required: true, min: 0 },
  maxSeats: { type: Number, required: true, min: 1 },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
