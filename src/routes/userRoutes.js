import express from 'express';
import { getUserOrders } from '../controllers/userController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:id/orders', verifyToken, getUserOrders);

export default router;