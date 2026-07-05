"use client";

import { useRef, useState } from "react";
import { beginPlayoffMatch, simulatePlayoffMatch } from "@/lib/simulation";
import type { HalfTimeChoice } from "@/lib/simulation";
import type { MatchEvent, Player, PlayoffMatchSummary, PlayoffSummary } from "@/lib/types";

const strip = (s: string) => s.replace(/\s\d{2}-\d{2}$/, "");

interface Props {
  myTeamName: string;
  teamRating: number;
  selectedPlayers: Player[];
  qualifiedTeams: string[];
  onComplete: (summary: PlayoffSummary) => void;
}

type RoundMatch = {
  home: string; away: string;
  homeScore: number; awayScore: number;
  winner: string;
};

/* ── Gold palette ─────────────────────────────────────────────
   All playoffs UI uses these instead of CSS theme variables
   so it stays gold regardless of light/dark user preference.  */
const G = {
  bg:          "#09070100" as const,  // fallback, overridden inline
  pageBg:      "bg-[#080600]",
  cardBg:      "bg-[#100d00]",
  border:      "border-c-gold/20",
  borderHi:    "border-c-gold/50",
  text:        "text-white",
  textMuted:   "text-c-gold/55",
  textFaint:   "text-c-gold/30",
  gold:        "text-c-gold",
  divider:     "bg-c-gold/15",
};

const CONFETTI_COLORS = ["#D4AF37", "#F5F0E8", "#ffffff", "#B8860B", "#FFE066", "#FFF8DC"];
const TICK_MS = 1400;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function ConfettiOverlay() {
  return (
    <>
      <style>{`@keyframes confetti-drop{0%{transform:translateY(-10px) rotate(0deg);opacity:1}80%{opacity:.9}100%{transform:translateY(110vh) rotate(1080deg);opacity:0}}`}</style>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 60, overflow: "hidden" }}>
        {Array.from({ length: 80 }, (_, i) => (
          <div key={i} style={{
            position: "absolute", top: 0, left: `${(i * 1.25) % 100}%`,
            width: i % 4 === 0 ? 10 : 6, height: i % 4 === 0 ? 6 : 13,
            backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            borderRadius: i % 5 === 0 ? "50%" : 2,
            animation: `confetti-drop ${2.5 + (i % 20) * 0.08}s ${(i % 40) * 0.05}s ease-in forwards`,
          }} />
        ))}
      </div>
    </>
  );
}

export function PlayoffsScreen({ myTeamName, teamRating, selectedPlayers, qualifiedTeams, onComplete }: Props) {
  /* ── bracket state ───────────────────────────────────────── */
  const [qf1, setQf1] = useState<RoundMatch | null>(null);
  const [qf2, setQf2] = useState<RoundMatch | null>(null);
  const [sf1, setSf1] = useState<RoundMatch | null>(null);
  const [sf2, setSf2] = useState<RoundMatch | null>(null);
  const [finalMatch, setFinalMatch] = useState<RoundMatch | null>(null);
  const [phase, setPhase] = useState<"qf" | "sf" | "final" | "done">("qf");
  const [simulating, setSimulating] = useState(false);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [eliminatedIn, setEliminatedIn] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  /* ── overlay state ───────────────────────────────────────── */
  const [overlay, setOverlay] = useState(false);
  const [ovMinute, setOvMinute] = useState(0);
  const [ovMyScore, setOvMyScore] = useState(0);
  const [ovOppScore, setOvOppScore] = useState(0);
  const [ovEvents, setOvEvents] = useState<MatchEvent[]>([]);
  const [ovIsHome, setOvIsHome] = useState(true);
  const [ovOpponent, setOvOpponent] = useState("");
  const [ovDone, setOvDone] = useState(false);
  const [showHalftime, setShowHalftime] = useState(false);

  /* ── refs ────────────────────────────────────────────────── */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolvePhaseRef = useRef<(() => void) | null>(null);
  const halftimeResolverRef = useRef<((c: HalfTimeChoice) => void) | null>(null);

  /* ── seedings ────────────────────────────────────────────── */
  const t1 = qualifiedTeams[0] ?? "—";
  const t2 = qualifiedTeams[1] ?? "—";
  const t3 = qualifiedTeams[2] ?? "—";
  const t4 = qualifiedTeams[3] ?? "—";
  const t5 = qualifiedTeams[4] ?? "—";
  const t6 = qualifiedTeams[5] ?? "—";
  const myRank = qualifiedTeams.indexOf(myTeamName);

  /* ── helpers ─────────────────────────────────────────────── */

  function simOther(home: string, away: string): RoundMatch {
    const r = simulatePlayoffMatch(home, away);
    return { home, away, homeScore: r.homeScore, awayScore: r.awayScore, winner: r.winner };
  }

  async function revealOther(key: string, result: RoundMatch, setter: (r: RoundMatch) => void) {
    setFlashKey(key);
    await delay(850);
    setter(result);
    setFlashKey(null);
    await delay(500);
  }

  function playHalf(
    halfEvents: MatchEvent[],
    startMinute: number,
    endMinute: number,
    priorEvents: MatchEvent[] = [],
  ): Promise<void> {
    return new Promise((resolve) => {
      const finish = () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        const all = [...priorEvents, ...halfEvents];
        setOvMinute(endMinute);
        setOvMyScore(all.filter(e => e.team === "me").reduce((s, e) => s + e.points, 0));
        setOvOppScore(all.filter(e => e.team === "opponent").reduce((s, e) => s + e.points, 0));
        setOvEvents(all);
        resolvePhaseRef.current = null;
        resolve();
      };
      resolvePhaseRef.current = finish;

      let minute = startMinute;
      intervalRef.current = setInterval(() => {
        minute += 5;
        const all = [...priorEvents, ...halfEvents];
        const visible = all.filter(e => e.minute <= minute);
        setOvMinute(minute);
        setOvMyScore(visible.filter(e => e.team === "me").reduce((s, e) => s + e.points, 0));
        setOvOppScore(visible.filter(e => e.team === "opponent").reduce((s, e) => s + e.points, 0));
        setOvEvents(visible);
        if (minute >= endMinute) finish();
      }, TICK_MS);
    });
  }

  async function revealMyMatch(home: string, away: string, setter: (r: RoundMatch) => void): Promise<RoundMatch> {
    const isHome = home === myTeamName;
    const opponent = isHome ? away : home;
    const { firstHalf, simulateSecondHalf } = beginPlayoffMatch(teamRating, { opponent, isHome }, selectedPlayers);

    setOvIsHome(isHome);
    setOvOpponent(opponent);
    setOvMinute(0);
    setOvMyScore(0);
    setOvOppScore(0);
    setOvEvents([]);
    setOvDone(false);
    setOverlay(true);

    await playHalf(firstHalf.events, 0, 40);

    setShowHalftime(true);
    const choice = await new Promise<HalfTimeChoice>((resolve) => {
      halftimeResolverRef.current = resolve;
    });
    setShowHalftime(false);

    const secondHalf = simulateSecondHalf(choice);
    let rawMy = firstHalf.myScore + secondHalf.myScore;
    let rawOpp = firstHalf.oppScore + secondHalf.oppScore;
    let extraEvent: MatchEvent | null = null;
    if (rawMy === rawOpp) {
      if (Math.random() > 0.5) { rawMy += 3; extraEvent = { minute: 82, team: "me",       text: "Pénalité (Prol.)",       points: 3 }; }
      else                     { rawOpp += 3; extraEvent = { minute: 82, team: "opponent", text: "Pén. adverse (Prol.)",    points: 3 }; }
    }
    const h2Events: MatchEvent[] = [...secondHalf.events, ...(extraEvent ? [extraEvent] : [])];
    await playHalf(h2Events, 40, extraEvent ? 83 : 80, firstHalf.events);

    setOvDone(true);
    await delay(2000);
    setOverlay(false);

    const homeScore = isHome ? rawMy : rawOpp;
    const awayScore = isHome ? rawOpp : rawMy;
    const result: RoundMatch = { home, away, homeScore, awayScore, winner: homeScore > awayScore ? home : away };
    setter(result);
    await delay(400);
    return result;
  }

  /* ── phase runners ───────────────────────────────────────── */

  async function runQF() {
    setSimulating(true);
    const qf1HasMe = t3 === myTeamName || t6 === myTeamName;
    const qf2HasMe = t4 === myTeamName || t5 === myTeamName;
    if (qf1HasMe) {
      await revealOther("qf2", simOther(t4, t5), setQf2);
      const r = await revealMyMatch(t3, t6, setQf1);
      if (r.winner !== myTeamName) setEliminatedIn("Quarts de finale");
    } else if (qf2HasMe) {
      await revealOther("qf1", simOther(t3, t6), setQf1);
      const r = await revealMyMatch(t4, t5, setQf2);
      if (r.winner !== myTeamName) setEliminatedIn("Quarts de finale");
    } else {
      await revealOther("qf1", simOther(t3, t6), setQf1);
      await revealOther("qf2", simOther(t4, t5), setQf2);
    }
    setPhase("sf");
    setSimulating(false);
  }

  async function runSF() {
    if (!qf1 || !qf2) return;
    setSimulating(true);
    const sf1Home = t1, sf1Away = qf1.winner;
    const sf2Home = t2, sf2Away = qf2.winner;
    const sf1HasMe = sf1Home === myTeamName || sf1Away === myTeamName;
    const sf2HasMe = sf2Home === myTeamName || sf2Away === myTeamName;
    if (sf1HasMe) {
      await revealOther("sf2", simOther(sf2Home, sf2Away), setSf2);
      const r = await revealMyMatch(sf1Home, sf1Away, setSf1);
      if (r.winner !== myTeamName) setEliminatedIn("Demi-finales");
    } else if (sf2HasMe) {
      await revealOther("sf1", simOther(sf1Home, sf1Away), setSf1);
      const r = await revealMyMatch(sf2Home, sf2Away, setSf2);
      if (r.winner !== myTeamName) setEliminatedIn("Demi-finales");
    } else {
      await revealOther("sf1", simOther(sf1Home, sf1Away), setSf1);
      await revealOther("sf2", simOther(sf2Home, sf2Away), setSf2);
    }
    setPhase("final");
    setSimulating(false);
  }

  async function runFinal() {
    if (!sf1 || !sf2) return;
    setSimulating(true);
    const fHome = sf1.winner, fAway = sf2.winner;
    const finalHasMe = fHome === myTeamName || fAway === myTeamName;
    let winner: string;
    if (finalHasMe) {
      const r = await revealMyMatch(fHome, fAway, setFinalMatch);
      winner = r.winner;
    } else {
      const r = simOther(fHome, fAway);
      await revealOther("finale", r, setFinalMatch);
      winner = r.winner;
    }
    setPhase("done");
    setSimulating(false);
    if (winner === myTeamName) setTimeout(() => setShowConfetti(true), 300);
  }

  function handleSimulate() {
    if (phase === "qf") runQF();
    else if (phase === "sf") runSF();
    else if (phase === "final") runFinal();
  }

  function handleHalftimeChoice(choice: HalfTimeChoice) {
    halftimeResolverRef.current?.(choice);
    halftimeResolverRef.current = null;
  }

  /* ── derived ─────────────────────────────────────────────── */
  const champion = phase === "done" && finalMatch ? finalMatch.winner : null;
  const isChampion = champion === myTeamName;
  const isFinaliste = !!(phase === "done" && finalMatch && !isChampion &&
    (finalMatch.home === myTeamName || finalMatch.away === myTeamName));
  const phaseLabel =
    phase === "qf" ? "Quarts de finale" :
    phase === "sf" ? "Demi-finales" :
    phase === "final" ? "Finale" : "Terminé";
  const phaseIndex = phase === "qf" ? 0 : phase === "sf" ? 1 : phase === "final" ? 2 : 3;

  function handleGoToRecap() {
    const matches: PlayoffMatchSummary[] = [];
    for (const { roundLabel, match } of [
      { roundLabel: "Quarts de finale", match: qf1 },
      { roundLabel: "Quarts de finale", match: qf2 },
      { roundLabel: "Demi-finales", match: sf1 },
      { roundLabel: "Demi-finales", match: sf2 },
      { roundLabel: "Finale", match: finalMatch },
    ]) {
      if (!match) continue;
      const isHome = match.home === myTeamName;
      const isAway = match.away === myTeamName;
      if (!isHome && !isAway) continue;
      matches.push({
        round: roundLabel,
        opponent: isHome ? match.away : match.home,
        myScore: isHome ? match.homeScore : match.awayScore,
        opponentScore: isHome ? match.awayScore : match.homeScore,
        won: match.winner === myTeamName,
      });
    }
    onComplete({
      outcome: isChampion ? "champion" : isFinaliste ? "finaliste" : "eliminé",
      eliminatedIn: eliminatedIn ?? undefined,
      matches,
    });
  }

  /* ── render ──────────────────────────────────────────────── */
  return (
    <main className={`min-h-screen ${G.pageBg} ${G.text} flex flex-col`}>
      {showConfetti && <ConfettiOverlay />}

      {overlay && (
        <PlayoffMatchOverlay
          myTeamName={myTeamName}
          opponent={ovOpponent} isHome={ovIsHome}
          minute={ovMinute} myScore={ovMyScore} oppScore={ovOppScore}
          events={ovEvents} matchDone={ovDone}
          showHalftime={showHalftime}
          onHalftimeChoice={handleHalftimeChoice}
          onSkip={() => resolvePhaseRef.current?.()}
        />
      )}

      {/* Header */}
      <header className={`border-b ${G.border} px-5 lg:px-8 py-4 lg:py-5 flex items-center justify-between flex-shrink-0`}>
        <div className="flex items-center gap-4">
          <span className="text-2xl lg:text-3xl font-black tracking-tighter">
            26<span className="text-c-gold">-</span>0
          </span>
          <div className={`w-px h-7 ${G.divider}`} />
          <div>
            <p className={`${G.textFaint} uppercase tracking-[0.35em] text-[8px] lg:text-[9px] font-bold`}>Top 14 · 2025-2026</p>
            <p className="text-c-gold font-black text-xs lg:text-sm uppercase tracking-wide">Play-offs</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`${G.textFaint} uppercase tracking-wider text-[8px] mb-0.5`}>Qualifié</p>
          <p className="text-c-gold font-black text-sm lg:text-base">{myRank + 1}<span className={`${G.textMuted} text-xs`}>ème</span></p>
        </div>
      </header>

      {/* Bracket */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 lg:px-8 py-6 space-y-5 max-w-xl lg:max-w-2xl mx-auto">

          {/* Phase progress */}
          {phase !== "done" && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`h-0.5 rounded-full transition-all duration-700 ${
                    i < phaseIndex ? "w-5 bg-c-gold/25" : i === phaseIndex ? "w-10 bg-c-gold" : "w-5 bg-c-gold/10"
                  }`} />
                ))}
              </div>
              <span className={`${G.textMuted} text-[9px] uppercase tracking-[0.3em] font-bold`}>{phaseLabel}</span>
            </div>
          )}

          {/* QF */}
          <section className="space-y-2">
            <p className={`uppercase tracking-[0.3em] text-[8px] font-bold transition-colors duration-500 ${
              phase === "qf" ? "text-c-gold" : G.textMuted
            }`}>Quarts de finale</p>
            <GoldMatchCard matchKey="qf1" home={t3} away={t6} result={qf1} myTeam={myTeamName} flashKey={flashKey} />
            <GoldMatchCard matchKey="qf2" home={t4} away={t5} result={qf2} myTeam={myTeamName} flashKey={flashKey} />
          </section>

          <GoldFlowArrow dim={phase !== "sf" && phase !== "final" && phase !== "done"} />

          {/* SF */}
          <section className="space-y-2">
            <p className={`uppercase tracking-[0.3em] text-[8px] font-bold transition-colors duration-500 ${
              phase === "sf" ? "text-c-gold" : phase === "final" || phase === "done" ? G.textMuted : G.textFaint
            }`}>Demi-finales</p>
            <GoldMatchCard matchKey="sf1" home={t1} away={qf1 ? qf1.winner : "Vainqueur QF1"} homeNote="Qualif. directe" result={sf1} myTeam={myTeamName} flashKey={flashKey} dim={phase === "qf"} />
            <GoldMatchCard matchKey="sf2" home={t2} away={qf2 ? qf2.winner : "Vainqueur QF2"} homeNote="Qualif. directe" result={sf2} myTeam={myTeamName} flashKey={flashKey} dim={phase === "qf"} />
          </section>

          <GoldFlowArrow dim={phase !== "final" && phase !== "done"} />

          {/* Final */}
          <section className="space-y-2">
            <p className={`uppercase tracking-[0.3em] text-[8px] font-bold transition-colors duration-500 ${
              phase === "final" || phase === "done" ? "text-c-gold" : G.textFaint
            }`}>Finale</p>
            <GoldMatchCard
              matchKey="finale"
              home={sf1 ? sf1.winner : "Vainqueur SF1"}
              away={sf2 ? sf2.winner : "Vainqueur SF2"}
              result={finalMatch} myTeam={myTeamName} flashKey={flashKey}
              dim={phase === "qf" || phase === "sf"} isFinal
            />
          </section>

          {/* Champion */}
          {phase === "done" && champion && (
            <div className={`border ${isChampion ? "border-c-gold bg-c-gold/10" : "border-c-gold/20"} p-5 text-center`}>
              {isChampion ? (
                <>
                  <p className="text-c-gold/60 uppercase tracking-[0.5em] text-[8px] font-bold mb-2">Bouclier de Brennus</p>
                  <p className="text-c-gold font-black text-2xl lg:text-3xl uppercase tracking-wide">{myTeamName}</p>
                  <p className="text-c-gold/40 uppercase tracking-[0.3em] text-[9px] mt-2">Champion Top 14 · 2025-2026</p>
                </>
              ) : (
                <>
                  <p className={`${G.textMuted} uppercase tracking-[0.3em] text-[8px] font-bold mb-1.5`}>Champion</p>
                  <p className="text-white/60 font-black text-xl uppercase">{champion}</p>
                  {(eliminatedIn || isFinaliste) && (
                    <p className={`${G.textFaint} text-[9px] uppercase tracking-wide mt-3`}>
                      {myTeamName} · {isFinaliste ? "Finaliste" : `Éliminé en ${eliminatedIn}`}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="pb-6">
            {phase !== "done" ? (
              <button onClick={handleSimulate} disabled={simulating}
                className="w-full bg-c-gold hover:bg-[#c9a42e] disabled:opacity-40 disabled:cursor-not-allowed text-black font-black uppercase tracking-[0.2em] text-sm py-4 transition-colors">
                {simulating ? "Simulation..." : `Simuler ${phaseLabel} →`}
              </button>
            ) : (
              <button onClick={handleGoToRecap}
                className="w-full bg-c-gold hover:bg-[#c9a42e] text-black font-black uppercase tracking-[0.2em] text-sm py-4 transition-colors">
                Voir le récap →
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ── Immersive match overlay ──────────────────────────────────── */

interface OverlayProps {
  myTeamName: string; opponent: string; isHome: boolean;
  minute: number; myScore: number; oppScore: number;
  events: MatchEvent[]; matchDone: boolean;
  showHalftime: boolean;
  onHalftimeChoice: (c: HalfTimeChoice) => void;
  onSkip: () => void;
}

function PlayoffMatchOverlay({ myTeamName, opponent, isHome, minute, myScore, oppScore, events, matchDone, showHalftime, onHalftimeChoice, onSkip }: OverlayProps) {
  const leftName  = isHome ? myTeamName : strip(opponent);
  const rightName = isHome ? strip(opponent) : myTeamName;
  const leftScore = isHome ? myScore : oppScore;
  const rightScore = isHome ? oppScore : myScore;
  const leftIsMe  = isHome;
  const minuteLabel = minute === 0 ? "…" : minute >= 82 ? `${minute}'` : minute >= 80 ? "80'" : `${minute}'`;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", flexDirection: "column", backgroundColor: "#080600" }}>

      {/* Header bar */}
      <div className={`border-b ${G.border} px-5 py-3 flex items-center justify-between flex-shrink-0`}>
        <div>
          <p className="text-c-gold uppercase tracking-[0.4em] text-[8px] font-bold">Play-offs</p>
          <p className={`${G.textMuted} text-[9px] uppercase tracking-wide`}>
            {isHome ? "Domicile" : "Extérieur"} · {strip(opponent)}
          </p>
        </div>
        {!matchDone && !showHalftime && (
          <button onClick={onSkip}
            className={`${G.textFaint} hover:text-c-gold/60 text-[9px] uppercase tracking-wider font-bold px-2 py-1 border ${G.border} hover:border-c-gold/35 transition-colors`}>
            Passer ⏭
          </button>
        )}
      </div>

      {/* Scoreboard */}
      <div className={`px-5 py-6 lg:py-8 border-b ${G.border} flex-shrink-0`}>
        <p className={`text-center uppercase tracking-[0.35em] text-[9px] font-bold mb-5 ${matchDone ? "text-c-gold" : G.textMuted}`}>
          {matchDone ? "Match terminé" : minute === 0 ? "Coup d'envoi…" : `En cours · ${minuteLabel}`}
        </p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className={`font-black text-base lg:text-xl leading-tight truncate ${leftIsMe ? "text-c-gold" : "text-white"}`}>
              {leftIsMe ? `▶ ${leftName}` : leftName}
            </p>
            <p className={`${G.textFaint} text-[9px] uppercase tracking-wide mt-0.5`}>Dom.</p>
          </div>
          <div className="text-center flex-shrink-0 px-3 lg:px-6">
            <p className="text-c-gold font-black text-5xl lg:text-7xl tracking-tighter leading-none tabular-nums">
              {leftScore}<span className="text-c-gold/30 mx-2 text-3xl lg:text-4xl">–</span>{rightScore}
            </p>
            {(minute > 0 || matchDone) && (
              <p className={`${G.textMuted} text-[10px] font-bold tracking-widest mt-1`}>{minuteLabel}</p>
            )}
          </div>
          <div className="flex-1 text-right min-w-0">
            <p className={`font-black text-base lg:text-xl leading-tight truncate ${!leftIsMe ? "text-c-gold" : "text-white"}`}>
              {!leftIsMe ? `${rightName} ◀` : rightName}
            </p>
            <p className={`${G.textFaint} text-[9px] uppercase tracking-wide mt-0.5`}>Ext.</p>
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto">
        {events.length > 0 ? (
          <div className="px-5 py-4">
            <p className={`${G.textMuted} uppercase tracking-[0.3em] text-[9px] font-bold mb-3`}>Faits de match</p>
            <div className="space-y-1.5">
              {[...events].reverse().map((event, i) => {
                const isMe = event.team === "me";
                const isTry = event.text.startsWith("Essai");
                const scorerName = event.text.replace(/^Essai de /, "");
                const lastName = scorerName.includes(" ") ? scorerName.split(" ").slice(1).join(" ") : scorerName;
                const label = isTry ? (isMe ? `🏉 ${lastName}` : "🏉 Essai adverse") : event.text;
                const isLeft = isHome ? isMe : !isMe;
                return (
                  <div key={i} className="grid grid-cols-[1fr_40px_1fr] items-center gap-1">
                    <span className={`text-[10px] uppercase tracking-wider font-black truncate text-right ${isLeft ? (isMe ? "text-c-gold" : "text-white/50") : "text-transparent"}`}>
                      {isLeft ? label : ""}
                    </span>
                    <span className={`${G.textFaint} text-[9px] font-bold text-center tabular-nums`}>{event.minute}&apos;</span>
                    <span className={`text-[10px] uppercase tracking-wider font-black truncate text-left ${!isLeft ? (isMe ? "text-c-gold" : "text-white/50") : "text-transparent"}`}>
                      {!isLeft ? label : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 h-32">
            <p className={`${G.textFaint} text-xs uppercase tracking-wider`}>Coup d&apos;envoi imminent…</p>
          </div>
        )}
      </div>

      {showHalftime && (
        <HalftimeModal
          myScore={myScore} oppScore={oppScore}
          myTeamName={myTeamName} opponent={opponent} isHome={isHome}
          onChoice={onHalftimeChoice}
        />
      )}
    </div>
  );
}

/* ── Halftime choice ─────────────────────────────────────────── */

const CHOICES: { key: HalfTimeChoice; label: string; effect: string }[] = [
  { key: "tenir",        label: "Défendre",        effect: "Encaisser peu d'essais, marquer peu d'essais" },
  { key: "attaquer",     label: "Attaquer",         effect: "Jeu ouvert, plus d'essais"   },
  { key: "tout_ou_rien", label: "Tout ou rien",     effect: "Imprévisible"                },
  { key: "rien",         label: "Ne rien modifier", effect: "Continuer sur la lancée"     },
];

interface HalftimeModalProps {
  myScore: number; oppScore: number;
  myTeamName: string; opponent: string; isHome: boolean;
  onChoice: (c: HalfTimeChoice) => void;
}

function HalftimeModal({ myScore, oppScore, myTeamName, opponent, isHome, onChoice }: HalftimeModalProps) {
  const leftScore = isHome ? myScore : oppScore;
  const rightScore = isHome ? oppScore : myScore;
  const leftName  = isHome ? myTeamName : strip(opponent);
  const rightName = isHome ? strip(opponent) : myTeamName;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, backgroundColor: "rgba(8,6,0,0.97)" }}
      className="flex flex-col justify-start overflow-y-auto">
      <div className="px-5 pt-6 pb-4 space-y-4 max-w-lg mx-auto w-full">

        {/* Score at half */}
        <div className="text-center">
          <p className="text-c-gold uppercase tracking-[0.5em] text-[9px] font-bold mb-3">Mi-temps · 40&apos;</p>
          <p className="text-white font-black text-3xl tabular-nums leading-tight">
            {leftName} <span className="text-c-gold">{leftScore}–{rightScore}</span> {rightName}
          </p>
          <p className={`${G.textMuted} text-[10px] uppercase tracking-[0.3em] mt-2`}>
            Choisissez votre tactique
          </p>
        </div>

        {/* 2×2 grid of choices */}
        <div className="grid grid-cols-2 gap-2">
          {CHOICES.map((c) => (
            <button
              key={c.key}
              onClick={() => onChoice(c.key)}
              className={`border ${G.border} hover:border-c-gold hover:bg-c-gold/8 p-3 text-center flex flex-col items-center gap-1.5 transition-all duration-150 group`}
            >
              <p className="font-black text-[11px] uppercase tracking-wide text-white group-hover:text-c-gold transition-colors leading-tight">
                {c.label}
              </p>
              <div className="w-5 h-px bg-c-gold/25 group-hover:bg-c-gold/50 transition-colors" />
              <p className={`${G.textFaint} text-[8px] uppercase tracking-wider text-center leading-snug`}>
                {c.effect}
              </p>
            </button>
          ))}
        </div>

        <p className={`${G.textFaint} text-[8px] text-center uppercase tracking-wider`}>
          Ce choix affecte les probabilités en 2e mi-temps
        </p>
      </div>
    </div>
  );
}

/* ── Gold bracket sub-components ─────────────────────────────── */

function GoldFlowArrow({ dim }: { dim?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-0.5 transition-opacity duration-500 ${dim ? "opacity-30" : ""}`}>
      <div className="flex-1 h-px bg-c-gold/20" />
      <span className="text-c-gold/40 text-[11px]">↓</span>
      <div className="flex-1 h-px bg-c-gold/20" />
    </div>
  );
}

interface MatchCardProps {
  matchKey: string; home: string; away: string; homeNote?: string;
  result: RoundMatch | null; myTeam: string; flashKey: string | null;
  dim?: boolean; isFinal?: boolean;
}

function GoldMatchCard({ matchKey, home, away, homeNote, result, myTeam, flashKey, dim, isFinal }: MatchCardProps) {
  const isFlash = flashKey === matchKey;
  const done = result !== null;
  const homeIsMe = home === myTeam, awayIsMe = away === myTeam;
  const homeWon = done && result.winner === home;
  const awayWon = done && result.winner === away;

  const border =
    isFinal && done ? "border-c-gold/70" :
    (homeIsMe || awayIsMe) && done ? "border-c-gold/45" :
    done ? "border-c-gold/25" :
    isFlash ? "border-c-gold/30" :
    "border-c-gold/12";

  const bg = isFinal && done
    ? "bg-c-gold/8"
    : (homeIsMe || awayIsMe) && done
    ? "bg-c-gold/5"
    : "";

  return (
    <div className={`border p-3.5 transition-all duration-300 ${border} ${bg} ${dim ? "opacity-20" : ""}`}>
      {isFlash && !done && <p className={`${G.textFaint} text-[8px] uppercase tracking-[0.3em] mb-2`}>Simulation...</p>}
      <div className="flex items-center gap-2">
        <div className={`flex-1 min-w-0 transition-opacity duration-500 ${done && !homeWon ? "opacity-30" : ""}`}>
          <p className={`text-[11px] lg:text-xs font-black truncate leading-tight ${homeIsMe ? "text-c-gold" : "text-white"}`}>
            {homeIsMe ? `▶ ${strip(home)}` : strip(home)}
          </p>
          {homeNote && !done && <p className={`${G.textFaint} text-[8px] uppercase tracking-wide mt-0.5 leading-none`}>{homeNote}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 tabular-nums" style={{ minWidth: "4.5rem", justifyContent: "center" }}>
          {done ? (
            <>
              <span className={`text-base lg:text-lg font-black ${homeIsMe ? "text-c-gold" : homeWon ? "text-white" : "text-white/30"}`}>{result.homeScore}</span>
              <span className="text-c-gold/25 text-[10px]">–</span>
              <span className={`text-base lg:text-lg font-black ${awayIsMe ? "text-c-gold" : awayWon ? "text-white" : "text-white/30"}`}>{result.awayScore}</span>
            </>
          ) : (
            <span className="text-c-gold/20 text-[10px] tracking-widest font-bold">vs</span>
          )}
        </div>
        <div className={`flex-1 min-w-0 text-right transition-opacity duration-500 ${done && !awayWon ? "opacity-30" : ""}`}>
          <p className={`text-[11px] lg:text-xs font-black truncate leading-tight ${awayIsMe ? "text-c-gold" : "text-white"}`}>
            {awayIsMe ? `${strip(away)} ◀` : strip(away)}
          </p>
        </div>
      </div>
    </div>
  );
}
