'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();

    if (!name || !email || !password) {
      setMessage('Please fill all fields.');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      setMessage('Creating account...');

      const result = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(result.user, {
        displayName: name,
      });

      await setDoc(doc(db, 'users', result.user.uid), {
        name,
        email,
        role: 'user',
        createdAt: new Date().toISOString(),
      });

      setMessage('Account created successfully.');
      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      setMessage('Register failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <section className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h1 className="text-3xl font-bold text-white">Create Account</h1>
        <p className="mt-2 text-slate-400">Register to use SafeTrace securely.</p>

        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
          />

          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
          />

          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
          />

          <button
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>

        {message && (
          <p className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-emerald-300">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
