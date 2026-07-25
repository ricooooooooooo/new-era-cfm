"use client";

import { useState } from "react";

export default function StaffApplicationPage() {
  const positions = [
    {
      title: "Head Commissioner",
      description:
        "Help manage the entire league, owners, rules, scheduling and long-term direction.",
      color: "border-red-500",
    },
    {
      title: "Commissioner",
      description:
        "Assist with advances, owner issues, force wins, and league management.",
      color: "border-blue-500",
    },
    {
      title: "Trade Committee",
      description:
        "Review trades, prevent abuse, and maintain league fairness.",
      color: "border-green-500",
    },
    {
      title: "Moderator",
      description:
        "Keep Discord organized, help members, and enforce server rules.",
      color: "border-yellow-500",
    },
    {
      title: "Content Team",
      description:
        "Create power rankings, graphics, weekly recaps and league content.",
      color: "border-purple-500",
    },
  ];

  const [position, setPosition] = useState("Head Commissioner");
  const [why, setWhy] = useState("");
  const [experience, setExperience] = useState("");
  const [activity, setActivity] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  async function submitApplication() {
    setMessage("");
    setMessageType("");

    if (!why.trim() || !experience.trim() || !activity.trim()) {
      setMessage("Please complete every field before submitting.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/staff/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          position,
          why,
          experience,
          activity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Your application could not be submitted.");
        setMessageType("error");
        return;
      }

      setMessage("Your staff application was submitted successfully.");
      setMessageType("success");

      setPosition("Head Commissioner");
      setWhy("");
      setExperience("");
      setActivity("");
    } catch {
      setMessage("Something went wrong while submitting your application.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080909] text-white">
      <div className="mx-auto max-w-6xl p-8">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-black">Join The Staff Team</h1>

          <p className="mt-4 text-lg text-zinc-400">
            Help us build the best Madden franchise community possible.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {positions.map((positionCard) => (
            <div
              key={positionCard.title}
              className={`rounded-2xl border ${positionCard.color} bg-zinc-900 p-6`}
            >
              <h2 className="text-2xl font-bold">{positionCard.title}</h2>

              <p className="mt-3 text-zinc-400">
                {positionCard.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <h2 className="mb-6 text-3xl font-black">Staff Application</h2>

          <div className="space-y-6">
            <div>
              <label
                htmlFor="position"
                className="mb-2 block font-semibold"
              >
                Position
              </label>

              <select
                id="position"
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option>Head Commissioner</option>
                <option>Commissioner</option>
                <option>Trade Committee</option>
                <option>Moderator</option>
                <option>Content Team</option>
              </select>
            </div>

            <div>
              <label htmlFor="why" className="mb-2 block font-semibold">
                Why do you want this position?
              </label>

              <textarea
                id="why"
                rows={5}
                value={why}
                onChange={(event) => setWhy(event.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="experience"
                className="mb-2 block font-semibold"
              >
                Previous Experience
              </label>

              <textarea
                id="experience"
                rows={4}
                value={experience}
                onChange={(event) => setExperience(event.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="activity" className="mb-2 block font-semibold">
                How active are you each week?
              </label>

              <textarea
                id="activity"
                rows={3}
                value={activity}
                onChange={(event) => setActivity(event.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {message && (
              <div
                className={`rounded-xl border p-4 text-sm font-semibold ${
                  messageType === "success"
                    ? "border-green-500/40 bg-green-500/10 text-green-300"
                    : "border-red-500/40 bg-red-500/10 text-red-300"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="button"
              onClick={submitApplication}
              disabled={loading}
              className="w-full rounded-xl bg-red-600 py-4 text-lg font-bold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}