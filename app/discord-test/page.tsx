"use client";

import { useState } from "react";
import AppLayout from "../components/layout/AppLayout";

type TestDmResponse = {
  success: boolean;
  message: string;
};

export default function DiscordTestPage() {
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<TestDmResponse | null>(null);

  async function sendTestDm() {
    setIsSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/discord/test-dm", {
        method: "POST",
      });

      const data = (await response.json()) as TestDmResponse;

      setResult(data);
    } catch {
      setResult({
        success: false,
        message:
          "The request failed before reaching Discord. Make sure your development server is running.",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
          <div className="h-1.5 bg-red-600" />

          <div className="p-8 md:p-10">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-red-500">
              Gold Jacket CFM
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Discord DM Test
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
              Press the button below to send a test activity-warning DM to the
              Discord account saved in your .env.local file.
            </p>

            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                Test Message
              </p>

              <p className="mt-3 font-black text-white">
                ⚠️ Gold Jacket CFM Activity Warning
              </p>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Activity rate: 71% · Games played: 5/7 · Status: Warning
              </p>
            </div>

            <button
              type="button"
              onClick={sendTestDm}
              disabled={isSending}
              className="mt-8 rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {isSending ? "Sending DM..." : "Send Test Discord DM"}
            </button>

            {result && (
              <div
                className={`mt-6 rounded-2xl border p-5 ${
                  result.success
                    ? "border-emerald-900 bg-emerald-950/40"
                    : "border-red-900 bg-red-950/40"
                }`}
              >
                <p
                  className={`font-black ${
                    result.success
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {result.success ? "DM Sent" : "DM Failed"}
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {result.message}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}