'use client';

import Link from 'next/link';
import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset(event) {
    event.preventDefault();

    if (!email.trim()) {
      setMessage('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);
      setMessage('Sending password reset email...');

      await sendPasswordResetEmail(auth, email.trim());

      setMessage('Password reset email sent. Please check your inbox or spam folder.');
    } catch (error) {
      console.error(error);

      if (error.code === 'auth/user-not-found') {
        setMessage('No account found with this email.');
      } else if (error.code === 'auth/invalid-email') {
        setMessage('Invalid email address.');
      } else {
        setMessage('Failed to send reset email: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <section className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="mb-3 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
          Account recovery
        </p>

        <h1 className="text-3xl font-bold text-white">
          Forgot Password
        </h1>

        <p className="mt-2 text-slate-400">
          Enter your email address. We will send a Firebase password reset link.
        </p>

        <form onSubmit={handleReset} className="mt-6 space-y-4">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="Enter your email"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
          />

          <button
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {message && (
          <p className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-emerald-300">
            {message}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href="/login" className="text-emerald-300 hover:text-emerald-200">
            Back to Login
          </Link>

          <Link href="/register" className="text-slate-400 hover:text-white">
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}
