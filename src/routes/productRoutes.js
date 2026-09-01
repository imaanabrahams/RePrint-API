import express from 'express'
import { getAllProducts, getProductById } from '../controllers/productController.js'
import { cacheMiddleware } from '../middleware/cacheMiddleware.js'

const router = express.Router()

router.get('/',cacheMiddleware, getAllProducts)
router.get('/:id',cacheMiddleware, getProductById)

export default router