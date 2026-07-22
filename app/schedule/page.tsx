import Link from "next/link";
import AppLayout from "../components/layout/AppLayout";
import { getTeamBySlug } from "../data/teams";

type GameStatus = "FINAL" | "UPCOMING" | "LIVE";

type ScheduledGame = {
  id: number;
  week: number;
  day: string;
  date: string;
  time: string;
  stadium: string;
  awayTeam: string;
  homeTeam: string;
  awayScore?: number;
  homeScore?: number;
  status: GameStatus;
  featured?: boolean;
};

const currentWeek = 8;

const schedule: ScheduledGame[] = [
  {
    id: 1,
    week: 7,
    day: "Thursday",
    date: "OCT 17",
    time: "FINAL",
    stadium: "Paycor Stadium",
    awayTeam: "ravens",
    homeTeam: "bengals",
    awayScore: 31,
    homeScore: 24,
    status: "FINAL",
  },
  {
    id: 2,
    week: 7,
    day: "Sunday",
    date: "OCT 20",
    time: "FINAL",
    stadium: "Lincoln Financial Field",
    awayTeam: "cowboys",
    homeTeam: "eagles",
    awayScore: 20,
    homeScore: 34,
    status: "FINAL",
  },
  {
    id: 3,
    week: 8,
    day: "Thursday",
    date: "OCT 24",
    time: "8:15 PM",
    stadium: "M&T Bank Stadium",
    awayTeam: "chiefs",
    homeTeam: "ravens",
    status: "UPCOMING",
    featured: true,
  },
  {
    id: 4,
    week: 8,
    day: "Sunday",
    date: "OCT 27",
    time: "1:00 PM",
    stadium: "Highmark Stadium",
    awayTeam: "dolphins",
    homeTeam: "bills",
    status: "UPCOMING",
  },
  {
    id: 5,
    week: 8,
    day: "Sunday",
    date: "OCT 27",
    time: "1:00 PM",
    stadium: "Ford Field",
    awayTeam: "packers",
    homeTeam: "lions",
    status: "UPCOMING",
  },
  {
    id: 6,
    week: 8,
    day: "Sunday",
    date: "OCT 27",
    time: "1:00 PM",
    stadium: "NRG Stadium",
    awayTeam: "colts",
    homeTeam: "texans",
    status: "UPCOMING",
  },
  {
    id: 7,
    week: 8,
    day: "Sunday",
    date: "OCT 27",
    time: "4:05 PM",
    stadium: "Levi's Stadium",
    awayTeam: "seahawks",
    homeTeam: "49ers",
    status: "UPCOMING",
  },
  {
    id: 8,
    week: 8,
    day: "Sunday",
    date: "OCT 27",
    time: "4:25 PM",
    stadium: "SoFi Stadium",
    awayTeam: "chargers",
    homeTeam: "rams",
    status: "UPCOMING",
  },
  {
    id: 9,
    week: 8,
    day: "Sunday",
    date: "OCT 27",
    time: "8:20 PM",
    stadium: "AT&T Stadium",
    awayTeam: "eagles",
    homeTeam: "cowboys",
    status: "UPCOMING",
  },
  {
    id: 10,
    week: 8,
    day: "Monday",
    date: "OCT 28",
    time: "8:15 PM",
    stadium: "Arrowhead Stadium",
    awayTeam: "raiders",
    homeTeam: "chiefs",
    status: "UPCOMING",
  },
  {
    id: 11,
    week: 9,
    day: "Thursday",
    date: "OCT 31",
    time: "8:15 PM",
    stadium: "Lambeau Field",
    awayTeam: "lions",
    homeTeam: "packers",
    status: "UPCOMING",
  },
  {
    id: 12,
    week: 9,
    day: "Sunday",
    date: "NOV 3",
    time: "1:00 PM",
    stadium: "Acrisure Stadium",
    awayTeam: "ravens",
    homeTeam: "steelers",
    status: "UPCOMING",
  },
];

const visibleWeeks = [7, 8, 9, 10, 11, 12];

function TeamLogo({
  slug,
  size = "large",
}: {
  slug: string;
  size?: "small" | "large";
}) {
  const team = getTeamBySlug(slug);

  if (!team) {
    return null;
  }

  const sizeClasses =
    size === "large"
      ? "h-16 w-16 rounded-2xl text-lg"
      : "h-10 w-10 rounded-xl text-xs";

  return (
    <div
      className={`flex shrink-0 items-center justify-center border font-black text-white shadow-lg ${sizeClasses}`}
      style={{
        backgroundColor: team.primaryColor,
        borderColor: team.secondaryColor,
      }}
    >
      {team.short}
    </div>
  );
}

function TeamRow({
  slug,
  score,
  winner,
  isHome,
}: {
  slug: string;
  score?: number;
  winner?: boolean;
  isHome: boolean;
}) {
  const team = getTeamBySlug(slug);

  if (!team) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <Link
        href={`/teams/${team.slug}`}
        className="group/team flex min-w-0 items-center gap-3"
      >
        <TeamLogo slug={team.slug} size="small" />

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
            {isHome ? "Home" : "Away"}
          </p>

          <p
            className={`truncate font-black transition group-hover/team:text-red-500 ${
              winner ? "text-white" : "text-zinc-300"
            }`}
          >
            {team.city} {team.name}
          </p>
        </div>
      </Link>

      {score !== undefined && (
        <p
          className={`text-2xl font-black ${
            winner ? "text-white" : "text-zinc-600"
          }`}
        >
          {score}
        </p>
      )}
    </div>
  );
}

function GameCard({ game }: { game: ScheduledGame }) {
  const awayTeam = getTeamBySlug(game.awayTeam);
  const homeTeam = getTeamBySlug(game.homeTeam);

  if (!awayTeam || !homeTeam) {
    return null;
  }

  const awayWinner =
    game.status === "FINAL" &&
    game.awayScore !== undefined &&
    game.homeScore !== undefined &&
    game.awayScore > game.homeScore;

  const homeWinner =
    game.status === "FINAL" &&
    game.awayScore !== undefined &&
    game.homeScore !== undefined &&
    game.homeScore > game.awayScore;

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border bg-zinc-950 transition duration-300 hover:-translate-y-1 ${
        game.featured
          ? "border-red-600 shadow-[0_0_45px_rgba(220,38,38,0.12)]"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {game.featured && (
        <div className="absolute right-0 top-0 rounded-bl-2xl bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-[0.2em]">
          Game of the Week
        </div>
      )}

      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${awayTeam.primaryColor}, ${homeTeam.primaryColor})`,
        }}
      />

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-600">
              {game.day} · {game.date}
            </p>

            <p
              className={`mt-2 text-sm font-black ${
                game.status === "LIVE"
                  ? "text-red-500"
                  : game.status === "FINAL"
                    ? "text-zinc-500"
                    : "text-white"
              }`}
            >
              {game.status === "FINAL" ? "FINAL" : game.time}
            </p>
          </div>

          <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-black text-zinc-500">
            WEEK {game.week}
          </span>
        </div>

        <div className="mt-6 space-y-5">
          <TeamRow
            slug={game.awayTeam}
            score={game.awayScore}
            winner={awayWinner}
            isHome={false}
          />

          <div className="h-px bg-zinc-800" />

          <TeamRow
            slug={game.homeTeam}
            score={game.homeScore}
            winner={homeWinner}
            isHome
          />
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-zinc-800 pt-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
              Location
            </p>

            <p className="mt-1 truncate text-sm font-bold text-zinc-400">
              {game.stadium}
            </p>
          </div>

          <Link
            href={`/matchups/${game.id}`}
            className="shrink-0 rounded-xl border border-zinc-700 px-4 py-2 text-xs font-black text-zinc-300 transition hover:border-red-600 hover:bg-red-600 hover:text-white"
          >
            Matchup
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function SchedulePage() {
  const currentWeekGames = schedule.filter(
    (game) => game.week === currentWeek,
  );

  const completedGames = currentWeekGames.filter(
    (game) => game.status === "FINAL",
  ).length;

  const upcomingGames = currentWeekGames.filter(
    (game) => game.status === "UPCOMING",
  ).length;

  const featuredGame = currentWeekGames.find((game) => game.featured);
  const featuredAwayTeam = featuredGame
    ? getTeamBySlug(featuredGame.awayTeam)
    : undefined;
  const featuredHomeTeam = featuredGame
    ? getTeamBySlug(featuredGame.homeTeam)
    : undefined;

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-red-500">
              New Era CFM
            </p>

            <h1 className="mt-3 text-5xl font-black tracking-tight">
              League Schedule
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              View weekly matchups, final scores, upcoming games, and featured
              rivalry battles across the league.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-black text-zinc-300 transition hover:border-zinc-600 hover:text-white">
              Previous Week
            </button>

            <button className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black transition hover:bg-red-500">
              Advance Week
            </button>
          </div>
        </section>

        <section className="mt-8 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-2">
          <div className="flex min-w-max gap-2">
            {visibleWeeks.map((week) => (
              <button
                key={week}
                className={`rounded-xl px-6 py-3 text-sm font-black transition ${
                  week === currentWeek
                    ? "bg-red-600 text-white"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                Week {week}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Current Week
            </p>

            <p className="mt-2 text-4xl font-black">{currentWeek}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Matchups
            </p>

            <p className="mt-2 text-4xl font-black">
              {currentWeekGames.length}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Completed
            </p>

            <p className="mt-2 text-4xl font-black">{completedGames}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Upcoming
            </p>

            <p className="mt-2 text-4xl font-black text-red-500">
              {upcomingGames}
            </p>
          </div>
        </section>

        {featuredGame && featuredAwayTeam && featuredHomeTeam && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-red-600 bg-zinc-950">
            <div
              className="p-8 lg:p-10"
              style={{
                background: `linear-gradient(110deg, ${featuredAwayTeam.primaryColor}AA, #09090b 45%, ${featuredHomeTeam.primaryColor}AA)`,
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-red-400">
                    New Era Game of the Week
                  </p>

                  <h2 className="mt-3 text-3xl font-black">
                    Week {featuredGame.week} Featured Matchup
                  </h2>
                </div>

                <span className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black backdrop-blur">
                  {featuredGame.day} · {featuredGame.time}
                </span>
              </div>

              <div className="mt-10 grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
                <Link
                  href={`/teams/${featuredAwayTeam.slug}`}
                  className="group flex flex-col items-center text-center lg:items-end lg:text-right"
                >
                  <TeamLogo slug={featuredAwayTeam.slug} />

                  <p className="mt-4 text-sm font-bold text-white/60">
                    {featuredAwayTeam.city}
                  </p>

                  <h3 className="text-4xl font-black transition group-hover:text-red-400">
                    {featuredAwayTeam.name}
                  </h3>

                  <p className="mt-2 text-sm font-black text-white/60">
                    {featuredAwayTeam.record}
                  </p>
                </Link>

                <div className="text-center">
                  <p className="text-4xl font-black text-white/30">@</p>

                  <p className="mt-2 text-xs font-black uppercase tracking-[0.25em] text-white/40">
                    {featuredGame.stadium}
                  </p>
                </div>

                <Link
                  href={`/teams/${featuredHomeTeam.slug}`}
                  className="group flex flex-col items-center text-center lg:items-start lg:text-left"
                >
                  <TeamLogo slug={featuredHomeTeam.slug} />

                  <p className="mt-4 text-sm font-bold text-white/60">
                    {featuredHomeTeam.city}
                  </p>

                  <h3 className="text-4xl font-black transition group-hover:text-red-400">
                    {featuredHomeTeam.name}
                  </h3>

                  <p className="mt-2 text-sm font-black text-white/60">
                    {featuredHomeTeam.record}
                  </p>
                </Link>
              </div>

              <div className="mt-10 flex justify-center">
                <Link
                  href={`/matchups/${featuredGame.id}`}
                  className="rounded-xl bg-red-600 px-7 py-3 text-sm font-black transition hover:bg-red-500"
                >
                  View Matchup Preview
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
                Week {currentWeek}
              </p>

              <h2 className="mt-2 text-3xl font-black">All Matchups</h2>
            </div>

            <p className="text-sm font-bold text-zinc-500">
              {currentWeekGames.length} scheduled games
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {currentWeekGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}