"use client";

import { useEffect, useMemo, useState } from "react";

type PlayerHeadshotProps = {
  name: string;
  src: string | null;
  primary?: string;
  secondary?: string;
  size?: "small" | "large";
  className?: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function PlayerHeadshot({
  name,
  src,
  primary = "#7c3aed",
  secondary = "#d4af37",
  size = "small",
  className = "",
}: PlayerHeadshotProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const dimensions =
    size === "large"
      ? "h-52 w-52 sm:h-64 sm:w-64"
      : "h-12 w-12";

  const initialsText = useMemo(
    () => initials(name),
    [name],
  );

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-black/35 ${dimensions} ${className}`}
      style={{
        background: `radial-gradient(circle at 50% 18%, ${secondary}44, ${primary}35 45%, rgba(0,0,0,0.72) 100%)`,
        boxShadow:
          size === "large"
            ? `0 30px 90px ${primary}45`
            : undefined,
      }}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${name} headshot`}
          className="h-full w-full object-cover object-top"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span
            className={
              size === "large"
                ? "text-6xl font-black tracking-[-0.08em] text-white/80"
                : "text-sm font-black text-white/80"
            }
          >
            {initialsText}
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/[0.06]" />
    </div>
  );
}
