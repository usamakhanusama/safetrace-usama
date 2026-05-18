'use client';

import { useEffect, useMemo, useState } from 'react';
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

export default function AdminUsersPage() {
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
          <p className="mt-2 text-red-100">Please login first.</p>

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
          <p className="mt-2 text-red-100">Only admin users can manage users.</p>
          <p className="mt-2 text-sm text-red-200">
            Current role: {userProfile?.role || 'unknown'}
          </p>

          <Link
            href="/dashboard"
            className="mt-5 inline-block rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-400"
          >
            Go to Dashboard
          </Link>
        </section>
      </main>
    );
  }

  return <UserManagement currentUser={currentUser} />;
}

function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      setMessage('Loading users...');

      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(usersQuery);

      const data = snapshot.docs.map(function (item) {
        return {
          id: item.id,
          ...item.data(),
        };
      });

      setUsers(data);
      setMessage('Users loaded successfully.');
    } catch (error) {
      console.error(error);
      setMessage('Failed to load users: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function makeAdmin(userId) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: 'admin',
        updatedAt: new Date().toISOString(),
      });

      setMessage('User role updated to admin.');
      loadUsers();
    } catch (error) {
      console.error(error);
      setMessage('Failed to update role: ' + error.message);
    }
  }

  async function makeUser(userId) {
    if (userId === currentUser.uid) {
      setMessage('You cannot remove your own admin role from here.');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        role: 'user',
        updatedAt: new Date().toISOString(),
      });

      setMessage('User role updated to user.');
      loadUsers();
    } catch (error) {
      console.error(error);
      setMessage('Failed to update role: ' + error.message);
    }
  }

  async function deleteUserProfile(userId) {
    if (userId === currentUser.uid) {
      setMessage('You cannot delete your own profile document.');
      return;
    }

    const ok = window.confirm(
      'Delete this user profile document? This will not delete the Firebase Auth account.'
    );

    if (!ok) return;

    try {
      await deleteDoc(doc(db, 'users', userId));

      setMessage('User profile document deleted.');
      loadUsers();
    } catch (error) {
      console.error(error);
      setMessage('Failed to delete user profile: ' + error.message);
    }
  }

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((user) => user.role === 'admin').length;
    const normalUsers = users.filter((user) => user.role !== 'admin').length;

    return {
      total,
      admins,
      normalUsers,
    };
  }, [users]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="mb-3 inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300">
            Admin user management
          </p>

          <h1 className="text-3xl font-bold text-white md:text-5xl">
            Manage SafeTrace Users
          </h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            View user profiles, promote users to admin, remove admin role, and delete Firestore user profile documents.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/admin"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center font-bold text-white hover:border-emerald-400"
          >
            Back to Admin Dashboard
          </Link>

          <button
            onClick={loadUsers}
            className="rounded-xl border border-emerald-500/40 px-5 py-3 font-bold text-emerald-300 hover:bg-emerald-500/10"
          >
            Refresh Users
          </button>
        </div>

        {message && (
          <p className="mb-6 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-emerald-300">
            {message}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total Users" value={stats.total} />
          <StatCard label="Admins" value={stats.admins} danger />
          <StatCard label="Normal Users" value={stats.normalUsers} success />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="mb-4 text-2xl font-bold text-white">Users</h2>

          {loading && (
            <p className="rounded-xl bg-slate-950 p-4 text-slate-400">
              Loading users...
            </p>
          )}

          {!loading && users.length === 0 && (
            <p className="rounded-xl bg-slate-950 p-4 text-slate-400">
              No users found.
            </p>
          )}

          {!loading && users.length > 0 && (
            <div className="grid gap-4">
              {users.map(function (user) {
                const isSelf = user.id === currentUser.uid;

                return (
                  <div
                    key={user.id}
                    className={
                      user.role === 'admin'
                        ? 'rounded-2xl border border-red-500/30 bg-red-500/10 p-5'
                        : 'rounded-2xl border border-slate-800 bg-slate-950 p-5'
                    }
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Badge
                            text={user.role === 'admin' ? 'Admin' : 'User'}
                            type={user.role === 'admin' ? 'danger' : 'success'}
                          />

                          {isSelf && (
                            <Badge text="Current Account" type="info" />
                          )}
                        </div>

                        <p className="text-xl font-bold text-white">
                          {user.name || 'Unnamed User'}
                        </p>

                        <p className="mt-1 break-all text-sm text-slate-300">
                          Email: {user.email || 'No email'}
                        </p>

                        <p className="mt-1 break-all text-sm text-slate-500">
                          UID: {user.id}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Created: {formatDate(user.createdAt)}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Updated: {formatDate(user.updatedAt)}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
                        <button
                          onClick={() => makeAdmin(user.id)}
                          disabled={user.role === 'admin'}
                          className="rounded-xl border border-red-500/40 px-5 py-3 font-bold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Make Admin
                        </button>

                        <button
                          onClick={() => makeUser(user.id)}
                          disabled={user.role !== 'admin' || isSelf}
                          className="rounded-xl border border-emerald-500/40 px-5 py-3 font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Make User
                        </button>

                        <button
                          onClick={() => deleteUserProfile(user.id)}
                          disabled={isSelf}
                          className="rounded-xl border border-red-500/40 px-5 py-3 font-bold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete Profile
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm leading-7 text-yellow-100">
          Important: Delete Profile removes only the Firestore users document. It does not delete the Firebase Authentication account. Auth account deletion requires Firebase Admin SDK/server-side backend.
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, success, danger }) {
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
