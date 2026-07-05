"use client";

import { useRef, useState } from "react";
import type { Player, PlayoffSummary } from "@/lib/types";

interface Props {
  myTeamName: string;
  selectedPlayers: Player[];
  seasonWins: number;
  seasonDraws: number;
  seasonLosses: number;
  seasonPoints: number;
  myFinalPosition: number;
  playoffSummary: PlayoffSummary;
  onReplay: () => void;
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

export function RecapScreen({
  myTeamName,
  selectedPlayers,
  seasonWins,
  seasonDraws,
  seasonLosses,
  seasonPoints,
  myFinalPosition,
  playoffSummary,
  onReplay,
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
      className="bg-c-bg text-c-fg flex flex-col overflow-hidden"
      style={{ height: "100svh" }}
    >
      {/* Shareable card */}
      <div ref={cardRef} className="flex-1 min-h-0 flex flex-col bg-c-bg">

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
        <div className="flex-1 min-h-0 flex flex-col px-5 py-3 overflow-hidden">
          <p className="text-[var(--c-faint)] uppercase tracking-[0.4em] text-[7px] font-bold mb-2 flex-shrink-0">
            Mon XV
          </p>
          <div className="grid grid-cols-2 gap-x-4">
            {sortedSlots.map(({ player, jersey }) => {
              const tier = player.rating >= 90 ? 3 : player.rating >= 85 ? 2 : 1;
              const badgeBg = tier === 3 ? "#FFFFFF" : tier === 2 ? "#D4AF37" : "#0D0D0D";
              const badgeFg = tier === 2 ? "#000000" : "#D4AF37";
              const badgeBorder = "none";
              const lastName = player.name.split(" ").filter(Boolean).at(-1) ?? player.name;

              return (
                <div
                  key={jersey}
                  className="flex items-center gap-2 py-[7px] border-b border-[var(--c-border-lo)]"
                >
                  <span className="text-[var(--c-faint)] text-[8px] font-black w-4 text-right tabular-nums shrink-0">
                    {jersey}
                  </span>
                  <span className="flex-1 font-black text-[11px] truncate uppercase tracking-wide text-c-fg min-w-0">
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

      </div>

      {/* Action buttons — outside shareable area */}
      <div className="flex-shrink-0 px-5 pb-6 pt-3 space-y-2 border-t border-[var(--c-border-lo)]">
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="w-full bg-c-gold hover:bg-[#F5F0E8] disabled:bg-c-fg/10 disabled:text-[var(--c-faint)] disabled:cursor-not-allowed text-black font-black uppercase tracking-[0.2em] text-xs py-4 transition-colors"
        >
          {isSharing ? "Génération…" : "Partager mon XV →"}
        </button>
        <button
          onClick={onReplay}
          className="w-full border border-[var(--c-border)] hover:border-c-gold/50 text-[var(--c-muted)] hover:text-c-fg font-black uppercase tracking-[0.2em] text-xs py-3 transition-colors"
        >
          ↺ Rejouer
        </button>
      </div>

    </main>
  );
}
