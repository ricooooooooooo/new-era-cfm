import {
  loadEnvFile,
} from "node:process";

loadEnvFile(
  ".env.local"
);

const {
  supabaseAdmin,
} =
  await import(
    "../lib/supabase-admin.ts"
  );

const {
  GOLD_JACKET_PLAYERS,
} =
  await import(
    "../lib/gold-jackets/catalog.ts"
  );

const {
  findTeamBySlug,
} =
  await import(
    "../lib/nfl-teams.ts"
  );

const {
  sendSystemwideGoldJacketCreationCard,
} =
  await import(
    "../lib/gold-jackets/creation-discord.ts"
  );

const LEAGUE_KEY =
  process.env
    .GOLD_JACKET_LEAGUE_KEY ||
  "gold-jacket-cfm";

const {
  data: claims,
  error,
} =
  await supabaseAdmin
    .from(
      "gold_jacket_claims"
    )
    .select(
      "id,team_slug,candidate_key,display_name,discord_id,creator_discord_id,creator_display_name,creation_card_sent_at,creation_completed_at"
    )
    .eq(
      "league_key",
      LEAGUE_KEY
    )
    .is(
      "creation_card_sent_at",
      null
    )
    .order(
      "claimed_at",
      {
        ascending:
          true,
      }
    );

if (
  error
) {
  throw error;
}

console.log("");
console.log(
  `Existing real Gold Jacket claims requiring cards: ${claims?.length ?? 0}`
);

let failures =
  0;

for (
  const claim
  of claims ?? []
) {
  const team =
    findTeamBySlug(
      claim.team_slug
    );

  const candidate =
    GOLD_JACKET_PLAYERS[
      claim.candidate_key
    ];

  if (
    !team ||
    !candidate
  ) {
    failures++;

    console.error(
      `❌ Could not resolve ${claim.team_slug}/${claim.candidate_key}`
    );

    continue;
  }

  const alreadyCreated =
    claim.candidate_key ===
    "derrick-thomas";

  if (
    alreadyCreated &&
    !claim.creation_completed_at
  ) {
    const completed =
      await supabaseAdmin
        .from(
          "gold_jacket_claims"
        )
        .update({
          creation_completed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          claim.id
        );

    if (
      completed.error
    ) {
      throw completed.error;
    }
  }

  const result =
    await sendSystemwideGoldJacketCreationCard({
      origin:
        "https://new-era-cfm.vercel.app",

      claimId:
        claim.id,

      team,
      candidate,

      displayName:
        claim.display_name,

      discordId:
        claim.discord_id,

      alreadyCreated,

      claimedByDiscordId:
        claim.creator_discord_id,

      claimedByDisplayName:
        claim.creator_display_name,
    });

  if (
    !result.sent
  ) {
    failures++;

    console.error(
      `❌ ${team.name} — ${candidate.name}: ${result.error}`
    );

    await supabaseAdmin
      .from(
        "gold_jacket_claims"
      )
      .update({
        creation_card_error:
          result.error.slice(
            0,
            1000
          ),
      })
      .eq(
        "id",
        claim.id
      );

    continue;
  }

  const audit =
    await supabaseAdmin
      .from(
        "gold_jacket_claims"
      )
      .update({
        creation_card_sent_at:
          new Date()
            .toISOString(),

        creation_card_message_id:
          result.messageId,

        creation_card_error:
          null,
      })
      .eq(
        "id",
        claim.id
      );

  if (
    audit.error
  ) {
    throw audit.error;
  }

  console.log(
    `✅ SENT — ${team.name}: ${candidate.name}` +
    (
      alreadyCreated
        ? " — ALREADY CREATED"
        : " — CLAIMABLE"
    )
  );
}

if (
  failures
) {
  throw new Error(
    `${failures} Gold Jacket creation-card backfills failed.`
  );
}

console.log("");
console.log(
  "✅ Existing real claims backfilled."
);
