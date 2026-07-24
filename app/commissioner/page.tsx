import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getStaffRole } from "../lib/staff";

type SavedDiscordUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

async function getCurrentDiscordUser(): Promise<SavedDiscordUser | null> {
  const cookieStore = await cookies();
  const encodedUser = cookieStore.get("new_era_discord_user")?.value;

  if (!encodedUser) {
    return null;
  }

  try {
    const decodedUser = Buffer.from(encodedUser, "base64url").toString("utf8");
    return JSON.parse(decodedUser) as SavedDiscordUser;
  } catch {
    return null;
  }
}

export default async function CommissionerPage() {
  const user = await getCurrentDiscordUser();
  const staffRole = getStaffRole(user?.id);

  if (!user || !staffRole) {
    notFound();
  }

  const overview = [
    {
      title: "League Health",
      value: "98%",
      subtitle: "Excellent",
      valueClass: "text-emerald-400",
    },
    {
      title: "Open Teams",
      value: "2",
      subtitle: "Available",
      valueClass: "text-white",
    },
    {
      title: "Pending Payments",
      value: "2",
      subtitle: "Needs Review",
      valueClass: "text-amber-300",
    },
    {
      title: "Staff Applications",
      value: "3",
      subtitle: "Waiting",
      valueClass: "text-white",
    },
    {
      title: "Inactive Owners",
      value: "1",
      subtitle: "Needs Action",
      valueClass: "text-rose-400",
    },
    {
      title: "EA Sync",
      value: "Connected",
      subtitle: "Healthy",
      valueClass: "text-emerald-400",
    },
  ];

  return (
    <main className="min-h-screen bg-[#080909] text-white">
      <div className="mx-auto max-w-7xl p-6 sm:p-8">
        <header className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {staffRole === "owner" ? "Owner Access" : "Commissioner Access"}
            </div>

            <h1 className="text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              Commissioner Dashboard
            </h1>

            <p className="mt-3 text-zinc-400">
              Welcome back, {user.displayName}. Manage New Era from one place.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Next Advance
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              19h 24m
            </h2>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {overview.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.065] to-white/[0.02] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                {item.title}
              </p>

              <h2 className={`mt-4 text-4xl font-black ${item.valueClass}`}>
                {item.value}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                {item.subtitle}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
            <h2 className="mb-5 text-2xl font-black tracking-[-0.03em]">
              Quick Actions
            </h2>

            <div className="space-y-3">
              <button className="w-full rounded-xl bg-white py-3 font-bold text-black transition hover:bg-zinc-200">
                Advance Week
              </button>

              <button className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 font-semibold text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white">
                Start Active Check
              </button>

              <button className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 font-semibold text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white">
                Sync Madden Data
              </button>

              <button className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 font-semibold text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white">
                View Payments
              </button>

              <button className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 font-semibold text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white">
                Review Staff Apps
              </button>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 xl:col-span-2">
            <h2 className="mb-5 text-2xl font-black tracking-[-0.03em]">
              Needs Attention
            </h2>

            <div className="space-y-3">
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-zinc-200">
                Packers owner has missed the active check.
              </div>

              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-zinc-200">
                Two payments are waiting for approval.
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-zinc-300">
                Three staff applications need review.
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-zinc-300">
                Week 4 advances in 19 hours.
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}