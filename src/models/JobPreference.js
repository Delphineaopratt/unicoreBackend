const mongoose = require('mongoose');

const jobPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  program: {
    type: String,
    required: true
  },
  cgpa: {
    type: String,
    required: true
  },
  jobTypes: [{
    type: String,
    required: true
  }],
  skills: [{
    type: String
  }],
  interests: [{
    type: String
  }],
  transcript: {
    type: String // File path
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('JobPreference', jobPreferenceSchema);
