# Task Plan: Student Dashboard Web Replica & Complete Streak Removal

## Goal
1. Implement a pixel-perfect, mobile-adapted replica of the Website's Student Overview page on `StudentDashboardScreen.js` matching the provided screenshot (Attendance Stats with Total Sessions & 3-metric breakdown, Attendance Performance circular ring with tier color and dynamic smart insights, and Today's Schedule with Today/Tomorrow switcher and period cards).
2. Completely remove the "streak" concept from the entire project (Mobile, Backend, and Documentation) as the website does not use streaks.

---

## Phases

### Phase 1: Streak Concept Eradication Across Project
- [x] Mobile: Remove streaks from `StudentDashboardScreen.js`
- [x] Mobile: Remove streaks from `StudentAttendanceHistoryScreen.js` (banner, state, API call)
- [x] Mobile: Remove streaks from `UserManageScreen.js` (student dossier modal)
- [x] Mobile: Remove streaks from `ClassRosterScreen.js` (student list KPI)
- [x] Backend: Remove streaks from `studentController.js` (`getStudentOverview`, `getLeaderboard`)
- [x] Backend: Remove streaks from `attendanceController.js` (streak increments/resets)
- [x] Backend: Remove streak reset from `attendanceScheduler.js`
- [x] Docs: Update `README.md`, `WEBSITE_FEATURES.md`, `DESIGN.md`

### Phase 2: Student Dashboard Web Replica Implementation
- [x] Implement Web-replica Header ("Student Portal", "Student Overview")
- [x] Implement "Attendance Stats" card:
  - [x] Top large card: BookOpen icon, Total Sessions count (`#6366f1`), "TOTAL SESSIONS" label
  - [x] Bottom 3 metric cards:
    - [x] Present: CheckCircle2 icon, green count (`#16a34a`), "PRESENT"
    - [x] Absent: AlertTriangle icon, red count (`#dc2626`), "ABSENT"
    - [x] Leave: Clock icon, amber count (`#f59e0b`), "LEAVE"
- [x] Implement "Attendance Performance" card:
  - [x] Dynamic tier determination (>=90% Excellent `#16a34a`, >=75% Good `#f59e0b`, <75% Warning `#ef4444`)
  - [x] Circular SVG Progress Ring with `{percentage}% OVERALL` in center
  - [x] Rounded status badge pill ("Excellent" / "Good" / "Warning")
  - [x] "PERFORMANCE INSIGHTS" sub-card with header strip, glowing tier dot, and 2 dynamic insight items (e.g. "Need X more classes to reach 75%", "Attendance below safe threshold", etc.)
- [x] Implement "Today's Schedule (Day, Date)" section:
  - [x] Header with Calendar icon and formatted day/date
  - [x] Toggle pill buttons: `[ Today ]` / `[ Tomorrow ]`
  - [x] Period cards with status badge ("Live Now" in green, "Completed" in gray, "Upcoming" in indigo), subject title, time & room, faculty name
  - [x] Interactive press on class card opens `StudentSubjectDetailModal`
- [x] Keep quick navigation shortcuts grid for mobile usability

### Phase 3: Verification & Walkthrough
- [x] Validate JSX syntax across all modified files (`node -c`)
- [x] Test mobile app in Expo Metro bundler
- [x] Update `walkthrough.md` and `findings.md`
- [x] Present final results to the user

### Phase 4: Side-by-Side Analytics Cards & Instant Schedule Access
- [x] Group "Attendance Stats" and "Attendance Performance" into a side-by-side row (`topOverviewRow` with `flexDirection: 'row'`, `gap: spacing.sm`)
- [x] Adapt "Attendance Stats" card for `flex: 1` width:
  - [x] Compact header with Activity icon
  - [x] Compact Total Sessions box with BookOpen circle, big count, and label
  - [x] 3 sleek metric rows (Present with green check, Absent with red alert, Leave with amber clock)
- [x] Adapt "Attendance Performance" card for `flex: 1` width:
  - [x] Compact header ("Performance" with Target icon)
  - [x] Scaled 84px SVG gauge with `{percentage}% OVERALL`
  - [x] Status badge pill ("Excellent" / "Good" / "Warning")
  - [x] Compact Insight sub-card with icon and actionable target text
- [x] Verify vertical height reduction (~600px -> ~230px) so "Today's Schedule" is prominently accessible above the fold
### Phase 5: Teacher Timetable Features & Design Language to Student Timetable (Mobile App Only)
- [x] Audit `TeacherTimetableScreen.js` for all interactive features, components, and design tokens
- [x] Implement in `StudentTimetableScreen.js`:
  - [x] High-resolution PNG image export (`exportTimetableAsImage`) with loading state and header action
  - [x] Metrics summary bar (Total Lectures, Enrolled Courses, Active Days)
  - [x] Segmented view mode toggle ([ Weekly Matrix ] [ Day Schedule ])
  - [x] Weekly Matrix Grid:
    - [x] `gridOuterCard` with Calendar header, horizontal scroll hint, and matrix table
    - [x] Time column with start/end times and clock icon
    - [x] Period slot cards with colored left borders, live tags, subject names, room, and teacher attribution
    - [x] Slot press opens `StudentSubjectDetailModal`
  - [x] Day Schedule View:
    - [x] Day selector pills with short names, lecture counts, and active/today indicators
    - [x] Selected day header with lecture count and "TODAY" pill
    - [x] Period cards with time column, live badge, subject, teacher, room, and "Details" action button
    - [x] Card/button press opens `StudentSubjectDetailModal`
    - [x] `emptyDayBox` with clock icon and preparation/free time message
  - [x] Unscheduled / Self-Paced Subjects section:
    - [x] Card grid for individually enrolled subjects without fixed slot allocations
  - [x] Theme alignment: Apply `colors.student` (`#6366f1`) as the primary role color while preserving the teacher layout & design system
  - [x] Harmonize card colors: Set card left accent border to `colors.primary` (`#6366f1`) and details button to `colors.primary`, identically matching `TeacherTimetableScreen.js`
- [x] Verify JSX syntax with `node -c`
- [x] Update documentation (`findings.md`, `progress.md`, `walkthrough.md`)
- [x] Present changes to user (NO git actions)

### Phase 7: Assignment Filters & Status Normalization
- [x] Root Cause Investigation:
  - Backend and database store student homework submissions with `status = 'completed'`
  - Mobile `StudentAssignmentsScreen.js` strictly filters by `a.status === 'submitted'`, returning 0 matches for "Submitted"
  - `STATUS_COLORS` missing `'completed'`, resulting in uncolored fallback
  - Overdue check flags completed homework as overdue if due date has passed
  - `ParentAssignmentsScreen.js` has identical filter mismatch on `'Submitted'`
- [x] Mobile Fixes:
  - Update `StudentAssignmentsScreen.js`:
    - Define robust helpers `isGraded`, `isSubmitted`, `isPending`
    - Make `'submitted'` filter match both `'submitted'` and `'completed'` submissions
    - Make `'graded'` filter match both `status === 'graded'` and submissions with `grade`
    - Make `'pending'` filter match unsubmitted assignments
    - Map display status and badge colors accurately (`submitted`, `completed`, `graded`, `pending`, `overdue`)
    - Ensure completed/submitted assignments are never marked overdue
    - Update `STATUS_COLORS` with `completed: colors.primary`
  - Update `ParentAssignmentsScreen.js`:
    - Apply same status normalization and filter matching for parents
- [x] Backend & Web Synchronization:
  - Update `backend/controllers/studentController.js` (`getMyAssignments`, `submitAssignment`, `getSubjectDetails`):
    - Dual-support status normalization (project `'submitted'` for completed submissions while preserving graded/pending)
  - Update `backend/controllers/parentController.js` (`getStudentAssignments`):
    - Ensure status is normalized
  - Update `frontend/src/pages/student/StudentAssignments.jsx`:
    - Support both `'completed'` and `'submitted'` seamlessly
- [x] Verification & Testing:
  - Run syntax check on all modified files
  - Verify filters in mobile app
- [x] Update `findings.md`, `progress.md`, `walkthrough.md`

### Phase 8: Quiz Arena Mobile Student Replica
- [x] Audit & Architecture:
  - Match all features and visual components from web screenshot:
    - Hero Quiz Arena Card (Brain gradient icon, title, subtitle, 4 metric cards: Available, Attempts, Passed, Certificates)
    - 4 Tabs: Practice Quizzes (with badge), University Quizzes (with badge), My Results, Certificates
    - Search quizzes bar with clear button
    - Quiz Cards:
      - Top-right gradient type badge (PRACTICE in sky blue gradient, UNIVERSITY in indigo gradient)
      - Top-left status pill (Passed in green, Incomplete in amber)
      - Difficulty pill (MIXED / EASY / MEDIUM / HARD)
      - 42x42 gradient rounded icon box with Brain / Trophy
      - Title & optional description
      - Subject tag (BookOpen icon + subject name)
      - Stats (Question count, duration, attempts/maxAttempts)
      - Best score progress bar (score percentage + colored progress bar)
      - Action CTA (Start Quiz / Retry Quiz in gradient, or Attempts Exhausted in disabled state)
    - My Results view (colored left accent border, percentage, duration, score, date, status)
    - Certificates view (Golden award card, quiz title, student name, score, issue date, download button)
- [x] Mobile Implementation:
  - Update `mobile/src/screens/quiz/QuizHubScreen.js` with full pixel-perfect layout and styling
  - Update `mobile/src/screens/student/StudentDashboardScreen.js` quick action icon to `Brain`
- [x] Backend & Verification:
  - Verify `getQuizzes` endpoint returns difficulty and attempt counts
  - Syntax check on modified files (`node -c`)
  - Update `findings.md`, `progress.md`, `walkthrough.md`

### Phase 9: My Subjects Mobile Student Replica
- [x] Audit & Requirements:
  - Header: Section title "My Subjects" & subtitle "All subjects assigned to your class. Click a subject for detailed info."
  - Search bar: Quick subject and faculty filtering
  - Subject Cards (pixel-perfect replica of web screenshot):
    - Top border: 4px solid `#6366f1` (or `#10b981` if individual)
    - Top-right badge: `Class Subject` in purple/indigo tint or `Individual` in green
    - Top-left icon: 40x40 rounded box with `BookOpen` icon in `#6366f1`
    - Subject title: Bold white text (e.g. `Python`, `BEEE`, `CN`, `M-1`)
    - Schedule badge: `Calendar` icon + `X Weekly Slots (Days)` in `#818cf8`
    - "TAUGHT BY" box: Recessed container with `User` icon, "TAUGHT BY" uppercase label, and teacher's name
    - "SUBJECT ATTENDANCE" box:
      - Header: "SUBJECT ATTENDANCE" label & percentage (e.g. `19%`, `20%`, `33%`) colored green (>=75%) or red (<75%)
      - 6px horizontal progress bar with green/red fill
      - Stats row: `Present: X`, `Absent: Y`, `Total: Z` with color accents
    - Card footer: Centered `View Details >` with `ChevronRight`
    - Card tap: Opens 4-tab `StudentSubjectDetailModal` (Overview, Exams & Marks, Upcoming, Assignments)
- [x] Mobile Implementation:
  - Update `mobile/src/screens/student/StudentSubjectsScreen.js`
  - Update `mobile/src/components/AppNavigationDrawer.js` student navigation item to `'My Subjects'`
- [x] Verification:
  - Verify syntax with `node -c`
  - Update `findings.md`, `progress.md`, `walkthrough.md`

### Phase 10: Exam Results & Performance Mobile Student Replica
- [x] Requirements & Architecture:
  - Header: Award icon, "Exam Results & Performance" title, "CIA-wise & term-wise breakdown of your academic performance." subtitle, and "Download Report Card" CTA button with Printer/Download icon.
  - 4 Metric Summary Cards:
    - `OVERALL AVERAGE`: e.g. `88%` in `#6366f1` / `#818cf8`
    - `EXAMS TAKEN`: e.g. `2` in `#10b981`
    - `TERMS COVERED`: e.g. `1` in `#f59e0b`
    - `STATUS`: e.g. `PASS` in `#10b981` (or `REVIEW` in `#ef4444`)
  - Results & Schedule Segmented Toggle:
    - Pill switcher between `[ 📊 Published Results (count) ]` and `[ 📅 Examination Schedule (count) ]`
    - Active pill in vibrant purple gradient with white text & badge
  - Published Results Section:
    - Term filter pills (e.g. `[ Mid-Term Examination 2026 (2) ]`) with active purple gradient & count badge
    - Term summary row with TrendingUp icon and `Term Average: 88% across 2 subjects`
    - Subject result cards/rows:
      - Subject name, code badge (`—`), marks (`85.00 / 100`), progress bar + percentage (`85%`), grade badge (`A`, `A+`), exam date, and italic remarks (`Good conceptual clarity`)
      - Term average bottom strip (`Term Average: 88%`)
  - Examination Schedule Section:
    - Schedule filter pills: `[ Upcoming (count) ]`, term pills (`Mid-Term Examination 2026`, `CIA-1`)
    - Schedule cards with colored left border (urgent/soon in amber, expired in gray, standard in indigo)
    - Exam name, subject, date with Calendar icon, time slot with Clock icon, room number with MapPin icon, and days left / completed status pill
- [x] Mobile Implementation:
  - Update `mobile/src/screens/student/StudentResultsScreen.js`
  - Update `mobile/src/components/AppNavigationDrawer.js` student drawer item to `'Exam Results'`
- [x] Verification:
  - Verify syntax with `node -c`
  - Update `findings.md`, `progress.md`, `walkthrough.md`

### Phase 11: Attendance History Mobile Student Replica
- [x] Requirements & Architecture:
  - Header: Drawer navigation hamburger + back arrow, title "Attendance History", subtitle with overall rate.
  - Section Header: CalendarDays icon + "Attendance History" title in brand primary color.
  - Filter & Stats Card:
    - Funnel icon + date range filter inputs (`FROM DATE` & `TO DATE`) with quick preset buttons (`All Time`, `Today`, `Last 7 Days`, `This Month`) and custom date picker modal.
    - Subject filter dropdown / pill selector (`All Subjects` + dynamic subject list).
    - Reset filter button (`RotateCcw` icon) displayed whenever active filters are applied.
    - Mini circular SVG attendance gauge with dynamic color (>=75% green, 60-74% amber, <60% red) and percentage label.
    - Summary chips: `Total`, `Present`, `Absent`, and `Leave`.
  - Active Filter Notice:
    - Dynamic banner showing record count and date interval.
  - Attendance Record List:
    - Responsive card layout mirroring web table:
      - Date: `08 Sep 2026`
      - Subject: `Python`, `BEEE`, etc. (bold)
      - Session & Time Slot: Time badge (`10:00 AM - 11:00 AM`), Room & Teacher (`Room: C5-05 · Jane Teacher`)
      - Status Capsule: `PRESENT` (green), `ABSENT` (red), `ON LEAVE` (indigo)
      - Method Tag: `Auto-Absent (System)`, `QR Code Scan`, `Manual Marking`, etc.
    - Empty state when no records match filter.
    - Pull-to-refresh (`RefreshControl`).
- [x] Verification:
  - Verify syntax with `node -c`
  - Test Metro bundling output on port 8081
  - Update `findings.md`, `progress.md`, `walkthrough.md`

### Phase 12: Student Leave Application Teacher Parity (Mobile App Only)
- [x] Requirements & Architecture:
  - Design & Visual Language parity with `TeacherApplyLeaveScreen.js`:
    - Top segmented screen tabs: `[ Send New Request ]` & `[ FileText Leave History ({counts.all}) ]`
    - Dynamic status feedback banner (`Banner`) for submission status and errors.
    - Card container (`mainCard`) with header icons, titles, and subtitles.
  - New Leave Request Form (Tab 1):
    - Leave Type Selector: Modal bottom sheet with metadata (Casual, Sick / Medical, Academic / Earned, On-Duty / Official, Other) with colored icon boxes and descriptions.
    - Interactive Calendar & Date Selection:
      - Mode switch: `Single Day Leave` vs. `Multi-Day Range`.
      - Quick chips: `Today`, `Tomorrow`, `Reset`.
      - Range step helper hint (`Step 1: Tap Start` / `Step 2: Tap End`).
      - Date input boxes with formatted display values.
      - Full interactive Month Calendar matrix with month navigation (`<` Month YYYY `>`), weekday headers, start/end highlighting, and in-between range fill.
      - Duration Summary Pill (`X Days Leave (Dates)`) with green checkmark.
    - Reason textarea with multiline support and clean typography.
    - Supporting Document Upload: Dashed upload box (`UploadCloud`), document preview card with file size and remove button.
    - Primary Submit Button with loading spinner.
  - Leave History & Status Tracker (Tab 2):
    - Status filter chips: `All`, `Pending`, `Approved`, `Rejected`, `Revoked` with live count badges.
    - History cards: Leave type, status badge capsule (with icons and colors), date range with Calendar icon, reason text, rejection/revocation callout box, and "View Attached Document" button.
    - Empty state with "Create Leave Request" CTA that jumps to Tab 1.
  - Modals:
    - Institutional Leave Guidelines modal with Policy points.
    - Universal `DocumentViewerModal` for viewing attached proof files.
- [x] Mobile Implementation:
  - Update `mobile/src/screens/student/StudentLeaveScreen.js`
- [x] Verification:
  - Verify syntax with `node -c`
  - Verify Metro bundling output on port 8081
  - Update `findings.md`, `progress.md`, `walkthrough.md`

### Phase 14: Replicate Parent Handle Features & Design Language from Web to Mobile
- [x] Requirements & Architecture:
  - Created reusable `ChildSwitcher.js` component for mobile supporting single-child display and multi-child bottom-sheet switcher.
  - Screen 1: `ParentDashboardScreen.js` (Child switcher, student profile hero card, circular initial gradient avatar, attendance rate badge, today's status banner, fee due alert, 8 quick portal action cards).
  - Screen 2: `ParentAttendanceScreen.js` (Child switcher, 4 KPI cards, subject-wise breakdown with progress bars, recent session records with status capsules, CSV export).
  - Screen 3: `ParentTimetableScreen.js` (Child switcher, day selector tabs, day schedule & full week grid modes, period cards with teacher & room, timetable export).
  - Screen 4: `ParentAssignmentsScreen.js` (Child switcher, status filter tabs, assignment cards with teacher feedback callouts and attachments).
  - Screen 5: `ParentResultsScreen.js` (Child switcher, 4 metric cards, published results vs schedule toggle, term pills, subject scores with progress bars and grades, report card export).
  - Screen 6: `ParentFeesScreen.js` (Child switcher, 3 overview cards, fee progress bar, payment history table, TXT receipt download).
  - Screen 7: `ParentLeaveScreen.js` (Child switcher, dual tabs: review/approval with remarks modal & interactive calendar leave submission form).
  - Screen 8: `ParentMessagesScreen.js` (Child switcher, teacher carousel cards with unread badges, full chat conversation thread, message composer).
  - Screen 9: `ParentProfileScreen.js` (Parent profile hero card, linked wards dossier, guardian information form, password update form).
- [x] Implementation:
  - Created `mobile/src/components/ChildSwitcher.js`
  - Replicated all 9 screens in `mobile/src/screens/parent/`
- [x] Verification:
  - Syntax check with `node -c` on all 10 files: Exit code 0
  - Metro compilation verified: Android Bundled (2,889 modules): Exit code 0
  - Updated `findings.md`, `progress.md`, `walkthrough.md`

### Phase 15: Per-Child Chat Isolation (Web & Mobile Parent Communication)
- [x] Backend: Update `parentController.js` to strictly filter messages by `studentId` and record `studentId` on all messages
- [x] Backend: Update `parentController.js` `markMessagesRead` to accept `studentId` and only mark read for that child
- [x] Backend: Update `teacherController.js` `replyParentMessage` to automatically retain and propagate `student_id`
- [x] Backend: Ensure database legacy messages without `student_id` default to student 3 (John) in `db.js`
- [x] Frontend Web: Update `ParentMessages.jsx`:
  - [x] Filter messages by `selectedTeacherId` AND `selectedChildId`
  - [x] Filter unread teacher badge counts by `selectedChildId`
  - [x] When switching child, refresh conversation and select child's teacher
  - [x] Display child indicator badge in chat header
- [x] Mobile App: Update `ParentMessagesScreen.js`:
  - [x] Filter messages by `selectedTeacherId` AND `selectedChildId`
  - [x] Filter unread teacher badge counts by `selectedChildId`
  - [x] Pass `studentId` on read marks and message sending
  - [x] Display child indicator badge in chat header
- [x] Teacher Web & Mobile: Group conversations by parent and child so teachers see separated threads per student
- [x] Verification:
  - [x] Validate JSX/JS syntax with `node -c` (Mobile: 0 errors)
  - [x] Test mobile app bundling with Metro (Android Bundled 2,889 modules successfully)
  - [x] Update `findings.md`, `progress.md`, and `walkthrough.md`


