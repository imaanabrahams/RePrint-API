import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import authRoutes from './src/routes/auth.js';
import productRoutes from './src/routes/products.js';
import materialRoutes from './src/routes/materials.js';
import orderRoutes from './src/routes/orders.js';
import designRoutes from './src/routes/designs.js';
import adminRoutes from './src/routes/admin.js';
import userRoutes from './src/routes/users.js';
import hrRoutes from './src/routes/hr.js';
import paymentRoutes from './src/routes/payments.js';
import consultationRoutes from './src/routes/consultations.js';
import notificationRoutes from './src/routes/notifications.js';
import wishlistRoutes from './src/routes/wishlist.js';
import invoiceRoutes from './src/routes/invoices.js';


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/notifications', notificationRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/consultations', consultationRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'running',
    service: 'RePrint 3D API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Product images (copied from the frontend assets)
app.use('/images', express.static(path.join(import.meta.dirname, 'public', 'images')));

// Serve the built frontend (RePrint/dist) when it exists.
// In development the Vite dev server proxies /api and /images here instead.
const clientDist = path.join(import.meta.dirname, '..', 'RePrint', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`
  ============================================
    RePrint 3D API Server
    Running on http://localhost:${PORT}
    API Base: http://localhost:${PORT}/api
    Frontend: ${fs.existsSync(clientDist) ? `http://localhost:${PORT}` : 'Vite dev server (npm run dev in RePrint)'}
  ============================================
  `);
});

export default app;