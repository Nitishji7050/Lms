const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const generateToken = (user) => {
  return jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if OTP already sent for this email
    const existingOtp = await OTP.findOne({ email });
    if (existingOtp) {
      return res.status(400).json({ message: 'OTP already sent to this email. Please verify to continue.' });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Create OTP record (valid for 5 minutes)
    await OTP.create({
      email,
      otp,
      name,
      password,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });

    // Send OTP via email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Email Verification OTP - LMS',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome to LMS!</h2>
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
              Thank you for signing up. Please verify your email address to complete your registration.
            </p>
            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">Your verification code:</p>
              <h1 style="color: #007bff; font-size: 36px; letter-spacing: 5px; margin: 0; font-family: monospace;">
                ${otp}
              </h1>
            </div>
            <p style="color: #666; font-size: 13px; margin: 20px 0;">
              This code will expire in <strong>5 minutes</strong>.
            </p>
            <p style="color: #666; font-size: 13px; margin: 20px 0;">
              If you didn't create this account, please ignore this email.
            </p>
            <p style="color: #999; font-size: 11px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              Do not share this code with anyone. LMS will never ask for your verification code.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: 'OTP sent to your email. Please verify to complete registration.',
      success: true,
      email: email
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Configure nodemailer for Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD
  }
});

// Forgot Password - Generate reset token and send email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    // Generate reset token (32 random bytes converted to hex)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token for storage
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token and expiry (valid for 1 hour)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.save();

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    // Email content
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 20px; border-radius: 5px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p style="color: #666; font-size: 14px;">
              You requested a password reset. Click the button below to reset your password.
            </p>
            <p style="color: #666; font-size: 12px; margin: 20px 0;">
              This link will expire in 1 hour.
            </p>
            <a href="${resetLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              Reset Password
            </a>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Or copy and paste this link in your browser:
            </p>
            <p style="color: #007bff; word-break: break-all; font-size: 12px;">
              ${resetLink}
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              If you didn't request this, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: 'Password reset link has been sent to your email',
      success: true
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error sending reset email', error: error.message });
  }
};

// Verify reset token
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Hash the token to match with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token and non-expired time
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.status(200).json({
      message: 'Token is valid',
      success: true,
      email: user.email
    });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying token' });
  }
};

// Reset Password - Update password with valid token
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Hash the token to match with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token and non-expired time
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    await user.save();

    res.status(200).json({
      message: 'Password has been reset successfully',
      success: true
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

// Send OTP for email verification during registration
exports.sendOTP = async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ message: 'Email, name, and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Delete old OTP if exists
    await OTP.deleteOne({ email });

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Create OTP record (valid for 5 minutes)
    await OTP.create({
      email,
      otp,
      name,
      password,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });

    // Send OTP via email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Email Verification OTP - LMS',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome to LMS!</h2>
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
              Thank you for signing up. Please verify your email address to complete your registration.
            </p>
            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">Your verification code:</p>
              <h1 style="color: #007bff; font-size: 36px; letter-spacing: 5px; margin: 0; font-family: monospace;">
                ${otp}
              </h1>
            </div>
            <p style="color: #666; font-size: 13px; margin: 20px 0;">
              This code will expire in <strong>5 minutes</strong>.
            </p>
            <p style="color: #666; font-size: 13px; margin: 20px 0;">
              If you didn't create this account, please ignore this email.
            </p>
            <p style="color: #999; font-size: 11px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              Do not share this code with anyone. LMS will never ask for your verification code.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: 'OTP sent to your email. Please verify to complete registration.',
      success: true,
      email: email
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Error sending OTP', error: error.message });
  }
};

// Verify OTP and complete registration
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({ message: 'No OTP found for this email' });
    }

    // Check if OTP expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ email });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Check attempt limit
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await OTP.deleteOne({ email });
      return res.status(400).json({ message: 'Maximum attempts exceeded. Please register again.' });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = otpRecord.maxAttempts - otpRecord.attempts;
      return res.status(400).json({ 
        message: `Invalid OTP. ${remaining} attempts remaining.`,
        attemptsRemaining: remaining
      });
    }

    // OTP verified - Create user
    const user = await User.create({
      name: otpRecord.name,
      email: otpRecord.email,
      password: otpRecord.password,
      role: 'student'
    });

    // Delete OTP record after verification
    await OTP.deleteOne({ email });

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'Email verified successfully. Registration complete!',
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find existing OTP record
    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({ message: 'No registration in progress for this email' });
    }

    // Generate new OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Update OTP record
    otpRecord.otp = otp;
    otpRecord.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Reset to 5 minutes
    otpRecord.attempts = 0; // Reset attempts
    await otpRecord.save();

    // Send OTP via email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Email Verification OTP - LMS (Resent)',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Email Verification - New Code</h2>
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
              Here is your new verification code. Please use this to complete your registration.
            </p>
            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">Your verification code:</p>
              <h1 style="color: #007bff; font-size: 36px; letter-spacing: 5px; margin: 0; font-family: monospace;">
                ${otp}
              </h1>
            </div>
            <p style="color: #666; font-size: 13px; margin: 20px 0;">
              This code will expire in <strong>5 minutes</strong>.
            </p>
            <p style="color: #666; font-size: 13px; margin: 20px 0;">
              If you didn't request this, please ignore this email.
            </p>
            <p style="color: #999; font-size: 11px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              Do not share this code with anyone. LMS will never ask for your verification code.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: 'New OTP sent to your email',
      success: true
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Error resending OTP', error: error.message });
  }
};
