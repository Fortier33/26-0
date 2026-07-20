import type { CalendarEntry, Fixture } from "./types";

/**
 * Berger circle algorithm – 26-round double round-robin for 14 teams.
 *
 * IMPORTANT: teams[n-1] is the "fixed" anchor. The fixed team alternates
 * home/away every round by construction (even rounds = home, odd = away).
 * Pass myTeamName as the LAST element so its schedule is H,A,H,A,... and
 * the first 13 rounds cover all 13 opponents exactly once.
 *
 * Call site: generateSchedule([...shuffledOpponents, myTeamName])
 */
export function generateSchedule(teams: string[]): Fixture[][] {
  const n = teams.length; // must be even (14)
  const fixed = teams[n - 1];
  const rotating = teams.slice(0, n - 1);

  const firstHalf: Fixture[][] = [];

  for (let r = 0; r < n - 1; r++) {
    const round: Fixture[] = [];
    const rot = [...rotating.slice(r), ...rotating.slice(0, r)];

    // Fixed team alternates H/A every round
    round.push(r % 2 === 0 ? { home: fixed, away: rot[0] } : { home: rot[0], away: fixed });

    for (let i = 1; i <= n / 2 - 1; i++) {
      const a = rot[i];
      const b = rot[n - 1 - i];
      round.push((r + i) % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
    }

    firstHalf.push(round);
  }

  // Second half: swap home/away of every fixture.
  // Fixed team was H,A,H,A,... in first half → becomes A,H,A,H,... seamlessly.
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
