import pool from '../config/db.js'

export const getAllDesigns = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM designs')
    res.json(rows)
  } catch (err) {
    console.error('GET DESIGNS ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}

export const getDesignById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM designs WHERE id = ?', [req.params.id])
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Design not found' })
    }
    res.json(rows[0])
  } catch (err) {
    console.error('GET DESIGN BY ID ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}

export const createDesign = async (req, res) => {
  try {
    const { user_id, name, description, file_url, product_id, material_id, dimensions, customizations, estimated_price, preview_url } = req.body

    if (!user_id || !name) {
      return res.status(400).json({ error: 'user_id and name are required' })
    }

    const [result] = await pool.query(
      `INSERT INTO designs (user_id, name, description, file_url, product_id, material_id, dimensions, customizations, estimated_price, preview_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        name,
        description || null,
        file_url || null,
        product_id || null,
        material_id || null,
        dimensions ? JSON.stringify(dimensions) : null,
        customizations ? JSON.stringify(customizations) : null,
        estimated_price || null,
        preview_url || null,
      ]
    )

    res.status(201).json({ id: result.insertId, name })
  } catch (err) {
    console.error('CREATE DESIGN ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}

export const updateDesign = async (req, res) => {
  try {
    const { name, description, status, dimensions, customizations, estimated_price } = req.body

    const [existing] = await pool.query('SELECT id FROM designs WHERE id = ?', [req.params.id])
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Design not found' })
    }

    await pool.query(
      `UPDATE designs SET name = ?, description = ?, status = ?, dimensions = ?, customizations = ?, estimated_price = ? WHERE id = ?`,
      [
        name,
        description || null,
        status || 'draft',
        dimensions ? JSON.stringify(dimensions) : null,
        customizations ? JSON.stringify(customizations) : null,
        estimated_price || null,
        req.params.id,
      ]
    )

    res.json({ message: 'Design updated successfully' })
  } catch (err) {
    console.error('UPDATE DESIGN ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}

export const deleteDesign = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM designs WHERE id = ?', [req.params.id])
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Design not found' })
    }

    await pool.query('DELETE FROM designs WHERE id = ?', [req.params.id])
    res.json({ message: 'Design deleted successfully' })
  } catch (err) {
    console.error('DELETE DESIGN ERROR:', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}