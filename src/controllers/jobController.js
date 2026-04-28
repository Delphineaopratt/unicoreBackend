const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const Notification = require('../models/Notification');

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

    // Handle resume upload (required)
    if (!req.files || !req.files.resume || !req.files.resume[0]) {
      return res.status(400).json({
        success: false,
        message: 'Please upload your resume'
      });
    }

    // Build application object
    const applicationData = {
      student: req.user.id,
      job: req.params.id,
      coverLetter: req.body.coverLetter,
      address: req.body.address,
      resume: {
        url: `/uploads/${req.files.resume[0].filename}`,
        filename: req.files.resume[0].originalname
      }
    };

    // Handle transcript upload (optional)
    if (req.files && req.files.transcript && req.files.transcript[0]) {
      const transcriptFile = req.files.transcript[0];
      applicationData.transcript = {
        url: `/uploads/${transcriptFile.filename}`,
        filename: transcriptFile.originalname
      };
    }

    const application = await JobApplication.create(applicationData);

    // Update applications count
    job.applicationsCount += 1;
    await job.save();

    // Create notification for student
    await Notification.create({
      user: req.user.id,
      title: 'Application Submitted',
      message: `Your application for ${job.title} at ${job.company} has been submitted successfully.`,
      type: 'application',
      relatedApplication: application._id,
      relatedJob: job._id
    });

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

    const application = await JobApplication.findById(req.params.id)
      .populate('job', 'title company employer')
      .populate('student', 'name email');

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

    const previousStatus = application.status;

    application.status = status;
    if (employerNotes) application.employerNotes = employerNotes;
    application.reviewedAt = Date.now();
    
    await application.save();

    let shortlistEmailSent = false;

    // On first transition to shortlisted, notify student in-app and by email.
    if (status === 'shortlisted' && previousStatus !== 'shortlisted') {
      const companyName = application.job?.company || 'the company';
      const studentName = application.student?.name || 'Student';
      const studentEmail = application.student?.email;
      const jobTitle = application.job?.title || 'the role';
      const employerEmail = req.user?.email;
      const fromEmail = employerEmail || process.env.EMAIL_FROM || process.env.EMAIL_USER;

      await Notification.create({
        user: application.student._id,
        title: 'Application Shortlisted',
        message: `Congratulations! You have been shortlisted by ${companyName} for ${jobTitle}. The company will contact you soon.`,
        type: 'status_update',
        relatedApplication: application._id,
        relatedJob: application.job?._id
      });

      try {
        if (
          studentEmail &&
          process.env.EMAIL_HOST &&
          process.env.EMAIL_USER &&
          process.env.EMAIL_PASSWORD
        ) {
          const nodemailer = require('nodemailer');

          const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT, 10) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD
            }
          });

          await transporter.sendMail({
            from: `${companyName} <${fromEmail}>`,
            replyTo: employerEmail || fromEmail,
            to: studentEmail,
            subject: `Congratulations! You are shortlisted by ${companyName}`,
            text: `Hi ${studentName},\n\nGreat news! You have been shortlisted by ${companyName} for ${jobTitle}.\n\nThe company will contact you soon with next steps.\n\nBest regards,\nUniCore Team`,
            html: `
              <p>Hi ${studentName},</p>
              <p><strong>Congratulations!</strong> You have been shortlisted by <strong>${companyName}</strong> for <strong>${jobTitle}</strong>.</p>
              <p>The company will contact you soon with next steps.</p>
              <p>Best regards,<br/>UniCore Team</p>
            `
          });

          shortlistEmailSent = true;
        }
      } catch (emailError) {
        // Email failure should not fail the status update or notification.
        console.error('Shortlist email sending failed:', emailError.message);
      }
    }

    res.status(200).json({
      success: true,
      data: application,
      shortlistEmailSent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating application status',
      error: error.message
    });
  }
};

// @desc    Get my jobs (for employer)
// @route   GET /api/jobs/my-jobs
// @access  Private (employer)
exports.getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.user.id })
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

// @desc    Get my jobs (employer)
// @route   GET /api/jobs/my-jobs
// @access  Private (employer)
exports.getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.user.id })
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
      message: 'Error fetching my jobs',
      error: error.message
    });
  }
};

// @desc    Get all applications for employer's jobs
// @route   GET /api/jobs/applications/employer
// @access  Private (employer)
exports.getEmployerApplications = async (req, res) => {
  try {
    // Find all jobs by this employer
    const jobs = await Job.find({ employer: req.user.id }).select('_id');
    const jobIds = jobs.map(job => job._id);

    if (jobIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    let applications;

    try {
      // Preferred query with nested school data
      applications = await JobApplication.find({ job: { $in: jobIds } })
        .populate('job', 'title company location type')
        .populate({
          path: 'student',
          select: 'name email phone program cgpa skills school schoolName schoolEmail schoolAddress',
          populate: {
            path: 'school',
            select: 'name email address'
          }
        })
        .sort('-createdAt');
    } catch (populateError) {
      // Fallback for legacy/inconsistent reference data
      applications = await JobApplication.find({ job: { $in: jobIds } })
        .populate('job', 'title company location type')
        .populate('student', 'name email phone program cgpa skills schoolName schoolEmail schoolAddress')
        .sort('-createdAt');
    }

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employer applications',
      error: error.message
    });
  }
};

// @desc    Get shortlisted candidates (employer)
// @route   GET /api/jobs/candidates/shortlisted
// @access  Private (employer)
exports.getShortlistedCandidates = async (req, res) => {
  try {
    // Find all jobs by this employer
    const jobs = await Job.find({ employer: req.user.id }).select('_id');
    const jobIds = jobs.map(job => job._id);

    if (jobIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    let candidates;

    try {
      // Preferred query with nested school data
      candidates = await JobApplication.find({ 
        job: { $in: jobIds },
        status: 'shortlisted'
      })
        .populate('job', 'title company location type')
        .populate({
          path: 'student',
          select: 'name email phone program cgpa skills school schoolName schoolEmail schoolAddress',
          populate: {
            path: 'school',
            select: 'name email address'
          }
        })
        .sort('-createdAt');
    } catch (populateError) {
      // Fallback for legacy/inconsistent reference data
      candidates = await JobApplication.find({ 
        job: { $in: jobIds },
        status: 'shortlisted'
      })
        .populate('job', 'title company location type')
        .populate('student', 'name email phone program cgpa skills schoolName schoolEmail schoolAddress')
        .sort('-createdAt');
    }

    res.status(200).json({
      success: true,
      count: candidates.length,
      data: candidates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching shortlisted candidates',
      error: error.message
    });
  }
};

// @desc    Get my applications (student)
// @route   GET /api/jobs/applications/me
// @access  Private (student)
exports.getMyApplications = async (req, res) => {
  try {
    const applications = await JobApplication.find({ student: req.user.id })
      .populate('job', 'title company location type salary')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching my applications',
      error: error.message
    });
  }
};

// @desc    Get notifications for user
// @route   GET /api/jobs/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .populate('relatedJob', 'title company')
      .populate('relatedApplication', 'status')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/jobs/notifications/:id/read
// @access  Private
exports.markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating notification',
      error: error.message
    });
  }
};

// @desc    Create notification
// @route   POST /api/jobs/notifications
// @access  Private
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type, relatedApplication, relatedJob } = req.body;

    const notification = await Notification.create({
      user: req.user.id,
      title,
      message,
      type,
      relatedApplication,
      relatedJob
    });

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating notification',
      error: error.message
    });
  }
};

// @desc    Verify transcript by sending email to school
// @route   POST /api/jobs/applications/:id/verify-transcript
// @access  Private (employer)
exports.verifyTranscript = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const application = await JobApplication.findById(req.params.id)
      .populate({
        path: 'student',
        select: 'name email school studentId transcript schoolEmail schoolName schoolAddress',
        populate: {
          path: 'school',
          select: 'name email address'
        }
      })
      .populate({
        path: 'job',
        select: 'title company',
        populate: {
          path: 'employer',
          select: 'name email company'
        }
      });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const student = application.student;
    const employer = application.job?.employer || req.user;
    const employerEmail = employer?.email;
    const employerName = employer?.name;
    const companyName = application.job?.company || employer?.company;
    const schoolEmail = student.school?.email || student.schoolEmail;
    const schoolName = student.school?.name || student.schoolName;
    const studentId = student.studentId;
    const transcriptSource = application.transcript?.url ? application.transcript : student.transcript;

    if (!employerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Employer email not found'
      });
    }

    if (!schoolEmail) {
      return res.status(400).json({
        success: false,
        message: 'Student has not provided school email address'
      });
    }

    if (!transcriptSource || !transcriptSource.url) {
      return res.status(400).json({
        success: false,
        message: 'Student has not uploaded a transcript'
      });
    }

    // Update application with verification request timestamp
    application.transcriptVerificationStatus = 'pending';
    application.transcriptVerificationRequestSentAt = new Date();
    await application.save();

    // Prepare verification email
    const verificationEmail = {
      to: schoolEmail,
      subject: `Education Verification Request: ${student.name} - ${studentId || 'No ID'}`,
      text: `
Dear Academic Affairs Officer,

${companyName || 'Our Company'} is considering ${student.name} for employment. We wish to verify the attached transcript. 

STUDENT INFORMATION:
- Full Name: ${student.name}
- Student ID: ${studentId || 'Not provided'}
- School/University: ${schoolName || 'Not specified'}

Please find the attached consent letter from the candidate as required by your policy. The student's transcript is also attached for cross-reference.

We request confirmation that:
1. The student exists in your records
2. The grades/CGPA match your permanent records
3. Notification of any discrepancies if found

We appreciate your timely response to facilitate the hiring process.

Best regards,
${employerName || 'Recruitment Department'}
${companyName || 'Recruiting Company'}
${employerEmail}
`,
      html: `
<h2>Education Verification Request</h2>
<p>Dear Academic Affairs Officer,</p>
<p><strong>${companyName || 'Our Company'}</strong> is considering <strong>${student.name}</strong> for employment. We wish to verify the attached transcript.</p>

<h3>STUDENT INFORMATION:</h3>
<ul>
  <li><strong>Full Name:</strong> ${student.name}</li>
  <li><strong>Student ID:</strong> ${studentId || 'Not provided'}</li>
  <li><strong>School/University:</strong> ${schoolName || 'Not specified'}</li>
</ul>

<p>Please find the attached consent letter from the candidate as required by your policy. The student's transcript is also attached for cross-reference.</p>

<h3>We request confirmation that:</h3>
<ol>
  <li>The student exists in your records</li>
  <li>The grades/CGPA match your permanent records</li>
  <li>Notification of any discrepancies if found</li>
</ol>

<p>We appreciate your timely response to facilitate the hiring process.</p>

<p>Best regards,<br>
<strong>${employerName || 'Recruitment Department'}</strong><br>
${companyName || 'Recruiting Company'}<br>
<a href="mailto:${employerEmail}">${employerEmail}</a></p>
      `
    };

    // Send verification email using nodemailer (if configured)
    let emailSent = false;
    try {
      if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        const nodemailer = require('nodemailer');
        
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT) || 587,
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });

        // Prepare attachments
        const attachments = [];
        
        // Add transcript if it exists
        if (transcriptSource?.url) {
          const transcriptRelativePath = transcriptSource.url.replace(/^\/+/, '');
          const transcriptPath = path.resolve(__dirname, '../../', transcriptRelativePath);
          try {
            if (fs.existsSync(transcriptPath)) {
              attachments.push({
                filename: transcriptSource.filename || 'transcript.pdf',
                path: transcriptPath
              });
            } else {
              console.error('Transcript file not found at path:', transcriptPath);
            }
          } catch (attachmentError) {
            console.error('Error attaching transcript:', attachmentError.message);
          }
        }

        const emailOptions = {
          from: `${employerName || companyName} <${employerEmail}>`,
          replyTo: employerEmail,
          ...verificationEmail,
          attachments: attachments
        };

        await transporter.sendMail(emailOptions);
        emailSent = true;
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
      // Don't fail the entire request, just note that email wasn't sent
    }

    // Log the verification request
    try {
      await Notification.create({
        user: req.user.id,
        title: 'Transcript Verification Initiated',
        message: `Transcript verification request sent to ${schoolName} (${schoolEmail}) for ${student.name} (ID: ${studentId || 'Not provided'})`,
        type: 'verification',
        relatedApplication: application._id
      });
    } catch (notificationError) {
      console.error('Notification creation failed:', notificationError.message);
    }

    res.status(200).json({
      success: true,
      message: emailSent 
        ? `Transcript verification email sent to ${schoolEmail}` 
        : `Transcript verification request recorded. Email sending is not configured.`,
      emailSent: emailSent,
      verificationStatus: 'pending'
    });
  } catch (error) {
    console.error('Error in verifyTranscript:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing transcript verification',
      error: error.message
    });
  }
};
