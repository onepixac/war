"use client";

import { useState } from "react";
import { Container, Tab, Tabs, Row, Col } from "react-bootstrap";
import ConflictMap from "@/components/ConflictMap";
import NewsFeed from "@/components/NewsFeed";
import ChatPanel from "@/components/ChatPanel";
import BiasAnalyzer from "@/components/BiasAnalyzer";
import FactChecker from "@/components/FactChecker";

export default function Home() {
  const [activeTab, setActiveTab] = useState("map");

  return (
    <Container fluid className="py-3 px-4">
      <Row className="mb-3">
        <Col>
          <h4 className="mb-0 fw-bold">
            <span className="text-danger">WAR</span>
            <span className="text-secondary fw-normal ms-2" style={{ fontSize: "0.7em" }}>
              Global Conflict Monitor
            </span>
          </h4>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k || "map")}
        className="mb-3"
      >
        <Tab eventKey="map" title="Conflict Map">
          <ConflictMap />
        </Tab>

        <Tab eventKey="news" title="News Feed">
          <NewsFeed />
        </Tab>

        <Tab eventKey="chat" title="Intelligence Chat">
          <ChatPanel />
        </Tab>

        <Tab eventKey="bias" title="Bias Analysis">
          <BiasAnalyzer />
        </Tab>

        <Tab eventKey="factcheck" title="Fact Check">
          <FactChecker />
        </Tab>
      </Tabs>
    </Container>
  );
}
