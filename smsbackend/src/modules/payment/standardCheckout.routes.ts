import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import Razorpay from 'razorpay';
import config from '../../config/env';
import logger from '../../utils/logger';
import { cacheDelPattern } from '../../config/redis';

const router = Router();

function getRazorpayClient(): Razorpay {
  const keyId = config.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const keySecret = config.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function safeTimingCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * STEP 1: BACKEND - Create Order
 * Endpoint: POST /api/create-order
 * Request: { amount (paise), currency, receipt }
 * Return: { order_id, amount, currency }
 * Minimum amount: 100 paise
 */
router.post('/create-order', async (req: Request, res: Response) => {
  try {
    const rawAmount = req.body?.amount;
    const amount = Number(rawAmount);

    // Validate amount >= 100 paise
    if (rawAmount === undefined || rawAmount === null || isNaN(amount) || amount < 100) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: amount must be at least 100 paise (1 INR)',
      });
    }

    const currency = typeof req.body?.currency === 'string' && req.body.currency.trim()
      ? req.body.currency.trim().toUpperCase()
      : 'INR';

    const receipt = typeof req.body?.receipt === 'string' && req.body.receipt.trim()
      ? req.body.receipt.trim()
      : `rcpt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const notes = typeof req.body?.notes === 'object' && req.body.notes !== null ? req.body.notes : {};

    const client = getRazorpayClient();
    const order = await client.orders.create({
      amount: Math.round(amount),
      currency,
      receipt,
      notes,
    });

    logger.info(`Razorpay order created successfully: ${order.id} for amount ${order.amount} ${order.currency}`);

    return res.status(200).json({
      success: true,
      order_id: order.id,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      key_id: config.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    logger.error('Razorpay create order error:', err);

    // Handle authentication failures (return 401)
    if (
      err.statusCode === 401 ||
      err?.error?.code === 'BAD_REQUEST_ERROR' && String(err?.error?.description).toLowerCase().includes('auth') ||
      String(err?.message || '').toLowerCase().includes('credentials')
    ) {
      return res.status(401).json({
        success: false,
        error: 'Razorpay authentication failed. Invalid or missing API credentials.',
      });
    }

    // Handle Razorpay API errors (return 500)
    return res.status(500).json({
      success: false,
      error: err?.error?.description || err?.message || 'Failed to create Razorpay order',
    });
  }
});

/**
 * STEP 3: BACKEND - Verify Signature
 * Endpoint: POST /api/verify-payment
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * Compare generated signature with razorpay_signature
 * Return success only if signatures match
 */
router.post('/verify-payment', async (req: Request, res: Response) => {
  try {
    const orderId = req.body?.razorpay_order_id || req.body?.order_id;
    const paymentId = req.body?.razorpay_payment_id || req.body?.payment_id;
    const signature = req.body?.razorpay_signature || req.body?.signature;

    // Missing fields: return 400
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification fields. Must provide order_id, payment_id, and signature.',
      });
    }

    const keySecret = config.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay Key Secret is not configured on the server',
      });
    }

    // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Compare generated signature with razorpay_signature
    const isValid = safeTimingCompare(expectedSignature, String(signature));

    if (!isValid) {
      logger.warn(`Razorpay signature mismatch for order: ${orderId}, payment: ${paymentId}`);
      // Signature mismatch: return 400, do NOT mark as paid
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature',
      });
    }

    logger.info(`Razorpay payment verified successfully: order ${orderId}, payment ${paymentId}`);
    await cacheDelPattern('analytics:*').catch(() => undefined);

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      order_id: orderId,
      payment_id: paymentId,
    });
  } catch (err: any) {
    logger.error('Razorpay verify payment error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Payment verification failed due to internal error',
    });
  }
});

export default router;
