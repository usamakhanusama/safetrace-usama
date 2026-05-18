import Link from 'next/link';

export default function TrackPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <section className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="mb-3 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
          SafeTrace Viewer
        </p>

        <h1 className="text-3xl font-bold text-white">
          Live Tracking Link Required
        </h1>

        <p className="mt-3 leading-7 text-slate-400">
          To view a live location, open the share link generated from the dashboard.
          The link format will look like this:
        </p>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="break-all text-sm text-emerald-300">
            /track/session-id
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="rounded-xl bg-emerald-500 px-5 py-3 text-center font-bold text-slate-950 hover:bg-emerald-400"
          >
            Go to Dashboard
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center font-bold text-white hover:border-emerald-400"
          >
            Back Home
          </Link>
        </div>
      </section>
    </main>
  );
}
