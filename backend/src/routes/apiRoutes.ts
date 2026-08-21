import { Router } from 'express';
import { authController } from '../controllers/authController';
import { deviceController } from '../controllers/deviceController';
import { healthController } from '../controllers/healthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Health Check
router.get('/health', (req, res) => healthController.getHealth(req, res));

// Auth & Registration
router.post('/auth/register', (req, res, next) => authController.register(req, res, next));

// Peer Discovery (Protected by JWT)
router.get('/devices', authenticateToken, (req, res, next) => deviceController.getDevices(req, res, next));
router.get('/devices/:id', authenticateToken, (req, res, next) => deviceController.getDeviceById(req, res, next));

export default router;
