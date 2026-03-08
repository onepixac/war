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
    <div>
      <Row className="mb-3">
        <Col>
          <Form.Select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-dark text-light border-secondary"
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
          <Spinner animation="border" variant="light" />
        </div>
      ) : articles.length === 0 ? (
        <p className="text-secondary text-center py-4">No articles found. Run the news pipeline to populate data.</p>
      ) : (
        <div className="d-flex flex-column gap-2">
          {articles.map((article) => (
            <Card key={article.id} bg="dark" text="light" className="border-secondary">
              <Card.Body className="py-2 px-3">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-light text-decoration-none fw-semibold"
                    >
                      {article.title}
                    </a>
                    {article.summary && (
                      <p className="text-secondary small mb-0 mt-1">{article.summary}</p>
                    )}
                  </div>
                  <div className="d-flex flex-column align-items-end gap-1 ms-3 flex-shrink-0">
                    <Badge bg={CATEGORY_COLORS[article.source_category] || "secondary"}>
                      {article.source_name || "Unknown"}
                    </Badge>
                    <small className="text-secondary">
                      {article.region?.replace(/_/g, " ")}
                    </small>
                  </div>
                </div>
                <small className="text-secondary">
                  {article.published_at && new Date(article.published_at).toLocaleString()}
                </small>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
