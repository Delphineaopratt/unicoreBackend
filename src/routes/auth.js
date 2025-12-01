const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  completeOnboarding,
  uploadTranscript
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/updateprofile', protect, upload.single('profilePicture'), updateProfile);
router.post('/complete-onboarding', protect, upload.single('transcript'), completeOnboarding);
router.post('/upload-transcript', protect, upload.single('transcript'), uploadTranscript);

module.exports = router;
