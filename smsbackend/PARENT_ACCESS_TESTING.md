# Parent Workspace and Access-Control Testing

## Existing relationship model

- Parent-child access uses the existing `StudentProfile.parentIds` relationship.
- Only active parent profiles and active, non-deleted linked students are included.
- The relationship is checked on the backend for every student-specific parent request.
- Parent-specific relation permissions such as `canPayFees` and `canViewResults` are not present in the current schema and should be introduced later through a reviewed migration.

## Parent workspace setup

Prepare:

- one parent linked to one active student
- one parent linked to multiple active students
- one unlinked student
- one inactive or deleted linked student
- published and unpublished assignments/results
- fee invoices and verified receipts for different students

## Required authorization checks

Use a parent token and confirm unauthorized requests return `403`.

- [ ] Request another parent's profile.
- [ ] Request an unlinked student profile, attendance, attendance summary, results, report cards, or risk endpoint.
- [ ] Request an unlinked class, class timetable, or class notice.
- [ ] Filter assignments using an unlinked `classId`.
- [ ] Open an assignment from an unlinked class.
- [ ] Confirm assignment details never expose other students' submissions.
- [ ] Filter invoices or payment history using an unlinked `studentId`.
- [ ] Open or download another student's receipt.
- [ ] Start a payment for another student's invoice.
- [ ] Start a payment for an inactive linked student.
- [ ] Confirm parent cannot mark attendance, create assignments, enter marks, manage users, or access fee reports.

## Dashboard and child switching

- [ ] Parent dashboard shows only parent profile and linked children.
- [ ] No school-wide totals, revenue, all students, all teachers, full class list, settings, or audit logs appear.
- [ ] Parent with no linked child sees a clean empty state.
- [ ] Parent with multiple children can switch using the child selector.
- [ ] Switching children clears the previous child's records before loading the next child.
- [ ] Failed selected-child requests do not fall back to mock or admin data.
- [ ] Parent notifications contain only notifications for the signed-in parent.

## Child-scoped modules

- [ ] Attendance shows only the selected child's daily records and summary.
- [ ] Assignments show only published assignments for the selected child's class.
- [ ] Assignment status and feedback show only the selected child's submission.
- [ ] Results show only published results for the selected child.
- [ ] Timetable shows only the selected child's class timetable.
- [ ] Notices show only school-wide, parent-targeted, and selected-class notices.
- [ ] Fees show only the selected child's legacy fees and secure invoices.
- [ ] Payment history and receipts change when the selected child changes.
- [ ] Payment order amount is calculated by the backend from the invoice.
- [ ] Duplicate payment clicks reuse or reject active payment attempts safely.

## Notification checks

- [ ] Linked parents receive new assignment notifications.
- [ ] Linked parents receive result-published notifications.
- [ ] Linked parents receive fee-due notifications.
- [ ] Linked parents receive class-notice notifications.
- [ ] A parent linked to multiple children receives one notification per event, not duplicates.

## Verification commands

Run from `smsbackend`:

```powershell
npx prisma validate
npm run build
```

Run from `smsfrontend`:

```powershell
npm run lint
npm run build
```

Verify parent pages at 320, 375, 425, 768, 1024, 1280, and 1440 pixels.

## Future modules

Leave requests, parent-teacher messages, transport, documents, and per-relationship permissions do not exist in the current schema. Add them as separately reviewed modules rather than creating navigation links with no working backend.
