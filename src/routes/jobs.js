const express = require('express');
const router = express.Router();
const {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  applyForJob,
  getJobApplications,
  getMyApplications,
  getApplicationById,
  updateApplicationStatus,
  getEmployerApplications,
  getShortlistedCandidates,
  getMyJobs,
  getNotifications,
  markNotificationAsRead,
  createNotification,
  verifyTranscript
} = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/')
  .get(getAllJobs)
  .post(protect, authorize('employer'), createJob);

router.post('/:id/apply', protect, authorize('student'), upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'transcript', maxCount: 1 }
]), applyForJob);

router.get('/:id/applications', protect, authorize('employer'), getJobApplications);

router.get('/applications/employer', protect, authorize('employer'), getEmployerApplications);

router.get('/candidates/shortlisted', protect, authorize('employer'), getShortlistedCandidates);

router.get('/my-jobs', protect, authorize('employer'), getMyJobs);

// Application routes
router.get('/applications/me', protect, authorize('student'), getMyApplications);

router.route('/applications/:id')
  .get(protect, getApplicationById);

router.put('/applications/:id/status', protect, authorize('employer'), updateApplicationStatus);

router.post('/applications/:id/verify-transcript', protect, authorize('employer'), verifyTranscript);

// Notification routes
router.get('/notifications', protect, getNotifications);
router.put('/notifications/:id/read', protect, markNotificationAsRead);
router.post('/notifications', protect, createNotification);

// Keep generic id route last so it does not shadow specific routes
router.route('/:id')
  .get(getJobById)
  .put(protect, authorize('employer'), updateJob)
  .delete(protect, authorize('employer'), deleteJob);

module.exports = router;
