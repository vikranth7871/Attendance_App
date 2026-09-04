# 📱 iAttend — Website Pages & Functionalities Specification
### Comprehensive Feature Guide for Mobile App UI/UX & Architecture Design

> **Purpose:** This document provides an exhaustive breakdown of every page, view, modal, filter, action, and data point across the **iAttend Web Application**. It serves as an exact reference blueprint for designing and implementing features in the **iAttend Mobile App** (`mobile/`).

---

## 📑 Table of Contents

1. [Architecture & Role Matrix](#1-architecture--role-matrix)
2. [Authentication & Global Systems](#2-authentication--global-systems)
3. [🛡️ System Administrator Portal (`/admin/*`)](#3-system-administrator-portal-admin)
   - [3.1 Dashboard Overview (`/admin`)](#31-dashboard-overview-admin)
   - [3.2 User Management (`/admin/users`)](#32-user-management-adminusers)
   - [3.3 Departments & Classes (`/admin/academic`)](#33-departments--classes-adminacademic)
   - [3.4 Subject Management (`/admin/subjects`)](#34-subject-management-adminsubjects)
   - [3.5 External & Certified Quizzes (`/admin/quizzes`)](#35-external--certified-quizzes-adminquizzes)
   - [3.6 Faculty Daily Attendance (`/admin/teacher-attendance`)](#36-faculty-daily-attendance-adminteacher-attendance)
   - [3.7 Faculty Leave Approvals (`/admin/teacher-leaves`)](#37-faculty-leave-approvals-adminteacher-leaves)
   - [3.8 Timetable & Coordinator Allocations (`/admin/assignments`)](#38-timetable--coordinator-allocations-adminassignments)
   - [3.9 Permissions & Access Control (`/admin/permissions`)](#39-permissions--access-control-adminpermissions)
   - [3.10 System Activity Explorer (`/admin/activity`)](#310-system-activity-explorer-adminactivity)
   - [3.11 Admin Profile & Institution Settings (`/admin/profile`)](#311-admin-profile--institution-settings-adminprofile)
4. [👩‍🏫 Educator / Teacher Portal (`/teacher/*`)](#4-educator--teacher-portal-teacher)
   - [4.1 Weekly Timetable & Live Active Session Tracker (`/teacher`)](#41-weekly-timetable--live-active-session-tracker-teacher)
   - [4.2 Comprehensive Class Roster & Student Dossier (`/teacher/roster`)](#42-comprehensive-class-roster--student-dossier-teacherroster)
   - [4.3 Strict Slot-Based Attendance Marking (`/teacher/manual`)](#43-strict-slot-based-attendance-marking-teachermanual)
   - [4.4 Homework & Assignment Management (`/teacher/assignments`)](#44-homework--assignment-management-teacherassignments)
   - [4.5 Examination Scheduling & Spreadsheet Marks Entry (`/teacher/exams`)](#45-examination-scheduling--spreadsheet-marks-entry-teacherexams)
   - [4.6 Parent Direct Messaging Hub (`/teacher/messages`)](#46-parent-direct-messaging-hub-teachermessages)
   - [4.7 Educator Quiz Management (`/teacher/quizzes`)](#47-educator-quiz-management-teacherquizzes)
   - [4.8 Teacher Leave Application (`/teacher/apply-leave`)](#48-teacher-leave-application-teacherapply-leave)
5. [🎓 Student Hub (`/student/*`)](#5-student-hub-student)
   - [5.1 Student Dashboard & Attendance Performance Ring (`/student`)](#51-student-dashboard--attendance-performance-ring-student)
   - [5.2 Attendance History & Log Filtering (`/student/history`)](#52-attendance-history--log-filtering-studenthistory)
   - [5.3 Leave Application & Medical Proof Engine (`/student/leaves`)](#53-leave-application--medical-proof-engine-studentleaves)
   - [5.4 Registered Subjects & Course Drawer (`/student/subjects`)](#54-registered-subjects--course-drawer-studentsubjects)
   - [5.5 Weekly Schedule & Visual Timetable (`/student/timetable`)](#55-weekly-schedule--visual-timetable-studenttimetable)
   - [5.6 Homework Submissions & Feedback (`/student/assignments`)](#56-homework-submissions--feedback-studentassignments)
   - [5.7 Examination Results & Official Transcript Print (`/student/results`)](#57-examination-results--official-transcript-print-studentresults)
6. [🧠 Quiz Arena Engine (`/student/quiz/*`)](#6-quiz-arena-engine-studentquiz)
   - [6.1 Quiz Arena Hub (`/student/quiz`)](#61-quiz-arena-hub-studentquiz)
   - [6.2 Interactive Quiz Attempt Engine (`/student/quiz/attempt/:id`)](#62-interactive-quiz-attempt-engine-studentquizattemptid)
   - [6.3 Results, Review & Certificate Generator (`/student/quiz/results/:id`)](#63-results-review--certificate-generator-studentquizresultsid)
7. [👨‍👩‍👧 Parent Portal (`/parent/*`)](#7-parent-portal-parent)
   - [7.1 Parent Summary Hub & Multi-Child Switcher (`/parent`)](#71-parent-summary-hub--multi-child-switcher-parent)
   - [7.2 Child Attendance Analytics & CSV Export (`/parent/attendance`)](#72-child-attendance-analytics--csv-export-parentattendance)
   - [7.3 Leave Requests & Acknowledgment (`/parent/leaves`)](#73-leave-requests--acknowledgment-parentleaves)
   - [7.4 Child Class Timetable (`/parent/timetable`)](#74-child-class-timetable-parenttimetable)
   - [7.5 Homework & Assignment Tracker (`/parent/assignments`)](#75-homework--assignment-tracker-parentassignments)
   - [7.6 Exam Performance & Report Cards (`/parent/results`)](#76-exam-performance--report-cards-parentresults)
   - [7.7 Tuition Fees & Digital Payment Receipts (`/parent/fees`)](#77-tuition-fees--digital-payment-receipts-parentfees)
   - [7.8 Educator Direct Messaging Channel (`/parent/messages`)](#78-educator-direct-messaging-channel-parentmessages)
   - [7.9 Profile & Guardian Information (`/parent/profile`)](#79-profile--guardian-information-parentprofile)
8. [📲 Cross-Platform UI/UX Translation Guide](#8-cross-platform-uiux-translation-guide)

---

## 1. Architecture & Role Matrix

iAttend is partitioned into four role-gated sub-applications with shared auth and notifications:

| Role | Web Base Route | Mobile Navigator | Key Modules | Primary Color |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | `/admin/*` | `AdminNavigator` | Users, Classes, Subjects, Allocations, Permissions, Audit, Faculty Attendance/Leaves | Indigo (`#6366f1`) |
| **Educator / Teacher** | `/teacher/*` | `TeacherNavigator` | Timetable, Slot Attendance, Roster, Exams, Marks, Assignments, Parent Messages, Quizzes | Emerald (`#10b981`) |
| **Student** | `/student/*` | `StudentNavigator` | Attendance Ring, Streaks, Schedule, Subjects, Homework, Exam Cards, Quiz Arena | Royal Blue (`#3b82f6`) |
| **Parent** | `/parent/*` | `ParentNavigator` | Multi-Child Switcher, Child Attendance, Fees, Digital Receipts, Timetable, Teacher Chat | Amber (`#f59e0b`) |

---

## 2. Authentication & Global Systems

### 2.1 Login Page (`/login`)
- **Visual Presentation:** Dual-pane layout on web (classroom illustration left, floating glassmorphic card right with shield badge icon).
- **Core Functionalities:**
  - Email text input with mail icon.
  - Password text input with lock icon and show/hide password toggle (Eye/EyeOff).
  - "Forgot Password" auxiliary anchor.
  - Dynamic submit button with loading state & smooth gradient hover.
  - Inline error alert banner with icon for invalid credentials.
  - Auto-redirect based on authenticated JWT role (`admin` → `/admin`, `teacher` → `/teacher`, `student` → `/student`, `parent` → `/parent`).
- **Mobile Translation:** Single-screen `KeyboardAvoidingView` with brand logo gradient circle, demo account 1-tap quick-fill pills (`Admin`, `Teacher`, `Student`, `Parent`), and biometric/secure input.

### 2.2 Global Search (`GlobalSearch.jsx` / `GlobalSearchModal.js`)
- Accessible in header via search trigger button (enabled for Admins and Teachers).
- Live keyword search across students, teachers, subjects, and classes.
- Categorized result tiles with direct navigation to profile or management view.

### 2.3 Notification Center (`NotificationDropdown.jsx` / `NotificationCenterModal.js`)
- Top-right bell icon with red unread count badge (polls every 30s).
- Dropdown/Modal showing chronological alerts (attendance marked, homework assigned, exam published, message received).
- Click-to-read triggers status update (`is_read: true`).
- "Mark All as Read" action.

---

## 3. 🛡️ System Administrator Portal (`/admin/*`)

### 3.1 Dashboard Overview (`/admin`)
- **Key Performance Indicators (Top StatCards):**
  - *Total Students* (links to `/admin/users` filtered to students)
  - *Faculty Members* (links to `/admin/users` filtered to teachers)
  - *Active Classes* (links to `/admin/academic`)
  - *Total Subjects* (links to `/admin/subjects`)
- **Today's Attendance Snapshot:**
  - Dual-tab toggle: `[Students]` vs `[Teachers]`.
  - Animated 3-segment SVG Donut Chart: Present (Green), Absent (Red), On Leave (Amber), with central turnout percentage.
  - 3 status metric cards showing exact counts and percentages.
- **Teacher Performance & Activity Leaderboard:**
  - `#1 Rank Hero Card`: Teacher initial avatar, full name, department badge, email, marking count, and animated gradient progress bar.
  - Ranks 2–5 mini cards: Grid of top faculty contributors with attendance marking tallies.
- **Recent System Audit Logs:**
  - Action-icon mapped log items (user registration, attendance lock, class creation, leave status change).
  - "View All Logs" action opening the full log viewer modal with category filters (`All`, `Auth`, `Attendance`, `Admin`).

### 3.2 User Management (`/admin/users`)
- **Tabbed Directory Navigation:**
  - `[Students]`, `[Teachers]`, `[Parents]`, `[Manual Entry]`, `[Bulk Upload]`.
- **Student Directory Tab:**
  - Department filter dropdown & dependent Class filter dropdown.
  - Table showing: Name, Email, Department, Class, Roll No, Actions.
  - Actions: *View Profile Dossier* (modal with academic summary), *Edit User*, *Delete User*.
- **Teacher Directory Tab:**
  - Department filter dropdown.
  - Table showing: Name, Email, Department, Designation, Actions.
  - Status indicators for coordinator assignments.
- **Parent Directory Tab:**
  - Table showing: Parent Name, Email, Linked Student Names & Classes, Actions.
- **Manual Entry Tab (Form):**
  - Role selector (Student / Teacher / Parent).
  - Dynamic fields: Name, Email, Password, Department, Class, Roll Number, Parent Link Email.
  - Validation and instant creation.
- **Bulk Upload Tab (CSV Engine):**
  - Template role picker (`Student`, `Teacher`, `Parent`).
  - 1-Click "Download Sample CSV Template" button.
  - Drag-and-drop CSV file uploader.
  - Instant client-side CSV parsing table preview with error checking per row.
  - Progress bar during bulk upload with detailed result summary (Success count vs Skipped/Failed rows).

### 3.3 Departments & Classes (`/admin/academic`)
- **Department Management Panel:**
  - Create Department input and submission button.
  - Active Departments list with associated class counts.
  - Delete Department with cascade-warning confirmation.
- **Class Management Panel:**
  - Create Class form: Class Name (e.g., `CS101-A`), Department dropdown selector, Academic Year input.
  - Class Directory grid showing Class Name, Parent Department, Academic Year.
  - Edit Class Modal (name, department, year).
  - Delete Class action.

### 3.4 Subject Management (`/admin/subjects`)
- **Department Drill-Down & Search:**
  - Filter subjects by Department or click "View All".
  - Keyword search input for subject title/code.
- **Subject Cards List:**
  - Subject Name & Subject ID badge.
  - Assigned Departments tag cloud.
  - Handling Teachers count and list.
- **Create / Edit Subject Modal:**
  - Subject Name input.
  - Multi-select department checkboxes with "Select All" toggle.
  - Save / Update across all selected academic departments.
- **Delete Subject Action:** Cascade protection if allocations exist.

### 3.5 External & Certified Quizzes (`/admin/quizzes`)
- Dual Tabs: `[Practice Quizzes]` vs `[University / Certified Quizzes]`.
- **Create Quiz Button:** Opens manual form modal (`QuizFormModal`) with title, description, subject, passing score (e.g. 80%), time limit, max attempts, question creator.
- **"Generate with AI" Button:** Opens `AIQuizGeneratorModal` (Topic, Syllabus text, Difficulty, Question Count, Tags, Image reference).
- **Quiz Card Grid:**
  - Status toggle (Active / Disabled).
  - Key metrics: Time Limit, Passing %, Questions count, Attempts allowed.
  - *View Submissions & Results* action (opens `QuizResultsModal` with student scores).
  - *Edit Quiz* & *Delete Quiz* actions.

### 3.6 Faculty Daily Attendance (`/admin/teacher-attendance`)
- **Date Selector:** Calendar view restricted to current day.
- **Auto-Save Toggle:** Global switch to enable/disable automated saving.
- **Faculty Attendance Grid / Table:**
  - Teacher Name, Email, Department.
  - 4 Quick Status buttons: *Present* (Green), *Absent* (Red), *Half-Day* (Amber), *On Leave* (locked if approved leave exists).
  - Individual Remarks input field per teacher.
  - Save Changes button with feedback toast.
- **Export Modal:** Date range selector (Start Date, End Date) with 1-click Export to Excel / CSV (`.xlsx`/`.csv`).

### 3.7 Faculty Leave Approvals (`/admin/teacher-leaves`)
- Filter by status tabs: `[All]`, `[Pending]`, `[Approved]`, `[Rejected]`.
- Search by Teacher Name, Department, or Reason.
- **Leave Request Cards / Table:**
  - Teacher Profile, Leave Type, Duration (Start Date to End Date, total days).
  - Stated Reason & Medical/Document preview button (`DocumentModal`).
  - Actions:
    - *Approve Leave* (instantly marks teacher as "On Leave" in attendance).
    - *Reject Leave* (opens modal requiring a mandatory rejection reason).
    - *Revoke Leave* (for already approved leaves with revocation reason).

### 3.8 Timetable & Coordinator Allocations (`/admin/assignments`)
- **Tab 1: Subject & Timetable Allocation:**
  - Dropdown selectors: Department, Class, Subject, Faculty Member.
  - Room Number text input.
  - **Interactive Timetable Matrix:**
    - Days: Monday – Saturday; Time slots: 9 AM – 4 PM.
    - Automatic conflict detection: Highlights slots already booked by either the Class or the Faculty.
    - Multi-slot selection support.
    - Save Allocation action.
- **Tab 2: Class Coordinator Allocation:**
  - Select Department, Class, and Teacher.
  - "Assign Coordinator" button.
  - Active Coordinators directory table with filtering and removal actions.

### 3.9 Permissions & Access Control (`/admin/permissions`)
- **Individual User Tab:**
  - Search any user by name or email.
  - Granular permissions checklist:
    - *General:* `markAttendance`, `manualAttendance`, `viewAttendance`, `exportAttendance`, `applyLeave`, `viewReports`.
    - *Security:* `editAttendance`, `deleteAttendance`, `bypassTimeRestraint`.
    - *Management:* `manageStudents`, `manageSystem`.
  - Save user overrides.
- **Bulk Role Tab:**
  - Department selector + Role picker (`Teacher`, `Student`, `Parent`).
  - Batch enable/disable permission flags with "Select All".

### 3.10 System Activity Explorer (`/admin/activity`)
- Drill-down cascading selectors: Department → Role → Class (for students) → User.
- Detailed Activity Dossier:
  - User header card with role badge.
  - Attendance % gauge, classes attended vs missed.
  - Registered subjects list.
  - Chronological activity & attendance event stream with timestamps and IP/actor info.

### 3.11 Admin Profile & Institution Settings (`/admin/profile`)
- View cover photo & avatar.
- Edit Name, Email, Password, Confirm Password.
- Institution System Settings: Update University / School Contact Email.

---

## 4. 👩‍🏫 Educator / Teacher Portal (`/teacher/*`)

### 4.1 Weekly Timetable & Live Active Session Tracker (`/teacher`)
- **Top Bar Profile Menu:**
  - Teacher Avatar with initial, Name, Role, Class Coordinator badge.
  - Teaching Subjects list with associated Class & Section.
- **Day-of-Week Navigation:** Interactive tabs (Monday through Saturday).
- **Session Cards:**
  - Subject Name, Class Name, Section, Room Number, Time Slot.
  - **Live Active Slot Banner:** Pulsing indicator when current system time matches slot.
  - Direct "Mark Attendance" button on active slot.
- **Attendance Report Modal:**
  - Filter by Class and Subject.
  - Detailed table: Student Name, Roll No, Total Classes, Present, Absent, Leave, %.
  - 1-Click "Download CSV Report" button.

### 4.2 Comprehensive Class Roster & Student Dossier (`/teacher/roster`)
- Filter by assigned class or coordinator class.
- Search students by Name or Roll Number.
- Sort by Roll Number or Name.
- **Student Cards / Table:**
  - Avatar initial, Student Name, Roll Number, Attendance % pill.
  - Action: *View Profile Dossier* (opens modal).
- **Student Profile Modal:**
  - Contact info (Email, Parent Email, Roll Number).
  - Attendance breakdown ring (Present, Absent, Leave).
  - Subject-by-subject attendance stats.
  - Exam marks history.
  - Edit Student Details (Name, Roll No, Email) if permitted.

### 4.3 Strict Slot-Based Attendance Marking (`/teacher/manual`)
- **Session Selector:** Cards showing Subject, Class, and scheduled time slots.
- **Live Slot Detection:** Automatically identifies and locks to the currently active period slot.
- **Date Selector:** Defaults to today.
- **Attendance Controls:**
  - Global "Mark All Present" and "Mark All Absent" buttons.
  - Auto-Save toggle switch.
  - Search bar to find student in roster.
- **Student Attendance List:**
  - Student photo/initial, Name, Roll Number.
  - Attendance Streak flame counter (e.g. `🔥 12`).
  - Radio toggles: **Present** (Green), **Absent** (Red), **Leave** (Amber, auto-locked if approved).
- **Submit / Save Attendance:** Writes records to database and dispatches notifications.

### 4.4 Homework & Assignment Management (`/teacher/assignments`)
- **Create Assignment Modal:**
  - Title, Description, Subject picker, Class picker, Due Date & Time picker, Max Marks.
  - Attachment link/file support.
  - Dispatches notifications to both students and parents.
- **Assignment Cards List:**
  - Filter by Class and Subject.
  - Shows Title, Due Date countdown, Max Marks, Submission count progress (e.g., `18 / 25 Submitted`).
  - Actions: *View & Grade Submissions*, *Edit Assignment*, *Delete Assignment*.
- **View & Grade Submissions Modal:**
  - List of student submissions with submission timestamp and link to work.
  - Grade Input field (score or letter grade).
  - Teacher Feedback text area.
  - Save Grade action (instantly notifies student and parent).

### 4.5 Examination Scheduling & Spreadsheet Marks Entry (`/teacher/exams`)
- **Tab 1: Scheduled Examinations:**
  - "Schedule New Exam" button & modal:
    - Exam Name (Mid-Term, Unit Test 1, Final Exam).
    - Subject selector, Class selector, Exam Date picker.
    - Start Time & End Time range pickers (`<input type="time">`) with auto AM/PM formatting.
    - Room / Hall number.
    - Total Marks & Passing Marks.
  - Auto-filters out expired exams whose date/time has passed.
- **Tab 2: Published Results & Bulk Marks Entry:**
  - List of exams with "Enter Marks" action.
  - **Excel-Style Bulk Class Marks Modal:**
    - Table with columns: Roll No, Student Name, Marks Obtained input, Auto-Calculated Grade (`A+`, `A`, `B`, `C`, `D`, `F`), Manual Grade Override, Remarks.
    - Real-time grade preview as marks are typed.
    - "Publish All Marks" button (pushes grades to student results and parent portal).

### 4.6 Parent Direct Messaging Hub (`/teacher/messages`)
- Two-pane split view:
  - **Left Pane:** Conversation list grouped by Parent & Student Name with unread indicators and last message preview.
  - **Right Pane:** Chat bubble conversation stream with timestamps.
  - Message reply composer input with Send button.

### 4.7 Educator Quiz Management (`/teacher/quizzes`)
- Create and manage subject quizzes.
- AI Quiz Generator integration scoped to teacher's assigned subjects.
- Student results and leaderboard review per quiz.

### 4.8 Teacher Leave Application (`/teacher/apply-leave`)
- **Application Form:**
  - Leave Type (Casual, Sick, Maternity/Paternity, Special).
  - Visual Leave Date Range Picker (`LeaveCalendarPicker`).
  - Reason textarea.
  - Medical / Proof document file upload.
  - Submit button.
- **Application History Table:**
  - Date Range, Total Days, Stated Reason, Uploaded Document preview (`DocumentModal`).
  - Status Pill: Pending (Amber), Approved (Green), Rejected (Red, with admin rejection reason).

---

## 5. 🎓 Student Hub (`/student/*`)

### 5.1 Student Dashboard & Attendance Performance Ring (`/student`)
- **Profile Header:** Student Name, Department, Class & Section, Roll Number.
- **Attendance Performance Gauge (Hero Widget):**
  - Animated circular SVG progress ring with glow effect.
  - Dynamic status tier:
    - **≥ 90% (Excellent):** Green theme (`#16a34a`), Sparkles icon, buffer percentage before dropping below 90%.
    - **75–89% (Good):** Amber theme (`#f59e0b`), CheckCircle icon, number of classes needed to reach 90%.
    - **< 75% (Warning):** Red theme (`#ef4444`), AlertTriangle icon, exact number of classes needed to reach 75% safe threshold.
- **Gamified Day Streak Badge:** Visual flame badge with consecutive attendance streak counter (`🔥 14 Days`).
- **Quick Stats Grid:** Total Sessions, Present count, Absent count, Leave count.
- **Today & Tomorrow Schedule Preview:** Period-by-period preview with subject, teacher, room, and time.

### 5.2 Attendance History & Log Filtering (`/student/history`)
- Accessible if student has `viewAttendance` permission.
- **Filters:**
  - Subject dropdown selector (`All` or specific subject).
  - Date Range pickers (Start Date, End Date).
  - "Reset Filters" button.
- **Dynamic Stats Summary Bar:** Filtered total, present count, absent count, leave count, and range percentage.
- **Detailed History Log Table:**
  - Date, Day of week, Time slot, Subject name & code, Teacher, Status pill (Present/Absent/Leave).

### 5.3 Leave Application & Medical Proof Engine (`/student/leaves`)
- **Leave Guidelines Modal:**
  - Displays institutional rules: 3-day standard limit for casual leaves, medical certificate mandatory for medical or >3 day leaves, 18-day semester quota.
- **Apply Leave Form:**
  - Leave Type (Casual, Medical, Emergency, On Duty / Academic).
  - Start Date & End Date selection via `LeaveCalendarPicker`.
  - Automatic duration counter (calculates number of days).
  - Reason textarea.
  - Supporting document file upload (PNG/JPG/PDF, max 5MB).
  - Submit button.
- **Leave Application Tracker:**
  - Cards showing Dates, Total Days, Category, Reason.
  - Document preview button (`DocumentModal`).
  - Live Status badge: Pending Coordinator Review, Approved, or Rejected with remarks.

### 5.4 Registered Subjects & Course Drawer (`/student/subjects`)
- **Subject Cards Grid:**
  - Subject Title & Code.
  - Faculty Name & Email.
  - Individual attendance percentage progress bar.
  - Weekly schedule summary.
- **Slide-Over Subject Detail Drawer:**
  - Tab 1: *Overview* — Attendance donut, classes attended/missed.
  - Tab 2: *Exams & Marks* — Term scores and grades for this subject.
  - Tab 3: *Upcoming* — Scheduled exams, rooms, syllabus instructions.
  - Tab 4: *Assignments* — Homework list for this subject with submission states.

### 5.5 Weekly Schedule & Visual Timetable (`/student/timetable`)
- Complete weekly grid (Monday – Saturday, periods 9 AM – 4 PM).
- Each slot displays Subject, Faculty Name, and Room Number.
- 1-Click **"Download Timetable Image"** button (exports high-res PNG).

### 5.6 Homework Submissions & Feedback (`/student/assignments`)
- Filter tabs: `[All]`, `[Pending]`, `[Completed]`.
- **Assignment Cards:**
  - Title, Subject badge, Teacher Name, Due date with overdue warning.
  - Instructions and teacher attachment links.
  - Status pill: Pending (Amber) vs Submitted (Green).
  - Teacher evaluation: Marks scored, Grade, Teacher comments.
  - "Submit / Mark Completed" action button.

### 5.7 Examination Results & Official Transcript Print (`/student/results`)
- **Tab 1: Published Results:**
  - Overall GPA / Average percentage card.
  - Term filter tabs (Mid-Term, Final Exam, Unit Tests, All).
  - Detailed results table: Subject, Code, Marks Obtained / Max, %, Grade (`A+`, `A`, `B`, `C`, `D`, `F`), Remarks.
  - 1-Click **"Download / Print Official Report Card"** button (generates printable institutional academic report).
- **Tab 2: Upcoming Exam Schedules:**
  - Exam cards with Subject, Date, Start/End Time range, Room Number, Total Marks, Syllabus notes.

---

## 6. 🧠 Quiz Arena Engine (`/student/quiz/*`)

### 6.1 Quiz Arena Hub (`/student/quiz`)
- **Tab Navigation:**
  - `[Practice Arena]` — Ungraded/self-paced subject quizzes.
  - `[University Exams]` — Formal institutional certification quizzes.
  - `[My Attempts & History]` — Completed quizzes, scores, certificates.
  - `[Leaderboard]` — Institution-wide points and accuracy rankings.
- **Quiz Cards:**
  - Title, Subject, Type, Difficulty badge (Easy/Medium/Hard/Mixed).
  - Question count, Time limit, Passing score %, Max attempts indicator (e.g. `1/3 Used`).
  - "Start Quiz" / "Retake Quiz" / "Locked" button.

### 6.2 Interactive Quiz Attempt Engine (`/student/quiz/attempt/:id`)
- **Live Countdown Timer:**
  - Displays remaining minutes and seconds.
  - Color changes to Warning (Amber) under 2 minutes, Danger (Red pulse) under 30 seconds.
  - Auto-submits on timer expiry.
- **Question Navigation Palette:**
  - Grid of numbered buttons showing question state: Answered (Green), Flagged for Review (Amber), Unvisited (Muted).
- **Question Container:**
  - Question number & prompt.
  - Optional code snippet or image prompt.
  - 4 Multiple Choice option cards with radio selection.
  - "Flag for Review" toggle button.
- **Navigation Controls:**
  - Previous and Next question buttons.
  - "Submit Quiz" button triggering a confirmation modal with unanswered question count.

### 6.3 Results, Review & Certificate Generator (`/student/quiz/results/:id`)
- **Animated Score Counter:** Ticks up from 0 to final percentage.
- **Result Hero Banner:** Passed (Trophy, Green) vs Failed (Alert, Red), with score and passing mark threshold.
- **Action Buttons:**
  - 1-Click **"Download Certificate"** (renders official PDF certificate of achievement if passed).
  - "Retake Quiz" (if attempts remain).
  - "Back to Arena".
- **Question-by-Question Review Accordion:**
  - Question prompt, student's chosen answer, correct answer (highlighted), and detailed pedagogical explanation.
- **Embedded Quiz Leaderboard:** Shows student's ranking compared to classmates.

---

## 7. 👨‍👩‍👧 Parent Portal (`/parent/*`)

### 7.1 Parent Summary Hub & Multi-Child Switcher (`/parent`)
- **Multi-Child Switcher Header Bar:**
  - Dropdown/Tabs allowing instant switching between linked children (e.g. *John Student* vs *Sarah Student*).
  - All subsequent pages automatically sync to the selected child.
- **Child Dossier Card:**
  - Student Name, Avatar, Department, Class & Section, Roll Number.
- **Quick Metric Gauges:**
  - Attendance Turnout percentage ring.
  - Fee Payment Status pill (Paid / Pending / Overdue).
  - Recent grade average.
- **Quick Action Grid:**
  - Fast navigation tiles to Attendance, Timetable, Assignments, Fees, Results, Messages, Leaves, Profile.

### 7.2 Child Attendance Analytics & CSV Export (`/parent/attendance`)
- Attendance percentage circular gauge and summary cards (Present, Absent, On Leave, Total).
- Monthly attendance breakdown chart.
- Subject-wise attendance breakdown table.
- Detailed chronological session log.
- 1-Click **"Export Attendance Report (CSV)"** button.

### 7.3 Leave Requests & Acknowledgment (`/parent/leaves`)
- View all leaves applied for the student.
- Status tracking: Pending Coordinator Approval, Approved, Rejected.
- Parent leave acknowledgment / consent action.

### 7.4 Child Class Timetable (`/parent/timetable`)
- Full weekly view of the child's academic schedule with periods, room numbers, and subject teachers.

### 7.5 Homework & Assignment Tracker (`/parent/assignments`)
- View assigned homework, submission statuses (Submitted vs Missing), teacher grades, and feedback comments.

### 7.6 Exam Performance & Report Cards (`/parent/results`)
- Published exam scores and subject-wise grades.
- Term-wise average performance.
- 1-Click **"Download Official Report Card"** (`ReportCard_StudentName.txt` / printable transcript).

### 7.7 Tuition Fees & Digital Payment Receipts (`/parent/fees`)
- **Fee Summary Overview:**
  - Total Tuition Fee, Amount Paid, Pending Amount, Due Date.
  - Status Pill: *Paid in Full* (Green) vs *Payment Due* (Red).
- **Fee Component Breakdown:**
  - Tuition Fee, Laboratory Fee, Library Fee, Sports & Activities.
- **Payment Transaction History:**
  - Receipt Number, Payment Date, Amount Paid, Payment Method (UPI, Card, Net Banking), Transaction Ref.
  - 1-Click **"Download Digital Receipt"** button (generates `.txt` / printable receipt).

### 7.8 Educator Direct Messaging Channel (`/parent/messages`)
- **"Talk To" Teacher Selector Dropdown:**
  - List of child's subject teachers (e.g., *Jane Teacher — Mathematics*).
  - Unread message count badges.
- **Message Stream:**
  - Chronological chat bubbles between Parent and Educator.
  - Real-time composer with Send action.

### 7.9 Profile & Guardian Information (`/parent/profile`)
- Parent details: Name, Email, Phone Number, Residential Address, Emergency Contact, Relationship.
- Update Contact Details form.
- Change Password form (Current Password, New Password, Confirm Password).

---

## 8. 📲 Cross-Platform UI/UX Translation Guide

When implementing these web features on mobile (`mobile/src/screens/`), apply the following patterns:

| Web UI Pattern | Recommended Mobile Equivalent |
| :--- | :--- |
| **Sticky Sidebars (260px)** | Bottom Tab Navigator (4–5 primary tabs) + Top Header Drawer/Modal |
| **Full Desktop Tables** | Vertical card list with expandable rows or horizontally scrollable `ScrollView` |
| **Hover Dropdowns** | Bottom Sheet Modal (`react-native-safe-area-context` / `Modal`) |
| **Date Range Inputs** | Native DatePicker dialogs or compact calendar strip |
| **Multi-Step Form Modals** | Stack Navigator screen or stepped bottom sheet |
| **CSV / Report Downloads** | `expo-file-system` + `expo-sharing` (native share sheet) |
| **Image / PDF Downloads** | `expo-file-system` download + `expo-sharing` to save to photos or files |
| **Confirmation Popups** | Native `Alert.alert(title, msg, [{text:'Cancel'}, {text:'Confirm'}])` |
| **Framer Motion `layoutId` Tabs** | Animated tab indicator or pill buttons in horizontal `FlatList` |
| **Large Donut SVG Charts** | Compact `react-native-svg` Ring (`r=52, stroke=9`) with central percentage text |
| **Spreadsheet Marks Table** | Scrollable card list with numeric `TextInput` and auto-calculating grade badge |

---

*Document version: 1.0.0 — Derived from iAttend Web Source Code.*
