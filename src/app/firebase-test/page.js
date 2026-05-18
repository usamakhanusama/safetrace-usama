'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function FirebaseTestPage() {
  const [message, setMessage] = useState('');

  async function testFirebase() {
    try {
      setMessage('Testing Firebase...');

      await addDoc(collection(db, 'testMessages'), {
        text: 'SafeTrace Firebase connected',
        createdAt: serverTimestamp(),
      });

      setMessage('Firebase connected successfully. Test data saved.');
    } catch (error) {
      console.error(error);
      setMessage('Firebase error: ' + error.message);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h1 className="text-3xl font-bold text-white">Firebase Test</h1>
        <p className="mt-2 text-slate-400">
          Click the button to save a test document in Firestore.
        </p>

        <button
          onClick={testFirebase}
          className="mt-6 rounded-xl bg-emerald-500 px-6 py-4 font-bold text-slate-950 hover:bg-emerald-400"
        >
          Test Firebase
        </button>

        {message && (
          <p className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-emerald-300">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
