import express from 'express';

const cors = require('cors')

const authRoutes = require('./routes/authRoutes')
const productRoutes = require('./routes/productRoutes').default

const app = express()

app.use(cors())
app.use(express.json())

app.get('/',(req,res)=>{
    res.json({message:'RePrint is running'})
})

app.use('/api/auth',authRoutes)
app.use('api/products',productRoutes)

module.exports=app