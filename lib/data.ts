import type { CalendarEntry, FieldSlot, Player } from "./types";
import { historicalClubs, teamStrengths } from "./historical-data";
export { teamStrengths };

export const clubs: Record<string, Player[]> = { ...historicalClubs };

export const allPlayers: Player[] = Object.values(clubs).flat();

export const OPPONENTS = [
  "Stade Toulousain",
  "Stade Rochelais",
  "Stade Français Paris",
  "Union Bordeaux-Bègles",
  "Racing 92",
  "Montpellier Hérault Rugby",
  "Section Paloise",
  "RC Toulon",
  "LOU Rugby",
  "ASM Clermont",
  "Castres Olympique",
  "Aviron Bayonnais",
  "USA Perpignan",
];

export const fieldPositions: Record<string, FieldSlot> = {
  Arrière: { position: "Arrière", top: "5%", left: "50%" },
  "Ailier 1": { position: "Ailier", top: "20%", left: "15%" },
  "Centre 1": { position: "Centre", top: "25%", left: "35%" },
  "Centre 2": { position: "Centre", top: "25%", left: "65%" },
  "Ailier 2": { position: "Ailier", top: "20%", left: "85%" },
  Ouvreur: { position: "Ouvreur", top: "40%", left: "55%" },
  "Demi de mêlée": { position: "Demi de mêlée", top: "50%", left: "45%" },
  "3e ligne 1": { position: "Troisième ligne", top: "65%", left: "25%" },
  "Numéro 8": { position: "Numéro 8", top: "65%", left: "50%" },
  "3e ligne 2": { position: "Troisième ligne", top: "65%", left: "75%" },
  "2e ligne 1": { position: "Deuxième ligne", top: "80%", left: "35%" },
  "2e ligne 2": { position: "Deuxième ligne", top: "80%", left: "65%" },
  "Pilier gauche": { position: "Pilier gauche", top: "92%", left: "25%" },
  Talonneur: { position: "Talonneur", top: "92%", left: "50%" },
  "Pilier droit": { position: "Pilier droit", top: "92%", left: "75%" },
};

export function getClubRating(clubName: string): number {
  const roster = clubs[clubName];
  if (!roster) return 82;
  return Math.round(roster.reduce((sum, p) => sum + p.rating, 0) / roster.length);
}

export function buildCalendar(): CalendarEntry[] {
  // Shuffle opponents to randomize order
  const shuffled = [...OPPONENTS].sort(() => Math.random() - 0.5);

  // First half: 7 home + 6 away (or 6+7), randomly assigned per opponent
  const h1Count = Math.random() < 0.5 ? 7 : 6;
  const firstHalf: CalendarEntry[] = shuffled.map((opp, i) => ({
    opponent: opp,
    isHome: i < h1Count,
  }));

  // Second half: complement — each opponent with flipped home/away
  const secondHalf: CalendarEntry[] = shuffled.map((opp, i) => ({
    opponent: opp,
    isHome: i >= h1Count,
  }));

  return [
    ...constrainedShuffle(firstHalf),
    ...constrainedShuffle(secondHalf),
  ];
}

function constrainedShuffle(entries: CalendarEntry[]): CalendarEntry[] {
  // Try random shuffles first (almost always finds valid in <20 tries for 6/7 split)
  for (let i = 0; i < 500; i++) {
    const arr = [...entries].sort(() => Math.random() - 0.5);
    if (maxConsecutive(arr) <= 2) return arr;
  }
  // Guaranteed fallback: greedy interleave
  return greedyInterleave(entries);
}

function maxConsecutive(entries: CalendarEntry[]): number {
  let max = 1, cur = 1;
  for (let i = 1; i < entries.length; i++) {
    cur = entries[i].isHome === entries[i - 1].isHome ? cur + 1 : 1;
    if (cur > max) max = cur;
  }
  return max;
}

function greedyInterleave(entries: CalendarEntry[]): CalendarEntry[] {
  const home = entries.filter(e => e.isHome).sort(() => Math.random() - 0.5);
  const away = entries.filter(e => !e.isHome).sort(() => Math.random() - 0.5);
  const result: CalendarEntry[] = [];
  let hi = 0, ai = 0;

  while (hi < home.length || ai < away.length) {
    const last2 = result.slice(-2);
    const streak2Home = last2.length === 2 && last2.every(e => e.isHome);
    const streak2Away = last2.length === 2 && last2.every(e => !e.isHome);

    if (streak2Home && ai < away.length) {
      result.push(away[ai++]);
    } else if (streak2Away && hi < home.length) {
      result.push(home[hi++]);
    } else if (hi < home.length && ai < away.length) {
      Math.random() < 0.5 ? result.push(home[hi++]) : result.push(away[ai++]);
    } else if (hi < home.length) {
      result.push(home[hi++]);
    } else {
      result.push(away[ai++]);
    }
  }
  return result;
}

export const MAX_BY_POSITION: Record<string, number> = {
  "Deuxième ligne": 2,
  "Troisième ligne": 2,
  Centre: 2,
  Ailier: 2,
};
