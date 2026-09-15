import express from 'express'
import { getAllDesigns, getDesignById, createDesign, updateDesign, deleteDesign } from '../controllers/designController.js'

const router = express.Router()

router.get('/', getAllDesigns)
router.get('/:id', getDesignById)
router.post('/', createDesign)
router.put('/:id', updateDesign)
router.delete('/:id', deleteDesign)

export default router