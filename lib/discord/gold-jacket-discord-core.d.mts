export type DiscordCommandRecord = Record<string, unknown> & { name?: string };
export declare function rebrandDiscordCommands(commands: DiscordCommandRecord[]): DiscordCommandRecord[];
export declare function ensureDevShopCommand(commands: DiscordCommandRecord[]): DiscordCommandRecord[];
export declare function buildDevShopInteractionPayload(input: {
  team: { fullName: string; abbreviation?: string | null };
  season: number;
  catalog: Array<{ key: string; name: string; price: number; capText: string }>;
  teamDevUsage: { star: number; superstar: number; xfactor: number };
  players: Array<{ id: string; physicalAttributes?: Array<{ value: number }>; nonPhysicalAttributes?: Array<{ value: number }> }>;
  availabilityByPlayer: Record<string, Record<string, { remaining?: number }>>;
  websiteUrl?: string | null;
}): Record<string, unknown>;
