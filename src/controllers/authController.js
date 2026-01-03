const User = require('../models/User');
const { sendTokenResponse } = require('../utils/auth');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { email, password, name, userType } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      userType
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/updateprofile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      university: req.body.university,
      location: req.body.location,
      phone: req.body.phone,
      bio: req.body.bio,
      skills: req.body.skills,
      interests: req.body.interests,
      program: req.body.program,
      cgpa: req.body.cgpa,
      experience: req.body.experience,
      education: req.body.education
    };

    // Handle profile picture upload
    if (req.file) {
      fieldsToUpdate.profilePicture = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// @desc    Complete onboarding
// @route   POST /api/auth/complete-onboarding
// @access  Private
exports.completeOnboarding = async (req, res, next) => {
  try {
    const { program, cgpa, skills, interests, jobTypes } = req.body;

    const updateData = {
      program,
      cgpa,
      skills: skills ? JSON.parse(skills) : [],
      interests: interests ? JSON.parse(interests) : [],
      jobTypes: jobTypes ? JSON.parse(jobTypes) : [],
      profileCompleted: true
    };

    // Handle transcript upload
    if (req.file) {
      updateData.transcript = {
        url: `/uploads/${req.file.filename}`,
        filename: req.file.originalname
      };
    }

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error completing onboarding',
      error: error.message
    });
  }
};

// @desc    Upload transcript
// @route   POST /api/auth/upload-transcript
// @access  Private
exports.uploadTranscript = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        transcript: {
          url: `/uploads/${req.file.filename}`,
          filename: req.file.originalname
        }
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Transcript uploaded successfully',
      data: {
        transcript: user.transcript
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading transcript',
      error: error.message
    });
  }
};
