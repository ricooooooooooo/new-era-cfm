"use client";

import Image from "next/image";
import { useRef, useState } from "react";

const ENDING_START_TIME = 12.2;

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

    if (!video || showEnding) return;

    if (video.currentTime >= ENDING_START_TIME) {
      setShowEnding(true);
    }
  }

  function finishIntro() {
    if (fadeOut) return;

    setFadeOut(true);

    window.setTimeout(() => {
      setFinished(true);
    }, 700);
  }

  if (finished) {
    return <>{children}</>;
  }

  return (
    <div
      className={`fixed inset-0 z-[99999] overflow-hidden bg-black transition-opacity duration-700 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {!started && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
          <button
            type="button"
            onClick={startIntro}
            className="rounded-full border border-white/25 bg-white/10 px-8 py-4 text-sm font-bold uppercase tracking-[0.25em] text-white backdrop-blur-md transition hover:bg-white hover:text-black active:scale-95"
          >
            Enter New Era
          </button>
        </div>
      )}

      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full bg-black object-contain ${
          showEnding ? "invisible" : "visible"
        }`}
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={finishIntro}
      >
        <source src="/0723.mp4" type="video/mp4" />
      </video>

      <div
        className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black transition-opacity duration-200 ${
          showEnding ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(88,28,135,0.28)_0%,rgba(15,5,25,0.65)_35%,black_72%)]" />

        <div
          className={`relative flex w-full max-w-xl flex-col items-center px-8 transition-all duration-700 ease-out ${
            showEnding
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-2 scale-[0.97] opacity-0"
          }`}
        >
          <div className="relative h-[48vw] max-h-[390px] min-h-[250px] w-[74vw] max-w-[560px]">
            <Image
              src="/ne-logo.png"
              alt="New Era CFM"
              fill
              priority
              sizes="(max-width: 768px) 74vw, 560px"
              className="object-contain drop-shadow-[0_0_26px_rgba(126,34,206,0.45)]"
            />
          </div>

          <div className="-mt-5 flex w-full max-w-sm items-center gap-4 sm:-mt-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-purple-500/80" />

            <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.42em] text-white/45 sm:text-xs">
              The Beginning
            </p>

            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-purple-500/80" />
          </div>

          <h2 className="mt-4 text-center text-4xl font-black uppercase tracking-[0.16em] text-white sm:text-5xl">
            Season 1
          </h2>

          <div className="mt-4 h-px w-28 bg-gradient-to-r from-transparent via-purple-400 to-transparent" />
        </div>
      </div>

      {started && (
        <button
          type="button"
          onClick={finishIntro}
          className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 z-50 rounded-full border border-white/20 bg-black/65 px-5 py-2.5 text-xs font-semibold text-white/80 backdrop-blur-md transition hover:border-white/40 hover:text-white sm:bottom-8 sm:right-8"
        >
          Skip Intro
        </button>
      )}
    </div>
  );
}