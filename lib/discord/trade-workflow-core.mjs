const TEAM_ALIASES = new Map(
  Object.entries({
    arizonacardinals: "cardinals",
    atlantafalcons: "falcons",
    baltimoreravens: "ravens",
    buffalobills: "bills",
    carolinapanthers: "panthers",
    chicagobears: "bears",
    cincinnatibengals: "bengals",
    clevelandbrowns: "browns",
    dallascowboys: "cowboys",
    denverbroncos: "broncos",
    detroitlions: "lions",
    greenbaypackers: "packers",
    houstontexans: "texans",
    indianapoliscolts: "colts",
    jacksonvillejaguars: "jaguars",
    kansascitychiefs: "chiefs",
    lasvegasraiders: "raiders",
    losangeleschargers: "chargers",
    losangelesrams: "rams",
    miamidolphins: "dolphins",
    minnesotavikings: "vikings",
    newenglandpatriots: "patriots",
    neworleanssaints: "saints",
    newyorkgiants: "giants",
    newyorkjets: "jets",
    philadelphiaeagles: "eagles",
    pittsburghsteelers: "steelers",
    sanfrancisco49ers: "49ers",
    seattleseahawks: "seahawks",
    tampabaybuccaneers: "buccaneers",
    tennesseetitans: "titans",
    washingtoncommanders: "commanders",

    pats: "patriots",
    patriots: "patriots",
    bucs: "buccaneers",
    buccaneers: "buccaneers",
    niners: "49ers",
    sf49ers: "49ers",
    commanders: "commanders",
  }),
);

function compact(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function normalizeTradeTeam(value) {
  const key = compact(value);

  return TEAM_ALIASES.get(key) ?? key;
}

export function normalizeTradeAssets(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .split(
      /\r?\n|,|;|\s+\+\s+|\s+\|\s+|\s+&\s+/,
    )
    .map((piece) =>
      piece.replace(/[^a-z0-9]+/g, ""),
    )
    .filter(Boolean)
    .sort()
    .join("|");
}

export function decisionFromVotes(votes) {
  let approvals = 0;
  let denials = 0;

  /*
   * Votes arrive oldest -> newest.
   * Whichever written-rule threshold is reached first wins.
   */
  for (const vote of votes ?? []) {
    if (vote?.vote === "approve") {
      approvals += 1;
    }

    if (vote?.vote === "deny") {
      denials += 1;
    }

    if (approvals >= 3) {
      return "approved";
    }

    if (denials >= 2) {
      return "rejected";
    }
  }

  return "pending";
}

export function formSubmissionMatchesTrade(
  form,
  trade,
) {
  const formOne =
    normalizeTradeTeam(form?.team_one);

  const formTwo =
    normalizeTradeTeam(form?.team_two);

  const formOneSends =
    normalizeTradeAssets(
      form?.team_one_sends,
    );

  const formTwoSends =
    normalizeTradeAssets(
      form?.team_two_sends,
    );

  const tradeOne =
    normalizeTradeTeam(trade?.team_one);

  const tradeTwo =
    normalizeTradeTeam(trade?.team_two);

  const tradeOneSends =
    normalizeTradeAssets(
      trade?.team_one_sends,
    );

  const tradeTwoSends =
    normalizeTradeAssets(
      trade?.team_two_sends,
    );

  const direct =
    formOne === tradeOne &&
    formTwo === tradeTwo &&
    formOneSends === tradeOneSends &&
    formTwoSends === tradeTwoSends;

  const reversed =
    formOne === tradeTwo &&
    formTwo === tradeOne &&
    formOneSends === tradeTwoSends &&
    formTwoSends === tradeOneSends;

  return direct || reversed;
}

export function canPublishTrade(trade) {
  return Boolean(
    trade &&
      trade.status === "approved" &&
      trade.committee_approved_at &&
      !trade.discord_message_id
  );
}

export function tradeSummaryLabel(trade) {
  const one =
    String(
      trade?.team_one ?? "",
    ).trim();

  const two =
    String(
      trade?.team_two ?? "",
    ).trim();

  return `${one} ↔ ${two}`;
}

export function voteMutation(
  existing,
  requestedVote,
) {
  if (
    requestedVote !== "approve" &&
    requestedVote !== "deny"
  ) {
    return "invalid";
  }

  if (!existing) {
    return "insert";
  }

  if (
    existing.vote ===
    requestedVote
  ) {
    return "same";
  }

  if (
    Number(
      existing.change_count ?? 0,
    ) >= 1
  ) {
    return "locked";
  }

  return "change";
}

export function tradeMishMentionMode({
  roleMentionable,
  botCanMentionAllRoles,
}) {
  if (
    roleMentionable ||
    botCanMentionAllRoles
  ) {
    return "direct";
  }

  return "toggle";
}

export function discordBotGuildMemberPath(
  guildId,
  botUserId,
) {
  return `/guilds/${guildId}/members/${botUserId}`;
}
