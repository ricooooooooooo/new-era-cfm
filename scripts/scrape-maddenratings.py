#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
import re
import ssl
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

import certifi

BASE_URL = "https://www.maddenratings.com"
SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

TEAMS = [
    ("arizona-cardinals", "ARI"),
    ("atlanta-falcons", "ATL"),
    ("baltimore-ravens", "BAL"),
    ("buffalo-bills", "BUF"),
    ("carolina-panthers", "CAR"),
    ("chicago-bears", "CHI"),
    ("cincinnati-bengals", "CIN"),
    ("cleveland-browns", "CLE"),
    ("dallas-cowboys", "DAL"),
    ("denver-broncos", "DEN"),
    ("detroit-lions", "DET"),
    ("green-bay-packers", "GB"),
    ("houston-texans", "HOU"),
    ("indianapolis-colts", "IND"),
    ("jacksonville-jaguars", "JAX"),
    ("kansas-city-chiefs", "KC"),
    ("las-vegas-raiders", "LV"),
    ("los-angeles-chargers", "LAC"),
    ("los-angeles-rams", "LAR"),
    ("miami-dolphins", "MIA"),
    ("minnesota-vikings", "MIN"),
    ("new-england-patriots", "NE"),
    ("new-orleans-saints", "NO"),
    ("new-york-giants", "NYG"),
    ("new-york-jets", "NYJ"),
    ("philadelphia-eagles", "PHI"),
    ("pittsburgh-steelers", "PIT"),
    ("san-francisco-49ers", "SF"),
    ("seattle-seahawks", "SEA"),
    ("tampa-bay-buccaneers", "TB"),
    ("tennessee-titans", "TEN"),
    ("washington-commanders", "WAS"),
]

VALID_POSITIONS = {
    "QB", "HB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "LS",
    "LEDG", "REDG", "DT", "MIKE", "WILL", "SAM", "CB", "FS", "SS", "K", "P",
}


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


class RosterTableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[dict] = []
        self.in_row = False
        self.in_cell = False
        self.current_cell_parts: list[str] = []
        self.current_cells: list[str] = []
        self.current_links: list[dict[str, str]] = []
        self.current_link_href: str | None = None
        self.current_link_parts: list[str] = []

    def handle_starttag(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]],
    ) -> None:
        attrs_dict = {key: value or "" for key, value in attrs}

        if tag == "tr":
            self.in_row = True
            self.current_cells = []
            self.current_links = []
        elif self.in_row and tag in ("td", "th"):
            self.in_cell = True
            self.current_cell_parts = []
        elif self.in_row and tag == "a":
            self.current_link_href = attrs_dict.get("href") or None
            self.current_link_parts = []
        elif self.in_row and self.in_cell and tag == "img":
            alt = clean_text(attrs_dict.get("alt", ""))
            if alt:
                self.current_cell_parts.append(alt)

    def handle_data(self, data: str) -> None:
        if self.in_row and self.in_cell:
            self.current_cell_parts.append(data)

        if self.in_row and self.current_link_href is not None:
            self.current_link_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if self.in_row and tag == "a" and self.current_link_href is not None:
            text = clean_text(" ".join(self.current_link_parts))
            self.current_links.append(
                {"href": self.current_link_href, "text": text},
            )
            self.current_link_href = None
            self.current_link_parts = []
        elif self.in_row and tag in ("td", "th") and self.in_cell:
            self.current_cells.append(
                clean_text(" ".join(self.current_cell_parts)),
            )
            self.in_cell = False
            self.current_cell_parts = []
        elif tag == "tr" and self.in_row:
            if self.current_cells:
                self.rows.append(
                    {
                        "cells": self.current_cells,
                        "links": self.current_links,
                    },
                )

            self.in_row = False
            self.in_cell = False
            self.current_cells = []
            self.current_links = []


def fetch(url: str, retries: int = 3) -> str:
    request = Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/127.0 Safari/537.36 NewEraCFM/1.0"
            ),
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )

    for attempt in range(1, retries + 1):
        try:
            with urlopen(
                request,
                timeout=30,
                context=SSL_CONTEXT,
            ) as response:
                return response.read().decode(
                    "utf-8",
                    errors="replace",
                )
        except (HTTPError, URLError, TimeoutError) as error:
            if attempt == retries:
                raise RuntimeError(
                    f"Unable to fetch {url}: {error}",
                ) from error

            time.sleep(attempt * 1.5)

    raise RuntimeError(f"Unable to fetch {url}")


def pick_player_link(
    links: list[dict[str, str]],
) -> dict[str, str] | None:
    for link in links:
        href = link["href"].strip()
        text = clean_text(link["text"])
        path = urlparse(urljoin(BASE_URL, href)).path.strip("/")

        if not text or not path:
            continue

        if path.startswith("teams/") or "/" in path:
            continue

        if path in {"", "ratings", "players", "teams"}:
            continue

        return {
            "href": urljoin(BASE_URL, href),
            "text": text,
            "slug": path,
        }

    return None


def parse_rating_cell(value: str) -> int | None:
    for match in re.finditer(r"(?<!\d)(\d{2})(?!\d)", value):
        number = int(match.group(1))
        if 40 <= number <= 99:
            return number

    return None


def parse_total_cell(value: str) -> int | None:
    matches = re.findall(r"\d[\d,]*", value)

    for raw in reversed(matches):
        number = int(raw.replace(",", ""))
        if number >= 1000:
            return number

    return None


def clean_archetype(value: str | None) -> str | None:
    if not value:
        return None

    cleaned = clean_text(value)
    cleaned = re.sub(
        r"^(?:Image:\s*)?(?:United States|Canada|Denmark)\s*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = cleaned.strip(" |-")

    if not cleaned or re.fullmatch(r"[\d,]+", cleaned):
        return None

    return cleaned


def parse_player_details(
    player_cell: str,
) -> tuple[int | None, str | None, str | None]:
    match = re.search(
        r"#\s*(\d{1,2})\s+([A-Z0-9]{1,6})"
        r"(?:\s+(.+?))?\s*$",
        player_cell,
    )

    if not match:
        return None, None, None

    jersey_number = int(match.group(1))
    position = match.group(2).upper()
    archetype = clean_archetype(match.group(3))

    if position not in VALID_POSITIONS:
        return jersey_number, position, archetype

    return jersey_number, position, archetype


def parse_roster(page_html: str) -> list[dict]:
    parser = RosterTableParser()
    parser.feed(page_html)

    players: list[dict] = []
    seen: set[str] = set()

    for row in parser.rows:
        link = pick_player_link(row["links"])

        if not link or link["slug"] in seen:
            continue

        cells = [clean_text(cell) for cell in row["cells"]]

        # Current MaddenRatings roster rows are:
        # rank | player details | OVR | GEN | TOTAL
        if len(cells) < 5:
            continue

        player_cell = cells[-4]
        overall = parse_rating_cell(cells[-3])
        general = parse_rating_cell(cells[-2])
        total = parse_total_cell(cells[-1])

        if overall is None or total is None:
            continue

        jersey_number, position, archetype = parse_player_details(
            player_cell,
        )

        row_text = clean_text(" | ".join(cells))
        lowered = row_text.lower()

        dev_trait = None
        if "x-factor" in lowered or "x factor" in lowered:
            dev_trait = "X-Factor"
        elif "superstar" in lowered:
            dev_trait = "Superstar"
        elif re.search(r"\bstar\b", lowered):
            dev_trait = "Star"

        players.append(
            {
                "externalId": link["slug"],
                "name": link["text"],
                "profileUrl": link["href"],
                "overall": overall,
                "generalRating": general,
                "totalRating": total,
                "jerseyNumber": jersey_number,
                "position": position,
                "archetype": archetype,
                "devTrait": dev_trait,
                "rawRow": cells,
            },
        )
        seen.add(link["slug"])

    return players


def parse_team_overall(page_html: str) -> int | None:
    text = clean_text(re.sub(r"<[^>]+>", " ", page_html))
    match = re.search(
        r"Team Overall Rating of\s+(\d{2})",
        text,
        re.IGNORECASE,
    )
    return int(match.group(1)) if match else None


def validate_team(slug: str, players: list[dict]) -> None:
    if len(players) < 40:
        raise RuntimeError(
            f"{slug} returned only {len(players)} valid players.",
        )

    numeric_archetypes = [
        player
        for player in players
        if player["archetype"]
        and re.fullmatch(r"[\d,]+", player["archetype"])
    ]

    if numeric_archetypes:
        raise RuntimeError(
            f"{slug} still has numeric archetypes.",
        )

    jersey_equals_overall = [
        player
        for player in players
        if player["jerseyNumber"] is not None
        and player["overall"] == player["jerseyNumber"]
    ]

    if len(jersey_equals_overall) > max(5, len(players) // 12):
        raise RuntimeError(
            f"{slug} has too many OVR values matching jersey numbers.",
        )


def main() -> None:
    argument_parser = argparse.ArgumentParser(
        description="Create a Madden 27 baseline roster JSON file.",
    )
    argument_parser.add_argument(
        "--output",
        default="data/madden/madden27-baseline.json",
        help="Output JSON path.",
    )
    argument_parser.add_argument(
        "--team",
        help="Only scrape one team slug.",
    )
    argument_parser.add_argument(
        "--delay",
        type=float,
        default=0.4,
        help="Delay between team pages.",
    )
    args = argument_parser.parse_args()

    selected_teams = TEAMS

    if args.team:
        selected_teams = [
            team for team in TEAMS if team[0] == args.team
        ]

        if not selected_teams:
            raise SystemExit(f"Unknown team slug: {args.team}")

    output_teams: list[dict] = []

    for index, (slug, abbreviation) in enumerate(
        selected_teams,
        start=1,
    ):
        url = f"{BASE_URL}/teams/{slug}"
        print(f"[{index}/{len(selected_teams)}] {slug}")

        page_html = fetch(url)
        players = parse_roster(page_html)
        validate_team(slug, players)

        output_teams.append(
            {
                "slug": slug,
                "abbreviation": abbreviation,
                "profileUrl": url,
                "overall": parse_team_overall(page_html),
                "players": players,
            },
        )

        if index < len(selected_teams):
            time.sleep(max(args.delay, 0))

    output = {
        "schemaVersion": 2,
        "source": "maddenratings",
        "gameVersion": "Madden NFL 27",
        "capturedAt": datetime.now(timezone.utc).isoformat(),
        "teams": output_teams,
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(output, indent=2, ensure_ascii=False),
    )

    player_count = sum(
        len(team["players"]) for team in output_teams
    )

    print(
        f"Saved {player_count} players across "
        f"{len(output_teams)} teams.",
    )
    print(output_path)


if __name__ == "__main__":
    main()
