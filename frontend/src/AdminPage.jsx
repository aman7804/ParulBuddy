import { useState, useEffect } from "react";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";
import UnansweredQuestions from "./components/UnAnsweredQuestions";

import FeedbackAdmin from "./components/FeedbackAdmin";

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
      <div
        style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}
      >
        <button onClick={() => setTab("kb")} disabled={tab === "kb"}>
          Documents
        </button>
        <button
          onClick={() => setTab("unanswered")}
          disabled={tab === "unanswered"}
        >
          Unanswered Questions
        </button>

        <button
          onClick={() => setTab("feedbacks")}
          disabled={tab === "feedbacks"}
        >
          Feedbacks
        </button>
        <button onClick={handleLogout} style={{ marginLeft: "auto" }}>
          Logout
        </button>
      </div>

      {tab === "kb" && <AdminDashboard token={token} onLogout={handleLogout} />}
      {tab === "unanswered" && (
        <UnansweredQuestions token={token} onLogout={handleLogout} />
      )}

      {tab === "feedbacks" && (
        <FeedbackAdmin token={token} onLogout={handleLogout} />
      )}
    </div>
  );
}
