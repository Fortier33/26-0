import type { CalendarEntry, MatchEvent, MatchResult, Player, RoundMatchResult, ScoringAction } from "./types";
import { getClubRating, teamStrengths } from "./data";

const HOME_BONUS = 7;

const POSITION_TRY_WEIGHT: Record<string, number> = {
  "Ailier":          10,
  "Centre":           7,
  "Arrière":          5,
  "Demi de mêlée":    3,
  "Ouvreur":          3,
  "Numéro 8":         2,
  "Troisième ligne":  1.5,
  "Deuxième ligne":   0.8,
  "Pilier gauche":    0.4,
  "Pilier droit":     0.4,
  "Talonneur":        0.3,
};

function buildWeightedScorers(players: Player[]): string[] {
  const weighted: string[] = [];
  for (const p of players) {
    const w = Math.max(1, Math.round((POSITION_TRY_WEIGHT[p.position] ?? 1) * 2));
    for (let i = 0; i < w; i++) weighted.push(p.name);
  }
  return weighted;
}

function getTeamStrength(clubName: string): number {
  return teamStrengths[clubName] ?? getClubRating(clubName);
}

function buildMatchCounts(myRating: number, opponentRating: number): [number, number] {
  // Total scoring actions: 7-12, avg ~9.5 → ~22 pts/team (realistic Top 14 range)
  const total = Math.max(5, Math.round(9 + (Math.random() - 0.5) * 5));
  // Squared ratings amplify skill gaps (otherwise 88 vs 82 looks the same as 95 vs 75)
  const myShare = (myRating * myRating) / (myRating * myRating + opponentRating * opponentRating);
  const myCount = Math.max(1, Math.round(total * myShare + (Math.random() - 0.5) * 2));
  const oppCount = Math.max(1, total - myCount + Math.round((Math.random() - 0.5) * 2));
  return [myCount, oppCount];
}

function randomActions(count: number): ScoringAction[] {
  return Array.from({ length: count }, () => {
    const r = Math.random();
    if (r < 0.38) return { type: "try_conv" as const, points: 7 };
    if (r < 0.48) return { type: "try" as const, points: 5 };
    return { type: "penalty" as const, points: 3 };
  });
}

function actionsToScore(actions: ScoringAction[]): number {
  return actions.reduce((sum, a) => sum + a.points, 0);
}

function uniqueMinute(used: Set<number>, preferred?: number): number {
  let m = preferred ?? Math.floor(Math.random() * 79) + 1;
  while (used.has(m) && m < 80) m++;
  used.add(m);
  return m;
}

function buildEvents(
  myActions: ScoringAction[],
  oppActions: ScoringAction[],
  scorers: string[],
): MatchEvent[] {
  const used = new Set<number>();
  const events: MatchEvent[] = [];

  for (const action of myActions) {
    const scorer = scorers[Math.floor(Math.random() * scorers.length)];
    const minute = uniqueMinute(used);

    if (action.type === "try_conv") {
      events.push({ minute, team: "me", text: `Essai de ${scorer}`, points: 5 });
      events.push({ minute: uniqueMinute(used, minute + 1), team: "me", text: "Transf. réussie", points: 2 });
    } else if (action.type === "try") {
      events.push({ minute, team: "me", text: `Essai de ${scorer}`, points: 5 });
    } else {
      events.push({ minute, team: "me", text: "Pénalité", points: 3 });
    }
  }

  for (const action of oppActions) {
    const minute = uniqueMinute(used);

    if (action.type === "try_conv") {
      events.push({ minute, team: "opponent", text: "Essai adverse", points: 5 });
      events.push({ minute: uniqueMinute(used, minute + 1), team: "opponent", text: "Transf. adverse réussie", points: 2 });
    } else if (action.type === "try") {
      events.push({ minute, team: "opponent", text: "Essai adverse", points: 5 });
    } else {
      events.push({ minute, team: "opponent", text: "Pénalité adverse", points: 3 });
    }
  }

  return events.sort((a, b) => a.minute - b.minute);
}

export function simulatePlayoffMatch(
  homeTeam: string,
  awayTeam: string,
  neutral = false,
): { homeScore: number; awayScore: number; winner: string } {
  const homeR = getTeamStrength(homeTeam) + (neutral ? 0 : HOME_BONUS);
  const awayR = getTeamStrength(awayTeam);

  const [homeCount, awayCount] = buildMatchCounts(homeR, awayR);
  const homeActions = randomActions(homeCount);
  const awayActions = randomActions(awayCount);

  let homeScore = actionsToScore(homeActions);
  let awayScore = actionsToScore(awayActions);

  if (homeScore === awayScore) {
    if (Math.random() > 0.5) homeScore += 3;
    else awayScore += 3;
  }

  return { homeScore, awayScore, winner: homeScore > awayScore ? homeTeam : awayTeam };
}

function assignMatchPoints(
  homeTeam: string,
  awayTeam: string,
  results: Record<string, number[]>,
) {
  const homeStr = getTeamStrength(homeTeam) + HOME_BONUS;
  const awayStr = getTeamStrength(awayTeam);
  const homeWinProb = (homeStr ** 2) / (homeStr ** 2 + awayStr ** 2);
  const DRAW_PROB = 0.02;
  const r = Math.random();
  if (r < DRAW_PROB) {
    results[homeTeam].push(2);
    results[awayTeam].push(2);
  } else if (r - DRAW_PROB < homeWinProb * (1 - DRAW_PROB)) {
    results[homeTeam].push(4);
    results[awayTeam].push(0);
  } else {
    results[homeTeam].push(0);
    results[awayTeam].push(4);
  }
}

/** Simulate a single league match between two named clubs (home advantage included). */
export function simulateLeagueMatch(home: string, away: string): RoundMatchResult {
  const homeR = getTeamStrength(home) + HOME_BONUS;
  const awayR = getTeamStrength(away);

  const [homeCount, awayCount] = buildMatchCounts(homeR, awayR);
  let homeScore = actionsToScore(randomActions(homeCount));
  let awayScore = actionsToScore(randomActions(awayCount));

  // Draws are very rare in rugby (~1-2%). Break ties 88% of the time.
  if (homeScore === awayScore && Math.random() < 0.88) {
    if (Math.random() > 0.5) homeScore += 3; else awayScore += 3;
  }

  return { home, away, homeScore, awayScore };
}

export function generateLeagueResults(opponents: string[]): Record<string, number[]> {
  const results: Record<string, number[]> = {};
  for (const team of opponents) results[team] = [];

  // Full round-robin: each pair plays twice (home and away), like Top 14
  for (let i = 0; i < opponents.length; i++) {
    for (let j = i + 1; j < opponents.length; j++) {
      assignMatchPoints(opponents[i], opponents[j], results);
      assignMatchPoints(opponents[j], opponents[i], results);
    }
  }

  // 2 matches vs the player's team (1 home, 1 away — approximated)
  for (const team of opponents) {
    const strength = getTeamStrength(team);
    const winProb = Math.min(0.72, 0.28 + (strength - 70) / 28 * 0.44);
    for (let k = 0; k < 2; k++) {
      const r = Math.random();
      results[team].push(r < winProb ? 4 : r < winProb + 0.02 ? 2 : 0);
    }
  }

  return results;
}

export function simulateMatch(
  myTeamRating: number,
  entry: CalendarEntry,
  selectedPlayers: Player[],
  matchNumber: number,
  stadiumBonus = 0,
  transportBonus = 0,
): MatchResult {
  const opponentRating = getTeamStrength(entry.opponent);
  const myEffective = myTeamRating * (entry.isHome ? 1 + stadiumBonus : 1 + transportBonus) + (entry.isHome ? HOME_BONUS : 0);
  const oppEffective = opponentRating + (entry.isHome ? 0 : HOME_BONUS);

  const [myCount, oppCount] = buildMatchCounts(myEffective, oppEffective);
  const myActions = randomActions(myCount);
  const oppActions = randomActions(oppCount);

  let myScore = actionsToScore(myActions);
  let opponentScore = actionsToScore(oppActions);
  const events = buildEvents(myActions, oppActions, buildWeightedScorers(selectedPlayers));

  // Draws are very rare in rugby (~1-2%). Break 88% of ties with a last-kick penalty.
  if (myScore === opponentScore && Math.random() < 0.88) {
    if (Math.random() > 0.5) myScore += 3;
    else opponentScore += 3;
  }

  const result: "Victoire" | "Défaite" | "Nul" =
    myScore > opponentScore ? "Victoire" :
    myScore < opponentScore ? "Défaite" : "Nul";

  return { matchNumber, opponent: entry.opponent, myScore, opponentScore, events, result };
}

/** Interactive playoff match using explicit ratings (friends mode — no club name lookup). */
export function beginFriendsPlayoffMatch(
  ratingA: number,
  ratingB: number,
  players: Player[],
): PlayoffMatchHandle {
  const [myTotal, oppTotal] = buildMatchCounts(ratingA, ratingB);
  const scorers = buildWeightedScorers(players);

  const myH1  = Math.max(0, Math.round(myTotal  * 0.43 + (Math.random() - 0.5)));
  const oppH1 = Math.max(0, Math.round(oppTotal * 0.43 + (Math.random() - 0.5)));
  const myH2Base  = Math.max(0, myTotal  - myH1);
  const oppH2Base = Math.max(0, oppTotal - oppH1);

  const h1MyActions  = randomActions(myH1);
  const h1OppActions = randomActions(oppH1);

  const firstHalf: HalfResult = {
    myScore:  actionsToScore(h1MyActions),
    oppScore: actionsToScore(h1OppActions),
    events:   buildHalfEvents(h1MyActions, h1OppActions, scorers, 1, 40),
  };

  function simulateSecondHalf(choice: HalfTimeChoice): HalfResult {
    let myH2  = myH2Base;
    let oppH2 = oppH2Base;
    if (choice === "tenir")        { myH2 = Math.max(0, Math.round(myH2 * 0.85)); oppH2 = Math.max(0, Math.round(oppH2 * 0.72)); }
    else if (choice === "attaquer"){ myH2 = Math.round(myH2 * 1.30); oppH2 = Math.round(oppH2 * 1.10); }
    else if (choice === "tout_ou_rien") { myH2 = Math.max(0, Math.round(myH2 * (Math.random() > 0.5 ? 1.65 : 0.45))); }
    const h2MyActions  = randomActions(myH2);
    const h2OppActions = randomActions(oppH2);
    return { myScore: actionsToScore(h2MyActions), oppScore: actionsToScore(h2OppActions), events: buildHalfEvents(h2MyActions, h2OppActions, scorers, 41, 80) };
  }

  return { firstHalf, simulateSecondHalf };
}

/** Simulate a match between two teams using their pre-computed ratings (friends mode). */
export function simulateFriendsMatch(
  ratingA: number,
  ratingB: number,
): { scoreA: number; scoreB: number; winnerIsA: boolean } {
  const [countA, countB] = buildMatchCounts(ratingA, ratingB);
  let scoreA = actionsToScore(randomActions(countA));
  let scoreB = actionsToScore(randomActions(countB));
  if (scoreA === scoreB) {
    if (Math.random() > 0.5) scoreA += 3; else scoreB += 3;
  }
  return { scoreA, scoreB, winnerIsA: scoreA > scoreB };
}

/* ── Playoff immersive match (two-halves, halftime choice) ──── */

export type HalfTimeChoice = "tenir" | "attaquer" | "tout_ou_rien" | "rien";

export type HalfResult = { myScore: number; oppScore: number; events: MatchEvent[] };

export type PlayoffMatchHandle = {
  firstHalf: HalfResult;
  simulateSecondHalf: (choice: HalfTimeChoice) => HalfResult;
};

function buildHalfEvents(
  myActions: ScoringAction[],
  oppActions: ScoringAction[],
  scorers: string[],
  minMin: number,
  maxMin: number,
): MatchEvent[] {
  const used = new Set<number>();
  const range = maxMin - minMin;
  const events: MatchEvent[] = [];

  function pickMinute(): number {
    let m = Math.floor(Math.random() * range) + minMin;
    let tries = 0;
    while (used.has(m) && tries < range) {
      m++;
      if (m >= maxMin) m = minMin;
      tries++;
    }
    used.add(m);
    return m;
  }

  for (const action of myActions) {
    const scorer = scorers.length > 0 ? scorers[Math.floor(Math.random() * scorers.length)] : "Joueur";
    const minute = pickMinute();
    if (action.type === "try_conv") {
      events.push({ minute, team: "me", text: `Essai de ${scorer}`, points: 5 });
      events.push({ minute: Math.min(minute + 1, maxMin - 1), team: "me", text: "Transf. réussie", points: 2 });
    } else if (action.type === "try") {
      events.push({ minute, team: "me", text: `Essai de ${scorer}`, points: 5 });
    } else {
      events.push({ minute, team: "me", text: "Pénalité", points: 3 });
    }
  }

  for (const action of oppActions) {
    const minute = pickMinute();
    if (action.type === "try_conv") {
      events.push({ minute, team: "opponent", text: "Essai adverse", points: 5 });
      events.push({ minute: Math.min(minute + 1, maxMin - 1), team: "opponent", text: "Transf. adverse réussie", points: 2 });
    } else if (action.type === "try") {
      events.push({ minute, team: "opponent", text: "Essai adverse", points: 5 });
    } else {
      events.push({ minute, team: "opponent", text: "Pénalité adverse", points: 3 });
    }
  }

  return events.sort((a, b) => a.minute - b.minute);
}

export function beginPlayoffMatch(
  myTeamRating: number,
  entry: CalendarEntry,
  selectedPlayers: Player[],
  neutral = false,
  mentalCoachBonus = 0,
): PlayoffMatchHandle {
  const opponentRating = getTeamStrength(entry.opponent);
  const myEffective  = myTeamRating * (1 + mentalCoachBonus) + (neutral ? 0 : entry.isHome ? HOME_BONUS : 0);
  const oppEffective = opponentRating  + (neutral ? 0 : entry.isHome ? 0 : HOME_BONUS);

  const [myTotal, oppTotal] = buildMatchCounts(myEffective, oppEffective);
  const scorers = buildWeightedScorers(selectedPlayers);

  // Split total actions into halves (~43% first, ~57% second)
  const myH1 = Math.max(0, Math.round(myTotal * 0.43 + (Math.random() - 0.5)));
  const oppH1 = Math.max(0, Math.round(oppTotal * 0.43 + (Math.random() - 0.5)));
  const myH2Base = Math.max(0, myTotal - myH1);
  const oppH2Base = Math.max(0, oppTotal - oppH1);

  const h1MyActions = randomActions(myH1);
  const h1OppActions = randomActions(oppH1);

  const firstHalf: HalfResult = {
    myScore: actionsToScore(h1MyActions),
    oppScore: actionsToScore(h1OppActions),
    events: buildHalfEvents(h1MyActions, h1OppActions, scorers, 1, 40),
  };

  function simulateSecondHalf(choice: HalfTimeChoice): HalfResult {
    let myH2 = myH2Base;
    let oppH2 = oppH2Base;

    if (choice === "tenir") {
      myH2 = Math.max(0, Math.round(myH2 * 0.85));
      oppH2 = Math.max(0, Math.round(oppH2 * 0.72));
    } else if (choice === "attaquer") {
      myH2 = Math.round(myH2 * 1.30);
      oppH2 = Math.round(oppH2 * 1.10);
    } else if (choice === "tout_ou_rien") {
      myH2 = Math.max(0, Math.round(myH2 * (Math.random() > 0.5 ? 1.65 : 0.45)));
    }
    // "rien" → no modifier applied

    const h2MyActions = randomActions(myH2);
    const h2OppActions = randomActions(oppH2);

    return {
      myScore: actionsToScore(h2MyActions),
      oppScore: actionsToScore(h2OppActions),
      events: buildHalfEvents(h2MyActions, h2OppActions, scorers, 41, 80),
    };
  }

  return { firstHalf, simulateSecondHalf };
}
