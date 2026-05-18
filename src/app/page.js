import Link from 'next/link';
import { MapPin, ShieldCheck, Radio, Siren } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 md:grid-cols-2">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
            Permission-based GPS tracking
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-6xl">
            SafeTrace GPS Safety Tracking
          </h1>

          <p className="mb-8 max-w-xl text-lg leading-8 text-slate-400">
            Share your live location safely with trusted people. Tracking starts only after your permission.
          </p>

          <Link
            href="/dashboard"
            className="inline-block rounded-xl bg-emerald-500 px-6 py-4 text-center font-bold text-slate-950 hover:bg-emerald-400"
          >
            Start GPS Tracking
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
          <div className="rounded-2xl bg-slate-950 p-5">
            <div className="mb-5 h-64 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-800 to-slate-950 p-5">
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-emerald-500/40 text-center">
                <div>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40">
                    <MapPin className="text-slate-950" />
                  </div>
                  <p className="font-semibold text-white">Live map preview</p>
                  <p className="mt-2 text-sm text-slate-400">GPS marker will appear here</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Status</p>
                <p className="font-bold text-emerald-300">Ready</p>
              </div>

              <div className="rounded-xl bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Permission</p>
                <p className="font-bold text-white">Required</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 md:grid-cols-4">
        <FeatureCard icon={<ShieldCheck />} title="Consent Based" text="Tracking starts only after user permission." />
        <FeatureCard icon={<Radio />} title="Live Share" text="Share location with trusted contacts." />
        <FeatureCard icon={<Siren />} title="SOS Ready" text="Emergency alert system can be added." />
        <FeatureCard icon={<MapPin />} title="GPS Based" text="Detect your own current location." />
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition hover:-translate-y-1 hover:border-emerald-500/50">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
        {icon}
      </div>
      <h3 className="mb-3 text-xl font-bold text-white">{title}</h3>
      <p className="leading-7 text-slate-400">{text}</p>
    </div>
  );
}
