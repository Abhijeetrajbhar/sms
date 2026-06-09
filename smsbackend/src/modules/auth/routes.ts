import { Router } from 'express';
import * as controller from './controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { authRateLimit } from '../../middlewares/rateLimit.middleware';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './validation';

const router = Router();

// Public routes (with rate limiting)
router.post('/register', authRateLimit, validate(registerSchema), controller.register);
router.post('/login', authRateLimit, validate(loginSchema), controller.login);
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', authRateLimit, validate(resetPasswordSchema), controller.resetPassword);
router.post('/refresh-token', controller.refreshToken);

// Protected routes
router.use(authenticate);
router.post('/logout', controller.logout);
router.get('/me', controller.getMe);
router.patch('/change-password', validate(changePasswordSchema), controller.changePassword);

export default router;
