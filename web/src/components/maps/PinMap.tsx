"use client";

// OpenStreetMap with one draggable drop-off pin (W-23 "Pin on the map",
// W-46b "Set pin"). Client-only: load it with next/dynamic (ssr: false).
// The marker is a DivIcon in the designs' lime pin, so no image files are needed.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";

export type LatLng = { latitude: number; longitude: number };

const pin = L.divIcon({
  className: "",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#A9D654" stroke="#1E3B16" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#FFFFFF"/></svg>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

function Follow({ at }: { at: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([at.latitude, at.longitude], { animate: true, duration: 0.35 });
  }, [map, at.latitude, at.longitude]);
  return null;
}

function TapToMove({ onMove }: { onMove: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onMove({ latitude: e.latlng.lat, longitude: e.latlng.lng }) });
  return null;
}

export default function PinMap({
  at,
  onMove,
  label,
}: {
  /** Where the pin is (the area's centre until the shopper moves it). */
  at: LatLng;
  onMove?: (p: LatLng) => void;
  label: string;
}) {
  return (
    <MapContainer
      center={[at.latitude, at.longitude]}
      zoom={16}
      zoomControl={false}
      scrollWheelZoom={false}
      className="size-full [&_.leaflet-control-zoom_a]:!flex [&_.leaflet-control-zoom_a]:!size-10 [&_.leaflet-control-zoom_a]:!items-center [&_.leaflet-control-zoom_a]:!justify-center [&_.leaflet-control-zoom_a]:!text-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      <Follow at={at} />
      {onMove ? <TapToMove onMove={onMove} /> : null}
      <Marker
        position={[at.latitude, at.longitude]}
        icon={pin}
        title={label}
        alt={label}
        keyboard
        draggable={!!onMove}
        eventHandlers={{
          dragend: (e) => {
            const p = (e.target as L.Marker).getLatLng();
            onMove?.({ latitude: p.lat, longitude: p.lng });
          },
        }}
      />
    </MapContainer>
  );
}
