import ActiveCheckActions from "../components/ActiveCheckActions";
type TeamStatus = "checked" | "missing";

type EspnTeam = {
  id: string;
  abbreviation: string;
  displayName: string;
  logos?: {
    href: string;
  }[];
};

type EspnResponse = {
  sports?: {
    leagues?: {
      teams?: {
        team: EspnTeam;
      }[];
    }[];
  }[];
};

/*
  Temporary sample statuses.

  Later, these will come directly from your database and Discord active-check
  responses instead of being written here manually.
*/
const checkedInTeams = new Set([
  "ARI",
  "ATL",
  "BAL",
  "CAR",
  "CHI",
  "CLE",
  "DAL",
  "DEN",
  "DET",
  "HOU",
  "IND",
  "JAX",
  "KC",
  "LAC",
  "LAR",
  "MIA",
  "MIN",
  "NE",
  "NYG",
  "NYJ",
  "PHI",
  "PIT",
  "SF",
  "SEA",
  "TB",
  "TEN",
  "WSH",
]);

async function getNflTeams(): Promise<EspnTeam[]> {
  try {
    const response = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams",
      {
        next: {
          revalidate: 86400,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`ESPN request failed: ${response.status}`);
    }

    const data = (await response.json()) as EspnResponse;

    const teams =
      data.sports?.[0]?.leagues?.[0]?.teams?.map((entry) => entry.team) ?? [];

    return teams.sort((a, b) => a.displayName.localeCompare(b.displayName));
  } catch (error) {
    console.error("Unable to load NFL teams:", error);
    return [];
  }
}

function TeamLogo({
  team,
  status,
}: {
  team: EspnTeam;
  status: TeamStatus;
}) {
  const isChecked = status === "checked";
  const logo = team.logos?.[0]?.href;

  return (
    <div
      title={`${team.displayName} — ${
        isChecked ? "Checked in" : "Has not checked in"
      }`}
      className="group flex flex-col items-center gap-2"
    >
      <div
        className={[
          "relative flex aspect-square w-full items-center justify-center",
          "rounded-2xl border bg-[#111214] p-3",
          "transition duration-200 hover:-translate-y-1",
          isChecked
            ? "border-emerald-500/60 shadow-[0_0_18px_rgba(16,185,129,0.16)]"
            : "border-red-500/60 shadow-[0_0_18px_rgba(239,68,68,0.16)]",
        ].join(" ")}
      >
        {logo ? (
          <img
            src={logo}
            alt={`${team.displayName} logo`}
            className={[
              "h-full w-full object-contain transition duration-200",
              "group-hover:scale-110",
              isChecked ? "" : "opacity-45 grayscale",
            ].join(" ")}
            loading="lazy"
          />
        ) : (
          <span className="text-lg font-black text-zinc-500">
            {team.abbreviation}
          </span>
        )}

        <span
          className={[
            "absolute right-2 top-2 h-3 w-3 rounded-full border-2 border-[#111214]",
            isChecked ? "bg-emerald-400" : "bg-red-500",
          ].join(" ")}
        />
      </div>

      <p className="max-w-full truncate text-center text-xs font-bold text-zinc-400">
        {team.abbreviation}
      </p>
    </div>
  );
}

function TeamSection({
  title,
  subtitle,
  teams,
  status,
}: {
  title: string;
  subtitle: string;
  teams: EspnTeam[];
  status: TeamStatus;
}) {
  const isChecked = status === "checked";

  return (
    <section
      className={[
        "overflow-hidden rounded-3xl border bg-[#0d0e10]",
        isChecked ? "border-emerald-500/20" : "border-red-500/20",
      ].join(" ")}
    >
      <div
        className={[
          "flex flex-col gap-2 border-b px-6 py-5 sm:flex-row",
          "sm:items-center sm:justify-between",
          isChecked
            ? "border-emerald-500/20 bg-emerald-500/[0.04]"
            : "border-red-500/20 bg-red-500/[0.04]",
        ].join(" ")}
      >
        <div>
          <div className="flex items-center gap-3">
            <span
              className={[
                "h-3 w-3 rounded-full",
                isChecked ? "bg-emerald-400" : "bg-red-500",
              ].join(" ")}
            />

            <h2
              className={[
                "text-xl font-black uppercase tracking-wide",
                isChecked ? "text-emerald-400" : "text-red-400",
              ].join(" ")}
            >
              {title}
            </h2>
          </div>

          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        </div>

        <div
          className={[
            "flex h-11 min-w-11 items-center justify-center rounded-xl px-4",
            "text-lg font-black",
            isChecked
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400",
          ].join(" ")}
        >
          {teams.length}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 p-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
        {teams.map((team) => (
          <TeamLogo key={team.id} team={team} status={status} />
        ))}
      </div>
    </section>
  );
}

export default async function ActiveChecksPage() {
  const teams = await getNflTeams();

  const checkedTeams = teams.filter((team) =>
    checkedInTeams.has(team.abbreviation),
  );

  const missingTeams = teams.filter(
    (team) => !checkedInTeams.has(team.abbreviation),
  );

  const responseTotal = checkedTeams.length + missingTeams.length;

  const completionPercentage =
    responseTotal === 0
      ? 0
      : Math.round((checkedTeams.length / responseTotal) * 100);

  return (
    <main className="min-h-screen bg-[#08090a] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <header className="mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-[#0d0e10]">
          <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-red-500">
                New Era CFM
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                Active Check
              </h1>

              <p className="mt-3 text-zinc-400">
                Week 1 check-in status for all 32 teams.
              </p>
            </div>

            <ActiveCheckActions />
          </div>

          <div className="border-t border-zinc-800 px-6 py-5 lg:px-8">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-bold text-zinc-300">
                {checkedTeams.length} of {responseTotal} checked in
              </span>

              <span className="font-black text-emerald-400">
                {completionPercentage}%
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${completionPercentage}%`,
                }}
              />
            </div>
          </div>
        </header>

        {teams.length === 0 ? (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-8 text-center">
            <h2 className="text-xl font-black text-red-400">
              Team logos could not load
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Refresh the page and make sure the deployment can access ESPN.
            </p>
          </div>
        ) : (
          <div className="space-y-7">
            <TeamSection
              title="Checked In"
              subtitle="These teams completed the active check."
              teams={checkedTeams}
              status="checked"
            />

            <TeamSection
              title="Did Not Check In"
              subtitle="These teams still need to respond."
              teams={missingTeams}
              status="missing"
            />
          </div>
        )}
      </div>
    </main>
  );
}