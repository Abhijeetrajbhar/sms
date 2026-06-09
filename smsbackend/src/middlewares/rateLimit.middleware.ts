import rateLimit from 'express-rate-limit';
import config from '../config/env';

export const defaultRateLimit = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    data: null,
    error: { message: 'Too many requests, please try again later.' },
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again in 15 minutes.',
    data: null,
    error: { message: 'Too many authentication attempts, please try again in 15 minutes.' },
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

export const aiRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.AI_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI request limit reached. Please try again in an hour.',
    data: null,
    error: { message: 'AI request limit reached. Please try again in an hour.' },
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

export const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.PAYMENT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many payment requests. Please wait and try again.',
    data: null,
    error: { code: 'PAYMENT_RATE_LIMIT', details: 'Too many payment requests.' },
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

export const paymentWebhookRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: Math.max(config.PAYMENT_RATE_LIMIT_MAX * 10, 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Webhook request limit exceeded.',
    data: null,
    error: { code: 'WEBHOOK_RATE_LIMIT', details: 'Webhook request limit exceeded.' },
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});
