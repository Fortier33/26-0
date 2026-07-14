"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { HomeScreen } from "@/components/HomeScreen";
import { DraftScreen } from "@/components/DraftScreen";
import { SeasonScreen } from "@/components/SeasonScreen";
import { PlayoffsScreen } from "@/components/PlayoffsScreen";
import { RecapScreen } from "@/components/RecapScreen";
import { MercatoScreen } from "@/components/MercatoScreen";
import { ScreenTransition } from "@/components/ScreenTransition";
import { clubs, OPPONENTS } from "@/lib/data";
import { simulateLeagueMatch } from "@/lib/simulation";
import { generateSchedule, extractCalendar } from "@/lib/schedule";
import { defaultUpgradeGrades, getWinIncome, getStadiumBonus, LEAGUE_PRIZES, getPlayoffPrize } from "@/lib/budget";
import type { CalendarEntry, ClubUpgrade, Fixture, MatchEvent, Player, PlayoffSummary, RoundMatchResult, Screen, SeasonRecord, UpgradeGrades } from "@/lib/types";

const TOTAL_MATCHES = 26;

function getClubAndSeason(key: string) {
  const season = key.match(/\d{2}-\d{2}$/)![0];
  const club = key.slice(0, key.length - season.length - 1);
  return { club, season };
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  // Initialize to "light" (server-safe), then sync from localStorage after hydration
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    if (screen === "home") return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [screen]);

  function toggleTheme() {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      return next;
    });
  }

  const [myTeamName, setMyTeamName] = useState("Mon XV");
  const [currentClub, setCurrentClub] = useState(() => {
    const keys = Object.keys(clubs);
    return keys[Math.floor(Math.random() * keys.length)];
  });
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [sameClubRerolls, setSameClubRerolls] = useState(3);
  const [sameSeasonRerolls, setSameSeasonRerolls] = useState(3);
  const [shownClubs, setShownClubs] = useState<Set<string>>(new Set());
  const [awaitingNewClub, setAwaitingNewClub] = useState(true);

  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[][]>([]);
  const [roundResults, setRoundResults] = useState<RoundMatchResult[][]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [seasonRevealed, setSeasonRevealed] = useState<string[]>([]);
  const [regularSeasonDone, setRegularSeasonDone] = useState(false);
  const [qualifiedTeams, setQualifiedTeams] = useState<string[]>([]);
  const [myFinalPosition, setMyFinalPosition] = useState(0);
  const [playoffSummary, setPlayoffSummary] = useState<PlayoffSummary | null>(null);
  const [transitioning, setTransitioning]   = useState(false);
  const [transitionLabel, setTransitionLabel] = useState("");
  const [transitionColor, setTransitionColor] = useState("#D4AF37");
  const transitionRevealRef = useRef<(() => void) | null>(null);

  function triggerTransition(label: string, color: string, onReveal: () => void) {
    transitionRevealRef.current = onReveal;
    setTransitionLabel(label);
    setTransitionColor(color);
    setTransitioning(true);
  }
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [seasonTries, setSeasonTries] = useState<Record<string, number>>({});
  const [seasonHistory, setSeasonHistory] = useState<SeasonRecord[]>([]);

  // ── Budget & club upgrades ────────────────────────────────────
  const [budget, setBudget] = useState(0);
  const [upgrades, setUpgrades] = useState<UpgradeGrades>(defaultUpgradeGrades);
  // Season-scoped financial counters (reset each new season, budget itself carries over)
  const [seasonMatchIncome, setSeasonMatchIncome] = useState(0);
  const [seasonLeaguePrize, setSeasonLeaguePrize] = useState(0);
  const [seasonPlayoffPrize, setSeasonPlayoffPrize] = useState(0);
  const currentRecordRef = useRef<SeasonRecord | null>(null);

  const teamRating = useMemo(() => {
    if (selectedPlayers.length === 0) return 0;
    const total = selectedPlayers.reduce((sum, p) => sum + p.rating, 0);
    return Math.round(total / selectedPlayers.length);
  }, [selectedPlayers]);

  const currentPlayers = useMemo(
    () => clubs[currentClub] ?? [],
    [currentClub],
  );

  const hasOtherSeasons = useMemo(() => {
    const { club } = getClubAndSeason(currentClub);
    return Object.keys(clubs).some((k) => getClubAndSeason(k).club === club && k !== currentClub);
  }, [currentClub]);

  function handleRerollSameClub() {
    if (sameClubRerolls <= 0) return;
    const { club } = getClubAndSeason(currentClub);
    const nextShown = new Set([...shownClubs, currentClub]);
    const options = Object.keys(clubs).filter((k) => getClubAndSeason(k).club === club && !nextShown.has(k));
    if (options.length === 0) return;
    setCurrentClub(options[Math.floor(Math.random() * options.length)]);
    setShownClubs(nextShown);
    setSameClubRerolls((n) => n - 1);
  }

  function handleRerollSameSeason() {
    if (sameSeasonRerolls <= 0) return;
    const { season } = getClubAndSeason(currentClub);
    const nextShown = new Set([...shownClubs, currentClub]);
    const options = Object.keys(clubs).filter((k) => getClubAndSeason(k).season === season && !nextShown.has(k));
    if (options.length === 0) return;
    setCurrentClub(options[Math.floor(Math.random() * options.length)]);
    setShownClubs(nextShown);
    setSameSeasonRerolls((n) => n - 1);
  }

  function handleSelectPlayer(player: Player) {
    if (selectedPlayers.length >= 15) return;
    if (selectedPlayers.some((sp) => sp.name === player.name)) return;
    setSelectedPlayers((prev) => [...prev, { ...player, club: currentClub }]);
    setAwaitingNewClub(true);
  }

  function handleNewClub() {
    const keys = Object.keys(clubs);
    setCurrentClub(keys[Math.floor(Math.random() * keys.length)]);
    setAwaitingNewClub(false);
  }

  function handleStartDraft() {
    triggerTransition("RECRUTEMENT", "#D4AF37", () => setScreen("draft"));
  }

  function buildNewSeason() {
    const schedule = generateSchedule([myTeamName, ...OPPONENTS]);
    const cal = extractCalendar(schedule, myTeamName);
    return { schedule, cal };
  }

  function handleStartSeason() {
    const { schedule, cal } = buildNewSeason();
    triggerTransition("SAISON 1", "#D4AF37", () => {
      setFixtures(schedule);
      setCalendar(cal);
      setRoundResults([]);
      setCurrentMatchIndex(0);
      setSeasonRevealed([]);
      setRegularSeasonDone(false);
      setScreen("season");
    });
  }

  function handleMatchComplete(resultLine: string, events: MatchEvent[]) {
    events
      .filter((e) => e.team === "me" && e.text.startsWith("Essai de "))
      .forEach((e) => {
        const name = e.text.replace("Essai de ", "");
        setSeasonTries((prev) => ({ ...prev, [name]: (prev[name] ?? 0) + 1 }));
      });

    if (resultLine.startsWith("✦")) {
      const income = getWinIncome(upgrades.marketing);
      setBudget((prev) => prev + income);
      setSeasonMatchIncome((prev) => prev + income);
    }

    // Build the player's RoundMatchResult from the result line
    const [, myS, oppS, opponent, homeFlag] = resultLine.split("|");
    const myScore = parseInt(myS);
    const oppScore = parseInt(oppS);
    const isHome = homeFlag === "1";
    const playerResult: RoundMatchResult = {
      home: isHome ? myTeamName : opponent,
      away: isHome ? opponent : myTeamName,
      homeScore: isHome ? myScore : oppScore,
      awayScore: isHome ? oppScore : myScore,
    };

    // Simulate the other 6 matches of this round
    const roundIdx = currentMatchIndex;
    const roundFixtures = fixtures[roundIdx] ?? [];
    const otherResults: RoundMatchResult[] = roundFixtures
      .filter(f => f.home !== myTeamName && f.away !== myTeamName)
      .map(f => simulateLeagueMatch(f.home, f.away));

    setSeasonRevealed((prev) => [...prev, resultLine]);
    setRoundResults((prev) => [...prev, [playerResult, ...otherResults]]);
    setCurrentMatchIndex((prev) => {
      const next = prev + 1;
      if (next >= TOTAL_MATCHES) setRegularSeasonDone(true);
      return next;
    });
  }

  function buildSeasonRecord(
    lines: string[],
    tries: Record<string, number>,
    finalPos: number,
    sNum: number,
    outcome: PlayoffSummary["outcome"],
  ): SeasonRecord {
    const wins = lines.filter((r) => r.startsWith("✦")).length;
    const draws = lines.filter((r) => r.startsWith("◈")).length;
    const losses = lines.filter((r) => r.startsWith("✕")).length;
    let pointsScored = 0, pointsConceded = 0;
    let biggestWinMargin = 0, biggestWinDetails = "";
    let biggestLossMargin = 0, biggestLossDetails = "";
    let streak = 0, longestWinStreak = 0;
    for (const line of lines) {
      const [, myS, oppS, opp] = line.split("|");
      const my = parseInt(myS), opp2 = parseInt(oppS);
      const oppName = opp.replace(/\s\d{2}-\d{2}$/, "");
      pointsScored += my; pointsConceded += opp2;
      if (my - opp2 > biggestWinMargin) { biggestWinMargin = my - opp2; biggestWinDetails = `${my}-${opp2} vs ${oppName}`; }
      if (opp2 - my > biggestLossMargin) { biggestLossMargin = opp2 - my; biggestLossDetails = `${my}-${opp2} vs ${oppName}`; }
      if (line.startsWith("✦")) { streak++; longestWinStreak = Math.max(longestWinStreak, streak); } else { streak = 0; }
    }
    const topTryScorer = Object.entries(tries).reduce<{ name: string; tries: number } | null>(
      (best, [name, t]) => (!best || t > best.tries) ? { name, tries: t } : best, null
    );
    return { seasonNumber: sNum, finalPosition: finalPos, wins, draws, losses, leaguePoints: wins * 4 + draws * 2, pointsScored, pointsConceded, longestWinStreak, topTryScorer, biggestWinMargin, biggestWinDetails, biggestLossMargin, biggestLossDetails, playoffOutcome: outcome };
  }

  function handleGoToPlayoffs() {
    const standings = computeFinalStandings(roundResults, myTeamName);
    const top6 = standings.slice(0, 6).map((r) => r.name);
    const pos = standings.findIndex((r) => r.name === myTeamName) + 1;
    const leaguePrize = LEAGUE_PRIZES[pos] ?? 0;
    if (!top6.includes(myTeamName)) {
      const record = buildSeasonRecord(seasonRevealed, seasonTries, pos, seasonNumber, "non-qualifié");
      currentRecordRef.current = record;
      triggerTransition("BILAN", "#D4AF37", () => {
        setQualifiedTeams(top6);
        setMyFinalPosition(pos);
        setBudget((prev) => prev + leaguePrize);
        setSeasonLeaguePrize(leaguePrize);
        setSeasonHistory((prev) => [...prev, record]);
        setPlayoffSummary({ outcome: "non-qualifié", matches: [] });
        setScreen("recap");
      });
    } else {
      triggerTransition("PLAY-OFFS", "#D4AF37", () => {
        setQualifiedTeams(top6);
        setMyFinalPosition(pos);
        setBudget((prev) => prev + leaguePrize);
        setSeasonLeaguePrize(leaguePrize);
        setScreen("playoffs");
      });
    }
  }

  function computeFinalStandings(results: RoundMatchResult[][], myName: string) {
    const stats: Record<string, { won: number; drawn: number; lost: number }> = {};
    for (const round of results) {
      for (const m of round) {
        if (!stats[m.home]) stats[m.home] = { won: 0, drawn: 0, lost: 0 };
        if (!stats[m.away]) stats[m.away] = { won: 0, drawn: 0, lost: 0 };
        if (m.homeScore > m.awayScore) {
          stats[m.home].won++; stats[m.away].lost++;
        } else if (m.homeScore < m.awayScore) {
          stats[m.away].won++; stats[m.home].lost++;
        } else {
          stats[m.home].drawn++; stats[m.away].drawn++;
        }
      }
    }
    return Object.entries(stats)
      .map(([name, s]) => ({ name, points: s.won * 4 + s.drawn * 2, won: s.won, isMe: name === myName }))
      .sort((a, b) => b.points - a.points || b.won - a.won);
  }

  function handlePlayoffsComplete(summary: PlayoffSummary) {
    const playoffPrize = getPlayoffPrize(summary.outcome, summary.eliminatedIn);
    const record = buildSeasonRecord(seasonRevealed, seasonTries, myFinalPosition, seasonNumber, summary.outcome);
    currentRecordRef.current = record;
    triggerTransition("BILAN", "#D4AF37", () => {
      setBudget((prev) => prev + playoffPrize);
      setSeasonPlayoffPrize(playoffPrize);
      setSeasonHistory((prev) => [...prev, record]);
      setPlayoffSummary(summary);
      setScreen("recap");
    });
  }

  function handleNextSeason() {
    triggerTransition("INTER-SAISON", "#8FAFC8", () => {
      setCalendar([]);
      setFixtures([]);
      setRoundResults([]);
      setCurrentMatchIndex(0);
      setSeasonRevealed([]);
      setRegularSeasonDone(false);
      setQualifiedTeams([]);
      // myFinalPosition kept: mercato uses it for rating cap; overwritten at end of new season.
      setPlayoffSummary(null);
      setSeasonTries({});
      setSeasonNumber((n) => n + 1);
      setSeasonMatchIncome(0);
      setSeasonLeaguePrize(0);
      setSeasonPlayoffPrize(0);
      setScreen("mercato");
    });
  }

  function handleMercatoComplete(newPlayers: Player[], newBudget: number, newUpgrades: UpgradeGrades) {
    const { schedule, cal } = buildNewSeason();
    triggerTransition(`SAISON ${seasonNumber}`, "#D4AF37", () => {
      setSelectedPlayers(newPlayers);
      setFixtures(schedule);
      setCalendar(cal);
      setRoundResults([]);
      setCurrentMatchIndex(0);
      setSeasonRevealed([]);
      setRegularSeasonDone(false);
      setBudget(newBudget);
      setUpgrades(newUpgrades);
      setScreen("season");
    });
  }

  function handleReplay() {
    const keys = Object.keys(clubs);
    const newClub = keys[Math.floor(Math.random() * keys.length)];
    triggerTransition("NOUVEAU JEU", "#D4AF37", () => {
      setScreen("home");
      setSelectedPlayers([]);
      setSameClubRerolls(3);
      setSameSeasonRerolls(3);
      setShownClubs(new Set());
      setAwaitingNewClub(true);
      setCurrentClub(newClub);
      setCalendar([]);
      setFixtures([]);
      setRoundResults([]);
      setCurrentMatchIndex(0);
      setSeasonRevealed([]);
      setRegularSeasonDone(false);
      setQualifiedTeams([]);
      setMyFinalPosition(0);
      setPlayoffSummary(null);
      setSeasonNumber(1);
      setSeasonTries({});
      setSeasonHistory([]);
      setBudget(0);
      setUpgrades(defaultUpgradeGrades);
      setSeasonMatchIncome(0);
      setSeasonLeaguePrize(0);
      setSeasonPlayoffPrize(0);
      currentRecordRef.current = null;
    });
  }

  let content: React.ReactNode;

  if (screen === "draft") {
    content = (
      <DraftScreen
        currentClub={currentClub}
        players={currentPlayers}
        selectedPlayers={selectedPlayers}
        sameClubRerolls={sameClubRerolls}
        sameSeasonRerolls={sameSeasonRerolls}
        hasOtherSeasons={hasOtherSeasons}
        teamRating={teamRating}
        awaitingNewClub={awaitingNewClub}
        onSelectPlayer={handleSelectPlayer}
        onRerollSameClub={handleRerollSameClub}
        onRerollSameSeason={handleRerollSameSeason}
        onNewClub={handleNewClub}
        onStartSeason={handleStartSeason}
      />
    );
  } else if (screen === "season") {
    content = (
      <SeasonScreen
        myTeamName={myTeamName}
        teamRating={teamRating}
        selectedPlayers={selectedPlayers}
        roundResults={roundResults}
        currentMatchIndex={currentMatchIndex}
        seasonRevealed={seasonRevealed}
        regularSeasonDone={regularSeasonDone}
        calendar={calendar}
        budget={budget}
        winIncome={getWinIncome(upgrades.marketing)}
        stadiumBonus={getStadiumBonus(upgrades.stadium)}
        onMatchComplete={handleMatchComplete}
        onGoToRanking={handleGoToPlayoffs}
      />
    );
  } else if (screen === "playoffs") {
    content = (
      <PlayoffsScreen
        myTeamName={myTeamName}
        teamRating={teamRating}
        selectedPlayers={selectedPlayers}
        qualifiedTeams={qualifiedTeams}
        onComplete={handlePlayoffsComplete}
      />
    );
  } else if (screen === "recap" && playoffSummary) {
    const seasonWins = seasonRevealed.filter((r) => r.startsWith("✦")).length;
    const seasonDraws = seasonRevealed.filter((r) => r.startsWith("◈")).length;
    const seasonLosses = seasonRevealed.filter((r) => r.startsWith("✕")).length;
    content = (
      <RecapScreen
        myTeamName={myTeamName}
        selectedPlayers={selectedPlayers}
        seasonWins={seasonWins}
        seasonDraws={seasonDraws}
        seasonLosses={seasonLosses}
        seasonPoints={seasonWins * 4 + seasonDraws * 2}
        myFinalPosition={myFinalPosition}
        playoffSummary={playoffSummary}
        seasonHistory={seasonHistory}
        currentRecord={currentRecordRef.current}
        budget={budget}
        seasonMatchIncome={seasonMatchIncome}
        seasonLeaguePrize={seasonLeaguePrize}
        seasonPlayoffPrize={seasonPlayoffPrize}
        onReplay={handleReplay}
        onNextSeason={handleNextSeason}
      />
    );
  } else if (screen === "mercato") {
    content = (
      <MercatoScreen
        selectedPlayers={selectedPlayers}
        seasonNumber={seasonNumber}
        myFinalPosition={myFinalPosition}
        budget={budget}
        upgrades={upgrades}
        onComplete={handleMercatoComplete}
      />
    );
  } else {
    content = (
      <HomeScreen
        myTeamName={myTeamName}
        onChangeTeamName={setMyTeamName}
        onStartDraft={handleStartDraft}
      />
    );
  }

  return (
    <div data-theme={theme}>
      {transitioning && (
        <ScreenTransition
          label={transitionLabel}
          color={transitionColor}
          onReveal={() => { transitionRevealRef.current?.(); transitionRevealRef.current = null; }}
          onDone={() => setTransitioning(false)}
        />
      )}
      {/* Floating controls */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
        <button
          onClick={toggleTheme}
          className="bg-c-surface border border-[var(--c-border)] hover:border-c-gold/50 text-[var(--c-muted)] hover:text-c-fg font-bold uppercase tracking-widest text-[10px] px-3 py-2 transition-all"
        >
          {theme === "dark" ? "☀ Light" : "☾ Dark"}
        </button>
      </div>

      <div key={screen} className="screen-enter">
        {content}
      </div>
    </div>
  );
}
