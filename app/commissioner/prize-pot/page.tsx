"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "@/app/components/layout/AppLayout";

type PrizePotState = {
  season: number;
  amount: number;
  teamsFilled: number;
  totalTeams: number;
  isPublished: boolean;
  discordMessageId: string | null;
  graphicVersion: number;
  lastPublishedAt: string | null;
  updatedAt: string;
  webhookConfigured: boolean;
};

type PrizePotResponse = {
  success: boolean;
  action?: "created" | "updated";
  prizePot?: PrizePotState;
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) return "Not published yet";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CommissionerPrizePotPage() {
  const [saved, setSaved] = useState<PrizePotState | null>(null);
  const [amount, setAmount] = useState(300);
  const [season, setSeason] = useState(1);
  const [teamsFilled, setTeamsFilled] = useState(32);
  const [totalTeams, setTotalTeams] = useState(32);
  const [previewVersion, setPreviewVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPrizePot = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/prize-pot", {
        cache: "no-store",
      });

      const payload = (await response.json()) as PrizePotResponse;

      if (!response.ok || !payload.success || !payload.prizePot) {
        throw new Error(payload.error ?? "Unable to load prize pot.");
      }

      setSaved(payload.prizePot);
      setAmount(payload.prizePot.amount);
      setSeason(payload.prizePot.season);
      setTeamsFilled(payload.prizePot.teamsFilled);
      setTotalTeams(payload.prizePot.totalTeams);
      setPreviewVersion((current) => current + 1);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load prize pot.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrizePot();
  }, [loadPrizePot]);

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({
      amount: String(Number.isFinite(amount) ? amount : 0),
      season: String(Number.isFinite(season) ? season : 1),
      teams: String(Number.isFinite(teamsFilled) ? teamsFilled : 0),
      total: String(Number.isFinite(totalTeams) ? totalTeams : 32),
      preview: String(previewVersion),
    });

    return `/api/prize-pot/graphic?${params.toString()}`;
  }, [
    amount,
    season,
    teamsFilled,
    totalTeams,
    previewVersion,
  ]);

  async function publish(forceNew = false) {
    if (publishing) return;

    setPublishing(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/prize-pot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          season,
          teamsFilled,
          totalTeams,
          forceNew,
        }),
      });

      const payload = (await response.json()) as PrizePotResponse;

      if (!response.ok || !payload.success || !payload.prizePot) {
        throw new Error(
          payload.error ?? "Unable to publish the prize pot.",
        );
      }

      setSaved(payload.prizePot);
      setPreviewVersion((current) => current + 1);
      setMessage(
        payload.action === "created"
          ? "Prize-pot embed posted to Discord."
          : "The existing Discord prize-pot embed was updated.",
      );
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Unable to publish the prize pot.",
      );
    } finally {
      setPublishing(false);
    }
  }

  return (
    <AppLayout>
      <main className="min-h-[calc(100vh-8rem)] bg-[#050606] text-white">
        <section className="relative overflow-hidden border-b border-white/10 bg-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(124,58,237,0.34),transparent_34rem),radial-gradient(circle_at_88%_12%,rgba(245,158,11,0.18),transparent_28rem)]" />

          <div className="relative mx-auto max-w-7xl px-5 py-11 sm:px-8 sm:py-15">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-purple-300">
              Commissioner Prize Control
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
              Live Prize Pot Embed
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              Change the number here and update the same permanent
              Discord message. No duplicate posts.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
          {message ? (
            <div className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-100">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-bold text-red-100">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center text-zinc-500">
              Loading prize-pot controls...
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
              <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-300">
                  Pot Settings
                </p>

                <div className="mt-6 space-y-5">
                  <label className="block">
                    <span className="text-sm font-black">
                      Current Pot
                    </span>
                    <div className="mt-2 flex items-center rounded-2xl border border-white/10 bg-black/35 px-4 focus-within:border-purple-400/50">
                      <span className="text-2xl font-black text-amber-200">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="1000000"
                        step="1"
                        value={amount}
                        onChange={(event) =>
                          setAmount(Number(event.target.value))
                        }
                        className="min-h-16 min-w-0 flex-1 bg-transparent px-3 text-3xl font-black outline-none"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[10, 25, 50].map((increase) => (
                        <button
                          key={increase}
                          type="button"
                          onClick={() =>
                            setAmount((current) => current + increase)
                          }
                          className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-black transition active:scale-[0.98] active:bg-white/[0.1]"
                        >
                          +${increase}
                        </button>
                      ))}
                    </div>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <span className="text-sm font-black">Season</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={season}
                        onChange={(event) =>
                          setSeason(Number(event.target.value))
                        }
                        className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 font-black outline-none focus:border-purple-400/50"
                      />
                    </label>

                    <label>
                      <span className="text-sm font-black">
                        Teams Filled
                      </span>
                      <div className="mt-2 flex min-h-12 items-center rounded-xl border border-white/10 bg-black/35 px-4 focus-within:border-purple-400/50">
                        <input
                          type="number"
                          min="0"
                          max={totalTeams}
                          step="1"
                          value={teamsFilled}
                          onChange={(event) =>
                            setTeamsFilled(Number(event.target.value))
                          }
                          className="min-w-0 flex-1 bg-transparent font-black outline-none"
                        />
                        <span className="font-black text-zinc-600">
                          /{totalTeams}
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black">
                        Discord Webhook
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] ${
                          saved?.webhookConfigured
                            ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                            : "border-red-400/25 bg-red-400/10 text-red-200"
                        }`}
                      >
                        {saved?.webhookConfigured
                          ? "Connected"
                          : "Missing"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-zinc-600">
                      {saved?.isPublished
                        ? "Future updates will edit the same Discord message."
                        : "The first update will create the permanent Discord message."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void publish(false)}
                    disabled={publishing || !saved?.webhookConfigured}
                    className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6d28d9,#9333ea,#d97706)] px-5 text-sm font-black uppercase tracking-[0.12em] transition active:scale-[0.985] disabled:opacity-45"
                  >
                    {publishing
                      ? "Updating Discord..."
                      : saved?.isPublished
                        ? "Update Prize Pot Embed"
                        : "Post Prize Pot Embed"}
                  </button>

                  {saved?.isPublished ? (
                    <button
                      type="button"
                      onClick={() => void publish(true)}
                      disabled={publishing}
                      className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black uppercase tracking-[0.1em] text-zinc-400 transition active:scale-[0.985]"
                    >
                      Repost as a New Message
                    </button>
                  ) : null}

                  <div className="text-center text-xs text-zinc-700">
                    Last published:{" "}
                    {formatDate(saved?.lastPublishedAt ?? null)}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-600">
                      Live Preview
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      Discord Embed Graphic
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPreviewVersion((current) => current + 1)
                    }
                    className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black uppercase tracking-[0.1em] active:scale-[0.98]"
                  >
                    Refresh
                  </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={`GOLD JACKET $${amount} prize pot preview`}
                    className="aspect-video h-auto w-full object-contain"
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Current Pot", `$${amount.toLocaleString("en-US")}`],
                    ["Teams Filled", `${teamsFilled}/${totalTeams}`],
                    ["Season", season],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/[0.08] bg-black/25 p-4"
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.17em] text-zinc-700">
                        {label}
                      </p>
                      <p className="mt-2 text-xl font-black">{value}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
