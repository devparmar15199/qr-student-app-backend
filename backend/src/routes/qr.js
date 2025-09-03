import express from 'express';
import {
  generateQRSession,
  refreshQRToken,
  terminateQRSession,
  getActiveQRSessions,
  terminateAllQRSessions,
  validateQRToken,
} from '../controllers/qrController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.js';
import {
  validate,
  qrSessionValidation,
  qrTokenValidation,
  sessionIdValidation,
} from '../middlewares/validate.js';

const router = express.Router();

// Student routes (require student role) - MUST come before teacher middleware
router.post('/validate', authMiddleware, roleMiddleware(['student']), validate(qrTokenValidation), validateQRToken);

// Teacher routes (require teacher role)
router.use(authMiddleware, roleMiddleware(['teacher']));
router.post('/generate', validate(qrSessionValidation), generateQRSession);
router.post('/refresh/:sessionId', validate(sessionIdValidation), refreshQRToken);
router.delete('/terminate/:sessionId', validate(sessionIdValidation), terminateQRSession);
router.delete('/terminate-all', terminateAllQRSessions);
router.get('/active', getActiveQRSessions);

export default router;