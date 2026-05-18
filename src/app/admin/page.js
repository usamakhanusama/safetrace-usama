'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const AdminMap = dynamic(() => import('@/components/maps/AdminMap'), {
  ssr: false,
});

export default function AdminPage() {
  const { currentUser, userProfile, isAdmin, authLoading } = useAuth();

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12">
        <section className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h1 className="text-3xl font-bold text-white">Checking Access...</h1>
          <p className="mt-2 text-slate-400">Please wait.</p>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12">
        <section className="mx-auto max-w-xl rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-3xl font-bold text-red-200">Login Required</h1>
          <p className="mt-2 text-red-100">Please login first to access admin dashboard.</p>

          <Link
            href="/login"
            className="mt-5 inline-block rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-400"
          >
            Go to Login
          </Link>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12">
        <section className="mx-auto max-w-xl rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-3xl font-bold text-red-200">Access Denied</h1>
          <p className="mt-2 text-red-100">Only admin users can access this page.</p>
          <p className="mt-2 text-sm text-red-200">
            Current role: {userProfile?.role || 'unknown'}
          </p>
        </section>
      </main>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [soundEnabled, setSoundEnabled] = useState(false);

  const previousSosCountRef = useRef(0);

  useEffect(() => {
    loadSessions();
  }, []);

  function playSosSound() {
    if (!soundEnabled) {
      return;
    }

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 880;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      oscillator.start();

      setTimeout(function () {
        oscillator.stop();
        audioContext.close();
      }, 700);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadSessions() {
    try {
      setLoading(true);
      setMessage('Loading sessions...');

      const sessionsQuery = query(
        collection(db, 'liveSessions'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(sessionsQuery);

      const data = snapshot.docs.map(function (item) {
        return {
          id: item.id,
          ...item.data(),
        };
      });

      setSessions(data);
      setMessage('Sessions loaded successfully.');

      const sosCount = data.filter(function (item) {
        return item.sos;
      }).length;

      if (sosCount > previousSosCountRef.current) {
        playSosSound();
      }

      previousSosCountRef.current = sosCount;
    } catch (error) {
      console.error(error);
      setMessage('Failed to load sessions: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function resolveSOS(id) {
    try {
      await updateDoc(doc(db, 'liveSessions', id), {
        sos: false,
        sosStatus: 'resolved',
        resolvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setMessage('SOS resolved.');
      loadSessions();
    } catch (error) {
      console.error(error);
      setMessage('Failed to resolve SOS: ' + error.message);
    }
  }

  async function markProcessing(id) {
    try {
      await updateDoc(doc(db, 'liveSessions', id), {
        sosStatus: 'processing',
        processingAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setMessage('SOS marked as processing.');
      loadSessions();
    } catch (error) {
      console.error(error);
      setMessage('Failed to update SOS: ' + error.message);
    }
  }

  async function markExpired(id) {
    try {
      await updateDoc(doc(db, 'liveSessions', id), {
        status: 'expired',
        sos: false,
        expiredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setMessage('Session marked expired.');
      loadSessions();
    } catch (error) {
      console.error(error);
      setMessage('Failed to expire session: ' + error.message);
    }
  }

  async function deleteSession(id) {
    const confirmDelete = window.confirm('Delete this session?');

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'liveSessions', id));
      setMessage('Session deleted.');
      loadSessions();
    } catch (error) {
      console.error(error);
      setMessage('Failed to delete session: ' + error.message);
    }
  }

  const stats = useMemo(() => {
    const total = sessions.length;
    const active = sessions.filter((item) => item.status === 'active').length;
    const stopped = sessions.filter((item) => item.status === 'stopped').length;
    const sos = sessions.filter((item) => item.sos).length;

    const expired = sessions.filter((item) => {
      const expiredByStatus = item.status === 'expired';
      const expiredByTime = item.expiresAt
        ? new Date() > new Date(item.expiresAt)
        : false;

      return expiredByStatus || expiredByTime;
    }).length;

    return {
      total,
      active,
      stopped,
      sos,
      expired,
    };
  }, [sessions]);

  const filteredSessions = sessions.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'active') return item.status === 'active';
    if (filter === 'sos') return item.sos;
    if (filter === 'stopped') return item.status === 'stopped';

    if (filter === 'expired') {
      const expiredByStatus = item.status === 'expired';
      const expiredByTime = item.expiresAt
        ? new Date() > new Date(item.expiresAt)
        : false;

      return expiredByStatus || expiredByTime;
    }

    return true;
  });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="mb-3 inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300">
            Admin monitoring panel
          </p>

          <h1 className="text-3xl font-bold text-white md:text-5xl">
            SafeTrace Admin Dashboard
          </h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            Monitor live sessions, SOS alerts, user locations, battery level, route history, and emergency status.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/admin/users"
              className="rounded-xl bg-red-500 px-5 py-3 text-center font-bold text-white hover:bg-red-400"
            >
              Manage Users
            </Link>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={
                soundEnabled
                  ? 'rounded-xl bg-emerald-500 px-5 py-3 text-center font-bold text-slate-950 hover:bg-emerald-400'
                  : 'rounded-xl border border-yellow-500/40 px-5 py-3 text-center font-bold text-yellow-300 hover:bg-yellow-500/10'
              }
            >
              {soundEnabled ? 'SOS Sound On' : 'Enable SOS Sound'}
            </button>
          </div>
        </div>

        {message && (
          <p className="mb-6 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-emerald-300">
            {message}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-5">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Active" value={stats.active} success />
          <StatCard label="SOS" value={stats.sos} danger />
          <StatCard label="Stopped" value={stats.stopped} />
          <StatCard label="Expired" value={stats.expired} warning />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Live Map Monitoring</h2>
              <p className="mt-1 text-sm text-slate-400">
                Red marker = SOS, Green = active, Yellow = stopped, Gray = expired.
              </p>
            </div>

            <button
              onClick={loadSessions}
              className="rounded-xl border border-emerald-500/40 px-5 py-3 font-semibold text-emerald-300 hover:bg-emerald-500/10"
            >
              Refresh
            </button>
          </div>

          <AdminMap sessions={filteredSessions} />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Session Management</h2>
              <p className="mt-1 text-sm text-slate-400">
                Filter, review, resolve, expire, or delete sessions.
              </p>
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
            >
              <option value="all">All Sessions</option>
              <option value="active">Active</option>
              <option value="sos">SOS Active</option>
              <option value="stopped">Stopped</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {loading && (
            <p className="rounded-xl bg-slate-950 p-4 text-slate-400">
              Loading sessions...
            </p>
          )}

          {!loading && filteredSessions.length === 0 && (
            <p className="rounded-xl bg-slate-950 p-4 text-slate-400">
              No sessions found.
            </p>
          )}

          {!loading && filteredSessions.length > 0 && (
            <div className="grid gap-4">
              {filteredSessions.map(function (session) {
                const viewerLink = '/track/' + session.id;

                const mapsLink =
                  session.lat && session.lng
                    ? 'https://www.google.com/maps?q=' + session.lat + ',' + session.lng
                    : '';

                return (
                  <div
                    key={session.id}
                    className={
                      session.sos
                        ? 'rounded-2xl border border-red-500/40 bg-red-500/10 p-5'
                        : 'rounded-2xl border border-slate-800 bg-slate-950 p-5'
                    }
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Badge
                            text={session.status || 'unknown'}
                            type={session.status === 'active' ? 'success' : 'muted'}
                          />

                          <Badge
                            text={session.sos ? 'SOS Active' : 'No SOS'}
                            type={session.sos ? 'danger' : 'muted'}
                          />

                          <Badge
                            text={'Updates: ' + (session.updateCount || 0)}
                            type="info"
                          />

                          <Badge
                            text={
                              session.batteryLevel !== null && session.batteryLevel !== undefined
                                ? 'Battery: ' + session.batteryLevel + '%'
                                : 'Battery: N/A'
                            }
                            type="info"
                          />

                          <Badge
                            text={'Route: ' + (session.routeHistory?.length || 0)}
                            type="info"
                          />
                        </div>

                        <p className="break-all text-sm text-slate-300">
                          Session ID: {session.id}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          User: {session.userName || 'Unknown'} - {session.userEmail || 'No email'}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Created: {formatDate(session.createdAt)}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Last Seen: {formatDate(session.lastSeenAt || session.updatedAt)}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Expires: {formatDate(session.expiresAt)}
                        </p>

                        {session.sos && (
                          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                            SOS Message: {session.sosMessage || 'No message'}
                          </p>
                        )}

                        {session.emergencyContact && (
                          <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                            Contact: {session.emergencyContact.name} - {session.emergencyContact.phone}
                          </p>
                        )}

                        {session.medicalInfo && (
                          <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-100">
                            <p className="font-bold text-blue-200">Medical Info</p>
                            <p>Blood Group: {session.medicalInfo.bloodGroup || 'Not set'}</p>
                            <p>Allergy: {session.medicalInfo.allergy || 'Not set'}</p>
                            <p>
                              Guardian: {session.medicalInfo.guardianName || 'Not set'}
                              {session.medicalInfo.guardianPhone ? ' - ' + session.medicalInfo.guardianPhone : ''}
                            </p>
                            {session.medicalInfo.medicalNote && (
                              <p className="mt-2">Note: {session.medicalInfo.medicalNote}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:justify-end">
                        <a
                          href={viewerLink}
                          target="_blank"
                          className="rounded-xl bg-emerald-500 px-5 py-3 text-center font-bold text-slate-950 hover:bg-emerald-400"
                        >
                          Open Viewer
                        </a>

                        {mapsLink && (
                          <a
                            href={mapsLink}
                            target="_blank"
                            className="rounded-xl border border-slate-700 px-5 py-3 text-center font-bold text-white hover:border-emerald-400"
                          >
                            Google Maps
                          </a>
                        )}

                        {session.sos && (
                          <>
                            <button
                              onClick={() => markProcessing(session.id)}
                              className="rounded-xl border border-yellow-500/40 px-5 py-3 font-bold text-yellow-300 hover:bg-yellow-500/10"
                            >
                              Processing
                            </button>

                            <button
                              onClick={() => resolveSOS(session.id)}
                              className="rounded-xl border border-emerald-500/40 px-5 py-3 font-bold text-emerald-300 hover:bg-emerald-500/10"
                            >
                              Resolve SOS
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => markExpired(session.id)}
                          className="rounded-xl border border-yellow-500/40 px-5 py-3 font-bold text-yellow-300 hover:bg-yellow-500/10"
                        >
                          Mark Expired
                        </button>

                        <button
                          onClick={() => deleteSession(session.id)}
                          className="rounded-xl border border-red-500/40 px-5 py-3 font-bold text-red-300 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, success, danger, warning }) {
  let color = 'text-white';
  let border = 'border-slate-800';

  if (success) {
    color = 'text-emerald-300';
    border = 'border-emerald-500/30';
  }

  if (danger) {
    color = 'text-red-300';
    border = 'border-red-500/30';
  }

  if (warning) {
    color = 'text-yellow-300';
    border = 'border-yellow-500/30';
  }

  return (
    <div className={'rounded-2xl border bg-slate-900/70 p-5 ' + border}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={'mt-2 text-3xl font-black ' + color}>{value}</p>
    </div>
  );
}

function Badge({ text, type }) {
  let className = 'rounded-full px-3 py-1 text-xs font-bold ';

  if (type === 'success') {
    className += 'bg-emerald-500/20 text-emerald-300';
  } else if (type === 'danger') {
    className += 'bg-red-500/20 text-red-300';
  } else if (type === 'info') {
    className += 'bg-blue-500/20 text-blue-300';
  } else {
    className += 'bg-slate-700 text-slate-300';
  }

  return <span className={className}>{text}</span>;
}

function formatDate(value) {
  if (!value) return 'Not available';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

