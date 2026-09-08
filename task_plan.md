# Task Plan: Debugger Audit for Student & Parent Mobile Screens

## Goal
Perform a comprehensive code and contract audit on the mobile screens for **Student** and **Parent** roles to identify and fix obvious bugs, missing imports/components, API endpoint mismatches with the backend, and broken UI states.

---

## Phases

### Phase 1: Discovery & Contract Verification
- [x] Audit Student screens against backend endpoints:
  - [x] `StudentSubjectsScreen.js` (imports, modals, `/student/subjects`)
  - [x] `StudentLeaveScreen.js` (apply leave, document upload, `/leave/my-leaves`, `/leave/apply`)
  - [x] `StudentResultsScreen.js` (result fetching, grading, `/student/results`)
  - [x] `StudentTimetableScreen.js` (image exporter, `/student/timetable`, day parsing)
- [x] Audit Parent screens against backend endpoints:
  - [x] `ParentMessagesScreen.js` (teacher messaging, `/parent/messages`)
  - [x] `ParentFeesScreen.js` (fees breakdown, payment history, `/parent/student-fees`)
  - [x] `ParentLeaveScreen.js` (child leave application, leave history, `/parent/student-leaves`)
  - [x] `ParentAttendanceScreen.js` (attendance calendar/history, child selection, `/parent/student-attendance`)
  - [x] Checks on `ParentTimetableScreen.js`, `ParentResultsScreen.js`, `ParentAssignmentsScreen.js`

### Phase 2: Bug Fixes & Improvements
- [x] Fix Bug 1 & Bug 2: Update `studentController.js` (`getStudentTimetable` missing `sa.subject_id`, `getSubjectDetails` field mappings, `submitAssignment` check)
- [x] Fix Bug 2: Update `StudentSubjectDetailModal.js` to support both snake_case and camelCase attributes
- [x] Fix Bug 3: Update `ParentAssignmentsScreen.js` to correctly unpack `{ assignments }` from API
- [x] Fix Bug 4: Add `applyParentLeave` to `backend/controllers/parentController.js` and `backend/routes/parentRoutes.js`; update `ParentLeaveScreen.js` to support child selection and leave application
- [x] Fix Bug 5: Update `ParentFeesScreen.js` and `ParentResultsScreen.js` to support `route.params.studentId` and child selector tabs
- [x] Fix Bug 6: Filter `upcomingExams` in `parentController.js` (`getStudentResults`) by class and upcoming date
- [x] Fix Bug 7: Update `submitAssignment` in `studentController.js` with existence check preventing duplicate submissions

### Phase 3: Verification & Walkthrough
- [x] Test syntax / run lint checks on modified backend & mobile files
- [x] Update `walkthrough.md`
- [x] Present completed work to the user
