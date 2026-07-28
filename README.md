# 🎓 iAttend — Smart Student Attendance & Academic Management System

![iAttend Banner](./assets/iAttend-Banner.jpeg)

**iAttend** is an advanced, high-performance Academic & Attendance Management System designed for modern educational institutions. It empowers administrators, educators, students, and parents with real-time timetable tracking, interactive leave applications, quiz generation, automated certificates, and strict slot-based attendance marking.

Built using **React (Vite)**, **Node.js/Express**, **Neon DB (PostgreSQL)**, and **Cloudinary**.

---

## 🚀 Quick Credentials

Explore the platform with pre-configured role accounts:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **System Admin** | `admin@example.com` | `admin123` | Full Administrative & System Management |
| **Educator / Teacher** | `teacher@example.com` | `teacher123` | Timetable, Mark Attendance, Class Roster, Leave Requests |
| **Student** | `student@example.com` | `student123` | Academic Schedule, Leave Applications, Quizzes, Streaks |

---

## 🌟 Key Features

### 📅 Embedded Interactive Visual Calendar Picker
- **Single-Day & Multi-Day Range Selection**: 1-click single-day leave pick or 2-click multi-day range highlighting.
- **Preset Quick Chips**: `[ Today ]`, `[ Tomorrow ]`, and `[ Reset ]` instant presets.
- **Live Duration Badges**: Automatic day count calculations (e.g. `3 Days Range (Jul 28 — Jul 30, 2026)`).

### 🛡️ Teacher Leave Management & Admin Workflow
- **Teacher Leave Applications**: Teachers can submit leave applications with supporting proof documents.
- **Admin Approval Hub**: Admins review, approve, reject (with mandatory rejection reasons), or revoke teacher leave requests.
- **Class Coordinator Approvals**: Class Coordinators review and process student leave requests for their assigned classes.

### ⏰ Strict Slot-Based Attendance Marking
- **Live Active Session Detection**: Automatically detects in-progress class slots for the current day and time.
- **Strict Time Restrictions**: Restricts attendance marking strictly to scheduled class windows while providing admin override capabilities.
- **Streak & Performance Sync**: Real-time streak count increments for attendance consistency.

### 📚 Deduplicated Academic Schedule & Roster
- **Unique Subject Card Grouping**: Combines recurring weekly slots into clean single-subject cards with schedule badges (`🗓️ 6 Weekly Slots`).
- **Interactive Timetable Grid**: Complete weekly grid layout (Monday – Saturday) mapping every period, room number, and assigned teacher.

### 🧠 Quiz Arena & Certificate Engine
- **Quiz Creator & AI Generator**: Create manual quizzes or generate AI quizzes on any academic topic.
- **Leaderboards & Certificates**: Live student leaderboards and downloadable certificates upon passing quizzes.

---

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite, Framer Motion, Lucide Icons, Vanilla CSS
- **Backend**: Node.js, Express.js, PostgreSQL (`pg` pool)
- **Database**: Neon DB (Cloud PostgreSQL)
- **Cloud Storage**: Cloudinary (Secure document & asset storage)

---

## ⚙️ Setup & Local Execution

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/vikranth7871/iAttend.git
cd iAttend

# Install Backend dependencies
cd backend && npm install

# Install Frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory:
```env
PORT=5005
DATABASE_URL=your_neon_postgresql_url
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Run Development Servers
```bash
# Start Backend (from backend directory)
npm run dev

# Start Frontend (from frontend directory)
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 👤 Author & Maintainer

Developed & Maintained by **[Vikranth](https://github.com/vikranth7871)**.

*Developed with ❤️ for Academic Excellence.*
