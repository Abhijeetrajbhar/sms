# API contract and integration guide

## Contract rules

The machine-readable [OpenAPI 3.1 specification](smsbackend/openapi.json) covers operational, authentication, student, result, and payment APIs, including shared request/response envelopes and authorization requirements. The source route files remain the authority for the full endpoint inventory until the specification is expanded to every domain.

Admissions are available under `/api/v1/admissions`: the public `POST /` accepts a validated application; administrators with `admissions:view` or `admissions:manage` can list, review, and enroll accepted applicants.

- All application endpoints are under `/api/v1`; the public service health endpoint is `/health`.
- Every API response uses `success`, `message`, and `data`. Error responses also include `error` and a `requestId`.
- Send `Authorization: Bearer <access-token>` for authenticated routes. Refresh tokens are managed as secure HTTP-only cookies.
- All write endpoints should be called with `Content-Type: application/json` unless the route accepts a file upload. Payment creation supports `Idempotency-Key`.
- Send `X-Request-Id` (8-128 alphanumeric, underscore, or hyphen characters) to trace a request across client, logs, and support reports. The API creates one when it is omitted.
- Production console logs are structured JSON. Request logs and unexpected-error records include the same correlation ID, so providers such as CloudWatch, Datadog, and ELK can trace a request without exposing credentials or token data.

## Operational endpoints

| Endpoint | Purpose | Expected response |
| --- | --- | --- |
| `GET /health` | Compatibility health check | `200` while the API process is running. |
| `GET /health/live` | Kubernetes/container liveness probe | `200` without checking dependencies. |
| `GET /health/ready` | Readiness probe | `200` only when MongoDB is reachable and Redis is healthy or intentionally disabled; otherwise `503`. |

## Domain endpoint map

The canonical endpoint inventory and permissions are maintained in [PROJECT_FEATURES.md](PROJECT_FEATURES.md#api-function-map). For frontend integration, use the shared client in `smsfrontend/src/services/api.js`; do not duplicate refresh-token or error-handling logic in individual pages.

`smsbackend/test/api-contract.test.cjs` boots the real Express app and verifies the health, correlation-ID, authentication-failure, and not-found contracts without a running database. It is part of `npm test` and runs in CI.

`smsbackend/test/integration/access-and-results.test.cjs` uses a dedicated, disposable MongoDB database to verify login/session persistence, parent-child isolation, and result publishing/locking. Run it with `TEST_DATABASE_URL` set; CI provisions an isolated MongoDB service automatically.

## Error handling example

```json
{
  "success": false,
  "message": "Invalid marks",
  "data": null,
  "error": { "marks": "Too high" },
  "requestId": "f3b66c4f-fd3c-4709-a2d0-71394a2798a8"
}
```

When reporting an issue, include the endpoint, timestamp, user role, and `requestId`. Never include tokens, passwords, or payment secrets.
