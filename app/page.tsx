import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./components/Dashboard";
import QuickActions from "./components/QuickActions";
import Intro from "./components/Intro/Intro";

export default function Home() {
  return (
    <Intro>
      <AppLayout>
        <Dashboard />

        <QuickActions />

        <section className="mx-auto max-w-7xl px-6 pb-10">
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.065] to-white/[0.02] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.3)] transition duration-300 hover:-translate-y-1 hover:border-white/20">
              <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 bg-[radial-gradient(circle,rgba(255,255,255,0.09),transparent_70%)]" />

              <div className="relative">
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-zinc-400">
                  League News
                </p>

                <h2 className="mt-4 max-w-xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                  Ravens survive instant classic.
                </h2>

                <p className="mt-4 max-w-xl leading-7 text-zinc-400">
                  Baltimore defended home field after a late fourth-quarter drive,
                  strengthening its hold on the AFC playoff race.
                </p>

                <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  <span>New Era Network</span>
                  <span className="h-1 w-1 rotate-45 bg-zinc-600" />
                  <span>Week 7</span>
                </div>
              </div>
            </article>

            <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.065] to-white/[0.02] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.3)] transition duration-300 hover:-translate-y-1 hover:border-white/20">
              <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 bg-[radial-gradient(circle,rgba(255,255,255,0.09),transparent_70%)]" />

              <div className="relative">
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-zinc-400">
                  Commissioner Memo
                </p>

                <h2 className="mt-4 max-w-xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                  Week 8 advances tonight.
                </h2>

                <p className="mt-4 max-w-xl leading-7 text-zinc-400">
                  Schedule your games before advance. The league trade deadline is
                  approaching.
                </p>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                  Advance Notice
                </div>
              </div>
            </article>
          </div>
        </section>
      </AppLayout>
    </Intro>
  );
}