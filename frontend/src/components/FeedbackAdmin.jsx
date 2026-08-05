import { useEffect, useState } from "react";

export default function FeedbackAdmin({ token, onLogout }) {
  const [items, setItems] = useState([]);
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchFeedback = async () => {
    const res = await fetch("http://localhost:5000/api/admin/feedback", {
      headers: authHeaders,
    });
    if (res.status === 401 || res.status === 403) return onLogout();
    setItems(await res.json());
  };

  useEffect(() => { fetchFeedback(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this feedback?")) return;
    await fetch(`http://localhost:5000/api/admin/feedback/${id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    fetchFeedback();
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h2>Feedback</h2>
      {items.length === 0 && <p>No feedback yet.</p>}
      {items.map((f) => (
        <div key={f._id} style={{ border: "1px solid #ccc", borderRadius: 6, padding: 12, marginBottom: 10 }}>
          <p style={{ margin: "4px 0" }}>{f.message}</p>
          <div style={{ fontSize: 12, color: "#888" }}>
            {f.name && <span>{f.name} · </span>}
            {f.email && <span>{f.email} · </span>}
            {new Date(f.createdAt).toLocaleString()}
          </div>
          <button onClick={() => handleDelete(f._id)} style={{ marginTop: 6 }}>Delete</button>
        </div>
      ))}
    </div>
  );
}