import { useEffect, useState } from "react";

export default function AggregateQuestions({ token, onLogout }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchQuestions = async () => {
    setLoading(true);
    const res = await fetch(
      "http://localhost:5000/api/admin/aggregate-questions",
      { headers: authHeaders },
    );
    if (res.status === 401 || res.status === 403) {
      onLogout();
      return;
    }
    const data = await res.json();
    setQuestions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handlePromote = async (id) => {
    setError("");
    setBusyId(id);
    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/aggregate-questions/${id}/promote`,
        { method: "POST", headers: authHeaders },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to promote");
        return;
      }
      setQuestions((prev) => prev.filter((q) => q._id !== id));
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (id) => {
    if (!confirm("Dismiss this question without adding it to the knowledge base?"))
      return;
    setBusyId(id);
    try {
      await fetch(`http://localhost:5000/api/admin/aggregate-questions/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      setQuestions((prev) => prev.filter((q) => q._id !== id));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p>Loading aggregate questions...</p>;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h2>Aggregate Questions</h2>
      <p style={{ fontSize: 13, color: "#555" }}>
        These are questions answered live by pulling all entries in a category
        (cheapest/compare/list-all type questions). Promote a good answer to
        bake it into that category's Aggregate subcategory permanently —
        future identical/related questions get answered instantly instead of
        recomputed. Dismiss to discard without saving.
      </p>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {questions.length === 0 && <p>No pending aggregate questions.</p>}

      {questions.map((q) => (
        <div
          key={q._id}
          style={{
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
            Category: <strong>{q.category}</strong> · Asked {q.timesAsked}{" "}
            time{q.timesAsked !== 1 ? "s" : ""}
          </div>
          <p style={{ margin: "4px 0" }}>
            <strong>Q:</strong> {q.question}
          </p>
          <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>
            <strong>A:</strong> {q.answer}
          </p>
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => handlePromote(q._id)}
              disabled={busyId === q._id}
            >
              {busyId === q._id ? "Promoting..." : "Promote to KB"}
            </button>
            <button
              onClick={() => handleDismiss(q._id)}
              disabled={busyId === q._id}
              style={{ marginLeft: 8 }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}