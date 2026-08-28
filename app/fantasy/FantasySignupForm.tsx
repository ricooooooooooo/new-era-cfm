"use client";

import { FormEvent, useState } from "react";

type SignupState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export default function FantasySignupForm() {
  const [state, setState] = useState<SignupState>({ type: "idle" });
  const [discordUsername, setDiscordUsername] = useState("");
  const [sleeperUsername, setSleeperUsername] = useState("");
  const [teamName, setTeamName] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.type === "loading") return;

    setState({ type: "loading" });

    try {
      const response = await fetch("/api/fantasy/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordUsername,
          sleeperUsername,
          teamName,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit your signup.");
      }

      setState({
        type: "success",
        message: data.message || "You’re on the Gold Jacket Fantasy list.",
      });
      setDiscordUsername("");
      setSleeperUsername("");
      setTeamName("");
    } catch (error) {
      setState({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to submit your signup.",
      });
    }
  }

  const inputClass =
    "mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-300/45 focus:bg-black/45";

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] border border-[#d7b35a]/25 bg-[#0e0e0c]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,.45)] sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300/75">Join The League</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Claim a fantasy spot</h2>
        </div>
        <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-amber-200">10 Teams</span>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="text-xs font-black uppercase tracking-[0.12em] text-zinc-500">
          Discord Username
          <input
            className={inputClass}
            value={discordUsername}
            onChange={(event) => setDiscordUsername(event.target.value)}
            placeholder="rico"
            autoComplete="off"
            maxLength={64}
            required
          />
        </label>

        <label className="text-xs font-black uppercase tracking-[0.12em] text-zinc-500">
          Sleeper Username
          <input
            className={inputClass}
            value={sleeperUsername}
            onChange={(event) => setSleeperUsername(event.target.value)}
            placeholder="@yourname"
            autoComplete="off"
            maxLength={64}
            required
          />
        </label>

        <label className="text-xs font-black uppercase tracking-[0.12em] text-zinc-500">
          Team Name <span className="normal-case tracking-normal text-zinc-700">(optional)</span>
          <input
            className={inputClass}
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            placeholder="You can decide later"
            autoComplete="off"
            maxLength={80}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={state.type === "loading"}
        className="mt-6 w-full rounded-2xl bg-[#e7c66d] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-black transition hover:bg-[#f1d884] active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
      >
        {state.type === "loading" ? "Submitting…" : "Join Gold Jacket Fantasy"}
      </button>

      {state.type === "success" ? (
        <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-sm font-semibold text-emerald-200">{state.message}</p>
      ) : null}

      {state.type === "error" ? (
        <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm font-semibold text-red-200">{state.message}</p>
      ) : null}
    </form>
  );
}
