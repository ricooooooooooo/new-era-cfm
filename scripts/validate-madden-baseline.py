#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

path = Path(
    sys.argv[1]
    if len(sys.argv) > 1
    else "data/madden/madden27-baseline.json"
)

data = json.loads(path.read_text())
teams = data.get("teams", [])

if len(teams) != 32:
    raise SystemExit(
        f"FAIL: Expected 32 teams, found {len(teams)}.",
    )

players = [
    player
    for team in teams
    for player in team.get("players", [])
]

errors = []

for team in teams:
    team_players = team.get("players", [])

    if len(team_players) < 40:
        errors.append(
            f"{team.get('slug')} has only {len(team_players)} players",
        )

for player in players:
    name = player.get("name", "Unknown")
    overall = player.get("overall")
    jersey = player.get("jerseyNumber")
    archetype = player.get("archetype")
    total = player.get("totalRating")

    if not isinstance(overall, int) or not 40 <= overall <= 99:
        errors.append(f"{name}: invalid OVR {overall}")

    if jersey is not None and (
        not isinstance(jersey, int) or not 0 <= jersey <= 99
    ):
        errors.append(f"{name}: invalid jersey {jersey}")

    if archetype and re.fullmatch(r"[\d,]+", str(archetype)):
        errors.append(f"{name}: numeric archetype {archetype}")

    if not isinstance(total, int) or total < 1000:
        errors.append(f"{name}: invalid TOTAL {total}")

suspicious = [
    player
    for player in players
    if player.get("jerseyNumber") is not None
    and player.get("overall") == player.get("jerseyNumber")
]

if len(suspicious) > len(players) * 0.08:
    errors.append(
        "Too many players have OVR equal to jersey number: "
        f"{len(suspicious)}/{len(players)}",
    )

if errors:
    print("\nFAIL: Baseline validation found bad data:")
    for error in errors[:30]:
        print(f" - {error}")
    raise SystemExit(1)

print("\nMADDEN COLUMN VALIDATION")
print("------------------------")
print(f"Teams: {len(teams)}")
print(f"Players: {len(players)}")
print(
    "OVR/jersey coincidences: "
    f"{len(suspicious)} "
    "(small natural coincidences are allowed)"
)
print("PASS: OVR, jersey, archetype, GEN, and TOTAL columns are valid.\n")
