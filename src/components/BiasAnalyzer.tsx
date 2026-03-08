"use client";

import { useState, useEffect } from "react";
import { Form, Button, Card, Badge, Spinner, ProgressBar, Row, Col } from "react-bootstrap";

interface BiasSource {
  name: string;
  category: string;
  region: string;
  headline: string;
  bias_score: number;
  propaganda_indicators: string[];
  narrative_framing: string;
}

interface BiasResult {
  event_topic: string;
  sources: BiasSource[];
  overall_assessment: string;
  propaganda_index: number;
  created_at?: string;
}

export default function BiasAnalyzer() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BiasResult[]>([]);

  useEffect(() => {
    fetch("/api/bias")
      .then((r) => r.json())
      .then((data) => setResults(data.analyses || []))
      .catch(console.error);
  }, []);

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/bias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventTopic: topic.trim() }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults((prev) => [data, ...prev]);
      setTopic("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getBiasClass = (score: number) => {
    if (score >= 0.5) return "badge-pastel-green";
    if (score >= 0) return "badge-pastel-yellow";
    return "badge-pastel-red";
  };

  const getBiasVariant = (score: number) => {
    if (score >= 0.5) return "success";
    if (score >= 0) return "warning";
    return "danger";
  };

  const getPropagandaClass = (idx: number) => {
    if (idx > 60) return "badge-pastel-red";
    if (idx > 30) return "badge-pastel-yellow";
    return "badge-pastel-green";
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h6 className="section-header mb-3">Bias Analysis</h6>

      <Form onSubmit={analyze} className="d-flex gap-2 mb-4">
        <Form.Control
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter an event or topic to analyze bias (e.g., 'Iran drone attack')"
          className="bg-dark"
          disabled={loading}
        />
        <Button type="submit" variant="warning" disabled={loading || !topic.trim()} style={{ padding: "6px 24px" }}>
          {loading ? <Spinner animation="border" size="sm" /> : "Analyze"}
        </Button>
      </Form>

      {results.length === 0 && !loading && (
        <div className="empty-state">
          <p style={{ fontSize: "0.85rem" }}>Enter a topic to compare how different sources cover it.</p>
          <small>The agent will analyze narrative framing and propaganda indicators.</small>
        </div>
      )}

      {results.map((result, i) => (
        <Card key={i} className="mb-3 fade-in" style={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Card.Header className="d-flex justify-content-between align-items-center" style={{ background: "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <strong className="text-light" style={{ fontSize: "0.9rem" }}>{result.event_topic}</strong>
            <div className="d-flex align-items-center gap-2">
              <small style={{ color: "#484f58", fontSize: "0.72rem" }}>Propaganda:</small>
              <Badge className={getPropagandaClass(result.propaganda_index)} style={{ fontSize: "0.72rem" }}>
                {result.propaganda_index}/100
              </Badge>
            </div>
          </Card.Header>
          <Card.Body>
            <p style={{ color: "#8b949e", fontSize: "0.82rem", marginBottom: "1rem" }}>{result.overall_assessment}</p>

            <Row className="g-2">
              {result.sources?.map((source, j) => (
                <Col key={j} md={6}>
                  <div style={{ background: "#0d0f13", borderRadius: 10, padding: "12px", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong className="text-light" style={{ fontSize: "0.82rem" }}>{source.name}</strong>
                      <Badge className={getBiasClass(source.bias_score)} style={{ fontSize: "0.7rem" }}>
                        {source.bias_score > 0 ? "+" : ""}{source.bias_score.toFixed(1)}
                      </Badge>
                    </div>
                    <ProgressBar
                      now={(source.bias_score + 1) * 50}
                      variant={getBiasVariant(source.bias_score)}
                      className="mb-2"
                      style={{ height: 3 }}
                    />
                    <small style={{ color: "#6c757d", fontSize: "0.75rem" }}>
                      {source.narrative_framing}
                    </small>
                    {source.propaganda_indicators?.length > 0 && (
                      <div className="d-flex flex-wrap gap-1 mt-2">
                        {source.propaganda_indicators.map((ind, k) => (
                          <Badge key={k} className="badge-pastel-muted" style={{ fontSize: "0.65rem", fontWeight: 400 }}>
                            {ind}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
}
