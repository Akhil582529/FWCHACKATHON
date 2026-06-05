import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import CandidateDashboard from "./components/CandidateDashboard";
import HRDashboard from "./components/HRDashboard";
import AdminDashboard from "./components/AdminDashboard";
import "./index.css";

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#090e1a",
          color: "#6b7fa3",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (user.role === "candidate") return <CandidateDashboard />;
  if (user.role === "hr") return <HRDashboard />;
  if (user.role === "admin") return <AdminDashboard />;

  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}