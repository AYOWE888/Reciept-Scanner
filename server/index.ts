import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { config } from './config/env';
import authRoutes from './routes/auth.routes';
import scanRoutes from './routes/scan.routes';
import sheetsRoutes from './routes/sheets.routes';
import assistantRoutes from './routes/assistant.routes';
import { getDatabase } from './db';

const app = express();
const PORT = config.port;

// Express Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Database connection on start
getDatabase();

// Health Check Endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes Modular Mounts
app.use('/api/auth', authRoutes);
app.use('/api', scanRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/assistant', assistantRoutes);

// Vite Dev Server or Standalone Production Build
export async function startServer() {
  if (config.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Receipt Tracker Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
