# Progress: Mobile Student & Parent Debugger Audit

## Current Status
All Phases (Phase 1: Discovery & Audit, Phase 2: Bug Fixes, Phase 3: Verification) are COMPLETE.

## Completed Steps
1. **Audit & Discovery**:
   - Audited 7 Student screens (`StudentSubjectsScreen.js`, `StudentSubjectDetailModal.js`, `StudentLeaveScreen.js`, `StudentResultsScreen.js`, `StudentTimetableScreen.js`, `StudentAssignmentsScreen.js`, `StudentProfileScreen.js`).
   - Audited 8 Parent screens (`ParentMessagesScreen.js`, `ParentFeesScreen.js`, `ParentLeaveScreen.js`, `ParentAttendanceScreen.js`, `ParentTimetableScreen.js`, `ParentResultsScreen.js`, `ParentAssignmentsScreen.js`, `ParentProfileScreen.js`).
   - Identified 7 concrete contract and functional bugs between mobile clients and PostgreSQL backend endpoints.

2. **Implemented Fixes**:
   - `backend/controllers/studentController.js`:
     - Added `sa.subject_id` to `getStudentTimetable` projection.
     - Dual-mapped camelCase and snake_case properties in `getSubjectDetails`.
     - Replaced fragile `ON CONFLICT (id)` with check & update/insert in `submitAssignment`.
   - `mobile/src/components/StudentSubjectDetailModal.js`:
     - Supported both snake_case and camelCase attributes across all 4 tabs (Overview, Exams & Marks, Upcoming, Assignments).
   - `mobile/src/screens/student/StudentTimetableScreen.js`:
     - Updated subject detail modal invocation prop binding to `selectedSubject?._id || selectedSubject?.id || selectedSubject?.subjectId`.
   - `mobile/src/screens/parent/ParentAssignmentsScreen.js`:
     - Corrected response unpacking to extract `{ assignments }` envelope instead of assuming bare array.
     - Resolved student ID with fallback (`id || studentId || _id`).
   - `backend/controllers/parentController.js`:
     - Ensured `getLinkedStudents` exposes `id: row.id`.
     - Added `applyParentLeave` controller with validation, overlap checks, and teacher notification.
     - Filtered `upcomingExams` in `getStudentResults` by student class and future date.
   - `backend/routes/parentRoutes.js`:
     - Registered `POST /api/parent/apply-leave`.
   - `mobile/src/screens/parent/ParentLeaveScreen.js`:
     - Implemented child switcher tabs, `route.params.studentId` support, and "Apply Leave" modal with API submission.
   - `mobile/src/screens/parent/ParentFeesScreen.js`:
     - Added child switcher tabs and `route.params.studentId` support.
   - `mobile/src/screens/parent/ParentResultsScreen.js`:
     - Added child switcher tabs and `route.params.studentId` support.

3. **Verification**:
   - Verified syntax of all modified mobile screens and components (`node -c`).
   - Verified backend controller query structures and route handlers.
