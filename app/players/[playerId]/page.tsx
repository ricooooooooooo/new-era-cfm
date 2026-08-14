import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AppLayout from "@/app/components/layout/AppLayout";
import PlayerHeadshot from "@/app/components/players/PlayerHeadshot";
import { getCurrentMaddenPlayerById } from "@/lib/madden/player-data";
import { NFL_TEAMS } from "@/lib/nfl-teams";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlayerPageProps = {
  params: Promise<{
    playerId: string;
  }>;
};

async function getNewEraLeagueId(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("leagues")
    .select("id")
    .eq("slug", "new-era-cfm")
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load New Era league ID for player profile:",
      error,
    );
    return null;
  }

  return data?.id ?? null;
}

function numberAttribute(
  attributes: Record<string, unknown>,
  key: string,
) {
  const value = attributes[key];
  return typeof value === "number" ? value : null;
}

function sourceLabel(source: string | null) {
  if (source === "ea_franchise") return "EA Franchise";
  if (source === "manual") return "Commissioner Override";
  return "M27 Launch Baseline";
}

function traitClasses(trait: string | null) {
  const value = trait?.toLowerCase() ?? "";

  if (
    value.includes("x-factor") ||
    value.includes("x factor")
  ) {
    return "border-red-400/30 bg-red-400/10 text-red-100";
  }

  if (value.includes("superstar")) {
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  }

  if (value === "star") {
    return "border-purple-300/30 bg-purple-300/10 text-purple-100";
  }

  return "border-white/10 bg-white/[0.05] text-zinc-400";
}

export default async function PlayerPage({
  params,
}: PlayerPageProps) {
  const { playerId } = await params;
  const leagueId = await getNewEraLeagueId();
  const player = await getCurrentMaddenPlayerById(
    playerId,
    leagueId,
  );

  if (!player) notFound();

  const team =
    NFL_TEAMS.find(
      (entry) =>
        entry.abbreviation.toUpperCase() ===
        player.teamAbbreviation?.toUpperCase(),
    ) ?? null;

  const primary = team?.primary ?? "#6d28d9";
  const secondary = team?.secondary ?? "#d4af37";

  const teamLogo = player.teamAbbreviation
    ? `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${player.teamAbbreviation}`
    : null;

  const generalRating = numberAttribute(
    player.attributes,
    "generalRating",
  );
  const totalRating = numberAttribute(
    player.attributes,
    "totalRating",
  );

  const hiddenAttributeKeys = new Set([
  "generalRating",
  "totalRating",
  "playerBestOvr",
  "playerSchemeOvr",
]);

const ratingEntries = Object.entries(player.attributes)
  .filter(
    ([key, value]) =>
      typeof value === "number" &&
      !hiddenAttributeKeys.has(key),
  )
  .map(([key, value]) => ({
    key,
    label: key
      .replace(/Rating$/, "")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (letter) => letter.toUpperCase())
      .trim(),
    value: value as number,
  }))
  .sort((a, b) => b.value - a.value);

const rosterHref = team
    ? `/teams/${team.slug}/roster`
    : "/teams";

  return (
    <AppLayout>
      <main className="min-h-[calc(100vh-8rem)] bg-[#050606] text-white">
        <section className="relative overflow-hidden border-b border-white/10 bg-black">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background: `
                radial-gradient(circle at 16% 20%, ${primary}88, transparent 34rem),
                radial-gradient(circle at 88% 12%, ${secondary}55, transparent 30rem)
              `,
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/15 to-[#050606]" />

          <div className="relative mx-auto max-w-7xl px-6 pb-12 pt-8 sm:px-8 sm:pb-16">
            <Link
              href={rosterHref}
              className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 transition hover:text-white"
            >
              ← Back to {team?.name ?? "Roster"}
            </Link>

            <div className="mt-8 grid gap-8 lg:grid-cols-[auto_1fr_auto] lg:items-end">
              <PlayerHeadshot
                name={player.name}
                src={player.headshotUrl}
                primary={primary}
                secondary={secondary}
                size="large"
              />

              <div>
                <p
                  className="text-xs font-black uppercase tracking-[0.3em]"
                  style={{ color: secondary }}
                >
                  New Era Player Profile
                </p>

                <h1 className="mt-3 text-5xl font-black tracking-[-0.065em] sm:text-7xl">
                  {player.name}
                </h1>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-zinc-200">
                    {player.position ?? "NFL"}
                  </span>

                  <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-zinc-200">
                    #{player.jerseyNumber ?? "—"}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] ${traitClasses(player.devTrait)}`}
                  >
                    {player.devTrait ?? "Normal"}
                  </span>

                  <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                    {sourceLabel(player.source)}
                  </span>
                </div>

                <p className="mt-5 text-lg font-bold text-zinc-300">
                  {player.teamName ?? "NFL Free Agent"}
                </p>
              </div>

              <div className="flex items-end gap-5 lg:flex-col lg:items-center">
                {teamLogo && (
                  <div className="relative h-24 w-24 overflow-hidden rounded-3xl border border-white/15 bg-black/35 p-4 backdrop-blur-md">
                    <Image
                      src={teamLogo}
                      alt={player.teamName ?? "Team"}
                      fill
                      unoptimized
                      className="object-contain p-3"
                    />
                  </div>
                )}

                <div className="rounded-3xl border border-white/15 bg-black/45 px-7 py-5 text-center backdrop-blur-md">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
                    Overall
                  </p>
                  <p className="mt-1 text-6xl font-black tracking-[-0.08em]">
                    {player.overall ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["OVR", player.overall ?? "—"],
              ["General", generalRating ?? "—"],
              [
                "Total Attributes",
                totalRating?.toLocaleString("en-US") ?? "—",
              ],
              ["Archetype", player.archetype ?? "—"],
            ].map(([label, value]) => (
              <article
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">
                  {label}
                </p>
                <p className="mt-3 text-2xl font-black">
                  {value}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-purple-300">
            Madden Ratings
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
            Player Attributes
          </h2>

          {ratingEntries.length > 0 ? (
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {ratingEntries.map((rating) => (
                <div
                  key={rating.key}
                  className="rounded-2xl border border-white/[0.08] bg-black/25 p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600">
                    {rating.label}
                  </p>

                  <p className="mt-2 text-2xl font-black text-white">
                    {rating.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-zinc-500">
              Full ratings will populate after the live franchise roster sync.
            </p>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-purple-300">
                Franchise Data
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
                Player Overview
              </h2>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  ["Team", player.teamName ?? "Free Agent"],
                  ["Position", player.position ?? "—"],
                  ["Jersey", `#${player.jerseyNumber ?? "—"}`],
                  ["Archetype", player.archetype ?? "—"],
                  ["Development", player.devTrait ?? "Normal"],
                  ["Game Version", player.gameVersion ?? "Madden NFL 27"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                      {label}
                    </p>
                    <p className="mt-2 font-black text-zinc-200">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <aside className="rounded-3xl border border-purple-400/20 bg-purple-400/[0.055] p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-purple-200">
                Automatic EA Upgrade
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.035em]">
                Ready for league sync
              </h2>
              <p className="mt-4 text-sm leading-7 text-zinc-400">
                This profile already uses the permanent Madden data layer.
                Completed-game stats, progression, regression, roster moves,
                contracts and updated ratings will automatically replace the
                launch baseline when the New Era EA franchise connection is
                activated.
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                  Current Source
                </p>
                <p className="mt-2 font-black text-white">
                  {sourceLabel(player.source)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {player.hasFranchiseData
                    ? "Live New Era franchise values are active."
                    : "EA values will override this automatically."}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
