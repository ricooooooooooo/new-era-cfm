export type DiscordGuildMember = {
  nick?: string | null;
  user?: {
    id?: string;
    username?: string;
    global_name?: string | null;
  };
};

export function normalizeDiscordUsername(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function selectExactDiscordMember(
  members: DiscordGuildMember[],
  enteredUsername: string,
): DiscordGuildMember | null {
  const target = normalizeDiscordUsername(enteredUsername);

  const usernameMatch = members.find(
    (member) =>
      normalizeDiscordUsername(member.user?.username ?? "") === target,
  );

  if (usernameMatch) return usernameMatch;

  return (
    members.find((member) => {
      const globalName = normalizeDiscordUsername(
        member.user?.global_name ?? "",
      );
      const nick = normalizeDiscordUsername(member.nick ?? "");
      return globalName === target || nick === target;
    }) ?? null
  );
}
