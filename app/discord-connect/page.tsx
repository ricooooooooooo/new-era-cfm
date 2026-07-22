import { cookies } from "next/headers";

type DiscordUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

type DiscordConnectPageProps = {
  searchParams: Promise<{
    connected?: string;
    error?: string;
  }>;
};

function decodeDiscordUser(value?: string): DiscordUser | null {
  if (!value) {
    return null;
  }

  try {
    const json = Buffer.from(value, "base64url").toString("utf8");

    return JSON.parse(json) as DiscordUser;
  } catch {
    return null;
  }
}

function getErrorMessage(error?: string) {
  switch (error) {
    case "missing_config":
      return "Your Discord Client ID, Client Secret, or Redirect URL is missing.";

    case "no_code":
      return "Discord did not return an authorization code.";

    case "invalid_state":
      return "The Discord login request expired or could not be verified.";

    case "token_failed":
      return "Discord rejected the Client ID, Client Secret, or redirect URL.";

    case "user_failed":
      return "Discord login worked, but the account information could not be loaded.";

    case "server_error":
      return "The website could not complete the Discord login.";

    default:
      return null;
  }
}

export default async function DiscordConnectPage({
  searchParams,
}: DiscordConnectPageProps) {
  const cookieStore = await cookies();
  const params = await searchParams;

  const savedUser = decodeDiscordUser(
    cookieStore.get("new_era_discord_user")?.value,
  );

  const errorMessage = getErrorMessage(params.error);

  const avatarUrl =
    savedUser?.avatar && savedUser.id
      ? `https://cdn.discordapp.com/avatars/${savedUser.id}/${savedUser.avatar}.png?size=256`
      : null;

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
        <div className="h-2 bg-red-600" />

        <div className="p-8 md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-red-500">
            New Era CFM
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Connect Discord
          </h1>

          <p className="mt-4 leading-7 text-zinc-400">
            League members can connect their Discord account without copying
            and pasting a user ID.
          </p>

          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/40 p-5">
              <p className="font-black text-red-400">Connection Failed</p>

              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {errorMessage}
              </p>
            </div>
          )}

          {savedUser ? (
            <div className="mt-8">
              <div className="flex items-center gap-4 rounded-2xl border border-emerald-900 bg-emerald-950/30 p-5">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${savedUser.displayName}'s Discord avatar`}
                    className="h-16 w-16 rounded-full"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-2xl font-black">
                    {savedUser.displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                    Discord Connected
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {savedUser.displayName}
                  </p>

                  <p className="text-sm text-zinc-400">
                    @{savedUser.username}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                  Discord User ID
                </p>

                <p className="mt-2 break-all font-mono text-sm text-zinc-200">
                  {savedUser.id}
                </p>
              </div>

              <a
                href="/api/discord/logout"
                className="mt-6 inline-flex rounded-xl border border-zinc-700 px-5 py-3 text-sm font-black text-zinc-300 transition hover:border-zinc-500 hover:text-white"
              >
                Disconnect Discord
              </a>
            </div>
          ) : (
            <a
              href="/api/discord/login"
              className="mt-8 inline-flex rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white transition hover:bg-indigo-500"
            >
              Sign in with Discord
            </a>
          )}
        </div>
      </section>
    </main>
  );
}