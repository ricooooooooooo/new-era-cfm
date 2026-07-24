import Link from "next/link";

type UnderConstructionProps = {
  title: string;
  description: string;
  features?: string[];
  releaseText?: string;
};

export default function UnderConstruction({
  title,
  description,
  features = [],
  releaseText = "Coming before the NEW ERA season begins",
}: UnderConstructionProps) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#080909] px-4 py-10 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-600/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex max-w-4xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/10 via-white/[0.025] to-blue-500/10 px-6 py-5 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-300">
                  New Era CFM
                </p>

                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Feature Preview
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />

                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
                  Under Construction
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-10 sm:px-10 sm:py-14">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-3xl shadow-[0_0_35px_rgba(168,85,247,0.15)]">
                🚧
              </div>

              <h1 className="mt-6 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                {title}
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
                {description}
              </p>
            </div>

            {features.length > 0 && (
              <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                  Features in development
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-purple-400/20 bg-purple-400/10 text-xs font-black text-purple-200">
                        ✓
                      </div>

                      <p className="text-sm font-semibold text-zinc-300">
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-purple-400/15 bg-purple-400/[0.06] px-5 py-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-300">
                Expected Release
              </p>

              <p className="mt-2 text-sm font-bold text-white">
                {releaseText}
              </p>
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                href="/"
                className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-white transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}