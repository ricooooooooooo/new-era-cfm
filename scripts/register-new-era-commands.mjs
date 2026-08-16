import fs from "node:fs";
import path from "node:path";

function readEnv(
  filename,
) {
  const result = {};

  if (
    !fs.existsSync(
      filename,
    )
  ) {
    return result;
  }

  for (
    const raw
    of fs
      .readFileSync(
        filename,
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

    const equals =
      line.indexOf("=");

    if (
      equals < 1
    ) {
      continue;
    }

    const key =
      line
        .slice(
          0,
          equals,
        )
        .trim();

    let value =
      line
        .slice(
          equals + 1,
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

    result[key] =
      value;
  }

  return result;
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

const botToken =
  env.DISCORD_BOT_TOKEN;

const guildId =
  env.DISCORD_GUILD_ID ||
  "1531408025213210684";

if (!applicationId) {
  throw new Error(
    "DISCORD_CLIENT_ID missing from .env.local",
  );
}

if (!botToken) {
  throw new Error(
    "DISCORD_BOT_TOKEN missing from .env.local",
  );
}

if (!guildId) {
  throw new Error(
    "DISCORD_GUILD_ID missing.",
  );
}

const slash = [
  {
    name:
      "newera",

    description:
      "Open the New Era Intelligence command hub",
  },

  {
    name:
      "scout",

    description:
      "Scout your current Madden opponent",
  },

  {
    name:
      "dna",

    description:
      "View your live New Era Owner OVR and archetype",
  },

  {
    name:
      "wrapped",

    description:
      "View your personal New Era season snapshot",
  },

  {
    name:
      "rivalry",

    description:
      "View rivalry history with your current opponent",
  },

  {
    name:
      "achievements",

    description:
      "View your discovered New Era achievements",
  },

  {
    name:
      "belt",

    description:
      "Show the current New Era Championship holder",
  },

  {
    name:
      "fraud",

    description:
      "Post the current New Era Fraud Watch",
  },

  {
    name:
      "recaps",

    description:
      "Post the latest New Era game recaps",
  },
].map(
  (command) => ({
    type: 1,
    ...command,
  }),
);

const commands = [
  ...slash,

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
  "REGISTERING NEW ERA DISCORD COMMANDS",
);
console.log(
  "==========================================",
);

for (
  const command
  of commands
) {
  const response =
    await fetch(
      endpoint,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bot ${botToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            command,
          ),
      },
    );

  const body =
    await response.text();

  if (!response.ok) {
    console.error(
      `❌ ${command.name}: HTTP ${response.status}`,
    );

    console.error(
      body,
    );

    process.exit(
      1,
    );
  }

  const registered =
    JSON.parse(
      body,
    );

  console.log(
    `✅ ${command.type === 2 ? "USER APP" : "/"}${command.name} — ${registered.id}`,
  );
}

console.log("");
console.log(
  "🔥 ALL NEW ERA COMMANDS REGISTERED",
);
