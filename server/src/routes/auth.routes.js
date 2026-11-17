import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { protect } from '../middleware/protect.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { registerSchema, loginSchema, updateMeSchema, passwordSchema } from '../validators/auth.schema.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), auth.register);
router.post('/login', authLimiter, validate(loginSchema), auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.get('/me', protect, auth.getMe);
router.patch('/me', protect, validate(updateMeSchema), auth.updateMe);

router.patch('/password', protect, validate(passwordSchema), auth.changePassword);
router.get('/sessions', protect, auth.loginHistory);
router.post('/logout-all', protect, auth.logoutAll);

export default router;
