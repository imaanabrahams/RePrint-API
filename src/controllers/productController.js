import { query } from '../config/db.js'

export async function getAllProducts(req, res) {
  try {
    const [rows] = await query('SELECT * FROM products')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function getProductById(req, res) {
  try {
    const [rows] = await query('SELECT * FROM products WHERE id = ?', [req.params.id])
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}