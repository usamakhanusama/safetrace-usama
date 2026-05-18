'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const LiveMap = dynamic(() => import('@/components/maps/LiveMap'), {
  ssr: false,
});

export default function TrackViewerPage() {
  const params = useParams();
  const sessionId = params.sessionId;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Connecting to live session...');

  useEffect(() => {
    if (!sessionId) return;

    const sessionRef = doc(db, 'liveSessions', sessionId);

    const unsubscribe = onSnapshot(
      sessionRef,
      function (snapshot) {
        if (!snapshot.exists()) {
          setSession(null);
          setMessage('Live session not found.');
          setLoading(false);
          return;
        }

        setSession({
          id: snapshot.id,
          ...snapshot.data(),
        });

        setMessage('Live session connected.');
        setLoading(false);
      },
      function (error) {
        console.error(error);
        setMessage('Failed to connect: ' + error.message);
        setLoading(false);
      }
    );

    return function () {
      unsubscribe();
    };
  }, [sessionId]);

  const hasLocation = session && session.lat && session.lng;

  const expiredByTime = session?.expiresAt
    ? new Date() > new Date(session.expiresAt)
    : false;

  const isExpired = session?.status === 'expired' || expiredByTime;

  const googleMapsLink = hasLocation
    ? 'https://www.google.com/maps?q=' + session.lat + ',' + session.lng
    : '';

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <section className="mx-auto max-w-5xl">
        <p className="mb-3 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
          Live viewer
        </p>

        <h1 className="text-3xl font-bold text-white md:text-5xl">
          SafeTrace Live Location
        </h1>

        <p className="mt-3 max-w-2xl text-slate-400">
          This page updates automatically when the shared user location changes.
        </p>

        {session?.sos && !isExpired && (
          <div className="mt-8 rounded-3xl border border-red-500/50 bg-red-600/20 p-6">
            <h2 className="text-3xl font-black text-red-200">
              EMERGENCY SOS ACTIVE
            </h2>

            <p className="mt-2 text-red-100">
              {session.sosMessage || 'The user has sent an emergency SOS alert.'}
            </p>

            <p className="mt-2 text-sm text-red-200">
              SOS Time: {session.sosAt || 'Not available'}
            </p>
          </div>
        )}

        {session && isExpired && (
          <div className="mt-8 rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-6">
            <h2 className="text-2xl font-bold text-yellow-300">
              SESSION EXPIRED
            </h2>
            <p className="mt-2 text-yellow-100">
              This safety tracking session is expired. Last known location may still be shown below.
            </p>
          </div>
        )}

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-emerald-300">
            {message}
          </p>

          {loading && (
            <p className="mt-5 text-slate-400">Loading live session...</p>
          )}

          {!loading && !session && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
              No session data found.
            </div>
          )}

          {session && (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <StatusCard
                  label="Session Status"
                  value={isExpired ? 'expired' : session.status || 'unknown'}
                  active={session.status === 'active' && !isExpired}
                />

                <StatusCard
                  label="SOS Status"
                  value={session.sos && !isExpired ? 'SOS Active' : 'No SOS'}
                  active={session.sos && !isExpired}
                  danger={session.sos && !isExpired}
                />

                <StatusCard
                  label="Update Count"
                  value={session.updateCount || 0}
                  active={true}
                />

                <StatusCard
                  label="Expires At"
                  value={formatDate(session.expiresAt)}
                  active={!isExpired}
                />
              </div>

              {!hasLocation && (
                <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-yellow-100">
                  Waiting for first location update...
                </div>
              )}

              {hasLocation && (
                <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <h2 className="mb-4 text-2xl font-bold text-white">
                    Latest Live Location
                  </h2>

                  <LiveMap
                    lat={session.lat}
                    lng={session.lng}
                    title={session.sos && !isExpired ? 'SOS live location' : 'Shared live location'}
                  />

                  {session.medicalInfo && (
                    <div className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
                      <h3 className="mb-3 text-xl font-bold text-blue-200">
                        Emergency Medical Info
                      </h3>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Info
                          label="Name"
                          value={session.medicalInfo.name || 'Not available'}
                        />
                        <Info
                          label="Blood Group"
                          value={session.medicalInfo.bloodGroup || 'Not set'}
                        />
                        <Info
                          label="Allergy"
                          value={session.medicalInfo.allergy || 'Not set'}
                        />
                        <Info
                          label="Guardian"
                          value={
                            (session.medicalInfo.guardianName || 'Not set') +
                            (session.medicalInfo.guardianPhone
                              ? ' - ' + session.medicalInfo.guardianPhone
                              : '')
                          }
                        />
                      </div>

                      {session.medicalInfo.medicalNote && (
                        <p className="mt-4 rounded-xl border border-blue-500/20 bg-slate-950 p-4 text-sm leading-6 text-blue-100">
                          {session.medicalInfo.medicalNote}
                        </p>
                      )}

                      {session.medicalInfo.guardianPhone && (
                        <a
                          href={'tel:' + session.medicalInfo.guardianPhone}
                          className="mt-4 inline-block rounded-xl border border-blue-500/40 px-5 py-3 font-bold text-blue-300 hover:bg-blue-500/10"
                        >
                          Call Guardian
                        </a>
                      )}
                    </div>
                  )}

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Info label="Latitude" value={session.lat} />
                    <Info label="Longitude" value={session.lng} />
                    <Info
                      label="Accuracy"
                      value={session.accuracy ? Math.round(session.accuracy) + ' meters' : 'Not available'}
                    />
                    <Info
                      label="Last Updated"
                      value={session.updatedAt || 'Not available'}
                    />
                    <Info
                      label="Speed"
                      value={session.speed ? session.speed + ' m/s' : 'Not available'}
                    />
                    <Info
                      label="Heading"
                      value={session.heading ? session.heading : 'Not available'}
                    />
                  </div>

                  <a
                    href={googleMapsLink}
                    target="_blank"
                    className={session.sos && !isExpired ? 'mt-6 inline-block rounded-xl bg-red-500 px-5 py-3 font-bold text-white hover:bg-red-400' : 'mt-6 inline-block rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-400'}
                  >
                    Open in Google Maps
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm leading-7 text-yellow-100">
          Safety Note: This live page only works because the user started a session and shared this link.
        </div>
      </section>
    </main>
  );
}

function StatusCard({ label, value, active, danger }) {
  let colorClass = 'text-red-300';

  if (danger) {
    colorClass = 'text-red-300';
  } else if (active) {
    colorClass = 'text-emerald-300';
  }

  return (
    <div className={danger ? 'rounded-2xl border border-red-500/40 bg-red-500/10 p-5' : 'rounded-2xl border border-slate-800 bg-slate-950 p-5'}>
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

