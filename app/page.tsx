import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./components/Dashboard";
import QuickActions from "./components/QuickActions";

export default function Home() {
  return (
    <AppLayout>
      <Dashboard />

      <QuickActions />

      <section className="mx-auto max-w-7xl px-6 pb-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-500">
              League News
            </p>

            <h2 className="mt-3 text-3xl font-black">
              Ravens survive instant classic.
            </h2>

            <p className="mt-4 leading-7 text-zinc-400">
              Baltimore defended home field after a late fourth-quarter drive,
              strengthening its hold on the AFC playoff race.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-500">
              Commissioner Memo
            </p>

            <h2 className="mt-3 text-3xl font-black">
              Week 8 Advances Tonight
            </h2>

            <p className="mt-4 leading-7 text-zinc-400">
              Schedule your games before advance. Trade deadline is approaching.
            </p>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}