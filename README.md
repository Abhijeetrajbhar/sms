# EduManage — School Management System

A production-ready school ERP platform built with Node.js, Express, TypeScript, MongoDB (Prisma), and React.

## Overview

This repository contains a full-featured school management platform supporting Administrators, Teachers, Students, and Parents:
- User authentication, roles, and granular permissions
- Student directory, admissions, and guardian linkages
- Teacher profiles, subject mapping, and class mentorship
- Daily attendance tracking and heatmap summaries
- Assignments, online submissions, and grading feedback
- Examination results, grading scales, GPA calculation, and PDF report cards
- Fee structures, bulk invoicing, online Razorpay checkout, and offline receipt workflows
- Timetable scheduling for classes and teachers
- School announcements and live notifications via Socket.io
- Audit trails and activity logging for administrative accountability

## Documentation

Comprehensive project documentation is maintained in the [`docs/`](docs/) directory:
- [Features & Modules Inventory](docs/PROJECT_FEATURES.md)
- [API Contract & Integration Guide](docs/API_CONTRACT.md)
- [Deployment & Production Checklist](docs/DEPLOYMENT_CHECKLIST.md)

## Repository Structure

```
/ (workspace root)
  README.md
  docs/
    API_CONTRACT.md
    DEPLOYMENT_CHECKLIST.md
    PROJECT_FEATURES.md
  smsbackend/
    docker-compose.yml
    Dockerfile
    package.json
    tsconfig.json
    README.md
    prisma/
      schema.prisma
    src/
      app.ts
      server.ts
      config/
      middlewares/
      modules/
      jobs/
      scripts/
      utils/
  smsfrontend/
    package.json
    vite.config.js
    tailwind.config.js
    src/
      App.jsx
      main.jsx
      pages/
      layouts/
      components/
      services/
      context/
      constants/
      utils/
```

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM with MongoDB
- Redis and BullMQ for queues and caching
- Socket.io for real-time events
- Cloudinary for file uploads
- JWT authentication with access + refresh tokens
- Zod validation
- Winston logging
- PDF generation with PDFKit
- Nodemailer for email

### Frontend
- React
- Vite
- Tailwind CSS
- React Router DOM
- Role-aware UI and route protection
- Auto token refresh and API error handling

## Key Concepts

### Roles
- `ADMIN`
- `TEACHER`
- `STUDENT`
- `PARENT`

### Core Domains
- Users and permissions
- Student profiles and parent linkages
- Teacher profiles and subject assignments
- Classes, sections, and academic setup
- Attendance marking and monitoring
- Assignments, submissions, and grading
- Results, GPA, grade conversion, and report card PDF generation
- Fee structures, invoicing, payment processing, refunds, and receipts
- Timetable and schedule management
- Announcements and notifications
- Analytics, risk scoring, and dashboard insights
- Audit log tracking
- AI-powered academic insights

## Backend Architecture

The backend is modular and organized around feature modules.

- `src/app.ts` sets up Express middleware, CORS, rate limiting, routes, and error handling.
- `src/server.ts` bootstraps services, connects database + Redis, configures Cloudinary, initializes Socket.io, and starts background workers.
- `src/config/` holds environment validation, database, Redis, Cloudinary, queue, and socket setup.
- `src/middlewares/` holds authentication, authorization, validation, file upload, rate limiting, and error handling.
- `src/modules/` contains feature-specific route controllers and services.
- `src/jobs/` handles background tasks like report card generation, notifications, analytics updates, and payment reconciliation.
- `prisma/schema.prisma` defines the data model and business enums.

## Frontend Architecture

- `src/App.jsx` manages public vs protected routes and role-based access.
- `src/context/AppContext.jsx` manages user session state, local storage, token refresh, and data normalization.
- `src/services/api.js` provides a shared API client with auto-refresh logic and error handling.
- `src/constants/navigation.js` defines role-specific navigation and permissions.
- `src/pages/` contains the app pages for dashboard, users, students, attendance, fees, analytics, AI insights, and more.

## Features

### Authentication and Authorization
- JWT-based access and refresh tokens
- account activation, forgot password, and reset flows
- role-based access control
- admin permission catalog and super-admin overrides

### Academic and Administrative Management
- student and teacher profiles
- class and subject assignment
- timetable generation
- attendance tracking with multiple statuses
- assignment publishing and submission grading
- result publishing, locking, and report card generation

### Finance and Payments
- fee structures and invoices
- Razorpay webhook support and payment reconciliation
- offline payment approval and refund workflow
- receipt generation and download support

### Notifications and Announcements
- real-time notifications via Socket.io
- announcement targeting by role or class
- queued notification processing

### Analytics and Risk Scoring
- student performance analytics
- attendance and submission dashboards
- risk score computation and health monitoring

### AI Capabilities
- student summary generation
- teacher remark creation
- attendance explanation
- risk explanation
- question generation
- configurable AI provider: Gemini or OpenAI

## Setup and Run

### Backend

1. Navigate to backend:
   ```bash
   cd smsbackend
   npm install
   ```
2. Create and edit `.env` based on your environment.
3. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
4. Push schema to database:
   ```bash
   npm run prisma:push
   ```
5. Seed demo data:
   ```bash
   npm run seed
   ```
6. Start development server:
   ```bash
   npm run dev
   ```

### Frontend

1. Navigate to frontend:
   ```bash
   cd smsfrontend
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```

### Running with Docker

The backend includes Docker support via `docker-compose.yml` and `Dockerfile`. Review `smsbackend/docker-compose.yml` for service definitions.

## Environment Configuration

The backend uses strong Zod validation for environment variables. Important flags include:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `CLOUDINARY_*`
- `SMTP_*`
- `AI_ENABLED`, `AI_PROVIDER`, `OPENAI_API_KEY`, `GEMINI_API_KEY`
- `STUDENT_ONLINE_PAYMENTS_ENABLED`, `RAZORPAY_*`

## Deployment & PaaS Hosting

This repository is ready for deployment on modern Platform-as-a-Service (PaaS) providers:

- **1-Click Render.com Blueprint**: Uses [`render.yaml`](render.yaml) to provision the backend web service and frontend static site automatically.
- **Split Hosting**:
  - **Backend**: Host on [Render](https://render.com), [Railway](https://railway.app), [Fly.io](https://fly.io), or Heroku. Uses `npm run build` (`prisma generate && tsc`), `npm start`, and includes a health check at `/health`.
  - **Frontend**: Host on [Vercel](https://vercel.com), [Netlify](https://netlify.com), or Cloudflare Pages. Client-side routing is configured via [`vercel.json`](smsfrontend/vercel.json) and [`smsfrontend/public/_redirects`](smsfrontend/public/_redirects).
- **Checklist**: See [`docs/DEPLOYMENT_CHECKLIST.md`](docs/DEPLOYMENT_CHECKLIST.md) for pre-flight verification steps, security recommendations, and production environment variable setup.

## Notes

- The backend README at `smsbackend/README.md` contains backend-focused documentation.
- This top-level README is intended as an overall project summary.
- Use `smsfrontend` and `smsbackend` package scripts for local development, linting, and tests.

## Contact

For deeper inspection, review the backend module folders and frontend page components.
