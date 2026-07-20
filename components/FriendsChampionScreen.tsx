"use client";

import { useEffect, useState } from "react";
import type { FriendsBracket, FriendsBracketMatch, FriendsTeam } from "@/lib/types";

const S = {
  bg:    "#04060F",
  text:  "#E8EDF5",
  muted: "rgba(232,237,245,0.40)",
  faint: "rgba(232,237,245,0.08)",
};

const ROUNDS = [
  { label: "Quarts de finale", ids: ["qf1", "qf2"] },
  { label: "Demi-finales",     ids: ["sf1",  "sf2"] },
  { label: "Finale",           ids: ["final"]        },
];

interface Props {
  champion: FriendsTeam;
  bracket: FriendsBracket;
  onReplay: () => void;
  onHome: () => void;
}

export function FriendsChampionScreen({ champion, bracket, onReplay, onHome }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

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
      {/* Champion banner */}
      <div
        style={{
          flexShrink: 0,
          padding: "32px 20px 28px",
          background: champion.colorHex + "0E",
          borderBottom: `1px solid ${champion.colorHex}30`,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        <p
          style={{
            fontSize: 9, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.5em",
            color: champion.colorHex + "AA", marginBottom: 14,
          }}
        >
          Bouclier de Brennus · Champion
        </p>

        {/* Color dots */}
        <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: champion.colorHex,
                opacity: 1 - i * 0.15,
              }}
            />
          ))}
        </div>

        <p
          style={{
            fontSize: 36, fontWeight: 900,
            textTransform: "uppercase", letterSpacing: "0.02em",
            color: champion.colorHex, lineHeight: 1.05,
          }}
        >
          {champion.name}
        </p>
      </div>

      {/* Match results */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em", color: S.muted, marginBottom: 20 }}>
          Résultats du tournoi
        </p>

        {ROUNDS.map(({ label, ids }) => {
          const matches = ids
            .map(id => bracket.matches.find(m => m.id === id && m.winner !== null))
            .filter((m): m is FriendsBracketMatch => !!m);

          if (matches.length === 0) return null;

          return (
            <div key={label} style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: S.muted, marginBottom: 10 }}>
                {label}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {matches.map(match => (
                  <ResultRow key={match.id} match={match} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTAs */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 20px 28px",
          borderTop: `1px solid ${S.faint}`,
          display: "flex", flexDirection: "column", gap: 10,
        }}
      >
        <button
          onClick={onReplay}
          style={{
            width: "100%", padding: "16px", border: "none",
            background: "#4AD98A",
            color: "#04060F", fontWeight: 900, fontSize: 13,
            textTransform: "uppercase", letterSpacing: "0.22em",
            cursor: "pointer",
          }}
        >
          Rejouer →
        </button>
        <button
          onClick={onHome}
          style={{
            width: "100%", padding: "14px",
            background: "transparent",
            border: "1px solid rgba(232,237,245,0.15)",
            color: S.muted, fontWeight: 700, fontSize: 12,
            textTransform: "uppercase", letterSpacing: "0.18em",
            cursor: "pointer",
          }}
        >
          Accueil
        </button>
      </div>
    </main>
  );
}

/* ── Result row ──────────────────────────────────────────────── */

function ResultRow({ match }: { match: FriendsBracketMatch }) {
  const { teamA, teamB, scoreA, scoreB, winner } = match;
  if (!teamA || !teamB || winner === null) return null;

  const aWon = winner.id === teamA.id;
  const bWon = winner.id === teamB.id;

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 12px",
        border: "1px solid rgba(232,237,245,0.08)",
      }}
    >
      {/* Team A */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, opacity: aWon ? 1 : 0.28 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: teamA.colorHex, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", color: aWon ? teamA.colorHex : S.text }}>
          {teamA.name}
          {teamA.isBot && <span style={{ fontSize: 8, opacity: 0.4, marginLeft: 4 }}>BOT</span>}
        </span>
      </div>

      {/* Score */}
      <div style={{ flexShrink: 0, minWidth: 52, textAlign: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.05em" }}>
          {scoreA} – {scoreB}
        </span>
      </div>

      {/* Team B */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, opacity: bWon ? 1 : 0.28 }}>
        <span style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", color: bWon ? teamB.colorHex : S.text, textAlign: "right" }}>
          {teamB.name}
          {teamB.isBot && <span style={{ fontSize: 8, opacity: 0.4, marginLeft: 4 }}>BOT</span>}
        </span>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: teamB.colorHex, flexShrink: 0 }} />
      </div>
    </div>
  );
}
