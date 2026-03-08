"use client";

import { useEffect, useState } from "react";
import { Badge, Spinner } from "react-bootstrap";

interface Attack {
  id: number;
  lat: number;
  lon: number;
  attack_type: string;
  severity: string;
  location: string;
  description: string;
  title: string;
  source_name: string;
  classified_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "#28a745",
  MEDIUM: "#ffc107",
  HIGH: "#fd7e14",
  CRITICAL: "#dc3545",
  MAJOR: "#6f42c1",
};

export default function ConflictMap() {
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    fetch("/api/news?type=attacks&hours=72")
      .then((r) => r.json())
      .then((data) => setAttacks(data.attacks || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || loading) return;

    import("leaflet").then((L) => {
      // Fix default markers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const container = document.getElementById("conflict-map");
      if (!container || container.querySelector(".leaflet-container")) return;

      const map = L.map("conflict-map").setView([30, 40], 3);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      attacks.forEach((attack) => {
        const color = SEVERITY_COLORS[attack.severity] || SEVERITY_COLORS.LOW;

        const circle = L.circleMarker([attack.lat, attack.lon], {
          radius: attack.severity === "MAJOR" ? 12 : attack.severity === "CRITICAL" ? 10 : 7,
          fillColor: color,
          color: "#fff",
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.7,
        }).addTo(map);

        circle.bindPopup(`
          <div style="min-width:200px">
            <strong>${attack.location}</strong><br/>
            <span style="color:${color}">${attack.severity}</span> — ${attack.attack_type}<br/>
            <small>${attack.description || attack.title}</small><br/>
            <small class="text-muted">${attack.source_name} · ${new Date(attack.classified_at).toLocaleString()}</small>
          </div>
        `);
      });

      setMapReady(true);
    });
  }, [attacks, loading]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: 500 }}>
        <Spinner animation="border" variant="light" />
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <small className="text-secondary">
          {attacks.length} events in last 72h
          {!mapReady && <Spinner animation="border" size="sm" className="ms-2" />}
        </small>
        <div className="d-flex gap-2">
          {Object.entries(SEVERITY_COLORS).map(([level, color]) => (
            <Badge key={level} style={{ backgroundColor: color }} className="text-dark">
              {level}
            </Badge>
          ))}
        </div>
      </div>
      <div
        id="conflict-map"
        style={{ height: 500, borderRadius: 8, overflow: "hidden" }}
      />
    </div>
  );
}
