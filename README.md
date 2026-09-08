# 🎓 iAttend — Smart School ERP, Attendance & Academic Management System

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/vikranth7871/iAttend)
[![Web Stack](https://img.shields.io/badge/web-React%2019%20%7C%20Vite%20%7C%20Framer%20Motion-blue)](https://github.com/vikranth7871/iAttend)
[![Mobile Stack](https://img.shields.io/badge/mobile-React%20Native%20%7C%20Expo%20SDK%2054-purple)](https://github.com/vikranth7871/iAttend)
[![Backend Stack](https://img.shields.io/badge/backend-Node.js%20%7C%20Express%205%20%7C%20PostgreSQL-orange)](https://github.com/vikranth7871/iAttend)
[![AI Integration](https://img.shields.io/badge/AI-Google%20Gemini-teal)](https://github.com/vikranth7871/iAttend)
[![License](https://img.shields.io/badge/license-MIT-green)](#-license)

**iAttend** is an enterprise-grade, full-stack School ERP (Enterprise Resource Planning) and academic management platform built for K-12 and Higher Education institutions. It provides a unified ecosystem connecting **System Administrators**, **Educators**, **Students**, and **Parents** through both a **modern web portal** (React + Vite) and a **cross-platform mobile application** (React Native + Expo for iOS, Android, and Web).

---

## 🚀 Demo Credentials

Access all role portals using pre-configured test accounts:

| Role | Portal Route | Email | Password | Access Highlights |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | `/admin` | `admin@example.com` | `admin123` | Institutional Setup, Leaves Approval, User Roles & Permissions |
| **Educator / Teacher** | `/teacher` | `teacher@example.com` | `teacher123` | Active Slot Attendance, Assignments, Exams & Parent Communication |
| **Student** | `/student` | `student@example.com` | `student123` | Attendance Analytics, Assignments, Exams & Quiz Arena |
| **Parent** | `/parent` | `parent.doe@example.com` | `parent123` | Multi-Child Switcher, Fee Invoices, Attendance Analytics & Teacher Inbox |

---

## 🌟 Comprehensive Feature Modules

### 🛡️ 1. System Admin Portal & Mobile Suite (`/admin/*`)
* **Teacher Leaves Approval Hub**:
  * Edge-to-edge data table with centered column alignment, status indicators, and responsive formatting.
  * **Leave Application Dossier**: Detailed bottom-sheet/modal displaying leave duration, calculated day count, reason, and attached supporting documents.
  * **Direct Approvals / Rejections / Revocations**: Contextual action modal with mandatory reason prompt for rejections and revocations.
  * Multi-status filtering chips (*All*, *Pending*, *Approved*, *Rejected*, *Revoked*) with real-time keyword search.
* **Departments & Classes Structure**:
  * **Instant Department Creation**: Inline input row with instant validation and dynamic addition.
  * **Responsive Department Chip Grid**: Interactive department tags with quick-delete triggers.
  * **Custom In-App Delete Confirmation Modal**: Custom styled modal with cascade warnings preventing accidental deletions across web, emulation, and native mobile environments.
  * **Classes Management Table**: Clean tabular layout displaying Class Name, Department, Academic Year, with integrated modal forms for adding and editing class details.
* **User & Role Management**:
  * Directory for Teachers, Students, and Parents with instant search and department/class filtering.
  * Status management (Active / Suspended) and granular user profile editor.
* **Granular Permissions Matrix**:
  * Dynamic role-based permission toggles for institutional control over system features.
* **Faculty Attendance & Institution Activity**:
  * Real-time monitoring of educator check-ins and platform-wide audit activity logs.

---

### 👩‍🏫 2. Educator / Teacher Portal (`/teacher/*`)
* **Strict Slot-Based Attendance Marking**:
  * Automatic active class slot detection, strict timeframe enforcement, and manual attendance overrides.
* **Class Roster & Student Profiles**:
  * Student roster with roll numbers, attendance rates, and comprehensive individual student profile views.
* **Homework & Assignment Dispatcher**:
  * Create assignments with instructions and resource links; automatically triggers alerts to student and parent dashboards.
* **Examination & Grade Publishing**:
  * Native 12-hour AM/PM start and end time pickers.
  * Automated letter grade computation (`A+`, `A`, `B`, `C`, `D`, `F`) with manual grade override options.
  * Auto-cleanup for expired examinations once the test window closes.
* **Parent Communication Inbox**:
  * Centralized message hub grouping parent inquiries by student with direct reply capabilities.
* **Leave Application System**:
  * Submit leave requests with document attachment uploads for administrative review.

---

### 🎓 3. Student Portal (`/student/*`)
* **Attendance Performance & Metrics**:
  * Attendance percentage progress rings, session metrics breakdown, smart insights, and historical check-in logs.
* **Homework & Submissions Hub**:
  * View pending assignments, submit completed homework, and inspect educator feedback and remarks.
* **Academic Performance & Report Cards**:
  * Published exam scores, timetable review, and 1-click **Official Report Card Download** (`ReportCard_StudentName.txt`).
* **Quiz Arena & Achievement Certificates**:
  * Interactive subject quizzes with live scoreboards, timers, and downloadable completion certificates.

---

### 👨‍👩‍👧 4. Parent Portal (`/parent/*`)
* **Multi-Child Switcher**:
  * Seamlessly toggle between linked children with instant state synchronization across all views.
* **Attendance Analytics**:
  * Percentage gauges, monthly attendance trends, and detailed subject-by-subject attendance logs.
* **Student Leave Requests**:
  * Apply for student leaves on behalf of children with date range pickers and real-time review status.
* **Fee Status & Digital Receipts**:
  * Monitor tuition fee status (*Paid*, *Pending*, *Overdue*), fee component breakdowns, and downloadable payment receipts.
* **Direct Educator Messaging**:
  * Dedicated channel to consult subject teachers directly with real-time response notifications.

---

### 📱 5. Cross-Platform Mobile Application (`mobile/`)
* **React Native & Expo SDK 54**:
  * Fully unified codebase powering **iOS**, **Android**, and **Web** (`react-native-web`).
* **Dynamic Network Auto-Routing**:
  * Intelligent API client that resolves connection hosts dynamically (browser hostname for web, Metro LAN host IP for Expo Go on physical phones, and localhost for simulators).
* **Native & Web Optimized UI**:
  * Edge-to-edge layouts, smooth bottom sheet modals, custom confirmation dialogs, loading skeletons, and theme consistency.

---

## 🛠️ Technology Architecture

```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│       React Web Portal (Vite)        │     │     Expo Mobile App (React Native)   │
│  React 19 • Framer Motion • Lucide   │     │  Expo 54 • React Navigation • Mobile │
└──────────────────┬───────────────────┘     └──────────────────┬───────────────────┘
                   │                                            │
                   │ REST APIs (JWT Bearer / Axios)             │ REST APIs (Dynamic Host)
                   └─────────────────────┬──────────────────────┘
                                         ▼
                   ┌───────────────────────────────────────────┐
                   │         Node.js / Express 5 Backend       │
                   │   JWT Auth • Role Middleware • Node-Cron  │
                   │   Cloudinary SDK • Google Gemini AI       │
                   └─────────────────────┬─────────────────────┘
                                         ▼
                   ┌───────────────────────────────────────────┐
                   │         Neon Cloud PostgreSQL DB          │
                   │  Users • Attendance • Classes • Leaves   │
                   │  Assignments • Exams • Messages • Fees    │
                   └───────────────────────────────────────────┘
```

---

## 💻 Developer Setup Guide

Follow these steps to run the complete iAttend ecosystem locally.

### 1. Prerequisites
Ensure the following tools are installed:
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher
* **Git**
* *(Optional for Mobile)*: **Expo Go** app on your iOS/Android device, or Xcode / Android Studio simulators.

---

### 2. Clone the Repository
```bash
git clone https://github.com/vikranth7871/iAttend.git
cd iAttend
```

---

### 3. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:
```env
PORT=5005
DATABASE_URL=postgres://user:password@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=super_secret_jwt_key_iattend_2026
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> **Automatic Schema Initialization**: The PostgreSQL tables, foreign key relations, constraints, and initial seed accounts are **automatically created and verified** on startup via `backend/config/db.js`. No manual migration runs required!

Start the backend development server:
```bash
npm run dev
```
*Backend runs on: [http://localhost:5005](http://localhost:5005)*

---

### 4. Web Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Web Portal runs on: [http://localhost:3000](http://localhost:3000)*

---

### 5. Mobile App Setup (React Native / Expo)
Open a new terminal window:
```bash
cd mobile
npm install
```

Run on your preferred platform:
```bash
# Run on Web (Browser view on port 8081)
npm run web

# Or start Expo interactive CLI (scan QR code with Expo Go or run on simulator)
npx expo start
```
*Mobile Web runs on: [http://localhost:8081](http://localhost:8081)*

---

## 📂 Project Structure

```
iAttend/
├── backend/
│   ├── config/
│   │   └── db.js                 # PostgreSQL connection pool & auto-migration engine
│   ├── controllers/
│   │   ├── adminController.js     # User, leave, department & academic management
│   │   ├── authController.js      # Auth, login, tokens, password hashing
│   │   ├── parentController.js    # Child switching, fees, messages & results
│   │   ├── studentController.js   # Overview, homework submissions, schedule
│   │   └── teacherController.js   # Slot attendance, grade book & exams
│   ├── middleware/
│   │   └── authMiddleware.js      # JWT verification & role authorization
│   ├── routes/                    # Express route declarations
│   ├── jobs/                      # Cron schedulers for attendance auto-save
│   └── server.js                  # Backend entrypoint & middleware configuration
│
├── frontend/                      # Web Application (Vite + React 19)
│   ├── src/
│   │   ├── components/            # Headers, sidebars, modals & navigation
│   │   ├── context/               # AuthContext & global state providers
│   │   ├── pages/
│   │   │   ├── admin/             # Admin portal views
│   │   │   ├── parent/            # Parent portal views
│   │   │   ├── student/           # Student portal views
│   │   │   └── teacher/           # Teacher portal views
│   │   ├── App.jsx                # Route definitions & protected layouts
│   │   └── main.jsx               # React DOM bootstrap
│   └── package.json
│
├── mobile/                        # Cross-Platform Mobile App (React Native + Expo)
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js          # Axios client with dynamic host resolution
│   │   ├── components/            # Mobile UI components (Header, Skeletons, Modals)
│   │   ├── context/               # AuthContext & ThemeContext
│   │   ├── navigation/            # Role-based Tab & Stack Navigators
│   │   ├── screens/
│   │   │   ├── admin/             # TeacherLeavesScreen, AcademicManageScreen, etc.
│   │   │   ├── auth/              # Mobile login & auth screens
│   │   │   ├── parent/            # Mobile parent screens
│   │   │   ├── student/           # Mobile student screens
│   │   │   ├── teacher/           # Mobile teacher screens
│   │   │   └── quiz/              # Quiz screens
│   │   └── styles/                # Mobile design tokens, colors & typography
│   ├── app.json                   # Expo configuration
│   └── package.json
│
└── README.md
```

---

## 🤝 Contribution Guidelines

1. **Fork the Repository** on GitHub.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**:
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Push to the branch**:
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request** for review.

---

## 👤 Project Maintainer

Developed and maintained by **[Vikranth](https://github.com/vikranth7871)**.  
Feel free to open an issue or start a discussion for feature requests, bug reports, or architecture suggestions!

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
