export default function TradeCenterPage() {
  return (
    <main className="min-h-screen bg-[#070809] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300/70">
            New Era CFM
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Trade Center
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            The Trade Center is currently under construction. League trades,
            approvals, voting, and transaction history will be available here.
          </p>

          <div className="mt-8 rounded-2xl border border-purple-400/20 bg-purple-500/[0.08] p-6">
            <p className="text-sm font-bold text-purple-200">
              Coming soon
            </p>

            <p className="mt-2 text-sm text-zinc-400">
              Submit trades, review pending deals, and track completed
              transactions.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}