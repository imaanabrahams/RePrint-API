import pool from '../config/db.js'

export const getNotificationsByUser = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.userId]
    )
    res.json(rows)
  } catch (err) {
    console.error('GET NOTIFICATIONS ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}

export const markNotificationRead = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM notifications WHERE id = ?', [req.params.id])
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    await pool.query('UPDATE notifications SET `read` = TRUE WHERE id = ?', [req.params.id])
    res.json({ message: 'Notification marked as read' })
  } catch (err) {
    console.error('MARK NOTIFICATION READ ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}