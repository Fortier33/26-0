"use client";

import { useState, useEffect, useRef } from "react";
import type { Player } from "@/lib/types";

/* ── Palette ──────────────────────────────────────────────────────── */
const S = {
  bg:       "#04060F",
  text:     "#E8EDF5",
  muted:    "rgba(143,175,200,0.65)",
  faint:    "rgba(143,175,200,0.30)",
  accent:   "#8FAFC8",
  border:   "rgba(143,175,200,0.15)",
  borderHi: "rgba(143,175,200,0.45)",
};

function tier(rating: number) {
  if (rating >= 90) return 3;
  if (rating >= 85) return 2;
  return 1;
}

/* ── CAREER_SLOTS order (matches selectedPlayers array indices) ───── */
// "Pilier gauche","Talonneur","Pilier droit",
// "Deuxième ligne","Deuxième ligne",
// "Troisième ligne","Troisième ligne","Numéro 8",
// "Demi de mêlée","Ouvreur",
// "Centre","Centre","Ailier","Ailier","Arrière"

// Maps jersey #1..#15 display position → index in selectedPlayers
// Standard rugby numbering: 11=ailier gauche, 12=centre, 13=centre, 14=ailier droit, 15=arrière
const JERSEY_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 10, 11, 13, 14];

/* ── Component ────────────────────────────────────────────────────── */
interface Props {
  myTeamName: string;
  selectedPlayers: Player[];
  onComplete: () => void;
}

export function RevealScreen({ myTeamName, selectedPlayers, onComplete }: Props) {
  const [revealedCount, setRevealedCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const allRevealed = revealedCount >= 15;

  /* Auto-reveal: 500 ms initial pause, then 140 ms per player */
  useEffect(() => {
    if (revealedCount >= 15) return;
    const delay = revealedCount === 0 ? 500 : 140;
    const id = setTimeout(() => setRevealedCount((n) => n + 1), delay);
    return () => clearTimeout(id);
  }, [revealedCount]);

  /* Scroll newly revealed row into view */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [revealedCount]);

  const sortedEntries = JERSEY_ORDER.map((idx, jerseyIdx) => ({
    jersey: jerseyIdx + 1,
    player: selectedPlayers[idx] ?? null,
  }));

  const avgRating =
    selectedPlayers.length > 0
      ? Math.round(
          selectedPlayers.reduce((s, p) => s + p.rating, 0) /
            selectedPlayers.length
        )
      : 0;

  const bestPlayer =
    selectedPlayers.length > 0
      ? selectedPlayers.reduce((best, p) =>
          p.rating > best.rating ? p : best
        )
      : null;

  const bestT = bestPlayer ? tier(bestPlayer.rating) : 1;

  return (
    <main
      style={{
        minHeight: "100svh",
        background: S.bg,
        color: S.text,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px 8px",
        }}
      >
        <p
          style={{
            fontWeight: 900,
            fontSize: 18,
            letterSpacing: "-0.02em",
            color: "#D4AF37",
          }}
        >
          26<span style={{ opacity: 0.4 }}>-</span>0
        </p>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: 8,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.35em",
              color: S.faint,
              marginBottom: 2,
            }}
          >
            Mode Carrière
          </p>
          <p
            style={{
              fontSize: 12,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {myTeamName}
          </p>
        </div>
      </div>

      {/* Subtitle */}
      <div style={{ flexShrink: 0, padding: "0 20px 10px" }}>
        <p
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.38em",
            color: S.faint,
          }}
        >
          Ton effectif de départ
        </p>
      </div>

      {/* Player list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
        {sortedEntries.slice(0, revealedCount).map(({ jersey, player }, i) => {
          const t = player ? tier(player.rating) : 1;
          const isLegend = t === 3;
          const isNew = i === revealedCount - 1;
          const lastName = player?.name.split(" ").at(-1) ?? "—";
          const firstName =
            player?.name.split(" ").slice(0, -1).join(" ") ?? "";

          return (
            <div
              key={i}
              ref={isNew ? bottomRef : null}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: `1px solid ${S.border}`,
                background: isLegend
                  ? "rgba(143,175,200,0.04)"
                  : "transparent",
                ...(isNew
                  ? { animation: "slideIn 0.22s ease forwards" }
                  : { opacity: 1, transform: "translateX(0)" }),
              }}
            >
              {/* Jersey number */}
              <span
                style={{
                  width: 22,
                  flexShrink: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  color: S.muted,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {jersey}
              </span>

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                  }}
                >
                  {lastName}
                </span>
                {firstName && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 500,
                      opacity: 0.4,
                      marginLeft: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {firstName}
                  </span>
                )}
              </div>

              {/* LGD badge */}
              {isLegend && (
                <span
                  style={{
                    flexShrink: 0,
                    marginRight: 10,
                    fontSize: 7,
                    fontWeight: 900,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: S.accent,
                    border: `1px solid ${S.accent}`,
                    padding: "2px 5px",
                  }}
                >
                  LGD
                </span>
              )}

              {/* Rating */}
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 17,
                  fontWeight: 900,
                  color: isLegend ? "#D4AF37" : S.accent,
                }}
              >
                {player?.rating}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats row — appears after full reveal */}
      {allRevealed && (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "16px 20px",
            borderTop: `1px solid ${S.border}`,
            animation: "fadeUp 0.35s ease forwards",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 8,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.35em",
                color: S.faint,
                marginBottom: 4,
              }}
            >
              Moyenne équipe
            </p>
            <p
              style={{
                fontSize: 34,
                fontWeight: 900,
                lineHeight: 1,
                color: S.accent,
              }}
            >
              {avgRating}
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontSize: 8,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.35em",
                color: S.faint,
                marginBottom: 4,
              }}
            >
              Meilleur joueur
            </p>
            <p
              style={{
                fontSize: 13,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              {bestPlayer?.name.split(" ").at(-1)}
            </p>
            <p
              style={{
                fontSize: 26,
                fontWeight: 900,
                lineHeight: 1,
                color: bestT === 3 ? "#D4AF37" : S.accent,
              }}
            >
              {bestPlayer?.rating}
            </p>
          </div>
        </div>
      )}

      {/* CTA */}
      {allRevealed && (
        <div
          style={{
            flexShrink: 0,
            padding: "0 20px 28px",
            animation: "fadeUp 0.35s ease forwards",
          }}
        >
          <button
            onClick={onComplete}
            style={{
              width: "100%",
              padding: "16px",
              background: S.accent,
              border: "none",
              color: S.bg,
              fontWeight: 900,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              cursor: "pointer",
            }}
          >
            Lancer la Saison →
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
