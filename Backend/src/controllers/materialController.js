import pool from '../config/db.js'

export const getAllMaterials = async (req, res) =>{
    try{
        const [rows] = await pool.query('SELECT * FROM materials')
        res.json(rows)
    }catch (err){
        console.error('GET MATERIALS ERROR:',err)
        res.status(500).json({error: err.message || 'Unknown error'})
    }
}

export const getMaterialById = async (req, res)=>{
    try{
        const [rows]= await pool.query('SELECT * FROM materials WHERE id=?',[req.params.id])
        if (rows.length===0){
            return res.status(404).json({error: 'Material not found'})
        }
        res.json(rows[0])
    }catch (err){
        console.error('GET MATERIAL BY ID ERROR:',err)
        res.status(500).json({error: err.message || 'Unknown error'})
    }
}