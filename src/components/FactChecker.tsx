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

const VERDICT_COLORS: Record<string, string> = {
  CONFIRMED: "success",
  LIKELY_TRUE: "info",
  UNVERIFIED: "warning",
  DISPUTED: "warning",
  LIKELY_FALSE: "danger",
  FALSE: "danger",
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
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <h5 className="text-light fw-bold mb-3">Fact Checker</h5>

      <Form onSubmit={check} className="d-flex gap-2 mb-4">
        <Form.Control
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          placeholder='Enter a claim to verify (e.g., "Russia struck a hospital in Kharkiv")'
          className="bg-dark"
          disabled={loading}
        />
        <Button type="submit" variant="info" disabled={loading || !claim.trim()} className="px-4">
          {loading ? <Spinner animation="border" size="sm" /> : "Verify"}
        </Button>
      </Form>

      {results.length === 0 && !loading && (
        <Card bg="dark" className="border-secondary text-center py-5">
          <Card.Body>
            <p className="text-secondary mb-1">Enter a claim to cross-reference across multiple news sources.</p>
            <small className="text-secondary">The system will search for supporting and contradicting evidence.</small>
          </Card.Body>
        </Card>
      )}

      {results.map((result, i) => (
        <Card key={i} bg="dark" text="light" className="border-secondary mb-3 fade-in">
          <Card.Header className="d-flex justify-content-between align-items-center border-secondary">
            <span className="fw-semibold">&quot;{result.claim}&quot;</span>
            <div className="d-flex align-items-center gap-2">
              <Badge bg={VERDICT_COLORS[result.verdict] || "secondary"} style={{ fontSize: "0.85rem" }}>
                {result.verdict?.replace(/_/g, " ")}
              </Badge>
              <Badge bg="dark" className="border border-secondary">
                {Math.round((result.confidence_score || 0) * 100)}% confidence
              </Badge>
            </div>
          </Card.Header>
          <Card.Body>
            <p className="text-light mb-3">{result.analysis}</p>

            <Row className="g-3">
              {result.evidence?.supporting?.length > 0 && (
                <Col md={6}>
                  <h6 className="text-success small fw-bold mb-2">Supporting Evidence</h6>
                  {result.evidence.supporting.map((e, j) => (
                    <div key={j} className="mb-2 ps-2 border-start border-success border-2">
                      <strong className="small text-light">{e.source}</strong>
                      <p className="text-secondary small mb-0">{e.excerpt}</p>
                    </div>
                  ))}
                </Col>
              )}

              {result.evidence?.contradicting?.length > 0 && (
                <Col md={6}>
                  <h6 className="text-danger small fw-bold mb-2">Contradicting Evidence</h6>
                  {result.evidence.contradicting.map((e, j) => (
                    <div key={j} className="mb-2 ps-2 border-start border-danger border-2">
                      <strong className="small text-light">{e.source}</strong>
                      <p className="text-secondary small mb-0">{e.excerpt}</p>
                    </div>
                  ))}
                </Col>
              )}
            </Row>

            {result.evidence?.missing_from?.length > 0 && (
              <div className="mt-3 pt-2 border-top border-secondary">
                <small className="text-warning">
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
