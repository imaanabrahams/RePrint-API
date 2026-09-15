import { findUserById, getOrdersByUserId } from '../models/userModel.js';

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId, 10)) {
      return res.status(403).json({ message: 'Access forbidden: Cannot view another profile' });
    }

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...userProfile } = user;

    res.json({ user: userProfile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId, 10)) {
      return res.status(403).json({ message: 'Access forbidden: Cannot view another user\'s orders' });
    }

    const orders = await getOrdersByUserId(userId);
    res.json({ userId: parseInt(userId, 10), orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};