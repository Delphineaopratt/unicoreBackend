const express = require('express');
const router = express.Router();
const {
  getSchoolInfo,
  updateSchoolInfo,
  deleteSchoolInfo,
  getUserProfileWithSchool
} = require('../controllers/schoolController');
const { protect, authorize } = require('../middleware/auth');

// Student school information routes
router.route('/')
  .get(protect, authorize('student'), getSchoolInfo)
  .post(protect, authorize('student'), updateSchoolInfo)
  .delete(protect, authorize('student'), deleteSchoolInfo);

// Get user profile with school info
router.get('/profile/:userId', getUserProfileWithSchool);

module.exports = router;
