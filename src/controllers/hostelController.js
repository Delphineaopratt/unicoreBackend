const Hostel = require('../models/Hostel');

// @desc    Get all hostels
// @route   GET /api/hostels
// @access  Public
exports.getAllHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find().populate('adminId', 'name email');

    res.status(200).json({
      success: true,
      count: hostels.length,
      data: hostels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching hostels',
      error: error.message
    });
  }
};

// @desc    Get single hostel
// @route   GET /api/hostels/:id
// @access  Public
exports.getHostelById = async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id).populate('adminId', 'name email phone');

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    res.status(200).json({
      success: true,
      data: hostel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching hostel',
      error: error.message
    });
  }
};

// @desc    Create new hostel
// @route   POST /api/hostels
// @access  Private (hostel-admin)
exports.createHostel = async (req, res) => {
  try {
    // Add admin ID to body
    req.body.adminId = req.user.id;

    // Handle file uploads if present
    if (req.files && req.files.length > 0) {
      req.body.photos = req.files.map(file => `/uploads/${file.filename}`);
    }

    const hostel = await Hostel.create(req.body);

    res.status(201).json({
      success: true,
      data: hostel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating hostel',
      error: error.message
    });
  }
};

// @desc    Update hostel
// @route   PUT /api/hostels/:id
// @access  Private (hostel-admin - own hostel only)
exports.updateHostel = async (req, res) => {
  try {
    let hostel = await Hostel.findById(req.params.id);

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    // Check if user is hostel admin
    if (hostel.adminId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this hostel'
      });
    }

    // Handle file uploads if present
    if (req.files && req.files.length > 0) {
      req.body.photos = req.files.map(file => `/uploads/${file.filename}`);
    }

    hostel = await Hostel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: hostel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating hostel',
      error: error.message
    });
  }
};

// @desc    Delete hostel
// @route   DELETE /api/hostels/:id
// @access  Private (hostel-admin - own hostel only)
exports.deleteHostel = async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id);

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    // Check if user is hostel admin
    if (hostel.adminId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this hostel'
      });
    }

    await hostel.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting hostel',
      error: error.message
    });
  }
};

// @desc    Get hostels by admin
// @route   GET /api/hostels/admin/my-hostels
// @access  Private (hostel-admin)
exports.getMyHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find({ adminId: req.user.id });

    res.status(200).json({
      success: true,
      count: hostels.length,
      data: hostels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching your hostels',
      error: error.message
    });
  }
};

// @desc    Add room to hostel
// @route   POST /api/hostels/:id/rooms
// @access  Private (hostel-admin)
exports.addRoom = async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id);

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    // Check if user is hostel admin
    if (hostel.adminId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add rooms to this hostel'
      });
    }

    hostel.rooms.push(req.body);
    await hostel.save();

    res.status(201).json({
      success: true,
      data: hostel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding room',
      error: error.message
    });
  }
};
