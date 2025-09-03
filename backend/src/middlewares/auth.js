import jwt from 'jsonwebtoken';
import { User } from '../models/userModel.js';

export const authMiddleware = async (req, res, next) => {
  // Check for token in Authorization header
  const authHeader = req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader?.replace('Bearer ', '') : authHeader;

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token provided' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }

    next();
  } catch (err) {
    const errorMsg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    res.status(401).json({ error: errorMsg });
  }
};

// Role-based middleware
export const roleMiddleware = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Access restricted to ${roles.join(' or ')}` });
  }
  next();
};