"use client";

type TickerItem = {
  label: string;
  text: string;
};

const tickerItems: TickerItem[] = [
  {
    label: "LEAGUE NEWS",
    text: "Welcome to Gold Jacket CFM",
  },
  {
    label: "ADVANCE",
    text: "Gold Jacket advance information will appear here",
  },
  {
    label: "GAME OF THE WEEK",
    text: "Featured matchup coming soon",
  },
  {
    label: "GOLD JACKET WATCH",
    text: "Every franchise begins with a 70 OVR, 20-year-old Superstar legend",
  },
  {
    label: "TRADE ALERT",
    text: "Official league transactions will appear here",
  },
  {
    label: "POWER RANKINGS",
    text: "The first Gold Jacket power rankings drop after launch",
  },
];

function TickerGroup() {
  return (
    <div className="flex shrink-0 items-center">
      {tickerItems.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex shrink-0 items-center">
          <div className="flex shrink-0 items-center gap-2 px-5 sm:gap-3 sm:px-7">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/75 sm:text-[11px]">
              {item.label}
            </span>
            <span className="whitespace-nowrap text-xs font-semibold text-zinc-100 sm:text-sm">
              {item.text}
            </span>
          </div>
          <span aria-hidden="true" className="h-1 w-1 shrink-0 rotate-45 bg-amber-300/45" />
        </div>
      ))}
    </div>
  );
}

export default function NewsTicker() {
  return (
    <section
      aria-label="GOLD JACKET league news"
      className="relative flex h-11 overflow-hidden border-b border-[#d7b35a]/15 bg-[#0b0b09] shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
    >
      <div className="relative z-20 flex h-full shrink-0 items-center border-r border-[#d7b35a]/25 bg-gradient-to-r from-[#e7c977] via-[#f4df9c] to-[#b99338] px-4 text-[#120f08] shadow-[8px_0_24px_rgba(0,0,0,0.45)] sm:px-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black/35" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-black" />
          </span>
          <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.18em] sm:text-xs">
            GOLD JACKET
          </span>
          <span className="hidden text-[9px] font-black uppercase tracking-[0.14em] text-black/60 sm:inline">
            Wire
          </span>
        </div>
      </div>

      <div className="ticker-window group relative flex min-w-0 flex-1 items-center overflow-hidden">
        <div className="ticker-track flex w-max items-center group-hover:[animation-play-state:paused]">
          <TickerGroup />
          <TickerGroup />
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#0b0b09] to-transparent sm:w-16" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#0b0b09] to-transparent sm:w-16" />
      </div>
    </section>
  );
}
