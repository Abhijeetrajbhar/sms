# Teacher Workspace and Access-Control Testing

## Access model

- `Class.teacherId` identifies the designated class teacher.
- Active `SubjectTeacher` records identify the exact teacher, class/section, and subject mapping.
- A teacher may access students and attendance only for classes in either mapping.
- Assignment ownership is always checked against `Assignment.teacherId`.
- Marks entry is allowed only for an active exact class-subject mapping.
- Class teachers receive broader class-level summary, notice, and timetable access, but no fee, payment, user-management, or system-setting access.
- Subject teachers receive only their assigned subjects, their timetable slots, their assignments, and their marks entries.

## Setup

1. Apply the additive Prisma schema to the intended development database:
   `npm run prisma:push`
2. Stop any running backend process that locks the Prisma Windows query engine, then generate the client:
   `npm run prisma:generate`
3. Start the backend and frontend.
4. Prepare:
   - one admin
   - two teachers assigned to different class-subject combinations
   - one class teacher
   - students in assigned and unassigned classes

Do not run `prisma:push` against production without reviewing and backing up the database.

## Required API denial checks

Use a teacher token and confirm each denied request returns `403`, not hidden data.

- [ ] Request another teacher's profile, assigned classes, or class analytics.
- [ ] Request an unassigned class, class analytics, attendance history, or timetable.
- [ ] Request an unassigned student or student risk/AI endpoint.
- [ ] Create attendance for an unassigned class or a student outside the selected class.
- [ ] Create an assignment for an unassigned class-subject mapping.
- [ ] Read, update, delete, grade, or list submissions for another teacher's assignment.
- [ ] Create or update marks for an unassigned subject.
- [ ] Update submitted or locked marks.
- [ ] Create a class notice when the teacher is not the designated class teacher.
- [ ] Call legacy or current fee/payment endpoints as a teacher.

## Dashboard and navigation

- [ ] Teacher dashboard shows profile, assigned classes/subjects, scoped students, attendance summary, timetable, tasks, own assignments, and relevant notices.
- [ ] Dashboard does not show revenue, fees, payment details, all-school counts, all teachers, settings, or user management.
- [ ] Teacher sidebar contains only teacher workspace routes.
- [ ] A teacher with no assignments sees clean empty states.
- [ ] Loading, API failure, and retry states render without exposing fallback admin/mock data.

## Attendance

- [ ] Teacher can mark attendance for an assigned class.
- [ ] Every submitted student belongs to the selected active class.
- [ ] Duplicate students in one request are rejected.
- [ ] Duplicate attendance for the same student and date is rejected.
- [ ] Future-date attendance is rejected.
- [ ] Attendance updates are restricted to assigned classes and create audit entries.
- [ ] Double-clicking submit does not create duplicate rows.

## Assignments and submissions

- [ ] Teacher can create an assignment only for an assigned class-subject mapping.
- [ ] Past due dates and invalid maximum marks are rejected.
- [ ] Draft/published assignment state works.
- [ ] Teacher sees only their own assignments and submissions.
- [ ] Student sees only published assignments for their class.
- [ ] Student submission notifies only the owning teacher.
- [ ] Grading validates marks and notifies the student.
- [ ] Assignment deletion is blocked after submissions exist.

## Marks entry

- [ ] Teacher can load students only for an assigned class-subject mapping.
- [ ] Negative marks and marks above maximum are rejected.
- [ ] Draft save creates or updates only draft records.
- [ ] Final submission changes draft records to submitted.
- [ ] Teacher cannot edit submitted, locked, or published marks.
- [ ] Admin publish locks marks; admin unlock returns them to draft.
- [ ] Draft, submit, publish, and unlock actions create audit entries.

## Class-teacher behavior

- [ ] Class teacher sees the full assigned class student list, class summary, relevant notices, and class timetable.
- [ ] Subject teacher sees only their subject mappings, subject results, own assignment count, and own timetable slots.
- [ ] Normal subject teacher cannot create class notices.
- [ ] Neither teacher type can access fee transactions, payment details, admin settings, or other classes.

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

Also verify the teacher workspace at 320, 375, 425, 768, 1024, 1280, and 1440 pixels.
