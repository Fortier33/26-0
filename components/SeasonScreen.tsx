"use client";

import { useMemo, useRef, useState } from "react";
import { simulateMatch } from "@/lib/simulation";
import type { CalendarEntry, MatchEvent, MatchResult, Player } from "@/lib/types";

const TOTAL_MATCHES = 26;
const MID_SEASON = 13;

const stripSeason = (s: string) => s.replace(/\s\d{2}-\d{2}$/, "");

interface SeasonScreenProps {
  myTeamName: string;
  teamRating: number;
  selectedPlayers: Player[];
  leagueResults: Record<string, number[]>;
  currentMatchIndex: number;
  seasonRevealed: string[];
  regularSeasonDone: boolean;
  calendar: CalendarEntry[];
  onMatchComplete: (resultLine: string) => void;
  onGoToRanking: () => void;
}

function buildResultLine(match: MatchResult, isHome: boolean): string {
  const icon = match.result === "Victoire" ? "✦" : match.result === "Nul" ? "◈" : "✕";
  return `${icon}|${match.myScore}|${match.opponentScore}|${match.opponent}|${isHome ? "1" : "0"}`;
}

export function SeasonScreen({
  myTeamName,
  teamRating,
  selectedPlayers,
  leagueResults,
  currentMatchIndex,
  seasonRevealed,
  regularSeasonDone,
  calendar,
  onMatchComplete,
  onGoToRanking,
}: SeasonScreenProps) {
  const [matchMinute, setMatchMinute] = useState(0);
  const [liveMyScore, setLiveMyScore] = useState(0);
  const [liveOpponentScore, setLiveOpponentScore] = useState(0);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [currentOpponent, setCurrentOpponent] = useState("");
  const [currentMatchIsHome, setCurrentMatchIsHome] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [mobileTab, setMobileTab] = useState<"match" | "classement">("match");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentMatchRef = useRef<MatchResult | null>(null);

  const played = seasonRevealed.length;

  const standings = useMemo(() => {
    const myWins = seasonRevealed.filter(r => r.startsWith("✦")).length;
    const myDraws = seasonRevealed.filter(r => r.startsWith("◈")).length;
    const myLosses = seasonRevealed.filter(r => r.startsWith("✕")).length;

    const rows = [
      {
        name: myTeamName, played, won: myWins, drawn: myDraws, lost: myLosses,
        points: myWins * 4 + myDraws * 2, isMe: true,
      },
      ...Object.entries(leagueResults).map(([team, pts]) => {
        const slice = pts.slice(0, played);
        const won = slice.filter(p => p === 4).length;
        const drawn = slice.filter(p => p === 2).length;
        const lost = slice.filter(p => p === 0).length;
        return { name: team, played: slice.length, won, drawn, lost, points: slice.reduce((s, p) => s + p, 0), isMe: false };
      }),
    ];
    return rows.sort((a, b) => b.points - a.points || b.won - a.won);
  }, [seasonRevealed, played, leagueResults, myTeamName]);

  const myPosition = standings.findIndex(r => r.isMe) + 1;

  function finishMatch(match: MatchResult, isHome: boolean) {
    setMatchMinute(80);
    setLiveMyScore(match.myScore);
    setLiveOpponentScore(match.opponentScore);
    setMatchEvents(match.events);
    onMatchComplete(buildResultLine(match, isHome));
  }

  function startMatch() {
    if (isRunning || regularSeasonDone) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    const entry = calendar[currentMatchIndex];
    const match = simulateMatch(teamRating, entry, selectedPlayers, currentMatchIndex + 1);
    currentMatchRef.current = match;
    setCurrentOpponent(entry.opponent);
    setCurrentMatchIsHome(entry.isHome);
    setMatchMinute(0);
    setLiveMyScore(0);
    setLiveOpponentScore(0);
    setMatchEvents([]);
    setIsRunning(true);
    let minute = 0;
    intervalRef.current = setInterval(() => {
      minute += 5;
      setMatchMinute(minute);
      const visible = match.events.filter((e) => e.minute <= minute);
      setLiveMyScore(visible.filter((e) => e.team === "me").reduce((s, e) => s + e.points, 0));
      setLiveOpponentScore(visible.filter((e) => e.team === "opponent").reduce((s, e) => s + e.points, 0));
      setMatchEvents(visible);
      if (minute >= 80) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setIsRunning(false);
        onMatchComplete(buildResultLine(match, entry.isHome));
      }
    }, 500);
  }

  function skipCurrentMatch() {
    if (regularSeasonDone) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunning(false);
      if (currentMatchRef.current) finishMatch(currentMatchRef.current, currentMatchIsHome);
    } else {
      const entry = calendar[currentMatchIndex];
      const match = simulateMatch(teamRating, entry, selectedPlayers, currentMatchIndex + 1);
      setCurrentOpponent(entry.opponent);
      setCurrentMatchIsHome(entry.isHome);
      finishMatch(match, entry.isHome);
    }
  }

  function skipToIndex(toIndex: number) {
    if (regularSeasonDone) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunning(false);
    }
    const endIndex = Math.min(toIndex, calendar.length);
    let lastMatch: MatchResult | null = null;
    for (let idx = currentMatchIndex; idx < endIndex; idx++) {
      const match = simulateMatch(teamRating, calendar[idx], selectedPlayers, idx + 1);
      onMatchComplete(buildResultLine(match, calendar[idx].isHome));
      lastMatch = match;
    }
    if (lastMatch) {
      setCurrentOpponent(lastMatch.opponent);
      setCurrentMatchIsHome(calendar[endIndex - 1]?.isHome ?? true);
      setMatchMinute(80);
      setLiveMyScore(lastMatch.myScore);
      setLiveOpponentScore(lastMatch.opponentScore);
      setMatchEvents(lastMatch.events);
    }
  }

  const progress = (currentMatchIndex / TOTAL_MATCHES) * 100;
  const isMatchActive = isRunning || currentOpponent !== "";
  const canSkipMid = currentMatchIndex < MID_SEASON;
  const canSkipEnd = currentMatchIndex < TOTAL_MATCHES;

  return (
    <main className="min-h-screen bg-c-bg text-c-fg flex flex-col">

      {/* Header */}
      <header className="border-b border-[var(--c-border)] px-5 lg:px-8 py-4 lg:py-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-2xl lg:text-3xl font-black tracking-tighter">
            26<span className="text-c-gold">-</span>0
          </span>
          <div className="w-px h-7 bg-[var(--c-border)]" />
          <div>
            <p className="text-c-gold uppercase tracking-[0.35em] text-[8px] lg:text-[9px] font-bold">Top 14 · 2025-2026</p>
            <p className="text-c-fg font-black text-xs lg:text-sm uppercase tracking-wide">Saison régulière</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[var(--c-muted)] uppercase tracking-wider text-[8px] mb-0.5">Journée</p>
          <p className="text-c-gold font-black text-xl lg:text-2xl">
            {currentMatchIndex} <span className="text-[var(--c-faint)] text-sm lg:text-base font-bold">/ {TOTAL_MATCHES}</span>
          </p>
        </div>
      </header>

      {/* Progress bar */}
      <div className="w-full h-0.5 bg-c-fg/10 flex-shrink-0">
        <div className="h-full bg-c-gold transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>

      {/* Mobile tab bar */}
      <div className="lg:hidden flex border-b border-[var(--c-border)] flex-shrink-0">
        <button
          onClick={() => setMobileTab("match")}
          className={`flex-1 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
            mobileTab === "match" ? "text-c-gold border-b-2 border-c-gold" : "text-[var(--c-muted)]"
          }`}
        >
          Match
        </button>
        <button
          onClick={() => setMobileTab("classement")}
          className={`flex-1 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
            mobileTab === "classement" ? "text-c-gold border-b-2 border-c-gold" : "text-[var(--c-muted)]"
          }`}
        >
          Classement {myPosition > 0 ? `· ${myPosition}e` : ""}
        </button>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:grid grid-cols-1 lg:grid-cols-[1fr_360px] flex-1 min-h-0 overflow-hidden">
        <MatchPanel
          isMatchActive={isMatchActive}
          isRunning={isRunning}
          matchMinute={matchMinute}
          isHome={currentMatchIsHome}
          myTeamName={myTeamName}
          liveMyScore={liveMyScore}
          liveOpponentScore={liveOpponentScore}
          currentOpponent={currentOpponent}
          matchEvents={matchEvents}
          seasonRevealed={seasonRevealed}
        />
        <ControlsPanel
          regularSeasonDone={regularSeasonDone}
          isRunning={isRunning}
          matchMinute={matchMinute}
          currentMatchIndex={currentMatchIndex}
          calendar={calendar}
          canSkipMid={canSkipMid}
          canSkipEnd={canSkipEnd}
          myPosition={myPosition}
          myTeamName={myTeamName}
          standings={standings}
          played={played}
          onStartMatch={startMatch}
          onSkipCurrentMatch={skipCurrentMatch}
          onSkipToMid={() => skipToIndex(MID_SEASON)}
          onSkipToEnd={() => skipToIndex(TOTAL_MATCHES)}
          onGoToRanking={onGoToRanking}
        />
      </div>

      {/* Mobile: match tab */}
      {mobileTab === "match" && (
        <div className="lg:hidden flex-1 overflow-y-auto flex flex-col">
          <ControlsPanel
            regularSeasonDone={regularSeasonDone}
            isRunning={isRunning}
            matchMinute={matchMinute}
            currentMatchIndex={currentMatchIndex}
            calendar={calendar}
            canSkipMid={canSkipMid}
            canSkipEnd={canSkipEnd}
            myPosition={myPosition}
            myTeamName={myTeamName}
            standings={standings}
            played={played}
            onStartMatch={startMatch}
            onSkipCurrentMatch={skipCurrentMatch}
            onSkipToMid={() => skipToIndex(MID_SEASON)}
            onSkipToEnd={() => skipToIndex(TOTAL_MATCHES)}
            onGoToRanking={onGoToRanking}
            mobileHideStandings
          />
          <MatchPanel
            isMatchActive={isMatchActive}
            isRunning={isRunning}
            matchMinute={matchMinute}
            isHome={currentMatchIsHome}
            myTeamName={myTeamName}
            liveMyScore={liveMyScore}
            liveOpponentScore={liveOpponentScore}
            currentOpponent={currentOpponent}
            matchEvents={matchEvents}
            seasonRevealed={seasonRevealed}
          />
        </div>
      )}

      {/* Mobile: classement tab */}
      {mobileTab === "classement" && (
        <div className="lg:hidden flex-1 overflow-y-auto">
          <StandingsTable standings={standings} played={played} />
        </div>
      )}

    </main>
  );
}

/* ── Sub-components ───────────────────────────────────────── */

interface MatchPanelProps {
  isMatchActive: boolean;
  isRunning: boolean;
  matchMinute: number;
  isHome: boolean;
  myTeamName: string;
  liveMyScore: number;
  liveOpponentScore: number;
  currentOpponent: string;
  matchEvents: MatchEvent[];
  seasonRevealed: string[];
}

function MatchPanel({
  isMatchActive, isRunning, matchMinute, isHome, myTeamName,
  liveMyScore, liveOpponentScore, currentOpponent, matchEvents, seasonRevealed,
}: MatchPanelProps) {
  const leftName   = isHome ? myTeamName    : stripSeason(currentOpponent);
  const rightName  = isHome ? stripSeason(currentOpponent) : myTeamName;
  const leftScore  = isHome ? liveMyScore   : liveOpponentScore;
  const rightScore = isHome ? liveOpponentScore : liveMyScore;
  const leftLabel  = isHome ? "Domicile"    : "Domicile";
  const rightLabel = isHome ? "Extérieur"   : "Extérieur";
  const leftIsMe   = isHome;

  return (
    <div className="flex flex-col border-r border-[var(--c-border)] overflow-hidden">
      {/* Scoreboard */}
      <div className="p-5 lg:p-8 border-b border-[var(--c-border)] flex-shrink-0">
        {isMatchActive ? (
          <>
            <p className="text-[var(--c-muted)] uppercase tracking-[0.3em] text-[9px] font-bold mb-3 lg:mb-4">
              {isRunning ? `En cours · ${matchMinute}'` : "Match terminé"}
            </p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className={`font-black text-sm lg:text-lg leading-tight truncate ${leftIsMe ? "text-c-gold" : "text-c-fg"}`}>{leftName}</p>
                <p className="text-[var(--c-muted)] text-[10px] uppercase tracking-wide mt-0.5">{leftLabel}</p>
              </div>
              <div className="px-4 lg:px-8 text-center flex-shrink-0">
                <p className="text-c-gold font-black text-4xl lg:text-6xl tracking-tighter leading-none">
                  {leftScore}<span className="text-[var(--c-faint)] mx-1.5 lg:mx-2">-</span>{rightScore}
                </p>
                <p className="text-c-gold/70 text-[10px] font-bold tracking-widest mt-1">
                  {isRunning ? `${matchMinute}'` : "80'"}
                </p>
              </div>
              <div className="flex-1 text-right min-w-0">
                <p className={`font-black text-sm lg:text-lg leading-tight truncate ${!leftIsMe ? "text-c-gold" : "text-c-fg"}`}>{rightName}</p>
                <p className="text-[var(--c-muted)] text-[10px] uppercase tracking-wide mt-0.5">{rightLabel}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-3 lg:py-4">
            <p className="text-[var(--c-faint)] uppercase tracking-[0.3em] text-xs">Aucun match en cours</p>
          </div>
        )}
      </div>

      {/* Events */}
      {matchEvents.length > 0 && (
        <div className="px-5 lg:px-6 py-4 lg:py-5 border-b border-[var(--c-border)] flex-shrink-0">
          <p className="text-[var(--c-muted)] uppercase tracking-[0.3em] text-[9px] font-bold mb-3 lg:mb-4">Faits de match</p>
          <div className="space-y-1.5">
            {matchEvents.map((event, i) => {
              const isMe = event.team === "me";
              const isTry = event.text.startsWith("Essai");
              const scorerName = event.text.replace(/^Essai de /, "");
              const lastName = scorerName.includes(" ") ? scorerName.split(" ").slice(1).join(" ") : scorerName;
              const label = isTry
                ? isMe ? `🏉 ${lastName}` : "🏉 Essai adverse"
                : event.text;
              // home team events on the left, away team on the right
              const isLeft = isHome ? isMe : !isMe;
              return (
                <div key={i} className="grid grid-cols-[1fr_36px_1fr] items-center gap-1">
                  <span className={`text-[10px] uppercase tracking-wider font-black truncate text-right ${isLeft ? (isMe ? "text-c-gold" : "text-c-fg/60") : "text-transparent"}`}>
                    {isLeft ? label : ""}
                  </span>
                  <span className="text-[var(--c-faint)] text-[9px] font-bold text-center tabular-nums">{event.minute}&apos;</span>
                  <span className={`text-[10px] uppercase tracking-wider font-black truncate text-left ${!isLeft ? (isMe ? "text-c-gold" : "text-c-fg/60") : "text-transparent"}`}>
                    {!isLeft ? label : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div className="flex-1 overflow-y-auto">
        {seasonRevealed.length > 0 && (
          <div className="p-5 lg:p-8">
            <p className="text-[var(--c-muted)] uppercase tracking-[0.3em] text-[9px] font-bold mb-4 lg:mb-5">Résultats</p>
            <div className="space-y-2">
              {[...seasonRevealed].reverse().map((line, i) => {
                const isWin = line.startsWith("✦");
                const isDraw = line.startsWith("◈");
                const [, myScore, oppScore, opponent, homeFlag] = line.split("|");
                const wasHome = homeFlag === "1";
                const leftName  = wasHome ? myTeamName : stripSeason(opponent);
                const rightName = wasHome ? stripSeason(opponent) : myTeamName;
                const leftScore = wasHome ? myScore : oppScore;
                const rightScore = wasHome ? oppScore : myScore;
                return (
                  <div key={i} className={`border-l-2 pl-3 lg:pl-4 py-1.5 lg:py-2 ${isWin ? "border-c-gold" : isDraw ? "border-[var(--c-border)]" : "border-[var(--c-border-lo)]"}`}>
                    <p className={`font-bold text-xs lg:text-sm tabular-nums ${isWin ? "text-c-fg" : "text-[var(--c-muted)]"}`}>
                      {leftName} <span className={isWin ? "text-c-gold" : ""}>{leftScore}–{rightScore}</span> {rightName}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StandingRow {
  name: string; played: number; won: number; drawn: number; lost: number; points: number; isMe: boolean;
}

interface ControlsPanelProps {
  regularSeasonDone: boolean;
  isRunning: boolean;
  matchMinute: number;
  currentMatchIndex: number;
  calendar: CalendarEntry[];
  canSkipMid: boolean;
  canSkipEnd: boolean;
  myPosition: number;
  myTeamName: string;
  standings: StandingRow[];
  played: number;
  onStartMatch: () => void;
  onSkipCurrentMatch: () => void;
  onSkipToMid: () => void;
  onSkipToEnd: () => void;
  onGoToRanking: () => void;
  mobileHideStandings?: boolean;
}

function ControlsPanel({
  regularSeasonDone, isRunning, matchMinute, currentMatchIndex, calendar,
  canSkipMid, canSkipEnd, myPosition, myTeamName, standings, played,
  onStartMatch, onSkipCurrentMatch, onSkipToMid, onSkipToEnd, onGoToRanking,
  mobileHideStandings = false,
}: ControlsPanelProps) {
  return (
    <div className="flex flex-col overflow-hidden">
      {!regularSeasonDone ? (
        <>
          <div className="p-5 lg:p-6 border-b border-[var(--c-border)] flex-shrink-0 space-y-3 lg:space-y-4">
            <div>
              <p className="text-c-gold uppercase tracking-[0.35em] text-[9px] font-bold mb-1">Prochain match</p>
              <p className="text-c-fg font-black text-sm lg:text-base">
                {stripSeason(calendar[currentMatchIndex]?.opponent ?? "—")}
              </p>
              <p className="text-[var(--c-muted)] text-[9px] uppercase tracking-wider mt-0.5">
                {calendar[currentMatchIndex]?.isHome ? "Domicile" : "Extérieur"}
              </p>
            </div>
            <button
              onClick={onStartMatch}
              disabled={isRunning && matchMinute < 80}
              className="w-full bg-c-gold hover:bg-[#F5F0E8] disabled:bg-c-fg/10 disabled:text-[var(--c-faint)] text-black disabled:cursor-not-allowed font-black uppercase tracking-[0.2em] text-sm py-4 transition-colors"
            >
              {isRunning && matchMinute < 80 ? `${matchMinute}'  en cours…` : `Match ${currentMatchIndex + 1} →`}
            </button>
            <div className="space-y-1.5">
              <button
                onClick={onSkipCurrentMatch}
                disabled={regularSeasonDone}
                className="w-full border border-[var(--c-border)] hover:border-[var(--c-border)] text-[var(--c-muted)] hover:text-c-fg font-black uppercase tracking-[0.15em] text-[10px] py-2.5 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              >
                ⏭ Fin du match
              </button>
              {canSkipMid && (
                <button
                  onClick={onSkipToMid}
                  disabled={isRunning}
                  className="w-full border border-[var(--c-border)] hover:border-[var(--c-border)] text-[var(--c-muted)] hover:text-c-fg font-black uppercase tracking-[0.15em] text-[10px] py-2.5 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  ⏩ Mi-saison · J13
                </button>
              )}
              {canSkipEnd && (
                <button
                  onClick={onSkipToEnd}
                  disabled={isRunning}
                  className="w-full border border-[var(--c-border)] hover:border-[var(--c-border)] text-[var(--c-muted)] hover:text-c-fg font-black uppercase tracking-[0.15em] text-[10px] py-2.5 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  ⏩ Fin de saison · J26
                </button>
              )}
            </div>
          </div>
          {!mobileHideStandings && (
            <div className="flex-1 overflow-y-auto">
              <StandingsTable standings={standings} played={played} />
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col overflow-hidden h-full">
          <div className="p-5 lg:p-6 border-b border-[var(--c-border)] flex-shrink-0 text-center">
            <p className="text-c-gold uppercase tracking-[0.35em] text-[9px] font-bold mb-2">Saison terminée</p>
            <p className="text-c-fg font-black text-4xl lg:text-5xl tracking-tighter">
              {myPosition}<span className="text-[var(--c-muted)] text-xl lg:text-2xl">ème</span>
            </p>
            <p className="text-[var(--c-muted)] uppercase tracking-wider text-[9px] mt-1">au classement final</p>
            <button
              onClick={onGoToRanking}
              className="mt-4 w-full bg-c-gold hover:bg-[#F5F0E8] text-black font-black uppercase tracking-[0.2em] text-xs py-4 transition-colors"
            >
              {myPosition <= 6 ? "Play-offs →" : "Voir récap saison →"}
            </button>
          </div>
          {!mobileHideStandings && (
            <div className="flex-1 overflow-y-auto">
              <StandingsTable standings={standings} played={played} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StandingsTable({ standings, played }: { standings: StandingRow[]; played: number }) {
  return (
    <div>
      <div className="px-4 py-3 border-b border-[var(--c-border)] flex items-center gap-2">
        <p className="text-[var(--c-muted)] uppercase tracking-[0.3em] text-[9px] font-bold flex-1">Classement · J{played}</p>
        <span className="text-[var(--c-faint)] uppercase tracking-wider text-[8px] w-6 text-center">V</span>
        <span className="text-[var(--c-faint)] uppercase tracking-wider text-[8px] w-6 text-center">N</span>
        <span className="text-[var(--c-faint)] uppercase tracking-wider text-[8px] w-6 text-center">D</span>
        <span className="text-[var(--c-faint)] uppercase tracking-wider text-[8px] w-8 text-right">Pts</span>
      </div>
      {standings.map((row, i) => {
        const isTop6 = i < 6;
        return (
          <div key={row.name} className={`flex items-center gap-2 px-4 py-2.5 border-b border-[var(--c-border-lo)] ${row.isMe ? "bg-c-gold/8" : ""}`}>
            <span className={`text-[10px] font-black w-5 text-center tabular-nums ${i === 0 ? "text-c-gold" : isTop6 ? "text-[var(--c-muted)]" : "text-[var(--c-faint)]"}`}>
              {i + 1}
            </span>
            <span className={`flex-1 text-[11px] font-black truncate ${row.isMe ? "text-c-gold" : isTop6 ? "text-c-fg" : "text-[var(--c-muted)]"}`}>
              {row.isMe ? `▶ ${row.name}` : row.name}
            </span>
            <span className="text-[var(--c-muted)] text-[10px] tabular-nums w-6 text-center">{row.won}</span>
            <span className="text-[var(--c-muted)] text-[10px] tabular-nums w-6 text-center">{row.drawn}</span>
            <span className="text-[var(--c-muted)] text-[10px] tabular-nums w-6 text-center">{row.lost}</span>
            <span className={`text-[11px] font-black tabular-nums w-8 text-right ${row.isMe ? "text-c-gold" : isTop6 ? "text-c-fg/80" : "text-[var(--c-muted)]"}`}>
              {row.points}
            </span>
          </div>
        );
      })}
    </div>
  );
}
