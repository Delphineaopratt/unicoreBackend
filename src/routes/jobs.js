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
  getMyJobs,
  getNotifications,
  markNotificationAsRead,
  createNotification
} = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/')
  .get(getAllJobs)
  .post(protect, authorize('employer'), createJob);

router.route('/:id')
  .get(getJobById)
  .put(protect, authorize('employer'), updateJob)
  .delete(protect, authorize('employer'), deleteJob);

router.post('/:id/apply', protect, authorize('student'), upload.single('resume'), applyForJob);

router.get('/:id/applications', protect, authorize('employer'), getJobApplications);

router.get('/applications/employer', protect, authorize('employer'), getEmployerApplications);

router.get('/my-jobs', protect, authorize('employer'), getMyJobs);

// Application routes
router.get('/applications/me', protect, authorize('student'), getMyApplications);

router.route('/applications/:id')
  .get(protect, getApplicationById);

router.put('/applications/:id/status', protect, authorize('employer'), updateApplicationStatus);

// Notification routes
router.get('/notifications', protect, getNotifications);
router.put('/notifications/:id/read', protect, markNotificationAsRead);
router.post('/notifications', protect, createNotification);

module.exports = router;
