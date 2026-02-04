import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import helmet from 'helmet';
import { authRouter } from './routes/auth';
import { turnsRouter } from './routes/turns';
import { playerRouter } from './routes/player';
import { explorationRouter } from './routes/exploration';
import { zonesRouter } from './routes/zones';
import { combatRouter } from './routes/combat';
import { inventoryRouter } from './routes/inventory';
import { equipmentRouter } from './routes/equipment';
import { gatheringRouter } from './routes/gathering';
import { craftingRouter } from './routes/crafting';
import { bestiaryRouter } from './routes/bestiary';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3002',
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
app.use('/api/v1/exploration', explorationRouter);
app.use('/api/v1/zones', zonesRouter);
app.use('/api/v1/combat', combatRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/equipment', equipmentRouter);
app.use('/api/v1/gathering', gatheringRouter);
app.use('/api/v1/crafting', craftingRouter);
app.use('/api/v1/bestiary', bestiaryRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Adventure API running on port ${PORT}`);
});
