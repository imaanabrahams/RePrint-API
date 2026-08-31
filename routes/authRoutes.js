import express from 'express';

const router = express.Router();

router.post('/register', (req, res) => res.send('Register user'));
router.post('/login', (req, res) => res.send('Login user'));

export default router;