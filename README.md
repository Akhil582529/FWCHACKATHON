---

## 🏁 Getting Started

### Prerequisites

- **Node.js** v18+ → [nodejs.org](https://nodejs.org)
- **MongoDB Atlas** free account → [cloud.mongodb.com](https://cloud.mongodb.com)
- **Gemini API Key** (free) → [aistudio.google.com](https://aistudio.google.com)

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
GEMINI_API_KEY=your_gemini_api_key_here
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

### AI (Gemini)
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
3. Add all env variables, set `ALLOWED_ORIGINS=https://your-app.vercel.app`
4. Deploy

---

<div align="center">

Built with ❤️ at **FWC Hackathon 2026**

⭐ Star this repo if you found it helpful!

</div>
