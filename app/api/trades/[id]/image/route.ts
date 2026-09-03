import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  renderSchefterXTrade,
  type SchefterTrade,
} from "@/lib/discord/schefter-x-renderer";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  {
    params,
  }: Params,
) {
  const {
    id,
  } =
    await params;

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "trades",
      )
      .select(
        "id,team_one,team_one_sends,team_two,team_two_sends,report_text",
      )
      .eq(
        "id",
        id,
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    return new Response(
      "Trade not found.",
      {
        status:
          404,
      },
    );
  }

  let mediaDataUrl:
    string | null =
      null;

  try {
    const origin =
      new URL(
        request.url,
      ).origin;

    const mediaResponse =
      await fetch(
        `${origin}/api/trades/${encodeURIComponent(id)}/legacy-image`,
        {
          cache:
            "no-store",
        },
      );

    if (
      mediaResponse.ok
    ) {
      const contentType =
        mediaResponse
          .headers
          .get(
            "content-type",
          ) ||
        "image/png";

      const bytes =
        new Uint8Array(
          await mediaResponse.arrayBuffer(),
        );

      mediaDataUrl =
        `data:${contentType};base64,` +
        Buffer.from(
          bytes,
        ).toString(
          "base64",
        );
    }
  } catch (
    error
  ) {
    console.error(
      "Unable to load legacy trade media for Schefter X card:",
      error,
    );
  }

  const png =
    await renderSchefterXTrade({
      trade:
        data as SchefterTrade,

      mediaDataUrl,
    });

  return new Response(
    new Uint8Array(
      png,
    ),
    {
      status:
        200,

      headers: {
        "Content-Type":
          "image/png",

        "Cache-Control":
          "no-store, max-age=0",
      },
    },
  );
}
