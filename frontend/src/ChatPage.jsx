import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Send,
  MessageSquare,
  X,
  ChevronRight,
  FileText,
  Loader2,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Building2,
  GraduationCap,
  ArrowUpRight,
} from "lucide-react";
import { API_BASE_URL } from "./config";
import "./ChatPage.css";

const API_URL = `${API_BASE_URL}/api/chat`;
const FEEDBACK_URL = `${API_BASE_URL}/api/feedback`;

const SUGGESTIONS = [
  {
    icon: Building2,
    label: "Hostel",
    question: "What are the hostel rules?",
  },
  {
    icon: GraduationCap,
    label: "Examinations",
    question: "Where can I find exam information?",
  },
  {
    icon: BookOpen,
    label: "Fees",
    question: "What are the hostel fees?",
  },
];

function Button({
  variant = "primary",
  size,
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}) {
  const cls = [
    "btn",
    `btn-${variant}`,
    size === "sm" ? "btn-sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 size={16} className="spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

function SourceList({ sources }) {
  const unique = [...new Set((sources || []).filter(Boolean))];

  if (unique.length === 0) return null;

  return (
    <details className="sources">
      <summary>
        <ChevronRight size={14} className="chev" aria-hidden="true" />
        <span>Sources</span>
        <span className="source-count">{unique.length}</span>
      </summary>

      <ul>
        {unique.map((source) => (
          <li key={source}>
            <FileText size={14} aria-hidden="true" />
            <span>{source}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

const fmtTime = (time) =>
  new Date(time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

function ChatMessage({ message, onRetry }) {
  const { role, text, sources, time, error, retryQuestion } = message;
  const isBot = role === "bot";

  return (
    <article
      className={`msg ${role}${error ? " error" : ""}`}
      aria-label={isBot ? "Assistant message" : "Your message"}
    >
      <div className="msg-meta">
        <span className="msg-author">
          {isBot ? (
            <>
              <span className="author-mark">P</span>
              ParulBuddy
            </>
          ) : (
            "You"
          )}
        </span>

        {time && (
          <time dateTime={new Date(time).toISOString()}>
            {fmtTime(time)}
          </time>
        )}
      </div>

      <div className="msg-body">
        {isBot && !error ? (
          <ReactMarkdown>{text}</ReactMarkdown>
        ) : error ? (
          <span className="msg-error-text">{text}</span>
        ) : (
          text
        )}
      </div>

      {isBot && <SourceList sources={sources} />}

      {error && retryQuestion && (
        <Button
          variant="secondary"
          size="sm"
          className="msg-retry"
          onClick={() => onRetry(retryQuestion)}
        >
          Try again
        </Button>
      )}
    </article>
  );
}

function EmptyState({ onPick }) {
  return (
    <section className="empty">
      <div className="empty-eyebrow">
        <span className="eyebrow-line" />
        UNIVERSITY HELP DESK
      </div>

      <div className="empty-heading">
        <div className="empty-icon" aria-hidden="true">
          <Sparkles size={22} strokeWidth={1.8} />
        </div>

        <div>
          <h1>How can we help?</h1>
          <p>
            Ask about Parul University services, policies, fees, hostels,
            examinations and more.
          </p>
        </div>
      </div>

      <div className="empty-note">
        <span className="note-dot" />
        Answers are grounded in university information available to
        ParulBuddy.
      </div>

      <div className="empty-label">Start with a question</div>

      <div className="suggestions">
        {SUGGESTIONS.map(({ icon: Icon, label, question }) => (
          <button
            key={question}
            type="button"
            className="suggestion"
            onClick={() => onPick(question)}
          >
            <span className="suggestion-icon">
              <Icon size={18} strokeWidth={1.8} />
            </span>

            <span className="suggestion-copy">
              <span className="suggestion-label">{label}</span>
              <span className="suggestion-question">{question}</span>
            </span>

            <ArrowUpRight
              className="suggestion-arrow"
              size={17}
              strokeWidth={1.8}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

const emailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function FeedbackForm({ onSent }) {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");

  async function submit(event) {
    event.preventDefault();

    const next = {};

    if (!message.trim()) {
      next.message = "Please enter your feedback.";
    }

    if (email.trim() && !emailOk(email.trim())) {
      next.email = "Enter a valid email address.";
    }

    setErrors(next);

    if (Object.keys(next).length) return;

    setStatus("loading");

    try {
      const response = await fetch(FEEDBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          name: name.trim(),
          email: email.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(String(response.status));
      }

      setStatus("success");
      setMessage("");
      setName("");
      setEmail("");

      setTimeout(() => onSent?.(), 2000);
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="banner ok" role="status">
        <CheckCircle2 size={18} aria-hidden="true" />
        <span>Thanks — your feedback has been submitted.</span>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="feedback-heading">
        <div>
          <span className="form-kicker">HELP US IMPROVE</span>
          <h2 id="feedback-modal-title">Send feedback</h2>
        </div>

        <button
          type="button"
          className="feedback-close"
          onClick={() => onSent?.()}
          aria-label="Close feedback"
        >
          <X size={18} />
        </button>
      </div>

      <p className="lead">
        Found something inaccurate or have an idea for ParulBuddy?
      </p>

      <div className="field">
        <label htmlFor="fb-message">Your feedback</label>
        <textarea
          id="fb-message"
          className="input"
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "fb-message-err" : undefined}
          placeholder="Tell us what could be better..."
        />
        {errors.message && (
          <div id="fb-message-err" className="field-error">
            {errors.message}
          </div>
        )}
      </div>

      <div className="feedback-fields">
        <div className="field">
          <label htmlFor="fb-name">
            Name <span className="opt">optional</span>
          </label>
          <input
            id="fb-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            placeholder="Your name"
          />
        </div>

        <div className="field">
          <label htmlFor="fb-email">
            Email <span className="opt">optional</span>
          </label>
          <input
            id="fb-email"
            type="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "fb-email-err" : undefined}
            placeholder="you@example.com"
          />
          {errors.email && (
            <div id="fb-email-err" className="field-error">
              {errors.email}
            </div>
          )}
        </div>
      </div>

      {status === "error" && (
        <div className="banner err" role="alert">
          Couldn&apos;t submit your feedback. Please try again.
        </div>
      )}

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={() => onSent?.()}>
          Cancel
        </Button>
        <Button type="submit" loading={status === "loading"}>
          Submit feedback
        </Button>
      </div>
    </form>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (!showFeedback) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") setShowFeedback(false);
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showFeedback]);

  useEffect(() => {
    const element = textareaRef.current;

    if (!element) return;

    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 150)}px`;
  }, [input]);

  async function ask(question) {
    const query = question.trim();

    if (!query || loading) return;

    setMessages((previous) => [
      ...previous.filter(
        (message) => !(message.error && message.retryQuestion === query)
      ),
      {
        role: "user",
        text: query,
        time: Date.now(),
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      if (!response.ok) {
        throw new Error(String(response.status));
      }

      const data = await response.json();

      setMessages((previous) => [
        ...previous,
        {
          role: "bot",
          text:
            data.answer ||
            "I couldn't find an answer to that. Please try rephrasing your question.",
          sources: data.sources,
          time: Date.now(),
        },
      ]);
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          role: "bot",
          error: true,
          retryQuestion: query,
          text: "Couldn't reach the server. Please check your connection and try again.",
          time: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      ask(input);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              P
            </div>

            <div className="brand-copy">
              <div className="header-title">ParulBuddy</div>
              <div className="header-sub">University help desk</div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="feedback-button"
            onClick={() => setShowFeedback((value) => !value)}
            aria-expanded={showFeedback}
            aria-controls="feedback-panel"
          >
            {showFeedback ? (
              <X size={16} aria-hidden="true" />
            ) : (
              <MessageSquare size={16} aria-hidden="true" />
            )}
            <span>{showFeedback ? "Close" : "Feedback"}</span>
          </Button>
        </div>
      </header>

      {showFeedback && (
        <div
          id="feedback-panel"
          className="feedback-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowFeedback(false);
            }
          }}
        >
          <div
            className="feedback-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <FeedbackForm onSent={() => setShowFeedback(false)} />
          </div>
        </div>
      )}

      <main className="chat-window" aria-live="polite">
        {messages.length === 0 && !loading ? (
          <EmptyState onPick={ask} />
        ) : (
          <div className="thread">
            {messages.map((message, index) => (
              <ChatMessage
                key={`${message.time}-${index}`}
                message={message}
                onRetry={ask}
              />
            ))}

            {loading && (
              <div
                className="msg bot"
                role="status"
                aria-label="ParulBuddy is typing"
              >
                <div className="msg-meta">
                  <span className="msg-author">
                    <span className="author-mark">P</span>
                    ParulBuddy
                  </span>
                </div>

                <div className="typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <footer className="composer">
        <div className="composer-inner">
          <label htmlFor="chat-input" className="sr-only">
            Ask ParulBuddy
          </label>

          <div className="composer-box">
            <textarea
              id="chat-input"
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about Parul University..."
              rows={1}
              aria-label="Ask ParulBuddy"
            />

            <Button
              className="send-button"
              onClick={() => ask(input)}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <Send size={17} aria-hidden="true" />
              <span>Send</span>
            </Button>
          </div>
        </div>

        <div className="composer-hint">
          <span>Enter to send</span>
          <span className="hint-separator">·</span>
          <span>Shift + Enter for a new line</span>
        </div>
      </footer>
    </div>
  );
}
