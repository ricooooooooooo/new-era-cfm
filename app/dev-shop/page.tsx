import AppLayout from "@/app/components/layout/AppLayout";

export default function DevShopPage() {
  return (
    <AppLayout>
      <main className="min-h-screen bg-[#070706] px-4 py-8 text-white sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <section className="overflow-hidden rounded-[2rem] border border-[#d7b35a]/25 bg-[radial-gradient(circle_at_top_left,rgba(215,179,90,.16),transparent_24rem),linear-gradient(135deg,#15130e,#080807)] p-7 shadow-[0_30px_90px_rgba(0,0,0,.45)] sm:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">Player Development</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">Dev Shop</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
              The Gold Jacket shop is being rebuilt around clear football development programs instead of a wall of random upgrades.
            </p>
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-3">
            {["Attribute Programs", "Breakout Programs", "Gold Jacket Development"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-sm font-black">{item}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-600">Coming online when the new shop rules and prices are locked.</p>
              </div>
            ))}
          </section>
        </div>
      </main>
    </AppLayout>
  );
}
