"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Form, Button, Card, Spinner, Badge, Row, Col } from "react-bootstrap";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; url: string; source_name: string }[];
}

const SUGGESTED_QUESTIONS = [
  "What happened in the Middle East today?",
  "Latest military operations this week?",
  "Compare coverage of Ukraine conflict",
  "Any escalations in Asia-Pacific?",
  "Recent drone strikes reported?",
  "Humanitarian crises right now?",
];

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingSources, setStreamingSources] = useState<Message["sources"]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage = text.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    setStreamingContent("");
    setStreamingSources([]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-10),
        }),
      });

      if (!res.ok) throw new Error("Failed to connect");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let fullContent = "";
      let sources: Message["sources"] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "sources") {
              sources = data.sources;
              setStreamingSources(data.sources);
            } else if (data.type === "token") {
              fullContent += data.content;
              setStreamingContent(fullContent);
            } else if (data.type === "error") {
              fullContent += `\n\nError: ${data.error}`;
              setStreamingContent(fullContent);
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: fullContent || "No response received.", sources },
      ]);
      setStreamingContent("");
      setStreamingSources([]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: could not reach the server." },
      ]);
      setStreamingContent("");
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="d-flex flex-column" style={{ height: "100%" }}>
      <div className="flex-grow-1 overflow-auto mb-3 pe-2" style={{ minHeight: 0 }}>
        {messages.length === 0 && !loading && (
          <div className="text-secondary text-center py-5">
            <p className="mb-3">Ask about global conflicts and security events</p>
            <Row className="g-2 justify-content-center" style={{ maxWidth: 600, margin: "0 auto" }}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <Col key={q} xs={6} md={4}>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="w-100 text-start"
                    style={{ fontSize: "0.8rem" }}
                    onClick={() => sendMessage(q)}
                  >
                    {q}
                  </Button>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`mb-3 ${msg.role === "user" ? "text-end" : ""}`}>
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
                        <a key={j} href={s.url} target="_blank" rel="noopener noreferrer">
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

        {/* Streaming message */}
        {loading && streamingContent && (
          <div className="mb-3">
            <Card bg="dark" text="light" className="d-inline-block border-0" style={{ maxWidth: "85%" }}>
              <Card.Body className="py-2 px-3">
                <div style={{ whiteSpace: "pre-wrap" }}>{streamingContent}<span className="opacity-50">▊</span></div>
                {streamingSources && streamingSources.length > 0 && (
                  <div className="mt-2 pt-2 border-top border-secondary">
                    <small className="text-secondary">Sources:</small>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {streamingSources.map((s, j) => (
                        <a key={j} href={s.url} target="_blank" rel="noopener noreferrer">
                          <Badge bg="secondary">{s.source_name}</Badge>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        )}

        {loading && !streamingContent && (
          <div className="mb-3">
            <Spinner animation="border" size="sm" variant="light" />
            <small className="text-secondary ms-2">Searching sources...</small>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <Form onSubmit={handleSubmit} className="d-flex gap-2">
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
