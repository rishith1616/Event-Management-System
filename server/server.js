/**
 * server.js — Express application entry point
 * Sets up middleware, connects to MongoDB, and mounts API routes.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import eventRoutes from './routes/events.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Core Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────────────────
// app.use('/api/auth',     authRoutes);
app.use('/api/events', eventRoutes);
// app.use('/api/tickets',  ticketRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/admin',    adminRoutes);

// ── Error Handler ────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();

export default app;
