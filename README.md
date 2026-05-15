# 🏫 iAttend — Student Attendance Management System

![iAttend Banner](./assets/iAttend-Banner.jpeg)

**iAttend** is a complete, easy-to-use school/college management system. It helps teachers take attendance, students apply for leaves, and parents track their children's progress. It's built with modern technology (MERN stack) and is designed to look premium and run fast.

# A Final Year Project

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
- Students can upload medical certificates which are stored **permanently** in the cloud using Cloudinary.
- Once the coordinator approves the leave, the system **automatically** marks the student as "On Leave" in the attendance records.

### 📱 Mobile First:
- The entire dashboard, especially the **Manual Attendance** and **Student Info** sections, is fully mobile-responsive for easy use on any device.

---

## 🛠️ Technology Used (The "Tech Stack")

We use the **MERN Stack**, which is the gold standard for modern web apps:
- **Frontend**: React.js (with Framer Motion for smooth animations)
- **Backend**: Node.js & Express
- **Database**: MongoDB Atlas
- **File Storage**: Cloudinary (Permanent cloud storage for documents)
- **Deployment**: Docker & Render

---

## 📁 Project Structure

- `frontend/`: All the code for the website you see and click on.
- `backend/`: The server code that handles data, cloud uploads, and security.
- `assets/`: Images and branding for the project.

---

## 🚀 How to Run it (Quick Start)

1. **Setup your environment**:
   Edit `backend/.env` to include your credentials:
   ```bash
   CLOUDINARY_CLOUD_NAME=your_name
   CLOUDINARY_API_KEY=your_key
   CLOUDINARY_API_SECRET=your_secret
   MONGO_URI=your_mongodb_url
   ```

2. **Start the system**:
   ```bash
   docker-compose up -d --build
   ```

3. **Create the first Admin**:
   ```bash
   docker exec backend node seedAdmin.js
   ```

---

## 🛡️ Security & Fixes
- **Auto-Fixing Permissions**: We have a special script that automatically fixes folder locks, so you never have to worry about "Permission Denied" errors when uploading documents.
- **Safe Data**: All passwords are encrypted, and we use secure tokens (JWT) to keep user accounts safe.

---
**Developed with ❤️ for Academic Excellence.**
*Maintained by [01iamysf](https://github.com/01iamysf)*
