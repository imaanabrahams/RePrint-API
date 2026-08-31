import express from 'express';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import consultationRoutes from './routes/consultationRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import shiftRoutes from './routes/shiftRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();
app.use(express.json());

app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

app.listen(3000, () => console.log('Server is running on http://localhost:3000'));