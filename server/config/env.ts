import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  googleClientId:
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    '745576921142-63e6nrfnb9ams9g35d3n0oa364tcprnk.apps.googleusercontent.com',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleSheetId: process.env.GOOGLE_SHEET_ID || '',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'receipt_tracker.db'),
};
