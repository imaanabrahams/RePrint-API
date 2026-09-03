import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import productRoutes from './routes/products.js';
import materialRoutes from './routes/materials.js';
import designRoutes from './routes/designs.js';
import paymentRoutes from './routes/payments.js';
import consultationRoutes from './routes/consultations.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'RePrint API is running' });
});

app.use('/api/products', productRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/notifications', notificationRoutes);

export default app;