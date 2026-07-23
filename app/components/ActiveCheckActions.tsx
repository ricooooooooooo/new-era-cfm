"use client";

import { useState } from "react";

export default function ActiveCheckActions() {
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function startActiveCheck() {
    if (isPosting) {
      return;
    }

    setIsPosting(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/active-check/start", {
        method: "POST",
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "The active check could not be posted.");
      }

      setMessage("Active check posted in Discord.");
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "The active check could not be posted.",
      );
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-bold text-zinc-500 opacity-60"
          title="Reminder functionality will be connected next."
        >
          Send Reminder
        </button>

        <button
          type="button"
          onClick={startActiveCheck}
          disabled={isPosting}
          className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPosting ? "Posting..." : "Start Active Check"}
        </button>
      </div>

      {message ? (
        <p
          className={[
            "mt-3 text-sm font-semibold",
            isError ? "text-red-400" : "text-emerald-400",
          ].join(" ")}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}