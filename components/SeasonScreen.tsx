"use client";

import { useMemo, useRef, useState } from "react";
import { simulateMatch } from "@/lib/simulation";
import type { CalendarEntry, MatchEvent, MatchResult, Player } from "@/lib/types";

const TOTAL_MATCHES = 26;
const stripSeason = (s: string) => s.replace(/\s\d{2}-\d{2}$/, "");

function buildResultLine(match: MatchResult, isHome: boolean): string {
  const icon = match.result === "Victoire" ? "✦" : match.result === "Nul" ? "◈" : "✕";
  return `${icon}|${match.myScore}|${match.opponentScore}|${match.opponent}|${isHome ? "1" : "0"}`;
}

interface SeasonScreenProps {
  myTeamName: string;
  teamRating: number;
  selectedPlayers: Player[];
  leagueResults: Record<string, number[]>;
  currentMatchIndex: number;
  seasonRevealed: string[];
  regularSeasonDone: boolean;
  calendar: CalendarEntry[];
  onMatchComplete: (resultLine: string, events: MatchEvent[]) => void;
  onGoToRanking: () => void;
}

interface StandingRow {
  name: string; played: number; won: number; drawn: number; lost: number;
  points: number; isMe: boolean;
}

export function SeasonScreen({
  myTeamName, teamRating, selectedPlayers, leagueResults,
  currentMatchIndex, seasonRevealed, regularSeasonDone,
  calendar, onMatchComplete, onGoToRanking,
}: SeasonScreenProps) {
  /* ── live match ───────────────────────────────────────── */
  const [matchMinute, setMatchMinute] = useState(0);
  const [liveMyScore, setLiveMyScore] = useState(0);
  const [liveOppScore, setLiveOppScore] = useState(0);
  const [liveEvents, setLiveEvents] = useState<MatchEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  /* ── ui state ─────────────────────────────────────────── */
  const [storedEvents, setStoredEvents] = useState<Record<number, MatchEvent[]>>({});
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());
  const [activeEventsOpen, setActiveEventsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"matchs" | "classement">("matchs");
  const [matchSpeed, setMatchSpeed] = useState<"normal" | "fast" | "ultra">("normal");

  /* ── refs ─────────────────────────────────────────────── */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentMatchRef = useRef<MatchResult | null>(null);
  const currentEntryRef = useRef<CalendarEntry | null>(null);
  const minuteRef = useRef(0);
  const doTickRef = useRef<() => void>(() => {});
  const speedRef = useRef<"normal" | "fast" | "ultra">("normal");

  /* ── standings ────────────────────────────────────────── */
  const played = seasonRevealed.length;

  const standings = useMemo<StandingRow[]>(() => {
    const myWins   = seasonRevealed.filter(r => r.startsWith("✦")).length;
    const myDraws  = seasonRevealed.filter(r => r.startsWith("◈")).length;
    const myLosses = seasonRevealed.filter(r => r.startsWith("✕")).length;
    const rows: StandingRow[] = [
      { name: myTeamName, played, won: myWins, drawn: myDraws, lost: myLosses,
        points: myWins * 4 + myDraws * 2, isMe: true },
      ...Object.entries(leagueResults).map(([team, pts]) => {
        const slice = pts.slice(0, played);
        const won   = slice.filter(p => p === 4).length;
        const drawn = slice.filter(p => p === 2).length;
        const lost  = slice.filter(p => p === 0).length;
        return { name: team, played: slice.length, won, drawn, lost,
          points: slice.reduce((s, p) => s + p, 0), isMe: false };
      }),
    ];
    return rows.sort((a, b) => b.points - a.points || b.won - a.won);
  }, [seasonRevealed, played, leagueResults, myTeamName]);

  const myPosition = standings.findIndex(r => r.isMe) + 1;

  function getOpponentPosition(opponent: string): number {
    const idx = standings.findIndex(r => r.name === opponent);
    return idx === -1 ? 0 : idx + 1;
  }

  /* ── speed ────────────────────────────────────────────── */
  function getIntervalMs(speed: "normal" | "fast" | "ultra") {
    return speed === "normal" ? 150 : speed === "fast" ? 100 : 50;
  }

  function changeSpeed(speed: "normal" | "fast" | "ultra") {
    speedRef.current = speed;
    setMatchSpeed(speed);
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => doTickRef.current(), getIntervalMs(speed));
    }
  }

  /* ── simulation ───────────────────────────────────────── */
  function startMatch() {
    if (isRunning || regularSeasonDone) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    const idx   = currentMatchIndex;
    const entry = calendar[idx];
    const match = simulateMatch(teamRating, entry, selectedPlayers, idx + 1);
    currentMatchRef.current  = match;
    currentEntryRef.current  = entry;
    setMatchMinute(0);
    setLiveMyScore(0);
    setLiveOppScore(0);
    setLiveEvents([]);
    setActiveEventsOpen(false);
    setIsRunning(true);
    minuteRef.current = 0;

    doTickRef.current = () => {
      minuteRef.current += 1;
      const minute  = minuteRef.current;
      const m = currentMatchRef.current!;
      const e = currentEntryRef.current!;
      const visible = m.events.filter(ev => ev.minute <= minute);
      setMatchMinute(minute);
      setLiveMyScore(visible.filter(ev => ev.team === "me").reduce((s, ev) => s + ev.points, 0));
      setLiveOppScore(visible.filter(ev => ev.team === "opponent").reduce((s, ev) => s + ev.points, 0));
      setLiveEvents(visible);
      if (minute >= 80) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setIsRunning(false);
        setStoredEvents(prev => ({ ...prev, [idx]: m.events }));
        setActiveEventsOpen(false);
        onMatchComplete(buildResultLine(m, e.isHome), m.events);
      }
    };

    intervalRef.current = setInterval(() => doTickRef.current(), getIntervalMs(speedRef.current));
  }

  function skipCurrentMatch() {
    const idx = currentMatchIndex;
    if (isRunning) {
      const m = currentMatchRef.current;
      const e = currentEntryRef.current;
      if (!m || !e) return;
      clearInterval(intervalRef.current!);
      intervalRef.current = null;
      setIsRunning(false);
      setStoredEvents(prev => ({ ...prev, [idx]: m.events }));
      setActiveEventsOpen(false);
      onMatchComplete(buildResultLine(m, e.isHome), m.events);
    } else {
      const entry = calendar[idx];
      if (!entry) return;
      const match = simulateMatch(teamRating, entry, selectedPlayers, idx + 1);
      setStoredEvents(prev => ({ ...prev, [idx]: match.events }));
      onMatchComplete(buildResultLine(match, entry.isHome), match.events);
    }
  }

  function toggleExpanded(idx: number) {
    setExpandedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  /* ── derived ──────────────────────────────────────────── */
  const currentEntry  = calendar[currentMatchIndex];
  const progress      = (played / TOTAL_MATCHES) * 100;

  /* ── render ───────────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-c-bg text-c-fg flex flex-col">

      {/* Header */}
      <header className="border-b border-[var(--c-border)] px-5 lg:px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-2xl lg:text-3xl font-black tracking-tighter">
            26<span className="text-c-gold">-</span>0
          </span>
          <div className="w-px h-7 bg-[var(--c-border)]" />
          <div>
            <p className="text-c-gold uppercase tracking-[0.35em] text-[8px] font-bold">Top 14 · 2025-2026</p>
            <p className="text-c-fg font-black text-xs uppercase tracking-wide">Saison régulière</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[var(--c-muted)] uppercase tracking-wider text-[8px] mb-0.5">Journée</p>
          <p className="text-c-gold font-black text-xl">
            {played}<span className="text-[var(--c-faint)] text-sm font-bold"> / {TOTAL_MATCHES}</span>
          </p>
        </div>
      </header>

      {/* Progress bar */}
      <div className="w-full h-0.5 bg-c-fg/10 flex-shrink-0">
        <div className="h-full bg-c-gold transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--c-border)] flex-shrink-0">
        {(["matchs", "classement"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
              activeTab === tab ? "text-c-gold border-b-2 border-c-gold" : "text-[var(--c-muted)]"
            }`}>
            {tab === "matchs" ? "Matchs" : `Classement${myPosition > 0 ? ` · ${myPosition}e` : ""}`}
          </button>
        ))}
      </div>

      {/* ── MATCHS TAB ─────────────────────────────────────── */}
      {activeTab === "matchs" && (
        <div className="flex-1 overflow-y-auto">

          {/* Speed selector */}
          <div className="px-5 lg:px-8 pt-4 pb-3 flex items-center gap-3">
            <span className="text-[var(--c-faint)] uppercase tracking-[0.2em] text-[8px] font-bold shrink-0">
              Vitesse
            </span>
            <div className="flex gap-1">
              {(["normal", "fast", "ultra"] as const).map(s => (
                <button key={s} onClick={() => changeSpeed(s)}
                  className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.15em] border transition-colors ${
                    matchSpeed === s
                      ? "border-c-gold text-c-gold bg-c-gold/8"
                      : "border-[var(--c-border)] text-[var(--c-muted)] hover:border-c-gold/30 hover:text-c-fg"
                  }`}>
                  {s === "normal" ? "Normal" : s === "fast" ? "Accéléré" : "Ultra"}
                </button>
              ))}
            </div>
          </div>

          {/* Active match card */}
          {!regularSeasonDone && currentEntry && (
            <div className="px-5 lg:px-8 mb-3">
              <ActiveMatchCard
                matchNumber={currentMatchIndex + 1}
                entry={currentEntry}
                myTeamName={myTeamName}
                myPosition={played > 0 ? myPosition : 0}
                opponentPosition={played > 0 ? getOpponentPosition(currentEntry.opponent) : 0}
                isRunning={isRunning}
                minute={matchMinute}
                myScore={liveMyScore}
                oppScore={liveOppScore}
                liveEvents={liveEvents}
                eventsOpen={activeEventsOpen}
                onStart={startMatch}
                onSkip={skipCurrentMatch}
                onToggleEvents={() => setActiveEventsOpen(v => !v)}
              />
            </div>
          )}

          {/* Season done banner */}
          {regularSeasonDone && (
            <div className="mx-5 lg:mx-8 mb-4 border border-c-gold/30 bg-c-gold/5 p-6 text-center">
              <p className="text-c-gold/60 uppercase tracking-[0.4em] text-[8px] font-bold mb-2">
                Saison terminée
              </p>
              <p className="text-c-gold font-black text-5xl tracking-tighter">
                {myPosition}<span className="text-[var(--c-muted)] text-2xl">e</span>
              </p>
              <p className="text-[var(--c-muted)] uppercase tracking-wider text-[9px] mt-1 mb-5">
                au classement final
              </p>
              <button onClick={onGoToRanking}
                className="w-full bg-c-gold hover:bg-[#F5F0E8] text-black font-black uppercase tracking-[0.2em] text-sm py-3.5 transition-colors">
                {myPosition <= 6 ? "Play-offs →" : "Voir récap saison →"}
              </button>
            </div>
          )}

          {/* Completed matches */}
          {played > 0 && (
            <div className="pb-8">
              <div className="px-5 lg:px-8 py-2 flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--c-border-lo)]" />
                <span className="text-[var(--c-faint)] uppercase tracking-[0.3em] text-[8px] font-bold shrink-0">
                  {played} match{played > 1 ? "s" : ""} joué{played > 1 ? "s" : ""}
                </span>
                <div className="flex-1 h-px bg-[var(--c-border-lo)]" />
              </div>
              <div className="px-5 lg:px-8 space-y-1.5">
                {[...seasonRevealed].reverse().map((line, ri) => {
                  const idx = played - 1 - ri;
                  const [icon, myS, oppS, opponent, homeFlag] = line.split("|");
                  return (
                    <CompletedMatchRow
                      key={idx}
                      matchNumber={idx + 1}
                      icon={icon}
                      myTeamName={myTeamName}
                      opponent={opponent}
                      myScore={parseInt(myS)}
                      oppScore={parseInt(oppS)}
                      wasHome={homeFlag === "1"}
                      events={storedEvents[idx] ?? []}
                      expanded={expandedIndices.has(idx)}
                      onToggle={() => toggleExpanded(idx)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CLASSEMENT TAB ──────────────────────────────────── */}
      {activeTab === "classement" && (
        <div className="flex-1 overflow-y-auto">
          <StandingsTable standings={standings} played={played} />
        </div>
      )}
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────
   ActiveMatchCard
───────────────────────────────────────────────────────────── */

interface ActiveMatchCardProps {
  matchNumber: number;
  entry: CalendarEntry;
  myTeamName: string;
  myPosition: number;
  opponentPosition: number;
  isRunning: boolean;
  minute: number;
  myScore: number;
  oppScore: number;
  liveEvents: MatchEvent[];
  eventsOpen: boolean;
  onStart: () => void;
  onSkip: () => void;
  onToggleEvents: () => void;
}

function ActiveMatchCard({
  matchNumber, entry, myTeamName, myPosition, opponentPosition,
  isRunning, minute, myScore, oppScore,
  liveEvents, eventsOpen, onStart, onSkip, onToggleEvents,
}: ActiveMatchCardProps) {
  const isHome     = entry.isHome;
  const oppName    = stripSeason(entry.opponent);
  const leftName   = isHome ? myTeamName : oppName;
  const rightName  = isHome ? oppName    : myTeamName;
  const leftScore  = isHome ? myScore    : oppScore;
  const rightScore = isHome ? oppScore   : myScore;
  const leftPos    = isHome ? myPosition       : opponentPosition;
  const rightPos   = isHome ? opponentPosition : myPosition;
  const leftIsMe   = isHome;

  return (
    <div className="border border-c-gold/35 bg-c-gold/4">

      {/* Card header */}
      <div className="px-4 py-2.5 border-b border-c-gold/15 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black uppercase tracking-[0.35em] text-c-gold/70">
            Match {matchNumber}
          </span>
          <span className="text-c-gold/20">·</span>
          {isRunning ? (
            <span className="text-c-gold/60 text-[9px] font-black tabular-nums">{minute}&apos;</span>
          ) : (
            <span className="text-[var(--c-faint)] uppercase tracking-wider text-[8px]">
              {isHome ? "Domicile" : "Extérieur"}
            </span>
          )}
        </div>
        {isRunning && (
          <button onClick={onSkip}
            className="text-[var(--c-faint)] hover:text-[var(--c-muted)] text-[8px] uppercase tracking-wider font-bold transition-colors">
            Passer ⏭
          </button>
        )}
      </div>

      {/* Teams + score */}
      <div className="px-4 py-5">
        {!isRunning ? (
          /* Pre-game layout */
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className={`font-black text-sm lg:text-base leading-tight truncate ${leftIsMe ? "text-c-gold" : "text-c-fg"}`}>
                {leftIsMe ? `▶ ${leftName}` : leftName}
              </p>
              {leftPos > 0 && (
                <p className="text-[var(--c-muted)] text-[9px] mt-0.5 tabular-nums">{leftPos}e</p>
              )}
            </div>
            <span className="text-[var(--c-faint)] text-[10px] font-bold tracking-widest shrink-0 px-3">vs</span>
            <div className="flex-1 min-w-0 text-right">
              <p className={`font-black text-sm lg:text-base leading-tight truncate ${!leftIsMe ? "text-c-gold" : "text-c-fg"}`}>
                {!leftIsMe ? `${rightName} ◀` : rightName}
              </p>
              {rightPos > 0 && (
                <p className="text-[var(--c-muted)] text-[9px] mt-0.5 tabular-nums">{rightPos}e</p>
              )}
            </div>
          </div>
        ) : (
          /* Live score layout */
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className={`font-black text-xs lg:text-sm leading-tight truncate ${leftIsMe ? "text-c-gold" : "text-c-fg/50"}`}>
                {leftIsMe ? `▶ ${leftName}` : leftName}
              </p>
            </div>
            <div className="text-center flex-shrink-0 px-4">
              <p className="font-black text-4xl lg:text-5xl tracking-tighter leading-none tabular-nums">
                <span className={leftScore >= rightScore ? "text-c-gold" : "text-c-fg/40"}>{leftScore}</span>
                <span className="text-c-gold/20 mx-2 text-2xl lg:text-3xl">–</span>
                <span className={rightScore >= leftScore ? "text-c-gold" : "text-c-fg/40"}>{rightScore}</span>
              </p>
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className={`font-black text-xs lg:text-sm leading-tight truncate ${!leftIsMe ? "text-c-gold" : "text-c-fg/50"}`}>
                {!leftIsMe ? `${rightName} ◀` : rightName}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 flex gap-2">
        {!isRunning ? (
          <>
            <button onClick={onStart}
              className="flex-1 bg-c-gold hover:bg-[#F5F0E8] text-black font-black uppercase tracking-[0.2em] text-xs py-3 transition-colors">
              Démarrer →
            </button>
            <button onClick={onSkip} title="Simuler sans regarder"
              className="border border-[var(--c-border)] hover:border-c-gold/30 text-[var(--c-muted)] hover:text-c-fg font-black text-[10px] px-3 py-3 transition-colors">
              ⏭
            </button>
          </>
        ) : (
          <button onClick={onToggleEvents}
            className={`flex-1 border font-black uppercase tracking-[0.15em] text-[9px] py-2.5 transition-colors flex items-center justify-center gap-1.5 ${
              eventsOpen
                ? "border-c-gold/40 text-c-gold/80 bg-c-gold/5"
                : "border-[var(--c-border)] text-[var(--c-muted)] hover:border-c-gold/30 hover:text-c-fg"
            }`}>
            <span>{eventsOpen ? "▴" : "▾"}</span>
            <span>Événements</span>
          </button>
        )}
      </div>

      {/* Live events (toggled) */}
      {isRunning && eventsOpen && liveEvents.length > 0 && (
        <div className="border-t border-c-gold/15">
          <MatchEventsList events={liveEvents} isHome={isHome} reversed />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CompletedMatchRow
───────────────────────────────────────────────────────────── */

interface CompletedMatchRowProps {
  matchNumber: number;
  icon: string;
  myTeamName: string;
  opponent: string;
  myScore: number;
  oppScore: number;
  wasHome: boolean;
  events: MatchEvent[];
  expanded: boolean;
  onToggle: () => void;
}

function CompletedMatchRow({
  matchNumber, icon, myTeamName, opponent,
  myScore, oppScore, wasHome, events, expanded, onToggle,
}: CompletedMatchRowProps) {
  const isWin  = icon === "✦";
  const isDraw = icon === "◈";
  const oppName    = stripSeason(opponent);
  const leftName   = wasHome ? myTeamName : oppName;
  const rightName  = wasHome ? oppName    : myTeamName;
  const leftScore  = wasHome ? myScore    : oppScore;
  const rightScore = wasHome ? oppScore   : myScore;
  const leftIsMe   = wasHome;

  const borderColor = isWin ? "border-c-gold/50" : isDraw ? "border-c-fg/15" : "border-c-fg/6";
  const iconColor   = isWin ? "text-c-gold"       : isDraw ? "text-c-fg/30"   : "text-[var(--c-faint)]";
  const scoreColor  = isWin ? "text-c-gold"       : isDraw ? "text-c-fg/60"   : "text-[var(--c-muted)]";
  const myNameColor = isWin ? "text-c-fg"         : isDraw ? "text-c-fg/60"   : "text-[var(--c-muted)]";

  return (
    <div className={`border-l-2 ${borderColor}`}>
      <button onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-c-fg/3 transition-colors group text-left">

        <span className={`text-[9px] font-black w-3 text-center shrink-0 ${iconColor}`}>{icon}</span>

        <span className="text-[var(--c-faint)] text-[8px] font-bold uppercase tracking-wider shrink-0 w-9 tabular-nums">
          M{matchNumber}
        </span>

        <div className="flex-1 min-w-0 flex items-baseline gap-1 overflow-hidden">
          <span className={`text-[11px] font-black truncate shrink min-w-0 ${leftIsMe ? myNameColor : "text-[var(--c-faint)]"}`}>
            {leftIsMe ? `▶ ${leftName}` : leftName}
          </span>
          <span className={`${scoreColor} font-black text-[11px] tabular-nums shrink-0`}>
            {leftScore}
            <span className="text-[var(--c-faint)] mx-0.5">–</span>
            {rightScore}
          </span>
          <span className={`text-[11px] font-black truncate shrink min-w-0 ${!leftIsMe ? myNameColor : "text-[var(--c-faint)]"}`}>
            {!leftIsMe ? `${rightName} ◀` : rightName}
          </span>
        </div>

        {events.length > 0 && (
          <span className={`text-[8px] shrink-0 transition-colors ${
            expanded ? "text-c-gold/50" : "text-[var(--c-faint)] group-hover:text-[var(--c-muted)]"
          }`}>
            {expanded ? "▴" : "▾"}
          </span>
        )}
      </button>

      {expanded && events.length > 0 && (
        <div className="border-t border-[var(--c-border-lo)]">
          <MatchEventsList events={events} isHome={wasHome} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MatchEventsList  (shared between active + completed)
───────────────────────────────────────────────────────────── */

function MatchEventsList({ events, isHome, reversed = false }: {
  events: MatchEvent[]; isHome: boolean; reversed?: boolean;
}) {
  const list = reversed ? [...events].reverse() : events;
  return (
    <div className="px-4 py-3 max-h-52 overflow-y-auto space-y-1">
      {list.map((event, i) => {
        const isMe = event.team === "me";
        const isTry = event.text.startsWith("Essai");
        const scorerName = event.text.replace(/^Essai de /, "");
        const lastName = scorerName.includes(" ") ? scorerName.split(" ").slice(1).join(" ") : scorerName;
        const label = isTry ? (isMe ? `🏉 ${lastName}` : "🏉 Essai adv.") : event.text;
        const isLeft = isHome ? isMe : !isMe;
        return (
          <div key={i} className="grid grid-cols-[1fr_36px_1fr] items-center gap-1">
            <span className={`text-[9px] uppercase tracking-wider font-black truncate text-right ${
              isLeft ? (isMe ? "text-c-gold/80" : "text-c-fg/35") : "text-transparent"
            }`}>
              {isLeft ? label : ""}
            </span>
            <span className="text-[var(--c-faint)] text-[8px] font-bold text-center tabular-nums">
              {event.minute}&apos;
            </span>
            <span className={`text-[9px] uppercase tracking-wider font-black truncate ${
              !isLeft ? (isMe ? "text-c-gold/80" : "text-c-fg/35") : "text-transparent"
            }`}>
              {!isLeft ? label : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   StandingsTable  (unchanged)
───────────────────────────────────────────────────────────── */

function StandingsTable({ standings, played }: { standings: StandingRow[]; played: number }) {
  return (
    <div>
      <div className="px-4 py-3 border-b border-[var(--c-border)] flex items-center gap-2">
        <p className="text-[var(--c-muted)] uppercase tracking-[0.3em] text-[9px] font-bold flex-1">
          Classement · J{played}
        </p>
        <span className="text-[var(--c-faint)] uppercase tracking-wider text-[8px] w-6 text-center">V</span>
        <span className="text-[var(--c-faint)] uppercase tracking-wider text-[8px] w-6 text-center">N</span>
        <span className="text-[var(--c-faint)] uppercase tracking-wider text-[8px] w-6 text-center">D</span>
        <span className="text-[var(--c-faint)] uppercase tracking-wider text-[8px] w-8 text-right">Pts</span>
      </div>
      {standings.map((row, i) => {
        const isTop6 = i < 6;
        return (
          <div key={row.name}>
            {i === 6 && (
              <div className="flex items-center gap-2 px-4 py-1">
                <div className="flex-1 h-px bg-c-gold/40" />
                <span className="text-c-gold text-[8px] font-black uppercase tracking-[0.3em] shrink-0">Playoffs</span>
                <div className="flex-1 h-px bg-c-gold/40" />
              </div>
            )}
            <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-[var(--c-border-lo)] ${row.isMe ? "bg-c-gold/8" : ""}`}>
              <span className={`text-[10px] font-black w-5 text-center tabular-nums ${
                i === 0 ? "text-c-gold" : isTop6 ? "text-[var(--c-muted)]" : "text-[var(--c-faint)]"
              }`}>{i + 1}</span>
              <span className={`flex-1 text-[11px] font-black truncate ${
                row.isMe ? "text-c-gold" : isTop6 ? "text-c-fg" : "text-[var(--c-muted)]"
              }`}>
                {row.isMe ? `▶ ${row.name}` : stripSeason(row.name)}
              </span>
              <span className="text-[var(--c-muted)] text-[10px] tabular-nums w-6 text-center">{row.won}</span>
              <span className="text-[var(--c-muted)] text-[10px] tabular-nums w-6 text-center">{row.drawn}</span>
              <span className="text-[var(--c-muted)] text-[10px] tabular-nums w-6 text-center">{row.lost}</span>
              <span className={`text-[11px] font-black tabular-nums w-8 text-right ${
                row.isMe ? "text-c-gold" : isTop6 ? "text-c-fg/80" : "text-[var(--c-muted)]"
              }`}>{row.points}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
