"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type SyncStatus = {
  success: boolean;
  league: {
    id: string;
    name: string;
    season: number;
    currentWeek: number;
    externalLeagueId: string | null;
    provider: string;
    syncStatus: string;
    lastSyncAt: string | null;
    lastSyncError: string | null;
  } | null;
  counts: {
    baselinePlayers: number;
    franchisePlayers: number;
    baselineTeams: number;
    leagueGames: number;
    currentWeekGames: number;
    finalGames: number;
  };
  latestRun: {
    status: string;
    source: string;
    importedGames: number;
    skippedGames: number;
    errorMessage: string | null;
    startedAt: string;
    completedAt: string | null;
  } | null;
  sourceMode: string;
  infrastructureReady: boolean;
  error?: string;
};

const TEAMS = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
  "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
  "LV", "LAC", "LAR", "MIA", "MIN", "NE", "NO", "NYG",
  "NYJ", "PHI", "PIT", "SF", "SEA", "TB", "TEN", "WAS",
];

function prettyStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MaddenSyncClient() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [leagueName, setLeagueName] = useState("GOLD JACKET CFM");
  const [externalLeagueId, setExternalLeagueId] = useState("");
  const [provider, setProvider] = useState("manual");
  const [season, setSeason] = useState(1);
  const [currentWeek, setCurrentWeek] = useState(1);

  const [awayTeam, setAwayTeam] = useState("NYJ");
  const [homeTeam, setHomeTeam] = useState("NE");
  const [awayScore, setAwayScore] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [gameStatus, setGameStatus] = useState("scheduled");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPrimetime, setIsPrimetime] = useState(false);
  const [broadcastLabel, setBroadcastLabel] = useState("");
  const [bulkText, setBulkText] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/madden/sync/status", {
        cache: "no-store",
      });
      const payload = (await response.json()) as SyncStatus;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Unable to load sync status.");
      }

      setStatus(payload);
      if (payload.league) {
        setLeagueName(payload.league.name);
        setExternalLeagueId(payload.league.externalLeagueId ?? "");
        setProvider(payload.league.provider || "manual");
        setSeason(payload.league.season || 1);
        setCurrentWeek(payload.league.currentWeek || 1);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load sync status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const request = useCallback(
    async (body: Record<string, unknown>) => {
      if (!secret.trim()) {
        throw new Error("Enter your Madden sync secret first.");
      }

      const response = await fetch("/api/commissioner/madden-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-madden-sync-secret": secret.trim(),
        },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Madden sync request failed.");
      }

      return payload;
    },
    [secret],
  );

  const runAction = useCallback(
    async (body: Record<string, unknown>) => {
      setWorking(true);
      setMessage("");
      setError("");

      try {
        const payload = await request(body);
        setMessage(payload.message || "Saved successfully.");
        await loadStatus();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Request failed.");
      } finally {
        setWorking(false);
      }
    },
    [loadStatus, request],
  );

  const sourceLabel = useMemo(() => {
    if (!status) return "Loading";
    if (status.sourceMode === "live_franchise") return "Live Franchise Data";
    return "EA Ratings + Quick Sync";
  }, [status]);

  async function submitSetup(event: FormEvent) {
    event.preventDefault();
    await runAction({
      action: "setup",
      leagueName,
      externalLeagueId,
      provider,
      season,
      currentWeek,
    });
  }

  async function submitGame(event: FormEvent) {
    event.preventDefault();

    await runAction({
      action: "game",
      season,
      week: currentWeek,
      awayTeam,
      homeTeam,
      awayScore: awayScore === "" ? null : Number(awayScore),
      homeScore: homeScore === "" ? null : Number(homeScore),
      status: gameStatus,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      isPrimetime,
      broadcastLabel,
    });
  }

  async function submitBulk(event: FormEvent) {
    event.preventDefault();
    await runAction({
      action: "bulk_week",
      season,
      week: currentWeek,
      bulkText,
    });
  }

  async function advanceWeek() {
    await runAction({
      action: "advance_week",
      season,
      currentWeek,
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="rounded-[30px] border border-white/10 bg-[#0d0f12] p-6 sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">
          Commissioner Control
        </p>
        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              Madden 27 Sync
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
              Run Gold Jacket with the official Madden 27 ratings baseline today. Quick Sync writes games into the same rows that future EA data will replace, so nothing has to be rebuilt later.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/schedule" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white hover:bg-white/[0.08]">
              Schedule
            </Link>
            <Link href="/standings" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-black hover:bg-zinc-200">
              Standings
            </Link>
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Data Mode", sourceLabel],
          ["Baseline Players", status?.counts.baselinePlayers ?? "—"],
          ["League Games", status?.counts.leagueGames ?? "—"],
          ["Final Games", status?.counts.finalGames ?? "—"],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-white/10 bg-[#0d0f12] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">{label}</p>
            <p className="mt-2 text-2xl font-black text-white">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="block">
            <span className="text-sm font-black text-white">Commissioner Sync Secret</span>
            <input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Paste MADDEN_SYNC_SECRET"
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-amber-400"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadStatus()}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            Refresh Status
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">The secret stays in this browser tab and is never included in the website bundle.</p>
      </section>

      {message ? (
        <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-100">{message}</div>
      ) : null}
      {error ? (
        <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-100">{error}</div>
      ) : null}

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <form onSubmit={submitSetup} className="rounded-[26px] border border-white/10 bg-[#0d0f12] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Step One</p>
              <h2 className="mt-1 text-2xl font-black text-white">Real League Setup</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
              {status?.league ? prettyStatus(status.league.syncStatus) : "Waiting"}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-zinc-300">League Name</span>
              <input value={leagueName} onChange={(event) => setLeagueName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" />
            </label>
            <label>
              <span className="text-sm font-bold text-zinc-300">Season</span>
              <input type="number" min={1} value={season} onChange={(event) => setSeason(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" />
            </label>
            <label>
              <span className="text-sm font-bold text-zinc-300">Current Week</span>
              <input type="number" min={1} value={currentWeek} onChange={(event) => setCurrentWeek(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" />
            </label>
            <label>
              <span className="text-sm font-bold text-zinc-300">Provider</span>
              <select value={provider} onChange={(event) => setProvider(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white">
                <option value="manual">Quick Sync For Now</option>
                <option value="direct_ea">Direct EA</option>
                <option value="companion_app">Companion App</option>
                <option value="snallabot">Snallabot</option>
                <option value="other">Other Provider</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-bold text-zinc-300">EA League ID</span>
              <input value={externalLeagueId} onChange={(event) => setExternalLeagueId(event.target.value)} placeholder="Leave blank until available" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button disabled={working} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50">Save League Setup</button>
            <button type="button" disabled={working} onClick={() => void advanceWeek()} className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-white disabled:opacity-50">Set Current Week</button>
          </div>
        </form>

        <form onSubmit={submitGame} className="rounded-[26px] border border-white/10 bg-[#0d0f12] p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Quick Sync</p>
          <h2 className="mt-1 text-2xl font-black text-white">Single Game</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-sm font-bold text-zinc-300">Away Team</span>
              <select value={awayTeam} onChange={(event) => setAwayTeam(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white">
                {TEAMS.map((team) => <option key={team} value={team}>{team}</option>)}
              </select>
            </label>
            <label>
              <span className="text-sm font-bold text-zinc-300">Home Team</span>
              <select value={homeTeam} onChange={(event) => setHomeTeam(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white">
                {TEAMS.map((team) => <option key={team} value={team}>{team}</option>)}
              </select>
            </label>
            <label>
              <span className="text-sm font-bold text-zinc-300">Away Score</span>
              <input type="number" min={0} value={awayScore} onChange={(event) => setAwayScore(event.target.value)} placeholder="Blank if unplayed" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" />
            </label>
            <label>
              <span className="text-sm font-bold text-zinc-300">Home Score</span>
              <input type="number" min={0} value={homeScore} onChange={(event) => setHomeScore(event.target.value)} placeholder="Blank if unplayed" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" />
            </label>
            <label>
              <span className="text-sm font-bold text-zinc-300">Status</span>
              <select value={gameStatus} onChange={(event) => setGameStatus(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white">
                <option value="scheduled">Scheduled</option>
                <option value="final">Final</option>
                <option value="in_progress">In Progress</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-bold text-zinc-300">Kickoff</span>
              <div className="mt-2 flex w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="block w-full min-w-0 border-0 bg-transparent p-0 text-base text-white" />
              </div>
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-zinc-300">Broadcast Label</span>
              <input value={broadcastLabel} onChange={(event) => setBroadcastLabel(event.target.value)} placeholder="GOTW, SNF, Rivalry Game..." className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" />
            </label>
            <label className="flex items-center gap-3 text-sm font-bold text-zinc-300 sm:col-span-2">
              <input type="checkbox" checked={isPrimetime} onChange={(event) => setIsPrimetime(event.target.checked)} />
              Mark as primetime
            </label>
          </div>

          <button disabled={working || awayTeam === homeTeam} className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-50">Save Game</button>
        </form>
      </section>

      <form onSubmit={submitBulk} className="mt-6 rounded-[26px] border border-white/10 bg-[#0d0f12] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Fastest Option</p>
        <h2 className="mt-1 text-2xl font-black text-white">Bulk Week Import</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">One game per line. Use <strong className="text-zinc-300">NYJ @ NE</strong> for scheduled games or <strong className="text-zinc-300">NYJ 20 @ NE 24</strong> for finals.</p>
        <textarea value={bulkText} onChange={(event) => setBulkText(event.target.value)} rows={10} placeholder={"NYJ @ NE\nBUF @ MIA\nBAL 27 @ CIN 24"} className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-mono text-sm text-white" />
        <button disabled={working || !bulkText.trim()} className="mt-4 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50">Import Week {currentWeek}</button>
      </form>

      <section className="mt-6 rounded-[26px] border border-white/10 bg-[#0d0f12] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Last Run</p>
            <h2 className="mt-1 text-xl font-black text-white">{status?.latestRun ? prettyStatus(status.latestRun.status) : "No sync runs yet"}</h2>
          </div>
          <p className="text-sm text-zinc-500">Last league sync: {formatDate(status?.league?.lastSyncAt ?? null)}</p>
        </div>
        {status?.latestRun ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-zinc-600">Source</p><p className="mt-1 font-black text-white">{status.latestRun.source}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-zinc-600">Imported</p><p className="mt-1 font-black text-white">{status.latestRun.importedGames}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-zinc-600">Started</p><p className="mt-1 font-black text-white">{formatDate(status.latestRun.startedAt)}</p></div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
