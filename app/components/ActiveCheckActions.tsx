"use client";

import { useState } from "react";

type ActiveCheckType = "league" | "weekly" | "waitlist";

type StartActiveCheckResponse = {
  success?: boolean;
  error?: string;
};

const activeCheckOptions: {
  value: ActiveCheckType;
  label: string;
  description: string;
}[] = [
  {
    value: "league",
    label: "League-Wide Activity",
    description: "Checks the activity of every current team owner.",
  },
  {
    value: "weekly",
    label: "Weekly Owner Check",
    description: "Runs an owner activity check for a specific league week.",
  },
  {
    value: "waitlist",
    label: "Waitlist Activity",
    description: "Checks which waitlist members are still active and available.",
  },
];

export default function ActiveCheckActions() {
  const [checkType, setCheckType] =
    useState<ActiveCheckType>("league");

  const [weekNumber, setWeekNumber] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const selectedOption = activeCheckOptions.find(
    (option) => option.value === checkType,
  );

  async function startActiveCheck() {
    if (isPosting) {
      return;
    }

    if (checkType === "weekly" && !weekNumber.trim()) {
      setIsError(true);
      setMessage("Enter the league week before launching this check.");
      return;
    }

    setIsPosting(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/active-check/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: checkType,
          week:
            checkType === "weekly"
              ? weekNumber.trim()
              : null,
          customMessage: customMessage.trim() || null,
        }),
      });

      const data =
        (await response.json()) as StartActiveCheckResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "The activity check could not be posted.",
        );
      }

      const successMessages: Record<ActiveCheckType, string> = {
        league:
          "League-wide activity check posted in Discord.",
        weekly:
          `Week ${weekNumber.trim()} activity check posted in Discord.`,
        waitlist:
          "Waitlist activity check posted in Discord.",
      };

      setMessage(successMessages[checkType]);
      setCustomMessage("");
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "The activity check could not be posted.",
      );
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div className="w-full lg:max-w-md">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <label
          htmlFor="active-check-type"
          className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500"
        >
          Activity Check Type
        </label>

        <select
          id="active-check-type"
          value={checkType}
          onChange={(event) => {
            setCheckType(event.target.value as ActiveCheckType);
            setMessage("");
            setIsError(false);
          }}
          disabled={isPosting}
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#111214] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-purple-400/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {activeCheckOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-[#111214] text-white"
            >
              {option.label}
            </option>
          ))}
        </select>

        <p className="mt-2 text-xs leading-5 text-zinc-500">
          {selectedOption?.description}
        </p>

        {checkType === "weekly" ? (
          <div className="mt-4">
            <label
              htmlFor="active-check-week"
              className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500"
            >
              League Week
            </label>

            <input
              id="active-check-week"
              type="number"
              min="1"
              max="30"
              inputMode="numeric"
              value={weekNumber}
              onChange={(event) => {
                setWeekNumber(event.target.value);
                setMessage("");
                setIsError(false);
              }}
              disabled={isPosting}
              placeholder="Example: 4"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#111214] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-purple-400/50 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        ) : null}

        <div className="mt-4">
          <label
            htmlFor="active-check-message"
            className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500"
          >
            Custom Note
            <span className="ml-2 text-zinc-700">Optional</span>
          </label>

          <textarea
            id="active-check-message"
            value={customMessage}
            onChange={(event) => {
              setCustomMessage(event.target.value);
              setMessage("");
              setIsError(false);
            }}
            disabled={isPosting}
            maxLength={500}
            rows={3}
            placeholder="Add any instructions, deadline, or announcement..."
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#111214] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-purple-400/50 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <p className="mt-1 text-right text-[10px] font-bold text-zinc-700">
            {customMessage.length}/500
          </p>
        </div>

        <button
          type="button"
          onClick={startActiveCheck}
          disabled={isPosting}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPosting
            ? "Posting Activity Check..."
            : "Launch Activity Check"}
        </button>
      </div>

      {message ? (
        <p
          className={[
            "mt-3 rounded-xl border px-4 py-3 text-sm font-semibold",
            isError
              ? "border-red-500/20 bg-red-500/[0.06] text-red-400"
              : "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400",
          ].join(" ")}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}