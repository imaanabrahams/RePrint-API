import express from 'express';

const router = express.Router();

router.post('/', (req, res) => res.send('Create payment'));
router.get('/:id', (req, res) => res.send('Get payment by ID'));
router.put('/:id/status', (req, res) => res.send('Update payment status'));

export default router;