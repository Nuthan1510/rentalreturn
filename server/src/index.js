import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';

import itemsRouter from './routes/items.js';
import rentalsRouter from './routes/rentals.js';
import statsRouter from './routes/stats.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { seedIfEmpty } from './utils/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5000;

async function connectDb() {
  let uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mem = await MongoMemoryServer.create();
      uri = mem.getUri('rentalreturn');
      console.log('ℹ️  No MONGODB_URI set - using a temporary in-memory MongoDB (data resets on restart).');
    } catch (e) {
      console.error('❌ No MONGODB_URI set and mongodb-memory-server is unavailable.');
      console.error('   Set MONGODB_URI in server/.env (local MongoDB or Atlas).');
      throw e;
    }
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('✅ MongoDB connected');
  await mongoose.syncIndexes();
  if (process.env.SEED !== 'false' && (await seedIfEmpty())) console.log('🌱 Seeded demo equipment and rentals');
}

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', time: new Date() });
});
app.use('/api/items', itemsRouter);
app.use('/api/rentals', rentalsRouter);
app.use('/api/stats', statsRouter);

// Serve the built React app in production (single-deploy)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use('/api', notFoundHandler);
app.use(errorHandler);

connectDb()
  .then(() => app.listen(PORT, () => console.log(`🚀 RentalReturn API on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });

process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));
