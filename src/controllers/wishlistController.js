import pool from '../config/db.js'

export const getWishlistByUser = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT wishlist.id, products.* FROM wishlist
       JOIN products ON wishlist.product_id = products.id
       WHERE wishlist.user_id = ?`,
      [req.params.userId]
    )
    res.json(rows)
  } catch (err) {
    console.error('GET WISHLIST ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}

export const addToWishlist = async (req, res) => {
  try {
    const { user_id, product_id } = req.body

    if (!user_id || !product_id) {
      return res.status(400).json({ error: 'user_id and product_id are required' })
    }

    const [result] = await pool.query(
      'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)',
      [user_id, product_id]
    )

    res.status(201).json({ id: result.insertId })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Item already in wishlist' })
    }
    console.error('ADD WISHLIST ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}

export const removeFromWishlist = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM wishlist WHERE id = ?', [req.params.id])
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Wishlist item not found' })
    }

    await pool.query('DELETE FROM wishlist WHERE id = ?', [req.params.id])
    res.json({ message: 'Removed from wishlist' })
  } catch (err) {
    console.error('REMOVE WISHLIST ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}