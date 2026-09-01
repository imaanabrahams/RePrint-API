import express from 'express';
import { login, register } from '../controllers/authController.js';
import { validateLogin } from '../middleware/validateMiddelware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', validateLogin, login);

export default router;