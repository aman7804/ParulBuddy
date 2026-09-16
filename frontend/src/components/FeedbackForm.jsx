import { useState } from "react";
import { API_BASE_URL } from "../config";

export default function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(""); // "", "sending", "sent", "error"

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus("sending");
    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, name, email }),
      });
      if (!res.ok) throw new Error();
      setMessage("");
      setName("");
      setEmail("");
      setStatus("");
      onSent?.();
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return <p>Thanks for your feedback!</p>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 16 }}>
      <h4>Send Feedback</h4>
      <textarea
        placeholder="Your feedback or suggestion..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        style={{ display: "block", width: "100%", marginBottom: 8, padding: 6 }}
      />
      <input
        placeholder="Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: 8, padding: 6 }}
      />
      <input
        placeholder="Email (optional)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: 8, padding: 6 }}
      />
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Submit"}
      </button>
      {status === "error" && (
        <p style={{ color: "red" }}>Failed to send, try again.</p>
      )}
    </form>
  );
}
