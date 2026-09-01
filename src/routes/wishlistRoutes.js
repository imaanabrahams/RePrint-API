import express from 'express'
import { getWishlistByUser, addToWishlist, removeFromWishlist } from '../controllers/wishlistController.js'

const router = express.Router()

router.get('/user/:userId', getWishlistByUser)
router.post('/', addToWishlist)
router.delete('/:id', removeFromWishlist)

export default router