"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ActiveCheckType = "league" | "weekly" | "waitlist";

type TimerStatus = {
  success: boolean;
  check: {
    active_check_id: string;
    check_type: ActiveCheckType | "unknown";
    title: string | null;
    started_at: string;
    closes_at: string | null;
    status: "open" | "closed";
    show_timer: boolean;
    reminder_6h: boolean;
    reminder_2h: boolean;
    reminder_30m: boolean;
    final_dm: boolean;
  } | null;
  ownerCount: number;
  checkedCount: number;
  missingCount: number;
  error?: string;
};

type StartActiveCheckResponse = {
  success?: boolean;
  error?: string;
  closesAt?: string;
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

function countdownLabel(closesAt: string | null, now: number) {
  if (!closesAt) return "No timer attached";

  const remaining = new Date(closesAt).getTime() - now;
  if (remaining <= 0) return "Closing / closed";

  const totalMinutes = Math.ceil(remaining / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export default function ActiveCheckActions() {
  const [checkType, setCheckType] = useState<ActiveCheckType>("league");
  const [weekNumber, setWeekNumber] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [durationHours, setDurationHours] = useState("24");
  const [showTimer, setShowTimer] = useState(true);
  const [reminder6h, setReminder6h] = useState(true);
  const [reminder2h, setReminder2h] = useState(true);
  const [reminder30m, setReminder30m] = useState(true);
  const [finalDm, setFinalDm] = useState(false);
  const [timerStatus, setTimerStatus] = useState<TimerStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isPosting, setIsPosting] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const selectedOption = activeCheckOptions.find(
    (option) => option.value === checkType,
  );

  const loadTimerStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/active-check/timer", {
        cache: "no-store",
      });
      const data = (await response.json()) as TimerStatus;

      if (response.ok && data.success) {
        setTimerStatus(data);
      }
    } catch {
      // The main active-check page can still work if timer status fails.
    }
  }, []);

  useEffect(() => {
    void loadTimerStatus();
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [loadTimerStatus]);

  const currentCountdown = useMemo(
    () => countdownLabel(timerStatus?.check?.closes_at ?? null, now),
    [now, timerStatus?.check?.closes_at],
  );

  function validateDuration() {
    const value = Number(durationHours);

    if (!Number.isFinite(value) || value < 0.5 || value > 168) {
      setIsError(true);
      setMessage("Timer must be between 0.5 and 168 hours.");
      return null;
    }

    return value;
  }

  async function attachTimerToCurrentCheck() {
    if (isAttaching || !timerStatus?.check) return;

    const hoursRemaining = validateDuration();
    if (hoursRemaining === null) return;

    setIsAttaching(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/active-check/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeCheckId: timerStatus.check.active_check_id,
          hoursRemaining,
          showTimer,
          reminder6h,
          reminder2h,
          reminder30m,
          finalDm,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        discordWarning?: string | null;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error || "The timer could not be attached.");
      }

      setMessage(
        data.discordWarning
          ? `Timer attached without reposting. Discord timer display warning: ${data.discordWarning}`
          : "Timer attached to the CURRENT check. Nothing was reposted.",
      );
      await loadTimerStatus();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "The timer could not be attached.",
      );
    } finally {
      setIsAttaching(false);
    }
  }

  async function startActiveCheck() {
    if (isPosting) return;

    if (checkType === "weekly" && !weekNumber.trim()) {
      setIsError(true);
      setMessage("Enter the league week before launching this check.");
      return;
    }

    const validDuration = validateDuration();
    if (validDuration === null) return;

    setIsPosting(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/active-check/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: checkType,
          week: checkType === "weekly" ? weekNumber.trim() : null,
          customMessage: customMessage.trim() || null,
          durationHours: validDuration,
          showTimer,
          reminder6h,
          reminder2h,
          reminder30m,
          finalDm,
        }),
      });

      const data = (await response.json()) as StartActiveCheckResponse;

      if (!response.ok) {
        throw new Error(data.error || "The activity check could not be posted.");
      }

      const successMessages: Record<ActiveCheckType, string> = {
        league: "League-wide activity check posted with timer automation.",
        weekly: `Week ${weekNumber.trim()} activity check posted with timer automation.`,
        waitlist: "Waitlist activity check posted with timer automation.",
      };

      setMessage(successMessages[checkType]);
      setCustomMessage("");
      await loadTimerStatus();
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
      {timerStatus?.check ? (
        <div className="mb-4 rounded-2xl border border-purple-400/20 bg-purple-500/[0.05] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-300">
                Current Discord Check
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {timerStatus.check.title || "Current Active Check"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                ID {timerStatus.check.active_check_id}
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-black text-zinc-200">
              {currentCountdown}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-black/20 p-2">
              <p className="text-lg font-black text-emerald-400">
                {timerStatus.checkedCount}
              </p>
              <p className="text-[10px] font-bold uppercase text-zinc-600">In</p>
            </div>
            <div className="rounded-xl bg-black/20 p-2">
              <p className="text-lg font-black text-red-400">
                {timerStatus.missingCount}
              </p>
              <p className="text-[10px] font-bold uppercase text-zinc-600">Missing</p>
            </div>
            <div className="rounded-xl bg-black/20 p-2">
              <p className="text-lg font-black text-zinc-200">
                {timerStatus.ownerCount}
              </p>
              <p className="text-[10px] font-bold uppercase text-zinc-600">Owners</p>
            </div>
          </div>

          {!timerStatus.check.closes_at ? (
            <button
              type="button"
              onClick={attachTimerToCurrentCheck}
              disabled={isAttaching}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-3 text-sm font-black text-purple-200 transition hover:bg-purple-500/20 disabled:opacity-60"
            >
              {isAttaching
                ? "Attaching Timer..."
                : "Attach Timer — Don't Repost"}
            </button>
          ) : (
            <button
              type="button"
              onClick={attachTimerToCurrentCheck}
              disabled={isAttaching || timerStatus.check.status === "closed"}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-zinc-200 transition hover:bg-white/[0.08] disabled:opacity-40"
            >
              {isAttaching ? "Updating Timer..." : "Update Current Timer"}
            </button>
          )}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
          Timer / Reminder Settings
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="active-check-duration" className="text-xs font-bold text-zinc-400">
              Hours
            </label>
            <input
              id="active-check-duration"
              type="number"
              min="0.5"
              max="168"
              step="0.5"
              value={durationHours}
              onChange={(event) => setDurationHours(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#111214] px-3 py-2 text-sm font-bold text-white outline-none focus:border-purple-400/50"
            />
          </div>
          <label className="flex items-center gap-2 self-end rounded-xl border border-white/10 bg-[#111214] px-3 py-2 text-xs font-bold text-zinc-300">
            <input
              type="checkbox"
              checked={showTimer}
              onChange={(event) => setShowTimer(event.target.checked)}
            />
            Show timer
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-zinc-300">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111214] p-2">
            <input type="checkbox" checked={reminder6h} onChange={(e) => setReminder6h(e.target.checked)} />
            6h tag
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111214] p-2">
            <input type="checkbox" checked={reminder2h} onChange={(e) => setReminder2h(e.target.checked)} />
            2h tag
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111214] p-2">
            <input type="checkbox" checked={reminder30m} onChange={(e) => setReminder30m(e.target.checked)} />
            30m final tag
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111214] p-2">
            <input type="checkbox" checked={finalDm} onChange={(e) => setFinalDm(e.target.checked)} />
            Final DM too
          </label>
        </div>

        <div className="my-4 h-px bg-white/10" />

        <label htmlFor="active-check-type" className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
          New Activity Check Type
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
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#111214] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-purple-400/50 disabled:opacity-60"
        >
          {activeCheckOptions.map((option) => (
            <option key={option.value} value={option.value} className="bg-[#111214] text-white">
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs leading-5 text-zinc-500">{selectedOption?.description}</p>

        {checkType === "weekly" ? (
          <div className="mt-4">
            <label htmlFor="active-check-week" className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
              League Week
            </label>
            <input
              id="active-check-week"
              type="number"
              min="1"
              max="30"
              inputMode="numeric"
              value={weekNumber}
              onChange={(event) => setWeekNumber(event.target.value)}
              disabled={isPosting}
              placeholder="Example: 4"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#111214] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-purple-400/50 disabled:opacity-60"
            />
          </div>
        ) : null}

        <div className="mt-4">
          <label htmlFor="active-check-message" className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
            Custom Note <span className="ml-2 text-zinc-700">Optional</span>
          </label>
          <textarea
            id="active-check-message"
            value={customMessage}
            onChange={(event) => setCustomMessage(event.target.value)}
            disabled={isPosting}
            maxLength={500}
            rows={3}
            placeholder="Add any instructions or announcement..."
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#111214] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-purple-400/50 disabled:opacity-60"
          />
          <p className="mt-1 text-right text-[10px] font-bold text-zinc-700">{customMessage.length}/500</p>
        </div>

        <button
          type="button"
          onClick={startActiveCheck}
          disabled={isPosting}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-500 disabled:opacity-60"
        >
          {isPosting ? "Posting Activity Check..." : "Launch New Activity Check"}
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
