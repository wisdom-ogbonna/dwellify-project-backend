import express from 'express';
import { completeSignup, getUserByPhone, sendVerificationCode, verifyCode } from '../controllers/authController.js';

const router = express.Router();

router.post('/send-code', sendVerificationCode);
router.post('/verify-code', verifyCode);
router.post('/signup', completeSignup);
router.get('/user', getUserByPhone); // <-- ✅ new GET route

export default router;
