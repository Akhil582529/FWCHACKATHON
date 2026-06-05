import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import CandidateDashboard from "./components/CandidateDashboard";
import HRDashboard from "./components/HRDashboard";
import "./index.css";

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#090e1a",
      color: "#6b7fa3", fontFamily: "DM Sans, sans-serif",
    }}>
      Loading...
    </div>
  );

  if (!user) return <LoginPage />;

  if (user.role === "candidate") return <CandidateDashboard />;
  if (user.role === "hr")        return <HRDashboard />;
  if (user.role === "admin")     return <div style={{ color: "#fff", padding: 40 }}>Admin Dashboard coming soon</div>;

  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}