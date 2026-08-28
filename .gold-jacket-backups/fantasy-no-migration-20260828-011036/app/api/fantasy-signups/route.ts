import { NextRequest, NextResponse } from "next/server";
import { sendFantasySignupNotification } from "@/lib/discord/fantasy-signups";
import {
  validateFantasySignup,
  type FantasySignupInput,
} from "@/lib/fantasy-signup-validation";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CAPACITY = 10;

type FantasySignupRow = {
  id: string;
  spot_number: number;
  discord_username: string;
  sleeper_username: string;
  team_name: string | null;
  status: "accepted" | "withdrawn";
  created_at: string;
};

function publicSignup(row: FantasySignupRow) {
  return {
    spotNumber: row.spot_number,
    discordUsername: row.discord_username,
    sleeperUsername: row.sleeper_username,
    teamName: row.team_name,
    createdAt: row.created_at,
  };
}

async function getAcceptedSignups(): Promise<FantasySignupRow[]> {
  const { data, error } = await supabaseAdmin
    .from("gold_jacket_fantasy_signups")
    .select(
      "id, spot_number, discord_username, sleeper_username, team_name, status, created_at",
    )
    .eq("status", "accepted")
    .order("spot_number", { ascending: true });

  if (error) {
    console.error("Fantasy signup list error:", error);
    throw new Error("Unable to load fantasy signups.");
  }

  return (data ?? []) as FantasySignupRow[];
}

export async function GET() {
  try {
    const rows = await getAcceptedSignups();

    return NextResponse.json(
      {
        count: rows.length,
        capacity: CAPACITY,
        full: rows.length >= CAPACITY,
        signups: rows.map(publicSignup),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to load fantasy signups." },
      { status: 500 },
    );
  }
}

function mapClaimError(message: string) {
  if (message.includes("FANTASY_FULL")) {
    return {
      status: 409,
      body: { code: "FULL", error: "Gold Jacket Fantasy is full." },
    };
  }

  if (message.includes("FANTASY_DUPLICATE_DISCORD")) {
    return {
      status: 409,
      body: {
        code: "DUPLICATE_DISCORD",
        error: "That Discord username already has a fantasy spot.",
      },
    };
  }

  if (message.includes("FANTASY_DUPLICATE_SLEEPER")) {
    return {
      status: 409,
      body: {
        code: "DUPLICATE_SLEEPER",
        error: "That Sleeper username already has a fantasy spot.",
      },
    };
  }

  if (message.includes("FANTASY_INVALID_")) {
    return {
      status: 400,
      body: { code: "INVALID", error: "Check your signup information." },
    };
  }

  return {
    status: 500,
    body: { code: "UNKNOWN", error: "Unable to claim a fantasy spot." },
  };
}

export async function POST(request: NextRequest) {
  let rawInput: FantasySignupInput;

  try {
    rawInput = (await request.json()) as FantasySignupInput;
  } catch {
    return NextResponse.json(
      { error: "Invalid signup request." },
      { status: 400 },
    );
  }

  const validation = validateFantasySignup(rawInput);

  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 },
    );
  }

  const input = validation.data;

  const { data, error } = await supabaseAdmin.rpc(
    "claim_gold_jacket_fantasy_spot",
    {
      p_discord_username: input.discordUsername,
      p_sleeper_username: input.sleeperUsername,
      p_team_name: input.teamName || null,
    },
  );

  if (error) {
    console.error("Fantasy spot claim error:", error);
    const mapped = mapClaimError(error.message ?? "");
    return NextResponse.json(mapped.body, { status: mapped.status });
  }

  const claimed = (Array.isArray(data) ? data[0] : data) as
    | FantasySignupRow
    | null;

  if (!claimed) {
    return NextResponse.json(
      { error: "Unable to claim a fantasy spot." },
      { status: 500 },
    );
  }

  let totalFilled = claimed.spot_number;

  try {
    const rows = await getAcceptedSignups();
    totalFilled = rows.length;
  } catch (listError) {
    console.error("Fantasy signup post-count error:", listError);
  }
  let discordPosted = false;

  try {
    discordPosted = await sendFantasySignupNotification({
      baseUrl: request.nextUrl.origin,
      spotNumber: claimed.spot_number,
      totalFilled,
      discordUsername: claimed.discord_username,
      sleeperUsername: claimed.sleeper_username,
      teamName: claimed.team_name,
    });
  } catch (notificationError) {
    console.error("Fantasy signup Discord notification error:", notificationError);
  }

  return NextResponse.json(
    {
      signup: publicSignup(claimed),
      count: totalFilled,
      capacity: CAPACITY,
      full: totalFilled >= CAPACITY,
      discordPosted,
    },
    { status: 201 },
  );
}
