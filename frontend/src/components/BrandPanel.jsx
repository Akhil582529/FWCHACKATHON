import styles from "./BrandPanel.module.css";

const roleArt = {
  candidate: {
    emoji: "🚀",
    headline: "Find Your Next Big Role",
    tagline: "Thousands of companies are hiring right now.",
    stats: [
      { value: "50K+", label: "Active Jobs" },
      { value: "12K+", label: "Companies" },
      { value: "98%", label: "Hire Rate" },
    ],
    color: "var(--cand-accent)",
  },
  hr: {
    emoji: "🏆",
    headline: "Build World-Class Teams",
    tagline: "Streamline hiring from sourcing to offer.",
    stats: [
      { value: "3x", label: "Faster Hiring" },
      { value: "85%", label: "Retention" },
      { value: "200+", label: "Integrations" },
    ],
    color: "var(--hr-accent)",
  },
  admin: {
    emoji: "🛡️",
    headline: "Full System Control",
    tagline: "Monitor, configure, and audit everything.",
    stats: [
      { value: "99.9%", label: "Uptime" },
      { value: "256-bit", label: "Encryption" },
      { value: "SOC 2", label: "Compliant" },
    ],
    color: "var(--admin-accent)",
  },
};

export default function BrandPanel({ role }) {
  const art = roleArt[role];

  return (
    <div className={`${styles.panel} ${styles[role]}`} style={{ "--accent": art.color }}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />
      <div className={styles.grid} />

      <div className={styles.content}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span className={styles.logoText}>TalentOS</span>
        </div>

        <div className={styles.hero}>
          <div className={styles.emojiWrap}>
            <div className={styles.emojiRing} />
            <span className={styles.emoji}>{art.emoji}</span>
          </div>
          <h1 className={styles.headline}>{art.headline}</h1>
          <p className={styles.tagline}>{art.tagline}</p>
        </div>

        <div className={styles.stats}>
          {art.stats.map((s) => (
            <div key={s.label} className={styles.stat}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
