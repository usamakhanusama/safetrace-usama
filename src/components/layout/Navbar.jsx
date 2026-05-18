'use client';

import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { currentUser, userProfile, isAdmin, authLoading } = useAuth();

  async function handleLogout() {
    await signOut(auth);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-white">
          Safe<span className="text-emerald-400">Trace</span>
        </Link>

        <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <Link href="/" className="hover:text-emerald-400">Home</Link>
          {!isAdmin && (
            <>
              <Link href="/dashboard" className="hover:text-emerald-400">Dashboard</Link>
              <Link href="/contacts" className="hover:text-emerald-400">Contacts</Link>
              <Link href="/profile" className="hover:text-emerald-400">Profile</Link>
            </>
          )}
          {isAdmin && (
            <Link href="/admin" className="hover:text-red-300">Admin</Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!authLoading && !currentUser && (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-white hover:border-emerald-400"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Register
              </Link>
            </>
          )}

          {!authLoading && currentUser && (
            <>
              <span className="hidden text-sm text-slate-400 sm:inline">
                {userProfile?.name || currentUser.email}
                {isAdmin ? ' - Admin' : ''}
              </span>

              <button
                onClick={handleLogout}
                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/10"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}


