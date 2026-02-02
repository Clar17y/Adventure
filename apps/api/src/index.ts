import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth';
import { turnsRouter } from './routes/turns';
import { playerRouter } from './routes/player';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/turns', turnsRouter);
app.use('/api/v1/player', playerRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🎮 Adventure API running on port ${PORT}`);
});
