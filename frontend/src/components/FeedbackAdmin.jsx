import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export default function FeedbackAdmin({ token, onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/feedback`, { headers });
      if (res.status === 401 || res.status === 403) return onLogout();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load feedback");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchFeedback(); }, []);

  return <div className="admin-page">
    <div className="section-heading"><div><span className="card-kicker">USER INPUT</span><h2>Feedback</h2><p className="section-copy">Review comments submitted by students and visitors.</p></div><button className="button button-light" onClick={fetchFeedback}>Refresh</button></div>
    <div className="feedback-count"><strong>{items.length}</strong><span>Total submissions</span></div>
    {loading ? <div className="admin-card empty-state">Loading feedback...</div> : error ? <p className="notice notice-error">{error}</p> : items.length === 0 ? <div className="admin-card empty-state">No feedback submitted yet.</div> : <div className="feedback-list">{items.map((item) => (
      <article className="admin-card feedback-item" key={item._id}>
        <p>{item.message}</p>
        <footer><span>{item.name || "Anonymous"}{item.email && ` · ${item.email}`}</span><time>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Unknown date"}</time></footer>
      </article>
    ))}</div>}
  </div>;
}
