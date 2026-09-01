import express from 'express';

const router = express.Router();

router.post('/', (req, res) => res.send('Create shift'));
router.put('/:id', (req, res) => res.send('Update shift'));

export default router;