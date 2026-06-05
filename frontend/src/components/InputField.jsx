import { useState } from "react";
import styles from "./InputField.module.css";

export default function InputField({
  label,
  type = "text",
  value,
  onChange,
  icon,
  accent,
  autoComplete,
  required,
}) {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPwd ? "text" : "password") : type;
  const filled = value && value.length > 0;

  return (
    <div
      className={`${styles.wrapper} ${focused ? styles.focused : ""} ${filled ? styles.filled : ""}`}
      style={{ "--accent": accent }}
    >
      <span className={styles.iconLeft}>{icon}</span>

      <div className={styles.inner}>
        <label className={styles.label}>{label}</label>
        <input
          className={styles.input}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          required={required}
        />
      </div>

      {isPassword && (
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setShowPwd((s) => !s)}
          aria-label={showPwd ? "Hide password" : "Show password"}
        >
          {showPwd ? "🙈" : "👁️"}
        </button>
      )}
    </div>
  );
}
