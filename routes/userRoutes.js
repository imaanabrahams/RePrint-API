import express from 'express';

const router = express.Router();

router.get('/:id/orders', (req, res) => res.send('Get orders for user'));

export default router;