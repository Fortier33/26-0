import type { CalendarEntry, Fixture } from "./types";

/**
 * Berger circle algorithm – generates a full double round-robin schedule
 * for an even number of teams (26 rounds for 14 teams).
 *
 * The last team in the array is the "fixed" anchor; all others rotate.
 * Second half reverses home/away of the first half, guaranteeing each pair
 * plays once at home and once away.
 */
export function generateSchedule(teams: string[]): Fixture[][] {
  const n = teams.length; // must be even (14)
  const fixed = teams[n - 1];
  const rotating = teams.slice(0, n - 1); // n-1 = 13

  const firstHalf: Fixture[][] = [];

  for (let r = 0; r < n - 1; r++) {
    const round: Fixture[] = [];
    const rot = [...rotating.slice(r), ...rotating.slice(0, r)];

    // Fixed team vs rot[0], alternate home/away each round
    round.push(r % 2 === 0 ? { home: fixed, away: rot[0] } : { home: rot[0], away: fixed });

    // Pair rot[i] with rot[n-1-i] for i = 1 … n/2-1
    for (let i = 1; i <= n / 2 - 1; i++) {
      const a = rot[i];
      const b = rot[n - 1 - i];
      round.push((r + i) % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
    }

    firstHalf.push(round);
  }

  // Second half: swap home/away (guarantees each pair plays home once, away once)
  const secondHalf: Fixture[][] = firstHalf.map(round =>
    round.map(f => ({ home: f.away, away: f.home }))
  );

  return [...firstHalf, ...secondHalf];
}

/** Extract the 26 CalendarEntry items for myTeamName from a full schedule. */
export function extractCalendar(schedule: Fixture[][], myTeamName: string): CalendarEntry[] {
  return schedule.map(round => {
    const f = round.find(f => f.home === myTeamName || f.away === myTeamName)!;
    return { opponent: f.home === myTeamName ? f.away : f.home, isHome: f.home === myTeamName };
  });
}
