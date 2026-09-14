import express from 'express'
const router = express.Router()

router.post('/signup',(req, res )=>{
    const {email,subscribeToUpdates} = req.body || {}
    console.log(`[notifications] signup acknowledgement for ${email || 'unknown'} (marketing opt-in: ${!!subscribeToUpdates})`)
    res.status(202).json({queued: true})
})

export default router