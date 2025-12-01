const Booking = require('../models/Booking');
const Hostel = require('../models/Hostel');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private (student)
exports.createBooking = async (req, res) => {
  try {
    // Add student ID to body
    req.body.student = req.user.id;

    // Validate hostel exists
    const hostel = await Hostel.findById(req.body.hostel);
    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    const booking = await Booking.create(req.body);

    // Populate the booking
    await booking.populate('hostel', 'name location photos');
    await booking.populate('student', 'name email phone');

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
};

// @desc    Get all bookings for logged in user
// @route   GET /api/bookings/my-bookings
// @access  Private (student)
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ student: req.user.id })
      .populate('hostel', 'name location photos')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('hostel', 'name location photos contact')
      .populate('student', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.student._id.toString() !== req.user.id && req.user.userType !== 'hostel-admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
      error: error.message
    });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private (hostel-admin)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findById(req.params.id).populate('hostel');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is authorized
    if (booking.hostel.adminId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    booking.status = status;
    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating booking status',
      error: error.message
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private (student - own booking)
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is booking owner
    if (booking.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message
    });
  }
};

// @desc    Get bookings for a hostel
// @route   GET /api/bookings/hostel/:hostelId
// @access  Private (hostel-admin)
exports.getHostelBookings = async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.hostelId);

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
        message: 'Not authorized to view bookings for this hostel'
      });
    }

    const bookings = await Booking.find({ hostel: req.params.hostelId })
      .populate('student', 'name email phone')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching hostel bookings',
      error: error.message
    });
  }
};
