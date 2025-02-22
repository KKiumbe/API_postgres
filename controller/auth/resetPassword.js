const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { sendSMS } = require('./requestOTPSMS.js');
const prisma = new PrismaClient();

const requestOTP = async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    // Find the user by phone number
    const user = await prisma.user.findUnique({ where: { phoneNumber } });

    if (!user) {
      return res.status(404).json({ message: 'If the phone number exists, an OTP has been sent.' });
    }

    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the OTP before saving it to the database
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // Set OTP expiry time (e.g., 10 minutes)
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP and expiry time to the database
    await prisma.user.update({
      where: { phoneNumber },
      data: {
        resetCode: hashedOtp,
        resetCodeExpiresAt: otpExpiresAt,
        otpAttempts: 0,
      },
    });

    // Send the OTP to the user via SMS
    const message = `Your one-time password (OTP) is: ${otp}`;
    await sendSMS(message, user);

    res.status(200).json({ message: 'If the phone number exists, an OTP has been sent.' });
  } catch (error) {
    console.error('Error requesting OTP:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const verifyOTP = async (req, res) => {
  const { phoneNumber, otp } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { phoneNumber } });

    if (!user || !user.resetCode) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    if (user.otpAttempts >= 5) {
      return res.status(403).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const isOtpValid =
      hashedOtp === user.resetCode && user.resetCodeExpiresAt > new Date();

    if (!isOtpValid) {
      await prisma.user.update({
        where: { phoneNumber },
        data: { otpAttempts: user.otpAttempts + 1 },
      });
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Clear OTP and reset OTP attempts
    await prisma.user.update({
      where: { phoneNumber },
      data: { resetCode: null, resetCodeExpiresAt: null, otpAttempts: 0 },
    });

    res.status(200).json({ message: 'OTP verified. You can now reset your password.' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const resetPassword = async (req, res) => {
  const { phoneNumber, newPassword } = req.body;

  if (!phoneNumber || !newPassword) {
    return res.status(400).json({ message: "Phone number and new password are required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user || user.resetCode || user.otpAttempts > 0) {
      return res.status(403).json({
        message: "OTP verification required before resetting password.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { phoneNumber },
      data: {
        password: hashedPassword,
      },
    });

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Error resetting password." });
  }
};


module.exports = {
  requestOTP,
  verifyOTP,
  resetPassword,
};
