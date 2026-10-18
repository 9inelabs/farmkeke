"use client";

// OpenStreetMap of pickup points (W-82). Loaded client-only (next/dynamic,
// ssr:false) from PickupFinder. Markers use a DivIcon (no image files).
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import type { PickupPoint } from "@/convex/returns/site";

const pinSvg = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="#FFFFFF" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`;

const icons = {
  on: L.divIcon({ className: "", html: pinSvg("#1E3B16"), iconSize: [34, 34], iconAnchor: [17, 34], tooltipAnchor: [0, 6] }),
  off: L.divIcon({ className: "", html: pinSvg("#5E7A52"), iconSize: [34, 34], iconAnchor: [17, 34], tooltipAnchor: [0, 6] }),
};

type Located = PickupPoint & { latitude: number; longitude: number };

function FollowSelection({ point }: { point?: Located }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.panTo([point.latitude, point.longitude], { animate: true, duration: 0.35 });
  }, [map, point]);
  return null;
}

export default function PickupMap({
  points,
  selectedId,
  onSelect,
  statusFor,
}: {
  points: PickupPoint[];
  selectedId?: string;
  onSelect: (id: string) => void;
  statusFor: (p: PickupPoint) => string | null;
}) {
  const located = useMemo(
    () => points.filter((p): p is Located => typeof p.latitude === "number" && typeof p.longitude === "number"),
    [points],
  );
  const bounds = useMemo(
    () => (located.length ? L.latLngBounds(located.map((p) => [p.latitude, p.longitude] as [number, number])) : undefined),
    [located],
  );
  const selected = located.find((p) => p._id === selectedId);

  return (
    <MapContainer
      bounds={bounds?.pad(0.25)}
      center={bounds ? undefined : [5.4836, 7.0333]}
      zoom={bounds ? undefined : 12}
      zoomControl={false}
      scrollWheelZoom={false}
      className="size-full [&_.leaflet-control-zoom_a]:!flex [&_.leaflet-control-zoom_a]:!size-10 [&_.leaflet-control-zoom_a]:!items-center [&_.leaflet-control-zoom_a]:!justify-center [&_.leaflet-control-zoom_a]:!text-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      <FollowSelection point={selected} />
      {located.map((p) => {
        const on = p._id === selectedId;
        const status = statusFor(p);
        return (
          <Marker
            key={p._id}
            position={[p.latitude, p.longitude]}
            icon={on ? icons.on : icons.off}
            title={p.name}
            alt={p.name}
            keyboard
            zIndexOffset={on ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(p._id) }}
          >
            {on ? (
              <Tooltip permanent direction="bottom" offset={[0, 4]} opacity={1}>
                <div className="font-sans">
                  <div className="text-sm font-bold text-ink">{p.name}</div>
                  {status ? <div className="mt-0.5 text-xs text-subtle">{status}</div> : null}
                </div>
              </Tooltip>
            ) : null}
          </Marker>
        );
      })}
    </MapContainer>
  );
}
