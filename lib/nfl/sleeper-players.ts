import type { CurrentMaddenPlayer } from "@/lib/madden/types";

type SleeperPlayer = {
  player_id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string | null;
  team?: string | null;
  active?: boolean;
};

const SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl";

function normalizePlayerName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTeam(value: string | null | undefined) {
  const team = value?.trim().toUpperCase() ?? "";

  const aliases: Record<string, string> = {
    LA: "LAR",
    STL: "LAR",
    OAK: "LV",
    SD: "LAC",
    JAC: "JAX",
    WSH: "WAS",
  };

  return aliases[team] ?? team;
}

function normalizePosition(value: string | null | undefined) {
  const position = value?.trim().toUpperCase() ?? "";

  const aliases: Record<string, string> = {
    RB: "HB",
    DE: "EDGE",
    OLB: "EDGE",
    ILB: "LB",
    MLB: "LB",
    NT: "DT",
  };

  if (position === "LEDG" || position === "REDG") return "EDGE";
  if (position === "MIKE" || position === "WILL" || position === "SAM") {
    return "LB";
  }

  return aliases[position] ?? position;
}

async function loadSleeperPlayers(): Promise<SleeperPlayer[]> {
  try {
    const response = await fetch(SLEEPER_PLAYERS_URL, {
      next: { revalidate: 86_400 },
    });

    if (!response.ok) {
      console.error(
        `Sleeper player request failed with status ${response.status}.`,
      );
      return [];
    }

    const payload = (await response.json()) as Record<string, SleeperPlayer>;

    return Object.entries(payload).map(([playerId, player]) => ({
      ...player,
      player_id: player.player_id || playerId,
    }));
  } catch (error) {
    console.error("Unable to load Sleeper NFL players:", error);
    return [];
  }
}

function playerFullName(player: SleeperPlayer) {
  return (
    player.full_name ||
    `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim()
  );
}

function scoreCandidate(
  candidate: SleeperPlayer,
  player: CurrentMaddenPlayer,
) {
  let score = 0;

  const candidateTeam = normalizeTeam(candidate.team);
  const currentTeam = normalizeTeam(player.teamAbbreviation);

  const candidatePosition = normalizePosition(candidate.position);
  const currentPosition = normalizePosition(player.position);

  if (candidate.active) score += 40;
  if (candidateTeam && candidateTeam === currentTeam) score += 100;
  if (candidatePosition && candidatePosition === currentPosition) score += 30;

  return score;
}

export async function attachSleeperHeadshots(
  players: CurrentMaddenPlayer[],
): Promise<CurrentMaddenPlayer[]> {
  if (players.length === 0) return players;

  const sleeperPlayers = await loadSleeperPlayers();
  if (sleeperPlayers.length === 0) return players;

  const playersByName = new Map<string, SleeperPlayer[]>();

  for (const sleeperPlayer of sleeperPlayers) {
    const name = normalizePlayerName(playerFullName(sleeperPlayer));
    if (!name) continue;

    const group = playersByName.get(name) ?? [];
    group.push(sleeperPlayer);
    playersByName.set(name, group);
  }

  return players.map((player) => {
    const candidates =
      playersByName.get(normalizePlayerName(player.name)) ?? [];

    const selected = [...candidates].sort(
      (a, b) => scoreCandidate(b, player) - scoreCandidate(a, player),
    )[0];

    const sleeperPlayerId = selected?.player_id ?? null;

    return {
      ...player,
      sleeperPlayerId,
      headshotUrl: sleeperPlayerId
        ? `https://sleepercdn.com/content/nfl/players/${sleeperPlayerId}.jpg`
        : null,
    };
  });
}
