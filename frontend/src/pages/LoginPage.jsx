import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import RoleTab from "../components/RoleTab";
import LoginForm from "../components/LoginForm";
import BrandPanel from "../components/BrandPanel";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const [role, setRole] = useState("candidate");
  const { handleLoginSuccess } = useAuth();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <BrandPanel role={role} />

        <div className={styles.formPanel}>
          <div className={styles.formInner}>
            <RoleTab active={role} onChange={setRole} />

            {/*
              key={role} forces a full remount on role switch.
              onSuccess wires the form into AuthContext so
              AppRouter re-renders after login.
            */}
            <LoginForm
              key={role}
              role={role}
              onSuccess={handleLoginSuccess}
            />
          </div>

          <p className={styles.footer}>
            © 2026 TalentOS. All rights reserved.
            {" · "}
            <a href="#" className={styles.footerLink}>Privacy</a>
            {" · "}
            <a href="#" className={styles.footerLink}>Terms</a>
          </p>
        </div>
      </div>
    </div>
  );
}