import express from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.js';
import { validate, auditLogQueryValidation } from '../middlewares/validate.js';

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware(['admin']), validate(auditLogQueryValidation), getAuditLogs);

export default router;