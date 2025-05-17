import axios from 'axios';
import { config } from '../config/config.js';

export const sendSMS = async (phoneNumber, code) => {
  const payload = {
    api_key: config.termiiApiKey,
    to: phoneNumber,
    from: 'N-Alert',
    sms: `Your verification code is ${code}`,
    type: 'plain',
    channel: 'dnd',
  };

  const response = await axios.post('https://api.ng.termii.com/api/sms/send', payload);
  return response.data;
};
