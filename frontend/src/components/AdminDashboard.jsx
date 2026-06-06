import { useState, useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
import { adminAPI } from "../services/api";
import styles from "./AdminDashboard.module.css";

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, sub }) {
  return (
    <div className={styles.statCard} style={{ "--c": color }}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statInfo}>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
        {sub && <div className={styles.statSub}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────────
function Overview({ analytics, onTabChange }) {
  if (!analytics) return <div className={styles.loading}>Loading analytics...</div>;

  const {
    totalUsers, candidates, hrUsers, admins,
    activeJobs, totalJobs, totalInterviews,
    totalApplications, recentUsers, recentJobs,
  } = analytics;

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Platform Overview</h2>

      <div className={styles.statsGrid}>
        <StatCard icon="👥" label="Total Users"       value={totalUsers}        color="var(--admin-accent)" />
        <StatCard icon="👤" label="Candidates"        value={candidates}        color="var(--cand-accent)"  />
        <StatCard icon="🏢" label="HR Accounts"       value={hrUsers}           color="var(--hr-accent)"    />
        <StatCard icon="💼" label="Active Jobs"       value={activeJobs}        color="#22c55e" sub={`${totalJobs} total`} />
        <StatCard icon="📋" label="Applications"      value={totalApplications} color="#f59e0b" />
        <StatCard icon="📅" label="Interviews"        value={totalInterviews}   color="#818cf8" />
      </div>

      <div className={styles.twoCol}>
        {/* Recent Users */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Recent Signups</h3>
            <button className={styles.viewAllBtn} onClick={() => onTabChange("users")}>View All →</button>
          </div>
          {recentUsers?.length === 0
            ? <p className={styles.empty}>No users yet.</p>
            : recentUsers?.map((u) => (
              <div key={u._id} className={styles.listItem}>
                <div className={styles.userAvatar} style={{ background: u.role === "candidate" ? "var(--cand-accent)" : u.role === "hr" ? "var(--hr-accent)" : "var(--admin-accent)" }}>
                  {(u.fullName || u.email)[0].toUpperCase()}
                </div>
                <div className={styles.listInfo}>
                  <div className={styles.itemTitle}>{u.fullName || u.email}</div>
                  <div className={styles.itemSub}>{u.email} · {new Date(u.createdAt).toLocaleDateString()}</div>
                </div>
                <span className={`${styles.roleBadge} ${styles[u.role]}`}>{u.role}</span>
                <span className={`${styles.statusDot} ${u.isActive ? styles.active : styles.inactive}`} title={u.isActive ? "Active" : "Inactive"} />
              </div>
            ))
          }
        </div>

        {/* Recent Jobs */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Recent Job Posts</h3>
            <button className={styles.viewAllBtn} onClick={() => onTabChange("jobs")}>View All →</button>
          </div>
          {recentJobs?.length === 0
            ? <p className={styles.empty}>No jobs yet.</p>
            : recentJobs?.map((j) => (
              <div key={j._id} className={styles.listItem}>
                <div className={styles.jobIcon}>💼</div>
                <div className={styles.listInfo}>
                  <div className={styles.itemTitle}>{j.title}</div>
                  <div className={styles.itemSub}>{j.company} · {new Date(j.createdAt).toLocaleDateString()}</div>
                </div>
                <span className={`${styles.statusBadge} ${j.isActive ? styles.activeJob : styles.inactiveJob}`}>
                  {j.isActive ? "Active" : "Closed"}
                </span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ── Manage Users Tab ───────────────────────────────────────────────────────────
function ManageUsers() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [toggling, setToggling] = useState(null);

  const fetchUsers = async (role = "") => {
    setLoading(true);
    try {
      const params = role && role !== "all" ? `?role=${role}` : "";
      const d = await adminAPI.getUsers(params);
      setUsers(d.users);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(filter); }, [filter]);

  const toggleUser = async (id) => {
    setToggling(id);
    try {
      const d = await adminAPI.toggleUser(id);
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isActive: d.user.isActive } : u));
    } catch (e) { alert(e.message); }
    finally { setToggling(null); }
  };

  const filtered = users.filter((u) =>
    (u.fullName || u.email || "").toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const roleColor = { candidate: "var(--cand-accent)", hr: "var(--hr-accent)", admin: "var(--admin-accent)" };

  return (
    <div className={styles.section}>
      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <span>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filterTabs}>
          {["all", "candidate", "hr", "admin"].map((r) => (
            <button
              key={r}
              className={`${styles.filterTab} ${filter === r ? styles.filterActive : ""}`}
              onClick={() => setFilter(r)}
            >
              {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading users...</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Extra Info</th>
                <th>Joined</th>
                <th>Last Login</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.tableAvatar} style={{ background: roleColor[u.role] }}>
                        {(u.fullName || u.email)[0].toUpperCase()}
                      </div>
                      <span className={styles.bold}>{u.fullName || "—"}</span>
                    </div>
                  </td>
                  <td className={styles.muted}>{u.email}</td>
                  <td>
                    <span className={`${styles.roleBadge} ${styles[u.role]}`}>{u.role}</span>
                  </td>
                  <td className={styles.muted}>
                    {u.role === "candidate" && u.skills?.length > 0
                      ? u.skills.slice(0, 2).join(", ")
                      : u.role === "hr" && u.companyId
                      ? `Co: ${u.companyId}`
                      : "—"}
                  </td>
                  <td className={styles.muted}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className={styles.muted}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${u.isActive ? styles.activeJob : styles.inactiveJob}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    {u.role !== "admin" ? (
                      <button
                        className={`${styles.toggleBtn} ${u.isActive ? styles.deactivateBtn : styles.activateBtn}`}
                        onClick={() => toggleUser(u._id)}
                        disabled={toggling === u._id}
                      >
                        {toggling === u._id ? "..." : u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    ) : (
                      <span className={styles.muted}>Protected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className={styles.empty}>No users found.</p>}
        </div>
      )}
    </div>
  );
}

// ── All Jobs Tab ───────────────────────────────────────────────────────────────
function AllJobs() {
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [toggling, setToggling] = useState(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const d = await adminAPI.getAllJobs();
      setJobs(d.jobs);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchJobs(); }, []);

  const toggleJob = async (id) => {
    setToggling(id);
    try {
      const d = await adminAPI.toggleJob(id);
      setJobs((prev) => prev.map((j) => j._id === id ? { ...j, isActive: d.job.isActive } : j));
    } catch (e) { alert(e.message); }
    finally { setToggling(null); }
  };

  const filtered = jobs.filter((j) =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.section}>
      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <span>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Search by title or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.jobCount}>{filtered.length} jobs</div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading jobs...</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Company</th>
                <th>Type</th>
                <th>Location</th>
                <th>Applicants</th>
                <th>Posted By</th>
                <th>Posted On</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => (
                <tr key={j._id}>
                  <td className={styles.bold}>{j.title}</td>
                  <td>{j.company}</td>
                  <td><span className={styles.typeBadge}>{j.type}</span></td>
                  <td className={styles.muted}>{j.location}</td>
                  <td>
                    <span className={styles.applicantCount}>{j.applicants?.length || 0}</span>
                  </td>
                  <td className={styles.muted}>{j.postedBy?.email || "—"}</td>
                  <td className={styles.muted}>{new Date(j.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${j.isActive ? styles.activeJob : styles.inactiveJob}`}>
                      {j.isActive ? "Active" : "Closed"}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`${styles.toggleBtn} ${j.isActive ? styles.deactivateBtn : styles.activateBtn}`}
                      onClick={() => toggleJob(j._id)}
                      disabled={toggling === j._id}
                    >
                      {toggling === j._id ? "..." : j.isActive ? "Close" : "Reopen"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className={styles.empty}>No jobs found.</p>}
        </div>
      )}
    </div>
  );
}

// ── Analytics Tab ──────────────────────────────────────────────────────────────
function Analytics({ analytics }) {
  if (!analytics) return <div className={styles.loading}>Loading analytics...</div>;

  const {
    totalUsers, candidates, hrUsers, admins,
    activeJobs, totalJobs, totalInterviews,
    totalApplications, monthlySignups,
  } = analytics;

  const maxSignups = Math.max(...(monthlySignups?.map((m) => m.count) || [1]), 1);

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const roleData = [
    { label: "Candidates", value: candidates, total: totalUsers, color: "var(--cand-accent)" },
    { label: "HR",         value: hrUsers,    total: totalUsers, color: "var(--hr-accent)"   },
    { label: "Admins",     value: admins,      total: totalUsers, color: "var(--admin-accent)"},
  ];

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Platform Analytics</h2>

      <div className={styles.statsGrid}>
        <StatCard icon="👥" label="Total Users"       value={totalUsers}        color="var(--admin-accent)" />
        <StatCard icon="💼" label="Total Jobs"        value={totalJobs}         color="var(--hr-accent)"    sub={`${activeJobs} active`} />
        <StatCard icon="📋" label="Total Applications"value={totalApplications} color="var(--cand-accent)"  />
        <StatCard icon="📅" label="Total Interviews"  value={totalInterviews}   color="#818cf8"             />
      </div>

      <div className={styles.twoCol}>
        {/* User Breakdown */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>User Breakdown by Role</h3>
          <div className={styles.breakdown}>
            {roleData.map((r) => (
              <div key={r.label} className={styles.breakdownRow}>
                <div className={styles.breakdownLabel}>
                  <span>{r.label}</span>
                  <span className={styles.breakdownCount} style={{ color: r.color }}>{r.value}</span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: r.total > 0 ? `${(r.value / r.total) * 100}%` : "0%",
                      background: r.color
                    }}
                  />
                </div>
                <span className={styles.breakdownPct}>
                  {r.total > 0 ? Math.round((r.value / r.total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Jobs Overview */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Jobs Overview</h3>
          <div className={styles.breakdown}>
            <div className={styles.breakdownRow}>
              <div className={styles.breakdownLabel}>
                <span>Active Jobs</span>
                <span className={styles.breakdownCount} style={{ color: "#22c55e" }}>{activeJobs}</span>
              </div>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: totalJobs > 0 ? `${(activeJobs / totalJobs) * 100}%` : "0%", background: "#22c55e" }} />
              </div>
              <span className={styles.breakdownPct}>{totalJobs > 0 ? Math.round((activeJobs / totalJobs) * 100) : 0}%</span>
            </div>
            <div className={styles.breakdownRow}>
              <div className={styles.breakdownLabel}>
                <span>Closed Jobs</span>
                <span className={styles.breakdownCount} style={{ color: "#6b7280" }}>{totalJobs - activeJobs}</span>
              </div>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: totalJobs > 0 ? `${((totalJobs - activeJobs) / totalJobs) * 100}%` : "0%", background: "#6b7280" }} />
              </div>
              <span className={styles.breakdownPct}>{totalJobs > 0 ? Math.round(((totalJobs - activeJobs) / totalJobs) * 100) : 0}%</span>
            </div>
            <div className={styles.breakdownRow}>
              <div className={styles.breakdownLabel}>
                <span>Avg Applicants/Job</span>
                <span className={styles.breakdownCount} style={{ color: "var(--admin-accent)" }}>
                  {totalJobs > 0 ? (totalApplications / totalJobs).toFixed(1) : 0}
                </span>
              </div>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: "60%", background: "var(--admin-accent)" }} />
              </div>
              <span className={styles.breakdownPct}>avg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Signups Bar Chart */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Monthly Signups (Last 6 Months)</h3>
        {monthlySignups?.length === 0 ? (
          <p className={styles.empty}>No signup data yet.</p>
        ) : (
          <div className={styles.barChart}>
            {monthlySignups?.map((m, i) => (
              <div key={i} className={styles.barGroup}>
                <div className={styles.barWrapper}>
                  <span className={styles.barValue}>{m.count}</span>
                  <div
                    className={styles.chartBar}
                    style={{
                      height: `${Math.max((m.count / maxSignups) * 160, 8)}px`,
                      background: "var(--admin-accent)",
                    }}
                  />
                </div>
                <span className={styles.barLabel}>
                  {monthNames[(m._id.month - 1)]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats Cards */}
      <div className={styles.quickStats}>
        <div className={styles.quickStat}>
          <div className={styles.quickStatNum} style={{ color: "var(--cand-accent)" }}>
            {totalUsers > 0 ? ((candidates / totalUsers) * 100).toFixed(0) : 0}%
          </div>
          <div className={styles.quickStatLabel}>of users are candidates</div>
        </div>
        <div className={styles.quickStat}>
          <div className={styles.quickStatNum} style={{ color: "#22c55e" }}>
            {totalJobs > 0 ? ((activeJobs / totalJobs) * 100).toFixed(0) : 0}%
          </div>
          <div className={styles.quickStatLabel}>jobs currently active</div>
        </div>
        <div className={styles.quickStat}>
          <div className={styles.quickStatNum} style={{ color: "var(--hr-accent)" }}>
            {totalJobs > 0 ? (totalApplications / totalJobs).toFixed(1) : 0}
          </div>
          <div className={styles.quickStatLabel}>avg applications per job</div>
        </div>
        <div className={styles.quickStat}>
          <div className={styles.quickStatNum} style={{ color: "#818cf8" }}>
            {totalApplications > 0 ? ((totalInterviews / totalApplications) * 100).toFixed(0) : 0}%
          </div>
          <div className={styles.quickStatLabel}>application → interview rate</div>
        </div>
      </div>
    </div>
  );
}

// ── Workforce Intelligence Tab ─────────────────────────────────────────────────
function WorkforceIntelligence() {
  const [data, setData]                     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [report, setReport]                 = useState(null);
  const [reportLoading, setReportLoading]   = useState(false);

  useEffect(() => {
    adminAPI.getWorkforce()
      .then(d => setData(d.workforce))
      .catch(e => console.error("Workforce error:", e))
      .finally(() => setLoading(false));
  }, []);

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const d = await adminAPI.getAIInsights(data);
      setReport(d.report);
    } catch (e) { alert(e.message); }
    finally { setReportLoading(false); }
  };

  if (loading) return <div className={styles.section}><div className={styles.loading}>Loading workforce intelligence...</div></div>;
  if (!data)   return <div className={styles.section}><p className={styles.empty}>No workforce data available yet.</p></div>;

  const { healthScore, healthLabel, kpi, funnel, quality, skillGaps, topCandidate } = data;
  const healthColor = healthScore >= 90 ? "#22c55e" : healthScore >= 75 ? "#3b82f6" : healthScore >= 60 ? "#f59e0b" : "#ef4444";
  const maxFunnel   = funnel.applied || 1;

  const funnelSteps = [
    { label: "Applications",     value: funnel.applied         },
    { label: "Reviewed",         value: funnel.reviewed        },
    { label: "Shortlisted",      value: funnel.shortlisted     },
    { label: "AI Ranked",        value: funnel.aiRanked        },
    { label: "Interviewed",      value: funnel.interviewed     },
    { label: "AI Evaluated",     value: funnel.evaluated       },
    { label: "Hire Recommended", value: funnel.hireRecommended },
  ];

  const qualityMetrics = [
    { label: "Interview Score",     value: quality.avgInterviewScore     },
    { label: "Technical Score",     value: quality.avgTechnicalScore     },
    { label: "Communication Score", value: quality.avgCommunicationScore },
    { label: "Confidence Score",    value: quality.avgConfidenceScore    },
    { label: "Role Readiness",      value: quality.avgRoleReadiness      },
    { label: "AI Ranking Score",    value: quality.avgAIScore            },
  ];

  const kpiCards = [
    { icon: "🏆", label: "Ready To Hire",  value: kpi.readyToHire,       color: "#22c55e",             sub: "score ≥ 80"   },
    { icon: "🎯", label: "Hire Rate",      value: `${kpi.hireRate}%`,    color: "#3b82f6",             sub: "of evaluated" },
    { icon: "🤖", label: "Avg AI Score",   value: kpi.avgAIScore,        color: "var(--admin-accent)", sub: "ranking"      },
    { icon: "🎤", label: "Avg Interview",  value: kpi.avgInterviewScore, color: "#a78bfa",             sub: "score"        },
    { icon: "📈", label: "Role Readiness", value: kpi.avgRoleReadiness,  color: "#f59e0b",             sub: "avg score"    },
    { icon: "📊", label: "Eval Coverage",  value: `${kpi.evalCoverage}%`,color: "#2ec4b6",             sub: "interviewed"  },
  ];

  const recColor = { hire: "#22c55e", consider: "#f59e0b", pass: "#6b7280" };

  return (
    <div className={styles.section}>

      {/* ── Health Score Hero ── */}
      <div className={styles.card}>
        <div style={{ textAlign: "center", padding: "16px 0 12px" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>🧠 AI Hiring Health Score</div>
          <div style={{ fontSize: 72, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: healthColor, lineHeight: 1 }}>{healthScore}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>/ 100</div>
          <div style={{ display: "inline-block", marginTop: 10, padding: "4px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, letterSpacing: ".08em", background: `${healthColor}22`, color: healthColor }}>
            {healthLabel.toUpperCase()}
          </div>
          <div style={{ maxWidth: 320, margin: "14px auto 0", height: 8, background: "rgba(255,255,255,.06)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${healthScore}%`, height: "100%", background: healthColor, borderRadius: 4, transition: "width .6s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
            30% AI Ranking · 30% Interview Score · 20% Role Readiness · 20% Hire Rate
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className={styles.kpiGrid}>
        {kpiCards.map(c => (
          <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} sub={c.sub} />
        ))}
      </div>

      {/* ── Top Candidate Ready Now ── */}
      {topCandidate && (
        <div className={styles.topCandidateCard}>
          <div className={styles.cardTitle}>🏆 Top Candidate Ready Now</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: "var(--text-primary)" }}>{topCandidate.fullName}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                {topCandidate.aiScore != null && (
                  <span className={styles.itemSub}>AI Rank Score: <strong style={{ color: "#e2e8f0" }}>{topCandidate.aiScore}/100</strong></span>
                )}
                {topCandidate.recommendation && (
                  <span className={styles.statusBadge} style={{ background: `${recColor[topCandidate.recommendation] || "#6b7280"}22`, color: recColor[topCandidate.recommendation] || "#6b7280", border: `1px solid ${recColor[topCandidate.recommendation] || "#6b7280"}44` }}>
                    {topCandidate.recommendation.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 42, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: "#22c55e", lineHeight: 1 }}>{topCandidate.roleReadinessScore}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginTop: 4 }}>Role Readiness</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Hiring Funnel + Skill Gap ── */}
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>🔽 Hiring Funnel</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {funnelSteps.map(({ label, value }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontWeight: 700, fontFamily: "'Syne',sans-serif", color: "var(--text-primary)" }}>
                    {value} <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 11 }}>({Math.round((value / maxFunnel) * 100)}%)</span>
                  </span>
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${(value / maxFunnel) * 100}%`, background: "var(--admin-accent)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>⚡ Skill Gap Intelligence</div>
          {skillGaps.length === 0 ? (
            <p className={styles.empty}>No skill data available yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              {skillGaps.slice(0, 7).map(({ skill, demand, supply, gap }) => (
                <div key={skill}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{skill}</span>
                    {gap > 0
                      ? <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>GAP {gap}</span>
                      : <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>OK</span>
                    }
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 62 }}>Demand {demand}</span>
                    <div className={styles.barTrack} style={{ flex: 1 }}>
                      <div className={styles.barFill} style={{ width: `${Math.min((demand / 10) * 100, 100)}%`, background: "#f59e0b" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 62 }}>Supply {supply}</span>
                    <div className={styles.barTrack} style={{ flex: 1 }}>
                      <div className={styles.barFill} style={{ width: `${Math.min((supply / 10) * 100, 100)}%`, background: supply >= demand ? "#22c55e" : "#ef4444" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Interview Quality Breakdown ── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>📊 Interview Quality Breakdown</div>
        <div className={styles.breakdown} style={{ marginTop: 12 }}>
          {qualityMetrics.map(({ label, value }) => (
            <div key={label} className={styles.breakdownRow}>
              <div className={styles.breakdownLabel}>
                <span>{label}</span>
                <span className={styles.breakdownCount} style={{ color: value >= 75 ? "#22c55e" : value >= 60 ? "#f59e0b" : "#ef4444" }}>{value}</span>
              </div>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${value}%`, background: value >= 75 ? "#22c55e" : value >= 60 ? "#f59e0b" : "#ef4444" }} />
              </div>
              <span className={styles.breakdownPct}>{value}/100</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── AI Executive Report ── */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>✨ AI Executive Report</h3>
          <button className={styles.reportBtn} onClick={generateReport} disabled={reportLoading}>
            {reportLoading ? "Generating..." : "✨ Generate Report"}
          </button>
        </div>
        {!report ? (
          <p className={styles.empty} style={{ marginTop: 12 }}>Click "Generate Report" to get an AI-powered executive summary of your workforce data.</p>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Overall Health:</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: healthColor }}>{report.overallHealth?.toUpperCase()}</span>
            </div>
            <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7, marginBottom: 20, padding: "12px 16px", background: "rgba(255,255,255,.03)", borderRadius: 8, border: "1px solid var(--border)" }}>
              {report.summary}
            </p>
            <div className={styles.twoCol} style={{ gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>✅ Strengths</div>
                {report.strengths?.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13, color: "var(--text-primary)" }}>
                    <span style={{ color: "#22c55e", flexShrink: 0 }}>•</span><span>{s}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>⚠️ Risks</div>
                {report.risks?.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13, color: "var(--text-primary)" }}>
                    <span style={{ color: "#ef4444", flexShrink: 0 }}>•</span><span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>💡 Recommendations</div>
              {report.recommendations?.map((rec, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 13, color: "var(--text-primary)" }}>
                  <span style={{ color: "#3b82f6", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span><span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Admin Dashboard ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab]   = useState("overview");
  const [analytics, setAnalytics]   = useState(null);

  useEffect(() => {
    adminAPI.getAnalytics()
      .then((d) => setAnalytics(d.analytics))
      .catch((e) => console.error("Analytics error:", e));
  }, []);

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview"   && <Overview  analytics={analytics} onTabChange={setActiveTab} />}
      {activeTab === "users"      && <ManageUsers />}
      {activeTab === "jobs"       && <AllJobs />}
      {activeTab === "analytics"  && <Analytics analytics={analytics} />}
      {activeTab === "workforce"  && <WorkforceIntelligence />}
    </DashboardLayout>
  );
}