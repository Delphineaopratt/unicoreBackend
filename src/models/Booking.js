const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    required: true
  },
  room: {
    roomId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    number: String,
    price: {
      type: Number,
      required: true
    }
  },
  checkInDate: {
    type: Date,
    required: true
  },
  checkOutDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['mobile-money', 'card', 'cash'],
    default: 'mobile-money'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);
