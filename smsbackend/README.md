# EduManage — AI-Assisted School Management System

Production-grade backend API for a modern school management SaaS platform. Built with Node.js, Express, TypeScript, MongoDB (Prisma), Redis, Socket.io, BullMQ, and integrated AI capabilities.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Prisma Setup](#prisma-setup)
- [Seeding Demo Data](#seeding-demo-data)
- [Running with Docker](#running-with-docker)
- [API Documentation](#api-documentation)
- [Roles & Permissions](#roles--permissions)
- [Real-time Events](#real-time-events)
- [Background Jobs](#background-jobs)
- [AI Module](#ai-module)
- [Security](#security)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 |
| Framework | Express.js |
| Language | TypeScript 5 |
| Database | MongoDB via Prisma ORM |
| Cache | Redis (ioredis) |
| Real-time | Socket.io |
| Auth | JWT (Access + Refresh tokens) |
| Queue | BullMQ + Redis |
| File storage | Cloudinary |
| PDF generation | PDFKit |
| Validation | Zod |
| Logging | Winston |
| Security | Helmet, CORS, rate-limit, bcrypt |

---

## Architecture

```
src/
├── app.ts                    # Express app factory
├── server.ts                 # HTTP server + bootstrap
├── config/                   # Service connections
│   ├── env.ts                # Zod-validated environment
│   ├── database.ts           # Prisma client
│   ├── redis.ts              # Redis client + helpers
│   ├── cloudinary.ts         # Cloudinary config
│   ├── socket.ts             # Socket.io setup
│   └── queue.ts              # BullMQ queues
├── middlewares/              # Express middleware
│   ├── auth.middleware.ts    # JWT authentication
│   ├── role.middleware.ts    # RBAC authorization
│   ├── validate.middleware.ts # Zod validation
│   ├── error.middleware.ts   # Global error handler
│   ├── rateLimit.middleware.ts
│   └── upload.middleware.ts  # Multer + Cloudinary
├── modules/                  # Feature modules
│   ├── auth/                 # Login, register, tokens
│   ├── user/                 # User management (Admin)
│   ├── student/              # Student profiles
│   ├── teacher/              # Teacher profiles
│   ├── parent/               # Parent profiles
│   ├── class/                # Classes + subjects
│   ├── attendance/           # Attendance tracking
│   ├── assignment/           # Assignments + submissions
│   ├── result/               # Exam results + grades
│   ├── reportCard/           # PDF report cards
│   ├── notification/         # Real-time notifications
│   ├── analytics/            # Role-based dashboards
│   ├── timetable/            # Weekly schedules
│   ├── fee/                  # Fee management
│   ├── announcement/         # School announcements
│   ├── auditLog/             # System audit trail
│   └── ai/                   # AI-powered insights
├── jobs/                     # Background workers
│   ├── reportCard.job.ts
│   ├── notification.job.ts
│   └── analytics.job.ts
└── utils/                    # Shared utilities
```

**Request flow:**
```
Route → Middleware (auth/role/validate) → Controller → Service → Repository → Database
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB Atlas account (or local MongoDB)
- Redis instance (local or Redis Cloud)
- Cloudinary account

### 1. Clone and install

```bash
git clone https://github.com/your-org/edumanage-backend.git
cd edumanage-backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Generate Prisma client

```bash
npm run prisma:generate
```

### 4. Push schema to MongoDB

```bash
npm run prisma:push
```

### 5. Seed demo data

```bash
npm run seed
```

### 6. Start development server

```bash
npm run dev
```

The server starts at `http://localhost:5000`.

---

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MongoDB connection string |
| `REDIS_URL` | Redis connection URL |
| `JWT_ACCESS_SECRET` | Min 32 chars, access token signing |
| `JWT_REFRESH_SECRET` | Min 32 chars, refresh token signing |
| `CLOUDINARY_*` | Cloud storage credentials |
| `GEMINI_API_KEY` | Google Gemini AI key |
| `OPENAI_API_KEY` | OpenAI key (alternative provider) |
| `AI_PROVIDER` | `gemini` or `openai` |

---

## Prisma Setup

```bash
# Generate Prisma client from schema
npm run prisma:generate

# Push schema changes to MongoDB (no migrations for MongoDB)
npm run prisma:push

# Open Prisma Studio (visual database editor)
npm run prisma:studio
```

---

## Seeding Demo Data

```bash
npm run seed
```

This creates:

| Account | Email | Password |
|---------|-------|----------|
| Admin | admin@edumanage.com | Admin@123 |
| Teacher | teacher@edumanage.com | Teacher@123 |
| Teacher 2 | teacher2@edumanage.com | Teacher@123 |
| Student | student@edumanage.com | Student@123 |
| Student 2 | student2@edumanage.com | Student@123 |
| Parent | parent@edumanage.com | Parent@123 |

Plus: 2 classes, 5 subjects, attendance records, assignments, results, fees, timetable, announcements, and notifications.

---

## Running with Docker

```bash
# Copy env file
cp .env.example .env
# Fill in your DATABASE_URL, JWT secrets, Cloudinary, etc.

# Build and start (API + Redis)
docker-compose up -d

# With Redis Commander UI (dev)
docker-compose --profile dev up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down
```

---

## API Documentation

### Base URL: `/api/v1`

All responses follow this format:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```

---

### Auth Routes `/api/v1/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ❌ | Register new user |
| POST | `/login` | ❌ | Login and get tokens |
| POST | `/logout` | ✅ | Logout (invalidates session) |
| POST | `/refresh-token` | ❌ | Rotate access+refresh tokens |
| GET | `/me` | ✅ | Get current user |
| PATCH | `/change-password` | ✅ | Change password |
| POST | `/forgot-password` | ❌ | Request password reset |
| POST | `/reset-password` | ❌ | Reset with token |

### User Routes `/api/v1/users` *(Admin only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List users (search/filter/sort/paginate) |
| GET | `/:id` | Get user by ID |
| PATCH | `/:id` | Update user |
| PATCH | `/:id/role` | Change role |
| PATCH | `/:id/status` | Activate/deactivate |
| POST | `/:id/avatar` | Upload avatar |
| DELETE | `/:id` | Soft delete |
| POST | `/:id/restore` | Restore deleted user |

### Student Routes `/api/v1/students`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Teacher/Admin | List students |
| POST | `/` | Admin | Create student profile |
| GET | `/:id` | All | Get student profile |
| POST | `/:id/assign-class` | Admin | Assign to class |
| POST | `/:id/link-parent` | Admin | Link parent |
| GET | `/:id/attendance-summary` | All | Attendance stats |
| GET | `/:id/risk` | Teacher/Admin | Risk assessment |

### Teacher Routes `/api/v1/teachers`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Teacher/Admin | List teachers |
| POST | `/` | Admin | Create teacher profile |
| GET | `/:id` | All | Get teacher details |
| POST | `/:id/assign-subject` | Admin | Assign subject to class |
| GET | `/:id/classes` | All | Get assigned classes |
| GET | `/:id/classes/:classId/analytics` | Teacher/Admin | Class analytics |

### Parent Routes `/api/v1/parents`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Admin | List parents |
| POST | `/` | Admin | Create parent profile |
| GET | `/:id` | All | Get parent details |
| GET | `/my-children` | Parent | Get linked children |

### Class Routes `/api/v1/classes`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | All | List classes |
| POST | `/` | Admin | Create class |
| GET | `/:id` | All | Get class with students |
| PATCH | `/:id` | Admin | Update class |
| DELETE | `/:id` | Admin | Delete class |
| GET | `/:id/analytics` | Teacher/Admin | Class performance analytics |

### Subject Routes `/api/v1/subjects`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | All | List all subjects |
| POST | `/` | Admin | Create subject |
| PATCH | `/:id` | Admin | Update subject |

### Attendance Routes `/api/v1/attendance`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/bulk` | Teacher/Admin | Bulk mark attendance |
| PATCH | `/:id` | Teacher/Admin | Update attendance record |
| GET | `/student/:studentId` | All | Student attendance records |
| GET | `/student/:studentId/summary` | All | Attendance summary |
| GET | `/student/:studentId/heatmap` | All | Monthly heatmap |
| GET | `/class/:classId` | Teacher/Admin | Class attendance for date |

### Assignment Routes `/api/v1/assignments`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | All | List assignments |
| POST | `/` | Teacher/Admin | Create assignment |
| GET | `/my-submissions` | Student | My submissions |
| GET | `/:id` | All | Get assignment |
| PATCH | `/:id` | Teacher/Admin | Update assignment |
| DELETE | `/:id` | Teacher/Admin | Delete assignment |
| POST | `/:id/submit` | Student | Submit assignment |
| PATCH | `/:id/submissions/:submissionId/grade` | Teacher/Admin | Grade submission |

### Result Routes `/api/v1/results`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Teacher/Admin | Create result |
| POST | `/bulk` | Teacher/Admin | Bulk create results |
| POST | `/publish` | Teacher/Admin | Publish results + notify |
| PATCH | `/:id` | Teacher/Admin | Update result |
| GET | `/student/:studentId` | All | Student results |
| GET | `/class/:classId` | Teacher/Admin | Class results |

### Report Card Routes `/api/v1/report-cards`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/generate` | Teacher/Admin | Queue PDF generation |
| GET | `/` | All | Get specific report card |
| GET | `/student/:studentId` | All | All student report cards |

### Notification Routes `/api/v1/notifications`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | All | My notifications |
| GET | `/unread-count` | All | Unread count |
| PATCH | `/read-all` | All | Mark all read |
| PATCH | `/:id/read` | All | Mark one read |
| DELETE | `/:id` | All | Delete notification |

### Analytics Routes `/api/v1/analytics`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard` | All | Role-based dashboard |
| GET | `/admin` | Admin | Admin-specific analytics |

### Timetable Routes `/api/v1/timetable`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Admin | Create timetable |
| POST | `/:id/slots` | Admin | Add time slot |
| DELETE | `/:id/slots/:slotId` | Admin | Remove slot |
| GET | `/class/:classId` | All | Class weekly schedule |
| GET | `/my-schedule` | Teacher/Admin | Teacher's schedule |

### Fee Routes `/api/v1/fees`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | All | List fees (with filters) |
| POST | `/` | Admin | Create fee for student |
| POST | `/class` | Admin | Create fee for whole class |
| GET | `/summary` | Admin | Collection dashboard |
| PATCH | `/update-overdue` | Admin | Mark overdue fees |
| POST | `/:id/pay` | Admin | Record payment |
| PATCH | `/:id/waive` | Admin | Waive fee |

### Announcement Routes `/api/v1/announcements`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | All | Get visible announcements |
| POST | `/` | Teacher/Admin | Create announcement |
| PATCH | `/:id/read` | All | Mark as read |
| PATCH | `/:id/deactivate` | Admin | Deactivate announcement |

### Audit Log Routes `/api/v1/audit-logs` *(Admin only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Paginated audit trail |

### AI Routes `/api/v1/ai`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/student/:studentId/summary` | All | AI performance summary |
| POST | `/student/:studentId/remark` | Teacher/Admin | AI teacher remark |
| GET | `/student/:studentId/attendance-explain` | Teacher/Admin | Attendance explanation |
| GET | `/student/:studentId/risk-explain` | Teacher/Admin | Risk score explanation |
| POST | `/questions/generate` | Teacher/Admin | Generate assignment questions |

---

## Roles & Permissions

| Feature | Admin | Teacher | Student | Parent |
|---------|-------|---------|---------|--------|
| User management | ✅ Full | ❌ | ❌ | ❌ |
| Class management | ✅ Full | 👁️ View | 👁️ View | ❌ |
| Attendance | ✅ Full | ✅ Mark/View | 👁️ Own | 👁️ Child |
| Assignments | ✅ Full | ✅ Create/Grade | 📤 Submit | 👁️ Child |
| Results | ✅ Full | ✅ Enter/Publish | 👁️ Own (published) | 👁️ Child |
| Report Cards | ✅ Full | ✅ Generate | 👁️ Own | 👁️ Child |
| Fees | ✅ Full | ❌ | 👁️ Own | 👁️ Child |
| Announcements | ✅ Full | ✅ Class-level | 👁️ View | 👁️ View |
| Analytics | ✅ Full | ✅ Own classes | 👁️ Own | 👁️ Children |
| AI insights | ✅ Full | ✅ Full | 👁️ Own | 👁️ Children |
| Audit logs | ✅ Full | ❌ | ❌ | ❌ |

---

## Real-time Events

Connect via Socket.io with Bearer token auth:

```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'your_access_token' }
});
```

Users are automatically joined to their personal room: `user:<userId>`

| Event | Direction | Description |
|-------|-----------|-------------|
| `notification:new` | Server → Client | New notification |
| `assignment:created` | Server → Client | New assignment |
| `assignment:graded` | Server → Client | Submission graded |
| `result:published` | Server → Client | Results available |
| `attendance:warning` | Server → Client | Low attendance alert |
| `fee:due` | Server → Client | Fee due reminder |
| `announcement:new` | Server → Client | New announcement |

---

## Background Jobs

| Queue | Job | Description |
|-------|-----|-------------|
| `reportCard` | `generatePDF` | Build and upload PDF to Cloudinary |
| `notification` | `assignment:created` | Notify class students |
| `notification` | `assignment:graded` | Notify student of grade |
| `notification` | `result:published` | Notify students of results |
| `notification` | `checkAttendanceWarning` | Send low-attendance alerts |
| `notification` | `announcement:new` | Broadcast announcements |
| `notification` | `fee:created` | Fee due notifications |
| `analytics` | `refreshAnalyticsCache` | Bust Redis cache |
| `analytics` | `updateAllRiskScores` | Recalculate risk for all students |
| `analytics` | `markOverdueFees` | Update fee statuses |

---

## AI Module

The AI module uses an **adapter pattern** — swap providers without changing business logic.

**Providers:** Google Gemini (default) | OpenAI GPT-4o-mini

**Set provider in `.env`:**
```
AI_PROVIDER=gemini   # or openai
GEMINI_API_KEY=...
OPENAI_API_KEY=...
```

**Capabilities:**
- Student performance summary
- Teacher remark generation for report cards
- Attendance trend explanation
- At-risk student identification & explanation
- Assignment question generation

**Safety:**
- Rate limited (20 req/hour)
- Authorization enforced (parents can only query their own children)
- Sensitive data never exposed beyond authorized scope
- All AI usage logged

---

## Security

- **Helmet** — sets secure HTTP headers
- **CORS** — whitelist-only origins
- **Rate limiting** — global (100/15min), auth (10/15min), AI (20/hour)
- **JWT** — short-lived access (15m) + rotating refresh tokens (7d) in HttpOnly cookies
- **bcrypt** — password hashing with configurable rounds
- **Zod** — all inputs validated before processing
- **RBAC** — role-based authorization on every route
- **Soft delete** — data never permanently destroyed without explicit action
- **Audit logs** — all critical actions tracked with actor, IP, and metadata
- **No sensitive data in logs** — passwords and tokens never logged
- **Prisma parameterized queries** — SQL injection not applicable (MongoDB)

---

## License

MIT © EduManage
