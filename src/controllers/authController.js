// controllers/authController.js

import { client, twilioPhone } from '../config/twilioClient.js';
import { otpStore, generateOTP } from '../utils/otpStore.js';
import { auth } from '../config/firebase.js';

export const sendVerificationCode = async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  const otp = generateOTP();

  otpStore[phone] = { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 };

  try {
    const message = await client.messages.create({
      body: `Your OTP code is ${otp}`,
      from: twilioPhone,
      to: phone
    });

    res.status(200).json({ success: true, message: 'OTP sent successfully', sid: message.sid });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send OTP', error: error.message });
  }
};

export const verifyCode = async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ success: false, message: 'Phone and code are required' });
  }

  const record = otpStore[phone];

  if (!record) {
    return res.status(400).json({ success: false, message: 'No OTP found for this phone number' });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[phone];
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }

  if (record.code !== code) {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  // OTP is valid
  delete otpStore[phone];

  try {
    let user;

    try {
      user = await auth.getUserByPhoneNumber(phone);
    } catch (err) {
      // If user doesn't exist, create one
      user = await auth.createUser({ phoneNumber: phone });
    }

    // Create a Firebase custom token
    const customToken = await auth.createCustomToken(user.uid);

    return res.status(200).json({
      success: true,
      message: 'OTP verified and Firebase user authenticated',
      uid: user.uid,
      customToken
    });
  } catch (firebaseError) {
    return res.status(500).json({
      success: false,
      message: 'Firebase error',
      error: firebaseError.message
    });
  }
};
