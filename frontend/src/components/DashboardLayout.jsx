import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import styles from "./DashboardLayout.module.css";

const navItems = {
  candidate: [
    { id: "overview",    icon: "⚡", label: "Overview"       },
    { id: "jobs",        icon: "💼", label: "Browse Jobs"    },
    { id: "applied",     icon: "📋", label: "Applied Jobs"   },
    { id: "interview",   icon: "🎤", label: "Mock Interview" },
    { id: "onboarding",  icon: "🚀", label: "Onboarding"    },
    { id: "profile",     icon: "👤", label: "My Profile"     },
  ],
  hr: [
    { id: "overview",    icon: "⚡", label: "Overview"        },
    { id: "post-job",    icon: "➕", label: "Post a Job"      },
    { id: "my-jobs",     icon: "💼", label: "My Jobs"         },
    { id: "candidates",  icon: "👥", label: "Candidates"      },
    { id: "interviews",  icon: "📅", label: "Interviews"      },
    { id: "ai-ranking",  icon: "🤖", label: "AI Ranking"      },
  ],
  admin: [
    { id: "overview",   icon: "⚡", label: "Overview"     },
    { id: "users",      icon: "👥", label: "Manage Users" },
    { id: "jobs",       icon: "💼", label: "All Jobs"     },
    { id: "analytics",  icon: "📊", label: "Analytics"   },
  ],
};

const roleColors = {
  candidate: "var(--cand-accent)",
  hr:        "var(--hr-accent)",
  admin:     "var(--admin-accent)",
};

const roleBadge = { candidate: "Candidate", hr: "HR", admin: "Admin" };

export default function DashboardLayout({ activeTab, onTabChange, children }) {
  const { user, handleLogout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const role = user?.role || "candidate";
  const accent = roleColors[role];
  const items = navItems[role] || [];

  return (
    <div className={styles.shell} style={{ "--accent": accent }}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
        <div className={styles.sideTop}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>◈</span>
            {!collapsed && <span className={styles.brandText}>TalentOS</span>}
          </div>
          <button className={styles.collapseBtn} onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        <div className={styles.userCard}>
          <div className={styles.avatar} style={{ background: accent }}>
            {(user?.fullName || user?.email || "U")[0].toUpperCase()}
          </div>
          {!collapsed && (
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.fullName || user?.email?.split("@")[0]}</span>
              <span className={styles.userRole} style={{ color: accent }}>{roleBadge[role]}</span>
            </div>
          )}
        </div>

        <nav className={styles.nav}>
          {items.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeTab === item.id ? styles.active : ""}`}
              onClick={() => onTabChange(item.id)}
              title={collapsed ? item.label : ""}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              {activeTab === item.id && <span className={styles.activeBar} />}
            </button>
          ))}
        </nav>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.topBar}>
          <div className={styles.pageTitle}>
            {items.find((i) => i.id === activeTab)?.icon}{" "}
            {items.find((i) => i.id === activeTab)?.label}
          </div>
          <div className={styles.topRight}>
            <span className={styles.rolePill} style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}>
              {roleBadge[role]}
            </span>
          </div>
        </div>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}