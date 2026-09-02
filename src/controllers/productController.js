import  pool  from '../config/db.js'

export const getAllProducts = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products')
    res.json(rows)
  } catch (err) {
    console.error('GET PRODUCTS ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}

export const getProductById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id])
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.json(rows[0])
  } catch (err) {
    console.error('GET PRODUCT BY ID ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}