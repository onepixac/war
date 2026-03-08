"use client";

import { useState } from "react";
import { Nav, Container } from "react-bootstrap";
import ConflictMap from "@/components/ConflictMap";
import NewsFeed from "@/components/NewsFeed";
import ChatPanel from "@/components/ChatPanel";
import BiasAnalyzer from "@/components/BiasAnalyzer";
import FactChecker from "@/components/FactChecker";

const TABS = [
  { key: "map", label: "Live Map", icon: "bi-globe-americas" },
  { key: "news", label: "News Feed", icon: "bi-newspaper" },
  { key: "chat", label: "Intel Chat", icon: "bi-chat-dots" },
  { key: "bias", label: "Bias Analysis", icon: "bi-bar-chart-line" },
  { key: "factcheck", label: "Fact Check", icon: "bi-shield-check" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("map");

  return (
    <div className="d-flex flex-column" style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      {/* Top bar */}
      <div className="war-navbar d-flex align-items-center px-3 py-2" style={{ flexShrink: 0 }}>
        <h5 className="mb-0 me-auto fw-bold d-flex align-items-center gap-2">
          <span className="text-danger" style={{ letterSpacing: "2px" }}>WAR</span>
          <small className="text-secondary fw-normal" style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}>
            GLOBAL CONFLICT MONITOR
          </small>
        </h5>
        <Nav variant="pills" className="gap-1">
          {TABS.map((tab) => (
            <Nav.Item key={tab.key}>
              <Nav.Link
                active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{ cursor: "pointer" }}
              >
                {tab.label}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </div>

      {/* Content area */}
      <div className="flex-grow-1" style={{ minHeight: 0 }}>
        {activeTab === "map" && <ConflictMap />}
        {activeTab === "news" && (
          <Container fluid className="p-3 overflow-auto" style={{ height: "100%" }}>
            <NewsFeed />
          </Container>
        )}
        {activeTab === "chat" && (
          <Container fluid className="p-3" style={{ height: "100%" }}>
            <ChatPanel />
          </Container>
        )}
        {activeTab === "bias" && (
          <Container fluid className="p-3 overflow-auto" style={{ height: "100%" }}>
            <BiasAnalyzer />
          </Container>
        )}
        {activeTab === "factcheck" && (
          <Container fluid className="p-3 overflow-auto" style={{ height: "100%" }}>
            <FactChecker />
          </Container>
        )}
      </div>
    </div>
  );
}
