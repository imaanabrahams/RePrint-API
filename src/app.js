import express from 'express';
import cors from 'cors'

import productRoutes from './routes/productRoutes.js'
import materialRoutes from './routes/materialRoutes.js'
import designRoutes from './routes/designRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import wishlistRoutes from './routes/wishlistRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
const app = express()

app.use(cors())
app.use(express.json())

app.get('/',(req,res)=>{
    res.json({message:'RePrint is running'})
})


app.use('/api/products',productRoutes)

app.use('/api/designs', designRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/notifications', notificationRoutes)


export default app