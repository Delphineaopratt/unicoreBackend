const express = require('express');
const router = express.Router();
const {
  getAllHostels,
  getHostelById,
  createHostel,
  updateHostel,
  deleteHostel,
  getMyHostels,
  addRoom
} = require('../controllers/hostelController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/')
  .get(getAllHostels)
  .post(protect, authorize('hostel-admin'), upload.array('photos', 10), createHostel);

router.get('/admin/my-hostels', protect, authorize('hostel-admin'), getMyHostels);

router.route('/:id')
  .get(getHostelById)
  .put(protect, authorize('hostel-admin'), upload.array('photos', 10), updateHostel)
  .delete(protect, authorize('hostel-admin'), deleteHostel);

router.post('/:id/rooms', protect, authorize('hostel-admin'), addRoom);

module.exports = router;
