'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

function createMarkerIcon(type) {
  let color = '#10b981';

  if (type === 'sos') {
    color = '#ef4444';
  } else if (type === 'expired') {
    color = '#64748b';
  } else if (type === 'stopped') {
    color = '#f59e0b';
  }

  return L.divIcon({
    className: '',
    html:
      '<div style="width:22px;height:22px;border-radius:50%;background:' +
      color +
      ';border:3px solid white;box-shadow:0 0 20px ' +
      color +
      ';"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function FitMapToMarkers({ sessions }) {
  const map = useMap();

  useEffect(() => {
    const points = sessions
      .filter((item) => item.lat && item.lng)
      .map((item) => [Number(item.lat), Number(item.lng)]);

    if (points.length === 1) {
      map.setView(points[0], 15);
    }

    if (points.length > 1) {
      map.fitBounds(points, {
        padding: [40, 40],
      });
    }
  }, [sessions, map]);

  return null;
}

export default function AdminMap({ sessions = [] }) {
  const validSessions = sessions.filter((item) => item.lat && item.lng);

  if (validSessions.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-dashed border-emerald-500/40 bg-slate-900 text-center">
        <div>
          <p className="font-bold text-white">No live locations found</p>
          <p className="mt-2 text-sm text-slate-400">
            Start a tracking session to see markers on the map.
          </p>
        </div>
      </div>
    );
  }

  const first = validSessions[0];

  return (
    <div className="h-96 overflow-hidden rounded-2xl border border-slate-800">
      <MapContainer
        center={[Number(first.lat), Number(first.lng)]}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validSessions.map((session) => {
          let markerType = 'active';

          if (session.sos) {
            markerType = 'sos';
          } else if (session.status === 'expired') {
            markerType = 'expired';
          } else if (session.status === 'stopped') {
            markerType = 'stopped';
          }

          const viewerLink = '/track/' + session.id;
          const mapsLink =
            'https://www.google.com/maps?q=' + session.lat + ',' + session.lng;

          return (
            <Marker
              key={session.id}
              position={[Number(session.lat), Number(session.lng)]}
              icon={createMarkerIcon(markerType)}
            >
              <Popup>
                <div style={{ minWidth: 210 }}>
                  <strong>SafeTrace Session</strong>
                  <br />
                  Status: {session.status || 'unknown'}
                  <br />
                  SOS: {session.sos ? 'Active' : 'No'}
                  <br />
                  Updates: {session.updateCount || 0}
                  <br />
                  <br />
                  <a href={viewerLink} target="_blank">
                    Open Viewer
                  </a>
                  <br />
                  <a href={mapsLink} target="_blank">
                    Open Google Maps
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <FitMapToMarkers sessions={validSessions} />
      </MapContainer>
    </div>
  );
}
