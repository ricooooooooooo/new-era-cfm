import Link from "next/link";
import PlayerHeadshot from "@/app/components/players/PlayerHeadshot";
import type { CurrentMaddenPlayer } from "@/lib/madden/types";

type MaddenRosterTableProps = {
  players: CurrentMaddenPlayer[];
  compact?: boolean;
};

function traitClasses(trait: string | null) {
  const value = trait?.toLowerCase() ?? "";

  if (
    value.includes("x-factor") ||
    value.includes("x factor")
  ) {
    return "border-red-400/25 bg-red-400/10 text-red-200";
  }

  if (value.includes("superstar")) {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  if (value === "star") {
    return "border-purple-300/25 bg-purple-300/10 text-purple-200";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-500";
}

const gridColumns =
  "grid-cols-[minmax(280px,1.65fr)_72px_58px_76px_minmax(150px,1fr)_125px_90px_38px]";

export default function MaddenRosterTable({
  players,
  compact = false,
}: MaddenRosterTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="overflow-x-auto">
        <div className="min-w-[1020px]">
          <div
            className={`grid ${gridColumns} items-center border-b border-white/10 bg-black/45 text-xs font-black uppercase tracking-[0.16em] text-zinc-500`}
          >
            <div className="px-4 py-3">Player</div>
            <div className="px-4 py-3">Pos</div>
            <div className="px-4 py-3">#</div>
            <div className="px-4 py-3">OVR</div>
            <div className="px-4 py-3">Archetype</div>
            <div className="px-4 py-3">Dev</div>
            <div className="px-4 py-3">Source</div>
            <div aria-hidden="true" />
          </div>

          <div>
            {players.map((player) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className={`group grid ${gridColumns} items-center border-b border-white/[0.07] bg-white/[0.02] transition last:border-b-0 hover:bg-white/[0.065] focus-visible:bg-white/[0.065] focus-visible:outline-none`}
              >
                <div className="flex min-w-0 items-center gap-3 px-4 py-3">
                  <PlayerHeadshot
                    name={player.name}
                    src={player.headshotUrl}
                  />

                  <div className="min-w-0">
                    <p className="truncate font-black text-white transition group-hover:text-purple-200">
                      {player.name}
                    </p>

                    {!compact && (
                      <p className="mt-1 truncate text-xs text-zinc-600">
                        {player.teamName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3.5 font-black text-zinc-300">
                  {player.position ?? "—"}
                </div>

                <div className="px-4 py-3.5 text-zinc-400">
                  {player.jerseyNumber ?? "—"}
                </div>

                <div className="px-4 py-3.5">
                  <span className="inline-flex min-w-11 items-center justify-center rounded-lg border border-white/10 bg-black/35 px-2.5 py-1.5 text-lg font-black">
                    {player.overall ?? "—"}
                  </span>
                </div>

                <div className="truncate px-4 py-3.5 text-sm text-zinc-400">
                  {player.archetype ?? "—"}
                </div>

                <div className="px-4 py-3.5">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${traitClasses(player.devTrait)}`}
                  >
                    {player.devTrait ?? "Normal"}
                  </span>
                </div>

                <div className="px-4 py-3.5 text-xs font-bold uppercase tracking-[0.1em] text-zinc-500">
                  {player.hasFranchiseData
                    ? "EA"
                    : "Baseline"}
                </div>

                <div className="pr-4 text-xl text-zinc-700 transition group-hover:translate-x-1 group-hover:text-purple-200">
                  ›
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
