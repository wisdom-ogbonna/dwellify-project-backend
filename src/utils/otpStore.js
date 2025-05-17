export const otpStore = {};

export const generateOTP = () => Math.floor(100000 + Math.random() * 900000);
