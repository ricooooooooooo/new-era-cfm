export default function CommissionerPage() {
  const overview = [
    {
      title: "League Health",
      value: "98%",
      subtitle: "Excellent",
      color: "text-green-400",
    },
    {
      title: "Open Teams",
      value: "2",
      subtitle: "Available",
      color: "text-blue-400",
    },
    {
      title: "Pending Payments",
      value: "2",
      subtitle: "Needs Review",
      color: "text-yellow-400",
    },
    {
      title: "Staff Applications",
      value: "3",
      subtitle: "Waiting",
      color: "text-purple-400",
    },
    {
      title: "Inactive Owners",
      value: "1",
      subtitle: "Needs Action",
      color: "text-red-400",
    },
    {
      title: "EA Sync",
      value: "Connected",
      subtitle: "Healthy",
      color: "text-green-400",
    },
  ];

  return (
    <main className="min-h-screen bg-[#080909] text-white">
      <div className="mx-auto max-w-7xl p-8">

        {/* Header */}

        <div className="mb-10 flex items-center justify-between">

          <div>
            <h1 className="text-5xl font-black tracking-tight">
              Commissioner Dashboard
            </h1>

            <p className="mt-2 text-zinc-400">
              Manage your league from one place.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3">
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              Next Advance
            </p>

            <h2 className="mt-1 text-2xl font-black text-red-500">
              19h 24m
            </h2>
          </div>

        </div>

        {/* Overview */}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          {overview.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-red-500"
            >
              <p className="text-sm uppercase tracking-widest text-zinc-500">
                {item.title}
              </p>

              <h2 className={`mt-4 text-4xl font-black ${item.color}`}>
                {item.value}
              </h2>

              <p className="mt-2 text-zinc-500">
                {item.subtitle}
              </p>

            </div>
          ))}

        </div>

        {/* Main Grid */}

        <div className="mt-10 grid gap-6 xl:grid-cols-3">

          {/* Quick Actions */}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

            <h2 className="mb-5 text-2xl font-bold">
              Quick Actions
            </h2>

            <div className="space-y-3">

              <button className="w-full rounded-xl bg-red-600 py-3 font-bold transition hover:bg-red-500">
                Advance Week
              </button>

              <button className="w-full rounded-xl bg-zinc-800 py-3 transition hover:bg-zinc-700">
                Start Active Check
              </button>

              <button className="w-full rounded-xl bg-zinc-800 py-3 transition hover:bg-zinc-700">
                Sync Madden Data
              </button>

              <button className="w-full rounded-xl bg-zinc-800 py-3 transition hover:bg-zinc-700">
                View Payments
              </button>

              <button className="w-full rounded-xl bg-zinc-800 py-3 transition hover:bg-zinc-700">
                Review Staff Apps
              </button>

            </div>

          </div>

          {/* Needs Attention */}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 xl:col-span-2">

            <h2 className="mb-5 text-2xl font-bold">
              Needs Attention
            </h2>

            <div className="space-y-4">

              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                🚨 Packers owner has missed the active check.
              </div>

              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                💰 Two payments are waiting for approval.
              </div>

              <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                👑 Three staff applications need review.
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                🏈 Week 4 advances in 19 hours.
              </div>

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}