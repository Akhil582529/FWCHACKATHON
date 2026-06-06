const BASE_URL = "https://fwchackathon.onrender.com/api";

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem("talentos_token");
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    if (data.errors?.length) throw new Error(data.errors.map((e) => e.message).join(" · "));
    throw new Error(data.message || "Something went wrong");
  }
  return data;
};

export const authAPI = {
  login:    (p) => request("/auth/login",    { method: "POST", body: JSON.stringify(p) }),
  register: (p) => request("/auth/register", { method: "POST", body: JSON.stringify(p) }),
  getMe:    ()  => request("/auth/me"),
  logout:   ()  => request("/auth/logout",   { method: "POST" }),
};

export const jobsAPI = {
  getAll:     ()   => request("/jobs"),
  getMy:      ()   => request("/jobs/my"),
  getApplied: ()   => request("/jobs/applied"),
  create:     (p)  => request("/jobs",            { method: "POST",   body: JSON.stringify(p) }),
  delete:     (id) => request(`/jobs/${id}`,       { method: "DELETE" }),
  apply:      (id) => request(`/jobs/${id}/apply`, { method: "POST"   }),
};

export const candidateAPI = {
  getProfile:    ()  => request("/candidate/profile"),
  updateProfile: (p) => request("/candidate/profile", { method: "PUT", body: JSON.stringify(p) }),
  getOnboarding: ()  => request("/candidate/onboarding"),
};

export const interviewAPI = {
  schedule:          (p)          => request("/interviews",                    { method: "POST",  body: JSON.stringify(p) }),
  getHR:             ()           => request("/interviews/hr"),
  getCandidate:      ()           => request("/interviews/candidate"),
  updateStatus:      (id, status) => request(`/interviews/${id}/status`,       { method: "PATCH", body: JSON.stringify({ status }) }),
  submitAnswers:     (id, answers) => request(`/interviews/${id}/answers`,     { method: "PATCH", body: JSON.stringify({ answers }) }),
};

export const aiAPI = {
  rankCandidates:             (jobId) => request(`/ai/rank-candidates/${jobId}`,   { method: "POST" }),
  startMockInterview:         (p)     => request("/ai/mock-interview/start",        { method: "POST", body: JSON.stringify(p) }),
  evaluateMockInterview:      (p)     => request("/ai/mock-interview/evaluate",     { method: "POST", body: JSON.stringify(p) }),
  reviewProfile:              ()      => request("/ai/profile-review",              { method: "POST" }),
  generateInterviewQuestions: (id)    => request(`/ai/interview-questions/${id}`,   { method: "POST" }),
  evaluateInterview:          (id)    => request(`/ai/evaluate-interview/${id}`,    { method: "POST" }),
};

export const adminAPI = {
  getUsers:     (params = "") => request(`/admin/users${params}`),
  toggleUser:   (id)          => request(`/admin/users/${id}/toggle`, { method: "PATCH" }),
  getAnalytics: ()            => request("/admin/analytics"),
  getAllJobs:    ()            => request("/admin/jobs"),
  toggleJob:    (id)          => request(`/admin/jobs/${id}/toggle`,  { method: "PATCH" }),
};

export const saveToken  = (t) => localStorage.setItem("talentos_token", t);
export const clearToken = ()  => localStorage.removeItem("talentos_token");
export const getToken   = ()  => localStorage.getItem("talentos_token");