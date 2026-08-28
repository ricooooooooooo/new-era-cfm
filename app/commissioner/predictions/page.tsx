"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "@/app/components/layout/AppLayout";

type PredictionOption = {
  id: string;
  market_id: string;
  label: string;
};

type PredictionMarket = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  closes_at: string | null;
  winning_option: string | null;
  created_at: string;
  auto_generated: boolean;
  season: number | null;
  week: number | null;
  prediction_options: PredictionOption[];
};

type AutomationResponse = {
  settings: {
    enabled: boolean;
    auto_grade: boolean;
    close_minutes_before: number;
    templates: string[];
    discord_post_enabled: boolean;
  };
  league: {
    id: string;
    season: number;
    currentWeek: number;
  };
  counts: {
    currentWeekGames: number;
    currentWeekAutoMarkets: number;
  };
};

export default function CommissionerPredictionsPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [automation, setAutomation] =
    useState<AutomationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [gradingMarketId, setGradingMarketId] = useState<string | null>(null);
  const [deletingMarketId, setDeletingMarketId] = useState<string | null>(null);
  const [selectedWinners, setSelectedWinners] = useState<Record<string, string>>(
    {},
  );

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const cleanOptions = useMemo(
    () => options.map((option) => option.trim()).filter(Boolean),
    [options],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [marketsResponse, automationResponse] = await Promise.all([
        fetch("/api/prediction-markets", { cache: "no-store" }),
        fetch("/api/predictions/automation", { cache: "no-store" }),
      ]);

      const marketsData = await marketsResponse.json();
      const automationData = await automationResponse.json();

      if (!marketsResponse.ok) {
        throw new Error(
          marketsData.error ?? "Failed to load prediction markets.",
        );
      }

      if (!automationResponse.ok) {
        throw new Error(
          automationData.error ?? "Failed to load market automation.",
        );
      }

      setMarkets(Array.isArray(marketsData) ? marketsData : []);
      setAutomation(automationData as AutomationResponse);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load prediction controls.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function updateAutomation(
    key: keyof AutomationResponse["settings"],
    value: boolean | number | string[],
  ) {
    setAutomation((current) =>
      current
        ? {
            ...current,
            settings: {
              ...current.settings,
              [key]: value,
            },
          }
        : current,
    );
  }

  async function saveAutomation() {
    if (!automation || savingAutomation) return;

    setSavingAutomation(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/predictions/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: automation.settings.enabled,
          autoGrade: automation.settings.auto_grade,
          closeMinutesBefore:
            automation.settings.close_minutes_before,
          templates: automation.settings.templates,
          discordPostEnabled:
            automation.settings.discord_post_enabled,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save automation.");
      }

      setMessage("Prediction automation settings saved.");
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save automation.",
      );
    } finally {
      setSavingAutomation(false);
    }
  }

  async function generateCurrentWeek() {
    if (!automation || generating) return;

    setGenerating(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/predictions/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season: automation.league.season,
          week: automation.league.currentWeek,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to generate markets.");
      }

      setMessage(
        `Week ${data.week}: ${data.createdMarkets} markets created and ${data.settledMarkets} settled.`,
      );
      await loadData();
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Unable to generate markets.",
      );
    } finally {
      setGenerating(false);
    }
  }

  function updateOption(index: number, value: string) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    );
  }

  async function createMarket() {
    if (creating) return;

    setMessage("");
    setError("");

    if (!title.trim() || cleanOptions.length < 2) {
      setError("Enter a title and at least two options.");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/prediction-markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          closesAt: closesAt || null,
          options: cleanOptions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create market.");
      }

      setTitle("");
      setDescription("");
      setClosesAt("");
      setOptions(["", ""]);
      setMessage("Manual market created.");
      await loadData();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create market.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function gradeMarket(marketId: string) {
    const optionId = selectedWinners[marketId];

    if (!optionId || gradingMarketId) {
      setError("Choose the winning option first.");
      return;
    }

    if (
      !window.confirm(
        "Grade this market and immediately pay every winning bettor?",
      )
    ) {
      return;
    }

    setGradingMarketId(marketId);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/grade-market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId, optionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to grade market.");
      }

      setMessage(
        `Market graded. ${data.paidBets ?? 0} winning bets paid for ${Number(
          data.totalPaid ?? 0,
        ).toLocaleString()} Gold Jacket Credits.`,
      );
      await loadData();
    } catch (gradeError) {
      setError(
        gradeError instanceof Error
          ? gradeError.message
          : "Failed to grade market.",
      );
    } finally {
      setGradingMarketId(null);
    }
  }

  async function deleteMarket(marketId: string) {
    if (deletingMarketId) return;

    if (
      !window.confirm(
        "Delete this market? Open bets will be refunded by the existing refund route.",
      )
    ) {
      return;
    }

    setDeletingMarketId(marketId);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/delete-market", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete market.");
      }

      setMessage(
        `Market deleted. ${Number(
          data.totalRefunded ?? 0,
        ).toLocaleString()} Gold Jacket Credits refunded.`,
      );
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete market.",
      );
    } finally {
      setDeletingMarketId(null);
    }
  }

  return (
    <AppLayout>
      <main className="min-h-[calc(100vh-8rem)] bg-[#050606] px-5 py-8 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">
              Commissioner Sportsbook Control
            </p>
            <h1 className="mt-3 text-5xl font-black tracking-[-0.06em]">
              Prediction Market Engine
            </h1>
            <p className="mt-4 max-w-3xl text-zinc-400">
              Madden schedule imports create one winner market per game,
              close betting at kickoff and grade every final automatically.
            </p>
          </div>

          {message ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-bold text-red-200">
              {error}
            </div>
          ) : null}

          {loading || !automation ? (
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-zinc-500">
              Loading prediction controls...
            </div>
          ) : (
            <>
              <section className="mt-8 rounded-3xl border border-amber-400/20 bg-amber-400/[0.045] p-6 sm:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200">
                      Automatic Market Engine
                    </p>
                    <h2 className="mt-2 text-3xl font-black">
                      Season {automation.league.season} • Week{" "}
                      {automation.league.currentWeek}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">
                        Games
                      </p>
                      <p className="mt-2 text-3xl font-black">
                        {automation.counts.currentWeekGames}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">
                        Auto Markets
                      </p>
                      <p className="mt-2 text-3xl font-black">
                        {automation.counts.currentWeekAutoMarkets}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-7 grid gap-4 lg:grid-cols-2">
                  {[
                    {
                      label: "Automatic game markets",
                      description:
                        "Create a winner market for every imported matchup.",
                      checked: automation.settings.enabled,
                      change: (checked: boolean) =>
                        updateAutomation("enabled", checked),
                    },
                    {
                      label: "Automatic final-score grading",
                      description:
                        "Pay winning bets when Madden reports the final score.",
                      checked: automation.settings.auto_grade,
                      change: (checked: boolean) =>
                        updateAutomation("auto_grade", checked),
                    },
                    {
                      label: "Discord weekly market post",
                      description:
                        "Post a batch announcement when new markets are created.",
                      checked: automation.settings.discord_post_enabled,
                      change: (checked: boolean) =>
                        updateAutomation(
                          "discord_post_enabled",
                          checked,
                        ),
                    },
                  ].map((item) => (
                    <label
                      key={item.label}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(event) =>
                          item.change(event.target.checked)
                        }
                        className="mt-1 h-4 w-4"
                      />
                      <span>
                        <span className="block font-black">
                          {item.label}
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-zinc-500">
                          {item.description}
                        </span>
                      </span>
                    </label>
                  ))}

                  <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <span className="block font-black">
                      Close before kickoff
                    </span>
                    <span className="mt-1 block text-sm text-zinc-500">
                      Minutes before the scheduled game time.
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={
                        automation.settings.close_minutes_before
                      }
                      onChange={(event) =>
                        updateAutomation(
                          "close_minutes_before",
                          Number(event.target.value),
                        )
                      }
                      className="mt-3 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-white outline-none focus:border-amber-400"
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void saveAutomation()}
                    disabled={savingAutomation}
                    className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] hover:bg-amber-500 disabled:opacity-50"
                  >
                    {savingAutomation
                      ? "Saving..."
                      : "Save Automation"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void generateCurrentWeek()}
                    disabled={generating}
                    className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black uppercase tracking-[0.12em] hover:bg-white/[0.1] disabled:opacity-50"
                  >
                    {generating
                      ? "Generating..."
                      : "Generate Current Week Now"}
                  </button>
                </div>
              </section>

              <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                  Manual Backup
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  Create a Custom Market
                </h2>

                <div className="mt-6 grid gap-4">
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Market title"
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-zinc-700 focus:border-amber-400"
                  />

                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    placeholder="Description"
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-zinc-700 focus:border-amber-400"
                  />

                  <input
                    type="datetime-local"
                    value={closesAt}
                    onChange={(event) => setClosesAt(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-amber-400"
                  />

                  {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        value={option}
                        onChange={(event) =>
                          updateOption(index, event.target.value)
                        }
                        placeholder={`Option ${index + 1}`}
                        className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-zinc-700 focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setOptions((current) =>
                            current.length <= 2
                              ? current
                              : current.filter(
                                  (_, optionIndex) =>
                                    optionIndex !== index,
                                ),
                          )
                        }
                        disabled={options.length <= 2}
                        className="rounded-2xl border border-white/10 px-4 text-zinc-500 disabled:opacity-30"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() =>
                        setOptions((current) => [...current, ""])
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-black"
                    >
                      + Add Option
                    </button>
                    <button
                      type="button"
                      onClick={() => void createMarket()}
                      disabled={creating}
                      className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] hover:bg-amber-500 disabled:opacity-50"
                    >
                      {creating ? "Creating..." : "Create Custom Market"}
                    </button>
                  </div>
                </div>
              </section>

              <section className="mt-8">
                <div className="mb-5">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                    Market Control
                  </p>
                  <h2 className="mt-2 text-3xl font-black">
                    Existing Markets
                  </h2>
                </div>

                {markets.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-10 text-center text-zinc-500">
                    No markets yet.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {markets.map((market) => {
                      const graded = market.status === "graded";

                      return (
                        <article
                          key={market.id}
                          className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
                        >
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-xl font-black">
                                  {market.title}
                                </h3>
                                <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-zinc-400">
                                  {market.status}
                                </span>
                                {market.auto_generated ? (
                                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-amber-200">
                                    Auto
                                  </span>
                                ) : null}
                              </div>
                              {market.description ? (
                                <p className="mt-2 text-sm text-zinc-500">
                                  {market.description}
                                </p>
                              ) : null}
                            </div>

                            <div className="w-full max-w-md space-y-3">
                              {!graded ? (
                                <>
                                  <select
                                    value={
                                      selectedWinners[market.id] ?? ""
                                    }
                                    onChange={(event) =>
                                      setSelectedWinners((current) => ({
                                        ...current,
                                        [market.id]:
                                          event.target.value,
                                      }))
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-amber-400"
                                  >
                                    <option value="">
                                      Choose manual winner
                                    </option>
                                    {(
                                      market.prediction_options ?? []
                                    ).map((option) => (
                                      <option
                                        key={option.id}
                                        value={option.id}
                                      >
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void gradeMarket(market.id)
                                    }
                                    disabled={
                                      gradingMarketId === market.id
                                    }
                                    className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-[0.1em] hover:bg-emerald-500 disabled:opacity-50"
                                  >
                                    {gradingMarketId === market.id
                                      ? "Grading..."
                                      : "Grade & Pay"}
                                  </button>
                                </>
                              ) : (
                                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-center text-sm font-black text-emerald-200">
                                  Settled and paid
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  void deleteMarket(market.id)
                                }
                                disabled={
                                  deletingMarketId === market.id
                                }
                                className="w-full rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.1em] text-red-200 hover:bg-red-500/15 disabled:opacity-50"
                              >
                                {deletingMarketId === market.id
                                  ? "Deleting..."
                                  : "Delete Market"}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
