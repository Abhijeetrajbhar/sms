# CampusOryx deployment checklist

## Required secret changes

Edit `smsbackend/.env` locally and configure the same names in your hosting provider. Never commit the `.env` file.

1. Set `NODE_ENV=production` in the deployed backend only after all required production values below are ready.
2. Replace `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` with different random values of at least 32 characters.
3. Set `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` to a verified SMTP account. Account invitations and password resets depend on these values.
4. Set `CLIENT_URL` to the exact frontend origin. Local Vite development uses `http://localhost:5173`.
5. Set all `CLOUDINARY_*` values to the production Cloudinary account used for uploads and report cards.

Generate JWT secrets in PowerShell without printing them into source files:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Run the command twice and place one result in each JWT secret variable.

## Optional providers

External providers are disabled safely until fully configured.

- AI: set `AI_ENABLED=true`, choose `AI_PROVIDER`, set its API key, and verify `GEMINI_MODEL` when Gemini is selected.
- Online payments: set all three `RAZORPAY_*` values, register the webhook URL ending in `/api/v1/payment-webhook`, then set `STUDENT_ONLINE_PAYMENTS_ENABLED=true`.
- Background jobs: keep `ENABLE_QUEUES=true` only when `REDIS_URL` is reachable. These jobs deliver notifications, generate report-card PDFs, refresh analytics, and reconcile payments.

BullMQ requires the Redis `maxmemory-policy` to be `noeviction`. The currently configured managed Redis reports `volatile-lru`; change that setting in the Redis provider dashboard or use a dedicated Redis instance configured with `maxmemory-policy noeviction` before production. The repository Docker Redis service already uses `noeviction`.

## Cookie deployment

- Same-site frontend and API: use `COOKIE_SAME_SITE=lax`.
- Different top-level frontend and API domains: HTTPS is required; use `COOKIE_SAME_SITE=none`.
- Set `COOKIE_DOMAIN` only when both applications intentionally share a parent domain.

## Verification before push

Run these commands from their respective folders:

```powershell
cd smsbackend
npm ci
npm run prisma:generate
npx prisma validate
npm run lint
npm test
npm audit --omit=dev

cd ..\smsfrontend
npm ci
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Then test login and one representative workflow for each role against a non-production database. Do not seed demo credentials into a production database.

### Initializing a Fresh Production Database

To reset and bootstrap an initial Super Administrator for your institution:
```powershell
cd smsbackend
# 1. Reset all collections to a fresh empty state
npm run db:clean

# 2. Bootstrap your primary institution administrator
npm run admin:init -- --email="admin@yourdomain.com" --password="YourSecurePassword123!" --firstName="Principal" --lastName="Admin"
```

---

## Pushing to GitHub

1. Ensure secrets are **not** staged:
   ```bash
   git status
   ```
   *(Verify `.env` files are ignored and only `.env.example` is committed)*

2. Stage and commit:
   ```bash
   git add .
   git commit -m "feat: production-ready release with PaaS configs and Razorpay checkout"
   ```

3. Push to your GitHub repository:
   ```bash
   git push origin main
   ```

---

## PaaS Hosting Options

### Option A: Render.com (1-Click Blueprint)
The repository includes a ready-to-use [`render.yaml`](file:///c:/Users/hp/Desktop/sms/render.yaml) blueprint:
1. Connect your GitHub repository to [Render.com](https://render.com).
2. Choose **New > Blueprint**.
3. Render will detect `render.yaml` and configure both the backend service and frontend static site automatically.
4. Fill in the required environment variables (`DATABASE_URL`, `CLOUDINARY_*`, `SMTP_*`, `RAZORPAY_*`) in the Render dashboard.

### Option B: Split PaaS (Backend on Render/Railway + Frontend on Vercel/Netlify)
- **Backend (Render / Railway / Fly.io)**:
  - Root directory: `smsbackend`
  - Build command: `npm install && npm run build` (runs `prisma generate && tsc`)
  - Start command: `npm start`
  - Health check path: `/health`
  - Configure backend environment variables from `smsbackend/.env.example`.
- **Frontend (Vercel / Netlify / Cloudflare Pages)**:
  - Root directory: `smsfrontend`
  - Build command: `npm run build`
  - Output directory: `dist`
  - Rewrites: Handled automatically by `vercel.json` (Vercel) and `public/_redirects` (Netlify / Render).
  - Environment variables:
    - `VITE_API_BASE_URL`: `https://your-backend.onrender.com/api/v1`
    - `VITE_APP_NAME`: `CampusOryx School OS`
    - `VITE_RAZORPAY_KEY_ID`: `rzp_test_...`

