"use client";

import { useEffect, useState, useRef } from "react";
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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    fetch("/api/news?type=attacks&hours=72")
      .then((r) => r.json())
      .then((data) => setAttacks(data.attacks || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || loading || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (!mapRef.current) return;

      const map = L.map(mapRef.current, { zoomControl: false }).setView([30, 40], 3);
      mapInstanceRef.current = map;

      // Zoom controls bottom-right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      attacks.forEach((attack) => {
        const color = SEVERITY_COLORS[attack.severity] || SEVERITY_COLORS.LOW;

        const circle = L.circleMarker([attack.lat, attack.lon], {
          radius: attack.severity === "MAJOR" ? 14 : attack.severity === "CRITICAL" ? 11 : 8,
          fillColor: color,
          color: "#fff",
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.7,
        }).addTo(map);

        circle.bindPopup(`
          <div style="min-width:220px">
            <strong>${attack.location}</strong><br/>
            <span style="color:${color};font-weight:600">${attack.severity}</span> — ${attack.attack_type}<br/>
            <small>${attack.description || attack.title}</small><br/>
            <small style="opacity:0.6">${attack.source_name} · ${new Date(attack.classified_at).toLocaleString()}</small>
          </div>
        `);
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [attacks, loading]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "100%" }}>
        <Spinner animation="border" variant="light" />
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* Legend overlay */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1000,
          background: "rgba(13,13,13,0.85)",
          borderRadius: 8,
          padding: "8px 12px",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <small className="text-light fw-semibold me-1">{attacks.length} events</small>
          {Object.entries(SEVERITY_COLORS).map(([level, color]) => (
            <Badge key={level} style={{ backgroundColor: color, fontSize: "0.65rem" }} className="text-dark">
              {level}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
