"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Spinner, Form, Row, Col } from "react-bootstrap";

interface Article {
  id: number;
  title: string;
  summary: string;
  url: string;
  region: string;
  source_name: string;
  source_category: string;
  published_at: string;
}

const REGIONS = [
  "all", "iran", "russia", "israel", "gulf", "middle_east",
  "proxy", "china", "turkey", "south_asia", "western",
];

const CATEGORY_COLORS: Record<string, string> = {
  state: "danger",
  "state-aligned": "warning",
  proxy: "dark",
  independent: "info",
  unknown: "secondary",
};

export default function NewsFeed() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("all");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (region !== "all") params.set("region", region);

    fetch(`/api/news?${params}`)
      .then((r) => r.json())
      .then((data) => setArticles(data.articles || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [region]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <Row className="mb-3 align-items-center">
        <Col xs="auto">
          <h5 className="text-light fw-bold mb-0">News Feed</h5>
        </Col>
        <Col xs="auto" className="ms-auto">
          <Form.Select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-dark"
            size="sm"
            style={{ width: "auto" }}
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r === "all" ? "All Regions" : r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="danger" />
        </div>
      ) : articles.length === 0 ? (
        <Card bg="dark" className="border-secondary text-center py-5">
          <Card.Body>
            <p className="text-secondary mb-0">No articles found. Run the news pipeline to populate data.</p>
          </Card.Body>
        </Card>
      ) : (
        <div className="d-flex flex-column gap-2">
          {articles.map((article, i) => (
            <Card key={article.id} bg="dark" text="light" className="border-secondary fade-in" style={{ animationDelay: `${i * 0.02}s` }}>
              <Card.Body className="py-2 px-3">
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div className="flex-grow-1 min-w-0">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-light text-decoration-none fw-semibold d-block text-truncate"
                      style={{ fontSize: "0.9rem" }}
                    >
                      {article.title}
                    </a>
                    {article.summary && (
                      <p className="text-secondary small mb-0 mt-1" style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}>
                        {article.summary}
                      </p>
                    )}
                    <div className="mt-1 d-flex align-items-center gap-2">
                      <small className="text-secondary">
                        {article.published_at && new Date(article.published_at).toLocaleString()}
                      </small>
                      <small className="text-secondary">
                        {article.region?.replace(/_/g, " ")}
                      </small>
                    </div>
                  </div>
                  <Badge bg={CATEGORY_COLORS[article.source_category] || "secondary"} className="flex-shrink-0">
                    {article.source_name || "Unknown"}
                  </Badge>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
