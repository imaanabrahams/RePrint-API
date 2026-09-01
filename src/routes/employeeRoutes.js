import express from 'express';

const router = express.Router();

router.get('/', (req, res) => res.send('Get all employees'));
router.post('/', (req, res) => res.send('Create employee'));
router.put('/:id', (req, res) => res.send('Update employee'));
router.get('/:id/shifts', (req, res) => res.send('Get shifts for employee'));

export default router;