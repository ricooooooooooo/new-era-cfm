"use client";

import { useCallback, useEffect, useState } from "react";

type TimerResponse = {
  success: boolean;
  active: boolean;
  timer?: {
    deadlineAt: string;
  };
  serverNow?: string;
};

function formatRemaining(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export default function AdvanceCountdown() {
  const [active, setActive] = useState(false);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    null,
  );

  const refreshTimer = useCallback(async () => {
    try {
      const response = await fetch("/api/league/advance-timer", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = (await response.json()) as TimerResponse;

      if (!data.success || !data.active) {
        setActive(false);
        setDeadlineMs(null);
        setRemainingSeconds(null);
        return;
      }

      if (!data.timer?.deadlineAt || !data.serverNow) return;

      const nextDeadlineMs = Date.parse(data.timer.deadlineAt);
      const serverNowMs = Date.parse(data.serverNow);

      if (!Number.isFinite(nextDeadlineMs) || !Number.isFinite(serverNowMs)) {
        return;
      }

      setActive(true);
      setDeadlineMs(nextDeadlineMs);
      setClockOffsetMs(serverNowMs - Date.now());
      setRemainingSeconds(
        Math.max(
          0,
          Math.ceil((nextDeadlineMs - serverNowMs) / 1000),
        ),
      );
    } catch {
      // Keep the last valid timer state if one poll fails.
    }
  }, []);

  useEffect(() => {
    void refreshTimer();

    const poll = window.setInterval(() => {
      void refreshTimer();
    }, 30_000);

    return () => window.clearInterval(poll);
  }, [refreshTimer]);

  useEffect(() => {
    if (!active || deadlineMs == null) return;

    const tick = () => {
      const nowMs = Date.now() + clockOffsetMs;
      setRemainingSeconds(
        Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000)),
      );
    };

    tick();
    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [active, deadlineMs, clockOffsetMs]);

  if (!active || remainingSeconds == null) {
    return null;
  }

  const due = remainingSeconds === 0;

  return (
    <div
      className="hidden shrink-0 items-center gap-2.5 rounded-full border border-[#d7b56d]/24 bg-black/25 px-3.5 py-2 text-[#ead08a] shadow-[inset_0_1px_0_rgba(255,255,255,.035)] backdrop-blur-sm sm:flex"
      title="Gold Jacket advances every 48 hours after the league begins."
    >
      <span className="text-[8px] font-black uppercase tracking-[0.17em] text-[#b9974f]">
        {due ? "Advance" : "Advance In"}
      </span>
      <span className="font-mono text-[10px] font-black tabular-nums tracking-[0.08em] text-[#f1d98f]">
        {due ? "DUE" : formatRemaining(remainingSeconds)}
      </span>
    </div>
  );
}
