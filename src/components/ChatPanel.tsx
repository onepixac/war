"use client";

import { useState, useRef, useEffect } from "react";
import { Form, Button, Card, Spinner, Badge } from "react-bootstrap";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; url: string; source_name: string }[];
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-10),
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || data.error, sources: data.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: could not reach the server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column" style={{ height: 500 }}>
      <div className="flex-grow-1 overflow-auto mb-3 pe-2" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="text-secondary text-center py-5">
            <p className="mb-2">Ask about global conflicts and security events</p>
            <small>Examples:</small>
            <div className="d-flex flex-column gap-1 mt-2">
              {[
                "What happened in the Middle East today?",
                "Compare Russian vs Western coverage of Ukraine",
                "Latest drone strikes this week",
              ].map((q) => (
                <Button
                  key={q}
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setInput(q);
                  }}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-3 ${msg.role === "user" ? "text-end" : ""}`}
          >
            <Card
              bg={msg.role === "user" ? "primary" : "dark"}
              text="light"
              className={`d-inline-block border-0 ${msg.role === "user" ? "" : "border-secondary"}`}
              style={{ maxWidth: "85%" }}
            >
              <Card.Body className="py-2 px-3">
                <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-top border-secondary">
                    <small className="text-secondary">Sources:</small>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {msg.sources.map((s, j) => (
                        <a
                          key={j}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Badge bg="secondary">{s.source_name}</Badge>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        ))}

        {loading && (
          <div className="mb-3">
            <Spinner animation="border" size="sm" variant="light" />
            <small className="text-secondary ms-2">Analyzing sources...</small>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <Form onSubmit={sendMessage} className="d-flex gap-2">
        <Form.Control
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about conflicts, events, or sources..."
          className="bg-dark text-light border-secondary"
          disabled={loading}
        />
        <Button type="submit" variant="primary" disabled={loading || !input.trim()}>
          Send
        </Button>
      </Form>
    </div>
  );
}
