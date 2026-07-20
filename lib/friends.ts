import type { FriendsTeam, FriendsBracket, FriendsBracketMatch } from "./types";

export const FRIENDS_COLORS = [
  { hex: "#4A90D9", name: "Bleu" },
  { hex: "#D94A4A", name: "Rouge" },
  { hex: "#4AD98A", name: "Vert" },
  { hex: "#D9914A", name: "Orange" },
  { hex: "#9B4AD9", name: "Violet" },
  { hex: "#D4AF37", name: "Or" },
] as const;

const BOT_COLOR = "#6B7280";

// Real club names so simulatePlayoffMatch can look up their strengths
const BOT_CLUBS = [
  "Stade Toulousain",
  "Racing 92",
  "La Rochelle",
  "Clermont",
  "Bordeaux-Bègles",
  "Toulon",
  "Castres Olympique",
  "Stade Français Paris",
];

// Seeds filled by human players per player count.
// Remaining seeds → bots.
// Top 14 seeds: 1 & 2 go directly to SF, 3-6 play QF.
const HUMAN_SEEDS: Record<number, number[]> = {
  2: [1, 2],
  3: [3, 4, 5],
  4: [3, 4, 5, 6],
  5: [1, 3, 4, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
};

function botTeam(id: number, name: string): FriendsTeam {
  return { id, name, colorHex: BOT_COLOR, players: [], isBot: true };
}

function slot(
  id: string,
  round: string,
  teamA: FriendsTeam | null,
  teamB: FriendsTeam | null,
): FriendsBracketMatch {
  return { id, round, teamA, teamB, scoreA: null, scoreB: null, winner: null };
}

export function generateBracket(humanTeams: FriendsTeam[]): FriendsBracket {
  const n = humanTeams.length;
  const humanSeeds = HUMAN_SEEDS[n] ?? [1, 2];

  const botPool = [...BOT_CLUBS].sort(() => Math.random() - 0.5);
  let botId = 100;
  let humanIdx = 0;

  // seeds[0] = seed 1, seeds[5] = seed 6
  const seeds: FriendsTeam[] = Array.from({ length: 6 }, (_, i) => {
    const seed = i + 1;
    if (humanSeeds.includes(seed)) {
      return { ...humanTeams[humanIdx++], isBot: false };
    }
    return botTeam(botId++, botPool.pop() ?? `Équipe ${seed}`);
  });

  // Standard Top 14 bracket:
  // QF1: seed3 vs seed6  → winner faces seed2 in SF2
  // QF2: seed4 vs seed5  → winner faces seed1 in SF1
  // SF1: seed1 vs winner(QF2)
  // SF2: seed2 vs winner(QF1)
  // Final: winner(SF1) vs winner(SF2)
  const matches: FriendsBracketMatch[] = [
    slot("qf1",   "Quart de finale", seeds[2], seeds[5]),
    slot("qf2",   "Quart de finale", seeds[3], seeds[4]),
    slot("sf1",   "Demi-finale",     seeds[0], null),
    slot("sf2",   "Demi-finale",     seeds[1], null),
    slot("final", "Finale",          null,     null),
  ];

  return { teams: humanTeams, matches, currentMatchIndex: 0, champion: null };
}

/** Index of each match id → which match feeds its winner and to which slot */
export const BRACKET_FEED: Record<string, { toMatch: string; toSlot: "teamA" | "teamB" }> = {
  qf1:  { toMatch: "sf2",   toSlot: "teamB" },
  qf2:  { toMatch: "sf1",   toSlot: "teamB" },
  sf1:  { toMatch: "final", toSlot: "teamA" },
  sf2:  { toMatch: "final", toSlot: "teamB" },
};
