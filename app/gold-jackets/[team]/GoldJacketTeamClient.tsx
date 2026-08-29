"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Team = {
  slug: string;
  city: string;
  name: string;
  abbreviation: string;
  primary: string;
  secondary: string;
};

type Candidate = {
  key: string;
  name: string;
  position: string;
  hofClass: number | null;
};

type Claim = {
  id: string;
  teamSlug: string;
  candidateKey: string;
  playerName: string;
  playerPosition: string;
  displayName: string;
  claimedAt: string;
};

type SessionState = {
  connected: boolean;
  team: string | null;
  displayName: string | null;
};

type Props = {
  team: Team;
  candidates: Candidate[];
  claims: Claim[];
  existingClaim: Claim | null;
  storageReady: boolean;
};

function playInductionChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const now = context.currentTime;
    const notes = [196, 293.66, 392, 587.33];

    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === notes.length - 1 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.12);
      gain.gain.setValueAtTime(0.0001, now + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.16, now + index * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.42);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + index * 0.12);
      oscillator.stop(now + index * 0.12 + 0.45);
    });

    window.setTimeout(() => void context.close(), 1500);
  } catch {
    // The ceremony remains fully usable if a browser blocks Web Audio.
  }
}

export default function GoldJacketTeamClient({
  team,
  candidates,
  claims,
  existingClaim,
  storageReady,
}: Props) {
  const router = useRouter();
  const [session, setSession] = useState<SessionState | null>(null);
  const [confirming, setConfirming] = useState<Candidate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ceremony, setCeremony] = useState<{
    candidate: Candidate;
    claim: Claim;
    staffAlertSent: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/gold-jackets/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load owner session.");
        return (await response.json()) as SessionState;
      })
      .then((data) => {
        if (active) setSession(data);
      })
      .catch(() => {
        if (active) setSession({ connected: false, team: null, displayName: null });
      });

    return () => {
      active = false;
    };
  }, []);

  const claimByCandidate = useMemo(
    () => new Map(claims.map((claim) => [claim.candidateKey, claim])),
    [claims],
  );
  const isOwner = session?.team === team.slug;
  const canSelect = storageReady && isOwner && !existingClaim;
  const logo = `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${team.abbreviation}`;

  async function confirmInduction() {
    if (!confirming || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/gold-jackets/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamSlug: team.slug,
          candidateKey: confirming.key,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        staffAlertSent?: boolean;
        claim?: {
          id: string;
          teamSlug: string;
          candidateKey: string;
          playerName: string;
          playerPosition: string;
          displayName: string;
          claimedAt: string;
        };
      };

      if (!response.ok || !data.claim) {
        setError(data.error || "Unable to complete the induction.");
        setConfirming(null);
        if (response.status === 409) router.refresh();
        return;
      }

      playInductionChime();
      setCeremony({
        candidate: confirming,
        claim: {
          id: data.claim.id,
          teamSlug: data.claim.teamSlug,
          candidateKey: data.claim.candidateKey,
          playerName: data.claim.playerName,
          playerPosition: data.claim.playerPosition,
          displayName: data.claim.displayName,
          claimedAt: data.claim.claimedAt,
        },
        staffAlertSent: Boolean(data.staffAlertSent),
      });
      setConfirming(null);
    } catch {
      setError("Network error. Your selection was not submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  function closeCeremony() {
    setCeremony(null);
    router.refresh();
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] bg-[#050505] text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-black">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(circle at 15% 10%, ${team.primary}aa, transparent 32rem), radial-gradient(circle at 90% 5%, ${team.secondary}66, transparent 32rem)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-[#050505]" />
        <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-14">
          <Link
            href="/gold-jackets"
            className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500 transition hover:text-white"
          >
            ← Gold Jacket Hall
          </Link>
          <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-amber-300">
                Permanent Franchise Induction
              </p>
              <h1 className="mt-3 text-5xl font-black tracking-[-0.065em] sm:text-7xl">
                {team.city}
                <span className="block">{team.name}</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
                Pick one real Pro Football Hall of Famer. The player enters Gold Jacket CFM at age 20, 70 OVR, Superstar development — and the choice never changes.
              </p>
            </div>
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-white/10 bg-black/35 p-5 backdrop-blur-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" className="h-full w-full object-contain" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
        {existingClaim ? (
          <div className="overflow-hidden rounded-[2rem] border border-amber-300/25 bg-[radial-gradient(circle_at_20%_0%,rgba(212,175,55,0.16),transparent_28rem),#0a0906] p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">Locked Forever</p>
            <div className="mt-6 grid gap-6 md:grid-cols-[240px_1fr] md:items-center">
              <div className="aspect-[4/5] overflow-hidden rounded-3xl border border-amber-300/20 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/gold-jackets/photo/${existingClaim.candidateKey}?team=${encodeURIComponent(team.slug)}`}
                  alt={existingClaim.playerName}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-zinc-500">Your Gold Jacket</p>
                <h2 className="mt-2 text-5xl font-black tracking-[-0.06em] sm:text-6xl">{existingClaim.playerName}</h2>
                <p className="mt-3 text-lg font-bold text-amber-200">{existingClaim.playerPosition} • Age 20 • 70 OVR • Superstar</p>
                <p className="mt-4 text-sm text-zinc-500">Inducted by {existingClaim.displayName}</p>
                <Link
                  href={`/gold-jackets/player/${existingClaim.candidateKey}`}
                  className="mt-7 inline-flex rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-black transition hover:bg-amber-200"
                >
                  View Gold Jacket Profile
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">Candidate Board</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.045em]">Choose your franchise legend.</h2>
              </div>
              <div className="text-sm text-zinc-500">
                {candidates.length} real Hall of Fame {candidates.length === 1 ? "option" : "options"}
              </div>
            </div>

            {candidates.length < 5 && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm leading-6 text-zinc-400">
                This newer franchise has fewer than five legitimate enshrined player connections. Gold Jacket only shows real Pro Football Hall of Famers — no fake filler.
              </div>
            )}

            {!storageReady && (
              <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] px-5 py-4 text-sm text-amber-100">
                Preview only: apply the Gold Jacket Supabase migration before selections can be locked.
              </div>
            )}

            {session && !session.connected && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-zinc-400">
                Connect Discord to make your franchise selection.
              </div>
            )}

            {session?.connected && !isOwner && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-zinc-400">
                You can browse the board, but only the assigned {team.name} owner can induct this franchise&apos;s Gold Jacket.
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.08] px-5 py-4 text-sm font-semibold text-red-100">
                {error}
              </div>
            )}

            <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {candidates.map((candidate) => {
                const taken = claimByCandidate.get(candidate.key) ?? null;
                const isTaken = Boolean(taken);

                return (
                  <article
                    key={candidate.key}
                    className={`group overflow-hidden rounded-3xl border bg-[#0a0a0a] transition duration-300 ${
                      isTaken
                        ? "border-white/[0.07] opacity-55"
                        : "border-white/10 hover:-translate-y-1 hover:border-amber-300/35"
                    }`}
                  >
                    <div className="relative aspect-[16/11] overflow-hidden bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/gold-jackets/photo/${candidate.key}?team=${encodeURIComponent(team.slug)}`}
                        alt={candidate.name}
                        className={`h-full w-full object-cover object-top transition duration-500 ${
                          isTaken ? "grayscale" : "group-hover:scale-[1.035]"
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" />
                      <div className="absolute left-4 top-4 rounded-full border border-black/30 bg-black/65 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] backdrop-blur-md">
                        {isTaken ? "Claimed" : "Available"}
                      </div>
                      {candidate.hofClass && (
                        <div className="absolute right-4 top-4 rounded-full border border-amber-200/20 bg-amber-300/90 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-black">
                          HOF {candidate.hofClass}
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">{candidate.position}</p>
                      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em]">{candidate.name}</h3>
                      {taken ? (
                        <p className="mt-3 text-xs leading-5 text-zinc-500">
                          Locked by {taken.displayName} for another franchise.
                        </p>
                      ) : (
                        <p className="mt-3 text-xs leading-5 text-zinc-500">
                          Real Hall of Famer • Shared-player lock applies league-wide.
                        </p>
                      )}
                      <div className="mt-5 flex gap-2">
                        <Link
                          href={`/gold-jackets/player/${candidate.key}`}
                          className="flex-1 rounded-xl border border-white/10 px-3 py-2.5 text-center text-xs font-black text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
                        >
                          Profile
                        </Link>
                        <button
                          type="button"
                          disabled={!canSelect || isTaken}
                          onClick={() => {
                            setError(null);
                            setConfirming(candidate);
                          }}
                          className="flex-1 rounded-xl bg-amber-300 px-3 py-2.5 text-xs font-black text-black transition enabled:hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
                        >
                          {isTaken ? "Locked" : "Induct"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {confirming && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-5 backdrop-blur-xl">
          <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-amber-300/25 bg-[#0a0906] shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
            <div className="grid grid-cols-[130px_1fr] border-b border-white/10 bg-black/40 sm:grid-cols-[180px_1fr]">
              <div className="aspect-[4/5] overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/gold-jackets/photo/${confirming.key}?team=${encodeURIComponent(team.slug)}`} alt={confirming.name} className="h-full w-full object-cover object-top" />
              </div>
              <div className="flex flex-col justify-center p-5 sm:p-7">
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-amber-300">Final Decision</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{confirming.name}</h2>
                <p className="mt-2 text-sm font-bold text-zinc-400">{team.city} {team.name}</p>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.07] p-4">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-red-200">This cannot be changed.</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Once you induct {confirming.name}, the {team.name} permanently lose access to every other candidate and this Hall of Famer becomes unavailable to every other franchise.
                </p>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                {[["AGE", "20"], ["OVR", "70"], ["DEV", "SUPERSTAR"]].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-zinc-600">{label}</p>
                    <p className="mt-1 text-sm font-black text-amber-200">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setConfirming(null)}
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-300 transition hover:bg-white/[0.04] disabled:opacity-50"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={confirmInduction}
                  className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-black transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60"
                >
                  {submitting ? "LOCKING..." : `INDUCT ${confirming.name.toUpperCase()}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ceremony && (
        <div className="fixed inset-0 z-[140] overflow-y-auto bg-black text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,0.3),transparent_28rem),radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.07),transparent_18rem),radial-gradient(circle_at_90%_90%,rgba(212,175,55,0.13),transparent_26rem)]" />
          <div className="relative flex min-h-screen items-center justify-center px-5 py-10">
            <div className="w-full max-w-5xl text-center">
              <p className="animate-pulse text-[11px] font-black uppercase tracking-[0.55em] text-amber-300">Canton Has Called</p>
              <h2 className="mt-5 text-5xl font-black tracking-[-0.07em] sm:text-7xl lg:text-8xl">INDUCTED</h2>
              <div className="mx-auto mt-8 grid max-w-4xl gap-6 overflow-hidden rounded-[2.5rem] border border-amber-200/25 bg-[#0a0906]/95 p-5 text-left shadow-[0_0_120px_rgba(212,175,55,0.17)] sm:grid-cols-[300px_1fr] sm:p-7">
                <div className="aspect-[4/5] overflow-hidden rounded-3xl border border-amber-300/20 bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/gold-jackets/photo/${ceremony.candidate.key}?team=${encodeURIComponent(team.slug)}`} alt={ceremony.candidate.name} className="h-full w-full object-cover object-top" />
                </div>
                <div className="flex flex-col justify-center p-2 sm:p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">{team.city} {team.name}</p>
                  <h3 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">{ceremony.candidate.name}</h3>
                  <p className="mt-4 text-lg font-black text-amber-100">{ceremony.candidate.position} • Age 20 • 70 OVR • Superstar</p>
                  <p className="mt-4 text-sm leading-6 text-zinc-500">Selected by {ceremony.claim.displayName}. This franchise decision is now permanently locked.</p>
                  <div className={`mt-5 inline-flex w-fit rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${ceremony.staffAlertSent ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200" : "border-amber-300/20 bg-amber-300/[0.07] text-amber-100"}`}>
                    {ceremony.staffAlertSent ? "Staff Chat Notified" : "Claim Locked • Staff Alert Needs Retry"}
                  </div>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href={`/gold-jackets/player/${ceremony.candidate.key}`} className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-300/15">
                  View Player Profile
                </Link>
                <button type="button" onClick={closeCeremony} className="rounded-xl bg-amber-300 px-6 py-3 text-sm font-black text-black transition hover:bg-amber-200">
                  Enter The Hall
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
