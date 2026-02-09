const express = require('express');
const router = express.Router();
const {
  saveJobPreferences,
  getJobPreferences,
  deleteJobPreferences,
  getRecommendedJobs
} = require('../controllers/jobPreferenceController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getJobPreferences)
  .post(saveJobPreferences)
  .delete(deleteJobPreferences);

router.get('/recommended-jobs', getRecommendedJobs);

module.exports = router;
