import pool from '../config/db'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

exports.register = async (req,res)=>{
    try{
        const {name,email,password,phone,address}= req.body

        if (!name || !email || password){
            return res.status(400).json({error:'Name,email, and password are required'})

        }
        const [existing ] = await pool.query('SELECT id FROM users WHERE email = ?',[email])
        if (existing.length>0){
            return res.status(409).json({error: 'Email is already registered'})

        }
        const hashedPassword = await bcrypt.hash(password,10)
        const [result] = await pool.query(
            'INSERT INTO users (name,email,password,phone,ddress) VALUES (?,?,?,?,?)',
            [name,email,hashedPassword,phone || null, address || null]
        )

        res.status(201).json({id: result.insertId,name, email})

    }catch (err) {
        res.status(500).json({error:err.message})
    }
}

exports.login = async (req,res)=>{
    try{
        const {email,password} = req.body
        if (!email || !password) {
            return res.status(400).json({error:'Email and password are required'})

        }

        const [rows] = await pool.query('SELECT * FROM usersWHERE email = ?',[email])
        if (rows.length === 0 ){
            return res.status(401).json({error:'Invalid email or password'})

        }
        const user = rows[0]
        const validPassword = await bcrypt.compare(password,user.password)
        if (!validPassword){
            return res.status(401).json({error:'Invalid email or password'})

        }
        const token = jwt.sign(
            {id:user.id, email:user.email, role: user.role},
            process.env.JWT_SECRET,
            {expiresIn:'7 days'}
        )
        res.json({
            token,
            user:{id:user.id,name:user.name, email:user.email, role: user.role},

        })

    }catch (err){
        res.status(500).json({error: err.message})
    }
}