# CampusOryx / EduManage - Feature and Function Reference

## Purpose and architecture

CampusOryx is a school-management ERP for administrators, teachers, students, and parents. The frontend is a React/Vite single-page application; the backend is a modular Express/TypeScript REST API using MongoDB through Prisma. Redis/BullMQ powers optional background processing, Socket.IO supplies real-time notifications, Cloudinary stores uploaded files, and PDFKit generates report cards and receipts.

The API is versioned under `/api/v1`; a health endpoint is available at `/health`.

## User portals and access model

| Role | Portal capabilities |
| --- | --- |
| Administrator | Operates users, permissions, profiles, academic setup, finance, timetables, notices, analytics, AI insights, and audit logs. |
| Teacher | Views their dashboard, assigned classes/students/subjects, marks attendance, manages assignments, enters marks, views timetable, and publishes notices. |
| Student | Views personal dashboard/profile, attendance, assignments and submissions, results, timetable, notices, invoices, receipts, and eligible online payments. |
| Parent | Switches between linked children and views each child's dashboard, profile, attendance, assignments, results, timetable, notices, invoices, receipts, and eligible online payments. |

Authentication uses access and refresh JWTs, with the refresh token held in a cookie. Accounts support invitation/activation, password-reset, password change, logout, and session refresh. Admin accounts have granular permissions; a super administrator can change roles and assign permissions. Student, parent, and teacher access is scoped to the relevant person, child, class, or teacher assignment.

## Implemented feature areas

### Identity, users, and profiles

- Register, sign in, refresh sessions, sign out, activate invited accounts, request/reset passwords, and change passwords.
- Create, list, edit, suspend/activate, soft-delete, and restore users.
- Upload user avatars to Cloudinary and resend user invitations.
- Manage user roles and admin permission assignments; expose the permission catalogue to super administrators.
- Create and browse student, teacher, and parent profiles.
- Assign a student to a class, link parents to students, and assign subjects/classes to teachers.
- Supply dedicated student, teacher, and parent dashboards plus profile/child lookups.
- Accept public admission applications, review/approve/reject or waitlist applicants, retain document metadata and review notes, and convert accepted applicants into pending student accounts with capacity validation.
- Upload student compliance documents through Cloudinary, verify or reject them, record reviewer notes and expiry dates, and automatically label expired documents.

### Academic setup and daily teaching

- Maintain classes/sections with academic year, capacity, room, and class teacher.
- Create, update, and list subjects, and assign a teacher to a subject/class combination.
- Build timetables and add/remove period slots with class, subject, teacher, time, and room data.
- Provide timetable management options, a class timetable, a teacher's full schedule, and today's teacher schedule.
- Maintain an academic calendar for published or draft term dates, holidays, school events, and exam schedules, including class-specific visibility for teachers.
- Let students and teachers submit, view, and cancel pending leave requests; authorized administrators can approve or reject requests with review notes.
- Bulk-mark attendance, update individual records, and retrieve student/class attendance, attendance summaries, and heatmaps.
- Create, edit, delete, list, and view assignments; attachments and student submissions are uploaded through the file-upload pipeline.
- Let students submit work, let teachers view submissions, and let teachers grade submissions with feedback.

### Results and report cards

- Create or bulk-create result entries; update entries while they are editable.
- Teacher marks workspace: load eligible students, save drafts, submit final marks, and view marks history.
- Publish results, lock them after publication, and let authorized administrators unlock results.
- Retrieve student and class results with role-aware access.
- Generate report cards in the background, store/download generated PDFs, retrieve one report card, and list a student’s report cards.
- Calculate percentages/GPA and convert marks to grades in backend utility functions.

### Fees, payments, refunds, and documents

- Create, list, retrieve, update, and deactivate reusable fee structures.
- Generate invoices in bulk, browse invoices (including a particular student’s invoices), and update invoice details.
- Support the earlier direct-fee workflow: create individual/class fees, record payments, waive fees, flag overdue fees, and view collection summaries.
- Record offline payments and route them through a pending-verification, approve, or reject workflow.
- Produce finance reports: summary, class-wise, student-wise, dues, and settlements.
- Integrate Razorpay for payment configuration, order creation, verification, attempt history/detail, status refresh, signed webhooks, and reconciliation jobs. Student online payment availability is configuration-controlled.
- Request, approve, reject, and process refunds.
- Create receipts and allow authorized listing, viewing, and PDF download.

### Communication and engagement

- Create announcements aimed at everyone, students, teachers, parents, or a selected class; recipients can mark them read and administrators can deactivate them.
- Create and process user notifications for academic, finance, attendance, and announcement events.
- List notifications, retrieve unread counts, mark individual/all notifications read, and delete notifications.
- Deliver new notifications live through Socket.IO (`notification:new`).
- Use queued jobs for notification delivery, including email where configured.

### Analytics, risk, and AI

- Show role-specific operational dashboards and an administrator analytics dashboard.
- Produce class analytics, attendance summaries/heatmaps, enrolment and collection data, assignment/submission views, and student risk profiles.
- Calculate risk score/level from academic and attendance information; surface at-risk students in dashboards.
- Optional AI provider integration with Gemini or OpenAI. When enabled, authorized staff can generate student summaries, teacher remarks, attendance explanations, risk explanations, and assignment questions.
- The frontend also creates a record-based fallback insight when external AI is unavailable.

### Governance, reliability, and security

- Record audit events for logins, user/profile changes, attendance, assignments, results, finance, payments, refunds, uploads, and password events; offer an audit-log view.
- Validate request payloads with Zod and protect routes with authentication, roles, permissions, student/parent/teacher scope checks, rate limits, and centralized error responses.
- Apply Helmet headers, configured CORS, compression, request logging, password hashing, secure cookie options, and special raw-body handling/signature verification for payment webhooks.
- Validate the full runtime environment at startup, including strong distinct JWT secrets and conditional checks for AI and Razorpay credentials.
- Handle graceful shutdown for HTTP, database, Redis, queues, and workers.

## API function map

All endpoints below are relative to `/api/v1` and, other than public authentication endpoints and the payment webhook, require authentication.

| Area | Base path | Main functions |
| --- | --- | --- |
| Authentication | `/auth` | Register/login, account activation, refresh/logout, current user, forgot/reset/change password. |
| User administration | `/users` | Permission catalogue; user CRUD, status/role/permission changes, invite, avatar upload, restore. |
| People | `/students`, `/teachers`, `/parents` | Profile creation/list/detail, personal dashboards, class/subject/parent links, teacher scope data, child profiles, student attendance/risk. |
| Academic setup | `/classes`, `/subjects`, `/timetable` | Class CRUD/analytics; subject create/update/list; timetable creation, slots, class and teacher schedules. |
| Attendance | `/attendance` | Bulk marking, updates, student/class records, summary, heatmap. |
| Assignments | `/assignments` | Assignment CRUD, file upload, submission upload/listing, grading, student submission history. |
| Results | `/results`, `/report-cards` | Result entry/bulk entry/update, draft/final teacher marks, publish/unlock, class/student lookup, report-card generation/retrieval. |
| Finance | `/fees`, `/payments`, `/refunds`, `/receipts` | Fee structures/invoices/legacy fees/offline payments/reports; Razorpay lifecycle; refunds; receipts and downloads. |
| Communication | `/announcements`, `/notifications` | Announcement creation/read/deactivation; notification listing, unread count, read/delete operations. |
| Insight and governance | `/analytics`, `/ai`, `/audit-logs` | Dashboards/analytics, AI content generation, audit-log retrieval. |

The Razorpay webhook is separately mounted at `POST /api/v1/payments/webhook` and is intentionally processed before JSON body parsing so the original signed body can be verified.

## Background functions and integrations

- **Report-card worker:** generates report-card PDFs asynchronously.
- **Notification worker:** processes queued in-app/email notifications.
- **Analytics worker:** recalculates analytics and risk-oriented data.
- **Payment-reconciliation worker:** schedules and reconciles pending Razorpay payment attempts.
- **External integrations:** MongoDB, Redis, Cloudinary, SMTP email, Socket.IO, Razorpay, and optionally OpenAI or Gemini.

Queues are intentionally configurable (`ENABLE_QUEUES`). With queues disabled, queue submissions are safely skipped rather than failing the application; features that depend on asynchronous processing will not run until Redis/queues are enabled.

## Frontend application functions

- Lazy-loaded protected routes with public account-activation and password-recovery pages.
- Role- and permission-aware navigation and route guards.
- Central application context for session restoration, access-token refresh, API data loading/normalisation, child selection, theme, notifications, global search, and optimistic UI updates.
- Role-specific dashboards and workspaces for admin operations, teacher attendance/marks, student progress, and parent child monitoring.
- Reusable UI components for data tables, modals, cards, inputs, buttons, badges, avatars, progress bars, charts, page headers, and error boundaries.
- Finance UI supports invoices and secure Razorpay checkout, with idempotency keys to reduce duplicate payment submissions.

## Core persisted records

The Prisma schema stores users/sessions/profiles, classes/subjects/teacher assignments, attendance, assignments/submissions, results/report cards, notifications/announcements, timetable/slots, legacy fees and the invoice-based finance ledger, payment attempts/webhook events/receipts/offline payments/refunds, audit logs, and file assets. This is useful as a concise map of the project’s major data domains.
