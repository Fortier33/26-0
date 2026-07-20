"use client";

import { useEffect, useRef, useState } from "react";
import { beginFriendsPlayoffMatch, simulateFriendsMatch } from "@/lib/simulation";
import type { HalfTimeChoice } from "@/lib/simulation";
import { BRACKET_FEED } from "@/lib/friends";
import { teamStrengths } from "@/lib/data";
import type { FriendsBracket, FriendsBracketMatch, FriendsTeam, MatchEvent } from "@/lib/types";

const TICK_MS = 150;

const S = {
  bg:     "#04060F",
  text:   "#E8EDF5",
  muted:  "rgba(232,237,245,0.40)",
  faint:  "rgba(232,237,245,0.08)",
  border: "rgba(232,237,245,0.10)",
};

const ROUNDS = [
  { label: "Quarts de finale", ids: ["qf1", "qf2"] },
  { label: "Demi-finales",     ids: ["sf1",  "sf2"] },
  { label: "Finale",           ids: ["final"]        },
];

const HALFTIME_CHOICES: { key: HalfTimeChoice; label: string; effect: string }[] = [
  { key: "tenir",        label: "Défendre",        effect: "Encaisser peu d'essais, marquer peu" },
  { key: "attaquer",     label: "Attaquer",         effect: "Jeu ouvert, plus d'essais"          },
  { key: "tout_ou_rien", label: "Tout ou rien",     effect: "Imprévisible"                       },
  { key: "rien",         label: "Ne rien modifier", effect: "Continuer sur la lancée"            },
];

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function getTeamRating(team: FriendsTeam): number {
  if (team.isBot) return teamStrengths[team.name] ?? 80;
  if (team.players.length === 0) return 80;
  return Math.round(team.players.reduce((s, p) => s + p.rating, 0) / team.players.length);
}

interface Props {
  bracket: FriendsBracket;
  onComplete: (champion: FriendsTeam) => void;
}

export function FriendsBracketScreen({ bracket: initial, onComplete }: Props) {
  const [bracket, setBracket] = useState<FriendsBracket>(initial);

  /* ── overlay state ───────────────────────────────────────── */
  const [matchActive, setMatchActive]   = useState(false);
  const [minute, setMinute]             = useState(0);
  const [scoreA, setScoreA]             = useState(0);
  const [scoreB, setScoreB]             = useState(0);
  const [events, setEvents]             = useState<MatchEvent[]>([]);
  const [matchDone, setMatchDone]       = useState(false);
  const [showHalftime, setShowHalftime] = useState(false);
  const [ovMyTeam, setOvMyTeam]         = useState<FriendsTeam | null>(null);
  const [ovOppTeam, setOvOppTeam]       = useState<FriendsTeam | null>(null);

  /* ── refs ────────────────────────────────────────────────── */
  const intervalRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolvePhaseRef     = useRef<(() => void) | null>(null);
  const halftimeResolverRef = useRef<((c: HalfTimeChoice) => void) | null>(null);
  const activeMatchRef      = useRef<FriendsBracketMatch | null>(null);
  const myTeamIsARef        = useRef(true); // tracks which bracket slot is "my team"

  const currentMatch = bracket.matches[bracket.currentMatchIndex] ?? null;
  const isComplete   = bracket.champion !== null;

  /* ── auto-simulate bot-vs-bot ───────────────────────────── */
  useEffect(() => {
    if (!currentMatch || currentMatch.winner) return;
    if (!currentMatch.teamA || !currentMatch.teamB) return;
    if (currentMatch.teamA.isBot && currentMatch.teamB.isBot) {
      const t = setTimeout(() => {
        const { scoreA, scoreB, winnerIsA } = simulateFriendsMatch(
          getTeamRating(currentMatch.teamA!), getTeamRating(currentMatch.teamB!),
        );
        commitResult(currentMatch, winnerIsA ? currentMatch.teamA! : currentMatch.teamB!, scoreA, scoreB);
      }, 550);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracket.currentMatchIndex]);

  function commitResult(
    match: FriendsBracketMatch,
    winner: FriendsTeam,
    sA: number,
    sB: number,
  ) {
    setBracket(prev => {
      let matches = prev.matches.map(m =>
        m.id === match.id ? { ...m, winner, scoreA: sA, scoreB: sB } : m,
      );
      const feed = BRACKET_FEED[match.id];
      if (feed) {
        matches = matches.map(m =>
          m.id === feed.toMatch ? { ...m, [feed.toSlot]: winner } : m,
        );
      }
      const champion = match.id === "final" ? winner : null;
      return { ...prev, matches, currentMatchIndex: prev.currentMatchIndex + 1, champion };
    });
  }

  useEffect(() => {
    if (bracket.champion) onComplete(bracket.champion);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracket.champion]);

  /* ── tick helper (mirrors PlayoffsScreen) ───────────────── */
  function playHalf(
    halfEvents: MatchEvent[],
    startMin: number,
    endMin: number,
    prior: MatchEvent[] = [],
  ): Promise<void> {
    return new Promise(resolve => {
      const finish = () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        const all = [...prior, ...halfEvents];
        setMinute(endMin);
        setScoreA(all.filter(e => e.team === "me").reduce((s, e) => s + e.points, 0));
        setScoreB(all.filter(e => e.team === "opponent").reduce((s, e) => s + e.points, 0));
        setEvents(all);
        resolvePhaseRef.current = null;
        resolve();
      };
      resolvePhaseRef.current = finish;

      let min = startMin;
      intervalRef.current = setInterval(() => {
        min += 1;
        const all = [...prior, ...halfEvents];
        const visible = all.filter(e => e.minute <= min);
        setMinute(min);
        setScoreA(visible.filter(e => e.team === "me").reduce((s, e) => s + e.points, 0));
        setScoreB(visible.filter(e => e.team === "opponent").reduce((s, e) => s + e.points, 0));
        setEvents(visible);
        if (min >= endMin) finish();
      }, TICK_MS);
    });
  }

  /* ── launch human match ─────────────────────────────────── */
  async function handleLaunch() {
    const match = currentMatch;
    if (!match?.teamA || !match?.teamB) return;

    // Simulate from the perspective of the first human team
    const myIsA  = !match.teamA.isBot;
    const myTeam  = myIsA ? match.teamA : match.teamB;
    const oppTeam = myIsA ? match.teamB : match.teamA;

    myTeamIsARef.current = myIsA;
    activeMatchRef.current = match;
    setOvMyTeam(myTeam);
    setOvOppTeam(oppTeam);

    const { firstHalf, simulateSecondHalf } = beginFriendsPlayoffMatch(
      getTeamRating(myTeam), getTeamRating(oppTeam), myTeam.players,
    );

    setMatchActive(true);
    setMinute(0); setScoreA(0); setScoreB(0); setEvents([]); setMatchDone(false);

    await playHalf(firstHalf.events, 0, 40);

    setShowHalftime(true);
    const choice = await new Promise<HalfTimeChoice>(resolve => {
      halftimeResolverRef.current = resolve;
    });
    setShowHalftime(false);

    const h2 = simulateSecondHalf(choice);
    let rawMy  = firstHalf.myScore  + h2.myScore;
    let rawOpp = firstHalf.oppScore + h2.oppScore;
    let extra: MatchEvent | null = null;
    if (rawMy === rawOpp) {
      if (Math.random() > 0.5) { rawMy  += 3; extra = { minute: 82, team: "me",       text: "Pénalité (Prol.)", points: 3 }; }
      else                     { rawOpp += 3; extra = { minute: 82, team: "opponent", text: "Pén. adverse (Prol.)", points: 3 }; }
    }
    await playHalf([...h2.events, ...(extra ? [extra] : [])], 40, extra ? 83 : 80, firstHalf.events);

    setMatchDone(true);
    await delay(2000);
    setMatchActive(false);

    const myWon  = rawMy > rawOpp;
    const winner = myTeamIsARef.current
      ? (myWon ? match.teamA! : match.teamB!)
      : (myWon ? match.teamB! : match.teamA!);
    const sA = myTeamIsARef.current ? rawMy : rawOpp;
    const sB = myTeamIsARef.current ? rawOpp : rawMy;
    commitResult(activeMatchRef.current!, winner, sA, sB);
  }

  function handleHalftimeChoice(choice: HalfTimeChoice) {
    halftimeResolverRef.current?.(choice);
    halftimeResolverRef.current = null;
  }

  const matchReady = currentMatch !== null && !currentMatch.winner && currentMatch.teamA !== null && currentMatch.teamB !== null;
  const hasHuman   = matchReady && (!currentMatch!.teamA!.isBot || !currentMatch!.teamB!.isBot);
  const waitingBot = matchReady && currentMatch!.teamA!.isBot && currentMatch!.teamB!.isBot;

  /* ── render ──────────────────────────────────────────────── */
  return (
    <main style={{ minHeight: "100svh", background: S.bg, color: S.text, display: "flex", flexDirection: "column" }}>

      {/* Match overlay */}
      {matchActive && ovMyTeam && ovOppTeam && (
        <MatchOverlay
          myTeam={ovMyTeam} oppTeam={ovOppTeam}
          minute={minute} scoreA={scoreA} scoreB={scoreB}
          events={events} matchDone={matchDone}
          showHalftime={showHalftime}
          onHalftimeChoice={handleHalftimeChoice}
          onSkip={() => resolvePhaseRef.current?.()}
        />
      )}

      {/* Header */}
      <div style={{ flexShrink: 0, padding: "20px 20px 16px", borderBottom: `1px solid ${S.faint}` }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em", color: S.muted, marginBottom: 4 }}>
          Playoffs entre amis
        </p>
        <p style={{ fontSize: 20, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em" }}>
          Bracket
        </p>
      </div>

      {/* Rounds */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 12px" }}>
        {ROUNDS.map(({ label, ids }) => {
          const matches = ids
            .map(id => bracket.matches.find(m => m.id === id))
            .filter((m): m is FriendsBracketMatch => !!m);
          return (
            <div key={label} style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em", color: S.muted, marginBottom: 10 }}>
                {label}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {matches.map(match => (
                  <MatchCard
                    key={match.id} match={match}
                    isCurrent={match.id === currentMatch?.id && !isComplete}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Champion banner */}
        {bracket.champion && (
          <div style={{ padding: "18px 16px", background: bracket.champion.colorHex + "18", border: `1px solid ${bracket.champion.colorHex}`, marginBottom: 20 }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em", color: bracket.champion.colorHex, marginBottom: 6 }}>
              Champion
            </p>
            <p style={{ fontSize: 28, fontWeight: 900, textTransform: "uppercase", color: bracket.champion.colorHex }}>
              {bracket.champion.name}
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ flexShrink: 0, padding: "12px 20px 28px", borderTop: `1px solid ${S.faint}` }}>
        {waitingBot && (
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: S.muted, textAlign: "center", padding: "16px 0" }}>
            Simulation en cours…
          </p>
        )}
        {hasHuman && (
          <button
            onClick={handleLaunch}
            style={{
              width: "100%", padding: "16px", border: "none",
              background: "#4AD98A",
              color: "#04060F", fontWeight: 900, fontSize: 13,
              textTransform: "uppercase", letterSpacing: "0.22em", cursor: "pointer",
            }}
          >
            Lancer {currentMatch!.round} →
          </button>
        )}
      </div>
    </main>
  );
}

/* ── Match overlay ───────────────────────────────────────────── */

interface OverlayProps {
  myTeam: FriendsTeam; oppTeam: FriendsTeam;
  minute: number; scoreA: number; scoreB: number;
  events: MatchEvent[]; matchDone: boolean; showHalftime: boolean;
  onHalftimeChoice: (c: HalfTimeChoice) => void;
  onSkip: () => void;
}

function MatchOverlay({ myTeam, oppTeam, minute, scoreA, scoreB, events, matchDone, showHalftime, onHalftimeChoice, onSkip }: OverlayProps) {
  const minuteLabel = minute === 0 ? "…" : minute >= 82 ? `${minute}'` : minute >= 80 ? "80'" : `${minute}'`;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", flexDirection: "column", background: "#04060F" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, padding: "14px 20px", borderBottom: "1px solid rgba(232,237,245,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: myTeam.colorHex }} />
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(232,237,245,0.5)" }}>
            Terrain neutre
          </p>
        </div>
        {!matchDone && !showHalftime && (
          <button
            onClick={onSkip}
            style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(232,237,245,0.3)", background: "none", border: "1px solid rgba(232,237,245,0.1)", padding: "6px 10px", cursor: "pointer" }}
          >
            Passer ⏭
          </button>
        )}
      </div>

      {/* Scoreboard */}
      <div style={{ flexShrink: 0, padding: "24px 20px 20px", borderBottom: "1px solid rgba(232,237,245,0.08)" }}>
        <p style={{ textAlign: "center", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em", color: matchDone ? myTeam.colorHex : "rgba(232,237,245,0.4)", marginBottom: 20 }}>
          {matchDone ? "Match terminé" : minute === 0 ? "Coup d'envoi…" : `En cours · ${minuteLabel}`}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* My team */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 900, textTransform: "uppercase", color: myTeam.colorHex, lineHeight: 1.2 }}>
              {myTeam.name}
            </p>
          </div>
          {/* Score */}
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <p style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.02em" }}>
              <span style={{ color: scoreA >= scoreB ? myTeam.colorHex : "rgba(232,237,245,0.35)" }}>{scoreA}</span>
              <span style={{ color: "rgba(232,237,245,0.2)", margin: "0 6px", fontSize: 32 }}>–</span>
              <span style={{ color: scoreB >= scoreA ? oppTeam.colorHex : "rgba(232,237,245,0.35)" }}>{scoreB}</span>
            </p>
            {minute > 0 && (
              <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(232,237,245,0.3)", marginTop: 4 }}>{minuteLabel}</p>
            )}
          </div>
          {/* Opp team */}
          <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
            <p style={{ fontSize: 14, fontWeight: 900, textTransform: "uppercase", color: oppTeam.colorHex, lineHeight: 1.2 }}>
              {oppTeam.name}
            </p>
          </div>
        </div>
      </div>

      {/* Events */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {events.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...events].reverse().map((ev, i) => {
              const isMe = ev.team === "me";
              const isTry = ev.text.startsWith("Essai");
              const scorer = isTry ? ev.text.replace(/^Essai de /, "").split(" ").slice(1).join(" ").toUpperCase() : null;
              const label = isTry ? (isMe ? `🏉 ${scorer}` : "🏉") : ev.text;
              const teamColor = isMe ? myTeam.colorHex : oppTeam.colorHex;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 36px 1fr", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right", color: isMe ? teamColor : "transparent" }}>
                    {isMe ? label : ""}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(232,237,245,0.25)", textAlign: "center" }}>
                    {ev.minute}&apos;
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", color: !isMe ? teamColor : "transparent" }}>
                    {!isMe ? label : ""}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80 }}>
            <p style={{ fontSize: 11, color: "rgba(232,237,245,0.2)", textTransform: "uppercase", letterSpacing: "0.2em" }}>
              Coup d&apos;envoi imminent…
            </p>
          </div>
        )}
      </div>

      {/* Halftime modal */}
      {showHalftime && (
        <HalftimeModal
          myTeam={myTeam} oppTeam={oppTeam}
          scoreA={scoreA} scoreB={scoreB}
          onChoice={onHalftimeChoice}
        />
      )}
    </div>
  );
}

/* ── Halftime modal ──────────────────────────────────────────── */

function HalftimeModal({ myTeam, oppTeam, scoreA, scoreB, onChoice }: {
  myTeam: FriendsTeam; oppTeam: FriendsTeam;
  scoreA: number; scoreB: number;
  onChoice: (c: HalfTimeChoice) => void;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(4,6,15,0.97)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto", width: "100%" }}>

        {/* Mi-temps score */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5em", color: myTeam.colorHex, marginBottom: 12 }}>
            Mi-temps · 40&apos;
          </p>
          <p style={{ fontSize: 28, fontWeight: 900 }}>
            <span style={{ color: myTeam.colorHex }}>{myTeam.name}</span>
            <span style={{ color: "rgba(232,237,245,0.3)", margin: "0 10px" }}>
              {scoreA}–{scoreB}
            </span>
            <span style={{ color: oppTeam.colorHex }}>{oppTeam.name}</span>
          </p>
        </div>

        {/* Choosing team */}
        <div style={{ borderLeft: `2px solid ${myTeam.colorHex}`, paddingLeft: 12, marginBottom: 24 }}>
          <p style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: myTeam.colorHex, marginBottom: 6 }}>
            Choix de {myTeam.name}
          </p>
          <p style={{ fontSize: 11, color: "rgba(232,237,245,0.6)", lineHeight: 1.6 }}>
            Choisis ta stratégie pour la 2e mi-temps. Ce choix impacte les probabilités de marquer et d&apos;encaisser.
          </p>
        </div>

        {/* 2×2 choices */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {HALFTIME_CHOICES.map(c => (
            <button
              key={c.key}
              onClick={() => onChoice(c.key)}
              style={{
                border: "1px solid rgba(232,237,245,0.12)",
                background: "transparent", padding: "14px 12px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                cursor: "pointer", transition: "border-color 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = myTeam.colorHex + "88")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(232,237,245,0.12)")}
            >
              <p style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#E8EDF5" }}>
                {c.label}
              </p>
              <div style={{ width: 20, height: 1, background: "rgba(232,237,245,0.2)" }} />
              <p style={{ fontSize: 8, color: "rgba(232,237,245,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center", lineHeight: 1.5 }}>
                {c.effect}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Bracket card sub-components ─────────────────────────────── */

function MatchCard({ match, isCurrent }: { match: FriendsBracketMatch; isCurrent: boolean }) {
  const done = match.winner !== null;
  return (
    <div style={{ padding: "12px 14px", border: `1px solid ${isCurrent ? "rgba(232,237,245,0.22)" : "rgba(232,237,245,0.10)"}`, background: isCurrent ? "rgba(232,237,245,0.025)" : "transparent", display: "flex", alignItems: "center", gap: 10 }}>
      <TeamSlot team={match.teamA} winner={match.winner} done={done} side="left" />
      <div style={{ flexShrink: 0, textAlign: "center", minWidth: 52 }}>
        {done
          ? <span style={{ fontSize: 14, fontWeight: 900 }}>{match.scoreA} – {match.scoreB}</span>
          : <span style={{ fontSize: 11, color: "rgba(232,237,245,0.4)", fontWeight: 700 }}>vs</span>
        }
      </div>
      <TeamSlot team={match.teamB} winner={match.winner} done={done} side="right" />
    </div>
  );
}

function TeamSlot({ team, winner, done, side }: { team: FriendsTeam | null; winner: FriendsTeam | null; done: boolean; side: "left" | "right" }) {
  if (!team) {
    return (
      <div style={{ flex: 1, textAlign: side }}>
        <span style={{ fontSize: 11, color: "rgba(232,237,245,0.18)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>TBD</span>
      </div>
    );
  }
  const isWinner = done && winner?.id === team.id;
  const isLoser  = done && winner?.id !== team.id;
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, flexDirection: side === "right" ? "row-reverse" : "row", opacity: isLoser ? 0.28 : 1 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: team.colorHex, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em", color: isWinner ? team.colorHex : "#E8EDF5", textAlign: side }}>
        {team.name}
        {team.isBot && <span style={{ fontSize: 8, fontWeight: 500, opacity: 0.4, marginLeft: 5 }}>BOT</span>}
      </span>
    </div>
  );
}
