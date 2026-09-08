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

---

## Student Dashboard Web Replica & Streak Eradication

### 1. Web Parity Audit vs. Mobile Student Dashboard
- **Web Layout**:
  - Hero Header: Student Portal with student details & account indicators.
  - Section Title: **Student Overview**.
  - Top Card 1 (Attendance Stats):
    - Top sub-card: BookOpen icon, large session count (`totalClasses`), label "TOTAL SESSIONS".
    - 3-column metric cards: Present (`CheckCircle2`, green), Absent (`AlertTriangle`, red), Leave (`Clock`, amber).
  - Top Card 2 (Attendance Performance):
    - Circular SVG Gauge with `{percentage}% OVERALL`.
    - Status badge pill (`Excellent` / `Good` / `Warning`) matching tier colors.
    - Performance Insights box: Sub-card header strip with glowing dot + 2 smart calculation insights (e.g. classes needed to reach 75%, threshold warning).
  - Lower Section (Today's Schedule):
    - Title: `Today's Schedule (Day, Date)` / `Tomorrow's Schedule`.
    - Tab Switcher: `[ Today ]` & `[ Tomorrow ]` toggle pills.
    - Period cards: Status badge (`Live Now`, `Completed`, `Upcoming`), Subject name, Time & Room, Faculty name.
    - Interactive tap opens `StudentSubjectDetailModal`.

### 2. Complete Streak Concept Removal
- **Mobile Screens Cleaned**:
  - `StudentDashboardScreen.js`: Redesigned to 1:1 web replica, all streak cards and flame badges removed.
  - `StudentAttendanceHistoryScreen.js`: Removed `streakBanner`, streak counts, flame badges, and `api.get('/student/streak')`.
  - `UserManageScreen.js`: Replaced streak counters in student profile dossier modal with Section and Status.
  - `ClassRosterScreen.js`: Replaced streak KPI with approved leave count.
- **Backend Services Cleaned**:
  - `studentController.js`: Removed streak queries and properties from `getStudentOverview`; updated `getLeaderboard` to rank by attendance rate.
  - `attendanceController.js`: Removed streak increment and reset queries on manual and bulk attendance.
  - `attendanceScheduler.js`: Removed automated streak reset queries.
- **Documentation Cleaned**:
  - `README.md`, `WEBSITE_FEATURES.md`, `DESIGN.md`: Updated to remove all streak mentions.

### 3. Side-by-Side Analytics Cards Optimization
- **Goal**: Enable students to immediately see and access "Today's Schedule" above the fold without vertical scroll delay.
- **Implementation in `StudentDashboardScreen.js`**:
  - Replaced vertically stacked card layout with `topOverviewRow` (`flexDirection: 'row'`, `gap: spacing.sm`, `alignItems: 'stretch'`).
  - **Left Card (`Attendance Stats`)**:
    - Compact header with Activity icon and bold title.
    - Compact Total Sessions box with BookOpen circle, big count, and "TOTAL SESSIONS" label.
    - 3 sleek horizontal rows for Present (green), Absent (red), and Leave (amber), displaying icon + label on left and bold count on right.
  - **Right Card (`Attendance Performance`)**:
    - Scaled 84px SVG circular gauge with `{percentage}% OVERALL` text.
    - Status pill badge ("Excellent" / "Good" / "Warning") dynamically matching attendance tier.
    - Compact Insight sub-card displaying actionable target message (e.g. classes needed to reach 75%).
  - **Impact**: Decreased top card vertical height footprint from ~600px down to ~225px, bringing Today's Schedule immediately above the fold on mobile screens (e.g. iPhone 13 Pro).

### 4. Port Teacher Timetable Features & Design Language to Student Timetable
- **Target File**: `mobile/src/screens/student/StudentTimetableScreen.js`
- **Features Ported from `TeacherTimetableScreen.js`**:
  1. **High-Resolution Graphic Image Exporter**: Integrated `exportTimetableAsImage` utility generating pixel-perfect PNG picture grid download with `ActivityIndicator` loading state in the header.
  2. **Top Metrics Strip**: Added 3-stat overview bar (Total Lectures, Enrolled Courses, Active Days).
  3. **Segmented Mode Toggle**: Seamless switcher between "Weekly Matrix" (Grid icon) and "Day Schedule" (List icon).
  4. **Weekly Matrix Grid**:
     - `gridOuterCard` with Calendar icon header, horizontal scroll guidance hint.
     - Sticky time column with start/end times and clock icon.
     - Colored slot cards with period accent lines, live indicators, subject name, room, and teacher badge.
     - Slot tap opens `StudentSubjectDetailModal`.
  5. **Interactive Day Schedule**:
     - Day selector pills displaying short day names, lecture count per day, and today dot indicator.
     - Active day section header with lecture count and `TODAY` pill.
     - Period lecture cards with time column, live badge, subject, teacher name, room number, and "Details" action button opening `StudentSubjectDetailModal`.
     - `emptyDayBox` with clock icon and preparation/free time subtitle.
  6. **Unscheduled / Self-Paced Subjects Section**:
     - Displays individually enrolled courses lacking periodic weekly slots.
  7. **Card Color Uniformity**:
     - Removed rainbow period color rotations (`PERIOD_COLORS`) on card left borders.
     - Set card left accent borders uniformly to `colors.primary` (`#6366f1` / indigo) for standard periods and `colors.success` (`#10b981` / emerald) for active live periods, identically matching `TeacherTimetableScreen.js`.
     - Standardized the "Details" action button to `colors.primary + '22'` background and `colors.primary` text/icon.

### 5. Assignment Filters & Submission Status Discrepancy (Bug 8)
- **Problem**: In `StudentAssignmentsScreen.js`, clicking the "Submitted" filter displayed "No submitted assignments" even when assignments were submitted or existed in the database.
- **Root Cause**:
  1. Backend controllers (`studentController.js` and `db.js` seed script) persist student homework submissions as `status = 'completed'`.
  2. Mobile `StudentAssignmentsScreen.js` strictly filtered with `a.status === filter`, checking for literal `'submitted'`. Because `a.status` was `'completed'`, the comparison `a.status === 'submitted'` was always false.
  3. Status badge theme `STATUS_COLORS` omitted `'completed'`, causing fallback to `colors.textMuted`.
  4. Overdue logic in mobile strictly excluded `a.status !== 'submitted'`, causing completed assignments to falsely trigger the overdue badge and display the "Submit Homework" button if the due date had elapsed.
  5. `ParentAssignmentsScreen.js` suffered from the identical status string check against `'Submitted'`.
- **Resolution**:
  1. **Mobile Normalization**: Added robust status helper functions (`isGraded`, `isSubmitted`, `isOverdueItem`) to `StudentAssignmentsScreen.js` and `ParentAssignmentsScreen.js` that treat `'submitted'` and `'completed'` as synonyms, recognize graded work (`a.status === 'graded'` or presence of `a.grade`), and prevent completed work from being flagged overdue.
  2. **Backend Normalization**: Added SQL `CASE WHEN` projection in `studentController.js` (`getMyAssignments`, `getSubjectDetails`) and `parentController.js` (`getStudentAssignments`) to map completed/submitted submissions cleanly to `'submitted'` while maintaining `'graded'` and `'pending'`.
  3. **Web Parity**: Updated `StudentAssignments.jsx` to recognize both `'completed'` and `'submitted'` without regressions.

### 6. Quiz Arena Mobile Student Replica (Phase 8)
- **Problem**: Mobile Quiz Arena screen (`QuizHubScreen.js`) was an early MVP with generic badges, missing the web application's modern aesthetic, hero metrics banner, corner badges, best score progress indicators, and dynamic action states.
- **Web Reference Analysis (`frontend/src/pages/quiz/QuizHub.jsx`)**:
  1. **Hero Gradient Card**: 48x48 rounded gradient box with white `Brain` icon (`#6366f1` to `#8b5cf6`), "Quiz Arena" title, "Test your knowledge, earn certifications" subtitle, and 4 stat metric boxes:
     - `AVAILABLE` (BookOpen, `#6366f1`)
     - `ATTEMPTS` (Target, `#f59e0b`)
     - `PASSED` (CheckCircle, `#16a34a`)
     - `CERTIFICATES` (Award, `#f97316`)
  2. **Tab Selector Bar**: 4 pill buttons with count badges (`Practice Quizzes`, `University Quizzes`, `My Results`, `Certificates`). Active tab is highlighted with a vibrant purple gradient (`#6366f1` to `#8b5cf6`) with white text and badge.
  3. **Search Bar**: Quick quiz search bar with clear icon for Practice and University quizzes.
  4. **Pixel-Perfect Quiz Cards**:
     - Top-right corner gradient type badge: `PRACTICE` (`#0ea5e9` to `#0284c7` cyan gradient) with Brain icon, or `UNIVERSITY` (`#4f46e5` to `#7c3aed` indigo gradient) with Building icon.
     - Top-left status pill: `Passed` (`rgba(22,163,74,0.15)` bg with green `#16a34a` text and CheckCircle) or `Incomplete` (`rgba(245,158,11,0.15)` bg with amber `#f59e0b` text and Clock).
     - Top content row: 42x42 gradient icon box with Brain or Trophy icon, alongside a difficulty tag (`MIXED` / `EASY` / `MEDIUM` / `HARD`).
     - Title, optional description, and subject tag with BookOpen icon.
     - Stats row: question count, time limit (for university), and attempt tries (`studentAttempts / maxAttempts`).
     - Best score indicator: "Best Score" label, score percentage (e.g. `100%`), and a 5px horizontal progress track with green fill (`#16a34a` to `#22c55e`).
     - Action button:
       - `▷ Start Quiz` (gradient `#6366f1` to `#8b5cf6`) when 0 tries.
       - `▷ Retry Quiz` (gradient `#6366f1` to `#8b5cf6`) when tries > 0 and attempts available.
       - `🔒 Attempts Exhausted` (disabled dark card button) when attempts >= maxAttempts.
  5. **My Results & Certificates**:
     - Results tab displays color-accented attempt cards with time taken, date, status, percentage, and score breakdown.
     - Certificates tab displays institutional merit cards with unique certificate ID, grade score, issue date, and a "Download & Share Certificate" action button.
- **Backend Sync**:
  - In `backend/controllers/quizController.js` (`getQuizzes`), ensured `difficulty: q.difficulty || 'mixed'` is returned so all quiz cards display their difficulty tag accurately.
- **Mobile Icon Sync**:
  - In `StudentDashboardScreen.js`, updated the Quiz Arena shortcut icon from `Gamepad2` to `Brain` with color `#8b5cf6`.

### 7. My Subjects Mobile Student Replica (Phase 9)
- **Problem**: Mobile `StudentSubjectsScreen.js` previously rendered a generic course list with courses/credits KPI boxes, missing the web application's cards, schedule badges, teacher callouts, and attendance turnout bars.
- **Web Reference Analysis (`frontend/src/pages/student/SubjectsPage.jsx`)**:
  1. **Section Header**: Title "My Subjects", subtitle "All subjects assigned to your class. Click a subject for detailed info."
  2. **Top Border Color Accent**: `4px solid #6366f1` (or `#10b981` for individual assignments).
  3. **Top-Right Pill Badge**: `Class Subject` in purple/indigo tint (`rgba(99, 102, 241, 0.12)`, `#818cf8`) or `Individual` in green.
  4. **Subject Header**:
     - 40x40 rounded icon box with `BookOpen` icon.
     - Subject Name in bold (e.g. `Python`, `BEEE`, `CN`, `M-1`).
     - Schedule Badge: `Calendar` icon + `X Weekly Slots (Days)` in `#818cf8` computed across weekly allocations.
  5. **Recessed "TAUGHT BY" Box**:
     - Dark recessed card (`colors.bgPrimary`, border `colors.border`, radius 10).
     - `User` icon, "TAUGHT BY" uppercase label, and teacher name (`Jane Teacher`, `Velsami`).
  6. **Recessed "SUBJECT ATTENDANCE" Box**:
     - "SUBJECT ATTENDANCE" label & percentage colored green (>=75%) or red (<75%).
     - 6px horizontal progress bar track with colored fill.
     - Counters row: `Present: X` (green number), `Absent: Y` (red number), `Total: Z` (white number).
  7. **Card Footer**: Centered `View Details >` with ChevronRight icon.
  8. **Interaction**: Tapping any card opens the 4-tab `StudentSubjectDetailModal` (Overview, Exams & Marks, Upcoming, Assignments).
- **Navigation Sync**:
  - Updated `mobile/src/components/AppNavigationDrawer.js` from `'My Subjects & Faculty'` to `'My Subjects'` to match web sidebar naming.

### 8. Exam Results & Performance Mobile Student Replica (Phase 10)
- **Problem**: Mobile `StudentResultsScreen.js` lacked the web layout's 4 overview metric cards, term-based grouping pills, progress tracks, grade pill colors, remark italic callouts, and clean Examination Schedule cards.
- **Web Reference Analysis (`frontend/src/pages/student/StudentResults.jsx`)**:
  1. **Header & CTA**:
     - Award icon, title **"Exam Results & Performance"**, and subtitle *"CIA-wise & term-wise breakdown of your academic performance."*
     - **"Download Report Card"** action button with Printer icon and vibrant purple gradient.
  2. **4 Overview Metric Cards**:
     - `OVERALL AVERAGE`: e.g. `88%` in `#818cf8`
     - `EXAMS TAKEN`: e.g. `2` in `#10b981`
     - `TERMS COVERED`: e.g. `1` in `#f59e0b`
     - `STATUS`: e.g. `PASS` in `#10b981` (or `REVIEW` in `#ef4444`)
  3. **Results & Schedule Segmented Toggle**:
     - Full-width pill switcher between `Results` and `Schedule` with active purple gradient and count badges.
  4. **Published Exam Results Section**:
     - Term filter tabs (e.g. `[ Mid-Term Examination 2026 (2) ]`) with active purple gradient and count badge.
     - Term summary header with `TrendingUp` icon: *"Term Average: 88% across 2 subjects"*.
     - Structured subject result cards: Subject title, code, marks (`85.00 / 100`), 5px horizontal progress track with percentage (`85%`), grade pill badge (`A`, `A+`), exam date, and italic remarks (`Good conceptual clarity`).
     - Term average summary bottom strip.
  5. **Examination Schedule Section**:
     - Term selector tabs: `[ Upcoming (count) ]` with emerald green active gradient, alongside specific term pills (`Mid-Term Examination 2026`, `CIA-1`).
     - Schedule cards with colored left accent borders: amber for urgent (≤3 days), gray for expired/completed, and indigo for standard upcoming.
     - Exam title, subject, date with Calendar icon, time slot with Clock icon, room number with MapPin icon, and days left / status pill.
- **Toggle UI Deformation Fix**:
  - **Issue**: The original text `"Examination Schedule"` was 20 characters long. Combined with the 14px calendar icon, 6px gaps, and 20px badge on standard mobile screen widths (~360-390px), the text was forced into two lines (`Examination\nSchedule`). This caused asymmetrical button heights, distorted padding, and a misaligned count badge.
  - **Solution**:
    1. Replaced with concise, balanced labels: `"Results"` and `"Schedule"`.
    2. Added `numberOfLines={1}`, `ellipsizeMode="tail"`, and `flexShrink: 1` to prevent text wrapping on any display size.
    3. Enforced fixed heights: `height: 46` on the track and `height: 38` on both active and inactive buttons.
    4. Centered count badges with `minWidth: 20`, `alignItems: 'center'`, and `justifyContent: 'center'`.
- **Metro 500 Bundling Error**:
  - **Issue**: Stray lines (`color: colors.textMuted, },`) in `StudentResultsScreen.js` around line 899 caused Babel's parser to throw `SyntaxError: Unexpected token (1179:0)` on `StyleSheet.create`, causing Metro to return HTTP 500.
  - **Solution**: Removed the duplicate lines. Metro re-bundled successfully (`HTTP/1.1 200 OK`, `Content-Type: application/javascript`).
### 9. Attendance History Mobile Student Replica (Phase 11)
- **Problem**: Mobile `StudentAttendanceHistoryScreen.js` previously only displayed a generic banner and simple subject list modal, lacking the web app's date range filters, subject filters, circular gauge pill, summary counters, and comprehensive session verification records.
- **Web Reference Analysis (`frontend/src/pages/student/HistoryPage.jsx`)**:
  1. **Header & Title**: CalendarDays icon + "Attendance History" title in brand primary color.
  2. **Filter & Analytics Panel**:
     - Date Range inputs (`FROM DATE`, `TO DATE`) with quick preset buttons (`All Time`, `Today`, `Last 7 Days`, `This Month`) and custom date picker modal.
     - Subject filter dropdown / pill selector (`All Subjects` + dynamic subject list with count badges).
     - Reset CTA (`RotateCcw` icon in red tint) visible whenever filters are active.
     - Circular SVG attendance gauge (green for >=75%, amber for 60-74%, red for <60%) with percentage and uppercase `ATTENDANCE` label.
     - Summary chips: `Total`, `Present`, `Absent`, and `Leave`.
  3. **Active Filter Notice**:
     - Indigo tinted banner detailing active date interval and subject filter.
  4. **Session Verification Log Cards**:
     - Structured card matching web table columns:
       - Date (e.g. `08 Sep 2026`)
       - Status capsule badge (`PRESENT` in green, `ABSENT` in red, `ON LEAVE` in indigo)
       - Subject title (bold)
       - Time slot pill (`10:00 AM - 11:00 AM` in purple tint)
       - Room & Teacher (`Room: C5-05 · Jane Teacher`)
       - Method tag (`Auto-Absent (System)`, `Auto-Leave (System)`, `QR Code Scan`, `Manual Marking`)
- **Verification**:
  - `node -c mobile/src/screens/student/StudentAttendanceHistoryScreen.js`: Exit code 0.
  - Metro compilation verified on `http://127.0.0.1:8081/index.bundle?platform=web...`: HTTP 200 OK.

### 10. Student Leave Application Teacher Parity (Phase 12)
- **Problem**: Mobile `StudentLeaveScreen.js` used a rudimentary flat list with basic inputs, lacking the advanced interactive features, segmented tabs, full interactive month calendar, duration calculation, and design system present in `TeacherApplyLeaveScreen.js`.
- **Teacher Screen Parity Analysis (`TeacherApplyLeaveScreen.js`)**:
  1. **Design System & Segmented Tabs**:
     - Top segmented pills: `[ Send New Request ]` & `[ FileText Leave History ({counts.all}) ]`.
     - Floating `Banner` component providing feedback on submissions, validation, and errors.
     - Header with Info icon opening Institutional Leave Policy guidelines modal.
  2. **Tab 1 (New Request Form)**:
     - Main card container (`mainCard`) with header icons, titles, and subtitles.
     - Leave Type selector: Bottom sheet modal with 5 types (Casual, Sick / Medical, Academic / Exam, On-Duty / Sports, Other Emergency), custom colored icon boxes, descriptions, and checkmarks.
     - Interactive Calendar Widget:
       - Mode switch (`Single Day Leave` vs. `Multi-Day Range`).
       - Quick action chips (`Today`, `Tomorrow`, `Reset`).
       - Step hint helper for multi-day range (`Step 1: Tap Start` / `Step 2: Tap End`).
       - Date input boxes with formatted preview dates.
       - Interactive full Month Calendar matrix with month navigation (`<` Month YYYY `>`), weekday headers, start/end highlighting, and in-between range fill.
       - Real-time duration summary pill (`1 Day Leave (...)` or `X Days Range (...)`) with green checkmark.
     - Reason multiline textarea.
     - Supporting Document upload with dashed upload box (`UploadCloud`), document preview card with file size and remove button.
     - Primary Submit Button with loading spinner and disabled state.
  3. **Tab 2 (History & Status Tracker)**:
     - Status filter chips: `All`, `Pending`, `Approved`, `Rejected`, `Revoked` with live count badges.
     - Leave History Cards:
       - Leave Type title + status badge capsule (with icons and colors).
       - Date range row with Calendar icon.
       - Reason text.
       - Rejection / Revocation explanation callout box with `AlertCircle`.
       - "View Attached Proof Document" button opening `DocumentViewerModal`.
       - Applied timestamp.
     - Empty state with Calendar icon, title, description, and "Create Leave Request" CTA button that switches to Tab 1.
- **Verification**:
  - `node -c mobile/src/screens/student/StudentLeaveScreen.js`: Exit code 0.
  - Metro compilation verified on `http://127.0.0.1:8081/index.bundle?platform=web...`: HTTP 200 OK.

### 11. Dashboard Header Back Button Removal (Phase 13)
- **Problem**: On the Student Dashboard, the header rendered both the navigation drawer hamburger button and an arrow-left back button (`←`).
- **Root Cause**:
  - `Header.js` used `title.toLowerCase().includes('dashboard')` to detect root dashboards.
  - `StudentDashboardScreen.js` passed `title="Student Portal"`, so `isDashboard` evaluated to `false` and triggered the back button fallback.
- **Solution**:
  1. Updated `Header.js` to detect `'portal'` and the active route name `'Dashboard'`.
  2. Passed `showBack={false}` explicitly to `<Header>` in `StudentDashboardScreen.js`.
  3. The header now correctly displays the user avatar ring and drawer menu button without the redundant back arrow.
- **Verification**:
  - `node -c mobile/src/screens/student/StudentDashboardScreen.js`: Exit code 0.
  - `node -c mobile/src/components/Header.js`: Exit code 0.
  - Metro bundle verified on `http://127.0.0.1:8081`: HTTP 200 OK.

### 12. Replicate Parent Handle Features & Design Language from Web to Mobile (Phase 14)
- **Problem**: The mobile parent handle screens (`mobile/src/screens/parent/*`) differed significantly from the web parent portal (`frontend/src/pages/parent/*`), lacking multi-child switching, student profile hero cards with circular initial gradient avatars, today's status badges, fee due warning banners, 4-KPI analytics cards, subject progress bars, exam schedule countdown cards, TXT receipt generators, and dual-mode leave management.
- **Web Reference Analysis & Screen Replications**:
  1. **Reusable Child Switcher Component (`mobile/src/components/ChildSwitcher.js`)**:
     - Single-child: Compact card with gradient avatar, name, and class/section badge.
     - Multi-child: Active child card with a `"Switch ▾"` button that opens an animated modal listing all linked wards with roll numbers, class/section details, and checkmark selection.
  2. **`ParentDashboardScreen.js`**:
     - Student Profile Hero Card: Large 60px gradient avatar circle with initial, student name, class badge (`Class VIII-A`), roll number (`Hash`), section (`GraduationCap`), department (`UserCheck`).
     - Overall Attendance Percentage card (green for >=75%, red for <75%) with "OVERALL ATTENDANCE" uppercase subtitle.
     - Today's Status Banner: `✓ Present Today` (green), `❌ Absent Today` (red), or `📋 Sessions Marked` (indigo).
     - Fee Due Alert: `⚠️ Fee Due: ₹... (Due: ...)` if pending fee exists.
     - 8 Quick Portal Actions: Attendance, Timetable, Assignments, Fees & Receipts, Exam Results, Teacher Messages, Leave Requests, Profile Settings.
     - Multi-child list for quick switching.
  3. **`ParentAttendanceScreen.js`**:
     - 4 Web-matched KPI cards: `ATTENDANCE RATE`, `SESSIONS ATTENDED`, `ABSENT DAYS`, `APPROVED LEAVES`.
     - 3-Tab Segmented View: `By Subject` (progress bars, present/total lectures), `Recent Records` (status capsules with icons), `Monthly` (monthly breakdown trends).
     - CSV Report Download via `exportCsv`.
  4. **`ParentTimetableScreen.js`**:
     - Integrated `ChildSwitcher`.
     - Header: "Weekly Class Timetable", student & class subtitle, Download CTA.
     - Metrics strip (Total Sessions, Subjects, Active Days).
     - Weekly Matrix Grid vs Day Schedule toggle.
     - Period cards with subject, time slot, room, teacher.
  5. **`ParentAssignmentsScreen.js`**:
     - Filter tabs: `All`, `Pending`, `Completed`, `Graded`.
     - Assignment cards: Subject & teacher tag in brand color, status capsule, title, description, due date with Calendar icon, teacher feedback box with grade badge, attachment resource link.
  6. **`ParentResultsScreen.js`**:
     - 4 Summary Metric Cards: `OVERALL AVERAGE`, `EXAMS TAKEN`, `TERMS COVERED`, `STATUS` (PASS/REVIEW).
     - Segmented Toggle: `[ 📊 Published Results (count) ]` vs `[ 📅 Exam Schedule (count) ]`.
     - Published Results: Term filter pills, term average strip (`TrendingUp`), subject result cards with percentage progress bar, grade pill (`A+`, `A`, etc.), remarks.
     - Examination Schedule: Upcoming / All filter, exam cards with time, room, urgency badge.
     - Report Card text document export via `exportText`.
  7. **`ParentFeesScreen.js`**:
     - 3 Overview Cards: `TOTAL ACADEMIC FEE`, `AMOUNT PAID`, `PENDING AMOUNT` (due date warning or "No Dues Remaining").
     - Fee payment progress bar (% paid vs pending).
     - Payment History list with receipt number, payment date, method, amount paid, and instant `Receipt TXT` download.
  8. **`ParentLeaveScreen.js`**:
     - Dual segmented tabs: `[ 📋 Leave Records (count) ]` and `[ ➕ Apply for Child ]`.
     - Tab 1: Status filter chips, leave cards with status stripe, leave type, status badge, date range, student reason, rejection callout, and interactive Approve/Reject buttons with remarks modal calling `PUT /parent/student-leaves/:id/action`.
     - Tab 2: Single Day vs Multi-Day Range mode switcher, interactive calendar month matrix picker, category selector, reason input, supporting document upload, submit button calling `POST /parent/apply-leave`.
  9. **`ParentMessagesScreen.js`**:
     - Teacher selector carousel cards: teacher avatar, name, subjects taught, unread badge.
     - Active conversation thread: Header with teacher name & subjects, styled chat speech bubbles (teacher on left, parent on right in brand gradient, timestamps).
     - Message input bar with multiline input and Send button.
  10. **`ParentProfileScreen.js`**:
      - Guardian Profile Hero Card with avatar, name, relationship pill.
      - Linked Wards Dossier Section displaying all linked children with class, roll number, and attendance rate.
      - Guardian Information form: Full Name, Email (read-only), Phone, Emergency Contact, Address, Relationship with Save button.
      - Change Security Password form: Current Password, New Password, Confirm Password with Update button.
      - Logout button.
- **Verification**:
  - Syntax check with `node -c` on all 10 files: Exit code 0.
  - Metro Bundler compilation via Expo Export: Android Bundled 2,889 modules successfully with Exit code 0.
### 13. Per-Child Chat Isolation Across Web & Mobile (Phase 15)
- **Problem**: When parents switched between children in the portal (e.g., from "John" to "Jane Doe"), messages sent regarding one child still appeared in the chat for the other child. Specifically, messages like "Your child john is very irritting me" from teacher "Jane Teacher" continued to be shown when "Jane Doe" was selected in the child switcher.
- **Root Cause Analysis**:
  1. **Database Schema & Data**: `parent_messages` table had a `student_id INTEGER` column, but older messages had `student_id IS NULL`, causing them to match queries without strict filtering.
  2. **Backend Controller (`backend/controllers/parentController.js`)**:
     - `getParentMessages` accepted `req.query.studentId`, but the SQL query was `WHERE m.sender_id = $1 OR m.receiver_id = $1`, completely ignoring `studentId` and returning messages across all children.
     - `sendParentMessage` did not ensure a default `student_id` if missing.
     - `markMessagesRead` marked all messages from a teacher read without scoping to `student_id`.
  3. **Teacher Reply Controller (`backend/controllers/teacherController.js`)**:
     - `replyParentMessage` did not infer `student_id` if omitted by the teacher, leading to replies without a child association.
  4. **Web App Frontend (`frontend/src/pages/parent/ParentMessages.jsx`)**:
     - `filteredMessages` filtered solely by `selectedTeacherId`, not checking `m.student_id === selectedChildId`.
     - Teacher card unread badge counts did not filter by `selectedChildId`.
  5. **Mobile App Frontend (`mobile/src/screens/parent/ParentMessagesScreen.js`)**:
     - `currentChat` filtered solely by `selectedTeacherId` instead of both `selectedTeacherId` and `selectedChildId`.
     - Teacher unread badge counts were not filtered by child.
  6. **Teacher Portal Inboxes (`TeacherMessages.jsx` & `TeacherMessagesScreen.js`)**:
     - Grouped conversations solely by `parentId`, merging inquiries about multiple siblings into a single conversation card.
- **Implemented Fixes**:
  1. **Database Migration (`backend/config/db.js`)**:
     - Automatically backfilled legacy messages missing `student_id` to student 3 (John) during schema initialization.
  2. **Backend Enhancements**:
     - `getParentMessages`: Resolves `activeStudentId` (from query or first linked child) and strictly filters with `AND m.student_id = $2`.
     - `sendParentMessage`: Resolves and sets `student_id` on all inserted messages.
     - `markMessagesRead`: Scopes mark-as-read updates by `student_id` when provided.
     - `teacherController.replyParentMessage`: Automatically looks up the `student_id` from the recent message between teacher and parent when replying, ensuring replies stay in the right child's thread.
  3. **Web Parent Portal (`ParentMessages.jsx`)**:
     - Filtered `filteredMessages` by `selectedTeacherId` AND `matchesChild` (`m.student_id === selectedChildId`).
     - Filtered unread badge counts on teacher buttons by `selectedChildId`.
     - Auto-selects the child's teacher when switching children.
     - Added an active child indicator badge pill in the chat header (`Child Conversation`).
  4. **Mobile Parent Screen (`ParentMessagesScreen.js`)**:
     - Filtered `currentChat` by `selectedTeacherId` AND `matchesChild` (`m.student_id === selectedChildId`).
     - Filtered unread badges on teacher carousel chips by `selectedChildId`.
     - Included `studentId` when sending messages and marking messages as read.
     - Added child thread pill in the chat header (`<ChildName> Thread`).
  5. **Teacher Inboxes (Web & Mobile)**:
     - Grouped parent inquiries by `${parentId}_${student_id || 'all'}` so teachers see separate, clearly labeled conversation cards for each child.
- **Verification**:
  - `node -c mobile/src/screens/parent/ParentMessagesScreen.js`: Exit code 0.
  - `node -c mobile/src/screens/teacher/TeacherMessagesScreen.js`: Exit code 0.
  - Metro Expo Export Bundling: Android Bundled 2,889 modules successfully with Exit code 0.




