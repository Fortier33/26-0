import type { ClubUpgrade, UpgradeGrades } from "./types";

// ── Win income ────────────────────────────────────────────────────────────────

export const BASE_WIN_INCOME = 400_000; // € par victoire (nul et défaite = 0)

// ── Season-end prizes by league position ─────────────────────────────────────

export const LEAGUE_PRIZES: Record<number, number> = {
  1:  2_500_000,
  2:  2_000_000,
  3:  1_500_000,
  4:  1_500_000,
  5:  1_000_000,
  6:  1_000_000,
  7:    500_000,
  8:    500_000,
  9:    500_000,
  10:   200_000,
  11:   200_000,
  12:   200_000,
  13:  -200_000,
  14:  -400_000,
};

// ── Playoff prizes ────────────────────────────────────────────────────────────

export const PLAYOFF_PRIZES: Record<string, number> = {
  champion:  5_000_000,
  finaliste: 2_500_000,
  eliminé:   1_200_000, // SF exit
  quart:       600_000, // QF exit — used internally
};

/**
 * Returns the playoff prize for a given outcome + round eliminated.
 * "eliminé" can mean QF or SF; we distinguish via eliminatedIn.
 */
export function getPlayoffPrize(
  outcome: "champion" | "finaliste" | "eliminé" | "non-qualifié",
  eliminatedIn?: string,
): number {
  if (outcome === "champion")  return PLAYOFF_PRIZES.champion;
  if (outcome === "finaliste") return PLAYOFF_PRIZES.finaliste;
  if (outcome === "eliminé") {
    return eliminatedIn?.toLowerCase().includes("quart")
      ? PLAYOFF_PRIZES.quart
      : PLAYOFF_PRIZES.eliminé;
  }
  return 0;
}

// ── Market value ──────────────────────────────────────────────────────────────

export const FREE_RATING_THRESHOLD = 80;

/**
 * Market value for a player in €.
 * Rating ≤ 80 → 0 (free).
 * Formula: round((rating − 79)^2.8 × 8 000) to nearest 50 000.
 */
export function getMarketValue(rating: number): number {
  if (rating <= FREE_RATING_THRESHOLD) return 0;
  const raw = Math.pow(rating - 79, 2.8) * 8_000;
  return Math.round(raw / 50_000) * 50_000;
}

// ── Upgrade costs (index = target grade − 1) ─────────────────────────────────

export const UPGRADE_COSTS: Record<ClubUpgrade, [number, number, number]> = {
  stadium:     [3_000_000,  6_000_000, 10_000_000],
  recruiter:   [2_000_000,  4_000_000,  7_000_000],
  trainer:     [2_000_000,  4_000_000,  6_000_000],
  marketing:   [2_000_000,  4_000_000,  7_000_000],
  transport:   [1_500_000,  3_000_000,  5_500_000],
  mentalCoach: [1_500_000,  3_000_000,  5_500_000],
};

// Cost to reach the next grade (undefined if already at grade 3)
export function nextUpgradeCost(upgrade: ClubUpgrade, currentGrade: 0 | 1 | 2 | 3): number | undefined {
  if (currentGrade >= 3) return undefined;
  return UPGRADE_COSTS[upgrade][currentGrade as 0 | 1 | 2];
}

// ── Upgrade effects ───────────────────────────────────────────────────────────

/** Percentage multiplier applied to team rating at home (0.10 = +10 %) */
export function getStadiumBonus(grade: 0 | 1 | 2 | 3): number {
  return ([0, 0.10, 0.20, 0.30] as const)[grade];
}

/** Fraction price discount when buying a player (0.15 = 15% off) */
export function getRecruiterDiscount(grade: 0 | 1 | 2 | 3): number {
  return ([0, 0.15, 0.25, 0.40] as const)[grade];
}

/** Rating points gained during pre-season training */
export function getTrainerBoost(grade: 0 | 1 | 2 | 3): number {
  return ([2, 3, 4, 5] as const)[grade];
}

/** Percentage multiplier applied to team rating for away matches */
export function getTransportBonus(grade: 0 | 1 | 2 | 3): number {
  return ([0, 0.08, 0.15, 0.22] as const)[grade];
}

/** Percentage multiplier applied to team rating during playoff matches */
export function getMentalCoachBonus(grade: 0 | 1 | 2 | 3): number {
  return ([0, 0.08, 0.15, 0.22] as const)[grade];
}

/** Actual win income in € with marketing upgrade applied */
export function getWinIncome(grade: 0 | 1 | 2 | 3): number {
  const multiplier = ([1, 1.30, 1.70, 2.00] as const)[grade];
  return Math.round(BASE_WIN_INCOME * multiplier);
}

// ── Upgrade labels (for UI) ───────────────────────────────────────────────────

export const UPGRADE_LABELS: Record<ClubUpgrade, string> = {
  stadium:     "Nouveau stade",
  recruiter:   "Directeur du recrutement",
  trainer:     "Préparateur physique",
  marketing:   "Directeur marketing",
  transport:   "Flotte de transport",
  mentalCoach: "Coach mental",
};

export const UPGRADE_GRADE_DESCRIPTIONS: Record<ClubUpgrade, [string, string, string]> = {
  stadium: [
    "Force d'équipe à domicile +10 %",
    "Force d'équipe à domicile +20 %",
    "Force d'équipe à domicile +30 %",
  ],
  recruiter: [
    "−15 % sur le prix d'achat des joueurs",
    "−25 % sur le prix d'achat des joueurs",
    "−40 % sur le prix d'achat des joueurs",
  ],
  trainer: [
    "+3 points en pré-saison (au lieu de +2)",
    "+4 points en pré-saison",
    "+5 points en pré-saison",
  ],
  marketing: [
    "Victoire : 520 000 € (+30 %)",
    "Victoire : 680 000 € (+70 %)",
    "Victoire : 800 000 € (×2)",
  ],
  transport: [
    "Force d'équipe à l'extérieur +8 %",
    "Force d'équipe à l'extérieur +15 %",
    "Force d'équipe à l'extérieur +22 %",
  ],
  mentalCoach: [
    "Force d'équipe en play-offs +8 %",
    "Force d'équipe en play-offs +15 %",
    "Force d'équipe en play-offs +22 %",
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Default state: all upgrades at grade 0. */
export function defaultUpgradeGrades(): UpgradeGrades {
  return { stadium: 0, recruiter: 0, trainer: 0, marketing: 0, transport: 0, mentalCoach: 0 };
}

/** Format a budget amount for display: 1 500 000 → "1,5M€", 400 000 → "400k€" */
export function formatBudget(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}${Number.isInteger(m) ? m : m.toFixed(1)}M€`;
  }
  if (abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000)}k€`;
  }
  return `${sign}${abs}€`;
}

/** Format a budget delta with explicit sign for display: +1,5M€ / −400k€ */
export function formatBudgetDelta(amount: number): string {
  const base = formatBudget(Math.abs(amount));
  return amount >= 0 ? `+${base}` : `−${base}`;
}
