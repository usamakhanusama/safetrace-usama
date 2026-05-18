'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

const markerIcon = L.divIcon({
  className: '',
  html: '<div style="width:24px;height:24px;border-radius:50%;background:#10b981;border:4px solid white;box-shadow:0 0 25px #10b981;"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function RecenterMap({ lat, lng }) {
  const map = useMap();

  useEffect(() => {
    if (lat && lng) {
      map.setView([Number(lat), Number(lng)], 15);
    }
  }, [lat, lng, map]);

  return null;
}

export default function LiveMap({ lat, lng, title = 'Live Location', routeHistory = [] }) {
  if (!lat || !lng) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-emerald-500/40 bg-slate-900 text-center">
        <div>
          <p className="font-bold text-white">Live map preview</p>
          <p className="mt-2 text-sm text-slate-400">GPS marker will appear here</p>
        </div>
      </div>
    );
  }

  const routePoints = routeHistory
    .filter(function (point) {
      return point.lat && point.lng;
    })
    .map(function (point) {
      return [Number(point.lat), Number(point.lng)];
    });

  return (
    <div className="h-80 overflow-hidden rounded-2xl border border-slate-800">
      <MapContainer
        center={[Number(lat), Number(lng)]}
        zoom={15}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routePoints.length > 1 && (
          <Polyline positions={routePoints} />
        )}

        <Marker position={[Number(lat), Number(lng)]} icon={markerIcon}>
          <Popup>{title}</Popup>
        </Marker>

        <RecenterMap lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
