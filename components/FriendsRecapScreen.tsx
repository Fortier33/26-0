"use client";

import { useMemo } from "react";
import type { FriendsTeam, Player } from "@/lib/types";

const S = {
  bg:    "#04060F",
  text:  "#E8EDF5",
  muted: "rgba(232,237,245,0.40)",
  faint: "rgba(232,237,245,0.08)",
  gold:  "#D4AF37",
};

type TeamStat = FriendsTeam & { avg: number };
type PlayerWithTeam = Player & { team: FriendsTeam };

function abbreviateName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName.toUpperCase();
  return `${parts[0][0].toUpperCase()}.${parts.slice(1).join(" ").toUpperCase()}`;
}

interface Props {
  teams: FriendsTeam[];
  onContinue: () => void;
}

export function FriendsRecapScreen({ teams, onContinue }: Props) {
  const teamStats = useMemo<TeamStat[]>(() =>
    teams
      .map(t => ({
        ...t,
        avg: t.players.length > 0
          ? t.players.reduce((s, p) => s + p.rating, 0) / t.players.length
          : 0,
      }))
      .sort((a, b) => b.avg - a.avg),
    [teams],
  );

  const allPlayers = useMemo<PlayerWithTeam[]>(() =>
    teams.flatMap(t => t.players.map(p => ({ ...p, team: t }))),
    [teams],
  );

  const best  = useMemo(() => [...allPlayers].sort((a, b) => b.rating - a.rating)[0], [allPlayers]);
  const worst = useMemo(() => [...allPlayers].sort((a, b) => a.rating - b.rating)[0], [allPlayers]);

  const favorite  = teamStats[0];
  const secondAvg = teamStats[1]?.avg ?? favorite.avg;
  const lead      = favorite.avg - secondAvg;

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
      <header
        style={{
          flexShrink: 0,
          padding: "28px 20px 20px",
          borderBottom: `1px solid ${S.faint}`,
        }}
      >
        <p
          style={{
            fontSize: 9, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.35em",
            color: S.muted, marginBottom: 4,
          }}
        >
          Playoffs entre amis · Draft
        </p>
        <p
          style={{
            fontSize: 20, fontWeight: 900,
            textTransform: "uppercase", letterSpacing: "0.03em",
          }}
        >
          Récap de la Draft
        </p>
        <p style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>
          {teams.length} équipes · {teams.length * 15} joueurs sélectionnés
        </p>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>

        {/* Favourite team */}
        <div
          style={{
            marginBottom: 16,
            padding: "18px 18px",
            background: favorite.colorHex + "12",
            border: `1px solid ${favorite.colorHex}40`,
          }}
        >
          <p
            style={{
              fontSize: 8, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.5em",
              color: favorite.colorHex + "AA", marginBottom: 10,
            }}
          >
            Équipe favorite
          </p>
          <p
            style={{
              fontSize: 30, fontWeight: 900,
              textTransform: "uppercase",
              color: favorite.colorHex,
              lineHeight: 1.05, marginBottom: 8,
            }}
          >
            {favorite.name}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: favorite.colorHex }}>
              {favorite.avg.toFixed(1)}
            </span>
            <span style={{ fontSize: 11, color: S.muted }}>
              de moyenne
              {lead > 0 && (
                <span style={{ color: favorite.colorHex, marginLeft: 6 }}>
                  (+{lead.toFixed(1)} sur le 2e)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Best / Worst player */}
        <div
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 10, marginBottom: 20,
          }}
        >
          <PlayerStatCard label="Meilleur joueur" player={best} />
          <PlayerStatCard label="Pire joueur"     player={worst} />
        </div>

        {/* Team rosters */}
        <p
          style={{
            fontSize: 9, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.35em",
            color: S.muted, marginBottom: 10,
          }}
        >
          Effectifs · classement par moyenne
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 8 }}>
          {teamStats.map((team, rank) => (
            <TeamRoster key={team.id} team={team} rank={rank} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 20px 28px",
          borderTop: `1px solid ${S.faint}`,
        }}
      >
        <button
          onClick={onContinue}
          style={{
            width: "100%", padding: "16px",
            background: "#4AD98A", border: "none",
            color: "#04060F", fontWeight: 900, fontSize: 13,
            textTransform: "uppercase", letterSpacing: "0.22em",
            cursor: "pointer",
          }}
        >
          Que les meilleurs gagnent ! →
        </button>
      </div>
    </main>
  );
}

/* ── Player stat card ──────────────────────────────────────── */

function PlayerStatCard({ label, player }: { label: string; player: PlayerWithTeam }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        border: `1px solid ${player.team.colorHex}30`,
        background: player.team.colorHex + "08",
      }}
    >
      <p
        style={{
          fontSize: 8, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.35em",
          color: S.muted, marginBottom: 8,
        }}
      >
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
        <div
          style={{
            width: 6, height: 6, borderRadius: "50%",
            background: player.team.colorHex, flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 8, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.15em",
            color: player.team.colorHex,
          }}
        >
          {player.team.name}
        </span>
      </div>
      <p
        style={{
          fontSize: 12, fontWeight: 900,
          color: S.text, textTransform: "uppercase",
          lineHeight: 1.2,
        }}
      >
        {abbreviateName(player.name)}
      </p>
      <p style={{ fontSize: 9, color: S.muted, textTransform: "uppercase", marginTop: 3 }}>
        {player.position}
      </p>
      <p style={{ fontSize: 24, fontWeight: 900, color: S.gold, marginTop: 6 }}>
        {player.rating}
      </p>
    </div>
  );
}

/* ── Team roster ───────────────────────────────────────────── */

function TeamRoster({ team, rank }: { team: TeamStat; rank: number }) {
  const sorted = useMemo(
    () => [...team.players].sort((a, b) => b.rating - a.rating),
    [team.players],
  );

  return (
    <div style={{ border: `1px solid ${team.colorHex}30` }}>
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          background: team.colorHex + "0E",
          borderBottom: `1px solid ${team.colorHex}30`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              fontSize: 12, fontWeight: 900,
              textTransform: "uppercase", color: team.colorHex,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {rank === 0 && (
              <span
                style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: "0.2em",
                  padding: "2px 6px",
                  background: team.colorHex + "25",
                  border: `1px solid ${team.colorHex}60`,
                  color: team.colorHex,
                }}
              >
                FAVORI
              </span>
            )}
            {team.name}
          </p>
          <p style={{ fontSize: 9, color: S.muted, marginTop: 2 }}>
            #{rank + 1} · {team.players.length} joueurs
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 20, fontWeight: 900, color: team.colorHex }}>
            {team.avg.toFixed(1)}
          </p>
          <p
            style={{
              fontSize: 8, color: S.muted,
              textTransform: "uppercase", letterSpacing: "0.2em",
            }}
          >
            moy.
          </p>
        </div>
      </div>

      {/* Player list */}
      <div>
        {sorted.map((player, i) => (
          <div
            key={player.name}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "7px 14px",
              borderBottom: i < sorted.length - 1 ? `1px solid ${S.faint}` : "none",
              background: i === 0 ? team.colorHex + "07" : "transparent",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: S.text }}>
                {abbreviateName(player.name)}
              </span>
              <span
                style={{
                  fontSize: 8, color: S.muted,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}
              >
                {player.position}
              </span>
            </div>
            <span
              style={{
                fontSize: 12, fontWeight: 900,
                color: i === 0 ? team.colorHex : S.gold,
              }}
            >
              {player.rating}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
