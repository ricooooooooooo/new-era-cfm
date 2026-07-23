export default function StaffApplicationPage() {
  const positions = [
    {
      title: "Head Commissioner",
      description:
        "Help manage the entire league, owners, rules, scheduling and long-term direction.",
      color: "border-red-500",
    },
    {
      title: "Commissioner",
      description:
        "Assist with advances, owner issues, force wins, and league management.",
      color: "border-blue-500",
    },
    {
      title: "Trade Committee",
      description:
        "Review trades, prevent abuse, and maintain league fairness.",
      color: "border-green-500",
    },
    {
      title: "Moderator",
      description:
        "Keep Discord organized, help members, and enforce server rules.",
      color: "border-yellow-500",
    },
    {
      title: "Content Team",
      description:
        "Create power rankings, graphics, weekly recaps and league content.",
      color: "border-purple-500",
    },
  ];

  return (
    <main className="min-h-screen bg-[#080909] text-white">
      <div className="mx-auto max-w-6xl p-8">

        <div className="mb-12 text-center">

          <h1 className="text-5xl font-black">
            Join The Staff Team
          </h1>

          <p className="mt-4 text-lg text-zinc-400">
            Help us build the best Madden franchise community possible.
          </p>

        </div>

        <div className="grid gap-6 md:grid-cols-2">

          {positions.map((position) => (

            <div
              key={position.title}
              className={`rounded-2xl border ${position.color} bg-zinc-900 p-6`}
            >

              <h2 className="text-2xl font-bold">
                {position.title}
              </h2>

              <p className="mt-3 text-zinc-400">
                {position.description}
              </p>

            </div>

          ))}

        </div>

        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">

          <h2 className="mb-6 text-3xl font-black">
            Staff Application
          </h2>

          <div className="space-y-6">

            <div>
              <label className="mb-2 block font-semibold">
                Position
              </label>

              <select className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none focus:border-red-500">

                <option>Head Commissioner</option>
                <option>Commissioner</option>
                <option>Trade Committee</option>
                <option>Moderator</option>
                <option>Content Team</option>

              </select>
            </div>

            <div>

              <label className="mb-2 block font-semibold">
                Why do you want this position?
              </label>

              <textarea
                rows={5}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none focus:border-red-500"
              />

            </div>

            <div>

              <label className="mb-2 block font-semibold">
                Previous Experience
              </label>

              <textarea
                rows={4}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none focus:border-red-500"
              />

            </div>

            <div>

              <label className="mb-2 block font-semibold">
                How active are you each week?
              </label>

              <textarea
                rows={3}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none focus:border-red-500"
              />

            </div>

            <button className="w-full rounded-xl bg-red-600 py-4 text-lg font-bold transition hover:bg-red-500">
              Submit Application
            </button>

          </div>

        </div>

      </div>
    </main>
  );
}