import pool from '../config/db.js'

export const getReviewsByProduct = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reviews WHERE product_id = ?', [req.params.productId])
    res.json(rows)
  } catch (err) {
    console.error('GET REVIEWS ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}

export const createReview = async (req, res) => {
  try {
    const { user_id, product_id, rating, comment } = req.body

    if (!user_id || !product_id || !rating) {
      return res.status(400).json({ error: 'user_id, product_id, and rating are required' })
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    const [result] = await pool.query(
      'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)',
      [user_id, product_id, rating, comment || null]
    )

    res.status(201).json({ id: result.insertId })
  } catch (err) {
    console.error('CREATE REVIEW ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}

export const deleteReview = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM reviews WHERE id = ?', [req.params.id])
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Review not found' })
    }

    await pool.query('DELETE FROM reviews WHERE id = ?', [req.params.id])
    res.json({ message: 'Review deleted successfully' })
  } catch (err) {
    console.error('DELETE REVIEW ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}