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
  const [showLogoOverlay, setShowLogoOverlay] = useState(false);

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

    if (video.currentTime >= 13.1) {
      setShowLogoOverlay(true);
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
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black">
          <button
            type="button"
            onClick={startIntro}
            className="rounded-full border border-white/30 bg-white/10 px-8 py-4 text-sm font-bold uppercase tracking-[0.25em] text-white backdrop-blur-md transition hover:bg-white hover:text-black active:scale-95"
          >
            TEST BUTTON
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
        className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black transition-opacity duration-500 ${
          showLogoOverlay ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`relative h-[78vw] max-h-[760px] w-[78vw] max-w-[760px] transition-transform duration-1000 ease-out ${
            showLogoOverlay ? "scale-100" : "scale-95"
          }`}
        >
          <div className="absolute inset-[12%] rounded-full bg-purple-700/20 blur-3xl" />

          <Image
            src="/ne-logo.png"
            alt="New Era CFM"
            fill
            priority
            sizes="(max-width: 768px) 78vw, 760px"
            className="relative object-contain drop-shadow-[0_0_35px_rgba(124,58,237,0.35)]"
          />
        </div>
      </div>

      {started && (
        <button
          type="button"
          onClick={finishIntro}
          className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 z-50 rounded-full border border-white/30 bg-black/60 px-5 py-2.5 text-xs font-semibold text-white backdrop-blur-md sm:bottom-8 sm:right-8 sm:px-6 sm:py-3 sm:text-sm"
        >
          Skip Intro
        </button>
      )}
    </div>
  );
}