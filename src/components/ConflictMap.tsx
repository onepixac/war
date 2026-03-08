"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  LOW: "#81c784",
  MEDIUM: "#ffd54f",
  HIGH: "#ffb74d",
  CRITICAL: "#e57373",
  MAJOR: "#ba68c8",
};

function getSeverityColor(severity: string): string {
  const normalized = severity?.split("|")[0]?.trim()?.toUpperCase() || "LOW";
  return SEVERITY_COLORS[normalized] || SEVERITY_COLORS.LOW;
}

function getSeverityLabel(severity: string): string {
  return severity?.split("|")[0]?.trim()?.toUpperCase() || "LOW";
}

// Wait for global L (leaflet + markercluster) from CDN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function waitForLeaflet(): Promise<any> {
  return new Promise((resolve) => {
    const check = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (L && L.markerClusterGroup) {
        resolve(L);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

export default function ConflictMap() {
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set(Object.keys(SEVERITY_COLORS))
  );
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clusterRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);

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

  const toggleFilter = useCallback((level: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        // Don't allow deselecting all
        if (next.size <= 1) return prev;
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  }, []);

  // Rebuild markers when filters change
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map || !clusterRef.current) return;

    const clusterGroup = clusterRef.current;
    clusterGroup.clearLayers();

    attacks.forEach((attack) => {
      if (!attack.lat || !attack.lon) return;

      const sevLabel = getSeverityLabel(attack.severity);
      if (!activeFilters.has(sevLabel)) return;

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

      const marker = L.marker([attack.lat, attack.lon], { icon, customSeverity: sevLabel });

      marker.bindPopup(`
        <div style="min-width:220px">
          <strong>${attack.location}</strong><br/>
          <span style="color:${color};font-weight:600">${sevLabel}</span> — ${attack.attack_type?.split("|")[0]}<br/>
          <small>${attack.description || attack.title}</small><br/>
          <small style="opacity:0.6">${attack.source_name} · ${new Date(attack.classified_at).toLocaleString()}</small>
        </div>
      `);

      clusterGroup.addLayer(marker);
    });
  }, [activeFilters, attacks]);

  // Initialize map (once)
  useEffect(() => {
    if (typeof window === "undefined" || loading || mapInstanceRef.current || !mapRef.current) return;

    waitForLeaflet().then((L) => {
      leafletRef.current = L;

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

      const clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          const children = cluster.getAllChildMarkers();
          const severityOrder = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "MAJOR"];
          let maxSev = 0;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          children.forEach((m: any) => {
            const sev = m.options?.customSeverity || "LOW";
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

      clusterRef.current = clusterGroup;
      map.addLayer(clusterGroup);

      // Initial markers
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

        const marker = L.marker([attack.lat, attack.lon], { icon, customSeverity: sevLabel });

        marker.bindPopup(`
          <div style="min-width:220px">
            <strong>${attack.location}</strong><br/>
            <span style="color:${color};font-weight:600">${sevLabel}</span> — ${attack.attack_type?.split("|")[0]}<br/>
            <small>${attack.description || attack.title}</small><br/>
            <small style="opacity:0.6">${attack.source_name} · ${new Date(attack.classified_at).toLocaleString()}</small>
          </div>
        `);

        clusterGroup.addLayer(marker);
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        clusterRef.current = null;
        leafletRef.current = null;
      }
    };
  }, [attacks, loading]);

  // Count attacks by severity
  const severityCounts: Record<string, number> = {};
  attacks.forEach((a) => {
    const sev = getSeverityLabel(a.severity);
    severityCounts[sev] = (severityCounts[sev] || 0) + 1;
  });

  const filteredCount = attacks.filter((a) => activeFilters.has(getSeverityLabel(a.severity))).length;

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
          background: "rgba(13,13,13,0.9)",
          borderRadius: 10,
          padding: "10px 14px",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <small className="text-light fw-bold me-1">{filteredCount} events</small>
          {Object.entries(SEVERITY_COLORS).map(([level, color]) => {
            const isActive = activeFilters.has(level);
            const count = severityCounts[level] || 0;
            return (
              <Badge
                key={level}
                role="button"
                onClick={() => toggleFilter(level)}
                style={{
                  backgroundColor: isActive ? color : "transparent",
                  border: `2px solid ${color}`,
                  color: isActive ? (level === "MEDIUM" ? "#000" : "#fff") : color,
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  opacity: isActive ? 1 : 0.5,
                  transition: "all 0.2s ease",
                  userSelect: "none",
                }}
              >
                {level} {count > 0 && `(${count})`}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}
