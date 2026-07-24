"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export default function Intro({
  children,
}: {
  children: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [showEnding, setShowEnding] = useState(false);

  async function startIntro() {
    const video = videoRef.current;

    if (!video) return;

    setStarted(true);

    video.muted = false;
    video.volume = 1;

    try {
      await video.play();
    } catch (error) {
      console.error("Video could not start:", error);
    }
  }

  function handleTimeUpdate() {
    const video = videoRef.current;

    if (!video) return;

    // Starts before the blurry video logo appears.
    if (video.currentTime >= 12.65) {
      setShowEnding(true);
    }
  }

  function finishIntro() {
    if (fadeOut) return;

    setFadeOut(true);

    window.setTimeout(() => {
      setFinished(true);
    }, 900);
  }

  if (finished) {
    return <>{children}</>;
  }

  return (
    <div
      className={`fixed inset-0 z-[99999] overflow-hidden bg-black transition-opacity duration-1000 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {!started && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
          <button
            type="button"
            onClick={startIntro}
            className="rounded-full border border-white/25 bg-white/10 px-8 py-4 text-sm font-bold uppercase tracking-[0.28em] text-white backdrop-blur-md transition duration-300 hover:border-purple-400/60 hover:bg-purple-500/20 active:scale-95"
          >
            Enter New Era
          </button>
        </div>
      )}

      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full bg-black object-contain"
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={finishIntro}
      >
        <source src="/0723.mp4" type="video/mp4" />
      </video>

      <div
        className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-black transition-opacity duration-300 ${
          showEnding ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(109,40,217,0.22),transparent_45%)]" />

        <div className="absolute inset-0 opacity-30">
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-700/20 blur-[120px]" />
        </div>

        <div
          className={`relative flex w-full max-w-4xl flex-col items-center justify-center px-6 transition-all duration-700 ease-out ${
            showEnding
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-3 scale-95 opacity-0"
          }`}
        >
          <div className="relative h-[58vw] max-h-[540px] w-[82vw] max-w-[720px]">
            <Image
              src="/ne-logo.png"
              alt="New Era CFM"
              fill
              priority
              sizes="(max-width: 768px) 82vw, 720px"
              className="object-contain drop-shadow-[0_0_28px_rgba(126,34,206,0.38)]"
            />
          </div>

          <div className="-mt-6 flex w-full max-w-md items-center gap-4 sm:-mt-10">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-400/70 to-purple-300" />

            <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.5em] text-purple-200 sm:text-xs">
              Connected Franchise
            </p>

            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-purple-400/70 to-purple-300" />
          </div>

          <div
            className={`mt-6 transition-all delay-200 duration-700 ${
              showEnding
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0"
            }`}
          >
            <p className="text-center text-xs font-medium uppercase tracking-[0.55em] text-white/50">
              The Beginning
            </p>

            <h2 className="mt-2 text-center text-3xl font-black uppercase tracking-[0.18em] text-white sm:text-5xl">
              Season 1
            </h2>

            <div className="mx-auto mt-4 h-[2px] w-24 bg-gradient-to-r from-transparent via-purple-400 to-transparent" />
          </div>
        </div>
      </div>

      {started && (
        <button
          type="button"
          onClick={finishIntro}
          className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 z-50 rounded-full border border-white/20 bg-black/60 px-5 py-2.5 text-xs font-semibold text-white/80 backdrop-blur-md transition hover:border-white/40 hover:text-white sm:bottom-8 sm:right-8 sm:px-6 sm:py-3 sm:text-sm"
        >
          Skip Intro
        </button>
      )}
    </div>
  );
}