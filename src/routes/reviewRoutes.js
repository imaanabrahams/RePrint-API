import express from 'express'
import { getReviewsByProduct, createReview, deleteReview } from '../controllers/reviewController.js'

const router = express.Router()

router.get('/product/:productId', getReviewsByProduct)
router.post('/', createReview)
router.delete('/:id', deleteReview)

export default router