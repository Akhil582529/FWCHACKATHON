# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Talentos** — an AI-powered recruitment platform with three distinct portals (Candidate, HR, Admin) built as a full-stack SPA. Google Gemini drives candidate ranking, mock interviews, and profile reviews.

## Commands

### Running locally (two terminals)

```bash
# Backend (port 5000)
cd backend && npm install && npm run dev

# Frontend (port 5173)
cd frontend && npm install && npm run dev
```

### Production

```bash
cd backend && npm start
cd frontend && npm run build && npm run preview
```

There are no test suites configured — manual testing against the running app is the current approach.

## Environment Variables

Create `backend/.env`:

```
MONGO_URI=<MongoDB connection string>       # required — server exits without it
JWT_SECRET=<secret>                         # fallback exists but set explicitly
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=<Google Generative AI key>   # required for all AI features
PORT=5000
ALLOWED_ORIGINS=http://localhost:5173
NODE_ENV=development
```

Frontend API base URL is hardcoded in `frontend/src/services/api.js` — change it there for local vs. deployed targets. Current prod target: `https://fwchackathon.onrender.com/api`.

## Architecture

### Backend (`backend/src/`)

Node.js ES modules (`"type": "module"`) + Express. Single MongoDB database (`talentos`) with three collections: `users`, `jobs`, `interviews`.

| Layer | Files | Responsibility |
|---|---|---|
| Entry | `server.js` | CORS, rate-limiting, route mounting, global error handler |
| Routes | `routes/auth.js`, `routes/dashboard.js` | All endpoints; `dashboard.js` aggregates jobs, candidates, interviews, AI, admin |
| Controllers | `controllers/` | Business logic per domain |
| Middleware | `middleware/auth.js` | `protect` (JWT verify) + `restrictTo(...roles)` (RBAC) |
| Models | `models/` | Mongoose schemas — User (polymorphic by role), Job (embeds applicants array), Interview (covers both real and mock) |
| AI | `controllers/aiController.js` | Gemini 2.0 Flash calls for ranking, mock Q&A, profile review |

**Auth flow:** JWT in `Authorization: Bearer <token>` header. Token stored in `localStorage` on the client. 7-day expiry. `protect` middleware verifies and attaches `req.user`.

**Role-based access:** Three roles — `candidate`, `hr`, `admin`. `restrictTo` is chained after `protect` on role-specific routes.

**Rate limiting:**
- Global: 200 req / 15 min per IP
- Auth routes: 10 req / 15 min per IP

### Frontend (`frontend/src/`)

React 18 + Vite. No external state library — Context API only.

| Module | File | Responsibility |
|---|---|---|
| Router | `App.jsx` | Switches top-level component based on `user.role` |
| Auth state | `context/AuthContext.jsx` | Session restore from localStorage, login/logout handlers |
| API layer | `services/api.js` | All fetch calls grouped by domain (auth, jobs, candidate, interviews, ai, admin) |
| Portals | `components/*Dashboard.jsx` | One component per role; contain all role-specific UI |
| Login | `pages/LoginPage.jsx` + `components/LoginForm.jsx` | Role tab selection → role-specific register/login form |
| Layout | `components/DashboardLayout.jsx` | Sidebar + nav, renders the active portal |

Styling uses CSS Modules with a dark theme and role-specific CSS custom properties (`--cand-accent`, `--hr-accent`, `--admin-accent`, etc.).

### Key Data Relationships

- `Job.applicants[]` is an embedded array of `{ candidate, appliedAt, status, aiScore, aiSummary }` — AI ranking writes `aiScore`/`aiSummary` directly into these subdocuments.
- `Interview` has an `isMock` boolean; when true the document stores `mockQuestions[]`, `mockAnswers[]`, `mockFeedback`, and `mockScore` instead of scheduling fields.
- `User` has role-specific fields at the top level (e.g. `resumeUrl`/`skills` for candidates, `companyId`/`department` for HR, `adminKeyHash`/`permissions` for admins). `passwordHash` and `adminKeyHash` have `select: false` — never returned in queries by default.

## API Route Reference

All routes are prefixed `/api`. Protected routes require `Authorization: Bearer <token>`.

```
POST   /auth/register                   public
POST   /auth/login                      public
GET    /auth/me                         protected
POST   /auth/logout                     protected

GET    /jobs                            protected (all roles)
POST   /jobs                            HR only
GET    /jobs/my                         HR only
DELETE /jobs/:id                        HR only
POST   /jobs/:id/apply                  candidate only
GET    /jobs/applied                    candidate only

GET    /candidate/profile               candidate only
PUT    /candidate/profile               candidate only

POST   /interviews                      HR only
GET    /interviews/hr                   HR only
GET    /interviews/candidate            candidate only
PATCH  /interviews/:id/status           HR only

POST   /ai/rank-candidates/:jobId       HR only
POST   /ai/mock-interview/start         candidate only
POST   /ai/mock-interview/evaluate      candidate only
POST   /ai/profile-review               candidate only

GET    /admin/users                     admin only
PATCH  /admin/users/:id/toggle          admin only
GET    /admin/jobs                      admin only
PATCH  /admin/jobs/:id/toggle           admin only
GET    /admin/analytics                 admin only

GET    /health                          public
```
