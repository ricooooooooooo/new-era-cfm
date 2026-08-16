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

    const i =
      line.indexOf("=");

    if (i < 1) {
      continue;
    }

    const key =
      line.slice(
        0,
        i,
      );

    let value =
      line
        .slice(
          i + 1,
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

    env[
      key.trim()
    ] = value;
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

const token =
  env.DISCORD_BOT_TOKEN;

if (!token) {
  throw new Error(
    "DISCORD_BOT_TOKEN missing.",
  );
}

const imagePath =
  path.resolve(
    "public/ne-icon.png",
  );

if (
  !fs.existsSync(
    imagePath,
  )
) {
  throw new Error(
    "public/ne-icon.png was not found.",
  );
}

const icon =
  `data:image/png;base64,${fs
    .readFileSync(
      imagePath,
    )
    .toString(
      "base64",
    )}`;

async function patch(
  endpoint,
  payload,
) {
  const response =
    await fetch(
      `https://discord.com/api/v10${endpoint}`,
      {
        method:
          "PATCH",

        headers: {
          Authorization:
            `Bot ${token}`,

          "content-type":
            "application/json",
        },

        body:
          JSON.stringify(
            payload,
          ),
      },
    );

  const body =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `${endpoint} ${response.status}: ${body.slice(
        0,
        500,
      )}`,
    );
  }

  return body
    ? JSON.parse(body)
    : {};
}

console.log(
  "Changing New Era bot avatar..."
);

const bot =
  await patch(
    "/users/@me",
    {
      avatar:
        icon,
    },
  );

console.log(
  `✅ Bot avatar updated: ${bot.username ?? "NewEra"}`,
);

console.log(
  "Changing New Era application icon..."
);

const application =
  await patch(
    "/applications/@me",
    {
      icon,

      description:
        "New Era CFM • Madden Intelligence, League Automation & Owner Tools",
    },
  );

console.log(
  `✅ Application icon updated: ${application.name ?? "NewEra"}`,
);

console.log("");
console.log(
  "🔥 NEW ERA DISCORD BRANDING UPDATED",
);
