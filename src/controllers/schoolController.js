const School = require('../models/School');
const User = require('../models/User');

// @desc    Get school information for current student
// @route   GET /api/school
// @access  Private (student)
exports.getSchoolInfo = async (req, res) => {
  try {
    const school = await School.findOne({ student: req.user.id });

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'No school information found'
      });
    }

    res.status(200).json({
      success: true,
      data: school
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching school information',
      error: error.message
    });
  }
};

// @desc    Create or update school information for student
// @route   POST /api/school
// @access  Private (student)
exports.updateSchoolInfo = async (req, res) => {
  try {
    const { name, address, email, website, phone, registrationNumber, accreditation } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'School name is required'
      });
    }

    // Find or create school information
    let school = await School.findOne({ student: req.user.id });

    if (!school) {
      // Create new school record
      school = new School({
        student: req.user.id,
        name,
        address: address || '',
        email: email || '',
        website: website || '',
        phone: phone || '',
        registrationNumber: registrationNumber || '',
        accreditation: accreditation || ''
      });

      // Update user model to reference this school
      await User.findByIdAndUpdate(req.user.id, { school: school._id });
    } else {
      // Update existing school record
      school.name = name;
      if (address) school.address = address;
      if (email) school.email = email;
      if (website) school.website = website;
      if (phone) school.phone = phone;
      if (registrationNumber) school.registrationNumber = registrationNumber;
      if (accreditation) school.accreditation = accreditation;
    }

    await school.save();

    res.status(200).json({
      success: true,
      message: 'School information updated successfully',
      data: school
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating school information',
      error: error.message
    });
  }
};

// @desc    Delete school information
// @route   DELETE /api/school
// @access  Private (student)
exports.deleteSchoolInfo = async (req, res) => {
  try {
    // Delete school record
    const school = await School.findOneAndDelete({ student: req.user.id });

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School information not found'
      });
    }

    // Remove reference from user
    await User.findByIdAndUpdate(req.user.id, { school: null });

    res.status(200).json({
      success: true,
      message: 'School information deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting school information',
      error: error.message
    });
  }
};

// @desc    Get user profile with school information
// @route   GET /api/school/profile/:userId
// @access  Public (for employer to view candidate profile)
exports.getUserProfileWithSchool = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('name email phone program cgpa skills interests school')
      .populate('school', 'name email address website');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
};
