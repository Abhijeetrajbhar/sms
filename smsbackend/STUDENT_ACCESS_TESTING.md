# Student Access Phase 1 Test Checklist

## Student self-service

- Sign in as a student and call `GET /api/students/me/profile`.
- Confirm the response contains only the logged-in student's safe profile and assigned class.
- Call `GET /api/students/me/dashboard`.
- Confirm attendance, assignments, published results, timetable, notices, fees, invoices, receipts, and notifications belong only to the logged-in student.
- Confirm an unassigned student receives clean empty collections rather than school-wide data.

## Direct API denial checks

- Call `GET /api/students/:otherStudentId` with a student token and expect `403`.
- Call `GET /api/classes/:otherClassId` with a student token and expect `403`.
- Call `GET /api/timetable/class/:otherClassId` with a student token and expect `403`.
- Call `GET /api/announcements?classId=:otherClassId` with a student token and expect `403`.
- Call `PATCH /api/announcements/:unrelatedNoticeId/read` with a student token and expect `403`.
- Call `GET /api/assignments?classId=:otherClassId` with a student token and expect `403`.
- Call `GET /api/assignments/:otherClassAssignmentId` with a student token and expect `403`.
- Call `GET /api/teachers/:teacherId` and `GET /api/teachers/:teacherId/classes` with a student token and expect `403`.

## Allowed student workflows

- Confirm `GET /api/classes` returns only the student's assigned class.
- Confirm `GET /api/subjects` returns only subjects mapped to the student's assigned class.
- Confirm assignments expose only the student's own submission and do not expose class submission counts.
- Confirm only published results are returned.
- Confirm fee invoices, dues, receipts, and payment data are scoped to the logged-in student.
- Confirm attendance mutation, result mutation, assignment creation, and admin routes remain forbidden.

## Frontend checks

- Confirm the student dashboard has no admin totals, school revenue, staff lists, risk cards, or management controls.
- Confirm the sidebar shows only Dashboard, My Profile, Attendance, Assignments, Results, Timetable, Notices, and Fees.
- Confirm loading, empty, error, and retry states render cleanly.
- Check the dashboard and sidebar at 320px, 375px, 425px, 768px, 1024px, 1280px, and 1440px.
- Confirm expired sessions redirect to login through the existing API interceptor.

## Remaining optional modules

Leave requests, direct messages, transport tracking, and student documents were not added because no existing project models or flows were found for them. Add them as separate, schema-backed phases rather than placeholder navigation.
