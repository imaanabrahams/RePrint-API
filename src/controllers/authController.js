import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByEmail, findEmployeeByUserId, createUser } from '../models/userModel.js';

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUserRole = role || 'customer';
    const userId = await createUser(name, email, hashedPassword, newUserRole);

    const token = jwt.sign(
      { id: userId, email, role: newUserRole, isEmployee: false },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      redirectTo: '/index.html',
      user: {
        id: userId,
        name,
        email,
        role: newUserRole,
        isEmployee: false
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const employee = await findEmployeeByUserId(user.id);
    const isEmployee = Boolean(employee);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, isEmployee },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const redirectPath = isEmployee || user.role === 'admin' 
      ? '/employee/dashboard' 
      : '/index.html';

    res.json({
      message: 'Login successful',
      token,
      redirectTo: redirectPath,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmployee
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};