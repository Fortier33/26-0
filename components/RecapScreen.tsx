"use client";

import { useRef, useState } from "react";
import type { Player, PlayoffSummary, SeasonRecord } from "@/lib/types";

interface Props {
  myTeamName: string;
  selectedPlayers: Player[];
  seasonWins: number;
  seasonDraws: number;
  seasonLosses: number;
  seasonPoints: number;
  myFinalPosition: number;
  playoffSummary: PlayoffSummary;
  seasonHistory: SeasonRecord[];
  onReplay: () => void;
  onNextSeason: () => void;
}

const POSITION_ORDER = [
  "Pilier gauche", "Talonneur", "Pilier droit",
  "Deuxième ligne",
  "Troisième ligne", "Numéro 8",
  "Demi de mêlée", "Ouvreur",
  "Centre", "Ailier", "Arrière",
];

const POSITION_JERSEYS: Record<string, number[]> = {
  "Pilier gauche": [1], "Talonneur": [2], "Pilier droit": [3],
  "Deuxième ligne": [4, 5],
  "Troisième ligne": [6, 7], "Numéro 8": [8],
  "Demi de mêlée": [9], "Ouvreur": [10],
  "Centre": [12, 13], "Ailier": [11, 14],
  "Arrière": [15],
};

const OUTCOME_LABEL: Record<PlayoffSummary["outcome"], string> = {
  champion: "CHAMPION",
  finaliste: "FINALISTE",
  eliminé: "ÉLIMINÉ",
  "non-qualifié": "NON QUALIFIÉ",
};

function sortByPosition(players: Player[]): { player: Player; jersey: number }[] {
  const used = new Set<number>();
  return POSITION_ORDER.flatMap((pos) => {
    const jerseys = POSITION_JERSEYS[pos] ?? [];
    const matches: { player: Player; jersey: number }[] = [];
    for (const jersey of jerseys) {
      const idx = players.findIndex((_, i) => players[i].position === pos && !used.has(i));
      if (idx === -1) continue;
      used.add(idx);
      matches.push({ player: players[idx], jersey });
    }
    return matches;
  });
}

type RecordRow = { label: string; display: string; season: number | null; isNew: boolean };

function buildRecordRows(history: SeasonRecord[]): RecordRow[] {
  if (history.length === 0) return [];
  const cur = history[history.length - 1];
  const rows: RecordRow[] = [];

  const champSeasons = history.filter(s => s.playoffOutcome === "champion");
  if (champSeasons.length > 0) {
    const list = champSeasons.map(s => `S${s.seasonNumber}`).join(", ");
    rows.push({ label: "Bouclier de Brennus", display: `${champSeasons.length} titre${champSeasons.length > 1 ? "s" : ""} · ${list}`, season: null, isNew: cur.playoffOutcome === "champion" });
  }

  const bestRanking = history.reduce((b, s) => s.finalPosition < b.finalPosition ? s : b);
  rows.push({ label: "Meilleur classement", display: `${bestRanking.finalPosition}e`, season: bestRanking.seasonNumber, isNew: bestRanking.seasonNumber === cur.seasonNumber });

  const withTry = history.filter(s => s.topTryScorer !== null);
  if (withTry.length > 0) {
    const best = withTry.reduce((b, s) => (s.topTryScorer!.tries > b.topTryScorer!.tries ? s : b));
    rows.push({ label: "Top essayeur", display: `${best.topTryScorer!.name} · ${best.topTryScorer!.tries} essais`, season: best.seasonNumber, isNew: best.seasonNumber === cur.seasonNumber });
  }

  const bestAttack = history.reduce((b, s) => s.pointsScored > b.pointsScored ? s : b);
  rows.push({ label: "Meilleure attaque", display: `${bestAttack.pointsScored} pts`, season: bestAttack.seasonNumber, isNew: bestAttack.seasonNumber === cur.seasonNumber });

  const bestDefense = history.reduce((b, s) => s.pointsConceded < b.pointsConceded ? s : b);
  rows.push({ label: "Meilleure défense", display: `${bestDefense.pointsConceded} pts enc.`, season: bestDefense.seasonNumber, isNew: bestDefense.seasonNumber === cur.seasonNumber });

  const mostWins = history.reduce((b, s) => s.wins > b.wins ? s : b);
  rows.push({ label: "Plus de victoires", display: `${mostWins.wins} V`, season: mostWins.seasonNumber, isNew: mostWins.seasonNumber === cur.seasonNumber });

  const longestStreak = history.reduce((b, s) => s.longestWinStreak > b.longestWinStreak ? s : b);
  rows.push({ label: "Série de victoires", display: `${longestStreak.longestWinStreak} matchs cons.`, season: longestStreak.seasonNumber, isNew: longestStreak.seasonNumber === cur.seasonNumber });

  const biggestWin = history.reduce((b, s) => s.biggestWinMargin > b.biggestWinMargin ? s : b);
  if (biggestWin.biggestWinMargin > 0) {
    rows.push({ label: "Plus grande victoire", display: biggestWin.biggestWinDetails, season: biggestWin.seasonNumber, isNew: biggestWin.seasonNumber === cur.seasonNumber });
  }

  const worstDefeat = history.reduce((b, s) => s.biggestLossMargin > b.biggestLossMargin ? s : b);
  if (worstDefeat.biggestLossMargin > 0) {
    rows.push({ label: "Pire défaite", display: worstDefeat.biggestLossDetails, season: worstDefeat.seasonNumber, isNew: worstDefeat.seasonNumber === cur.seasonNumber });
  }

  return rows;
}

export function RecapScreen({
  myTeamName,
  selectedPlayers,
  seasonWins,
  seasonDraws,
  seasonLosses,
  seasonPoints,
  myFinalPosition,
  playoffSummary,
  seasonHistory,
  onReplay,
  onNextSeason,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  const sortedSlots = sortByPosition(selectedPlayers);

  const bestPlayer = selectedPlayers.length
    ? selectedPlayers.reduce((b, p) => (p.rating > b.rating ? p : b), selectedPlayers[0])
    : null;

  const isChampion = playoffSummary.outcome === "champion";

  const outcomeSub =
    playoffSummary.outcome === "champion" ? "Bouclier de Brennus" :
    playoffSummary.outcome === "finaliste" ? "Finaliste · Top 14" :
    playoffSummary.outcome === "eliminé" ? `Éliminé en ${playoffSummary.eliminatedIn ?? "play-offs"}` :
    "Saison régulière";

  const recordRows = buildRecordRows(seasonHistory);
  const hasNewRecord = recordRows.some(r => r.isNew);

  async function handleShare() {
    if (!cardRef.current || isSharing) return;
    setIsSharing(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0A0A0A",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "mon-xv-26-0.png", { type: "image/png" });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Mon XV · ${myTeamName} · 26-0`,
            text: `J'ai construit mon XV de légende sur 26-0 !`,
          }).catch(() => {});
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "mon-xv-26-0.png";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <main
      className="bg-c-bg text-c-fg flex flex-col"
      style={{ height: "100svh" }}
    >
      {/* Scrollable area (contains shareable card + records) */}
      <div ref={cardRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-c-bg">

        {/* Brand bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
          <span className="font-black text-2xl tracking-tighter">
            26<span className="text-c-gold">-</span>0
          </span>
          <span className="text-c-gold text-[8px] uppercase tracking-[0.45em] font-bold">
            Top 14 · 2025-26
          </span>
        </div>

        {/* Result hero */}
        <div className="px-6 pb-5 flex-shrink-0 border-b border-[var(--c-border-lo)]">
          {isChampion && <div className="w-10 h-0.5 bg-c-gold mb-3" />}
          <p
            className={`font-black leading-none tracking-tighter ${isChampion ? "text-c-gold" : "text-c-fg"}`}
            style={{ fontSize: "clamp(2.8rem, 17vw, 5rem)" }}
          >
            {OUTCOME_LABEL[playoffSummary.outcome]}
          </p>
          <p className="text-c-fg font-black text-base tracking-tight mt-2">{myTeamName}</p>
          <p className="text-[var(--c-muted)] text-[9px] uppercase tracking-[0.3em] mt-0.5">{outcomeSub}</p>
        </div>

        {/* Stats bar */}
        <div className="flex items-center px-6 py-3 gap-4 border-b border-[var(--c-border-lo)] flex-shrink-0">
          <div className="text-center">
            <p className={`font-black text-xl tabular-nums ${isChampion ? "text-c-gold" : "text-c-fg"}`}>
              {myFinalPosition}
            </p>
            <p className="text-[var(--c-faint)] text-[6px] uppercase tracking-wide mt-0.5">Rang</p>
          </div>

          <div className="w-px h-7 bg-[var(--c-border)]" />

          <div className="flex gap-4">
            {[{ l: "V", v: seasonWins }, { l: "N", v: seasonDraws }, { l: "D", v: seasonLosses }].map(({ l, v }) => (
              <div key={l} className="text-center">
                <p className="text-c-fg font-black text-xl tabular-nums">{v}</p>
                <p className="text-[var(--c-faint)] text-[6px] uppercase mt-0.5">{l}</p>
              </div>
            ))}
          </div>

          <div className="w-px h-7 bg-[var(--c-border)]" />

          <div className="text-center">
            <p className="text-c-gold font-black text-2xl tabular-nums">{seasonPoints}</p>
            <p className="text-[var(--c-faint)] text-[6px] uppercase tracking-wide mt-0.5">Pts</p>
          </div>

          {bestPlayer && (
            <>
              <div className="w-px h-7 bg-[var(--c-border)]" />
              <div className="min-w-0 flex-1">
                <p className="text-c-gold font-black text-[11px] leading-tight truncate">
                  {bestPlayer.name.split(" ").at(-1)}
                </p>
                <p className="text-[var(--c-faint)] text-[6px] uppercase tracking-wide mt-0.5">
                  MVP · {bestPlayer.rating}
                </p>
              </div>
            </>
          )}
        </div>

        {/* XV grid */}
        <div className="flex-shrink-0 px-5 py-3">
          <p className="text-[var(--c-faint)] uppercase tracking-[0.4em] text-[7px] font-bold mb-2">
            Mon XV
          </p>
          <div className="grid grid-cols-2 gap-x-4">
            {sortedSlots.map(({ player, jersey }) => {
              const tier = player.rating >= 90 ? 3 : player.rating >= 85 ? 2 : 1;
              const badgeBg = tier === 3 ? "#FFFFFF" : tier === 2 ? "#D4AF37" : "#0D0D0D";
              const badgeFg = tier === 2 ? "#000000" : "#D4AF37";
              const badgeBorder = tier === 3 ? "2px solid #D4AF37" : "none";
              const lastName = player.name.split(" ").filter(Boolean).at(-1) ?? player.name;

              return (
                <div
                  key={jersey}
                  className="flex items-center gap-2 py-[7px] border-b border-[var(--c-border-lo)]"
                >
                  <span className="text-[var(--c-faint)] text-[8px] font-black w-4 text-right tabular-nums shrink-0">
                    {jersey}
                  </span>
                  <span className="flex-1 font-black text-[11px] truncate uppercase tracking-wide text-c-fg min-w-0 leading-normal">
                    {lastName}
                  </span>
                  <span
                    style={{
                      background: badgeBg,
                      color: badgeFg,
                      border: badgeBorder,
                      padding: "1px 5px",
                      fontSize: 8,
                      fontWeight: 900,
                      lineHeight: "14px",
                      minWidth: 24,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {player.rating}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Records section */}
        {recordRows.length > 0 && (
          <div className="flex-shrink-0 px-5 pb-4 pt-3 border-t border-[var(--c-border-lo)]">
            <div className="flex items-center gap-3 mb-3">
              <p className="text-[var(--c-faint)] uppercase tracking-[0.4em] text-[7px] font-bold">
                Records du club
              </p>
              {hasNewRecord && (
                <span className="text-c-gold text-[7px] uppercase tracking-[0.2em] font-bold border border-c-gold/50 px-1.5 py-0.5">
                  Nouveau record !
                </span>
              )}
            </div>
            <div className="flex flex-col">
              {recordRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between py-[7px] border-b border-[var(--c-border-lo)]"
                  style={row.isNew ? { background: "rgba(212,175,55,0.06)" } : undefined}
                >
                  <span
                    className="text-[9px] uppercase tracking-wide font-bold mr-2 shrink-0"
                    style={{ color: row.isNew ? "#D4AF37" : "var(--c-muted)" }}
                  >
                    {row.label}
                    {row.isNew && (
                      <span className="ml-1 text-[7px] font-black">★</span>
                    )}
                  </span>
                  <span
                    className="text-[10px] font-black text-right truncate min-w-0"
                    style={{ color: row.isNew ? "#D4AF37" : "var(--c-fg)" }}
                  >
                    {row.display}
                    {row.season !== null && (
                      <span
                        className="ml-1 font-normal"
                        style={{ fontSize: 8, color: row.isNew ? "rgba(212,175,55,0.7)" : "var(--c-faint)" }}
                      >
                        · S{row.season}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Action buttons — outside shareable area, pinned at bottom */}
      <div className="flex-shrink-0 px-5 pb-6 pt-3 space-y-2 border-t border-[var(--c-border-lo)]">
        <button
          onClick={onNextSeason}
          className="w-full bg-c-gold hover:bg-[#F5F0E8] text-black font-black uppercase tracking-[0.2em] text-xs py-4 transition-colors"
        >
          Saison suivante →
        </button>
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="w-full border border-c-gold/50 hover:border-c-gold disabled:opacity-30 disabled:cursor-not-allowed text-c-gold font-black uppercase tracking-[0.2em] text-xs py-3 transition-colors"
        >
          {isSharing ? "Génération…" : "Partager mon XV →"}
        </button>
        <button
          onClick={onReplay}
          className="w-full border border-[var(--c-border)] hover:border-c-gold/50 text-[var(--c-muted)] hover:text-c-fg font-black uppercase tracking-[0.2em] text-xs py-3 transition-colors"
        >
          Retour au menu principal
        </button>
      </div>

    </main>
  );
}
