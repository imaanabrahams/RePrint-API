import express from 'express';

const router = express.Router();

router.get('/:id', (req, res) => res.send('Get invoice by ID'));
router.post('/', (req, res) => res.send('Create invoice'));

export default router;