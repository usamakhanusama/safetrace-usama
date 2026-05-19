'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const LiveMap = dynamic(() => import('@/components/maps/LiveMap'), {
  ssr: false,
});

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

  const liveStatus = getLiveStatus(device?.lastSeenAt || device?.updatedAt);

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
                <StatusCard
                  label="Live Status"
                  value={liveStatus.text}
                  active={liveStatus.type === 'success'}
                  warning={liveStatus.type === 'warning'}
                  danger={liveStatus.type === 'danger'}
                />

                <StatusCard
                  label="Battery"
                  value={
                    device.batteryLevel !== null && device.batteryLevel !== undefined
                      ? device.batteryLevel + '%'
                      : 'Not available'
                  }
                  active={true}
                />

                <StatusCard
                  label="Charging"
                  value={
                    device.charging === null || device.charging === undefined
                      ? 'Not available'
                      : device.charging
                      ? 'Yes'
                      : 'No'
                  }
                  active={device.charging === true}
                />

                <StatusCard
                  label="Source"
                  value={device.source || 'device'}
                  active={true}
                />
              </div>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  Latest Device Location
                </h2>

                <LiveMap
                  lat={device.lat}
                  lng={device.lng}
                  title={device.vehicleName || 'GPS Device'}
                />

                <div className="mt-6 grid gap-4 md:grid-cols-2">
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
                    value={device.speed ? device.speed + ' m/s' : 'Not available'}
                  />
                  <Info
                    label="Heading"
                    value={device.heading || 'Not available'}
                  />
                </div>

                {device.lat && device.lng && (
                  <a
                    href={'https://www.google.com/maps?q=' + device.lat + ',' + device.lng}
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

function getLiveStatus(lastSeenAt) {
  if (!lastSeenAt) {
    return {
      text: 'Unknown',
      type: 'warning',
    };
  }

  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 2) {
    return {
      text: 'Fresh',
      type: 'success',
    };
  }

  if (diffMinutes < 10) {
    return {
      text: 'Stale - ' + diffMinutes + ' min ago',
      type: 'warning',
    };
  }

  return {
    text: 'Offline - ' + diffMinutes + ' min ago',
    type: 'danger',
  };
}

function StatusCard({ label, value, active, warning, danger }) {
  let colorClass = 'text-red-300';
  let boxClass = 'rounded-2xl border border-slate-800 bg-slate-950 p-5';

  if (danger) {
    colorClass = 'text-red-300';
    boxClass = 'rounded-2xl border border-red-500/40 bg-red-500/10 p-5';
  } else if (warning) {
    colorClass = 'text-yellow-300';
    boxClass = 'rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-5';
  } else if (active) {
    colorClass = 'text-emerald-300';
  }

  return (
    <div className={boxClass}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={'mt-2 break-all text-xl font-bold ' + colorClass}>
        {value}
      </p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-900 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 break-all font-semibold text-white">{value}</p>
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