"use client";

import { useMap } from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Hotspot } from "@/data/hotspots";
import type { MetroStation } from "@/data/kochi-metro";

interface WalkRoutesProps {
  station: MetroStation;
  hotspots: Hotspot[];
  activeId: string | null;
  animationKey: string;
}

type Pt = { x: number; y: number };

type RouteGeom = {
  id: string;
  d: string;
  active: boolean;
  order: number;
};

function bearing(a: Pt, b: Pt) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function radarPath(a: Pt, b: Pt, i: number, total: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const side = i % 2 === 0 ? 1 : -1;
  const bulge =
    Math.min(28, len * 0.1) * side * (0.35 + i / Math.max(1, total));
  const cx = a.x + dx * 0.5 + nx * bulge;
  const cy = a.y + dy * 0.5 + ny * bulge;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

/** Dotted beams that fan out from the selected station to nearby places. */
export default function WalkRoutes({
  station,
  hotspots,
  activeId,
  animationKey,
}: WalkRoutesProps) {
  const map = useMap();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const hotspotsRef = useRef(hotspots);
  const activeIdRef = useRef(activeId);
  hotspotsRef.current = hotspots;
  activeIdRef.current = activeId;

  const [ready, setReady] = useState(false);
  const [routes, setRoutes] = useState<RouteGeom[]>([]);

  const waveKey = useMemo(
    () => `${animationKey}:${hotspots.map((h) => h.id).join(",")}`,
    [animationKey, hotspots],
  );

  const compute = () => {
    const projection = overlayRef.current?.getProjection();
    if (!projection) return;

    const o = projection.fromLatLngToDivPixel(
      new google.maps.LatLng(station.lat, station.lng),
    );
    if (!o) return;
    const originPt = { x: o.x, y: o.y };
    const active = activeIdRef.current;

    const ranked = hotspotsRef.current
      .map((spot) => {
        const dest = projection.fromLatLngToDivPixel(
          new google.maps.LatLng(spot.lat, spot.lng),
        );
        if (!dest) return null;
        const pt = { x: dest.x, y: dest.y };
        return { spot, pt, angle: bearing(originPt, pt) };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .sort((a, b) => a.angle - b.angle);

    const total = ranked.length;
    setRoutes(
      ranked.map((item, i) => ({
        id: item.spot.id,
        d: radarPath(originPt, item.pt, i, total),
        active: item.spot.id === active,
        order: i,
      })),
    );
  };

  useEffect(() => {
    if (!map) return;

    const container = document.createElement("div");
    container.style.cssText =
      "position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;";
    containerRef.current = container;

    const overlay = new google.maps.OverlayView();
    overlayRef.current = overlay;

    overlay.onAdd = () => {
      overlay.getPanes()?.overlayLayer.appendChild(container);
      setReady(true);
    };
    overlay.draw = () => compute();
    overlay.onRemove = () => {
      container.remove();
      containerRef.current = null;
      setReady(false);
    };
    overlay.setMap(map);

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, station.id, station.lat, station.lng]);

  useEffect(() => {
    if (!ready) return;
    compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, waveKey]);

  useEffect(() => {
    setRoutes((prev) =>
      prev.map((r) => ({ ...r, active: r.id === activeId })),
    );
  }, [activeId]);

  if (!ready || !containerRef.current || routes.length === 0) return null;

  return createPortal(
    <svg
      key={waveKey}
      className="radar-routes-svg"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      {routes.map((r) => (
        <g key={`${waveKey}-${r.id}`}>
          <path
            d={r.d}
            pathLength={1}
            className="radar-route-trace"
            fill="none"
            strokeLinecap="round"
            style={{ animationDelay: `${r.order * 90}ms` }}
          />
          <path
            d={r.d}
            pathLength={1}
            className={`radar-beam ${r.active ? "is-active" : ""}`}
            fill="none"
            strokeLinecap="round"
            style={{
              animationDelay: `${r.order * 90 + 360}ms, ${r.order * 90 + 360}ms`,
            }}
          />
        </g>
      ))}
    </svg>,
    containerRef.current,
  );
}
