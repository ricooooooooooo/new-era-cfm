export default function QuickActions() {
  const actions = [
    "🏈 View Schedule",
    "🔄 Trade Center",
    "📊 Standings",
    "💰 Salary Cap",
    "📥 League Inbox",
    "🏆 Power Rankings",
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 pb-8">
      <h2 className="mb-4 text-xl font-black uppercase tracking-wide">
        Quick Actions
      </h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action}
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-left text-lg font-bold transition hover:border-red-600 hover:bg-zinc-900"
          >
            {action}
          </button>
        ))}
      </div>
    </section>
  );
}