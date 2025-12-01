const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  coverLetter: {
    type: String,
    required: [true, 'Cover letter is required'],
    minlength: [100, 'Cover letter must be at least 100 characters']
  },
  resume: {
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    }
  },
  address: {
    type: String,
    required: true,
    minlength: [10, 'Address must be at least 10 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'],
    default: 'pending'
  },
  employerNotes: {
    type: String
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Prevent duplicate applications
jobApplicationSchema.index({ student: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
