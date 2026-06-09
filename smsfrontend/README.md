# CampusOryx SMS Frontend

A professional, modular, MERN-ready frontend for a School Management System. This project converts the original single-file React UI into a maintainable Vite + React + Tailwind folder structure.

## What is included

- Premium landing page with role-based demo login
- Admin, teacher, student, and parent navigation models
- Dashboard with modern KPI cards, charts, fee overview, attendance snapshot, and AI academic alerts
- Students, teachers, classes, attendance, assignments, results, fees, timetable, analytics, announcements, and audit logs pages
- Componentized UI system: buttons, badges, cards, avatar, progress bar, table, charts
- Backend-ready API wrapper in `src/services/api.js`
- `.env.example` for backend API URL
- `vercel.json` for SPA deployment rewrite

## Folder Structure

```txt
sms-modern-frontend/
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
├── vercel.json
├── .env.example
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── styles.css
    ├── components/
    │   ├── charts/
    │   ├── common/
    │   └── ui/
    ├── constants/
    ├── context/
    ├── data/
    ├── layouts/
    ├── pages/
    ├── services/
    └── utils/
```

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in your terminal, usually:

```txt
http://localhost:3000
```

## Connect with MERN backend

1. Copy `.env.example` to `.env`.
2. Set your backend URL:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

3. Replace mock data imports inside pages with API calls from:

```txt
src/services/api.js
```

Suggested backend endpoint mapping:

```txt
GET    /api/dashboard/stats
GET    /api/students
POST   /api/students
GET    /api/teachers
GET    /api/classes
GET    /api/attendance/today
POST   /api/attendance/mark
GET    /api/assignments
GET    /api/results
GET    /api/fees
GET    /api/timetable
GET    /api/announcements
GET    /api/audit-logs
GET    /api/ai-insights
```

## Design Notes

The UI uses a premium dark aurora landing page, glass cards, strong typography, gradient action states, responsive layout, and clean dashboard modules. Tailwind classes are kept explicit so the design works correctly in production builds.
