"use client";

import { useEffect, useRef, useState } from "react";

export default function DiscordIntroPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [started, setStarted] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [syncFinished, setSyncFinished] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function syncMember() {
      try {
        const response = await fetch("/api/member/sync", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          console.error("Member sync failed:", result);
        } else {
          console.log("Member sync successful:", result);
        }
      } catch (error) {
        console.error("Member sync request failed:", error);
      } finally {
        if (!cancelled) {
          setSyncFinished(true);
        }
      }
    }

    syncMember();

    return () => {
      cancelled = true;
    };
  }, []);

  async function startIntro() {
    const video = videoRef.current;

    if (!video) return;

    setFadeOut(true);

    setTimeout(async () => {
      setStarted(true);

      try {
        video.currentTime = 0;
        video.volume = 1;
        video.muted = false;

        await video.play();
      } catch (error) {
        console.error("Intro video failed to play:", error);
      }
    }, 700);
  }

  function finishIntro() {
    window.location.replace("/");
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      {!started && (
        <div
          className={`absolute inset-0 flex items-center justify-center px-5 transition-opacity duration-700 ${
            fadeOut ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="w-full max-w-xl rounded-3xl border border-purple-700/40 bg-zinc-950/90 p-8 text-center shadow-2xl backdrop-blur sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-purple-400">
              NEW ERA CFM
            </p>

            <h1 className="mt-5 text-4xl font-black sm:text-5xl">
              Discord Linked
            </h1>

            <p className="mt-6 leading-7 text-zinc-400">
              Thank you for connecting your Discord account.
            </p>

            <p className="mt-2 leading-7 text-zinc-500">
              Welcome to the league.
            </p>

            <button
              type="button"
              onClick={startIntro}
              className="mt-10 rounded-full bg-purple-600 px-10 py-4 text-sm font-black uppercase tracking-[0.25em] shadow-[0_0_30px_rgba(147,51,234,0.28)] transition duration-200 hover:scale-[1.02] hover:bg-purple-500 active:scale-95"
            >
              Enter New Era
            </button>

            {!syncFinished && (
              <p className="mt-4 text-xs text-zinc-600">
                Finalizing your league profile…
              </p>
            )}
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full bg-black object-contain ${
          started ? "block" : "hidden"
        }`}
        playsInline
        preload="auto"
        onEnded={finishIntro}
      >
        <source src="/discord-intro.mp4" type="video/mp4" />
      </video>

      {started && (
        <button
          type="button"
          onClick={finishIntro}
          className="absolute bottom-8 right-8 rounded-full border border-white/20 bg-black/60 px-5 py-2 text-sm font-semibold backdrop-blur transition hover:border-white/40"
        >
          Skip Intro
        </button>
      )}
    </main>
  );
}