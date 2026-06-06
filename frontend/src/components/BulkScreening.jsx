import { useState, useEffect, useRef } from "react";
import { bulkScreeningAPI } from "../services/api";
import styles from "./BulkScreening.module.css";

// ── 14-Factor framework definition ───────────────────────────────────────────
const FACTORS = [
  { key: "skillMatch",             label: "Skill Match",                    max: 15 },
  { key: "relevantExperience",     label: "Relevant Experience",            max: 12 },
  { key: "educationQualification", label: "Education Qualification",        max:  8 },
  { key: "certifications",         label: "Certifications",                 max:  5 },
  { key: "industryExperience",     label: "Industry Experience",            max:  7 },
  { key: "projectExperience",      label: "Project Experience",             max:  8 },
  { key: "technicalCompetency",    label: "Technical Competency",           max: 10 },
  { key: "domainKnowledge",        label: "Domain Knowledge",               max:  7 },
  { key: "roleRelevance",          label: "Role Relevance",                 max:  8 },
  { key: "achievementsImpact",     label: "Achievements & Impact",          max:  5 },
  { key: "careerStability",        label: "Career Stability",               max:  4 },
  { key: "communicationQuality",   label: "Communication & Resume Quality", max:  4 },
  { key: "leadershipExperience",   label: "Leadership Experience",          max:  4 },
  { key: "learningAgility",        label: "Learning Agility",               max:  3 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const recClass = (r) => {
  if (r === "Strong Hire") return styles["recBadge"] + " " + styles["strongHire"];
  if (r === "Hire")        return styles["recBadge"] + " " + styles["hire"];
  if (r === "Consider")    return styles["recBadge"] + " " + styles["consider"];
  return styles["recBadge"] + " " + styles["reject"];
};

const statusClass = (s) =>
  styles["statusBadge"] + " " + (styles[s] || styles["pending"]);

const scoreClass = (score) => {
  if (score >= 75) return styles["scoreChip"] + " " + styles["high"];
  if (score >= 50) return styles["scoreChip"] + " " + styles["medium"];
  return styles["scoreChip"] + " " + styles["low"];
};

const fillClass = (pct) => {
  if (pct >= 0.75) return styles["factorFill"] + " " + styles["great"];
  if (pct >= 0.5)  return styles["factorFill"] + " " + styles["good"];
  if (pct >= 0.25) return styles["factorFill"] + " " + styles["mid"];
  return styles["factorFill"] + " " + styles["low"];
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const initials = (name, email) =>
  (name || email || "?")[0].toUpperCase();

// ── PAGE 4 — Screening History ────────────────────────────────────────────────
function ScreeningHistory({ onOpen, onNewSession }) {
  const [sessions, setSessions]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    bulkScreeningAPI.getSessions()
      .then((d) => setSessions(d.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async (id, e) => {
    e.stopPropagation();
    setExporting(id);
    try { await bulkScreeningAPI.exportSession(id); }
    catch (err) { alert(err.message); }
    finally { setExporting(null); }
  };

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>
            🧬 <span>Workforce Intelligence</span> — Screening History
          </div>
          <div className={styles.pageSub}>
            All past AI screening sessions. Click a session to view ranked talent.
          </div>
        </div>
        <button className={styles.btnPrimary} onClick={onNewSession}>
          ＋ New Screening
        </button>
      </div>

      <div className={styles.card}>
        {loading ? (
          <table className={styles.table}>
            <thead>
              <tr>
                {["Job Title","Date","Status","Uploaded","Processed","Failed","Actions"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1,2,3].map(i => (
                <tr key={i} className={styles.skeletonRow}>
                  {[180,90,80,60,60,60,100].map((w,j) => (
                    <td key={j}><div className={styles.skeleton} style={{ width: w }} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : sessions.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🧬</div>
            <div className={styles.emptyTitle}>No screening sessions yet</div>
            <div className={styles.emptyText}>
              Upload a ZIP of resumes to run your first AI Workforce Intelligence analysis.
            </div>
            <button className={styles.btnPrimary} onClick={onNewSession}>
              Start First Screening
            </button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th>Processed</th>
                  <th>Failed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s._id} style={{ cursor: "pointer" }} onClick={() => onOpen(s._id)}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.jobTitle}</td>
                    <td>{fmtDate(s.createdAt)}</td>
                    <td>
                      <span className={`${styles.statusPill} ${styles[s.status] || ""}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>{s.totalUploaded ?? "—"}</td>
                    <td>{s.totalProcessed ?? "—"}</td>
                    <td style={{ color: s.totalFailed > 0 ? "#ef4444" : "var(--text-muted)" }}>
                      {s.totalFailed ?? "—"}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className={styles.actions}>
                        <button className={`${styles.actionBtn} ${styles.genome}`}
                          onClick={() => onOpen(s._id)}>
                          Open
                        </button>
                        <button className={`${styles.actionBtn} ${styles.reset}`}
                          disabled={exporting === s._id}
                          onClick={(e) => handleExport(s._id, e)}>
                          {exporting === s._id ? "…" : "Export"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── PAGE 1 — Upload Session ───────────────────────────────────────────────────
function UploadSession({ onSuccess, onBack }) {
  const [form, setForm]       = useState({ jobTitle: "", jobDescription: "", jobSkills: "", jobRequirements: "" });
  const [zipFile, setZipFile] = useState(null);
  const [dragOver, setDrag]   = useState(false);
  const [uploading, setUp]    = useState(false);
  const [error, setError]     = useState("");
  const fileRef               = useRef();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".zip")) setZipFile(f);
    else setError("Please drop a .zip file.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.jobTitle.trim())       return setError("Job title is required.");
    if (!form.jobDescription.trim()) return setError("Job description is required.");
    if (!zipFile)                    return setError("Please upload a ZIP file of resumes.");
    setError(""); setUp(true);

    const fd = new FormData();
    fd.append("jobTitle",       form.jobTitle.trim());
    fd.append("jobDescription", form.jobDescription.trim());
    fd.append("jobSkills",      form.jobSkills.trim());
    fd.append("jobRequirements",form.jobRequirements.trim());
    fd.append("zip",            zipFile);

    try {
      const data = await bulkScreeningAPI.createSession(fd);
      onSuccess(data);
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUp(false);
    }
  };

  if (uploading) {
    return (
      <div className={styles.root}>
        <div className={styles.card}>
          <div className={styles.uploadingState}>
            <div className={styles.spinner} />
            <div className={styles.uploadingTitle}>Running AI Workforce Intelligence Analysis…</div>
            <div className={styles.uploadingSteps}>
              Extracting resumes from ZIP<br />
              Parsing candidate profiles<br />
              Scoring across 14 factors<br />
              Ranking talent pool
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>
            🧬 <span>New Workforce Intelligence</span> Screening
          </div>
          <div className={styles.pageSub}>
            Upload up to 500 resumes. The AI evaluates every candidate across 14 factors.
          </div>
        </div>
        <button className={styles.btnGhost} onClick={onBack}>← History</button>
      </div>

      <div className={styles.intelBanner}>
        <div className={styles.intelIcon}>🤖</div>
        <div className={styles.intelText}>
          <strong>14-Factor Workforce Intelligence Engine</strong><br />
          Skill Match · Experience · Education · Certifications · Industry · Projects ·
          Technical Competency · Domain Knowledge · Role Relevance · Achievements ·
          Career Stability · Communication · Leadership · Learning Agility
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>Job Details</div>
          </div>
          <div className={styles.uploadGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Job Title *</label>
              <input className={styles.input} value={form.jobTitle}
                onChange={set("jobTitle")} placeholder="e.g. Senior Full Stack Developer" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Required Skills</label>
              <input className={styles.input} value={form.jobSkills}
                onChange={set("jobSkills")} placeholder="JavaScript, React, Node.js (comma separated)" />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>Job Description *</label>
              <textarea className={styles.textarea} value={form.jobDescription}
                onChange={set("jobDescription")}
                placeholder="Describe the role, responsibilities, and ideal candidate profile…"
                style={{ minHeight: 120 }} />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>Requirements</label>
              <textarea className={styles.textarea} value={form.jobRequirements}
                onChange={set("jobRequirements")}
                placeholder="One requirement per line: 5+ years experience, REST API design, AWS…"
                style={{ minHeight: 80 }} />
            </div>
          </div>
        </div>

        <div className={styles.card} style={{ marginTop: 16 }}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>Resume Upload</div>
          </div>
          <div
            className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
          >
            <input type="file" accept=".zip" ref={fileRef}
              onChange={(e) => setZipFile(e.target.files[0] || null)} />
            <div className={styles.dropIcon}>📦</div>
            {zipFile ? (
              <div className={styles.dropFile}>✓ {zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(1)} MB)</div>
            ) : (
              <div className={styles.dropText}>
                Drag & drop your <strong>.zip</strong> file here, or <strong>click to browse</strong><br />
                <span style={{ fontSize: 12, marginTop: 6, display: "block" }}>Max 50 MB · PDF resumes inside ZIP</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ color: "#ef4444", fontSize: 13, marginTop: 8, padding: "0 4px" }}>{error}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button type="submit" className={styles.btnPrimary} style={{ padding: "12px 32px", fontSize: 15 }}>
            🚀 Start AI Screening
          </button>
        </div>
      </form>
    </div>
  );
}

// ── PAGE 3 — Talent Genome View ───────────────────────────────────────────────
function TalentGenome({ candidate, onBack }) {
  const scores   = candidate.scores || {};
  const name     = candidate.name   || "Unknown";
  const total    = scores.total     || 0;

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>🧬 Talent <span>Genome</span></div>
          <div className={styles.pageSub}>14-Factor Workforce Intelligence Report</div>
        </div>
        <button className={styles.btnGhost} onClick={onBack}>← Back to Results</button>
      </div>

      <div className={styles.genomeShell}>
        {/* Left panel — profile */}
        <div className={styles.genomeProfile}>
          <div className={styles.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div className={styles.genomeAvatar}>{initials(candidate.name, candidate.email)}</div>
              <div>
                <div className={styles.genomeName}>{name}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                  Rank #{candidate.rank}
                </div>
              </div>
            </div>

            <div className={styles.genomeMeta}>
              {candidate.email && <span>✉ <strong>{candidate.email}</strong></span>}
              {candidate.phone && <span>📞 <strong>{candidate.phone}</strong></span>}
              {candidate.extractedEducation && candidate.extractedEducation !== "unknown" && (
                <span>🎓 <strong style={{ textTransform: "capitalize" }}>{candidate.extractedEducation}</strong></span>
              )}
              {candidate.extractedExperienceYears && (
                <span>🕒 <strong>{candidate.extractedExperienceYears} yrs experience</strong></span>
              )}
              {candidate.hasLeadership && <span>👑 <strong>Leadership signals detected</strong></span>}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.genomeScore}>
              <div>
                <div className={styles.scoreBig}>{total}</div>
                <div className={styles.scoreMax}>/100</div>
              </div>
              <div>
                <div className={recClass(candidate.recommendation)}>{candidate.recommendation}</div>
                <div className={styles.scoreLabel} style={{ marginTop: 8 }}>Composite Intelligence Score</div>
              </div>
            </div>
          </div>

          {(candidate.extractedCertifications?.length > 0) && (
            <div className={styles.card}>
              <div className={styles.divLabel}>Certifications</div>
              <div className={styles.tagList}>
                {candidate.extractedCertifications.map((c) => (
                  <span key={c} className={styles.tag}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {(candidate.skills?.length > 0) && (
            <div className={styles.card}>
              <div className={styles.divLabel}>Detected Skills</div>
              <div className={styles.tagList}>
                {candidate.skills.map((s) => (
                  <span key={s} className={styles.tag}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {(candidate.extractedIndustries?.length > 0) && (
            <div className={styles.card}>
              <div className={styles.divLabel}>Industry Signals</div>
              <div className={styles.tagList}>
                {candidate.extractedIndustries.map((i) => (
                  <span key={i} className={styles.tag}>{i}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel — intelligence breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {candidate.summary && (
            <div className={styles.card}>
              <div className={styles.divLabel} style={{ marginBottom: 10 }}>AI Assessment Summary</div>
              <div className={styles.summaryBox}>{candidate.summary}</div>
            </div>
          )}

          {((candidate.strengths?.length > 0) || (candidate.gaps?.length > 0)) && (
            <div className={styles.card}>
              <div className={styles.divLabel} style={{ marginBottom: 12 }}>Strengths & Gaps</div>
              <div className={styles.insightGrid}>
                <div className={`${styles.insightCard} ${styles.strengths}`}>
                  <div className={styles.insightTitle}>✓ Strengths</div>
                  {(candidate.strengths || []).map((s, i) => (
                    <div key={i} className={styles.insightItem}>{s}</div>
                  ))}
                  {(!candidate.strengths?.length) && (
                    <div className={styles.insightItem}>No notable strengths detected</div>
                  )}
                </div>
                <div className={`${styles.insightCard} ${styles.gaps}`}>
                  <div className={styles.insightTitle}>✕ Gaps</div>
                  {(candidate.gaps || []).map((g, i) => (
                    <div key={i} className={styles.insightItem}>{g}</div>
                  ))}
                  {(!candidate.gaps?.length) && (
                    <div className={styles.insightItem}>No significant gaps identified</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>14-Factor Workforce Intelligence Breakdown</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total: {total}/100</div>
            </div>
            <div className={styles.factorGrid}>
              {FACTORS.map((f) => {
                const val = scores[f.key] ?? 0;
                const pct = f.max > 0 ? val / f.max : 0;
                return (
                  <div key={f.key} className={styles.factorRow}>
                    <div className={styles.factorName}>{f.label}</div>
                    <div className={styles.factorBar}>
                      <div className={fillClass(pct)} style={{ width: `${pct * 100}%` }} />
                    </div>
                    <div className={styles.factorScore}>{val}/{f.max}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PAGE 2 — Session Results ──────────────────────────────────────────────────
function SessionResults({ sessionId, onViewGenome, onBack, onNewSession }) {
  const [session,    setSession]    = useState(null);
  const [stats,      setStats]      = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [exporting,  setExporting]  = useState(false);
  const [updating,   setUpdating]   = useState(null);
  const [filter,     setFilter]     = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [sessionData, candData] = await Promise.all([
        bulkScreeningAPI.getSession(sessionId),
        bulkScreeningAPI.getCandidates(sessionId, "?limit=100"),
      ]);
      setSession(sessionData.session);
      setStats(sessionData.stats);
      setCandidates(candData.candidates || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [sessionId]);

  const handleStatus = async (candidateId, status) => {
    setUpdating(candidateId);
    try {
      await bulkScreeningAPI.updateCandidateStatus(candidateId, status);
      setCandidates((prev) =>
        prev.map((c) => c._id === candidateId ? { ...c, status } : c)
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try { await bulkScreeningAPI.exportSession(sessionId); }
    catch (err) { alert(err.message); }
    finally { setExporting(false); }
  };

  const visible = filter === "all"
    ? candidates
    : candidates.filter((c) => c.status === filter);

  if (loading) {
    return (
      <div className={styles.root}>
        <div className={styles.card}>
          <div className={styles.uploadingState}>
            <div className={styles.spinner} />
            <div className={styles.uploadingTitle}>Loading Results…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>
            🧬 <span>{session?.jobTitle || "Screening Results"}</span>
          </div>
          <div className={styles.pageSub}>
            AI Workforce Intelligence — {candidates.length} candidates ranked
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={styles.btnGhost} onClick={onBack}>← History</button>
          <button className={styles.btnGhost} onClick={onNewSession}>＋ New</button>
          <button className={styles.btnAccent} onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting…" : "⬇ Export Excel"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard} style={{ "--c": "var(--hr-accent)" }}>
          <div className={styles.statValue}>{session?.totalUploaded ?? 0}</div>
          <div className={styles.statLabel}>Uploaded</div>
        </div>
        <div className={styles.statCard} style={{ "--c": "#2ec4b6" }}>
          <div className={styles.statValue}>{session?.totalProcessed ?? 0}</div>
          <div className={styles.statLabel}>Processed</div>
        </div>
        <div className={styles.statCard} style={{ "--c": "#ef4444" }}>
          <div className={styles.statValue}>{session?.totalFailed ?? 0}</div>
          <div className={styles.statLabel}>Failed</div>
        </div>
        {stats && <>
          <div className={styles.statCard} style={{ "--c": "#a78bfa" }}>
            <div className={styles.statValue}>{stats.avgScore ?? 0}</div>
            <div className={styles.statLabel}>Avg Score</div>
          </div>
          <div className={styles.statCard} style={{ "--c": "#22c55e" }}>
            <div className={styles.statValue}>{stats.recommendations?.strongHire ?? 0}</div>
            <div className={styles.statLabel}>Strong Hire</div>
          </div>
          <div className={styles.statCard} style={{ "--c": "#2ec4b6" }}>
            <div className={styles.statValue}>{stats.recommendations?.hire ?? 0}</div>
            <div className={styles.statLabel}>Hire</div>
          </div>
          <div className={styles.statCard} style={{ "--c": "#eab308" }}>
            <div className={styles.statValue}>{stats.recommendations?.consider ?? 0}</div>
            <div className={styles.statLabel}>Consider</div>
          </div>
          <div className={styles.statCard} style={{ "--c": "#ef4444" }}>
            <div className={styles.statValue}>{stats.recommendations?.reject ?? 0}</div>
            <div className={styles.statLabel}>Reject</div>
          </div>
        </>}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["all","pending","shortlisted","rejected"].map((f) => (
          <button key={f}
            className={filter === f ? styles.btnAccent : styles.btnGhost}
            onClick={() => setFilter(f)}
            style={{ textTransform: "capitalize" }}>
            {f === "all" ? `All (${candidates.length})` : f}
          </button>
        ))}
      </div>

      {/* Candidate table */}
      <div className={styles.card} style={{ padding: 0 }}>
        {visible.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>👥</div>
            <div className={styles.emptyTitle}>No candidates</div>
            <div className={styles.emptyText}>No candidates match this filter.</div>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Candidate</th>
                  <th>Contact</th>
                  <th>Score</th>
                  <th>Recommendation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <span className={`${styles.rankBadge} ${c.rank <= 3 ? styles.top : ""}`}>
                        {c.rank}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {c.name || "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {c.fileName}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{c.email || "—"}</div>
                      {c.phone && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.phone}</div>}
                    </td>
                    <td>
                      <span className={scoreClass(c.scores?.total ?? 0)}>
                        {c.scores?.total ?? 0}
                      </span>
                    </td>
                    <td>
                      <span className={recClass(c.recommendation)}>{c.recommendation}</span>
                    </td>
                    <td>
                      <span className={statusClass(c.status)}>{c.status}</span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={`${styles.actionBtn} ${styles.genome}`}
                          onClick={() => onViewGenome(c)}>
                          🧬 Genome
                        </button>
                        {c.status !== "shortlisted" && (
                          <button className={`${styles.actionBtn} ${styles.shortlist}`}
                            disabled={updating === c._id}
                            onClick={() => handleStatus(c._id, "shortlisted")}>
                            ✓
                          </button>
                        )}
                        {c.status !== "rejected" && (
                          <button className={`${styles.actionBtn} ${styles.reject}`}
                            disabled={updating === c._id}
                            onClick={() => handleStatus(c._id, "rejected")}>
                            ✕
                          </button>
                        )}
                        {c.status !== "pending" && (
                          <button className={`${styles.actionBtn} ${styles.reset}`}
                            disabled={updating === c._id}
                            onClick={() => handleStatus(c._id, "pending")}>
                            ↺
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root controller ───────────────────────────────────────────────────────────
export default function BulkScreening() {
  const [page,      setPage]      = useState("history");
  const [sessionId, setSessionId] = useState(null);
  const [candidate, setCandidate] = useState(null);

  const goHistory    = ()    => { setPage("history"); setSessionId(null); setCandidate(null); };
  const goUpload     = ()    => setPage("upload");
  const goResults    = (id)  => { setSessionId(id); setPage("results"); };
  const goGenome     = (c)   => { setCandidate(c);  setPage("genome");  };

  const handleUploadSuccess = (data) => {
    goResults(data.sessionId);
  };

  if (page === "upload")  return <UploadSession onSuccess={handleUploadSuccess} onBack={goHistory} />;
  if (page === "results") return <SessionResults sessionId={sessionId} onViewGenome={goGenome} onBack={goHistory} onNewSession={goUpload} />;
  if (page === "genome")  return <TalentGenome   candidate={candidate} onBack={() => setPage("results")} />;
  return <ScreeningHistory onOpen={goResults} onNewSession={goUpload} />;
}
