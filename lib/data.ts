import type { CalendarEntry, FieldSlot, Player } from "./types";
import { historicalClubs, teamStrengths } from "./historical-data";
export { teamStrengths };

export const clubs: Record<string, Player[]> = { ...historicalClubs };

export const allPlayers: Player[] = Object.values(clubs).flat();

export const OPPONENTS = [
  "Union Bordeaux-Bègles 25-26",
  "Stade Rochelais 25-26",
  "RC Toulon 25-26",
  "ASM Clermont 25-26",
  "Racing 92 25-26",
  "Castres Olympique 25-26",
  "Section Paloise 25-26",
  "Aviron Bayonnais 25-26",
  "Montpellier Hérault Rugby 25-26",
  "USA Perpignan 25-26",
  "LOU Rugby 25-26",
  "US Montauban 25-26",
  "Stade Français Paris 25-26",
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
  const all: CalendarEntry[] = [
    ...OPPONENTS.map((opp) => ({ opponent: opp, isHome: true })),
    ...OPPONENTS.map((opp) => ({ opponent: opp, isHome: false })),
  ];
  return all.sort(() => Math.random() - 0.5);
}

export const MAX_BY_POSITION: Record<string, number> = {
  "Deuxième ligne": 2,
  "Troisième ligne": 2,
  Centre: 2,
  Ailier: 2,
};
