import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export default function FeedbackAdmin({ token, onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/feedback`, {
        headers: authHeaders,
      });
      if (res.status === 401 || res.status === 403) return onLogout();
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this feedback entry?"))
      return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/feedback/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.status === 401 || res.status === 403) return onLogout();
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      console.error("Failed to delete feedback:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredItems = items.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (f.message && f.message.toLowerCase().includes(q)) ||
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.email && f.email.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0 }}>User Feedbacks</h2>
          <span
            style={{
              background: "#1f2937",
              color: "#fff",
              borderRadius: "12px",
              padding: "2px 10px",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            {items.length}
          </span>
        </div>
        <button
          onClick={fetchFeedback}
          disabled={loading}
          style={{
            padding: "6px 14px",
            fontSize: "13px",
            cursor: "pointer",
            borderRadius: "6px",
            border: "1px solid #ccc",
            background: "#fff",
          }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Review and manage feedback submitted by users and students.
      </p>

      {items.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Search by feedback content, name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "14px",
            }}
          />
        </div>
      )}

      {loading && <p style={{ color: "#666" }}>Loading feedbacks...</p>}

      {!loading && items.length === 0 && (
        <div
          style={{
            padding: "30px 20px",
            textAlign: "center",
            background: "#f9fafb",
            borderRadius: "8px",
            border: "1px dashed #d1d5db",
            color: "#6b7280",
          }}
        >
          <p style={{ margin: 0, fontSize: "15px" }}>
            No feedback submitted yet.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && filteredItems.length === 0 && (
        <p style={{ color: "#666" }}>No feedback matching "{searchQuery}".</p>
      )}

      {!loading &&
        filteredItems.map((f) => (
          <div
            key={f._id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
              background: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "14px",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                    color: "#111827",
                  }}
                >
                  {f.message}
                </p>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <span>
                    <strong>From:</strong> {f.name ? f.name : "Anonymous"}
                  </span>
                  {f.email && (
                    <span>
                      <strong>Email:</strong>{" "}
                      <a
                        href={`mailto:${f.email}`}
                        style={{ color: "#2563eb", textDecoration: "none" }}
                      >
                        {f.email}
                      </a>
                    </span>
                  )}
                  <span>
                    <strong>Submitted:</strong>{" "}
                    {f.createdAt
                      ? new Date(f.createdAt).toLocaleString()
                      : "Unknown date"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(f._id)}
                disabled={deletingId === f._id}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  color: "#dc2626",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "6px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {deletingId === f._id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
