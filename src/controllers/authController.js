import { client, twilioPhone } from '../config/twilioClient.js';
import { otpStore, generateOTP } from '../utils/otpStore.js';
import { auth } from '../config/firebase.js';

// 1. Send Verification Code
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




// 2. Verify Code and Handle Login or Prompt Signup
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
    // Check if user exists
    try {
      const user = await auth.getUserByPhoneNumber(phone);

      // User exists, return token
      const customToken = await auth.createCustomToken(user.uid);
      return res.status(200).json({
        success: true,
        message: 'User logged in',
        uid: user.uid,
        customToken,
        isNewUser: false
      });
    } catch (err) {
      // User does not exist, prompt for signup
      return res.status(200).json({
        success: true,
        message: 'OTP verified. Proceed to signup.',
        phone,
        isNewUser: true
      });
    }
  } catch (firebaseError) {
    return res.status(500).json({
      success: false,
      message: 'Firebase error',
      error: firebaseError.message
    });
  }
};




// 3. Complete Signup After OTP Verification
export const completeSignup = async (req, res) => {
  const { phone, name, email } = req.body;

  if (!phone || !name) {
    return res.status(400).json({ success: false, message: 'Phone and name are required' });
  }

  try {
    const user = await auth.createUser({
      phoneNumber: phone,
      displayName: name,
      email: email || undefined
    });

    const customToken = await auth.createCustomToken(user.uid);

    res.status(201).json({
      success: true,
      message: 'Signup complete and user created',
      uid: user.uid,
      customToken
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create user', error: error.message });
  }
};

// 4. Get User by Phone Number
export const getUserByPhone = async (req, res) => {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  try {
    const user = await auth.getUserByPhoneNumber(phone);

    return res.status(200).json({
      success: true,
      message: 'User found',
      uid: user.uid,
      phone: user.phoneNumber,
      name: user.displayName,
      email: user.email
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
      error: error.message
    });
  }
};
