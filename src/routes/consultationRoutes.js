import express from 'express';

const router = express.Router();

router.get('/', (req, res) => res.send('Get all consultations'));
router.post('/', (req, res) => res.send('Create consultation'));
router.put('/:id', (req, res) => res.send('Update consultation'));

export default router;
