<<<<<<< HEAD

=======
<div align="center">

# ◈ TalentOS

### AI-Powered Hiring Platform

*Built for FWC Hackathon 2026*

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Groq](https://img.shields.io/badge/Groq-LLaMA3-F55036?style=flat-square&logo=groq&logoColor=white)](https://console.groq.com)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=black)](https://render.com)

[Live Demo](https://fwchackathon.vercel.app) · [Report Bug](https://github.com/Akhil582529/talentos/issues) · [Request Feature](https://github.com/Akhil582529/talentos/issues)

</div>

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Deployment](#-deployment)

---

## 🚀 About the Project

TalentOS is a full-stack AI-powered hiring platform that streamlines recruitment for three types of users — **Candidates**, **HR Recruiters**, and **Admins**. Built during the FWC Hackathon, it integrates **Groq's LLaMA3** model to intelligently rank candidates, conduct mock interviews, and review profiles — with blazing fast inference thanks to Groq's LPU hardware.

The platform features a dark-themed, role-aware UI with JWT authentication, real-time applicant tracking, and AI-driven hiring insights — all in one place.

---

## ✨ Features

### 👤 Candidate
- Browse and apply to active job listings
- Upload resume URL and manage profile + skills
- AI-powered **mock interview** — LLaMA3 generates 5 role-specific questions, evaluates answers, and gives a grade + detailed feedback
- **AI profile review** — get a profile score and improvement tips
- Track all applied jobs and their statuses in real time

### 🏢 HR Recruiter
- Post and manage job listings (title, skills, requirements, salary range)
- View all applicants across posted jobs with resume links
- **Groq AI candidate ranking** — scores every applicant 0–100 with strengths, gaps, and hire recommendation
- Schedule interviews with candidates (online / in-person / phone) with meet links
- Track interview statuses (scheduled → completed / cancelled)

### ⚙️ Admin
- Platform-wide analytics — user counts, job stats, application rates, monthly signups chart
- Manage all users — filter by role, search, activate / deactivate accounts
- Manage all jobs — view, close, or reopen any job on the platform
- Protected admin-key authentication on top of password

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | Component-based UI framework |
| **Vite** | Lightning-fast dev server and build tool |
| **CSS Modules** | Scoped component styling |
| **React Context API** | Global auth state management |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API server |
| **MongoDB + Mongoose** | NoSQL database with schema validation |
| **JWT** | Stateless authentication tokens |
| **bcryptjs** | Password and admin key hashing |
| **Groq SDK + LLaMA3** | AI ranking, mock interviews, profile review |
| **express-validator** | Input validation and sanitization |
| **express-rate-limit** | Brute-force attack protection |
| **CORS** | Cross-origin request handling |

---

## 📁 Project Structure

```
FWC Hackathon/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   └── jwt.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── jobController.js
│   │   │   ├── aiController.js
│   │   │   ├── candidateController.js
│   │   │   ├── interviewController.js
│   │   │   └── adminController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── validate.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Job.js
│   │   │   └── Interview.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   └── dashboard.js
│   │   └── server.js
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── CandidateDashboard.jsx
    │   │   ├── HRDashboard.jsx
    │   │   ├── AdminDashboard.jsx
    │   │   ├── DashboardLayout.jsx
    │   │   ├── LoginForm.jsx
    │   │   ├── RoleTab.jsx
    │   │   ├── InputField.jsx
    │   │   └── BrandPanel.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   └── LoginPage.jsx
    │   ├── services/
    │   │   └── api.js
    │   ├── App.jsx
    │   └── index.css
    └── package.json
```

---

## 🏁 Getting Started

### Prerequisites

- **Node.js** v18+ → [nodejs.org](https://nodejs.org)
- **MongoDB Atlas** free account → [cloud.mongodb.com](https://cloud.mongodb.com)
- **Groq API Key** (free) → [console.groq.com](https://console.groq.com)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/Akhil582529/talentos.git
cd talentos
```

**2. Set up the backend**
```bash
cd backend
npm install
# Create .env file (see Environment Variables below)
npm run dev
```

**3. Set up the frontend** *(new terminal)*
```bash
cd frontend
npm install
# Create .env file (see Environment Variables below)
npm run dev
```

**4. Open** → http://localhost:5173

### Creating an Admin Account

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@talentos.com",
    "password": "Admin@1234",
    "role": "admin",
    "adminKey": "superadmin123"
  }'
```

---

## 🔐 Environment Variables

### `backend/.env`
```env
PORT=5001
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
GROQ_API_KEY=your_groq_api_key_here
```

### `frontend/.env`
```env
VITE_API_URL=http://localhost:5001/api
```

> ⚠️ Never commit `.env` files to Git.

---

## 📡 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login and get JWT |
| GET | `/api/auth/me` | ✅ | Get current user |
| POST | `/api/auth/logout` | ✅ | Logout |

### Jobs
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/jobs` | All | Get all active jobs |
| POST | `/api/jobs` | HR | Create a job |
| DELETE | `/api/jobs/:id` | HR | Delete own job |
| GET | `/api/jobs/my` | HR | Get my posted jobs |
| POST | `/api/jobs/:id/apply` | Candidate | Apply to a job |
| GET | `/api/jobs/applied` | Candidate | Get applied jobs |

### AI (Groq + LLaMA3)
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/ai/rank-candidates/:jobId` | HR | Rank all applicants with AI |
| POST | `/api/ai/mock-interview/start` | Candidate | Generate interview questions |
| POST | `/api/ai/mock-interview/evaluate` | Candidate | Evaluate interview answers |
| POST | `/api/ai/profile-review` | Candidate | AI profile feedback |

### Interviews
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/interviews` | HR | Schedule interview |
| GET | `/api/interviews/hr` | HR | Get my scheduled interviews |
| GET | `/api/interviews/candidate` | Candidate | Get my interviews |
| PATCH | `/api/interviews/:id/status` | HR | Update status |

### Admin
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/admin/users` | Admin | Get all users |
| PATCH | `/api/admin/users/:id/toggle` | Admin | Activate/deactivate user |
| GET | `/api/admin/analytics` | Admin | Platform analytics |
| GET | `/api/admin/jobs` | Admin | Get all jobs |
| PATCH | `/api/admin/jobs/:id/toggle` | Admin | Close/reopen job |

---

## 🗄 Database Schema

### `users` collection
| Field | Type | Description |
|---|---|---|
| `email` | String | Unique per role |
| `passwordHash` | String | bcrypt hashed, never plain text |
| `role` | Enum | `candidate` / `hr` / `admin` |
| `isActive` | Boolean | Account status |
| `fullName` | String | Candidate + HR only |
| `skills` | String[] | Candidate only |
| `resumeUrl` | String | Candidate only |
| `companyId` | String | HR only |
| `adminKeyHash` | String | Admin only |
| `permissions` | String[] | Admin only |
| `createdAt` | Date | Auto-generated |
| `updatedAt` | Date | Auto-updated |

### `jobs` collection
| Field | Type | Description |
|---|---|---|
| `title` | String | Job title |
| `skills` | String[] | Required skills — used by AI ranking |
| `postedBy` | ObjectId | Reference to HR user |
| `applicants` | Array | Embedded — candidateId, status, aiScore |
| `isActive` | Boolean | Toggled by admin |

### `interviews` collection
| Field | Type | Description |
|---|---|---|
| `candidate` | ObjectId | Reference to User |
| `job` | ObjectId | Reference to Job |
| `scheduledBy` | ObjectId | Reference to HR User |
| `isMock` | Boolean | AI mock interview flag |
| `mockScore` | Number | AI evaluation score 0–100 |

---

## 🌐 Deployment

### Frontend → Vercel
1. Import repo on [vercel.com](https://vercel.com), set root directory to `frontend`
2. Add environment variable: `VITE_API_URL = https://your-backend.onrender.com/api`
3. Deploy

### Backend → Render
1. Create Web Service on [render.com](https://render.com), set root directory to `backend`
2. Build command: `npm install` · Start command: `npm start`
3. Add all env variables including `GROQ_API_KEY`, set `ALLOWED_ORIGINS=https://your-app.vercel.app`
4. Deploy

---

<div align="center">

Built with ❤️ at **FWC Hackathon 2026**

⭐ Star this repo if you found it helpful!

</div>
>>>>>>> ca4adc4 (Add README file)
