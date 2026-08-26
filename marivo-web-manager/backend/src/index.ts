import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import { projectRouter } from './routes/projects';
import { chatRouter } from './routes/chat';
import { authRouter } from './routes/auth';
import { analysisRouter } from './routes/analysis';
import { errorHandler } from './middleware/errorHandler';
import { initDatabase } from './models/database';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const httpServer = createServer(app);

// WebSocket for real-time task progress
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('close', () => console.log('WebSocket client disconnected'));
});

app.set('wss', wss);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files for uploaded projects
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
app.use('/projects', express.static(path.resolve(__dirname, '../projects')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/chat', chatRouter);
app.use('/api/analysis', analysisRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Initialize database and start server
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await initDatabase();
    console.log('Database initialized');
  } catch (err) {
    console.warn('Database initialization skipped (will use in-memory fallback):', (err as Error).message);
  }

  httpServer.listen(PORT, () => {
    console.log(`Marivo Web Manager API running on http://localhost:${PORT}`);
  });
}

start();

export default app;