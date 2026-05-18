'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function ContactsPage() {
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
          <p className="mt-2 text-red-100">Please login first to manage trusted contacts.</p>

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

  return <TrustedContactsApp currentUser={currentUser} />;
}

function TrustedContactsApp({ currentUser }) {
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    try {
      setLoading(true);

      const contactsQuery = query(
        collection(db, 'users', currentUser.uid, 'trustedContacts')
      );

      const snapshot = await getDocs(contactsQuery);

      const data = snapshot.docs
        .map(function (item) {
          return {
            id: item.id,
            ...item.data(),
          };
        })
        .sort(function (a, b) {
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

      setContacts(data);
    } catch (error) {
      console.error(error);
      setMessage('Failed to load contacts: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function addContact(event) {
    event.preventDefault();

    if (!name.trim() || !phone.trim()) {
      setMessage('Please enter name and phone number.');
      return;
    }

    try {
      const firstContact = contacts.length === 0;

      await addDoc(collection(db, 'users', currentUser.uid, 'trustedContacts'), {
        name: name.trim(),
        phone: phone.trim(),
        relation: relation.trim() || 'Trusted Contact',
        isPrimary: firstContact,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setName('');
      setPhone('');
      setRelation('');
      setMessage(firstContact ? 'Contact added as primary.' : 'Contact added.');
      loadContacts();
    } catch (error) {
      console.error(error);
      setMessage('Failed to add contact: ' + error.message);
    }
  }

  async function makePrimary(contactId) {
    try {
      const updates = contacts.map(function (contact) {
        return updateDoc(
          doc(db, 'users', currentUser.uid, 'trustedContacts', contact.id),
          {
            isPrimary: contact.id === contactId,
            updatedAt: new Date().toISOString(),
          }
        );
      });

      await Promise.all(updates);

      setMessage('Primary contact updated.');
      loadContacts();
    } catch (error) {
      console.error(error);
      setMessage('Failed to update primary contact: ' + error.message);
    }
  }

  async function deleteContact(contactId) {
    const ok = window.confirm('Delete this trusted contact?');

    if (!ok) return;

    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'trustedContacts', contactId));

      setMessage('Contact deleted.');
      loadContacts();
    } catch (error) {
      console.error(error);
      setMessage('Failed to delete contact: ' + error.message);
    }
  }

  function getCleanPhone(phoneNumber) {
    return phoneNumber.replace(/\D/g, '');
  }

  function getWhatsAppLink(phoneNumber) {
    const phoneClean = getCleanPhone(phoneNumber);
    const text = encodeURIComponent('You are saved as my trusted emergency contact on SafeTrace.');
    return 'https://wa.me/' + phoneClean + '?text=' + text;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="mb-3 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
            Firestore trusted contacts
          </p>

          <h1 className="text-3xl font-bold text-white md:text-5xl">
            Trusted Contacts
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Add emergency contacts. Your primary contact will be used in live tracking sessions.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center font-bold text-white hover:border-emerald-400"
          >
            Back to Dashboard
          </Link>

          <button
            onClick={loadContacts}
            className="rounded-xl border border-emerald-500/40 px-5 py-3 font-bold text-emerald-300 hover:bg-emerald-500/10"
          >
            Refresh Contacts
          </button>
        </div>

        {message && (
          <p className="mb-6 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-emerald-300">
            {message}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={addContact}
            className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6"
          >
            <h2 className="mb-4 text-2xl font-bold text-white">
              Add Contact
            </h2>

            <div className="space-y-4">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name, e.g. Father"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />

              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone with country code, e.g. 88017xxxxxxxx"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />

              <input
                value={relation}
                onChange={(event) => setRelation(event.target.value)}
                placeholder="Relation, e.g. Father / Brother / Friend"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />

              <button className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-400">
                Save Contact
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              Use Bangladesh number with country code. Example: 88017xxxxxxxx.
            </p>
          </form>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="mb-4 text-2xl font-bold text-white">
              Contacts Summary
            </h2>

            <div className="grid gap-4">
              <SummaryCard label="Total Contacts" value={contacts.length} />
              <SummaryCard
                label="Primary Contact"
                value={contacts.find((item) => item.isPrimary)?.name || 'Not selected'}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm leading-7 text-yellow-100">
              Primary contact will be attached automatically when you start a live tracking session.
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="mb-4 text-2xl font-bold text-white">
            Saved Contacts
          </h2>

          {loading && (
            <p className="rounded-xl bg-slate-950 p-4 text-slate-400">
              Loading contacts...
            </p>
          )}

          {!loading && contacts.length === 0 && (
            <p className="rounded-xl bg-slate-950 p-4 text-slate-400">
              No trusted contacts found.
            </p>
          )}

          {!loading && contacts.length > 0 && (
            <div className="grid gap-4">
              {contacts.map(function (contact) {
                return (
                  <div
                    key={contact.id}
                    className={
                      contact.isPrimary
                        ? 'rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5'
                        : 'rounded-2xl border border-slate-800 bg-slate-950 p-5'
                    }
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Badge
                            text={contact.isPrimary ? 'Primary' : 'Secondary'}
                            type={contact.isPrimary ? 'success' : 'muted'}
                          />
                          <Badge
                            text={contact.relation || 'Trusted Contact'}
                            type="info"
                          />
                        </div>

                        <p className="text-xl font-bold text-white">
                          {contact.name}
                        </p>

                        <p className="mt-1 text-sm text-slate-300">
                          Phone: {contact.phone}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Created: {formatDate(contact.createdAt)}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
                        <a
                          href={'tel:' + contact.phone}
                          className="rounded-xl border border-slate-700 px-5 py-3 text-center font-bold text-white hover:border-emerald-400"
                        >
                          Call
                        </a>

                        <a
                          href={getWhatsAppLink(contact.phone)}
                          target="_blank"
                          className="rounded-xl bg-green-500 px-5 py-3 text-center font-bold text-slate-950 hover:bg-green-400"
                        >
                          WhatsApp
                        </a>

                        <button
                          onClick={() => makePrimary(contact.id)}
                          disabled={contact.isPrimary}
                          className="rounded-xl border border-emerald-500/40 px-5 py-3 font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Make Primary
                        </button>

                        <button
                          onClick={() => deleteContact(contact.id)}
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

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 break-all text-2xl font-black text-emerald-300">
        {value}
      </p>
    </div>
  );
}

function Badge({ text, type }) {
  let className = 'rounded-full px-3 py-1 text-xs font-bold ';

  if (type === 'success') {
    className += 'bg-emerald-500/20 text-emerald-300';
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
