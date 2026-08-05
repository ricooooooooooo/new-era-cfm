import { supabaseAdmin } from "@/lib/supabase-admin";
import type { LeagueGameRow } from "@/lib/madden/schedule-types";

type TeamRow = {
  id: string;
  city: string | null;
  name: string;
  abbreviation: string;
};

type AutomationSettings = {
  league_id: string;
  enabled: boolean;
  auto_grade: boolean;
  close_minutes_before: number;
  templates: string[];
  discord_post_enabled: boolean;
};

type MarketOptionRow = {
  id: string;
  market_id: string;
  label: string;
  option_key: string | null;
  team_id: string | null;
  odds_multiplier: number | string | null;
};

type MarketRow = {
  id: string;
  status: string;
  title?: string;
  winning_option?: string | null;
  game_id?: string | null;
  market_key?: string | null;
  auto_grade?: boolean;
  prediction_options?: MarketOptionRow[];
};

type BetRow = {
  id: string;
  discord_id: string;
  option_id: string;
  amount: number;
  result: string | null;
  payout: number | null;
};

function fullTeamName(team: TeamRow | null) {
  return team
    ? [team.city, team.name].filter(Boolean).join(" ")
    : "Unknown Team";
}

function marketCloseTime(
  scheduledAt: string | null,
  closeMinutesBefore: number,
) {
  if (!scheduledAt) return null;

  const value = new Date(scheduledAt);
  value.setMinutes(value.getMinutes() - closeMinutesBefore);
  return value.toISOString();
}

async function getSettings(
  leagueId: string,
): Promise<AutomationSettings> {
  const existing = await supabaseAdmin
    .from("prediction_automation_settings")
    .select(
      "league_id, enabled, auto_grade, close_minutes_before, templates, discord_post_enabled",
    )
    .eq("league_id", leagueId)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data) {
    return {
      ...existing.data,
      templates: Array.isArray(existing.data.templates)
        ? existing.data.templates
        : ["game_winner"],
    } as AutomationSettings;
  }

  const created = await supabaseAdmin
    .from("prediction_automation_settings")
    .insert({
      league_id: leagueId,
      enabled: true,
      auto_grade: true,
      close_minutes_before: 0,
      templates: ["game_winner"],
      discord_post_enabled: true,
    })
    .select(
      "league_id, enabled, auto_grade, close_minutes_before, templates, discord_post_enabled",
    )
    .single();

  if (created.error) throw created.error;
  return created.data as AutomationSettings;
}

async function loadTeams() {
  const result = await supabaseAdmin
    .from("teams")
    .select("id, city, name, abbreviation");

  if (result.error) throw result.error;

  return new Map(
    ((result.data ?? []) as TeamRow[]).map((team) => [team.id, team]),
  );
}

async function ensureGameWinnerMarket(
  game: LeagueGameRow,
  teams: Map<string, TeamRow>,
  settings: AutomationSettings,
) {
  if (
    !settings.enabled ||
    !settings.templates.includes("game_winner") ||
    !game.home_team_id ||
    !game.away_team_id
  ) {
    return { created: false, marketId: null };
  }

  const homeTeam = teams.get(game.home_team_id) ?? null;
  const awayTeam = teams.get(game.away_team_id) ?? null;

  if (!homeTeam || !awayTeam) {
    return { created: false, marketId: null };
  }

  const title = `${fullTeamName(awayTeam)} @ ${fullTeamName(homeTeam)}`;
  const closesAt = marketCloseTime(
    game.scheduled_at,
    settings.close_minutes_before,
  );

  const shouldBeOpen =
    game.status === "scheduled" &&
    (!closesAt || new Date(closesAt).getTime() > Date.now());

  const existing = await supabaseAdmin
    .from("prediction_markets")
    .select("id, status")
    .eq("game_id", game.id)
    .eq("market_key", "game_winner")
    .maybeSingle();

  if (existing.error) throw existing.error;

  let marketId: string;
  let createdMarket = false;

  if (existing.data) {
    marketId = existing.data.id;

    if (existing.data.status !== "graded") {
      const updated = await supabaseAdmin
        .from("prediction_markets")
        .update({
          title,
          description: `Season ${game.season} • Week ${game.week} • Pick the game winner`,
          closes_at: closesAt,
          status: shouldBeOpen ? "open" : "closed",
          auto_grade: settings.auto_grade,
          metadata: {
            homeTeam: homeTeam.abbreviation,
            awayTeam: awayTeam.abbreviation,
          },
        })
        .eq("id", marketId);

      if (updated.error) throw updated.error;
    }
  } else {
    const inserted = await supabaseAdmin
      .from("prediction_markets")
      .insert({
        league_id: game.league_id,
        game_id: game.id,
        title,
        description: `Season ${game.season} • Week ${game.week} • Pick the game winner`,
        closes_at: closesAt,
        status: shouldBeOpen ? "open" : "closed",
        market_key: "game_winner",
        market_type: "game_winner",
        category: "game",
        auto_generated: true,
        auto_grade: settings.auto_grade,
        source: game.source,
        season: game.season,
        week: game.week,
        metadata: {
          homeTeam: homeTeam.abbreviation,
          awayTeam: awayTeam.abbreviation,
        },
      })
      .select("id")
      .single();

    if (inserted.error) throw inserted.error;
    marketId = inserted.data.id;
    createdMarket = true;
  }

  const options = [
    {
      market_id: marketId,
      label: fullTeamName(awayTeam),
      option_key: "away",
      team_id: awayTeam.id,
      odds_multiplier: 2,
      metadata: { abbreviation: awayTeam.abbreviation },
    },
    {
      market_id: marketId,
      label: fullTeamName(homeTeam),
      option_key: "home",
      team_id: homeTeam.id,
      odds_multiplier: 2,
      metadata: { abbreviation: homeTeam.abbreviation },
    },
  ];

  for (const option of options) {
    const existingOption = await supabaseAdmin
      .from("prediction_options")
      .select("id")
      .eq("market_id", marketId)
      .eq("option_key", option.option_key)
      .maybeSingle();

    if (existingOption.error) throw existingOption.error;

    if (existingOption.data) {
      const updatedOption = await supabaseAdmin
        .from("prediction_options")
        .update(option)
        .eq("id", existingOption.data.id);

      if (updatedOption.error) throw updatedOption.error;
    } else {
      const insertedOption = await supabaseAdmin
        .from("prediction_options")
        .insert(option);

      if (insertedOption.error) throw insertedOption.error;
    }
  }

  return { created: createdMarket, marketId };
}

async function transactionAlreadyExists(
  discordId: string,
  type: string,
  referenceId: string,
) {
  const result = await supabaseAdmin
    .from("wallet_transactions")
    .select("reference_id")
    .eq("discord_id", discordId)
    .eq("type", type)
    .eq("reference_id", referenceId)
    .maybeSingle();

  if (result.error) throw result.error;
  return Boolean(result.data);
}

export async function settlePredictionMarket(
  marketId: string,
  winningOptionId: string,
  resultPayload: Record<string, unknown> = {},
) {
  const marketResult = await supabaseAdmin
    .from("prediction_markets")
    .select(`
      id,
      title,
      status,
      winning_option,
      prediction_options (
        id,
        market_id,
        label,
        option_key,
        team_id,
        odds_multiplier
      )
    `)
    .eq("id", marketId)
    .maybeSingle();

  if (marketResult.error) throw marketResult.error;
  if (!marketResult.data) throw new Error("Prediction market not found.");

  const market = marketResult.data as MarketRow;

  if (market.status === "graded") {
    return {
      alreadySettled: true,
      paidBets: 0,
      totalPaid: 0,
    };
  }

  const winningOption = (market.prediction_options ?? []).find(
    (option) => option.id === winningOptionId,
  );

  if (!winningOption) {
    throw new Error("Winning option does not belong to this market.");
  }

  const betsResult = await supabaseAdmin
    .from("prediction_bets")
    .select("id, discord_id, option_id, amount, result, payout")
    .eq("market_id", marketId);

  if (betsResult.error) throw betsResult.error;

  const bets = (betsResult.data ?? []) as BetRow[];
  let paidBets = 0;
  let totalPaid = 0;

  for (const bet of bets) {
    const won = bet.option_id === winningOptionId;

    if (!won) {
      const losingUpdate = await supabaseAdmin
        .from("prediction_bets")
        .update({
          result: "lost",
          payout: 0,
          settled_at: new Date().toISOString(),
        })
        .eq("id", bet.id);

      if (losingUpdate.error) throw losingUpdate.error;
      continue;
    }

    const multiplier = Number(winningOption.odds_multiplier ?? 2);
    const payout = Math.max(0, Math.round(Number(bet.amount) * multiplier));
    const referenceId = `prediction-win:${bet.id}`;

    if (
      !(await transactionAlreadyExists(
        bet.discord_id,
        "prediction_win",
        referenceId,
      ))
    ) {
      const walletResult = await supabaseAdmin
        .from("wallets")
        .select("balance, lifetime_won")
        .eq("discord_id", bet.discord_id)
        .maybeSingle();

      if (walletResult.error) throw walletResult.error;
      if (!walletResult.data) {
        throw new Error(`Wallet not found for ${bet.discord_id}.`);
      }

      const walletUpdate = await supabaseAdmin
        .from("wallets")
        .update({
          balance: Number(walletResult.data.balance ?? 0) + payout,
          lifetime_won:
            Number(walletResult.data.lifetime_won ?? 0) + payout,
        })
        .eq("discord_id", bet.discord_id);

      if (walletUpdate.error) throw walletUpdate.error;

      const transaction = await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          discord_id: bet.discord_id,
          amount: payout,
          type: "prediction_win",
          reference_id: referenceId,
          description: `Prediction win | ${market.title}`,
          metadata: {
            marketId,
            betId: bet.id,
            winningOptionId,
          },
        });

      if (transaction.error) throw transaction.error;
      paidBets += 1;
      totalPaid += payout;
    }

    const winningUpdate = await supabaseAdmin
      .from("prediction_bets")
      .update({
        result: "won",
        payout,
        settled_at: new Date().toISOString(),
      })
      .eq("id", bet.id);

    if (winningUpdate.error) throw winningUpdate.error;
  }

  const settledAt = new Date().toISOString();
  const marketUpdate = await supabaseAdmin
    .from("prediction_markets")
    .update({
      status: "graded",
      winning_option: winningOptionId,
      settled_at: settledAt,
      result_payload: resultPayload,
    })
    .eq("id", marketId);

  if (marketUpdate.error) throw marketUpdate.error;

  return {
    alreadySettled: false,
    paidBets,
    totalPaid,
    winningOption: winningOption.label,
  };
}

async function settleGameWinnerMarket(game: LeagueGameRow) {
  if (
    game.status !== "final" ||
    game.home_score === null ||
    game.away_score === null
  ) {
    return { settled: false, reason: "game_not_final" };
  }

  const marketResult = await supabaseAdmin
    .from("prediction_markets")
    .select(`
      id,
      status,
      auto_grade,
      prediction_options (
        id,
        market_id,
        label,
        option_key,
        team_id,
        odds_multiplier
      )
    `)
    .eq("game_id", game.id)
    .eq("market_key", "game_winner")
    .maybeSingle();

  if (marketResult.error) throw marketResult.error;
  if (!marketResult.data) return { settled: false, reason: "market_missing" };

  const market = marketResult.data as MarketRow;

  if (!market.auto_grade) {
    return { settled: false, reason: "auto_grade_disabled" };
  }

  if (game.home_score === game.away_score) {
    const closed = await supabaseAdmin
      .from("prediction_markets")
      .update({
        status: "closed",
        result_payload: {
          reason: "tie_requires_manual_review",
          homeScore: game.home_score,
          awayScore: game.away_score,
        },
      })
      .eq("id", market.id);

    if (closed.error) throw closed.error;
    return { settled: false, reason: "tie_requires_manual_review" };
  }

  const winningKey =
    game.home_score > game.away_score ? "home" : "away";

  const winningOption = (market.prediction_options ?? []).find(
    (option) => option.option_key === winningKey,
  );

  if (!winningOption) {
    return { settled: false, reason: "winning_option_missing" };
  }

  const result = await settlePredictionMarket(
    market.id,
    winningOption.id,
    {
      gameId: game.id,
      homeScore: game.home_score,
      awayScore: game.away_score,
      winner: winningKey,
      source: game.source,
    },
  );

  return { settled: true, ...result };
}

export async function syncPredictionMarketsForGames(
  games: LeagueGameRow[],
) {
  if (games.length === 0) {
    return {
      createdMarkets: 0,
      settledMarkets: 0,
      manualReview: 0,
    };
  }

  const settings = await getSettings(games[0].league_id);
  const teams = await loadTeams();

  let createdMarkets = 0;
  let settledMarkets = 0;
  let manualReview = 0;

  for (const game of games) {
    const ensured = await ensureGameWinnerMarket(
      game,
      teams,
      settings,
    );

    if (ensured.created) createdMarkets += 1;

    if (game.status === "final") {
      const settlement = await settleGameWinnerMarket(game);

      if (settlement.settled) {
        settledMarkets += 1;
      } else if (settlement.reason === "tie_requires_manual_review") {
        manualReview += 1;
      }
    }
  }

  return {
    createdMarkets,
    settledMarkets,
    manualReview,
  };
}

export async function generateMarketsForWeek(
  leagueId: string,
  season: number,
  week: number,
) {
  const gamesResult = await supabaseAdmin
    .from("league_games")
    .select("*")
    .eq("league_id", leagueId)
    .eq("season", season)
    .eq("week", week)
    .order("scheduled_at", { ascending: true });

  if (gamesResult.error) throw gamesResult.error;

  return syncPredictionMarketsForGames(
    (gamesResult.data ?? []) as LeagueGameRow[],
  );
}
