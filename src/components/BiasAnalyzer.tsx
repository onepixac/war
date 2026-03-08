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
      const newsRes = await fetch(`/api/news?limit=20`);
      const newsData = await newsRes.json();
      const articles = (newsData.articles || []).slice(0, 10).map((a: Record<string, unknown>) => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        source_name: a.source_name || "Unknown",
        source_category: a.source_category || "unknown",
        region: a.region || "unknown",
      }));

      if (articles.length < 2) {
        alert("Not enough articles found for bias analysis. Need at least 2 sources.");
        return;
      }

      const res = await fetch("/api/bias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventTopic: topic.trim(), articles }),
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

  const getBiasColor = (score: number) => {
    if (score >= 0.5) return "success";
    if (score >= 0) return "warning";
    return "danger";
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <h5 className="text-light fw-bold mb-3">Bias Analysis</h5>

      <Form onSubmit={analyze} className="d-flex gap-2 mb-4">
        <Form.Control
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter an event or topic to analyze bias (e.g., 'Iran drone attack')"
          className="bg-dark"
          disabled={loading}
        />
        <Button type="submit" variant="warning" disabled={loading || !topic.trim()} className="px-4">
          {loading ? <Spinner animation="border" size="sm" /> : "Analyze"}
        </Button>
      </Form>

      {results.length === 0 && !loading && (
        <Card bg="dark" className="border-secondary text-center py-5">
          <Card.Body>
            <p className="text-secondary mb-1">Enter a topic to compare how different sources cover it.</p>
            <small className="text-secondary">The system will analyze narrative framing and propaganda indicators.</small>
          </Card.Body>
        </Card>
      )}

      {results.map((result, i) => (
        <Card key={i} bg="dark" text="light" className="border-secondary mb-3 fade-in">
          <Card.Header className="d-flex justify-content-between align-items-center border-secondary">
            <strong>{result.event_topic}</strong>
            <div className="d-flex align-items-center gap-2">
              <small className="text-secondary">Propaganda Index:</small>
              <Badge bg={result.propaganda_index > 60 ? "danger" : result.propaganda_index > 30 ? "warning" : "success"}>
                {result.propaganda_index}/100
              </Badge>
            </div>
          </Card.Header>
          <Card.Body>
            <p className="text-secondary mb-3">{result.overall_assessment}</p>

            <Row className="g-2">
              {result.sources?.map((source, j) => (
                <Col key={j} md={6}>
                  <Card className="border-secondary h-100" style={{ background: "#111318" }}>
                    <Card.Body className="py-2 px-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className="text-light">{source.name}</strong>
                        <Badge bg={getBiasColor(source.bias_score)}>
                          {source.bias_score > 0 ? "+" : ""}{source.bias_score.toFixed(1)}
                        </Badge>
                      </div>
                      <ProgressBar
                        now={(source.bias_score + 1) * 50}
                        variant={getBiasColor(source.bias_score)}
                        className="mb-2"
                        style={{ height: 4 }}
                      />
                      <small className="text-secondary d-block mb-1">
                        {source.narrative_framing}
                      </small>
                      {source.propaganda_indicators?.length > 0 && (
                        <div className="d-flex flex-wrap gap-1 mt-1">
                          {source.propaganda_indicators.map((ind, k) => (
                            <Badge key={k} bg="dark" className="border border-secondary fw-normal" style={{ fontSize: "0.7rem" }}>
                              {ind}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
}
