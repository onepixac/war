"use client";

import { useState, useEffect } from "react";
import { Form, Button, Card, Badge, Spinner, Row, Col } from "react-bootstrap";

interface FactCheckResult {
  claim: string;
  confidence_score: number;
  verdict: string;
  evidence: {
    supporting: { source: string; excerpt: string }[];
    contradicting: { source: string; excerpt: string }[];
    missing_from: string[];
  };
  analysis: string;
  created_at?: string;
}

const VERDICT_CLASS: Record<string, string> = {
  CONFIRMED: "badge-pastel-green",
  LIKELY_TRUE: "badge-pastel-teal",
  UNVERIFIED: "badge-pastel-yellow",
  DISPUTED: "badge-pastel-orange",
  LIKELY_FALSE: "badge-pastel-red",
  FALSE: "badge-pastel-red",
};

export default function FactChecker() {
  const [claim, setClaim] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FactCheckResult[]>([]);

  useEffect(() => {
    fetch("/api/factcheck")
      .then((r) => r.json())
      .then((data) => setResults(data.checks || []))
      .catch(console.error);
  }, []);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim.trim() || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/factcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: claim.trim() }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults((prev) => [data, ...prev]);
      setClaim("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h6 className="section-header mb-3">Fact Checker</h6>

      <Form onSubmit={check} className="d-flex gap-2 mb-4">
        <Form.Control
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          placeholder='Enter a claim to verify (e.g., "Russia struck a hospital in Kharkiv")'
          className="bg-dark"
          disabled={loading}
        />
        <Button type="submit" variant="info" disabled={loading || !claim.trim()} style={{ padding: "6px 24px" }}>
          {loading ? <Spinner animation="border" size="sm" /> : "Verify"}
        </Button>
      </Form>

      {results.length === 0 && !loading && (
        <div className="empty-state">
          <p style={{ fontSize: "0.85rem" }}>Enter a claim to cross-reference across multiple news sources.</p>
          <small>The agent will search for supporting and contradicting evidence.</small>
        </div>
      )}

      {results.map((result, i) => (
        <Card key={i} className="mb-3 fade-in" style={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ background: "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span className="text-light" style={{ fontWeight: 500, fontSize: "0.88rem" }}>
              &quot;{result.claim}&quot;
            </span>
            <div className="d-flex align-items-center gap-2">
              <Badge className={VERDICT_CLASS[result.verdict] || "badge-pastel-muted"} style={{ fontSize: "0.78rem" }}>
                {result.verdict?.replace(/_/g, " ")}
              </Badge>
              <Badge className="badge-pastel-muted" style={{ fontSize: "0.72rem" }}>
                {Math.round((result.confidence_score || 0) * 100)}% confidence
              </Badge>
            </div>
          </Card.Header>
          <Card.Body>
            <p style={{ color: "#c9d1d9", fontSize: "0.85rem", marginBottom: "1rem" }}>{result.analysis}</p>

            <Row className="g-3">
              {result.evidence?.supporting?.length > 0 && (
                <Col md={6}>
                  <h6 style={{ color: "#81c784", fontSize: "0.78rem", fontWeight: 600, marginBottom: 8 }}>Supporting Evidence</h6>
                  {result.evidence.supporting.map((e, j) => (
                    <div key={j} className="mb-2 ps-2" style={{ borderLeft: "2px solid rgba(129,199,132,0.4)" }}>
                      <strong style={{ fontSize: "0.75rem", color: "#c9d1d9" }}>{e.source}</strong>
                      <p style={{ color: "#6c757d", fontSize: "0.75rem", marginBottom: 0 }}>{e.excerpt}</p>
                    </div>
                  ))}
                </Col>
              )}

              {result.evidence?.contradicting?.length > 0 && (
                <Col md={6}>
                  <h6 style={{ color: "#e57373", fontSize: "0.78rem", fontWeight: 600, marginBottom: 8 }}>Contradicting Evidence</h6>
                  {result.evidence.contradicting.map((e, j) => (
                    <div key={j} className="mb-2 ps-2" style={{ borderLeft: "2px solid rgba(229,115,115,0.4)" }}>
                      <strong style={{ fontSize: "0.75rem", color: "#c9d1d9" }}>{e.source}</strong>
                      <p style={{ color: "#6c757d", fontSize: "0.75rem", marginBottom: 0 }}>{e.excerpt}</p>
                    </div>
                  ))}
                </Col>
              )}
            </Row>

            {result.evidence?.missing_from?.length > 0 && (
              <div className="mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <small style={{ color: "#ffb74d", fontSize: "0.72rem" }}>
                  Not covered by: {result.evidence.missing_from.join(", ")}
                </small>
              </div>
            )}
          </Card.Body>
        </Card>
      ))}
    </div>
  );
}
