import type { NextRequest } from "next/server";

import { getCurrentMaddenPlayers } from "@/lib/madden/player-data";
import { splitDevShopAttributes } from "@/lib/dev-shop/attributes.mjs";
import {
  choosePrelaunchAttributePreview,
  mergePrelaunchPreview,
  type RatingsMode,
} from "@/lib/dev-shop/prelaunch-ratings.mjs";
import { findTeamBySlug } from "@/lib/nfl-teams";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  buildOrderLedger,
  flattenActiveLines,
  type DevShopLedgerOrder,
  type LedgerRow,
} from "@/lib/dev-shop/ledger.mjs";
import {
  getAvailability,
  type AttributeOption,
} from "@/lib/dev-shop/caps.mjs";

export const DEV_SHOP_SOURCE = "gold-jacket-dev-shop";
export const CASH_APP_URL = "https://cash.app/$ricorips";
export const COMMISSIONER_DISCORD_ID = "854203275150098463";
export const COMMISSIONER_DISCORD_URL =
  `https://discord.com/users/${COMMISSIONER_DISCORD_ID}`;

type SavedDiscordUser = {
  id: string;
  username: string;
  displayName: string;
  avatar?: string | null;
};

export type GoldJacketLeague = {
  id: string;
  name: string | null;
  slug: string | null;
  season: number | null;
  current_week: number | null;
};

export type StorePlayer = {
  id: string;
  name: string;
  position: string | null;
  overall: number | null;
  devTrait: string | null;
  headshotUrl: string | null;
  teamAbbreviation: string | null;
  hasFranchiseData: boolean;
  ratingsMode: RatingsMode;
  ratingsCapturedAt: string | null;
  ratingsPreviewCapturedAt: string | null;
  physicalAttributes: AttributeOption[];
  nonPhysicalAttributes: AttributeOption[];
};

export function readDiscordUser(request: NextRequest): SavedDiscordUser | null {
  const encoded = request.cookies.get("gold_jacket_discord_user")?.value;
  if (!encoded) return null;

  try {
    const user = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SavedDiscordUser;

    if (!user?.id || !user?.username || !user?.displayName) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function loadGoldJacketLeague(): Promise<GoldJacketLeague | null> {
  const { data, error } = await supabaseAdmin
    .from("leagues")
    .select("id,name,slug,season,current_week")
    .limit(100);

  if (error) throw error;

  return (
    ((data ?? []) as GoldJacketLeague[]).find((league) => {
      const slug = league.slug?.trim().toLowerCase() ?? "";
      const name = league.name?.trim().toLowerCase() ?? "";
      return slug === "gold-jacket-cfm" || name.includes("gold jacket");
    }) ?? null
  );
}

export async function loadMemberTeam(discordId: string) {
  const { data, error } = await supabaseAdmin
    .from("members")
    .select("team,discord_username,display_name,role")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (error) throw error;

  const teamSlug =
    typeof data?.team === "string" && data.team.trim()
      ? data.team.trim()
      : null;
  const nflTeam = findTeamBySlug(teamSlug);

  return {
    raw: data,
    teamSlug,
    team: nflTeam
      ? {
          slug: nflTeam.slug,
          city: nflTeam.city,
          name: nflTeam.name,
          fullName: `${nflTeam.city} ${nflTeam.name}`,
          abbreviation: nflTeam.abbreviation,
        }
      : null,
  };
}

export async function loadDevShopRows(): Promise<LedgerRow[]> {
  const rows: LedgerRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("league_syncs")
      .select("id,export_type,payload,received_at")
      .eq("source", DEV_SHOP_SOURCE)
      .in("export_type", ["dev_shop_order", "dev_shop_order_void"])
      .order("received_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const page = (data ?? []) as LedgerRow[];
    rows.push(...page);

    if (page.length < pageSize) break;
  }

  return rows;
}

export async function loadDevShopLedger(): Promise<DevShopLedgerOrder[]> {
  return buildOrderLedger(await loadDevShopRows());
}


type LegacyEaPreviewRow = {
  player_id: string;
  attributes: Record<string, unknown> | null;
  captured_at: string | null;
};

async function loadLegacyEaAttributePreviews(playerIds: string[]) {
  if (playerIds.length === 0) return new Map();

  const rows: LegacyEaPreviewRow[] = [];
  const chunkSize = 200;

  for (let index = 0; index < playerIds.length; index += chunkSize) {
    const chunk = playerIds.slice(index, index + chunkSize);

    const { data, error } = await supabaseAdmin
      .from("madden_player_snapshots")
      .select("player_id,attributes,captured_at")
      .eq("source", "ea_franchise")
      .in("player_id", chunk)
      .order("captured_at", { ascending: false })
      .limit(5000);

    if (error) throw error;
    rows.push(...((data ?? []) as LegacyEaPreviewRow[]));
  }

  return choosePrelaunchAttributePreview(rows);
}


export async function loadTeamPlayers({
  leagueId,
  teamAbbreviation,
}: {
  leagueId: string | null;
  teamAbbreviation: string;
}): Promise<StorePlayer[]> {
  const players = await getCurrentMaddenPlayers({
    leagueId,
    teamAbbreviation,
    limit: 100,
  });

  const hasGoldJacketFranchiseData = players.some(
    (player) => player.hasFranchiseData,
  );

  const previewByPlayer = hasGoldJacketFranchiseData
    ? new Map()
    : await loadLegacyEaAttributePreviews(players.map((player) => player.id));

  return players.map((player) => {
    const resolved = mergePrelaunchPreview(
      player,
      previewByPlayer.get(player.id) ?? null,
    );
    const split = splitDevShopAttributes(resolved.attributes ?? {});

    return {
      id: resolved.id,
      name: resolved.name,
      position: resolved.position,
      overall: resolved.overall,
      devTrait: resolved.devTrait,
      headshotUrl: resolved.headshotUrl,
      teamAbbreviation: resolved.teamAbbreviation,
      hasFranchiseData: resolved.hasFranchiseData,
      ratingsMode: resolved.ratingsMode,
      ratingsCapturedAt: resolved.hasFranchiseData
        ? resolved.capturedAt
        : resolved.ratingsPreviewCapturedAt ?? resolved.capturedAt,
      ratingsPreviewCapturedAt: resolved.ratingsPreviewCapturedAt,
      ...split,
    };
  });
}

export function buildAvailabilityByPlayer({
  players,
  orders,
  season,
  discordId,
  teamSlug,
}: {
  players: StorePlayer[];
  orders: DevShopLedgerOrder[];
  season: number;
  discordId: string;
  teamSlug: string | null;
}) {
  const activeLines = flattenActiveLines(orders);

  return Object.fromEntries(
    players.map((player) => [
      player.id,
      getAvailability(activeLines, player.id, season, {
        discordId,
        teamSlug: teamSlug ?? "",
      }),
    ]),
  );
}
