const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  amenities: [{
    type: String
  }],
  price: {
    type: Number,
    required: true,
    min: 0
  },
  availableRooms: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  photos: [{
    type: String
  }]
});

const hostelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hostel name is required'],
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  availableRooms: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  photos: [{
    type: String
  }],
  rooms: [roomSchema],
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amenities: [{
    type: String
  }],
  rules: [{
    type: String
  }],
  contact: {
    phone: String,
    email: String
  }
}, {
  timestamps: true
});

// Update availableRooms when rooms change
hostelSchema.pre('save', function(next) {
  if (this.rooms && this.rooms.length > 0) {
    this.availableRooms = this.rooms.reduce((sum, room) => sum + room.availableRooms, 0);
  }
  next();
});

module.exports = mongoose.model('Hostel', hostelSchema);
