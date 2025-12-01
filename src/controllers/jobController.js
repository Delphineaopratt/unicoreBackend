const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
exports.getAllJobs = async (req, res) => {
  try {
    const { status, type, location } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (location) query.location = new RegExp(location, 'i');

    const jobs = await Job.find(query)
      .populate('employer', 'name company')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs',
      error: error.message
    });
  }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Public
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('employer', 'name company email');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching job',
      error: error.message
    });
  }
};

// @desc    Create new job
// @route   POST /api/jobs
// @access  Private (employer)
exports.createJob = async (req, res) => {
  try {
    req.body.employer = req.user.id;

    const job = await Job.create(req.body);

    res.status(201).json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating job',
      error: error.message
    });
  }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (employer - own job only)
exports.updateJob = async (req, res) => {
  try {
    let job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user is job owner
    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this job'
      });
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating job',
      error: error.message
    });
  }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (employer - own job only)
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user is job owner
    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this job'
      });
    }

    await job.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting job',
      error: error.message
    });
  }
};

// @desc    Apply for a job
// @route   POST /api/jobs/:id/apply
// @access  Private (student)
exports.applyForJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This job is no longer accepting applications'
      });
    }

    // Check if already applied
    const existingApplication = await JobApplication.findOne({
      student: req.user.id,
      job: req.params.id
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }

    // Handle resume upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload your resume'
      });
    }

    const application = await JobApplication.create({
      student: req.user.id,
      job: req.params.id,
      coverLetter: req.body.coverLetter,
      address: req.body.address,
      resume: {
        url: `/uploads/${req.file.filename}`,
        filename: req.file.originalname
      }
    });

    // Update applications count
    job.applicationsCount += 1;
    await job.save();

    await application.populate('job', 'title company');
    await application.populate('student', 'name email');

    res.status(201).json({
      success: true,
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error applying for job',
      error: error.message
    });
  }
};

// @desc    Get applications for a job
// @route   GET /api/jobs/:id/applications
// @access  Private (employer - own job only)
exports.getJobApplications = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user is job owner
    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view applications for this job'
      });
    }

    const applications = await JobApplication.find({ job: req.params.id })
      .populate('student', 'name email phone program cgpa')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching job applications',
      error: error.message
    });
  }
};

// @desc    Get my job applications
// @route   GET /api/applications/me
// @access  Private (student)
exports.getMyApplications = async (req, res) => {
  try {
    const applications = await JobApplication.find({ student: req.user.id })
      .populate('job', 'title company location type status')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
};

// @desc    Get single application
// @route   GET /api/applications/:id
// @access  Private
exports.getApplicationById = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id)
      .populate('job', 'title company location type')
      .populate('student', 'name email phone program cgpa');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check authorization
    if (application.student._id.toString() !== req.user.id && req.user.userType !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this application'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching application',
      error: error.message
    });
  }
};

// @desc    Update application status
// @route   PUT /api/applications/:id/status
// @access  Private (employer)
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, employerNotes } = req.body;

    const application = await JobApplication.findById(req.params.id).populate('job');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user is employer of this job
    if (application.job.employer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this application'
      });
    }

    application.status = status;
    if (employerNotes) application.employerNotes = employerNotes;
    application.reviewedAt = Date.now();
    
    await application.save();

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating application status',
      error: error.message
    });
  }
};
