# New Era Madden Data Layer

The website never reads MaddenRatings directly.

It reads one resolved player-data function:

`getCurrentMaddenPlayers()`

Data priority is:

1. EA franchise snapshot
2. Manual correction
3. MaddenRatings launch baseline

When EA data becomes available, the EA importer only writes snapshots with:

- `source = "ea_franchise"`
- the New Era `league_id`
- `source_priority = 300`

No roster page or player page needs to be rewritten. The same data function automatically uses the EA franchise value and falls back to the launch baseline only when an EA field is missing.

The baseline import can be refreshed safely. It deletes and replaces only MaddenRatings baseline snapshots. It never deletes New Era franchise data.
