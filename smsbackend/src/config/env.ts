import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const booleanFromString = (defaultValue: 'true' | 'false') => z
  .string()
  .default(defaultValue)
  .transform((value) => value.toLowerCase() === 'true');

const isPlaceholder = (value: string | undefined) => {
  if (!value) return true;
  const normalized = value.toLowerCase();
  return normalized.includes('your_') || normalized.includes('change_me');
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  CLIENT_URL: z.string().min(1).default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  ENABLE_QUEUES: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() !== 'false'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  REFRESH_COOKIE_MAX_AGE_MS: z.string().default('604800000').transform(Number),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

  // Email
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_USER: z.string().email(),
  SMTP_PASSWORD: z.string().min(1),
  EMAIL_FROM: z.string().email(),

  // AI
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['openai', 'gemini']).default('gemini'),
  AI_ENABLED: booleanFromString('false'),
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-2.5-flash'),

  // Payments
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  PAYMENT_ORDER_TTL_MINUTES: z.string().default('15').transform(Number),
  PAYMENT_RATE_LIMIT_MAX: z.string().default('20').transform(Number),
  PAYMENT_RECONCILIATION_INTERVAL_MS: z.string().default('300000').transform(Number),
  STUDENT_ONLINE_PAYMENTS_ENABLED: booleanFromString('false'),
  OFFLINE_PAYMENT_APPROVAL_REQUIRED: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  SCHOOL_NAME: z.string().default('CampusOryx School'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  AUTH_RATE_LIMIT_MAX: z.string().default('10').transform(Number),
  AI_RATE_LIMIT_MAX: z.string().default('20').transform(Number),

  // Security
  BCRYPT_ROUNDS: z.string().default('12').transform(Number),
}).superRefine((env, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: [path],
    message,
  });

  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    issue('JWT_REFRESH_SECRET', 'JWT access and refresh secrets must be different');
  }
  if (!Number.isFinite(env.REFRESH_COOKIE_MAX_AGE_MS) || env.REFRESH_COOKIE_MAX_AGE_MS <= 0) {
    issue('REFRESH_COOKIE_MAX_AGE_MS', 'Refresh cookie lifetime must be a positive number');
  }
  if (!Number.isInteger(env.BCRYPT_ROUNDS) || env.BCRYPT_ROUNDS < 10 || env.BCRYPT_ROUNDS > 15) {
    issue('BCRYPT_ROUNDS', 'BCRYPT_ROUNDS must be an integer between 10 and 15');
  }
  if (env.COOKIE_SAME_SITE === 'none' && env.NODE_ENV !== 'production') {
    issue('COOKIE_SAME_SITE', 'SameSite=None requires HTTPS and should only be used in production');
  }

  if (env.AI_ENABLED) {
    const selectedKey = env.AI_PROVIDER === 'openai' ? env.OPENAI_API_KEY : env.GEMINI_API_KEY;
    if (isPlaceholder(selectedKey)) issue(
      env.AI_PROVIDER === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY',
      `A valid ${env.AI_PROVIDER} API key is required when AI_ENABLED=true`
    );
  }

  if (env.STUDENT_ONLINE_PAYMENTS_ENABLED) {
    ([
      ['RAZORPAY_KEY_ID', env.RAZORPAY_KEY_ID],
      ['RAZORPAY_KEY_SECRET', env.RAZORPAY_KEY_SECRET],
    ] as Array<[string, string | undefined]>).forEach(([path, value]) => {
      if (isPlaceholder(value)) issue(path, `${path} is required when online payments are enabled`);
    });
    if (env.NODE_ENV === 'production' && isPlaceholder(env.RAZORPAY_WEBHOOK_SECRET)) {
      issue('RAZORPAY_WEBHOOK_SECRET', 'RAZORPAY_WEBHOOK_SECRET is required in production when online payments are enabled');
    }
  }

  if (env.NODE_ENV === 'production') {
    ([
      ['JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET],
      ['JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET],
      ['SMTP_HOST', env.SMTP_HOST],
      ['SMTP_USER', env.SMTP_USER],
      ['SMTP_PASSWORD', env.SMTP_PASSWORD],
      ['EMAIL_FROM', env.EMAIL_FROM],
      ['DATABASE_URL', env.DATABASE_URL],
      ['CLOUDINARY_CLOUD_NAME', env.CLOUDINARY_CLOUD_NAME],
      ['CLOUDINARY_API_KEY', env.CLOUDINARY_API_KEY],
      ['CLOUDINARY_API_SECRET', env.CLOUDINARY_API_SECRET],
    ] as Array<[string, string | undefined]>).forEach(([path, value]) => {
      if (isPlaceholder(value)) issue(path, `${path} must not contain a placeholder in production`);
    });
    if (/localhost|127\.0\.0\.1/i.test(env.CLIENT_URL)) {
      issue('CLIENT_URL', 'CLIENT_URL must be the deployed frontend URL in production');
    }
  }
});

type EnvConfig = z.infer<typeof envSchema>;

let config: EnvConfig;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missing = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');
    console.error('Invalid environment configuration:\n' + missing);
    process.exit(1);
  }
  throw error;
}

export default config;
