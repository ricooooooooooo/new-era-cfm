"use client";

type TickerItem = {
  label: string;
  text: string;
};

const tickerItems: TickerItem[] = [
  {
    label: "LEAGUE NEWS",
    text: "Welcome to the NEW ERA CFM",
  },
  {
    label: "ADVANCE",
    text: "League advance information will appear here",
  },
  {
    label: "GAME OF THE WEEK",
    text: "Featured matchup coming soon",
  },
  {
    label: "TRADE ALERT",
    text: "Official league transactions will appear here",
  },
  {
    label: "OPEN TEAMS",
    text: "Check Discord for available franchises",
  },
  {
    label: "NEW ERA",
    text: "A new generation of connected franchise",
  },
];

function TickerGroup() {
  return (
    <div className="flex shrink-0 items-center">
      {tickerItems.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className="flex shrink-0 items-center"
        >
          <div className="flex shrink-0 items-center gap-2 px-5 sm:gap-3 sm:px-7">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 sm:text-[11px]">
              {item.label}
            </span>

            <span className="whitespace-nowrap text-xs font-semibold text-zinc-100 sm:text-sm">
              {item.text}
            </span>
          </div>

          <span
            aria-hidden="true"
            className="h-1 w-1 shrink-0 rotate-45 bg-zinc-500"
          />
        </div>
      ))}
    </div>
  );
}

export default function NewsTicker() {
  return (
    <section
      aria-label="NEW ERA league news"
      className="relative flex h-11 overflow-hidden border-b border-white/10 bg-[#0c0d0e] shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
    >
      <div className="relative z-20 flex h-full shrink-0 items-center border-r border-white/15 bg-gradient-to-r from-zinc-100 to-zinc-300 px-4 text-black shadow-[8px_0_24px_rgba(0,0,0,0.45)] sm:px-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black/40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-black" />
          </span>

          <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] sm:text-xs">
            NEW ERA
          </span>

          <span className="hidden text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600 sm:inline">
            Network
          </span>
        </div>
      </div>

      <div className="ticker-window group relative flex min-w-0 flex-1 items-center overflow-hidden">
        <div className="ticker-track flex w-max items-center group-hover:[animation-play-state:paused]">
          <TickerGroup />
          <TickerGroup />
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#0c0d0e] to-transparent sm:w-16" />

        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#0c0d0e] to-transparent sm:w-16" />
      </div>
    </section>
  );
}