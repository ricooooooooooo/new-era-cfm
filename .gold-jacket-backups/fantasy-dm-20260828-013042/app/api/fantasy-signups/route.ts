import { NextRequest, NextResponse } from "next/server";
import { sendFantasySignupNotification } from "@/lib/discord/fantasy-signups";
import {
  validateFantasySignup,
  type FantasySignupInput,
} from "@/lib/fantasy-signup-validation";
import {
  buildFantasySignupLedger,
  type FantasyLeagueSyncRow,
  type FantasyLedgerSignup,
} from "@/lib/fantasy-signup-ledger";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CAPACITY = 10;
const SOURCE = "gold-jacket-fantasy";
const EXPORT_TYPE = "fantasy_signup";

function publicSignup(signup: FantasyLedgerSignup) {
  return {
    spotNumber: signup.spotNumber,
    discordUsername: signup.discordUsername,
    sleeperUsername: signup.sleeperUsername,
    teamName: signup.teamName,
    createdAt: signup.createdAt,
  };
}

async function getRawFantasyRows(): Promise<FantasyLeagueSyncRow[]> {
  const { data, error } = await supabaseAdmin
    .from("league_syncs")
    .select("id,payload,received_at")
    .eq("source", SOURCE)
    .eq("export_type", EXPORT_TYPE)
    .eq("status", "completed")
    .order("received_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(100);

  if (error) {
    console.error("Fantasy signup storage read error:", error);
    throw new Error("Unable to load fantasy signups.");
  }

  return (data ?? []) as FantasyLeagueSyncRow[];
}

async function getFantasyLedger() {
  return buildFantasySignupLedger(await getRawFantasyRows(), CAPACITY);
}

async function removeInsertedRow(id: string) {
  const { error } = await supabaseAdmin
    .from("league_syncs")
    .delete()
    .eq("id", id)
    .eq("source", SOURCE)
    .eq("export_type", EXPORT_TYPE);

  if (error) {
    console.error("Unable to clean rejected fantasy signup row:", error);
  }
}

function duplicateResponse(type: "discord" | "sleeper") {
  if (type === "discord") {
    return NextResponse.json(
      {
        code: "DUPLICATE_DISCORD",
        error: "That Discord username already has a fantasy spot.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      code: "DUPLICATE_SLEEPER",
      error: "That Sleeper username already has a fantasy spot.",
    },
    { status: 409 },
  );
}

function fullResponse() {
  return NextResponse.json(
    {
      code: "FULL",
      error: "Gold Jacket Fantasy is full.",
    },
    { status: 409 },
  );
}

export async function GET() {
  try {
    const signups = await getFantasyLedger();

    return NextResponse.json(
      {
        count: signups.length,
        capacity: CAPACITY,
        full: signups.length >= CAPACITY,
        signups: signups.map(publicSignup),
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
  const discordKey = input.discordUsername.toLowerCase();
  const sleeperKey = input.sleeperUsername.toLowerCase();

  let before: FantasyLedgerSignup[];

  try {
    before = await getFantasyLedger();
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to check fantasy signup availability." },
      { status: 500 },
    );
  }

  if (
    before.some(
      (signup) => signup.discordUsername.toLowerCase() === discordKey,
    )
  ) {
    return duplicateResponse("discord");
  }

  if (
    before.some(
      (signup) => signup.sleeperUsername.toLowerCase() === sleeperKey,
    )
  ) {
    return duplicateResponse("sleeper");
  }

  if (before.length >= CAPACITY) {
    return fullResponse();
  }

  const payload = {
    kind: "gold_jacket_fantasy_signup",
    discordUsername: input.discordUsername,
    sleeperUsername: input.sleeperUsername,
    teamName: input.teamName || null,
  };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("league_syncs")
    .insert({
      source: SOURCE,
      export_type: EXPORT_TYPE,
      status: "completed",
      payload,
      payload_type: "object",
      top_level_keys: [
        "kind",
        "discordUsername",
        "sleeperUsername",
        "teamName",
      ],
      item_count: 1,
      request_headers: {
        origin: request.headers.get("origin"),
        user_agent: request.headers.get("user-agent"),
      },
    })
    .select("id,payload,received_at")
    .single();

  if (insertError || !inserted) {
    console.error("Fantasy signup storage insert error:", insertError);

    return NextResponse.json(
      { error: "Unable to claim a fantasy spot." },
      { status: 500 },
    );
  }

  let after: FantasyLedgerSignup[];

  try {
    after = await getFantasyLedger();
  } catch (error) {
    console.error(error);
    await removeInsertedRow(inserted.id);

    return NextResponse.json(
      { error: "Unable to verify your fantasy spot." },
      { status: 500 },
    );
  }

  const claimed = after.find((signup) => signup.id === inserted.id);

  if (!claimed) {
    const duplicateDiscord = after.some(
      (signup) => signup.discordUsername.toLowerCase() === discordKey,
    );
    const duplicateSleeper = after.some(
      (signup) => signup.sleeperUsername.toLowerCase() === sleeperKey,
    );

    await removeInsertedRow(inserted.id);

    if (duplicateDiscord) return duplicateResponse("discord");
    if (duplicateSleeper) return duplicateResponse("sleeper");
    if (after.length >= CAPACITY) return fullResponse();

    return NextResponse.json(
      { error: "Unable to claim a fantasy spot." },
      { status: 500 },
    );
  }

  let discordPosted = false;

  try {
    discordPosted = await sendFantasySignupNotification({
      baseUrl: request.nextUrl.origin,
      spotNumber: claimed.spotNumber,
      totalFilled: after.length,
      discordUsername: claimed.discordUsername,
      sleeperUsername: claimed.sleeperUsername,
      teamName: claimed.teamName,
    });
  } catch (notificationError) {
    console.error(
      "Fantasy signup Discord notification error:",
      notificationError,
    );
  }

  return NextResponse.json(
    {
      signup: publicSignup(claimed),
      count: after.length,
      capacity: CAPACITY,
      full: after.length >= CAPACITY,
      discordPosted,
    },
    { status: 201 },
  );
}
