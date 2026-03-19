const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  name: {
    type: String,
    trim: true,
    required: [true, 'School name is required']
  },
  address: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  website: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  registrationNumber: {
    type: String,
    trim: true
  },
  accreditation: {
    type: String,
    trim: true
  },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'unverified'
  },
  verificationDate: {
    type: Date
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for faster queries
schoolSchema.index({ student: 1 });
schoolSchema.index({ email: 1 });

module.exports = mongoose.model('School', schoolSchema);
