export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold">NEW ERA CFM</h1>

        <p className="mt-2 text-zinc-400">
          Welcome back, Commissioner.
        </p>

        <div className="grid gap-6 mt-10 md:grid-cols-4">
          <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
            <p className="text-zinc-500 text-sm">League Members</p>
            <h2 className="text-3xl font-bold mt-2">32</h2>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
            <p className="text-zinc-500 text-sm">Current Week</p>
            <h2 className="text-3xl font-bold mt-2">Week 8</h2>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
            <p className="text-zinc-500 text-sm">Games Played</p>
            <h2 className="text-3xl font-bold mt-2">11 / 16</h2>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
            <p className="text-zinc-500 text-sm">Season</p>
            <h2 className="text-3xl font-bold mt-2">2028</h2>
          </div>
        </div>
      </div>
    </main>
  );
}