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
  updateApplicationStatus
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

// Application routes
router.get('/applications/me', protect, authorize('student'), getMyApplications);

router.route('/applications/:id')
  .get(protect, getApplicationById);

router.put('/applications/:id/status', protect, authorize('employer'), updateApplicationStatus);

module.exports = router;
