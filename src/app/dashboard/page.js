'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const LiveMap = dynamic(() => import('@/components/maps/LiveMap'), {
  ssr: false,
});

export default function DashboardPage() {
  const { currentUser, authLoading } = useAuth();

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12">
        <section className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h1 className="text-3xl font-bold text-white">Checking Login...</h1>
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
          <p className="mt-2 text-red-100">
            Please login first to access your safety dashboard.
          </p>

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

  return <DashboardApp currentUser={currentUser} />;
}

function DashboardApp({ currentUser }) {
  const [location, setLocation] = useState(null);
  const [batteryInfo, setBatteryInfo] = useState(null);
  const [routeHistory, setRouteHistory] = useState([]);
  const [medicalInfo, setMedicalInfo] = useState(null);

  const [tracking, setTracking] = useState(false);
  const [message, setMessage] = useState('');
  const [updateCount, setUpdateCount] = useState(0);
  const [shareLink, setShareLink] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sosActive, setSosActive] = useState(false);
  const [sosMessage, setSosMessage] = useState(
    'I need emergency help. Please check my live location.'
  );

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [savedContact, setSavedContact] = useState(null);

  const [recentSessions, setRecentSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [expiryMinutes, setExpiryMinutes] = useState(60);
  const [expiresAt, setExpiresAt] = useState('');

  const watchIdRef = useRef(null);
  const sessionIdRef = useRef('');

  useEffect(() => {
    const saved = localStorage.getItem('safetrace_contact');

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedContact(parsed);
        setContactName(parsed.name || '');
        setContactPhone(parsed.phone || '');
      } catch {
        localStorage.removeItem('safetrace_contact');
      }
    }

    loadRecentSessions();
    loadPrimaryContact();
    loadMedicalProfile();
  }, []);

  async function loadMedicalProfile() {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        setMedicalInfo({
          name: data.name || currentUser.displayName || currentUser.email || 'User',
          bloodGroup: data.bloodGroup || '',
          allergy: data.allergy || '',
          medicalNote: data.medicalNote || '',
          guardianName: data.guardianName || '',
          guardianPhone: data.guardianPhone || '',
        });
      }
    } catch (error) {
      console.error(error);
      setMessage('Failed to load medical profile: ' + error.message);
    }
  }

  async function loadPrimaryContact() {
    try {
      const contactsQuery = query(
        collection(db, 'users', currentUser.uid, 'trustedContacts'),
        where('isPrimary', '==', true),
        limit(1)
      );

      const snapshot = await getDocs(contactsQuery);

      if (!snapshot.empty) {
        const contactDoc = snapshot.docs[0];
        const contact = {
          id: contactDoc.id,
          ...contactDoc.data(),
        };

        const primaryContact = {
          name: contact.name || '',
          phone: contact.phone || '',
          relation: contact.relation || 'Trusted Contact',
          source: 'firestore',
        };

        setSavedContact(primaryContact);
        setContactName(primaryContact.name);
        setContactPhone(primaryContact.phone);
      }
    } catch (error) {
      console.error(error);
      setMessage('Failed to load primary contact: ' + error.message);
    }
  }

  async function loadRecentSessions() {
    try {
      setSessionsLoading(true);

      const sessionsQuery = query(
        collection(db, 'liveSessions'),
        where('userId', '==', currentUser.uid),
        limit(8)
      );

      const snapshot = await getDocs(sessionsQuery);

      const sessions = snapshot.docs
        .map(function (item) {
          return {
            id: item.id,
            ...item.data(),
          };
        })
        .sort(function (a, b) {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

      setRecentSessions(sessions);
    } catch (error) {
      console.error(error);
      setMessage('Failed to load recent sessions: ' + error.message);
    } finally {
      setSessionsLoading(false);
    }
  }

  function saveContact() {
    if (!contactName.trim() || !contactPhone.trim()) {
      setMessage('Please enter contact name and phone number.');
      return;
    }

    const contact = {
      name: contactName.trim(),
      phone: contactPhone.trim(),
    };

    localStorage.setItem('safetrace_contact', JSON.stringify(contact));
    setSavedContact(contact);
    setMessage('Emergency contact saved.');
  }

  function removeContact() {
    localStorage.removeItem('safetrace_contact');
    setSavedContact(null);
    setContactName('');
    setContactPhone('');
    setMessage('Emergency contact removed.');
  }

  function getExpiryDate() {
    const minutes = Number(expiryMinutes || 60);
    return new Date(Date.now() + minutes * 60 * 1000).toISOString();
  }

  async function getBatteryInfo() {
    try {
      if (!navigator.getBattery) {
        return {
          level: null,
          charging: null,
        };
      }

      const battery = await navigator.getBattery();

      return {
        level: Math.round(battery.level * 100),
        charging: battery.charging,
      };
    } catch {
      return {
        level: null,
        charging: null,
      };
    }
  }

  async function startTracking() {
    if (!navigator.geolocation) {
      setMessage('Your browser does not support GPS location.');
      return;
    }

    if (tracking) {
      setMessage('Live tracking is already active.');
      return;
    }

    try {
      setMessage('Creating live tracking session...');

      const expiryTime = getExpiryDate();
      setExpiresAt(expiryTime);
      setRouteHistory([]);
      setBatteryInfo(null);

      const sessionRef = await addDoc(collection(db, 'liveSessions'), {
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),

        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        userName: currentUser.displayName || currentUser.email || 'User',

        expiresAt: expiryTime,
        expiryMinutes: Number(expiryMinutes || 60),

        lat: null,
        lng: null,
        accuracy: null,
        speed: null,
        heading: null,

        batteryLevel: null,
        batteryCharging: null,
        routeHistory: [],

        updateCount: 0,

        sos: false,
        sosMessage: '',
        sosAt: null,

        emergencyContact: savedContact || null,
        medicalInfo: medicalInfo || null,
        privacy: 'consent-based',
      });

      const newSessionId = sessionRef.id;
      sessionIdRef.current = newSessionId;
      setSessionId(newSessionId);

      const link = window.location.origin + '/track/' + newSessionId;
      setShareLink(link);

      setMessage('Session created. Requesting location permission...');

      const watchId = navigator.geolocation.watchPosition(
        async function (position) {
          const now = new Date();

          if (expiryTime && now > new Date(expiryTime)) {
            expireCurrentSession();
            return;
          }

          const battery = await getBatteryInfo();

          const data = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            updatedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            batteryLevel: battery.level,
            batteryCharging: battery.charging,
          };

          setBatteryInfo(battery);
          setLocation(data);
          setTracking(true);

          setRouteHistory(function (prev) {
            const nextRoute = [
              ...prev,
              {
                lat: data.lat,
                lng: data.lng,
                time: data.updatedAt,
              },
            ].slice(-50);

            updateDoc(doc(db, 'liveSessions', sessionIdRef.current), {
              routeHistory: nextRoute,
            });

            return nextRoute;
          });

          setUpdateCount(function (prev) {
            const nextCount = prev + 1;

            updateDoc(doc(db, 'liveSessions', sessionIdRef.current), {
              status: 'active',
              lat: data.lat,
              lng: data.lng,
              accuracy: data.accuracy,
              speed: data.speed,
              heading: data.heading,
              updatedAt: data.updatedAt,
              lastSeenAt: data.lastSeenAt,
              batteryLevel: data.batteryLevel,
              batteryCharging: data.batteryCharging,
              updateCount: nextCount,
              emergencyContact: savedContact || null,
            });

            return nextCount;
          });

          setMessage(
            'Live tracking active. Session will expire at ' +
              new Date(expiryTime).toLocaleString() +
              '.'
          );
        },
        function (error) {
          setTracking(false);

          if (error.code === error.PERMISSION_DENIED) {
            setMessage('Location permission denied. Please allow location access.');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setMessage('Location unavailable. Check GPS or network.');
          } else if (error.code === error.TIMEOUT) {
            setMessage('Location request timed out. Try again.');
          } else {
            setMessage('Failed to get location.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 3000,
        }
      );

      watchIdRef.current = watchId;

      setTimeout(function () {
        loadRecentSessions();
      }, 1500);
    } catch (error) {
      console.error(error);
      setMessage('Firebase session error: ' + error.message);
    }
  }

  async function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setTracking(false);

    if (sessionIdRef.current) {
      await updateDoc(doc(db, 'liveSessions', sessionIdRef.current), {
        status: 'stopped',
        sos: false,
        stoppedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setSosActive(false);
    setMessage('Live tracking stopped.');
    loadRecentSessions();
  }

  async function expireCurrentSession() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setTracking(false);

    if (sessionIdRef.current) {
      await updateDoc(doc(db, 'liveSessions', sessionIdRef.current), {
        status: 'expired',
        sos: false,
        expiredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setSosActive(false);
    setMessage('Session expired.');
    loadRecentSessions();
  }

  async function sendSOS() {
    if (!sessionIdRef.current) {
      setMessage('Start live tracking first, then send SOS.');
      return;
    }

    try {
      await updateDoc(doc(db, 'liveSessions', sessionIdRef.current), {
        sos: true,
        sosMessage:
          sosMessage || 'I need emergency help. Please check my live location.',
        sosAt: new Date().toISOString(),
        emergencyContact: savedContact || null,
        updatedAt: new Date().toISOString(),
      });

      setSosActive(true);
      setMessage('SOS sent. Trusted viewer will see emergency alert.');
      loadRecentSessions();
    } catch (error) {
      console.error(error);
      setMessage('Failed to send SOS: ' + error.message);
    }
  }

  async function cancelSOS() {
    if (!sessionIdRef.current) {
      setMessage('No active session found.');
      return;
    }

    try {
      await updateDoc(doc(db, 'liveSessions', sessionIdRef.current), {
        sos: false,
        sosCancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setSosActive(false);
      setMessage('SOS cancelled.');
      loadRecentSessions();
    } catch (error) {
      console.error(error);
      setMessage('Failed to cancel SOS: ' + error.message);
    }
  }

  async function deleteSession(id) {
    const confirmDelete = window.confirm(
      'Delete this session? This cannot be undone.'
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'liveSessions', id));
      setMessage('Session deleted.');
      loadRecentSessions();
    } catch (error) {
      console.error(error);
      setMessage('Failed to delete session: ' + error.message);
    }
  }

  async function markSessionExpired(id) {
    try {
      await updateDoc(doc(db, 'liveSessions', id), {
        status: 'expired',
        sos: false,
        expiredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setMessage('Session marked as expired.');
      loadRecentSessions();
    } catch (error) {
      console.error(error);
      setMessage('Failed to expire session: ' + error.message);
    }
  }

  function copyShareLink() {
    if (!shareLink) {
      setMessage('Start tracking first to generate share link.');
      return;
    }

    navigator.clipboard.writeText(shareLink);
    setMessage('Share link copied.');
  }

  function copyGoogleMapsLink() {
    if (!location) {
      setMessage('No location found yet.');
      return;
    }

    const link =
      'https://www.google.com/maps?q=' + location.lat + ',' + location.lng;

    navigator.clipboard.writeText(link);
    setMessage('Google Maps link copied.');
  }

  function getCleanPhone(phone) {
    return phone.replace(/\D/g, '');
  }

  function getWhatsAppMessage() {
    if (!shareLink) {
      return '';
    }

    if (sosActive) {
      return (
        'SOS Emergency! I need help. Please track my live location here: ' +
        shareLink
      );
    }

    return 'I am sharing my live safety location with you: ' + shareLink;
  }

  function shareToWhatsApp() {
    if (!shareLink) {
      setMessage('Start tracking first to generate share link.');
      return;
    }

    const text = encodeURIComponent(getWhatsAppMessage());
    window.open('https://wa.me/?text=' + text, '_blank');
  }

  function shareToSavedContactWhatsApp() {
    if (!savedContact) {
      setMessage('Save an emergency contact first.');
      return;
    }

    if (!shareLink) {
      setMessage('Start tracking first to generate share link.');
      return;
    }

    const phone = getCleanPhone(savedContact.phone);
    const text = encodeURIComponent(getWhatsAppMessage());

    window.open('https://wa.me/' + phone + '?text=' + text, '_blank');
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="mb-3 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
            Battery, last seen, and route tracking enabled
          </p>

          <h1 className="text-3xl font-bold text-white md:text-5xl">
            SafeTrace Live Dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Start live tracking, share location, send SOS, track battery level, and view movement trail.
          </p>
        </div>

        {sosActive && (
          <div className="mb-6 rounded-3xl border border-red-500/40 bg-red-500/10 p-6">
            <h2 className="text-2xl font-bold text-red-300">SOS ACTIVE</h2>
            <p className="mt-2 text-red-100">
              Your emergency alert is visible on the live viewer page.
            </p>
          </div>
        )}

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-white">Emergency Contact</h2>

            <Link
              href="/profile"
              className="rounded-xl border border-blue-500/40 px-4 py-2 text-center text-sm font-bold text-blue-300 hover:bg-blue-500/10"
            >
              Edit Medical Profile
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              placeholder="Contact name, e.g. Father"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
            />

            <input
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              placeholder="Phone with country code, e.g. 88017xxxxxxxx"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contacts"
              className="rounded-xl bg-emerald-500 px-5 py-3 text-center font-bold text-slate-950 hover:bg-emerald-400"
            >
              Manage Trusted Contacts
            </Link>

            <button
              onClick={saveContact}
              className="rounded-xl border border-emerald-500/40 px-5 py-3 font-bold text-emerald-300 hover:bg-emerald-500/10"
            >
              Save Local Contact
            </button>

            <button
              onClick={removeContact}
              disabled={!savedContact}
              className="rounded-xl border border-red-500/40 px-5 py-3 font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              Remove Contact
            </button>

            {savedContact && (
              <a
                href={'tel:' + savedContact.phone}
                className="rounded-xl border border-slate-700 px-5 py-3 text-center font-bold text-white hover:border-emerald-400"
              >
                Call {savedContact.name}
              </a>
            )}
          </div>

          {medicalInfo && (
            <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
              <p className="text-sm font-semibold text-blue-200">
                Medical Profile: {medicalInfo.bloodGroup ? 'Blood ' + medicalInfo.bloodGroup : 'Blood group not set'}
              </p>
              <p className="mt-1 text-sm text-blue-100">
                Allergy: {medicalInfo.allergy || 'Not set'}
              </p>
              <p className="mt-1 text-sm text-blue-100">
                Guardian: {medicalInfo.guardianName || 'Not set'} {medicalInfo.guardianPhone ? '- ' + medicalInfo.guardianPhone : ''}
              </p>
            </div>
          )}

          {savedContact && (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-200">
                Saved Contact: <strong>{savedContact.name}</strong> - {savedContact.phone}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Session Expiry Time
              </label>

              <select
                value={expiryMinutes}
                onChange={(event) => setExpiryMinutes(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="240">4 hours</option>
              </select>

              {expiresAt && (
                <p className="mt-2 text-sm text-slate-400">
                  Current session expires at: {new Date(expiresAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <button
                onClick={startTracking}
                disabled={tracking}
                className="rounded-xl bg-emerald-500 px-6 py-4 font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tracking ? 'Tracking Active' : 'Start Live Tracking'}
              </button>

              <button
                onClick={stopTracking}
                disabled={!sessionId}
                className="rounded-xl border border-red-500/40 px-6 py-4 font-bold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Stop Tracking
              </button>

              <button
                onClick={expireCurrentSession}
                disabled={!sessionId}
                className="rounded-xl border border-yellow-500/40 px-6 py-4 font-bold text-yellow-300 hover:bg-yellow-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Expire Session
              </button>

              <button
                onClick={sendSOS}
                disabled={!sessionId || sosActive}
                className="rounded-xl bg-red-600 px-6 py-4 font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send SOS
              </button>

              <button
                onClick={cancelSOS}
                disabled={!sessionId || !sosActive}
                className="rounded-xl border border-yellow-500/40 px-6 py-4 font-bold text-yellow-300 hover:bg-yellow-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel SOS
              </button>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                SOS Message
              </label>
              <textarea
                value={sosMessage}
                onChange={(event) => setSosMessage(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                placeholder="Write emergency message..."
              />
            </div>

            {message && (
              <p className="mt-5 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-emerald-300">
                {message}
              </p>
            )}

            <div className="mt-6 grid gap-4">
              <StatusCard
                label="Tracking Status"
                value={tracking ? 'Active' : 'Stopped'}
                active={tracking}
              />

              <StatusCard
                label="SOS Status"
                value={sosActive ? 'SOS Active' : 'No SOS'}
                active={sosActive}
                danger={sosActive}
              />

              <StatusCard
                label="Location Updates"
                value={updateCount}
                active={true}
              />

              <StatusCard
                label="Battery"
                value={
                  batteryInfo?.level !== null && batteryInfo?.level !== undefined
                    ? batteryInfo.level + '%'
                    : 'Not available'
                }
                active={true}
              />

              <StatusCard
                label="Charging"
                value={
                  batteryInfo?.charging === null || batteryInfo?.charging === undefined
                    ? 'Not available'
                    : batteryInfo.charging
                    ? 'Yes'
                    : 'No'
                }
                active={batteryInfo?.charging === true}
              />

              <StatusCard
                label="Route Points"
                value={routeHistory.length}
                active={true}
              />

              <StatusCard
                label="Session ID"
                value={sessionId || 'Not created'}
                active={true}
              />
            </div>

            {shareLink && (
              <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <h2 className="mb-3 text-xl font-bold text-white">Live Share Link</h2>
                <p className="break-all text-sm text-emerald-200">{shareLink}</p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    onClick={copyShareLink}
                    className="rounded-xl border border-emerald-500/40 px-5 py-3 font-semibold text-emerald-300 hover:bg-emerald-500/10"
                  >
                    Copy Share Link
                  </button>

                  <button
                    onClick={shareToWhatsApp}
                    className="rounded-xl bg-green-500 px-5 py-3 font-bold text-slate-950 hover:bg-green-400"
                  >
                    Share WhatsApp
                  </button>

                  <button
                    onClick={shareToSavedContactWhatsApp}
                    disabled={!savedContact}
                    className="rounded-xl border border-green-500/40 px-5 py-3 font-bold text-green-300 hover:bg-green-500/10 disabled:opacity-50"
                  >
                    WhatsApp Contact
                  </button>

                  <a
                    href={shareLink}
                    target="_blank"
                    className="rounded-xl bg-emerald-500 px-5 py-3 text-center font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    Open Live Viewer
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="mb-4 text-2xl font-bold text-white">Live Map Preview</h2>

            <LiveMap
              lat={location?.lat}
              lng={location?.lng}
              title="Your current live location"
              routeHistory={routeHistory}
            />

            {location && (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Info label="Latitude" value={location.lat} />
                <Info label="Longitude" value={location.lng} />
                <Info label="Accuracy" value={Math.round(location.accuracy) + ' meters'} />
                <Info label="Last Updated" value={location.updatedAt} />
              </div>
            )}

            {location && (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href={'https://www.google.com/maps?q=' + location.lat + ',' + location.lng}
                  target="_blank"
                  className="rounded-xl border border-emerald-500/40 px-5 py-3 text-center font-semibold text-emerald-300 hover:bg-emerald-500/10"
                >
                  Open in Google Maps
                </a>

                <button
                  onClick={copyGoogleMapsLink}
                  className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white hover:border-emerald-400"
                >
                  Copy Google Maps Link
                </button>
              </div>
            )}
          </div>
        </div>

        <RecentSessions
          sessions={recentSessions}
          loading={sessionsLoading}
          onRefresh={loadRecentSessions}
          onDelete={deleteSession}
          onExpire={markSessionExpired}
        />
      </section>
    </main>
  );
}

function RecentSessions({ sessions, loading, onRefresh, onDelete, onExpire }) {
  return (
    <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">My Recent Tracking Sessions</h2>
          <p className="mt-1 text-sm text-slate-400">
            Only your own sessions are shown here.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="rounded-xl border border-emerald-500/40 px-5 py-3 font-semibold text-emerald-300 hover:bg-emerald-500/10"
        >
          Refresh Sessions
        </button>
      </div>

      {loading && (
        <p className="rounded-xl bg-slate-950 p-4 text-slate-400">
          Loading recent sessions...
        </p>
      )}

      {!loading && sessions.length === 0 && (
        <p className="rounded-xl bg-slate-950 p-4 text-slate-400">
          No recent sessions found.
        </p>
      )}

      {!loading && sessions.length > 0 && (
        <div className="grid gap-4">
          {sessions.map(function (session) {
            const viewerLink =
              typeof window !== 'undefined'
                ? window.location.origin + '/track/' + session.id
                : '/track/' + session.id;

            const expiredByTime = session.expiresAt
              ? new Date() > new Date(session.expiresAt)
              : false;

            return (
              <div
                key={session.id}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Badge
                        text={expiredByTime ? 'expired by time' : session.status || 'unknown'}
                        type={expiredByTime || session.status === 'expired' ? 'warning' : session.status === 'active' ? 'success' : 'muted'}
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
                    </div>

                    <p className="break-all text-sm text-slate-300">
                      Session ID: {session.id}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Created: {formatDate(session.createdAt)}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Last Seen: {formatDate(session.lastSeenAt || session.updatedAt)}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Expires At: {formatDate(session.expiresAt)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <a
                      href={viewerLink}
                      target="_blank"
                      className="rounded-xl bg-emerald-500 px-5 py-3 text-center font-bold text-slate-950 hover:bg-emerald-400"
                    >
                      Open Viewer
                    </a>

                    {session.lat && session.lng && (
                      <a
                        href={'https://www.google.com/maps?q=' + session.lat + ',' + session.lng}
                        target="_blank"
                        className="rounded-xl border border-slate-700 px-5 py-3 text-center font-bold text-white hover:border-emerald-400"
                      >
                        Google Maps
                      </a>
                    )}

                    <button
                      onClick={() => onExpire(session.id)}
                      className="rounded-xl border border-yellow-500/40 px-5 py-3 font-bold text-yellow-300 hover:bg-yellow-500/10"
                    >
                      Mark Expired
                    </button>

                    <button
                      onClick={() => onDelete(session.id)}
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
  );
}

function Badge({ text, type }) {
  let className = 'rounded-full px-3 py-1 text-xs font-bold ';

  if (type === 'success') {
    className += 'bg-emerald-500/20 text-emerald-300';
  } else if (type === 'danger') {
    className += 'bg-red-500/20 text-red-300';
  } else if (type === 'warning') {
    className += 'bg-yellow-500/20 text-yellow-300';
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



