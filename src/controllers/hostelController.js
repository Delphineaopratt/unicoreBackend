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
    console.log('Add room request:', {
      params: req.params,
      body: req.body,
      files: req.files ? req.files.length : 0,
      user: req.user ? req.user.id : 'no user'
    });

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

    // Prepare room data
    const roomData = {
      name: req.body.name,
      type: req.body.type,
      amenities: req.body.amenities ? JSON.parse(req.body.amenities) : [],
      price: parseFloat(req.body.price),
      availableRooms: parseInt(req.body.availableRooms) || 0,
    };

    console.log('Room data prepared:', roomData);

    // Handle file uploads if present
    if (req.files && req.files.length > 0) {
      roomData.photos = req.files.map(file => `/uploads/${file.filename}`);
      console.log('Photos added:', roomData.photos);
    }

    hostel.rooms.push(roomData);
    await hostel.save();

    console.log('Room added successfully');

    res.status(201).json({
      success: true,
      data: hostel
    });
  } catch (error) {
    console.error('Error adding room:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding room',
      error: error.message
    });
  }
};

// @desc    Update room
// @route   PUT /api/hostels/:id/rooms/:roomId
// @access  Private (hostel-admin - own hostel only)
exports.updateRoom = async (req, res) => {
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
        message: 'Not authorized to update rooms in this hostel'
      });
    }

    // Find room by ID
    const room = hostel.rooms.id(req.params.roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Update room fields
    if (req.body.name) room.name = req.body.name;
    if (req.body.type) room.type = req.body.type;
    if (req.body.amenities) room.amenities = req.body.amenities;
    if (req.body.price) room.price = parseFloat(req.body.price);
    if (req.body.availableRooms !== undefined) room.availableRooms = parseInt(req.body.availableRooms);

    await hostel.save();

    res.status(200).json({
      success: true,
      data: hostel
    });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating room',
      error: error.message
    });
  }
};

// @desc    Delete room
// @route   DELETE /api/hostels/:id/rooms/:roomId
// @access  Private (hostel-admin - own hostel only)
exports.deleteRoom = async (req, res) => {
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
        message: 'Not authorized to delete rooms from this hostel'
      });
    }

    // Find and remove room
    const room = hostel.rooms.id(req.params.roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    room.remove();
    await hostel.save();

    res.status(200).json({
      success: true,
      data: hostel
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting room',
      error: error.message
    });
  }
};
