import { useState, useEffect } from "react";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import UnansweredQuestions from "./UnansweredQuestions";

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState("kb");

  useEffect(() => {
    const saved = localStorage.getItem("adminToken");
    if (saved) setToken(saved);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
  };

  if (!token) return <AdminLogin onLogin={setToken} />;

  return (
    <div style={{ maxWidth: 800, margin: "40px auto" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setTab("kb")} disabled={tab === "kb"}>
          Knowledge Base
        </button>
        <button
          onClick={() => setTab("unanswered")}
          disabled={tab === "unanswered"}
        >
          Unanswered Questions
        </button>
        <button onClick={handleLogout} style={{ marginLeft: "auto" }}>
          Logout
        </button>
      </div>

      {tab === "kb" && <AdminDashboard token={token} onLogout={handleLogout} />}
      {tab === "unanswered" && (
        <UnansweredQuestions token={token} onLogout={handleLogout} />
      )}
    </div>
  );
}
