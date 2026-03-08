"use client";

import { useState } from "react";
import { Nav } from "react-bootstrap";
import ConflictMap from "@/components/ConflictMap";
import NewsFeed from "@/components/NewsFeed";
import ChatPanel from "@/components/ChatPanel";
import BiasAnalyzer from "@/components/BiasAnalyzer";
import FactChecker from "@/components/FactChecker";

const TABS = [
  { key: "map", label: "Map" },
  { key: "news", label: "News" },
  { key: "chat", label: "Chat" },
  { key: "bias", label: "Bias" },
  { key: "factcheck", label: "Fact Check" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("map");

  return (
    <div className="d-flex flex-column" style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      {/* Top bar */}
      <div className="d-flex align-items-center px-3 py-2 border-bottom border-secondary" style={{ background: "#0d0d0d", flexShrink: 0 }}>
        <h5 className="mb-0 me-4 fw-bold">
          <span className="text-danger">WAR</span>
        </h5>
        <Nav variant="pills" className="gap-1">
          {TABS.map((tab) => (
            <Nav.Item key={tab.key}>
              <Nav.Link
                active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-1 px-3 ${activeTab === tab.key ? "bg-danger border-0" : "text-secondary"}`}
                style={{ fontSize: "0.85rem", cursor: "pointer" }}
              >
                {tab.label}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </div>

      {/* Content area - fills remaining space */}
      <div className="flex-grow-1" style={{ minHeight: 0 }}>
        {activeTab === "map" && <ConflictMap />}
        {activeTab === "news" && (
          <div className="p-3 overflow-auto" style={{ height: "100%" }}>
            <NewsFeed />
          </div>
        )}
        {activeTab === "chat" && (
          <div className="p-3" style={{ height: "100%" }}>
            <ChatPanel />
          </div>
        )}
        {activeTab === "bias" && (
          <div className="p-3 overflow-auto" style={{ height: "100%" }}>
            <BiasAnalyzer />
          </div>
        )}
        {activeTab === "factcheck" && (
          <div className="p-3 overflow-auto" style={{ height: "100%" }}>
            <FactChecker />
          </div>
        )}
      </div>
    </div>
  );
}
