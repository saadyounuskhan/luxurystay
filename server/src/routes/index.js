import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.routes.js';
import hotelRoutes from './hotel.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/', hotelRoutes);

export default router;
