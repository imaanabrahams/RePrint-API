import express from 'express'
import { getNotificationsByUser, markNotificationRead } from '../controllers/notificationController.js'

const router = express.Router()

router.get('/user/:userId', getNotificationsByUser)
router.put('/:id/read', markNotificationRead)

export default router