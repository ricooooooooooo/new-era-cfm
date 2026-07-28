import Image from "next/image";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Trade = {
  id: string;
  team_one: string;
  team_one_sends: string;
  team_two: string;
  team_two_sends: string;
  report_text: string | null;
  graphic_url: string | null;
  approved_at: string | null;
  created_at: string;
};

function formatDate(value: string | null, fallback: string) {
  const date = new Date(value || fallback);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
  }).format(date);
}

function getGraphicUrl(trade: Trade) {
  return trade.graphic_url || `/api/trades/${trade.id}/image`;
}

export default async function TradeCenterPage() {
  const { data, error } = await supabaseAdmin
    .from("trades")
    .select(
      "id, team_one, team_one_sends, team_two, team_two_sends, report_text, graphic_url, approved_at, created_at",
    )
    .eq("status", "approved")
    .order("approved_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const trades = (data || []) as Trade[];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050307] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-8rem] h-96 w-96 rounded-full bg-purple-700/20 blur-3xl" />
        <div className="absolute right-[-10rem] top-40 h-[30rem] w-[30rem] rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.018)_48%,transparent_50%)] bg-[length:220px_220px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-2xl backdrop-blur-xl">
          <div className="h-1.5 bg-gradient-to-r from-purple-700 via-purple-400 to-amber-300" />

          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-purple-300">
                NEW ERA INSIDER
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                Trade Center
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Every league-approved transaction, published automatically
                after the trade committee clears the deal.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="rounded-2xl border border-purple-400/20 bg-purple-400/[0.07] px-5 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">
                  Official Trades
                </p>
                <p className="mt-1 text-2xl font-black">{trades.length}</p>
              </div>

              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-5 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
                  Status
                </p>
                <p className="mt-1 text-sm font-black text-emerald-300">
                  LIVE
                </p>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <section className="mt-6 rounded-3xl border border-red-400/20 bg-red-500/[0.06] p-6">
            <p className="font-black text-red-200">
              The Trade Center could not load.
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Check the server logs for the Supabase error.
            </p>
          </section>
        ) : trades.length === 0 ? (
          <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.025] p-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-purple-400/20 bg-purple-400/[0.08]">
              <Image
                src="/ne-icon.png"
                alt="NEW ERA"
                width={52}
                height={52}
                className="h-13 w-13 object-contain"
              />
            </div>

            <h2 className="mt-5 text-2xl font-black">No official trades yet</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-500">
              Approved trades will automatically appear here after the Google
              Form submission posts to Discord.
            </p>
          </section>
        ) : (
          <div className="mx-auto mt-6 max-w-3xl space-y-6">
            {trades.map((trade) => (
              <article
                key={trade.id}
                className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b0a0e]/95 shadow-2xl"
              >
                <header className="flex items-center gap-3 px-5 py-4 sm:px-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-purple-400/30 bg-purple-500/10">
                    <Image
                      src="/ne-icon.png"
                      alt="NEW ERA Insider"
                      width={42}
                      height={42}
                      className="h-10 w-10 object-contain"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <p className="font-black">NEW ERA Insider</p>
                      <span className="text-purple-300">✓</span>
                      <p className="truncate text-sm text-zinc-500">
                        @NewEraSchefter
                      </p>
                    </div>

                    <p className="mt-0.5 text-xs text-zinc-600">
                      {formatDate(trade.approved_at, trade.created_at)}
                    </p>
                  </div>

                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                    Official
                  </div>
                </header>

                <div className="px-5 pb-4 sm:px-6">
                  <p className="whitespace-pre-line text-[15px] leading-6 text-zinc-200">
                    {trade.report_text ||
                      `BREAKING: The ${trade.team_one} and ${trade.team_two} have agreed to an official trade.`}
                  </p>
                </div>

                <div className="border-y border-white/10 bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getGraphicUrl(trade)}
                    alt={`${trade.team_one} and ${trade.team_two} trade graphic`}
                    className="aspect-[16/9] w-full object-cover"
                    loading="lazy"
                  />
                </div>

                <div className="grid grid-cols-2 divide-x divide-white/10 border-b border-white/10">
                  <div className="p-4 sm:p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-300">
                      {trade.team_one} receive
                    </p>
                    <p className="mt-2 text-sm font-bold text-white">
                      {trade.team_two_sends}
                    </p>
                  </div>

                  <div className="p-4 sm:p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-200">
                      {trade.team_two} receive
                    </p>
                    <p className="mt-2 text-sm font-bold text-white">
                      {trade.team_one_sends}
                    </p>
                  </div>
                </div>

                <footer className="flex items-center justify-between px-5 py-4 text-xs text-zinc-600 sm:px-6">
                  <span>NEW ERA CFM transaction wire</span>
                  <span>League approved</span>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}