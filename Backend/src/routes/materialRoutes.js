import express from 'express'
import { getAllMaterials,getMaterialById } from '../controllers/materialController.js'
import { cacheMiddleware } from '../middleware/cacheMiddleware.js'
const router = express.Router()

router.get('/',cacheMiddleware,getAllMaterials)
router.get('/:id',cacheMiddleware,getMaterialById)

export default router