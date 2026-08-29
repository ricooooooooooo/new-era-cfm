
const PREFIX =
  "gold_jacket_creator_claim:";

const SAFE_ID =
  /^[A-Za-z0-9_-]{1,70}$/;

export function makeGoldJacketCreatorClaimCustomId(
  claimId,
) {
  const clean =
    typeof claimId === "string"
      ? claimId.trim()
      : "";

  if (!SAFE_ID.test(clean)) {
    throw new Error(
      "Invalid Gold Jacket claim ID.",
    );
  }

  return `${PREFIX}${clean}`;
}

export function parseGoldJacketCreatorClaimId(
  customId,
) {
  if (
    typeof customId !== "string" ||
    !customId.startsWith(PREFIX)
  ) {
    return null;
  }

  const claimId =
    customId.slice(PREFIX.length);

  return SAFE_ID.test(claimId)
    ? claimId
    : null;
}

function safeName(value) {
  const name =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!name) {
    return "Mish";
  }

  return name.length > 55
    ? `${name.slice(0, 52)}...`
    : name;
}

export function buildGoldJacketCreatorClaimComponents(
  claimId,
  claimedBy = null,
) {
  const claimed =
    typeof claimedBy === "string" &&
    claimedBy.trim().length > 0;

  return [
    {
      type: 1,

      components: [
        {
          type: 2,

          // Discord success button.
          // Green.
          style: 3,

          custom_id:
            makeGoldJacketCreatorClaimCustomId(
              claimId,
            ),

          label: claimed
            ? `✅ Claimed by ${safeName(
                claimedBy,
              )}`
            : "✅ Claim Build",

          disabled: claimed,
        },
      ],
    },
  ];
}
