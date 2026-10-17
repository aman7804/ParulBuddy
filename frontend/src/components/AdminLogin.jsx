import { useState } from "react";
import { API_BASE_URL } from "../config";

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      localStorage.setItem("adminToken", data.token);
      onLogin(data.token);
    } catch (err) {
      setError("Something went wrong");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="admin-login">
      <div className="admin-login-mark">P</div>
      <p className="admin-eyebrow">PARULBUDDY</p>
      <h2>Admin sign in</h2>
      <p className="admin-login-copy">Manage documents, unanswered questions, and feedback.</p>
      <input
        type="password"
        placeholder="Admin password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="admin-login-input"
      />
      <button type="submit" className="button button-primary admin-login-button">
        Sign in
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
