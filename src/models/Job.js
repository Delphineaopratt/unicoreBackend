const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true
  },
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'internship', 'contract'],
    required: true
  },
  description: {
    type: String,
    required: [true, 'Job description is required']
  },
  requirements: [{
    type: String
  }],
  responsibilities: [{
    type: String
  }],
  salary: {
    min: {
      type: Number,
      required: true,
      min: 0
    },
    max: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'GHS'
    }
  },
  benefits: [{
    type: String
  }],
  skills: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['active', 'closed', 'draft'],
    default: 'active'
  },
  applicationDeadline: {
    type: Date,
    required: true
  },
  applicationsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Job', jobSchema);
