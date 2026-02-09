const JobPreference = require('../models/JobPreference');

// @desc    Create or update job preferences
// @route   POST /api/job-preferences
// @access  Private (student)
exports.saveJobPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { program, cgpa, jobTypes, skills, interests, transcript } = req.body;

    // Check if preferences already exist
    let preferences = await JobPreference.findOne({ userId });

    if (preferences) {
      // Update existing preferences
      preferences.program = program;
      preferences.cgpa = cgpa;
      preferences.jobTypes = jobTypes;
      preferences.skills = skills || [];
      preferences.interests = interests || [];
      preferences.transcript = transcript || preferences.transcript;
      preferences.isCompleted = true;
      await preferences.save();
    } else {
      // Create new preferences
      preferences = await JobPreference.create({
        userId,
        program,
        cgpa,
        jobTypes,
        skills: skills || [],
        interests: interests || [],
        transcript,
        isCompleted: true
      });
    }

    res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving job preferences',
      error: error.message
    });
  }
};

// @desc    Get job preferences
// @route   GET /api/job-preferences
// @access  Private (student)
exports.getJobPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await JobPreference.findOne({ userId });

    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'No preferences found'
      });
    }

    res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching job preferences',
      error: error.message
    });
  }
};

// @desc    Delete job preferences
// @route   DELETE /api/job-preferences
// @access  Private (student)
exports.deleteJobPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await JobPreference.findOne({ userId });

    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'No preferences found'
      });
    }

    await preferences.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Preferences deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting job preferences',
      error: error.message
    });
  }
};

// @desc    Get recommended jobs based on preferences
// @route   GET /api/job-preferences/recommended-jobs
// @access  Private (student)
exports.getRecommendedJobs = async (req, res) => {
  try {
    const userId = req.user.id;
    const Job = require('../models/Job');
    
    const preferences = await JobPreference.findOne({ userId });

    if (!preferences || !preferences.isCompleted) {
      return res.status(404).json({
        success: false,
        message: 'Please complete job preferences first'
      });
    }

    // Build query to find matching jobs
    const query = {};
    
    // Filter by job types
    if (preferences.jobTypes && preferences.jobTypes.length > 0) {
      query.type = { $in: preferences.jobTypes };
    }

    // Find all matching jobs
    let jobs = await Job.find(query).sort({ createdAt: -1 });

    // Score jobs based on skills and interests match
    jobs = jobs.map(job => {
      let score = 0;
      
      // Check skills match
      if (preferences.skills && job.requirements) {
        const jobReqLower = job.requirements.toLowerCase();
        preferences.skills.forEach(skill => {
          if (jobReqLower.includes(skill.toLowerCase())) {
            score += 2;
          }
        });
      }

      // Check interests match
      if (preferences.interests && job.description) {
        const jobDescLower = job.description.toLowerCase();
        preferences.interests.forEach(interest => {
          if (jobDescLower.includes(interest.toLowerCase())) {
            score += 1;
          }
        });
      }

      return {
        ...job.toObject(),
        matchScore: score
      };
    });

    // Sort by match score
    jobs.sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json({
      success: true,
      data: jobs.slice(0, 10) // Return top 10 matches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching recommended jobs',
      error: error.message
    });
  }
};
