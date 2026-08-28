import Link from "next/link";
import AppLayout from "@/app/components/layout/AppLayout";

export default function GoldJacketsPage() {
  return (
    <AppLayout>
      <main className="min-h-screen bg-[#050505] px-4 py-8 text-[#f7f2e7] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[2rem] border border-[#d7b56d]/20 bg-[radial-gradient(circle_at_15%_0%,rgba(214,177,90,.15),transparent_28rem),#090909] p-7 sm:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b56d]">
              Gold Jacket CFM
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-6xl">
              Gold Jackets
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              All 32 franchise legends will live here — progression, ratings, stats, awards and career history. The full legend system is the next build.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <span className="rounded-full border border-[#d7b56d]/20 bg-[#d7b56d]/[0.07] px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#e7c87f]">
                70 OVR
              </span>
              <span className="rounded-full border border-[#d7b56d]/20 bg-[#d7b56d]/[0.07] px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#e7c87f]">
                Superstar
              </span>
              <span className="rounded-full border border-[#d7b56d]/20 bg-[#d7b56d]/[0.07] px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#e7c87f]">
                Age 20
              </span>
            </div>
            <Link
              href="/home"
              className="mt-10 inline-flex rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-zinc-300 transition hover:border-[#d7b56d]/25 hover:text-white"
            >
              ← Back Home
            </Link>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
