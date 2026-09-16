import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export default function UnansweredQuestions({ token, onLogout }) {
  const [questions, setQuestions] = useState([]);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchQuestions = async () => {
    const res = await fetch(`${API_BASE_URL}/api/admin/unanswered`, {
      headers: authHeaders,
    });
    if (res.status === 401 || res.status === 403) {
      onLogout();
      return;
    }
    const data = await res.json();
    setQuestions(data);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleDismiss = async (id) => {
    await fetch(`${API_BASE_URL}/api/admin/unanswered/${id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    fetchQuestions();
  };

  return (
    <div>
      <h2>Unanswered Questions</h2>
      <p style={{ color: "#666" }}>
        Questions where no keyword match was found. Use these to spot gaps in
        the knowledge base.
      </p>
      <table
        width="100%"
        border="1"
        cellPadding="6"
        style={{ borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>Question</th>
            <th>Times Asked</th>
            <th>Last Asked</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => (
            <tr key={q._id}>
              <td>{q.question}</td>
              <td>{q.timesAsked}</td>
              <td>{new Date(q.updatedAt).toLocaleString()}</td>
              <td>
                <button onClick={() => handleDismiss(q._id)}>Dismiss</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
