const express = require('express');
const router = express.Router();
const {
  getPublicKey,
  initializePayment,
  verifyPayment,
  handleWebhook,
  getPaymentHistory,
  refundPayment
} = require('../controllers/paystackController');
const { protect, authorize } = require('../middleware/auth');

router.get('/public-key', getPublicKey);

// Protected routes (require authentication)
router.post('/initialize', protect, authorize('student'), initializePayment);
router.get('/verify/:reference', protect, verifyPayment);
router.get('/history', protect, authorize('student'), getPaymentHistory);
router.post('/refund', protect, refundPayment);

// Public webhook route - should be hit by Paystack servers
router.post('/webhook', handleWebhook);

module.exports = router;
