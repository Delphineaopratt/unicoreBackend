const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  getHostelBookings
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .post(protect, authorize('student'), createBooking);

router.get('/my-bookings', protect, authorize('student'), getMyBookings);

router.get('/hostel/:hostelId', protect, authorize('hostel-admin'), getHostelBookings);

router.route('/:id')
  .get(protect, getBookingById);

router.put('/:id/status', protect, authorize('hostel-admin'), updateBookingStatus);

router.put('/:id/cancel', protect, authorize('student'), cancelBooking);

module.exports = router;
