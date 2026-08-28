type GoldJacketMarkProps = {
  className?: string;
};

export default function GoldJacketMark({
  className = "h-9 w-9",
}: GoldJacketMarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="gj-gold" x1="13" y1="7" x2="51" y2="58">
          <stop offset="0" stopColor="#fff0b6" />
          <stop offset="0.42" stopColor="#d8b34b" />
          <stop offset="1" stopColor="#8a631e" />
        </linearGradient>
      </defs>

      <path
        d="M32 3.5 54 11.8v17.4c0 14.3-8.4 25.2-22 31.3C18.4 54.4 10 43.5 10 29.2V11.8L32 3.5Z"
        fill="#0b0a07"
        stroke="url(#gj-gold)"
        strokeWidth="2.6"
      />

      <path
        d="m21.2 21.2 8.2-4.3 2.6 5.6 2.6-5.6 8.2 4.3-3.2 25.1H24.4l-3.2-25.1Z"
        fill="url(#gj-gold)"
        fillOpacity="0.18"
        stroke="url(#gj-gold)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="m21.8 21.6 8.4 8.1L32 23l1.8 6.7 8.4-8.1"
        stroke="url(#gj-gold)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M32 27.7 35.1 34 32 40.8 28.9 34 32 27.7Z"
        fill="url(#gj-gold)"
      />

      <path
        d="M22.8 47.9h18.4"
        stroke="url(#gj-gold)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M25.7 11.7 32 8.8l6.3 2.9"
        stroke="#f4d978"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
