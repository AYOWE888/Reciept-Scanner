import app, { startServer } from './server/index';

if (!process.env.VERCEL) {
  // Boot the modular Express backend locally or on a standard VPS
  startServer();
}

// Export for Vercel Serverless Function
export default app;
