# 🏫 iAttend — Student Attendance Management System

![iAttend Banner](./assets/banner.png)

**iAttend** is a complete, easy-to-use school/college management system. It helps teachers take attendance, students apply for leaves, and parents track their children's progress. It's built with modern technology (MERN stack) and is designed to look premium and run fast.

---

## 🌟 What can it do? (Features)

### 👨‍👩‍👧‍👦 For Different Users:
- **Admin**: The "Super Boss." Can create departments, classes, subjects, and manage all users.
- **Teacher**: Can mark attendance for their subjects and approve or reject student leave requests.
- **Student**: Can see their attendance percentage, view their timetable, and apply for leaves (with document uploads).
- **Parent**: Can log in to see the attendance and performance of their kids.
- **Coordinator**: A special teacher who manages leave requests for a specific class.

### 📅 Smart Attendance:
- Teachers mark attendance with a few clicks.
- If a student is absent, parents can get an automated email notification.
- Keeps a full history so you can see attendance from weeks or months ago.

### 📝 Leave Management:
- Students can upload a medical certificate (PDF/Image) when they are sick.
- Once the coordinator approves the leave, the system **automatically** marks the student as "On Leave" in the attendance records.

---

## 🛠️ Technology Used (The "Tech Stack")

We use the **MERN Stack**, which is the gold standard for modern web apps:
- **Frontend (The UI)**: React.js (Fast and interactive)
- **Backend (The Brain)**: Node.js & Express (Handles all requests)
- **Database (The Memory)**: MongoDB (Stores all user and attendance data)
- **Deployment**: Docker (Ensures the app runs exactly the same on any computer)

---

## 📁 Project Structure

- `frontend/`: All the code for the website you see and click on.
- `backend/`: The server code that handles data, emails, and security.
- `assets/`: Images and branding for the project.
- `docker-compose.yml`: The magic file that starts everything at once.

---

## 🚀 How to Run it (Quick Start)

The easiest way to run this is using **Docker**.

1. **Get the code**:
   ```bash
   git clone https://github.com/01iamysf/SMS.git iAttend
   cd iAttend
   ```
2. **Setup your environment**:
   Copy the example settings to make them active:
   ```bash
   cp backend/.env.example backend/.env
   ```
   *(Optional: Edit `backend/.env` to add your Gmail password for email alerts).*

3. **Start the system**:
   ```bash
   docker-compose up -d --build
   ```
4. **Create the first Admin**:
   Since the database is empty, run this to create an admin account:
   ```bash
   docker exec backend node seedAdmin.js
   ```
   - **User**: `admin@example.com`
   - **Pass**: `admin123`

5. **Open the App**:
   Go to **http://localhost:5173** in your browser.

---

## 🛡️ Security & Fixes
- **Auto-Fixing Permissions**: We have a special script that automatically fixes folder locks, so you never have to worry about "Permission Denied" errors when uploading documents.
- **Safe Data**: All passwords are encrypted, and we use secure tokens (JWT) to keep user accounts safe.

---
**Developed with ❤️ for Academic Excellence.**
*Maintained by [01iamysf](https://github.com/01iamysf)*
