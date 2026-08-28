"use client";

import { FormEvent, useState } from "react";

const storyTypes = [
  "Breaking",
  "Trade",
  "Signing",
  "Game Recap",
  "Feature",
  "Interview",
  "Press Conference",
  "Meme",
  "League News",
];

export default function MediaPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [headline, setHeadline] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [storyType, setStoryType] = useState("Breaking");
  const [imageUrl, setImageUrl] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    console.log({
      headline,
      subtitle,
      body,
      storyType,
      imageUrl,
    });

    setModalOpen(false);
  }

  function closeModal() {
    setModalOpen(false);
  }

  return (
    <main className="min-h-screen bg-[#070809] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.18),transparent_35%),linear-gradient(135deg,#101014,#070809)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.4)] sm:p-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-amber-300">
                Gold Jacket Sports Network
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                League news lives here.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                Breaking trades, game recaps, signings, interviews,
                highlights, rumors, memes, and stories created by the Gold Jacket
                community.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-2xl border border-purple-300/30 bg-purple-600 px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_45px_rgba(126,34,206,0.3)] transition hover:-translate-y-0.5 hover:bg-purple-500"
            >
              + Create Story
            </button>
          </div>
        </header>

        <section className="mt-8 overflow-hidden rounded-3xl border border-purple-400/20 bg-[linear-gradient(135deg,rgba(126,34,206,0.22),rgba(8,8,10,0.94))] p-7 sm:p-10">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
              Featured Story
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
              The first major Gold Jacket headline will appear here.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
              Once owners begin publishing, the biggest story of the week can
              be featured across the entire league.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-purple-300">
                Latest Coverage
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                Latest Stories
              </h2>
            </div>

            <p className="text-sm text-zinc-500">0 stories published</p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {storyTypes.slice(0, 6).map((type) => (
              <article
                key={type}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] transition duration-300 hover:-translate-y-1 hover:border-purple-400/30 hover:bg-white/[0.045]"
              >
                <div className="flex aspect-[16/9] items-center justify-center border-b border-white/10 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.16),transparent_60%)]">
                  <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-600">
                    Story Cover
                  </span>
                </div>

                <div className="p-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-300">
                    {type}
                  </span>

                  <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] text-white">
                    No {type.toLowerCase()} story yet
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-zinc-500">
                    Community stories will automatically appear here after
                    publication.
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0d0e11] shadow-[0_35px_120px_rgba(0,0,0,0.75)]">
            <div className="flex items-start justify-between border-b border-white/10 p-6 sm:p-8">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-purple-300">
                  Gold Jacket Sports Network
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  Create Story
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-2xl text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                  Story Type
                </label>

                <select
                  value={storyType}
                  onChange={(event) => setStoryType(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-purple-400/60"
                >
                  {storyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                  Headline
                </label>

                <input
                  type="text"
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  required
                  maxLength={120}
                  placeholder="Ravens acquire superstar cornerback"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-zinc-700 focus:border-purple-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                  Subtitle
                </label>

                <input
                  type="text"
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                  maxLength={180}
                  placeholder="Baltimore makes a major move before the deadline."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-zinc-700 focus:border-purple-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                  Cover Image URL
                </label>

                <input
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-zinc-700 focus:border-purple-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                  Story
                </label>

                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  required
                  rows={10}
                  placeholder="Write the full story here..."
                  className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 leading-7 text-white outline-none placeholder:text-zinc-700 focus:border-purple-400/60"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-purple-500"
                >
                  Publish Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}