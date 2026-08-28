import { Router } from 'express'
const router = Router()
import authController from '../controllers/authController'

router.post('/register',authController.register)
router.post('/login',authController.login)

module.exports = router