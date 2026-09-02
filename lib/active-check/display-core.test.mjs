import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeActiveCheckClickRows,
} from "./display-core.mjs";

const targets = [
  {
    team_slug: "browns",
    team_name: "Cleveland Browns",
    team_abbreviation: "CLE",
  },
  {
    team_slug: "patriots",
    team_name: "New England Patriots",
    team_abbreviation: "NE",
  },
  {
    team_slug: "packers",
    team_name: "Green Bay Packers",
    team_abbreviation: "GB",
  },
  {
    team_slug: "ravens",
    team_name: "Baltimore Ravens",
    team_abbreviation: "BAL",
  },
  {
    team_slug: "jets",
    team_name: "New York Jets",
    team_abbreviation: "NYJ",
  },
];

test(
  "legacy and current click labels collapse to one current franchise",
  () => {
    const clicks = [
      {
        team_slug: "cleveland-browns",
        team_name: "Cleveland Browns",
        team_abbreviation: "CLE",
      },
      {
        team_slug: "browns",
        team_name: "Browns",
        team_abbreviation: "CLE",
      },
      {
        team_slug: "new-england-patriots",
        team_name: "New England Patriots",
        team_abbreviation: "NE",
      },
      {
        team_slug: "patriots",
        team_name: "Patriots",
        team_abbreviation: "NE",
      },
      {
        team_slug: "green-bay-packers",
        team_name: "Green Bay Packers",
        team_abbreviation: "GB",
      },
      {
        team_slug: "packers",
        team_name: "Packers",
        team_abbreviation: "GB",
      },
      {
        team_slug: "baltimore-ravens",
        team_name: "Baltimore Ravens",
        team_abbreviation: "BAL",
      },
      {
        team_slug: "ravens",
        team_name: "Ravens",
        team_abbreviation: "BAL",
      },
      {
        team_slug: "jets",
        team_name: "Jets",
        team_abbreviation: "NYJ",
      },
      {
        team_slug: "new-york-jets",
        team_name: "New York Jets",
        team_abbreviation: "NYJ",
      },
    ];

    assert.deepEqual(
      canonicalizeActiveCheckClickRows(
        clicks,
        targets,
      ),
      [
        {
          teamSlug: "browns",
          teamName: "Cleveland Browns",
        },
        {
          teamSlug: "patriots",
          teamName: "New England Patriots",
        },
        {
          teamSlug: "packers",
          teamName: "Green Bay Packers",
        },
        {
          teamSlug: "ravens",
          teamName: "Baltimore Ravens",
        },
        {
          teamSlug: "jets",
          teamName: "New York Jets",
        },
      ],
    );
  },
);
