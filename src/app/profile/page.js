'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { currentUser, userProfile, authLoading } = useAuth();

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
          <p className="mt-2 text-red-100">Please login first to edit your emergency profile.</p>

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

  return <ProfileApp currentUser={currentUser} userProfile={userProfile} />;
}

function ProfileApp({ currentUser, userProfile }) {
  const [name, setName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergy, setAllergy] = useState('');
  const [medicalNote, setMedicalNote] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianName, setGuardianName] = useState('');

  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);

      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        setName(data.name || currentUser.displayName || '');
        setBloodGroup(data.bloodGroup || '');
        setAllergy(data.allergy || '');
        setMedicalNote(data.medicalNote || '');
        setGuardianPhone(data.guardianPhone || '');
        setGuardianName(data.guardianName || '');
      } else {
        setName(currentUser.displayName || '');
      }
    } catch (error) {
      console.error(error);
      setMessage('Failed to load profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();

    if (!name.trim()) {
      setMessage('Name is required.');
      return;
    }

    try {
      setSaving(true);
      setMessage('Saving profile...');

      await updateProfile(auth.currentUser, {
        displayName: name.trim(),
      });

      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      const profileData = {
        name: name.trim(),
        email: currentUser.email || '',
        role: userProfile?.role || 'user',
        bloodGroup: bloodGroup.trim(),
        allergy: allergy.trim(),
        medicalNote: medicalNote.trim(),
        guardianPhone: guardianPhone.trim(),
        guardianName: guardianName.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (userSnap.exists()) {
        await updateDoc(userRef, profileData);
      } else {
        await setDoc(userRef, {
          ...profileData,
          createdAt: new Date().toISOString(),
        });
      }

      setMessage('Emergency profile saved successfully. Please refresh if navbar name does not update immediately.');
    } catch (error) {
      console.error(error);
      setMessage('Failed to save profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <section className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="mb-3 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
            Emergency profile
          </p>

          <h1 className="text-3xl font-bold text-white md:text-5xl">
            My Profile & Medical Info
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Add optional emergency medical information. This can help trusted viewers/admins during SOS situations.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center font-bold text-white hover:border-emerald-400"
          >
            Back to Dashboard
          </Link>

          <Link
            href="/contacts"
            className="rounded-xl border border-emerald-500/40 px-5 py-3 text-center font-bold text-emerald-300 hover:bg-emerald-500/10"
          >
            Trusted Contacts
          </Link>
        </div>

        {message && (
          <p className="mb-6 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-emerald-300">
            {message}
          </p>
        )}

        {loading ? (
          <p className="rounded-xl bg-slate-900 p-4 text-slate-400">
            Loading profile...
          </p>
        ) : (
          <form
            onSubmit={saveProfile}
            className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Full Name
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Email
                </label>
                <input
                  value={currentUser.email || ''}
                  disabled
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(event) => setBloodGroup(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                >
                  <option value="">Select blood group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Guardian Name
                </label>
                <input
                  value={guardianName}
                  onChange={(event) => setGuardianName(event.target.value)}
                  placeholder="Guardian / family member name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Guardian Phone
                </label>
                <input
                  value={guardianPhone}
                  onChange={(event) => setGuardianPhone(event.target.value)}
                  placeholder="88017xxxxxxxx"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Allergy
                </label>
                <input
                  value={allergy}
                  onChange={(event) => setAllergy(event.target.value)}
                  placeholder="Example: Penicillin / Dust / None"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Medical Note
              </label>
              <textarea
                value={medicalNote}
                onChange={(event) => setMedicalNote(event.target.value)}
                rows={4}
                placeholder="Example: Asthma patient, diabetic, needs inhaler, etc."
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />
            </div>

            <button
              disabled={saving}
              className="mt-6 w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Emergency Profile'}
            </button>

            <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm leading-7 text-yellow-100">
              This information is optional and sensitive. Only add details that you are comfortable sharing during emergency tracking/SOS.
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
