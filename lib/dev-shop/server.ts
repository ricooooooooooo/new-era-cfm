import type { NextRequest } from "next/server";

import { getCurrentMaddenPlayers } from "@/lib/madden/player-data";
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
  physicalAttributes: AttributeOption[];
  nonPhysicalAttributes: AttributeOption[];
};

const PHYSICAL_ATTRIBUTE_LABELS: Record<string, string> = {
  speed: "Speed",
  acceleration: "Acceleration",
  agility: "Agility",
  strength: "Strength",
  jumping: "Jumping",
  changeofdirection: "Change of Direction",
  stamina: "Stamina",
  injury: "Injury",
  toughness: "Toughness",
  throwpower: "Throw Power",
  kickpower: "Kick Power",
};

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function humanizeAttribute(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function numericAttributes(
  attributes: Record<string, unknown>,
): AttributeOption[] {
  return Object.entries(attributes)
    .map(([key, rawValue]) => {
      const value = Number(rawValue);
      if (!Number.isFinite(value)) return null;
      if (value < 0 || value > 100) return null;

      return {
        key,
        label: humanizeAttribute(key),
        value,
      };
    })
    .filter((entry): entry is AttributeOption => Boolean(entry))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function splitAttributes(attributes: Record<string, unknown>) {
  const all = numericAttributes(attributes);
  const physical: AttributeOption[] = [];
  const nonPhysical: AttributeOption[] = [];

  for (const attribute of all) {
    const normalized = normalizeKey(attribute.key);
    const physicalLabel = PHYSICAL_ATTRIBUTE_LABELS[normalized];

    if (physicalLabel) {
      physical.push({
        ...attribute,
        label: physicalLabel,
      });
    } else {
      nonPhysical.push(attribute);
    }
  }

  return {
    physicalAttributes: physical,
    nonPhysicalAttributes: nonPhysical,
  };
}

export function readDiscordUser(request: NextRequest): SavedDiscordUser | null {
  const encoded = request.cookies.get("new_era_discord_user")?.value;
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

  return players.map((player) => {
    const split = splitAttributes(player.attributes ?? {});

    return {
      id: player.id,
      name: player.name,
      position: player.position,
      overall: player.overall,
      devTrait: player.devTrait,
      headshotUrl: player.headshotUrl,
      teamAbbreviation: player.teamAbbreviation,
      ...split,
    };
  });
}

export function buildAvailabilityByPlayer({
  players,
  orders,
  season,
}: {
  players: StorePlayer[];
  orders: DevShopLedgerOrder[];
  season: number;
}) {
  const activeLines = flattenActiveLines(orders);

  return Object.fromEntries(
    players.map((player) => [
      player.id,
      getAvailability(activeLines, player.id, season),
    ]),
  );
}
