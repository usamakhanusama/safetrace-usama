'use client';

import Link from 'next/link';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();

    if (!email || !password) {
      setMessage('Please enter email and password.');
      return;
    }

    try {
      setLoading(true);
      setMessage('Logging in...');

      await signInWithEmailAndPassword(auth, email, password);

      setMessage('Login successful.');
      router.push('/dashboard');
    } catch (error) {
      console.error(error);

      if (error.code === 'auth/invalid-credential') {
        setMessage('Invalid email or password.');
      } else if (error.code === 'auth/user-not-found') {
        setMessage('No account found with this email.');
      } else if (error.code === 'auth/wrong-password') {
        setMessage('Wrong password.');
      } else {
        setMessage('Login failed: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <section className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="mb-3 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
          Secure login
        </p>

        <h1 className="text-3xl font-bold text-white">Login</h1>
        <p className="mt-2 text-slate-400">Login to your SafeTrace account.</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
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

          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-emerald-300 hover:text-emerald-200"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {message && (
          <p className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-emerald-300">
            {message}
          </p>
        )}

        <p className="mt-5 text-center text-sm text-slate-400">
          Do not have an account?{' '}
          <Link href="/register" className="font-semibold text-emerald-300 hover:text-emerald-200">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}
