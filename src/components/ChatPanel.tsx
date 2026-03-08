"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Form, Button, Spinner, Badge, Row, Col } from "react-bootstrap";

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
  const [statusText, setStatusText] = useState("");
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
    setStatusText("");

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
            } else if (data.type === "status") {
              setStatusText(data.content);
            } else if (data.type === "token") {
              setStatusText("");
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

  const renderSources = (sources: Message["sources"]) => {
    if (!sources || sources.length === 0) return null;
    return (
      <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <small style={{ color: "#484f58", fontSize: "0.7rem" }}>Sources:</small>
        <div className="d-flex flex-wrap gap-1 mt-1">
          {sources.map((s, j) => (
            <a key={j} href={s.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <Badge className="badge-pastel-teal" style={{ fontSize: "0.65rem", fontWeight: 400 }}>
                {s.source_name}
              </Badge>
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="d-flex flex-column" style={{ height: "100%", maxWidth: 800, margin: "0 auto" }}>
      <div className="flex-grow-1 overflow-auto mb-3 pe-2" style={{ minHeight: 0 }}>
        {messages.length === 0 && !loading && (
          <div className="fade-in" style={{ paddingTop: "15vh", textAlign: "center" }}>
            <h5 style={{ color: "#c9d1d9", fontWeight: 600, marginBottom: 4 }}>Intelligence Chat</h5>
            <p style={{ color: "#484f58", fontSize: "0.8rem", marginBottom: "2rem" }}>
              Ask about global conflicts. Powered by multi-agent RAG.
            </p>
            <Row className="g-2 justify-content-center" style={{ maxWidth: 560, margin: "0 auto" }}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <Col key={q} xs={6} md={4}>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="w-100 text-start"
                    onClick={() => sendMessage(q)}
                    style={{ lineHeight: 1.3, padding: "8px 10px" }}
                  >
                    {q}
                  </Button>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`mb-3 ${msg.role === "user" ? "text-end" : ""} fade-in`}>
            <div
              className={`d-inline-block ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}
              style={{ maxWidth: "80%", padding: "10px 14px" }}
            >
              <div style={{ whiteSpace: "pre-wrap", fontSize: "0.88rem", lineHeight: 1.6 }}>{msg.content}</div>
              {renderSources(msg.sources)}
            </div>
          </div>
        ))}

        {loading && streamingContent && (
          <div className="mb-3 fade-in">
            <div className="d-inline-block chat-bubble-assistant" style={{ maxWidth: "80%", padding: "10px 14px" }}>
              <div style={{ whiteSpace: "pre-wrap", fontSize: "0.88rem", lineHeight: 1.6 }}>
                {streamingContent}<span className="pulse" style={{ color: "#e57373" }}>|</span>
              </div>
              {renderSources(streamingSources)}
            </div>
          </div>
        )}

        {loading && !streamingContent && (
          <div className="mb-3 fade-in d-flex align-items-center gap-2">
            <Spinner animation="border" size="sm" style={{ color: "#e57373", width: 14, height: 14 }} />
            <small style={{ color: "#484f58", fontSize: "0.78rem" }}>
              {statusText || "Analyzing with intelligence agents..."}
            </small>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <Form onSubmit={handleSubmit} className="d-flex gap-2">
        <Form.Control
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about conflicts, events, or sources..."
          className="bg-dark"
          disabled={loading}
        />
        <Button type="submit" variant="danger" disabled={loading || !input.trim()} style={{ padding: "6px 20px" }}>
          Send
        </Button>
      </Form>
    </div>
  );
}
