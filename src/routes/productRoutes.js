import express from 'express'
import { param, validationResult } from 'express-validator'
import { getAllProducts, getProductById } from '../controllers/productController.js'
import { cacheMiddleware } from '../middleware/cacheMiddleware.js'

const router = express.Router()

// GET all products with caching
router.get('/', cacheMiddleware, getAllProducts)

// GET product by ID with validation & caching
router.get('/:id',
  param('id').isInt().withMessage('Product ID must be an integer'),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
  cacheMiddleware,
  getProductById
)

export default router
