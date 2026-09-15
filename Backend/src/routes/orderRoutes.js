import express from 'express';

const router = express.Router();

router.get('/', (req, res) => res.send('Get all orders'));
router.get('/:id', (req, res) => res.send('Get order by ID'));
router.post('/', (req, res) => res.send('Create order'));
router.put('/:id/status', (req, res) => res.send('Update order status'));
router.get('/:id/invoice', (req, res) => res.send('Get invoice for order'));

export default router;