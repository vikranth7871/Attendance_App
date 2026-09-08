# Findings: Mobile Student & Parent Debugger Audit

## Environment & Architecture Overview
- Mobile Stack: React Native (Expo SDK 52/53, React Navigation)
- API Client: Axios instance with AsyncStorage auth token interceptor (`mobile/src/api/client.js`)
- Backend: Node.js / Express / PostgreSQL via `pg` (`pool`)
- Roles audited:
  - Student: `StudentSubjectsScreen.js`, `StudentLeaveScreen.js`, `StudentResultsScreen.js`, `StudentTimetableScreen.js`, `StudentAssignmentsScreen.js`, `StudentProfileScreen.js`
  - Parent: `ParentMessagesScreen.js`, `ParentFeesScreen.js`, `ParentLeaveScreen.js`, `ParentAttendanceScreen.js`, `ParentTimetableScreen.js`, `ParentResultsScreen.js`, `ParentAssignmentsScreen.js`, `ParentProfileScreen.js`

## Bugs Identified & Verified

### Bug 1: `StudentTimetableScreen.js` Slot Click Never Opens Modal (`getStudentTimetable`)
- **Location**: `backend/controllers/studentController.js` (lines 425-434)
- **Root Cause**: `SELECT sa.id, sa.day_of_week, sa.time_slot, sa.start_time, sa.end_time, sa.room_number...` completely omitted `sa.subject_id`.
- **Symptom**: In `StudentTimetableScreen.js`, `sub.subjectId?._id || sub.subjectId || sub.subject_id` was always `undefined`, so tapping a timetable card did nothing.
- **Fix**: Add `sa.subject_id` to the SELECT query in `getStudentTimetable`.

### Bug 2: `StudentSubjectDetailModal.js` Property Name Mismatches
- **Location**: `mobile/src/components/StudentSubjectDetailModal.js` & `backend/controllers/studentController.js` (`getSubjectDetails`)
- **Root Cause**: Backend returned raw PostgreSQL snake_case columns (`marks_obtained`, `max_marks`, `exam_name`, `exam_date`, `time_slot`, `room_number`, `due_date`), but modal was reading camelCase (`marksObtained`, `examName`, `examDate`, `roomNumber`, `dueDate`).
- **Symptom**: Marks displayed blank, exam titles defaulted to 'Assessment', exam dates displayed 'TBA', room numbers were hidden, due dates were 'N/A'.
- **Fix**: Map both snake_case and camelCase in backend controller and support both in `StudentSubjectDetailModal.js`.

### Bug 3: `ParentAssignmentsScreen.js` Empty List Bug
- **Location**: `mobile/src/screens/parent/ParentAssignmentsScreen.js` (line 46)
- **Root Cause**: Backend `/parent/student-assignments` returns `{ student, assignments }`. Screen did `setAssignments(Array.isArray(data) ? data : [])`. `Array.isArray(data)` was `false`.
- **Symptom**: Screen always displayed "No assignments found" even when assignments exist.
- **Fix**: Handle `{ assignments }` envelope: `setAssignments(Array.isArray(data) ? data : (data?.assignments || []))`.

### Bug 4: `ParentLeaveScreen.js` Missing Child Filter & Leave Application Capability
- **Location**: `mobile/src/screens/parent/ParentLeaveScreen.js` & `backend/controllers/parentController.js`
- **Root Cause**: `ParentLeaveScreen.js` only showed approval/rejection for children's leaves without child selector or the ability for parents to apply for leave on behalf of their child.
- **Fix**:
  1. Add `POST /api/parent/apply-leave` to allow parents to submit leave applications for their children.
  2. Add child selector tabs and "Apply Leave" modal in `ParentLeaveScreen.js`.

### Bug 5: `ParentFeesScreen.js` and `ParentResultsScreen.js` Missing Child Switching
- **Location**: `mobile/src/screens/parent/ParentFeesScreen.js`, `mobile/src/screens/parent/ParentResultsScreen.js`
- **Root Cause**: Did not read `route?.params?.studentId` or allow switching between children.
- **Fix**: Add child selector and support route param `studentId`.

### Bug 6: `getStudentResults` (Parent Controller) Unfiltered Upcoming Exams
- **Location**: `backend/controllers/parentController.js` (lines 414-420)
- **Root Cause**: Selected all exam schedules without filtering by student's `class_id` or date `>= CURRENT_DATE`.
- **Fix**: Filter by `targetStudent.classInfo?.id` and `exam_date >= CURRENT_DATE`.

### Bug 7: `submitAssignment` Duplicate Rows
- **Location**: `backend/controllers/studentController.js` (line 250)
- **Root Cause**: `ON CONFLICT (id)` on serial primary key does not prevent duplicate submissions.
- **Fix**: Check `SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2` before insert/update.
