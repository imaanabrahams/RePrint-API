import express from 'express';
import cors from 'cors'

import productRoutes from './routes/productRoutes.js'
import materialRoutes from './routes/materialRoutes.js'
import designRoutes from './routes/designRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import wishlistRoutes from './routes/wishlistRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
const app = express()

app.use(cors())
app.use(express.json())


app.get('/',(req,res)=>{
    res.json({message:'RePrint is running'})
})


app.use('/api/products',productRoutes)
app.use('/api/materials',materialRoutes)
app.use('/api/designs', designRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/notifications', notificationRoutes)


export default app
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import consultationRoutes from './routes/consultationRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import shiftRoutes from './routes/shiftRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RePrint API is running' });
});

app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

export default app;
