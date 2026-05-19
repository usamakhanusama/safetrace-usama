'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function DeviceViewerPage() {
  const params = useParams();
  const deviceId = params.deviceId;

  const [device, setDevice] = useState(null);
  const [message, setMessage] = useState('Connecting to GPS device...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deviceId || !db) return;

    const deviceRef = doc(db, 'deviceLocations', deviceId);

    const unsubscribe = onSnapshot(
      deviceRef,
      function (snapshot) {
        if (!snapshot.exists()) {
          setDevice(null);
          setMessage('No GPS device data found.');
          setLoading(false);
          return;
        }

        setDevice({
          id: snapshot.id,
          ...snapshot.data(),
        });

        setMessage('GPS device connected.');
        setLoading(false);
      },
      function (error) {
        console.error(error);
        setMessage('Failed to load GPS device: ' + error.message);
        setLoading(false);
      }
    );

    return function () {
      unsubscribe();
    };
  }, [deviceId]);

  const mapsLink =
    device?.lat && device?.lng
      ? 'https://www.google.com/maps?q=' + device.lat + ',' + device.lng
      : '';

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <section className="mx-auto max-w-5xl">
        <p className="mb-3 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
          GPS Device Tracking
        </p>

        <h1 className="text-3xl font-bold text-white md:text-5xl">
          {device?.vehicleName || 'Vehicle GPS Tracker'}
        </h1>

        <p className="mt-3 max-w-2xl text-slate-400">
          Device ID: {deviceId}
        </p>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-emerald-300">
            {message}
          </p>

          {loading && (
            <p className="mt-5 text-slate-400">Loading GPS device...</p>
          )}

          {!loading && !device && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
              No device data found. Send location to API first.
            </div>
          )}

          {device && (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <Info label="Status" value={device.status || 'unknown'} />
                <Info
                  label="Battery"
                  value={
                    device.batteryLevel !== null && device.batteryLevel !== undefined
                      ? device.batteryLevel + '%'
                      : 'Not available'
                  }
                />
                <Info
                  label="Charging"
                  value={
                    device.charging === null || device.charging === undefined
                      ? 'Not available'
                      : device.charging
                      ? 'Yes'
                      : 'No'
                  }
                />
                <Info label="Source" value={device.source || 'device'} />
              </div>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  Latest Device Location
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <Info label="Latitude" value={device.lat} />
                  <Info label="Longitude" value={device.lng} />
                  <Info
                    label="Accuracy"
                    value={
                      device.accuracy
                        ? Math.round(device.accuracy) + ' meters'
                        : 'Not available'
                    }
                  />
                  <Info
                    label="Last Seen"
                    value={formatDate(device.lastSeenAt || device.updatedAt)}
                  />
                  <Info
                    label="Speed"
                    value={
                      device.speed !== null && device.speed !== undefined
                        ? device.speed + ' m/s'
                        : 'Not available'
                    }
                  />
                  <Info
                    label="Heading"
                    value={
                      device.heading !== null && device.heading !== undefined
                        ? device.heading
                        : 'Not available'
                    }
                  />
                </div>

                {mapsLink && (
                  <a
                    href={mapsLink}
                    target="_blank"
                    className="mt-6 inline-block rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    Open in Google Maps
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 break-all font-semibold text-white">
        {value || 'Not available'}
      </p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return 'Not available';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}