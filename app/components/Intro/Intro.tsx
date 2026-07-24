"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const ENDING_START_TIME = 12.2;
const AUDIO_FADE_SECONDS = 0.85;

const INTRO_SESSION_KEY = "new-era-intro-played";
const REPLAY_INTRO_EVENT = "new-era:replay-intro";

export function replayNewEraIntro() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(REPLAY_INTRO_EVENT));
}

export default function Intro({ children }: { children: ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioFadeFrameRef = useRef<number | null>(null);
  const finishingRef = useRef(false);
  const audioFadeStartedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [started, setStarted] = useState(false);
  const [showEnding, setShowEnding] = useState(false);
  const [introFadeOut, setIntroFadeOut] = useState(false);
  const [dashboardVisible, setDashboardVisible] = useState(false);

  const stopAnimationFrames = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioFadeFrameRef.current !== null) {
      cancelAnimationFrame(audioFadeFrameRef.current);
      audioFadeFrameRef.current = null;
    }
  }, []);

  const resetIntro = useCallback(() => {
    stopAnimationFrames();

    finishingRef.current = false;
    audioFadeStartedRef.current = false;

    setDashboardVisible(false);
    setIntroFadeOut(false);
    setShowEnding(false);
    setStarted(false);
    setShowIntro(true);

    window.requestAnimationFrame(() => {
      const video = videoRef.current;

      if (!video) return;

      video.pause();
      video.currentTime = 0;
      video.volume = 1;
      video.muted = false;
    });
  }, [stopAnimationFrames]);

  useEffect(() => {
    const introAlreadyPlayed =
      window.sessionStorage.getItem(INTRO_SESSION_KEY) === "true";

    if (introAlreadyPlayed) {
      setShowIntro(false);
      setDashboardVisible(true);
    } else {
      setShowIntro(true);
      setDashboardVisible(false);
    }

    setReady(true);

    function handleReplayIntro() {
      resetIntro();
    }

    window.addEventListener(REPLAY_INTRO_EVENT, handleReplayIntro);

    return () => {
      window.removeEventListener(REPLAY_INTRO_EVENT, handleReplayIntro);
      stopAnimationFrames();
    };
  }, [resetIntro, stopAnimationFrames]);

  const fadeAudio = useCallback(
    (durationMilliseconds: number, onComplete?: () => void) => {
      const video = videoRef.current;

      if (!video) {
        onComplete?.();
        return;
      }

      if (audioFadeFrameRef.current !== null) {
        cancelAnimationFrame(audioFadeFrameRef.current);
      }

      const startingVolume = video.volume;
      const startTime = performance.now();

      function lowerVolume(currentTime: number) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / durationMilliseconds, 1);

        if (videoRef.current) {
          videoRef.current.volume = Math.max(
            0,
            startingVolume * (1 - progress),
          );
        }

        if (progress < 1) {
          audioFadeFrameRef.current = requestAnimationFrame(lowerVolume);
          return;
        }

        audioFadeFrameRef.current = null;
        onComplete?.();
      }

      audioFadeFrameRef.current = requestAnimationFrame(lowerVolume);
    },
    [],
  );

  const completeIntro = useCallback(
    (skipImmediately = false) => {
      if (finishingRef.current) return;

      finishingRef.current = true;
      stopAnimationFrames();

      window.sessionStorage.setItem(INTRO_SESSION_KEY, "true");

      const video = videoRef.current;
      const fadeDuration = skipImmediately ? 250 : 650;

      fadeAudio(fadeDuration, () => {
        video?.pause();

        setIntroFadeOut(true);
        setDashboardVisible(true);

        window.setTimeout(() => {
          setShowIntro(false);
          setStarted(false);
          setShowEnding(false);
          setIntroFadeOut(false);

          finishingRef.current = false;
          audioFadeStartedRef.current = false;

          if (video) {
            video.currentTime = 0;
            video.volume = 1;
          }
        }, 750);
      });
    },
    [fadeAudio, stopAnimationFrames],
  );

  const monitorVideo = useCallback(() => {
    const video = videoRef.current;

    if (!video || video.paused || video.ended || finishingRef.current) {
      animationFrameRef.current = null;
      return;
    }

    if (video.currentTime >= ENDING_START_TIME && !showEnding) {
      setShowEnding(true);
    }

    if (
      Number.isFinite(video.duration) &&
      video.duration > 0 &&
      video.currentTime >= video.duration - AUDIO_FADE_SECONDS &&
      !audioFadeStartedRef.current
    ) {
      audioFadeStartedRef.current = true;
      fadeAudio(AUDIO_FADE_SECONDS * 1000);
    }

    animationFrameRef.current = requestAnimationFrame(monitorVideo);
  }, [fadeAudio, showEnding]);

  useEffect(() => {
    if (!started || !showIntro) return;

    animationFrameRef.current = requestAnimationFrame(monitorVideo);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [monitorVideo, showIntro, started]);

  async function startIntro() {
    const video = videoRef.current;

    if (!video) return;

    setStarted(true);

    video.currentTime = 0;
    video.muted = false;
    video.volume = 1;

    try {
      await video.play();
    } catch (error) {
      console.error("Video could not start:", error);
      completeIntro(true);
    }
  }

  if (!ready) {
    return <div className="fixed inset-0 z-[99999] bg-black" />;
  }

  return (
    <>
      <div
        className={`min-h-screen transition-all duration-500 ease-out ${
          dashboardVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-1 opacity-0"
        }`}
      >
        {children}
      </div>

      {showIntro && (
        <div
          className={`fixed inset-0 z-[99999] overflow-hidden bg-black transition-opacity duration-700 ${
            introFadeOut ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          {!started && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
              <button
                type="button"
                onClick={startIntro}
                className="rounded-full border border-white/20 bg-white/[0.08] px-8 py-4 text-sm font-bold uppercase tracking-[0.25em] text-white backdrop-blur-md transition duration-300 hover:border-white/40 hover:bg-white/[0.14] active:scale-95"
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
            onTimeUpdate={() => {
              const video = videoRef.current;

              if (
                video &&
                video.currentTime >= ENDING_START_TIME &&
                !showEnding
              ) {
                setShowEnding(true);
              }
            }}
            onEnded={() => completeIntro(false)}
          >
            <source src="/0723.mp4" type="video/mp4" />
          </video>

          <div
            className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black transition-opacity duration-150 ${
              showEnding ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.10)_0%,rgba(15,15,15,0.68)_38%,black_74%)]" />

            <div
              className={`relative flex w-full max-w-xl flex-col items-center px-8 transition-all duration-[1600ms] ease-out ${
                showEnding
                  ? "translate-y-0 scale-[1.015] opacity-100"
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
                  className="object-contain drop-shadow-[0_0_26px_rgba(255,255,255,0.16)]"
                />
              </div>

              <div
                className={`mt-3 flex w-full max-w-sm items-center gap-4 transition-all delay-150 duration-700 sm:mt-1 ${
                  showEnding
                    ? "translate-y-0 opacity-100"
                    : "translate-y-2 opacity-0"
                }`}
              >
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/60" />

                <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.42em] text-white/45 sm:text-xs">
                  The Beginning
                </p>

                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/60" />
              </div>

              <h2
                className={`mt-3 text-center text-4xl font-black uppercase tracking-[0.16em] text-white transition-all delay-300 duration-700 sm:text-5xl ${
                  showEnding
                    ? "translate-y-0 opacity-100"
                    : "translate-y-2 opacity-0"
                }`}
              >
                Season 1
              </h2>

              <div
                className={`mt-4 h-px bg-gradient-to-r from-transparent via-white to-transparent transition-all delay-500 duration-700 ${
                  showEnding ? "w-28 opacity-100" : "w-0 opacity-0"
                }`}
              />
            </div>
          </div>

          {started && (
            <button
              type="button"
              onClick={() => completeIntro(true)}
              className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 z-50 rounded-full border border-white/20 bg-black/65 px-5 py-2.5 text-xs font-semibold text-white/80 backdrop-blur-md transition hover:border-white/40 hover:text-white sm:bottom-8 sm:right-8"
            >
              Skip Intro
            </button>
          )}
        </div>
      )}
    </>
  );
}