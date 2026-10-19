"use client";

// W-24 pickup points on OpenStreetMap, each pin labelled A, B, C… like the
// list beside it (the design's .pin / .pinlbl). Client-only (next/dynamic,
// ssr: false); DivIcon markers, the same pattern as components/site/PickupMap.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, ZoomControl, useMap } from "react-leaflet";

export type LetteredPoint = { id: string; letter: string; name: string; latitude: number; longitude: number };

const iconFor = (letter: string, on: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-2px)"><span style="font:700 11px/1 Inter,system-ui,sans-serif;background:${on ? "#1E3B16" : "#FFFFFF"};color:${on ? "#FFFFFF" : "#1A1A1A"};border-radius:999px;padding:3px 8px;box-shadow:0 1px 3px rgba(0,0,0,0.12);white-space:nowrap">${letter}</span><svg xmlns="http://www.w3.org/2000/svg" width="${on ? 30 : 26}" height="${on ? 30 : 26}" viewBox="0 0 24 24" fill="${on ? "#A9D654" : "#FFFFFF"}" stroke="#1E3B16" stroke-width="1.5" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/></svg></div>`,
    iconSize: [40, on ? 48 : 44],
    iconAnchor: [20, on ? 48 : 44],
  });

function Follow({ point }: { point?: LetteredPoint }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.panTo([point.latitude, point.longitude], { animate: true, duration: 0.35 });
  }, [map, point]);
  return null;
}

export default function LetteredPointsMap({
  points,
  selectedId,
  onSelect,
}: {
  points: LetteredPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const bounds = useMemo(
    () => (points.length ? L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number])) : undefined),
    [points],
  );
  return (
    <MapContainer
      bounds={bounds?.pad(0.3)}
      center={bounds ? undefined : [5.4836, 7.0333]}
      zoom={bounds ? undefined : 12}
      maxZoom={17}
      zoomControl={false}
      scrollWheelZoom={false}
      className="size-full [&_.leaflet-control-zoom_a]:!flex [&_.leaflet-control-zoom_a]:!size-10 [&_.leaflet-control-zoom_a]:!items-center [&_.leaflet-control-zoom_a]:!justify-center [&_.leaflet-control-zoom_a]:!text-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      <Follow point={points.find((p) => p.id === selectedId)} />
      {points.map((p) => {
        const on = p.id === selectedId;
        return (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={iconFor(p.letter, on)}
            title={`${p.letter} · ${p.name}`}
            alt={`${p.letter} · ${p.name}`}
            keyboard
            zIndexOffset={on ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(p.id) }}
          />
        );
      })}
    </MapContainer>
  );
}
