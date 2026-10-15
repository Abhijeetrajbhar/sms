import crypto from 'crypto';
import config from '../../config/env';
import { AppError } from '../../utils/AppError';

export interface GatewayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export interface GatewayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
}

function requireGatewayConfig(): { keyId: string; keySecret: string } {
  if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
    throw AppError.badRequest('Online payments are not configured for this school');
  }
  return { keyId: config.RAZORPAY_KEY_ID, keySecret: config.RAZORPAY_KEY_SECRET };
}

async function razorpayRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { keyId, keySecret } = requireGatewayConfig();
  const authorization = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  let response: globalThis.Response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Basic ${authorization}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw AppError.internal('Payment gateway is temporarily unavailable');
  }

  const payload = await response.json().catch(() => null) as { error?: { description?: string } } | null;
  if (!response.ok) {
    const message = payload?.error?.description || 'Payment gateway request failed';
    throw new AppError(message, response.status >= 500 ? 502 : 422);
  }
  return payload as T;
}

export const paymentGateway = {
  name: 'RAZORPAY',

  isConfigured(): boolean {
    return Boolean(config.RAZORPAY_KEY_ID && config.RAZORPAY_KEY_SECRET);
  },

  getPublicKey(): string {
    return requireGatewayConfig().keyId;
  },

  createOrder(input: { amountPaise: number; currency: string; receipt: string; notes: Record<string, string> }) {
    return razorpayRequest<GatewayOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: input.currency,
        receipt: input.receipt,
        payment_capture: 1,
        notes: input.notes,
      }),
    });
  },

  capturePayment(paymentId: string, amountPaise: number, currency: string = 'INR') {
    return razorpayRequest<GatewayPayment>(`/payments/${encodeURIComponent(paymentId)}/capture`, {
      method: 'POST',
      body: JSON.stringify({ amount: amountPaise, currency }),
    });
  },

  getPayment(paymentId: string) {
    return razorpayRequest<GatewayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
  },

  getOrderPayments(orderId: string) {
    return razorpayRequest<{ items: GatewayPayment[] }>(`/orders/${encodeURIComponent(orderId)}/payments`);
  },

  refundPayment(paymentId: string, amountPaise: number, notes: Record<string, string>) {
    return razorpayRequest<{ id: string; status: string }>(`/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount: amountPaise, notes }),
    });
  },

  verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
    const { keySecret } = requireGatewayConfig();
    const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    return safeEqual(expected, signature);
  },

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    if (!config.RAZORPAY_WEBHOOK_SECRET) {
      throw AppError.internal('Payment webhook secret is not configured');
    }
    const expected = crypto.createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
    return safeEqual(expected, signature);
  },
};

export function sha256(value: Buffer | string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    crypto.timingSafeEqual(leftBuffer, leftBuffer);
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
