"use client";

import { useState } from "react";
import { FRIENDS_COLORS } from "@/lib/friends";
import type { FriendsTeam } from "@/lib/types";

const S = {
  bg:    "#04060F",
  text:  "#E8EDF5",
  muted: "rgba(232,237,245,0.4)",
  faint: "rgba(232,237,245,0.12)",
};

const BRACKET_DESC: Record<number, string> = {
  2: "Seeds 1 & 2 — directs en demi-finale. 4 bots en quart.",
  3: "Seeds 3, 4, 5 — en quart de finale. 2 bots tête de série en demi.",
  4: "Seeds 3, 4, 5, 6 — tous en quart. 2 bots favoris en demi-finale.",
  5: "1 équipe directe en demi (seed 1). 4 équipes en quart. 1 bot.",
  6: "Les 6 places du bracket — aucun bot.",
};

interface Props {
  onStart: (teams: FriendsTeam[]) => void;
  onBack: () => void;
}

export function FriendsSetupScreen({ onStart, onBack }: Props) {
  const [playerCount, setPlayerCount] = useState(3);
  const [names, setNames] = useState<string[]>(["", "", "", "", "", ""]);

  function handleStart() {
    const teams: FriendsTeam[] = Array.from({ length: playerCount }, (_, i) => ({
      id: i,
      name: names[i].trim() || `Équipe ${i + 1}`,
      colorHex: FRIENDS_COLORS[i].hex,
      players: [],
      isBot: false,
    }));
    onStart(teams);
  }

  return (
    <main
      style={{
        minHeight: "100svh",
        background: S.bg,
        color: S.text,
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 36 }}>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none",
            color: S.muted, cursor: "pointer", fontSize: 20, padding: 0, lineHeight: 1,
          }}
        >
          ←
        </button>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em", color: S.muted, marginBottom: 2 }}>
            Nouveau mode
          </p>
          <p style={{ fontSize: 17, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.03em" }}>
            Playoffs entre amis
          </p>
        </div>
      </div>

      {/* Player count */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em", color: S.muted, marginBottom: 12 }}>
          Nombre de joueurs
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {[2, 3, 4, 5, 6].map(n => {
            const color = FRIENDS_COLORS[n - 2]?.hex ?? "#4A90D9";
            const active = n === playerCount;
            return (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                style={{
                  width: 52, height: 52,
                  border: `1px solid ${active ? color : S.faint}`,
                  background: active ? color + "1A" : "transparent",
                  color: active ? color : S.muted,
                  fontWeight: 900, fontSize: 17,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      {/* Team name inputs */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em", color: S.muted, marginBottom: 4 }}>
          Noms des équipes
        </p>
        {Array.from({ length: playerCount }, (_, i) => {
          const color = FRIENDS_COLORS[i].hex;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: color, flexShrink: 0,
                }}
              />
              <input
                type="text"
                value={names[i]}
                onChange={e => {
                  const next = [...names];
                  next[i] = e.target.value;
                  setNames(next);
                }}
                placeholder={`Équipe ${i + 1}`}
                maxLength={20}
                style={{
                  flex: 1, padding: "13px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${S.faint}`,
                  color: S.text, fontSize: 14, fontWeight: 700,
                  outline: "none", fontFamily: "inherit",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = color + "66")}
                onBlur={e => (e.currentTarget.style.borderColor = S.faint)}
              />
            </div>
          );
        })}
      </div>

      {/* Bracket preview */}
      <div
        style={{
          marginBottom: 28, padding: "14px 16px",
          border: `1px solid ${S.faint}`,
          background: "rgba(255,255,255,0.015)",
        }}
      >
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em", color: S.muted, marginBottom: 8 }}>
          Format bracket
        </p>
        <p style={{ fontSize: 12, color: "rgba(232,237,245,0.55)", lineHeight: 1.7 }}>
          {BRACKET_DESC[playerCount]}
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={handleStart}
        style={{
          width: "100%", padding: "16px",
          background: "#4AD98A", border: "none",
          color: "#04060F", fontWeight: 900, fontSize: 13,
          textTransform: "uppercase", letterSpacing: "0.22em",
          cursor: "pointer",
        }}
      >
        Lancer la Draft →
      </button>
    </main>
  );
}
