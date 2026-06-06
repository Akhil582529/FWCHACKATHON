import { useState, useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
import { jobsAPI, interviewAPI, aiAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import styles from "./HRDashboard.module.css";

function StatCard({ icon, label, value, color }) {
  return (
    <div className={styles.statCard} style={{ "--c": color }}>
      <span className={styles.statIcon}>{icon}</span>
      <div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview({ jobs, interviews, onTabChange }) {
  const totalApplicants = jobs.reduce((s, j) => s + j.applicants.length, 0);
  const shortlisted = jobs.reduce((s, j) => s + j.applicants.filter((a) => a.status === "shortlisted").length, 0);

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>HR Overview</h2>
      <div className={styles.statsRow}>
        <StatCard icon="💼" label="Jobs Posted"       value={jobs.length}         color="var(--hr-accent)" />
        <StatCard icon="👥" label="Total Applicants"  value={totalApplicants}     color="#2ec4b6" />
        <StatCard icon="⭐" label="Shortlisted"       value={shortlisted}         color="#22c55e" />
        <StatCard icon="📅" label="Interviews"        value={interviews.length}   color="#a78bfa" />
      </div>
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Recent Job Posts</h3>
          {jobs.slice(0, 4).length === 0
            ? <p className={styles.empty}>No jobs posted yet. <button className={styles.inlineBtn} onClick={() => onTabChange("post-job")}>Post one →</button></p>
            : jobs.slice(0, 4).map((j) => (
              <div key={j._id} className={styles.listItem}>
                <div>
                  <div className={styles.itemTitle}>{j.title}</div>
                  <div className={styles.itemSub}>{j.applicants.length} applicants · {j.company}</div>
                </div>
                <span className={`${styles.badge} ${j.isActive ? styles.active : styles.inactive}`}>{j.isActive ? "Active" : "Closed"}</span>
              </div>
            ))
          }
        </div>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Upcoming Interviews</h3>
          {interviews.slice(0, 4).length === 0
            ? <p className={styles.empty}>No interviews scheduled.</p>
            : interviews.slice(0, 4).map((iv) => (
              <div key={iv._id} className={styles.listItem}>
                <div>
                  <div className={styles.itemTitle}>{iv.candidate?.fullName || iv.candidate?.email}</div>
                  <div className={styles.itemSub}>{iv.job?.title} · {new Date(iv.scheduledAt).toLocaleDateString()}</div>
                </div>
                <span className={`${styles.badge} ${styles[iv.status]}`}>{iv.status}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ── Post Job ──────────────────────────────────────────────────────────────────
function PostJob({ onPosted }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", company: user?.companyId || "", description: "", skills: "", requirements: "", location: "Remote", salaryRange: "", type: "full-time" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title || !form.description || !form.company) { alert("Title, company and description required"); return; }
    setLoading(true);
    try {
      await jobsAPI.create({
        ...form,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        requirements: form.requirements.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setSuccess(true);
      onPosted();
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className={styles.section}>
      <div className={styles.card} style={{ maxWidth: 640 }}>
        <h2 className={styles.cardTitle}>➕ Post a New Job</h2>
        {[
          { k: "title",       label: "Job Title *",              placeholder: "e.g. Senior React Developer" },
          { k: "company",     label: "Company Name *",           placeholder: "Your company" },
          { k: "location",    label: "Location",                 placeholder: "Remote / Delhi / Mumbai" },
          { k: "salaryRange", label: "Salary Range",             placeholder: "e.g. ₹8L - ₹14L" },
          { k: "skills",      label: "Required Skills (CSV)",    placeholder: "React, Node.js, MongoDB" },
          { k: "requirements",label: "Requirements (CSV)",       placeholder: "3+ years exp, B.Tech" },
        ].map(({ k, label, placeholder }) => (
          <div key={k} className={styles.formGroup}>
            <label className={styles.label}>{label}</label>
            <input className={styles.input} placeholder={placeholder} value={form[k]} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
        <div className={styles.formGroup}>
          <label className={styles.label}>Job Type</label>
          <select className={styles.input} value={form.type} onChange={(e) => set("type", e.target.value)}>
            {["full-time","part-time","contract","internship"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Description *</label>
          <textarea className={styles.textarea} rows={5} placeholder="Describe the role, responsibilities..." value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <button className={styles.primaryBtn} onClick={submit} disabled={loading || success}>
          {success ? "✓ Job Posted!" : loading ? "Posting..." : "Post Job"}
        </button>
      </div>
    </div>
  );
}

// ── My Jobs ───────────────────────────────────────────────────────────────────
function MyJobs({ jobs, loading, onDelete, onTabChange }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>My Job Posts</h2>
        <button className={styles.primaryBtn} onClick={() => onTabChange("post-job")}>+ Post New</button>
      </div>
      {loading ? <div className={styles.loading}>Loading...</div> : jobs.length === 0
        ? <div className={styles.empty}>No jobs posted yet.</div>
        : jobs.map((job) => (
          <div key={job._id} className={styles.jobRow}>
            <div className={styles.jobRowLeft}>
              <div className={styles.jobTitle}>{job.title}</div>
              <div className={styles.jobMeta}>{job.company} · {job.location} · {job.type} · {job.applicants.length} applicants</div>
              <div className={styles.skillTags}>
                {job.skills?.slice(0,4).map((s) => <span key={s} className={styles.skillTag}>{s}</span>)}
              </div>
            </div>
            <div className={styles.jobRowRight}>
              <span className={`${styles.badge} ${job.isActive ? styles.active : styles.inactive}`}>{job.isActive ? "Active" : "Closed"}</span>
              <button className={styles.dangerBtn} onClick={() => onDelete(job._id)}>Delete</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── All Candidates ────────────────────────────────────────────────────────────
function Candidates({ jobs }) {
  const allApplicants = jobs.flatMap((j) =>
    j.applicants.map((a) => ({ ...a, jobTitle: j.title, jobId: j._id }))
  );
  const [search, setSearch] = useState("");
  const filtered = allApplicants.filter((a) =>
    (a.candidate?.fullName || a.candidate?.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.section}>
      <div className={styles.searchBar}>
        <span>🔍</span>
        <input placeholder="Search candidates..." value={search} onChange={(e) => setSearch(e.target.value)} className={styles.searchInput} />
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Name</th><th>Email</th><th>Applied For</th><th>Skills</th><th>Status</th><th>AI Score</th><th>Resume</th></tr></thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={i}>
                <td className={styles.bold}>{a.candidate?.fullName || "—"}</td>
                <td>{a.candidate?.email}</td>
                <td>{a.jobTitle}</td>
                <td>
                  <div className={styles.skillTags}>
                    {a.candidate?.skills?.slice(0,3).map((s) => <span key={s} className={styles.skillTag}>{s}</span>)}
                  </div>
                </td>
                <td><span className={`${styles.badge} ${styles[a.status]}`}>{a.status}</span></td>
                <td>{a.aiScore != null ? <span className={styles.aiScore}>{a.aiScore}</span> : "—"}</td>
                <td>{a.candidate?.resumeUrl ? <a href={a.candidate.resumeUrl} target="_blank" rel="noreferrer" className={styles.inlineBtn}>View ↗</a> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className={styles.empty}>No candidates found.</p>}
      </div>
    </div>
  );
}

// ── Schedule Interviews ───────────────────────────────────────────────────────
function Interviews({ interviews, jobs, onScheduled, onRefresh }) {
  const [form, setForm] = useState({ candidateId: "", jobId: "", scheduledAt: "", mode: "online", meetLink: "", notes: "" });
  const [loading, setLoading]     = useState(false);
  const [updating, setUpdating]   = useState(null);
  const [evaluating, setEvaluating] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const allCandidates = jobs.flatMap((j) =>
    j.applicants.map((a) => ({ ...a.candidate, jobId: j._id, jobTitle: j.title }))
  ).filter((c, i, arr) => arr.findIndex((x) => x._id === c._id) === i);

  const submit = async () => {
    if (!form.candidateId || !form.jobId || !form.scheduledAt) { alert("Fill all required fields"); return; }
    setLoading(true);
    try { await interviewAPI.schedule(form); onScheduled(); alert("Interview scheduled!"); }
    catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try { await interviewAPI.updateStatus(id, status); onRefresh(); }
    catch (e) { alert(e.message); }
    finally { setUpdating(null); }
  };

  const evaluate = async (id) => {
    setEvaluating(id);
    try { await aiAPI.evaluateInterview(id); onRefresh(); }
    catch (e) { alert(e.message); }
    finally { setEvaluating(null); }
  };

  const statusColor = (s) => s === "completed" ? { bg: "#22c55e22", fg: "#22c55e" } : s === "cancelled" ? { bg: "#ef444422", fg: "#ef4444" } : { bg: "#3b82f622", fg: "#3b82f6" };
  const recColor = { hire: "#22c55e", consider: "#f59e0b", pass: "#ef4444" };

  return (
    <div className={styles.section}>
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>📅 Schedule Interview</h3>
          <div className={styles.formGroup}>
            <label className={styles.label}>Candidate *</label>
            <select className={styles.input} value={form.candidateId} onChange={(e) => set("candidateId", e.target.value)}>
              <option value="">Select candidate</option>
              {allCandidates.map((c) => <option key={c._id} value={c._id}>{c.fullName || c.email}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Job *</label>
            <select className={styles.input} value={form.jobId} onChange={(e) => set("jobId", e.target.value)}>
              <option value="">Select job</option>
              {jobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Date & Time *</label>
            <input type="datetime-local" className={styles.input} value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Mode</label>
            <select className={styles.input} value={form.mode} onChange={(e) => set("mode", e.target.value)}>
              {["online","in-person","phone"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Meet Link <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(auto-generated for online)</span></label>
            <input className={styles.input} placeholder="Leave blank to auto-generate Jitsi link" value={form.meetLink} onChange={(e) => set("meetLink", e.target.value)} />
          </div>
          <button className={styles.primaryBtn} onClick={submit} disabled={loading}>{loading ? "Scheduling..." : "Schedule Interview"}</button>
        </div>

        <div className={styles.card} style={{ overflowY: "auto", maxHeight: 580 }}>
          <h3 className={styles.cardTitle}>Scheduled Interviews</h3>
          {interviews.length === 0 ? <p className={styles.empty}>No interviews yet.</p>
            : interviews.map((iv) => {
              const sc = statusColor(iv.status);
              const isBusy = updating === iv._id || evaluating === iv._id;
              return (
                <div key={iv._id} style={{ borderBottom: "1px solid #2d2d2d", paddingBottom: 14, marginBottom: 14 }}>
                  <div className={styles.listItem} style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div className={styles.itemTitle}>{iv.candidate?.fullName || iv.candidate?.email}</div>
                      <div className={styles.itemSub}>{iv.job?.title} · {new Date(iv.scheduledAt).toLocaleString()}</div>
                      <div className={styles.itemSub}>
                        {iv.mode}
                        {iv.meetLink && <a href={iv.meetLink} target="_blank" rel="noreferrer" className={styles.inlineBtn} style={{ marginLeft: 8 }}>Join →</a>}
                      </div>
                    </div>
                    <span className={styles.badge} style={{ background: sc.bg, color: sc.fg }}>{iv.status}</span>
                  </div>

                  {/* Score display */}
                  {iv.mockScore != null && (
                    <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      <span className={styles.itemSub}>Overall <strong style={{ color: "#e2e8f0" }}>{iv.mockScore}/100</strong></span>
                      {iv.technicalScore     != null && <span className={styles.itemSub}>Tech <strong style={{ color: "#e2e8f0" }}>{iv.technicalScore}/100</strong></span>}
                      {iv.communicationScore != null && <span className={styles.itemSub}>Comm <strong style={{ color: "#e2e8f0" }}>{iv.communicationScore}/100</strong></span>}
                      {iv.confidenceScore    != null && <span className={styles.itemSub}>Conf <strong style={{ color: "#e2e8f0" }}>{iv.confidenceScore}/100</strong></span>}
                      {iv.candidate?.roleReadinessScore != null && (
                        <span className={styles.itemSub}>🎯 Readiness <strong style={{ color: "#22c55e" }}>{iv.candidate.roleReadinessScore}/100</strong></span>
                      )}
                      {iv.recommendation && (
                        <span className={styles.badge} style={{ color: recColor[iv.recommendation] || "#e2e8f0" }}>
                          {iv.recommendation.toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                  {iv.mockFeedback && <p className={styles.itemSub} style={{ marginTop: 6, fontStyle: "italic" }}>{iv.mockFeedback}</p>}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {iv.status === "scheduled" && (
                      <>
                        <button className={styles.successBtn} onClick={() => updateStatus(iv._id, "completed")} disabled={isBusy}>
                          {updating === iv._id ? "..." : "Complete"}
                        </button>
                        <button className={styles.dangerBtn} onClick={() => updateStatus(iv._id, "cancelled")} disabled={isBusy}>
                          {updating === iv._id ? "..." : "Cancel"}
                        </button>
                      </>
                    )}
                    {iv.status === "completed" && iv.mockScore == null && (
                      <button className={styles.aiBtn} onClick={() => evaluate(iv._id)} disabled={isBusy}>
                        {evaluating === iv._id ? "Evaluating..." : "✨ AI Evaluate"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

// ── AI Ranking ────────────────────────────────────────────────────────────────
function AIRanking({ jobs }) {
  const [selectedJob, setSelectedJob] = useState("");
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);

  const rank = async () => {
    if (!selectedJob) { alert("Select a job first"); return; }
    setLoading(true);
    try {
      const d = await aiAPI.rankCandidates(selectedJob);
      setRankings(d.rankings);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const scoreColor = (s) => s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className={styles.section}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>🤖 Gemini AI Candidate Ranking</h2>
        <p className={styles.cardSub}>Select a job to let Gemini AI analyze and rank all applicants by fit, scoring them 0–100.</p>
        <div className={styles.rankControls}>
          <select className={styles.input} style={{ flex: 1 }} value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}>
            <option value="">Select a job to rank candidates</option>
            {jobs.map((j) => <option key={j._id} value={j._id}>{j.title} ({j.applicants.length} applicants)</option>)}
          </select>
          <button className={styles.aiBtn} onClick={rank} disabled={loading || !selectedJob}>
            {loading ? "Analyzing..." : "✨ Rank with AI"}
          </button>
        </div>
      </div>

      {rankings.length > 0 && (
        <div className={styles.rankList}>
          {rankings.map((r, i) => (
            <div key={r.id} className={styles.rankCard}>
              <div className={styles.rankPosition}>#{i + 1}</div>
              <div className={styles.rankInfo}>
                <div className={styles.rankName}>{r.name}</div>
                <p className={styles.rankSummary}>{r.summary}</p>
                <div className={styles.rankDetails}>
                  <div>
                    <div className={styles.rankDetailTitle}>✅ Strengths</div>
                    {r.strengths?.map((s, j) => <div key={j} className={styles.strengthItem}>• {s}</div>)}
                  </div>
                  <div>
                    <div className={styles.rankDetailTitle}>⚠️ Gaps</div>
                    {r.gaps?.map((g, j) => <div key={j} className={styles.gapItem}>• {g}</div>)}
                  </div>
                </div>
              </div>
              <div className={styles.rankScore} style={{ color: scoreColor(r.score) }}>
                <span className={styles.rankScoreNum}>{r.score}</span>
                <span className={styles.rankScoreLabel}>/100</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main HR Dashboard ─────────────────────────────────────────────────────────
export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [jobs, setJobs] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const fetchJobs = () => {
    setLoadingJobs(true);
    jobsAPI.getMy().then((d) => setJobs(d.jobs)).finally(() => setLoadingJobs(false));
  };
  const fetchInterviews = () => interviewAPI.getHR().then((d) => setInterviews(d.interviews));

  useEffect(() => { fetchJobs(); fetchInterviews(); }, []);

  const deleteJob = async (id) => {
    if (!confirm("Delete this job?")) return;
    await jobsAPI.delete(id);
    fetchJobs();
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview"   && <Overview jobs={jobs} interviews={interviews} onTabChange={setActiveTab} />}
      {activeTab === "post-job"   && <PostJob onPosted={fetchJobs} />}
      {activeTab === "my-jobs"    && <MyJobs jobs={jobs} loading={loadingJobs} onDelete={deleteJob} onTabChange={setActiveTab} />}
      {activeTab === "candidates" && <Candidates jobs={jobs} />}
      {activeTab === "interviews" && <Interviews interviews={interviews} jobs={jobs} onScheduled={fetchInterviews} onRefresh={fetchInterviews} />}
      {activeTab === "ai-ranking" && <AIRanking jobs={jobs} />}
    </DashboardLayout>
  );
}