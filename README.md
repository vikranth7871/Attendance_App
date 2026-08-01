# 🎓 iAttend — Smart School ERP, Student Attendance & Academic Management System

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/vikranth7871/iAttend)
[![Tech Stack](https://img.shields.io/badge/stack-React%20%7C%20Node.js%20%7C%20PostgreSQL-blue)](https://github.com/vikranth7871/iAttend)
[![License](https://img.shields.io/badge/license-MIT-purple)](#-license)

**iAttend** is a full-featured, enterprise-grade School ERP (Enterprise Resource Planning) platform designed for modern K-12 and Higher Education institutions. It seamlessly connects **System Administrators**, **Educators**, **Students**, and **Parents** into a unified real-time portal ecosystem with glassmorphism UI, real-time notifications, strict slot-based attendance tracking, automated homework/exam workflows, fee receipt generation, and multi-child parent management.

---

## 🚀 Quick Credentials for Demo

Access all 4 role portals using pre-configured test accounts:

| Role | Portal URL | Email | Password | Access Highlights |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | `/admin` | `admin@example.com` | `admin123` | Full Administrative, User Management & Leave Approvals |
| **Educator / Teacher** | `/teacher` | `teacher@example.com` | `teacher123` | Timetable, Mark Attendance, Assignments, Exams & Parent Inbox |
| **Student** | `/student` | `student@example.com` | `student123` | Attendance Streaks, Assignments, Exam Results & Quizzes |
| **Parent** | `/parent` | `parent@example.com` | `parent123` | Multi-Child Switcher, Fees, Attendance Analytics & Teacher Messaging |

---

## 🌟 Comprehensive Feature Modules

### 👨‍👩‍👧 1. Parent Portal (`/parent/*`)
* **Multi-Child Switcher**: Easily switch between linked children (e.g. *John Student* & *Sarah Student*) with instant UI synchronization.
* **Attendance Analytics**: Interactive charts, percentage gauges, monthly attendance trends, and detailed subject-wise attendance logs.
* **Leave Application Hub**: Apply for student leaves on behalf of children with embedded visual date range pickers and live status tracking.
* **Weekly Timetable & Schedule**: View daily period breakdowns, room numbers, and assigned subject teachers.
* **Homework & Assignments Tracker**: Monitor assigned homework, submission statuses, due dates, and teacher feedback.
* **Exam Results & Report Cards**: Real-time subject score display, grade breakdowns, and 1-click **Official Report Card Download** (`ReportCard_StudentName.txt`).
* **Fee Details & Digital Receipts**: View tuition fee status (Paid, Pending, Overdue), breakdown of fee components, and generate downloadable digital payment receipts.
* **Educator Communication Channel**: Direct messaging channel with an **Educator Selector Dropdown** (`Talk To: Jane Teacher`) and real-time reply notifications.

---

### 👩‍🏫 2. Educator / Teacher Portal (`/teacher/*`)
* **Strict Slot-Based Attendance Marking**: Live active class slot detection, strict timeframe enforcement, and manual attendance overrides.
* **Class Roster & Student Profiles**: Interactive student roster, roll numbers, attendance percentages, and comprehensive student profile modals.
* **Homework & Assignment Management**: Create assignments, attach instructions/links, specify due dates, and automatically dispatch notifications to both students and parents.
* **Examination & Grade Publishing**:
  * **Structured Time Range Pickers**: Native Start Time & End Time range selectors (`<input type="time">`) with automated 12-hour AM/PM formatting.
  * **Real-time Live Grade Evaluation**: Auto-calculates letter grades (`A+`, `A`, `B`, `C`, `D`, `F`) based on percentage with an optional **Manual Grade Override**.
  * **Expired Exam Auto-Removal**: Automatically filters out expired/past exams from the "Scheduled Examinations" view once the exam date and end time pass.
* **Parent Communication Inbox**: View incoming parent inquiries grouped by student name, reply in real-time, and trigger push notifications.
* **Teacher Leave Management**: Apply for teacher leave with supporting document uploads for Admin review.

---

### 🎓 3. Student Portal (`/student/*`)
* **Gamified Attendance Streaks**: Visual streak badges, attendance percentage progress bars, and historical logs.
* **Homework & Assignment Submissions**: Receive teacher homework assignments, submit completed work, and view teacher remarks.
* **Exam Results & Performance**: View published grades, exam schedules, and download official academic report cards.
* **Quiz Arena & Certificate Engine**: Participate in subject quizzes, view live leaderboards, and earn downloadable achievement certificates.

---

### 🛡️ 4. System Admin Portal (`/admin/*`)
* **Institution Management**: Manage users (Teachers, Students, Parents), subject allocations, and class structures.
* **Leave Approval Hub**: Review teacher leave applications with options to Approve, Reject (with mandatory rejection reasons), or Revoke approvals.
* **Global System Auditing**: Monitor platform activity, attendance logs, and institution-wide statistics.

---

## 🛠️ Technology Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React.js Frontend (Vite)                │
│  Framer Motion • Lucide Icons • Vanilla CSS (Glassmorphism) │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST APIs (Axios)
┌──────────────────────────────▼──────────────────────────────┐
│                    Node.js / Express Backend                │
│   JWT Auth • Role Middlewares • Node-Cron • Cloudinary SDK  │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL Queries (pg Pool)
┌──────────────────────────────▼──────────────────────────────┐
│                  Neon DB (Cloud PostgreSQL)                 │
│  Users • Attendance • Assignments • Exams • Messages • Fees │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Developer Setup Guide

Follow this step-by-step guide to set up the project locally for development.

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Git**

---

### 2. Clone the Repository
```bash
git clone https://github.com/vikranth7871/iAttend.git
cd iAttend
```

---

### 3. Backend Setup
Navigate into the `backend/` directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file inside the `backend/` folder:
```env
PORT=5005
DATABASE_URL=postgres://user:password@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=super_secret_jwt_key_iattend_2026
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> **Note for New Developers**: The database schema (tables, foreign keys, constraints, default seed data) is **automatically created and initialized** on server startup via `backend/config/db.js`. No manual SQL migrations are needed!

Start the backend development server:
```bash
npm run dev
```
*(The backend will start running on [http://localhost:5005](http://localhost:5005))*

---

### 4. Frontend Setup
Open a new terminal window, navigate into the `frontend/` directory, and install dependencies:
```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```
*(The frontend will start running on [http://localhost:3000](http://localhost:3000))*

---

### 5. Verify Local Setup
1. Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.
2. Log in using any of the credentials listed in the [Quick Credentials Table](#-quick-credentials-for-demo).
3. Test attendance marking, parent-teacher messaging, homework assignments, and exam schedule creation!

---

## 📂 Project Structure

```
iAttend/
├── backend/
│   ├── config/
│   │   └── db.js                # PostgreSQL connection pool & auto-schema init
│   ├── controllers/
│   │   ├── authController.js    # Login, registration, JWT handling
│   │   ├── parentController.js  # Parent dashboard, fees, messages & results
│   │   ├── studentController.js # Attendance, assignments & student schedule
│   │   └── teacherController.js # Roster, attendance, homework & exams
│   ├── middleware/
│   │   └── authMiddleware.js    # Role-based authorization & permission checks
│   ├── routes/                  # Express route handlers
│   ├── jobs/                    # Automated CRON schedulers (weekly reports)
│   └── server.js                # Express app entrypoint
│
└── frontend/
    ├── src/
    │   ├── components/          # Reusable UI components & Sidebars
    │   ├── context/             # AuthContext state management
    │   ├── pages/               # Role-specific portal views
    │   │   ├── admin/           # Admin pages
    │   │   ├── parent/          # Parent Portal pages (Analytics, Fees, Messages)
    │   │   ├── student/         # Student Portal pages (Streaks, Assignments)
    │   │   └── teacher/         # Teacher Portal pages (Roster, Exams, Inbox)
    │   ├── App.jsx              # Main router & page routes
    │   └── main.jsx             # React DOM entrypoint
    └── package.json
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

## 👤 Project Maintainer & Guide

Developed and maintained by **[Vikranth](https://github.com/vikranth7871)**.  
For developer onboarding questions, technical inquiries, or feature requests, feel free to reach out via GitHub Issues or discussions!

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
