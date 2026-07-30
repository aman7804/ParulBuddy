import { useState, useRef, useEffect } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api/chat";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! I'm the Parul University helpdesk assistant. Ask me about Hostel, Exams, or Placement.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "bot", text: data.answer, matched: data.matched },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Couldn't reach the server. Is the backend running?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-title">Parul Helpdesk</div>
        <div className="header-sub">AI assistant · Hostel, Exams, Placement</div>
      </header>

      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`bubble-row ${m.role}`}>
            <div className={`bubble ${m.role}`}>
              {m.text}
              {m.matched && m.matched.length > 0 && (
                <div className="matched-tag">source: {m.matched.join(", ")}</div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="bubble-row bot">
            <div className="bubble bot typing">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="input-bar">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about hostel fee, exam dates, placement policy..."
          rows={1}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}