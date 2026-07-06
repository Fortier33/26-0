"use client";

import React, { useEffect, useMemo, useState } from "react";
import { HomeScreen } from "@/components/HomeScreen";
import { DraftScreen } from "@/components/DraftScreen";
import { SeasonScreen } from "@/components/SeasonScreen";
import { PlayoffsScreen } from "@/components/PlayoffsScreen";
import { RecapScreen } from "@/components/RecapScreen";
import { MercatoScreen } from "@/components/MercatoScreen";
import { BlackoutTransition } from "@/components/BlackoutTransition";
import { clubs, buildCalendar } from "@/lib/data";
import { generateLeagueResults } from "@/lib/simulation";
import type { CalendarEntry, MatchEvent, Player, PlayoffSummary, Screen, SeasonRecord } from "@/lib/types";

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
  const [leagueResults, setLeagueResults] = useState<Record<string, number[]>>({});
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [seasonRevealed, setSeasonRevealed] = useState<string[]>([]);
  const [regularSeasonDone, setRegularSeasonDone] = useState(false);
  const [qualifiedTeams, setQualifiedTeams] = useState<string[]>([]);
  const [myFinalPosition, setMyFinalPosition] = useState(0);
  const [playoffSummary, setPlayoffSummary] = useState<PlayoffSummary | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [seasonTries, setSeasonTries] = useState<Record<string, number>>({});
  const [seasonHistory, setSeasonHistory] = useState<SeasonRecord[]>([]);

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
    setSelectedPlayers((prev) => [...prev, { ...player, club: currentClub }]);
    setAwaitingNewClub(true);
  }

  function handleNewClub() {
    const keys = Object.keys(clubs);
    setCurrentClub(keys[Math.floor(Math.random() * keys.length)]);
    setAwaitingNewClub(false);
  }

  function handleStartDraft() {
    setScreen("draft");
  }

  function handleStartSeason() {
    const cal = buildCalendar();
    const opponents = [...new Set(cal.map((e) => e.opponent))];
    setCalendar(cal);
    setLeagueResults(generateLeagueResults(opponents));
    setCurrentMatchIndex(0);
    setSeasonRevealed([]);
    setRegularSeasonDone(false);
    setScreen("season");
  }

  function handleMatchComplete(resultLine: string, events: MatchEvent[]) {
    events
      .filter((e) => e.team === "me" && e.text.startsWith("Essai de "))
      .forEach((e) => {
        const name = e.text.replace("Essai de ", "");
        setSeasonTries((prev) => ({ ...prev, [name]: (prev[name] ?? 0) + 1 }));
      });
    setSeasonRevealed((prev) => [...prev, resultLine]);
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
    const myWins = seasonRevealed.filter((r) => r.startsWith("✦")).length;
    const myDraws = seasonRevealed.filter((r) => r.startsWith("◈")).length;

    const rows = [
      { name: myTeamName, points: myWins * 4 + myDraws * 2, won: myWins },
      ...Object.entries(leagueResults).map(([team, pts]) => {
        const won = pts.filter((p) => p === 4).length;
        return { name: team, points: pts.reduce((s, p) => s + p, 0), won };
      }),
    ].sort((a, b) => b.points - a.points || b.won - a.won);

    const top6 = rows.slice(0, 6).map((r) => r.name);
    setQualifiedTeams(top6);
    const pos = rows.findIndex((r) => r.name === myTeamName) + 1;
    setMyFinalPosition(pos);
    if (!top6.includes(myTeamName)) {
      const record = buildSeasonRecord(seasonRevealed, seasonTries, pos, seasonNumber, "non-qualifié");
      setSeasonHistory((prev) => [...prev, record]);
      setPlayoffSummary({ outcome: "non-qualifié", matches: [] });
      setScreen("recap");
    } else {
      setTransitioning(true);
    }
  }

  function handlePlayoffsComplete(summary: PlayoffSummary) {
    const record = buildSeasonRecord(seasonRevealed, seasonTries, myFinalPosition, seasonNumber, summary.outcome);
    setSeasonHistory((prev) => [...prev, record]);
    setPlayoffSummary(summary);
    setScreen("recap");
  }

  function handleNextSeason() {
    setCalendar([]);
    setLeagueResults({});
    setCurrentMatchIndex(0);
    setSeasonRevealed([]);
    setRegularSeasonDone(false);
    setQualifiedTeams([]);
    setMyFinalPosition(0);
    setPlayoffSummary(null);
    setSeasonTries({});
    setSeasonNumber((n) => n + 1);
    setScreen("mercato");
  }

  function handleMercatoComplete(newPlayers: Player[]) {
    const cal = buildCalendar();
    const opponents = [...new Set(cal.map((e) => e.opponent))];
    setSelectedPlayers(newPlayers);
    setCalendar(cal);
    setLeagueResults(generateLeagueResults(opponents));
    setCurrentMatchIndex(0);
    setSeasonRevealed([]);
    setRegularSeasonDone(false);
    setScreen("season");
  }

  function handleReplay() {
    const keys = Object.keys(clubs);
    setScreen("home");
    setSelectedPlayers([]);
    setSameClubRerolls(3);
    setSameSeasonRerolls(3);
    setShownClubs(new Set());
    setAwaitingNewClub(true);
    setCurrentClub(keys[Math.floor(Math.random() * keys.length)]);
    setCalendar([]);
    setLeagueResults({});
    setCurrentMatchIndex(0);
    setSeasonRevealed([]);
    setRegularSeasonDone(false);
    setQualifiedTeams([]);
    setMyFinalPosition(0);
    setPlayoffSummary(null);
    setSeasonNumber(1);
    setSeasonTries({});
    setSeasonHistory([]);
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
        leagueResults={leagueResults}
        currentMatchIndex={currentMatchIndex}
        seasonRevealed={seasonRevealed}
        regularSeasonDone={regularSeasonDone}
        calendar={calendar}
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
        onReplay={handleReplay}
        onNextSeason={handleNextSeason}
      />
    );
  } else if (screen === "mercato") {
    content = (
      <MercatoScreen
        selectedPlayers={selectedPlayers}
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
        <BlackoutTransition
          onReveal={() => setScreen("playoffs")}
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
