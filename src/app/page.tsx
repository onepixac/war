"use client";

import { useState } from "react";
import { Nav, Container } from "react-bootstrap";
import ConflictMap from "@/components/ConflictMap";
import NewsFeed from "@/components/NewsFeed";
import ChatPanel from "@/components/ChatPanel";
import BiasAnalyzer from "@/components/BiasAnalyzer";
import FactChecker from "@/components/FactChecker";

const TABS = [
  { key: "map", label: "Live Map" },
  { key: "news", label: "News" },
  { key: "chat", label: "Intel Chat" },
  { key: "bias", label: "Bias" },
  { key: "factcheck", label: "Fact Check" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("map");

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden", position: "relative" }}>
      {/* Floating header — transparent, sits on top of content */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          background: activeTab === "map" ? "transparent" : "rgba(11,13,16,0.85)",
          backdropFilter: activeTab === "map" ? "none" : "blur(12px)",
          borderBottom: activeTab === "map" ? "none" : "1px solid rgba(255,255,255,0.04)",
          pointerEvents: "auto",
        }}
      >
        <h5 className="mb-0 me-auto fw-bold d-flex align-items-center gap-2" style={{ pointerEvents: "auto" }}>
          <span className="text-danger" style={{ letterSpacing: "2px", textShadow: activeTab === "map" ? "0 1px 8px rgba(0,0,0,0.5)" : "none" }}>WAR</span>
          <small className="d-none d-md-inline" style={{ fontSize: "0.6rem", letterSpacing: "0.5px", color: "rgba(255,255,255,0.35)" }}>
            GLOBAL CONFLICT MONITOR
          </small>
        </h5>
        <Nav variant="pills" className="gap-1" style={{ pointerEvents: "auto" }}>
          {TABS.map((tab) => (
            <Nav.Item key={tab.key}>
              <Nav.Link
                active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  cursor: "pointer",
                  ...(activeTab === "map" && !tab.key ? {} : {}),
                  textShadow: activeTab === "map" && tab.key !== activeTab ? "0 1px 4px rgba(0,0,0,0.5)" : "none",
                }}
              >
                {tab.label}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </div>

      {/* Full-height content */}
      <div style={{ height: "100%", width: "100%" }}>
        {activeTab === "map" && <ConflictMap />}
        {activeTab !== "map" && (
          <Container
            fluid
            className="overflow-auto"
            style={{ height: "100%", paddingTop: 56, paddingLeft: 16, paddingRight: 16, paddingBottom: 16 }}
          >
            {activeTab === "news" && <NewsFeed />}
            {activeTab === "chat" && <div style={{ height: "calc(100vh - 72px)" }}><ChatPanel /></div>}
            {activeTab === "bias" && <BiasAnalyzer />}
            {activeTab === "factcheck" && <FactChecker />}
          </Container>
        )}
      </div>
    </div>
  );
}
