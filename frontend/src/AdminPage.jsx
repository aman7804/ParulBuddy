import { useState, useEffect } from "react";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";
import UnansweredQuestions from "./components/UnAnsweredQuestions";
import FeedbackAdmin from "./components/FeedbackAdmin";
import "./admin.css";

const TABS = [
  { id: "kb", label: "Documents", short: "Docs", icon: "▣" },
  { id: "unanswered", label: "Unanswered questions", short: "Questions", icon: "?" },
  { id: "feedbacks", label: "Feedback", short: "Feedback", icon: "▤" },
];

function Sidebar({ tab, onTabChange, onLogout }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <span className="admin-brand-mark">P</span>

        <div className="admin-brand-copy">
          <strong>ParulBuddy</strong>
          <small>Administration</small>
        </div>
      </div>

      <div className="admin-nav-heading">Workspace</div>

      <nav className="admin-nav" aria-label="Admin sections">
        {TABS.map(({ id, label, short, icon }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "active" : ""}
            onClick={() => onTabChange(id)}
            aria-current={tab === id ? "page" : undefined}
            title={label}
          >
            <span className="admin-nav-icon" aria-hidden="true">
              {icon}
            </span>

            <span className="admin-nav-label">{label}</span>
            <span className="admin-nav-short">{short}</span>
          </button>
        ))}
      </nav>

      <div className="admin-sidebar-bottom">
        <div className="admin-session-card">
          <span className="session-dot" />
          <div>
            <strong>Admin session</strong>
            <small>Authenticated</small>
          </div>
        </div>

        <button type="button" className="admin-logout" onClick={onLogout}>
          <span aria-hidden="true">↗</span>
          Log out
        </button>
      </div>
    </aside>
  );
}

function Topbar({ tab }) {
  const current = TABS.find(({ id }) => id === tab) || TABS[0];

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-copy">
        <p className="admin-eyebrow">PARULBUDDY / ADMIN</p>
        <div className="admin-title-row">
          <h1>{current.label}</h1>
          <span className="admin-title-mark">{current.icon}</span>
        </div>
      </div>

      <div className="admin-status" aria-label="Admin session active">
        <span className="status-dot" />
        <span>Session active</span>
      </div>
    </header>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState("kb");

  useEffect(() => {
    const savedToken = localStorage.getItem("adminToken");

    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const handleLogin = (newToken) => {
    if (!newToken) return;
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
    setTab("kb");
  };

  if (!token) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="admin-shell">
      <Sidebar
        tab={tab}
        onTabChange={setTab}
        onLogout={handleLogout}
      />

      <main className="admin-main">
        <Topbar tab={tab} />

        <section className="admin-content">
          {tab === "kb" && (
            <AdminDashboard
              token={token}
              onLogout={handleLogout}
            />
          )}

          {tab === "unanswered" && (
            <UnansweredQuestions
              token={token}
              onLogout={handleLogout}
            />
          )}

          {tab === "feedbacks" && (
            <FeedbackAdmin
              token={token}
              onLogout={handleLogout}
            />
          )}
        </section>
      </main>
    </div>
  );
}
