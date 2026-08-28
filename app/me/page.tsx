import Link from "next/link";
import {
  cookies,
} from "next/headers";
import {
  redirect,
} from "next/navigation";

import AppLayout from "@/app/components/layout/AppLayout";
import {
  findTeamBySlug,
} from "@/lib/nfl-teams";
import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

type User = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

async function getUser() {
  const store =
    await cookies();

  const raw =
    store.get(
      "new_era_discord_user",
    )?.value;

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(
        raw,
        "base64url",
      ).toString("utf8"),
    ) as User;
  } catch {
    return null;
  }
}

export default async function MePage() {
  const user =
    await getUser();

  if (!user) {
    redirect(
      "/discord-connect",
    );
  }

  const memberResult =
    await supabaseAdmin
      .from("members")
      .select(
        "display_name, team, role",
      )
      .eq(
        "discord_id",
        user.id,
      )
      .maybeSingle();

  const member =
    memberResult.data;

  const team =
    findTeamBySlug(
      member?.team ??
        null,
    );

  const walletResult =
    await supabaseAdmin
      .from("wallets")
      .select(
        "balance",
      )
      .eq(
        "discord_id",
        user.id,
      )
      .maybeSingle();

  const balance =
    Number(
      walletResult.data
        ?.balance ??
        0,
    );

  const avatar =
    user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
      : null;

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#050606] px-4 py-6 text-white sm:px-6 sm:py-10">
        <div className="mx-auto max-w-4xl">
          <section className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(126,34,206,.2),transparent_28rem),#090a0c] p-6 sm:p-8">
            <div className="flex items-center gap-5">
              {avatar ? (
                <img
                  src={avatar}
                  alt={user.displayName}
                  className="h-20 w-20 rounded-3xl border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-2xl font-black text-black">
                  {user.displayName
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">
                  Gold Jacket Owner
                </p>

                <h1 className="mt-1 truncate text-3xl font-black">
                  {member?.display_name ??
                    user.displayName}
                </h1>

                <p className="mt-1 text-sm text-zinc-500">
                  @{user.username}
                  {team
                    ? ` • ${team.name}`
                    : ""}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-purple-400/15 bg-purple-400/[0.06] p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-purple-300">
                NE Coin
              </p>

              <p className="mt-2 text-3xl font-black">
                {balance.toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
                Franchise
              </p>

              <p className="mt-2 text-lg font-black">
                {team?.name ??
                  "Not Linked"}
              </p>
            </div>
          </section>

          <section className="mt-7">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
              My Gold Jacket
            </p>

            <div className="mt-3 space-y-2">
              {[
                [
                  "Owner DNA",
                  "/era#dna",
                  "Your live Gold Jacket OVR, archetype, ratings and hidden achievements",
                ],
                [
                  "My Profile",
                  `/members/${user.id}`,
                  "Prediction history, identity and league profile",
                ],
                [
                  "Franchise HQ",
                  "/dashboard",
                  "Roster, depth chart and team operations",
                ],
                [
                  "Gold Jacket Market",
                  "/market",
                  "Spend NE Coin on franchise upgrades",
                ],
                [
                  "My Game",
                  "/my-game",
                  "Current weekly matchup",
                ],
              ].map(
                ([
                  title,
                  href,
                  description,
                ]) => (
                  <Link
                    key={title}
                    href={href}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-black">
                        {title}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {description}
                      </p>
                    </div>

                    <span className="text-zinc-600">
                      →
                    </span>
                  </Link>
                ),
              )}
            </div>
          </section>

          <a
            href="/api/discord/logout"
            className="mt-8 flex min-h-12 items-center justify-center rounded-2xl border border-red-400/15 bg-red-500/[0.05] text-sm font-black text-red-300"
          >
            Sign Out
          </a>
        </div>
      </div>
    </AppLayout>
  );
}
