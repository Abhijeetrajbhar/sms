# Admin Access Phase 1 Test Checklist

## Permission compatibility

- Confirm an existing admin with `permissions: []` can access all current admin modules.
- Create a restricted admin with only `dashboard:view`; confirm only Dashboard appears.
- Add `students:view`; confirm Students appears and `GET /api/v1/students` succeeds.
- Call an unassigned module API directly and confirm it returns `403`.
- Confirm a non-admin token cannot access `/api/v1/users`, audit logs, refunds, or admin-only mutations.

## Privilege escalation protection

- Confirm public registration rejects role `ADMIN`.
- Confirm a restricted admin cannot create an admin account.
- Confirm a restricted admin cannot update another admin.
- Confirm an admin cannot deactivate, suspend, delete, or change their own role.
- Confirm only a legacy or explicit super admin can update admin permissions.
- Confirm a restricted admin cannot be saved with an empty permission list.
- Confirm the general user-update endpoint ignores permission and super-admin fields.

## Admin dashboard

- Confirm totals show students, active students, teachers, active teachers, parents, classes, sections, and subjects.
- Confirm attendance is calculated from today's attendance records only.
- Confirm fee totals come from fee invoices and are hidden without `fees:view`.
- Confirm pending parent links, teacher approvals, and payment verification are permission-scoped.
- Confirm recent admissions, notices, and audit activity are hidden without their matching permissions.
- Confirm an API error shows an error and retry state without falling back to mock school records.

## Management flows

- Create a user from Users & Roles and confirm duplicate email returns `409`.
- Create a student account/profile and confirm it appears after refresh.
- Create a teacher account/profile and confirm it appears after refresh.
- Create a parent profile, then link it to a student.
- Attempt the same parent-student link twice and confirm it returns `409`.
- Create a class with class, section, grade level, academic year, capacity, and room.
- Attempt to archive a class with linked academic or financial records and confirm it returns `409`.
- Create a subject and confirm duplicate subject code returns `409`.

## Finance, results, attendance, notices, and reports

- Confirm view-only admins cannot see mutation controls for fees, results, assignments, or exports.
- Confirm direct mutation API calls without the required permission return `403`.
- Confirm payment verification requires `payments:verify`.
- Confirm refunds require `fees:refund`.
- Confirm receipt downloads by an admin require `receipts:download`.
- Confirm audit logs require `audit:view`.
- Confirm reports and AI insights require `reports:view`; exports require `reports:export`.

## Remaining schema-backed phases

- A dedicated academic-year/session model with active/archive workflow.
- A verified parent-student relation model with relation-level capabilities.
- Settings, leave requests, transport, complaints, and document management.
- Safe student/teacher archive workflows with dependency review and transfer/history support.
