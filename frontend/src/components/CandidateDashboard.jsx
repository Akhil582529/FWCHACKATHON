import { useState, useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
// To:
import { jobsAPI, candidateAPI, interviewAPI, aiAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import styles from "./CandidateDashboard.module.css";

// ── Stat Card ──────────────────────────────────────────────────────────────────
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

// ── Overview Tab ───────────────────────────────────────────────────────────────
function Overview({ user, appliedJobs, interviews, onTabChange }) {
  const [profileReview, setProfileReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const runReview = async () => {
    setReviewLoading(true);
    try { const d = await aiAPI.reviewProfile(); setProfileReview(d.review); }
    catch (e) { alert(e.message); }
    finally { setReviewLoading(false); }
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Welcome back, {user?.fullName || "Candidate"} 👋</h2>
      <div className={styles.statsRow}>
        <StatCard icon="💼" label="Jobs Applied"     value={appliedJobs.length}  color="var(--cand-accent)" />
        <StatCard icon="📅" label="Interviews"       value={interviews.length}   color="#a78bfa" />
        <StatCard icon="⭐" label="Profile Skills"   value={user?.skills?.length || 0} color="#f59e0b" />
        <StatCard icon="📄" label="Resume"           value={user?.resumeUrl ? "Uploaded" : "Missing"} color={user?.resumeUrl ? "#22c55e" : "#ef4444"} />
      </div>

      <div className={styles.twoCol}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Recent Applications</h3>
          {appliedJobs.slice(0, 4).length === 0
            ? <p className={styles.empty}>No applications yet. <button className={styles.inlineBtn} onClick={() => onTabChange("jobs")}>Browse jobs →</button></p>
            : appliedJobs.slice(0, 4).map((j) => (
              <div key={j._id} className={styles.listItem}>
                <div>
                  <div className={styles.itemTitle}>{j.title}</div>
                  <div className={styles.itemSub}>{j.company} · {j.location}</div>
                </div>
                <span className={`${styles.badge} ${styles[j.status]}`}>{j.status}</span>
              </div>
            ))
          }
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>AI Profile Review</h3>
          {profileReview ? (
            <div className={styles.aiReview}>
              <div className={styles.scoreCircle} style={{ "--s": profileReview.profileScore }}>
                <span className={styles.scoreNum}>{profileReview.profileScore}</span>
                <span className={styles.scoreLabel}>Score</span>
              </div>
              <p className={styles.aiSummary}>{profileReview.summary}</p>
              <div className={styles.tips}>
                {profileReview.tips?.map((t, i) => <div key={i} className={styles.tip}>💡 {t}</div>)}
              </div>
            </div>
          ) : (
            <div className={styles.aiPrompt}>
              <p>Get AI-powered feedback on your profile to stand out to recruiters.</p>
              <button className={styles.aiBtn} onClick={runReview} disabled={reviewLoading}>
                {reviewLoading ? "Analyzing..." : "✨ Analyze My Profile"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Browse Jobs Tab ────────────────────────────────────────────────────────────
function BrowseJobs({ appliedJobIds }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    jobsAPI.getAll().then((d) => setJobs(d.jobs)).finally(() => setLoading(false));
  }, []);

  const apply = async (id) => {
    setApplying(id);
    try { await jobsAPI.apply(id); alert("Applied successfully!"); }
    catch (e) { alert(e.message); }
    finally { setApplying(null); }
  };

  const filtered = jobs.filter(
    (j) => j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.section}>
      <div className={styles.searchBar}>
        <span>🔍</span>
        <input placeholder="Search jobs or companies..." value={search} onChange={(e) => setSearch(e.target.value)} className={styles.searchInput} />
      </div>
      {loading ? <div className={styles.loading}>Loading jobs...</div> : (
        <div className={styles.jobGrid}>
          {filtered.map((job) => {
            const applied = appliedJobIds.includes(job._id);
            return (
              <div key={job._id} className={styles.jobCard}>
                <div className={styles.jobHeader}>
                  <div>
                    <div className={styles.jobTitle}>{job.title}</div>
                    <div className={styles.jobCompany}>{job.company} · {job.location}</div>
                  </div>
                  <span className={styles.jobType}>{job.type}</span>
                </div>
                <p className={styles.jobDesc}>{job.description?.substring(0, 120)}...</p>
                <div className={styles.skillTags}>
                  {job.skills?.slice(0, 4).map((s) => <span key={s} className={styles.skillTag}>{s}</span>)}
                </div>
                <div className={styles.jobFooter}>
                  {job.salaryRange && <span className={styles.salary}>💰 {job.salaryRange}</span>}
                  <button
                    className={`${styles.applyBtn} ${applied ? styles.appliedBtn : ""}`}
                    onClick={() => !applied && apply(job._id)}
                    disabled={applied || applying === job._id}
                  >
                    {applied ? "✓ Applied" : applying === job._id ? "Applying..." : "Apply Now"}
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className={styles.empty}>No jobs found.</p>}
        </div>
      )}
    </div>
  );
}

// ── Applied Jobs Tab ───────────────────────────────────────────────────────────
function AppliedJobs({ jobs, loading }) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Your Applications</h2>
      {loading ? <div className={styles.loading}>Loading...</div> : jobs.length === 0
        ? <div className={styles.empty}>You haven't applied to any jobs yet.</div>
        : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Job Title</th><th>Company</th><th>Location</th><th>Type</th><th>Applied</th><th>Status</th><th>AI Score</th></tr></thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j._id}>
                    <td className={styles.bold}>{j.title}</td>
                    <td>{j.company}</td>
                    <td>{j.location}</td>
                    <td>{j.type}</td>
                    <td>{new Date(j.appliedAt).toLocaleDateString()}</td>
                    <td><span className={`${styles.badge} ${styles[j.status]}`}>{j.status}</span></td>
                    <td>{j.aiScore != null ? <span className={styles.aiScore}>{j.aiScore}</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}

// ── Mock Interview Tab ─────────────────────────────────────────────────────────
function MockInterview() {
  const [step, setStep] = useState("setup"); // setup | interview | results
  const [jobTitle, setJobTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);

  const start = async () => {
    if (!jobTitle) { alert("Enter a job title"); return; }
    setLoading(true);
    try {
      const d = await aiAPI.startMockInterview({ jobTitle, skills });
      setQuestions(d.questions);
      setAnswers(new Array(d.questions.length).fill(""));
      setCurrent(0);
      setStep("interview");
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const d = await aiAPI.evaluateMockInterview({ jobTitle, questions, answers });
      setEvaluation(d.evaluation);
      setStep("results");
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const gradeColor = { A: "#22c55e", B: "#84cc16", C: "#f59e0b", D: "#f97316", F: "#ef4444" };

  return (
    <div className={styles.section}>
      {step === "setup" && (
        <div className={styles.card} style={{ maxWidth: 560 }}>
          <h2 className={styles.cardTitle}>🎤 AI Mock Interview</h2>
          <p className={styles.cardSub}>Gemini will generate role-specific questions and evaluate your answers.</p>
          <div className={styles.formGroup}>
            <label className={styles.label}>Job Title *</label>
            <input className={styles.input} placeholder="e.g. Frontend Developer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Your Skills (comma separated)</label>
            <input className={styles.input} placeholder="e.g. React, Node.js, MongoDB" value={skills} onChange={(e) => setSkills(e.target.value)} />
          </div>
          <button className={styles.primaryBtn} onClick={start} disabled={loading}>
            {loading ? "Generating Questions..." : "Start Interview →"}
          </button>
        </div>
      )}

      {step === "interview" && (
        <div className={styles.card} style={{ maxWidth: 680 }}>
          <div className={styles.qProgress}>Question {current + 1} of {questions.length}</div>
          <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div>
          <h3 className={styles.question}>{questions[current]}</h3>
          <textarea
            className={styles.answerBox}
            placeholder="Type your answer here..."
            value={answers[current]}
            onChange={(e) => { const a = [...answers]; a[current] = e.target.value; setAnswers(a); }}
            rows={5}
          />
          <div className={styles.navBtns}>
            {current > 0 && <button className={styles.secBtn} onClick={() => setCurrent(c => c - 1)}>← Previous</button>}
            {current < questions.length - 1
              ? <button className={styles.primaryBtn} onClick={() => setCurrent(c => c + 1)}>Next →</button>
              : <button className={styles.primaryBtn} onClick={submit} disabled={loading}>{loading ? "Evaluating..." : "Submit & Get Results"}</button>
            }
          </div>
        </div>
      )}

      {step === "results" && evaluation && (
        <div className={styles.resultsWrap}>
          <div className={styles.scoreHeader}>
            <div className={styles.bigScore} style={{ color: gradeColor[evaluation.grade] }}>
              {evaluation.overallScore}<span style={{ fontSize: 24 }}>/100</span>
            </div>
            <div className={styles.grade} style={{ background: gradeColor[evaluation.grade] }}>{evaluation.grade}</div>
            <p className={styles.evalSummary}>{evaluation.summary}</p>
            <span className={`${styles.badge} ${evaluation.recommendation === "hire" ? styles.shortlisted : evaluation.recommendation === "consider" ? styles.reviewed : styles.rejected}`}>
              {evaluation.recommendation?.toUpperCase()}
            </span>
          </div>
          <div className={styles.twoCol}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>✅ Strengths</h3>
              {evaluation.strengths?.map((s, i) => <div key={i} className={styles.strengthItem}>• {s}</div>)}
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>📈 Areas to Improve</h3>
              {evaluation.improvements?.map((s, i) => <div key={i} className={styles.improvItem}>• {s}</div>)}
            </div>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Per-Question Feedback</h3>
            {evaluation.feedback?.map((f, i) => (
              <div key={i} className={styles.qFeedback}>
                <div className={styles.qFeedbackHeader}>
                  <span>Q{i+1}: {f.question}</span>
                  <span className={styles.qScore}>{f.score}/20</span>
                </div>
                <p className={styles.qFeedbackText}>{f.feedback}</p>
              </div>
            ))}
          </div>
          <button className={styles.secBtn} onClick={() => { setStep("setup"); setEvaluation(null); }}>Try Again</button>
        </div>
      )}
    </div>
  );
}

// ── Interview Tab ──────────────────────────────────────────────────────────────
function InterviewTab({ interviews, onRefresh }) {
  const [generatingFor, setGeneratingFor] = useState(null);
  const [submittingFor, setSubmittingFor] = useState(null);
  const [draftAnswers, setDraftAnswers]   = useState({});

  const generateQuestions = async (id) => {
    setGeneratingFor(id);
    try { await aiAPI.generateInterviewQuestions(id); onRefresh(); }
    catch (e) { alert(e.message); }
    finally { setGeneratingFor(null); }
  };

  const submitAnswers = async (id, questionCount) => {
    const answers = draftAnswers[id] || new Array(questionCount).fill("");
    setSubmittingFor(id);
    try { await interviewAPI.submitAnswers(id, answers); onRefresh(); }
    catch (e) { alert(e.message); }
    finally { setSubmittingFor(null); }
  };

  const setAnswer = (interviewId, index, value, questionCount) => {
    setDraftAnswers((prev) => {
      const arr = [...(prev[interviewId] || new Array(questionCount).fill(""))];
      arr[index] = value;
      return { ...prev, [interviewId]: arr };
    });
  };

  const recColor = { hire: "#22c55e", consider: "#f59e0b", pass: "#ef4444" };

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>My Scheduled Interviews</h2>

      {interviews.length === 0 ? (
        <p className={styles.empty}>No interviews scheduled yet.</p>
      ) : (
        interviews.map((iv) => (
          <div key={iv._id} className={styles.card} style={{ marginBottom: 16 }}>
            {/* Header row */}
            <div className={styles.listItem}>
              <div>
                <div className={styles.itemTitle}>{iv.job?.title} — {iv.job?.company}</div>
                <div className={styles.itemSub}>
                  {new Date(iv.scheduledAt).toLocaleString()} · {iv.mode}
                </div>
                {iv.meetLink && (
                  <a href={iv.meetLink} target="_blank" rel="noreferrer" className={styles.inlineBtn}>
                    Join Video Call →
                  </a>
                )}
              </div>
              <span className={styles.badge} style={{
                background: iv.status === "completed" ? "#22c55e22" : iv.status === "cancelled" ? "#ef444422" : "#3b82f622",
                color:      iv.status === "completed" ? "#22c55e"   : iv.status === "cancelled" ? "#ef4444"   : "#3b82f6",
              }}>{iv.status}</span>
            </div>

            {/* Score display (after evaluation) */}
            {iv.mockScore != null && (
              <div style={{ marginTop: 12, padding: "12px 0", borderTop: "1px solid #2d2d2d" }}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                  <span className={styles.itemSub}>Overall <strong style={{ color: "#e2e8f0" }}>{iv.mockScore}/100</strong></span>
                  {iv.technicalScore     != null && <span className={styles.itemSub}>Technical <strong style={{ color: "#e2e8f0" }}>{iv.technicalScore}/100</strong></span>}
                  {iv.communicationScore != null && <span className={styles.itemSub}>Communication <strong style={{ color: "#e2e8f0" }}>{iv.communicationScore}/100</strong></span>}
                  {iv.confidenceScore    != null && <span className={styles.itemSub}>Confidence <strong style={{ color: "#e2e8f0" }}>{iv.confidenceScore}/100</strong></span>}
                  {iv.recommendation && (
                    <span className={styles.badge} style={{ color: recColor[iv.recommendation] || "#e2e8f0" }}>
                      {iv.recommendation.toUpperCase()}
                    </span>
                  )}
                </div>
                {iv.mockFeedback && <p className={styles.itemSub}>{iv.mockFeedback}</p>}
              </div>
            )}

            {/* Questions / answers section */}
            {iv.mockQuestions.length === 0 ? (
              <button
                className={styles.aiBtn}
                style={{ marginTop: 12 }}
                onClick={() => generateQuestions(iv._id)}
                disabled={generatingFor === iv._id}
              >
                {generatingFor === iv._id ? "Generating..." : "✨ Generate Interview Questions"}
              </button>
            ) : iv.mockAnswers.length === 0 ? (
              <div style={{ marginTop: 12 }}>
                <div className={styles.cardTitle}>Answer the Questions</div>
                {iv.mockQuestions.map((q, i) => (
                  <div key={i} className={styles.formGroup}>
                    <label className={styles.label}>Q{i + 1}: {q}</label>
                    <textarea
                      className={styles.answerBox}
                      rows={3}
                      placeholder="Type your answer..."
                      value={(draftAnswers[iv._id] || [])[i] || ""}
                      onChange={(e) => setAnswer(iv._id, i, e.target.value, iv.mockQuestions.length)}
                    />
                  </div>
                ))}
                <button
                  className={styles.primaryBtn}
                  onClick={() => submitAnswers(iv._id, iv.mockQuestions.length)}
                  disabled={submittingFor === iv._id}
                >
                  {submittingFor === iv._id ? "Saving..." : "Submit Answers"}
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <div className={styles.cardTitle}>Submitted Answers</div>
                {iv.mockQuestions.map((q, i) => (
                  <div key={i} className={styles.qFeedback}>
                    <div className={styles.qFeedbackHeader}><span>Q{i + 1}: {q}</span></div>
                    <p className={styles.qFeedbackText}>{iv.mockAnswers[i] || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      <div style={{ margin: "32px 0 16px", borderTop: "1px solid #2d2d2d", paddingTop: 24 }}>
        <h2 className={styles.sectionTitle}>🎤 Mock Interview Practice</h2>
      </div>
      <MockInterview />
    </div>
  );
}

// ── Profile Tab ────────────────────────────────────────────────────────────────
function ProfileTab({ user, onUpdate }) {
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [skillInput, setSkillInput] = useState(user?.skills?.join(", ") || "");
  const [resumeUrl, setResumeUrl] = useState(user?.resumeUrl || "");
  const [resumeText, setResumeText] = useState(user?.resumeText || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const d = await candidateAPI.updateProfile({ fullName, skills: skillInput, resumeUrl, resumeText });
      onUpdate(d.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className={styles.section}>
      <div className={styles.card} style={{ maxWidth: 580 }}>
        <h2 className={styles.cardTitle}>👤 My Profile</h2>
        <div className={styles.formGroup}>
          <label className={styles.label}>Full Name</label>
          <input className={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Skills (comma separated)</label>
          <input className={styles.input} value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="React, Node.js, Python..." />
          <div className={styles.skillTags} style={{ marginTop: 8 }}>
            {skillInput.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
              <span key={s} className={styles.skillTag}>{s}</span>
            ))}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Resume / Profile Summary</label>
          <textarea
            className={styles.textarea}
            rows={6}
            placeholder="Paste your resume, LinkedIn summary, or key experience here. This is what AI uses to rank you for jobs."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Resume URL</label>
          <input className={styles.input} value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} placeholder="https://drive.google.com/..." />
          {resumeUrl && <a href={resumeUrl} target="_blank" rel="noreferrer" className={styles.inlineBtn}>View Resume ↗</a>}
        </div>
        <button className={styles.primaryBtn} onClick={save} disabled={saving}>
          {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function CandidateDashboard() {
  const { user, handleLoginSuccess } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const fetchInterviews = () => interviewAPI.getCandidate().then((d) => setInterviews(d.interviews));

  useEffect(() => {
    jobsAPI.getApplied().then((d) => setAppliedJobs(d.jobs)).finally(() => setLoadingJobs(false));
    fetchInterviews();
  }, []);

  const appliedJobIds = appliedJobs.map((j) => j._id);

  const handleUserUpdate = (updatedUser) => {
    // update context via handleLoginSuccess trick — just refresh
    window.location.reload();
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview"  && <Overview user={user} appliedJobs={appliedJobs} interviews={interviews} onTabChange={setActiveTab} />}
      {activeTab === "jobs"      && <BrowseJobs appliedJobIds={appliedJobIds} />}
      {activeTab === "applied"   && <AppliedJobs jobs={appliedJobs} loading={loadingJobs} />}
      {activeTab === "interview" && <InterviewTab interviews={interviews} onRefresh={fetchInterviews} />}
      {activeTab === "profile"   && <ProfileTab user={user} onUpdate={handleUserUpdate} />}
    </DashboardLayout>
  );
}