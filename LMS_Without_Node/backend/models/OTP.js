const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Auto-delete after expiry
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('OTP', otpSchema);
