import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export default function UnansweredQuestions({ token, onLogout }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/unanswered`, { headers });
      if (res.status === 401 || res.status === 403) return onLogout();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load questions");
      setQuestions(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchQuestions(); }, []);

  const dismiss = async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/unanswered/${id}`, { method: "DELETE", headers });
    if (res.status === 401 || res.status === 403) return onLogout();
    if (res.ok) fetchQuestions();
  };

  return <div className="admin-page">
    <div className="section-heading"><div><span className="card-kicker">KNOWLEDGE GAPS</span><h2>Questions needing an answer</h2><p className="section-copy">Use these questions to decide what content should be added next.</p></div><button className="button button-light" onClick={fetchQuestions}>Refresh</button></div>
    <div className="admin-card table-card">
      {loading ? <p className="empty-state">Loading questions...</p> : error ? <p className="notice notice-error">{error}</p> : questions.length === 0 ? <p className="empty-state">No unanswered questions.</p> : <div className="table-scroll"><table className="admin-table"><thead><tr><th>Question</th><th>Asked</th><th>Last asked</th><th /></tr></thead><tbody>{questions.map((q) => <tr key={q._id}><td className="question-cell">{q.question}</td><td><span className="count-badge">{q.timesAsked}</span></td><td>{q.lastAsked ? new Date(q.lastAsked).toLocaleString() : "Unknown date"}</td><td><button className="text-button" onClick={() => dismiss(q._id)}>Dismiss</button></td></tr>)}</tbody></table></div>}
    </div>
  </div>;
}
