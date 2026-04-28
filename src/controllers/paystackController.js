const axios = require('axios');
const Booking = require('../models/Booking');
const User = require('../models/User');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const PAYSTACK_CURRENCY = process.env.PAYSTACK_CURRENCY || 'GHS';

const paystackAPI = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
});

const ensurePaystackSecretKey = (res) => {
  if (!PAYSTACK_SECRET_KEY) {
    res.status(500).json({
      success: false,
      message: 'Paystack secret key is not configured on the server'
    });
    return false;
  }
  return true;
};

const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const normalizeAmountToSubunit = (amount) => {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const subunit = Math.round(parsed * 100);
  if (!Number.isInteger(subunit) || subunit <= 0) return null;
  return subunit;
};

const sendBookingPaidConfirmationEmail = async (booking) => {
  if (
    !process.env.EMAIL_HOST ||
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASSWORD
  ) {
    return false;
  }

  const studentEmail = booking?.student?.email;
  if (!isValidEmail(studentEmail)) {
    return false;
  }

  const hostelName = booking?.hostel?.name || 'the hostel';
  const studentName = booking?.student?.name || 'Student';
  const roomName = booking?.room?.name || 'your selected room';

  let adminEmail = booking?.hostel?.contact?.email;
  if (!adminEmail && booking?.hostel?.adminId) {
    const adminId =
      typeof booking.hostel.adminId === 'object'
        ? booking.hostel.adminId._id
        : booking.hostel.adminId;

    if (adminId) {
      const adminUser = await User.findById(adminId).select('email');
      adminEmail = adminUser?.email;
    }
  }

  const fromEmail = adminEmail || process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  await transporter.sendMail({
    from: `${hostelName} <${fromEmail}>`,
    replyTo: adminEmail || fromEmail,
    to: studentEmail,
    subject: `Booking Confirmed: ${hostelName}`,
    text: `Hi ${studentName},\n\nYour booking payment has been confirmed for ${roomName} at ${hostelName}.\n\nYour reservation is now active. The hostel administrator will contact you if any additional details are required.\n\nBest regards,\n${hostelName}`,
    html: `
      <p>Hi ${studentName},</p>
      <p>Your booking payment has been <strong>confirmed</strong> for <strong>${roomName}</strong> at <strong>${hostelName}</strong>.</p>
      <p>Your reservation is now active. The hostel administrator will contact you if any additional details are required.</p>
      <p>Best regards,<br/>${hostelName}</p>
    `
  });

  return true;
};

// @desc    Get Paystack public key
// @route   GET /api/payments/public-key
// @access  Public
exports.getPublicKey = async (req, res) => {
  if (!PAYSTACK_PUBLIC_KEY) {
    return res.status(500).json({
      success: false,
      message: 'Paystack public key is not configured'
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      publicKey: PAYSTACK_PUBLIC_KEY
    }
  });
};

// @desc    Initialize Paystack payment
// @route   POST /api/payments/initialize
// @access  Private (student)
exports.initializePayment = async (req, res) => {
  try {
    if (!ensurePaystackSecretKey(res)) return;

    const { bookingId } = req.body;

    // Get booking details
    const booking = await Booking.findById(bookingId)
      .populate('student', 'email firstName lastName phone')
      .populate('hostel', 'name');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify booking belongs to user
    if (booking.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay for this booking'
      });
    }

    // Check if already paid
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been paid for'
      });
    }

    const user = booking.student;
    const amountInSubunit = normalizeAmountToSubunit(booking.totalAmount);

    if (!booking.room || !booking.room.name) {
      return res.status(400).json({
        success: false,
        message: 'Booking room details are incomplete'
      });
    }

    if (!isValidEmail(user.email)) {
      return res.status(400).json({
        success: false,
        message: 'A valid student email is required before payment can be initialized'
      });
    }

    if (!amountInSubunit) {
      return res.status(400).json({
        success: false,
        message: 'Booking amount is invalid for payment initialization'
      });
    }

    // Prepare Paystack payload
    const paystackPayload = {
      email: user.email,
      amount: amountInSubunit,
      currency: PAYSTACK_CURRENCY,
      metadata: {
        customer_code: user._id.toString(),
        booking_id: booking._id.toString(),
        hostel_name: booking.hostel.name,
        room_name: booking.room.name,
        customer_info: {
          custom_fields: [
            {
              display_name: 'Full Name',
              variable_name: 'full_name',
              value: `${user.firstName} ${user.lastName}`
            },
            {
              display_name: 'Phone Number',
              variable_name: 'phone',
              value: user.phone || 'N/A'
            },
            {
              display_name: 'Hostel Name',
              variable_name: 'hostel_name',
              value: booking.hostel.name
            },
            {
              display_name: 'Room Name',
              variable_name: 'room_name',
              value: booking.room.name
            }
          ]
        }
      }
    };

    // Initialize transaction with Paystack
    const response = await paystackAPI.post('/transaction/initialize', paystackPayload);

    if (!response.data.status) {
      const upstreamMessage = response.data?.message || response.data?.data?.message;
      return res.status(400).json({
        success: false,
        message: upstreamMessage || 'Failed to initialize payment'
      });
    }

    // Update booking with Paystack reference
    booking.paystackReference = response.data.data.reference;
    await booking.save();

    return res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        accessCode: response.data.data.access_code,
        authorizationUrl: response.data.data.authorization_url,
        reference: response.data.data.reference,
        bookingId: booking._id,
        amount: booking.totalAmount,
        hostel: booking.hostel.name,
        room: booking.room.name
      }
    });
  } catch (error) {
    const paystackMessage = error.response?.data?.message || error.response?.data?.data?.message;
    console.error('Paystack initialization error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: paystackMessage || 'Error initializing payment',
      error: error.message
    });
  }
};

// @desc    Verify Paystack payment
// @route   GET /api/payments/verify/:reference
// @access  Private (student)
exports.verifyPayment = async (req, res) => {
  try {
    if (!ensurePaystackSecretKey(res)) return;

    const { reference } = req.params;

    // Verify with Paystack
    const response = await paystackAPI.get(`/transaction/verify/${reference}`);

    if (!response.data.status) {
      const upstreamMessage = response.data?.message || response.data?.data?.message;
      return res.status(400).json({
        success: false,
        message: upstreamMessage || 'Payment verification failed'
      });
    }

    const paymentData = response.data.data;

    // Check if payment was successful
    if (paymentData.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: `Payment ${paymentData.status}. Status: ${paymentData.gateway_response}`
      });
    }

    // Find booking by reference
    const booking = await Booking.findOne({ paystackReference: reference })
      .populate('student')
      .populate('hostel');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const expectedAmount = normalizeAmountToSubunit(booking.totalAmount);
    if (!expectedAmount || paymentData.amount !== expectedAmount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch. Booking will not be confirmed.'
      });
    }

    // Verify payment belongs to authenticated user
    if (booking.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to verify this payment'
      });
    }

    const wasAlreadyPaid = booking.paymentStatus === 'paid';

    // Update booking status
    booking.paymentStatus = 'paid';
    booking.status = 'confirmed';
    booking.paymentMethod = 'card';
    booking.paystackCustomerId = paymentData.customer.customer_code;
    await booking.save();

    let confirmationEmailSent = false;
    if (!wasAlreadyPaid) {
      try {
        confirmationEmailSent = await sendBookingPaidConfirmationEmail(booking);
      } catch (emailError) {
        console.error('Booking confirmation email sending failed:', emailError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        bookingId: booking._id,
        paymentStatus: booking.paymentStatus,
        status: booking.status,
        amount: paymentData.amount / 100,
        reference: paymentData.reference,
        paidAt: paymentData.paid_at,
        hostel: booking.hostel.name,
        room: booking.room.name,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        confirmationEmailSent
      }
    });
  } catch (error) {
    console.error('Paystack verification error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
};

// @desc    Handle Paystack webhook
// @route   POST /api/payments/webhook
// @access  Public (webhook from Paystack)
exports.handleWebhook = async (req, res) => {
  try {
    if (!ensurePaystackSecretKey(res)) return;

    // Verify Paystack signature
    const hash = require('crypto')
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const booking = await Booking.findOne({ paystackReference: reference })
        .populate('student')
        .populate('hostel');

      if (booking && booking.paymentStatus !== 'paid') {
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed';
        booking.paymentMethod = 'card';
        booking.paystackCustomerId = event.data.customer.customer_code;
        await booking.save();

        try {
          await sendBookingPaidConfirmationEmail(booking);
        } catch (emailError) {
          console.error('Booking confirmation email sending failed:', emailError.message);
        }

        console.log(`Payment confirmed for booking ${booking._id} via webhook`);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook processed'
    });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Webhook processing error'
    });
  }
};

// @desc    Get payment history for user
// @route   GET /api/payments/history
// @access  Private (student)
exports.getPaymentHistory = async (req, res) => {
  try {
    const bookings = await Booking.find({
      student: req.user.id,
      paystackReference: { $exists: true, $ne: null }
    })
      .populate('hostel', 'name location')
      .sort('-createdAt');

    const payments = bookings.map(booking => ({
      bookingId: booking._id,
      reference: booking.paystackReference,
      hostel: booking.hostel.name,
      room: booking.room.name,
      amount: booking.totalAmount,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.status,
      createdAt: booking.createdAt.toISOString(),
      checkInDate: booking.checkInDate.toISOString()
    }));

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching payment history',
      error: error.message
    });
  }
};

// @desc    Refund payment
// @route   POST /api/payments/refund
// @access  Private (admin/student)
exports.refundPayment = async (req, res) => {
  try {
    if (!ensurePaystackSecretKey(res)) return;

    const { bookingId, reason } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify authorization
    if (booking.student.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to process refund'
      });
    }

    if (booking.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Only paid bookings can be refunded'
      });
    }

    // Request refund from Paystack
    const refundPayload = {
      transaction: booking.paystackReference,
      amount: booking.totalAmount * 100,
      customer_note: reason || 'Booking cancellation',
      merchant_note: `Refund for booking ${booking._id}`
    };

    const response = await paystackAPI.post('/refund', refundPayload);

    if (!response.data.status) {
      return res.status(400).json({
        success: false,
        message: 'Failed to process refund'
      });
    }

    // Update booking status
    booking.paymentStatus = 'refunded';
    booking.status = 'cancelled';
    await booking.save();

    return res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        bookingId: booking._id,
        refundStatus: 'pending',
        refundReference: response.data.data.reference,
        amount: booking.totalAmount
      }
    });
  } catch (error) {
    console.error('Refund error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Error processing refund',
      error: error.message
    });
  }
};
