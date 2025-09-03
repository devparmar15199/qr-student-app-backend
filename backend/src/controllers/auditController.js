import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { AuditLog } from '../models/auditLogModel.js';

/**
 * @route GET /api/audit-logs
 * @desc  Get audit logs with optional filters
 * @access Admin only
 */
export const getAuditLogs = async (req, res) => {
    try {
        const { userId, action, startDate, endDate, status } = req.query;
        const query = {};

        if (userId) {
            if (!mongoose.isValidObjectId(userId)) {
                throw new Error('Invalid userId');
            }
            query.userId = userId;
        }

        if (action) {
            query.action = action;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        if (status) {
            query.status = status;
        }

        const logs = await AuditLog.find(query)
            .populate('userId', 'fullName email role')
            .sort({ createdAt: -1 })
            .limit(100);
        
        res.json(logs);
    } catch (err) {
        logger.error('Get audit logs error:', err);
        res.status(err.message.includes('Invalid') ? 400 : 500).json({ error: err.message });
    }
};