import fs from "node:fs";
import path from "node:path";

function readEnv(
  file,
) {
  if (
    !fs.existsSync(
      file,
    )
  ) {
    return {};
  }

  const env = {};

  for (
    const raw
    of fs
      .readFileSync(
        file,
        "utf8",
      )
      .split(/\r?\n/)
  ) {
    const line =
      raw.trim();

    if (
      !line ||
      line.startsWith("#")
    ) {
      continue;
    }

    const index =
      line.indexOf("=");

    if (
      index < 1
    ) {
      continue;
    }

    const key =
      line
        .slice(
          0,
          index,
        )
        .trim();

    let value =
      line
        .slice(
          index + 1,
        )
        .trim();

    if (
      (
        value.startsWith('"') &&
        value.endsWith('"')
      ) ||
      (
        value.startsWith("'") &&
        value.endsWith("'")
      )
    ) {
      value =
        value.slice(
          1,
          -1,
        );
    }

    env[key] =
      value;
  }

  return env;
}

const env = {
  ...readEnv(
    path.resolve(
      ".env.local",
    ),
  ),

  ...process.env,
};

const applicationId =
  env.DISCORD_CLIENT_ID;

const token =
  env.DISCORD_BOT_TOKEN;

const guildId =
  env.DISCORD_GUILD_ID ||
  "1531408025213210684";

if (!applicationId) {
  throw new Error(
    "DISCORD_CLIENT_ID missing.",
  );
}

if (!token) {
  throw new Error(
    "DISCORD_BOT_TOKEN missing.",
  );
}

const commands = [
  {
    type: 1,
    name: "newera",
    description:
      "View every New Era Discord command and feature",
  },

  {
    type: 1,
    name: "scout",
    description:
      "Scout your current Madden opponent",
  },

  {
    type: 1,
    name: "dna",
    description:
      "View your Owner OVR, archetype and ratings",
  },

  {
    type: 1,
    name: "wrapped",
    description:
      "View your personal New Era season snapshot",
  },

  {
    type: 1,
    name: "rivalry",
    description:
      "View rivalry history with your current opponent",
  },

  {
    type: 1,
    name: "achievements",
    description:
      "View your discovered secret New Era achievements",
  },

  {
    type: 1,
    name: "belt",
    description:
      "Show the current New Era Championship Belt holder",
  },

  {
    type: 1,
    name: "fraud",
    description:
      "Post the current New Era Fraud Watch rankings",
  },

  {
    type: 1,
    name: "recaps",
    description:
      "Post the latest automatic New Era game recaps",
  },

  {
    type: 1,
    name: "tutorial",
    description:
      "Post the New Era feature tutorial and notify everyone",

    /*
     * ADMINISTRATOR permission.
     * Owners cannot spam @everyone with this.
     */
    default_member_permissions:
      "8",
  },

  {
    type: 2,
    name:
      "Scout Owner",
  },
];

const endpoint =
  `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`;

console.log("");
console.log(
  "==========================================",
);
console.log(
  "BULK REGISTERING NEW ERA COMMANDS",
);
console.log(
  "==========================================",
);

const response =
  await fetch(
    endpoint,
    {
      method:
        "PUT",

      headers: {
        Authorization:
          `Bot ${token}`,

        "content-type":
          "application/json",
      },

      body:
        JSON.stringify(
          commands,
        ),
    },
  );

const body =
  await response.text();

if (!response.ok) {
  console.error(
    `❌ Discord HTTP ${response.status}`,
  );

  console.error(body);

  process.exit(1);
}

const registered =
  JSON.parse(body);

for (
  const command
  of registered
) {
  console.log(
    command.type === 2
      ? `✅ Apps → ${command.name}`
      : `✅ /${command.name}`,
  );
}

console.log("");
console.log(
  `🔥 ${registered.length} COMMANDS LIVE`,
);
