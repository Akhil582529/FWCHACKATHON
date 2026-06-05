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
      {activeTab === "overview"  && <Overview  analytics={analytics} onTabChange={setActiveTab} />}
      {activeTab === "users"     && <ManageUsers />}
      {activeTab === "jobs"      && <AllJobs />}
      {activeTab === "analytics" && <Analytics analytics={analytics} />}
    </DashboardLayout>
  );
}