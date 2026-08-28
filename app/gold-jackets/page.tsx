import Image from "next/image";

import AppLayout from "@/app/components/layout/AppLayout";

export default function GoldJacketsPage() {
  return (
    <AppLayout>
      <main className="min-h-screen bg-[#070706] px-4 py-8 text-white sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <section className="relative overflow-hidden rounded-[2rem] border border-[#d7b35a]/25 bg-[radial-gradient(circle_at_85%_10%,rgba(244,215,132,.18),transparent_22rem),linear-gradient(135deg,#17140d,#090908_70%)] p-7 shadow-[0_30px_90px_rgba(0,0,0,.45)] sm:p-10">
            <div className="pointer-events-none absolute -bottom-16 -right-10 h-72 w-72 opacity-20 sm:h-96 sm:w-96">
              <Image src="/gold-jacket-mark.png" alt="" fill sizes="384px" className="object-contain" />
            </div>

            <div className="relative max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">Signature Feature</p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">Gold Jackets</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
                Every franchise brings back one Hall of Famer at age 20, 70 OVR and Superstar development. Build him from the beginning and see what his second career becomes.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {["32 Franchise Legends", "70 OVR", "Age 20", "Superstar Dev"].map((item) => (
                  <span key={item} className="rounded-full border border-[#d7b35a]/20 bg-[#d7b35a]/[0.07] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#ead89e]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9b8248]">The Class</p>
            <h2 className="mt-2 text-2xl font-black">Selections coming next.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              Once the 32 franchise legends are locked, this becomes the live class board with OVR, position, dev trait, season stats, awards and career progression.
            </p>
          </section>
        </div>
      </main>
    </AppLayout>
  );
}
