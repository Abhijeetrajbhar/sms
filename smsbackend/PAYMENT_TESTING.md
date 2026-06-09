# Secure Fee Payment Testing

## Test-mode setup

1. Enable Test Mode in the Razorpay dashboard and create test API keys.
2. Add the test key ID, test secret, and a dedicated webhook secret to `.env`.
3. Configure the webhook URL as:
   `https://<backend-host>/api/v1/payments/webhook`
4. Subscribe to at least `payment.captured` and `payment.failed`.
5. Apply the additive Prisma schema to the intended database:
   `npm run prisma:push`
6. Generate the client and start the applications:
   `npm run prisma:generate`
   `npm run dev`
7. Use only the current Razorpay Test Mode payment methods shown in its dashboard/docs.

Do not use live keys or real customer payment details during testing.

## Required verification checklist

- [ ] Existing legacy fee routes and offline `POST /fees/:id/pay` still work.
- [ ] Admin can create a fee structure; a duplicate active structure returns `409`.
- [ ] Admin can generate an invoice for one student and for a class.
- [ ] Student sees only their own invoices and parent sees only linked students.
- [ ] Teacher receives `403` from payment, receipt, and new invoice APIs.
- [ ] Student online payment is denied when `STUDENT_ONLINE_PAYMENTS_ENABLED=false`.
- [ ] Deactivated student cannot start an online payment.
- [ ] Repeated `create-order` calls with the same idempotency key return one attempt.
- [ ] Two users attempting the same invoice receive one active gateway order.
- [ ] Manipulated frontend amount is ignored; the order uses backend invoice due amount.
- [ ] Invalid checkout and webhook signatures are rejected.
- [ ] Duplicate webhook event IDs do not update an invoice twice.
- [ ] A failed webhook arriving after capture does not reverse a captured payment.
- [ ] Captured payment updates invoice atomically and creates one receipt.
- [ ] Closing checkout leaves the invoice unpaid/pending and permits status refresh.
- [ ] Optional reconciliation worker refreshes pending attempts when queues are enabled.
- [ ] Offline payment remains pending until verification and creates a receipt after approval.
- [ ] Maker-checker blocks the same admin when `OFFLINE_PAYMENT_APPROVAL_REQUIRED=true`.
- [ ] Refund amount greater than refundable paid amount returns `422`.
- [ ] Online refund requires a captured payment attempt; offline refund does not.
- [ ] Refund approval and processing are separate actions.
- [ ] Parent/student can download only their own verified receipts.
- [ ] Fee page remains usable at 320, 375, 425, 768, 1024, 1280, and 1440 pixels.

## Operational checks

- Confirm production uses HTTPS.
- Confirm live and test gateway keys are never mixed.
- Confirm MongoDB supports transactions (replica set or managed cluster).
- Monitor failed webhook events and failed reconciliation jobs.
- Reconcile gateway settlements against the settlement report before closing an accounting period.
