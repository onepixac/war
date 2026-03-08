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

function getSeverityColor(severity: string): string {
  // Handle cases where the LLM returned the full enum string
  const normalized = severity?.split("|")[0]?.trim()?.toUpperCase() || "LOW";
  return SEVERITY_COLORS[normalized] || SEVERITY_COLORS.LOW;
}

function getSeverityLabel(severity: string): string {
  return severity?.split("|")[0]?.trim()?.toUpperCase() || "LOW";
}

export default function ConflictMap() {
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    fetch("/api/news?type=attacks&hours=168")
      .then((r) => r.json())
      .then((data) => {
        console.log("Attacks loaded:", data.attacks?.length);
        setAttacks(data.attacks || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || loading || mapInstanceRef.current || !mapRef.current) return;

    import("leaflet").then(async (L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        zoomControl: false,
        minZoom: 3,
        maxZoom: 18,
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1.0,
      }).setView([30, 40], 3);
      mapInstanceRef.current = map;

      L.control.zoom({ position: "bottomright" }).addTo(map);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18,
        noWrap: true,
      }).addTo(map);

      // Try to load MarkerCluster, fallback to plain markers
      let clusterGroup: L.LayerGroup | null = null;
      try {
        await import("leaflet.markercluster");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clusterGroup = (L as any).markerClusterGroup({
          maxClusterRadius: 50,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          iconCreateFunction: (cluster: { getChildCount: () => number; getAllChildMarkers: () => { options: Record<string, unknown> }[] }) => {
            const count = cluster.getChildCount();
            const children = cluster.getAllChildMarkers();
            const severityOrder = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "MAJOR"];
            let maxSev = 0;
            children.forEach((m) => {
              const sev = (m.options as Record<string, unknown>).customSeverity as string || "LOW";
              const idx = severityOrder.indexOf(sev);
              if (idx > maxSev) maxSev = idx;
            });
            const color = SEVERITY_COLORS[severityOrder[maxSev]] || SEVERITY_COLORS.LOW;
            const size = count < 10 ? 36 : count < 50 ? 44 : 52;

            return L.divIcon({
              html: `<div style="
                background:${color};
                width:${size}px;height:${size}px;
                border-radius:50%;
                display:flex;align-items:center;justify-content:center;
                color:#fff;font-weight:700;font-size:${count < 10 ? 14 : 13}px;
                border:2px solid rgba(255,255,255,0.4);
                box-shadow:0 2px 8px rgba(0,0,0,0.5);
              ">${count}</div>`,
              className: "",
              iconSize: L.point(size, size),
            });
          },
        });
      } catch (e) {
        console.warn("MarkerCluster not available, using plain markers", e);
        clusterGroup = L.layerGroup();
      }

      console.log("Adding", attacks.length, "markers to map");

      attacks.forEach((attack) => {
        if (!attack.lat || !attack.lon) return;

        const sevLabel = getSeverityLabel(attack.severity);
        const color = getSeverityColor(attack.severity);
        const size = sevLabel === "MAJOR" ? 18 : sevLabel === "CRITICAL" ? 15 : sevLabel === "HIGH" ? 13 : 10;

        const icon = L.divIcon({
          html: `<div style="
            background:${color};
            width:${size}px;height:${size}px;
            border-radius:50%;
            border:2px solid rgba(255,255,255,0.5);
            box-shadow:0 1px 4px rgba(0,0,0,0.5);
          "></div>`,
          className: "",
          iconSize: L.point(size, size),
          iconAnchor: L.point(size / 2, size / 2),
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const marker = L.marker([attack.lat, attack.lon], { icon, customSeverity: sevLabel } as any);

        marker.bindPopup(`
          <div style="min-width:220px">
            <strong>${attack.location}</strong><br/>
            <span style="color:${color};font-weight:600">${sevLabel}</span> — ${attack.attack_type?.split("|")[0]}<br/>
            <small>${attack.description || attack.title}</small><br/>
            <small style="opacity:0.6">${attack.source_name} · ${new Date(attack.classified_at).toLocaleString()}</small>
          </div>
        `);

        clusterGroup!.addLayer(marker);
      });

      map.addLayer(clusterGroup!);
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
