"use client";

import { useEffect, useState } from "react";
import { Badge, Spinner, Form, Row, Col } from "react-bootstrap";

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

const CATEGORY_BADGE: Record<string, string> = {
  state: "badge-pastel-red",
  "state-aligned": "badge-pastel-orange",
  proxy: "badge-pastel-purple",
  independent: "badge-pastel-teal",
  unknown: "badge-pastel-muted",
};

const REGION_BADGE: Record<string, string> = {
  iran: "badge-pastel-orange",
  russia: "badge-pastel-red",
  israel: "badge-pastel-teal",
  gulf: "badge-pastel-yellow",
  middle_east: "badge-pastel-orange",
  china: "badge-pastel-red",
  turkey: "badge-pastel-orange",
  south_asia: "badge-pastel-green",
  western: "badge-pastel-teal",
  proxy: "badge-pastel-purple",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

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
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <Row className="mb-3 align-items-center">
        <Col>
          <h6 className="section-header mb-0">News Feed</h6>
        </Col>
        <Col xs="auto">
          <Form.Select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-dark"
            size="sm"
            style={{ width: "auto", fontSize: "0.8rem" }}
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
          <Spinner animation="border" size="sm" variant="secondary" />
        </div>
      ) : articles.length === 0 ? (
        <div className="empty-state">
          <p>No articles found.</p>
          <small>Run the news pipeline to populate data.</small>
        </div>
      ) : (
        <div className="d-flex flex-column gap-1">
          {articles.map((article, i) => (
            <div
              key={article.id}
              className="news-card p-3 fade-in"
              style={{ animationDelay: `${Math.min(i * 0.02, 0.5)}s` }}
            >
              <div className="d-flex gap-3 align-items-start">
                <div className="flex-grow-1 min-w-0">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-title d-block"
                  >
                    {article.title}
                  </a>
                  {article.summary && (
                    <p className="mb-0 mt-1" style={{
                      color: "#6c757d",
                      fontSize: "0.78rem",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>
                      {article.summary}
                    </p>
                  )}
                  <div className="mt-2 d-flex align-items-center gap-2 flex-wrap">
                    <Badge className={CATEGORY_BADGE[article.source_category] || "badge-pastel-muted"} style={{ fontSize: "0.68rem" }}>
                      {article.source_name || "Unknown"}
                    </Badge>
                    <Badge className={REGION_BADGE[article.region] || "badge-pastel-muted"} style={{ fontSize: "0.68rem" }}>
                      {article.region?.replace(/_/g, " ")}
                    </Badge>
                    <span className="news-meta">
                      {article.published_at && timeAgo(article.published_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
