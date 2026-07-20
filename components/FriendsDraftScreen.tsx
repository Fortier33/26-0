"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { clubs, MAX_BY_POSITION } from "@/lib/data";
import type { FriendsTeam, Player } from "@/lib/types";

const SPIN_POOL = [...new Set(
  Object.keys(clubs).map(k => k.replace(/\s\d{2}-\d{2}$/, ""))
)];

function abbreviateName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName.toUpperCase();
  return `${parts[0][0].toUpperCase()}.${parts.slice(1).join(" ").toUpperCase()}`;
}

const PICKS_PER_TEAM = 15;

function buildSnakeOrder(n: number): number[] {
  const order: number[] = [];
  for (let round = 0; round < PICKS_PER_TEAM; round++) {
    const asc = round % 2 === 0;
    for (let i = 0; i < n; i++) order.push(asc ? i : n - 1 - i);
  }
  return order;
}

function randomClubKey(exclude?: string): string {
  const keys = Object.keys(clubs).filter(k => k !== exclude);
  return keys[Math.floor(Math.random() * keys.length)];
}

interface Props {
  teams: FriendsTeam[];
  onComplete: (teams: FriendsTeam[]) => void;
}

export function FriendsDraftScreen({ teams: initialTeams, onComplete }: Props) {
  const n = initialTeams.length;
  const pickOrder = useMemo(() => buildSnakeOrder(n), [n]);
  const totalPicks = n * PICKS_PER_TEAM;

  const [pickNum, setPickNum] = useState(0);
  const [teams, setTeams] = useState<FriendsTeam[]>(() =>
    initialTeams.map(t => ({ ...t, players: [] }))
  );
  const [clubKey, setClubKey] = useState(() => randomClubKey());
  const [awaitingNext, setAwaitingNext] = useState(false);

  const currentTeamIdx = pickOrder[pickNum];
  const currentTeam = teams[currentTeamIdx];

  // All names already drafted by any team
  const pickedNames = useMemo(
    () => new Set(teams.flatMap(t => t.players.map(p => p.name))),
    [teams]
  );

  // Players from current club not yet taken by anyone
  const clubPlayers: Player[] = useMemo(
    () => (clubs[clubKey] ?? []).filter(p => !pickedNames.has(p.name)),
    [clubKey, pickedNames]
  );

  // Auto-reroll if no available players in this club
  useEffect(() => {
    if (!awaitingNext && clubPlayers.length === 0) {
      setClubKey(k => randomClubKey(k));
    }
  }, [clubPlayers.length, awaitingNext]);

  // Club name spin animation (mirrors DraftScreen)
  const season = clubKey.match(/\s(\d{2}-\d{2})$/)?.[1] ?? null;
  const clubBaseName = clubKey.replace(/\s\d{2}-\d{2}$/, "");
  const [spinName, setSpinName] = useState(clubBaseName);
  const [isSpinning, setIsSpinning] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (awaitingNext) return;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const target = clubKey.replace(/\s\d{2}-\d{2}$/, "");
    const pool = SPIN_POOL.filter(n => n !== target);

    setIsSpinning(true);
    const schedule: [number, string | null][] = [];
    let t = 0;
    for (let i = 0; i < 10; i++) { t += 65;  schedule.push([t, pool[Math.floor(Math.random() * pool.length)]]); }
    for (let i = 0; i < 4;  i++) { t += 120; schedule.push([t, pool[Math.floor(Math.random() * pool.length)]]); }
    for (let i = 0; i < 3;  i++) { t += 200; schedule.push([t, pool[Math.floor(Math.random() * pool.length)]]); }
    t += 220;
    schedule.push([t, null]);

    for (const [delay, name] of schedule) {
      const id = setTimeout(() => {
        if (name === null) { setSpinName(target); setIsSpinning(false); }
        else setSpinName(name);
      }, delay);
      timersRef.current.push(id);
    }
    return () => timersRef.current.forEach(clearTimeout);
  }, [clubKey, awaitingNext]);

  function handlePick(player: Player) {
    const next = teams.map((t, i) =>
      i === currentTeamIdx ? { ...t, players: [...t.players, player] } : t
    );
    setTeams(next);

    const nextPick = pickNum + 1;
    if (nextPick >= totalPicks) {
      onComplete(next);
      return;
    }

    setPickNum(nextPick);
    setAwaitingNext(true);
  }

  function handleNextPlayer() {
    setClubKey(k => randomClubKey(k));
    setAwaitingNext(false);
  }

  const teamPickNum = currentTeam.players.length + 1;

  return (
    <main className="h-screen bg-c-bg text-c-fg flex flex-col overflow-hidden">

      {/* Colored team header */}
      <header
        className="flex-shrink-0 px-5 py-4 flex items-center justify-between border-b border-[var(--c-border)]"
        style={{ background: currentTeam.colorHex + "12", borderBottomColor: currentTeam.colorHex + "55" }}
      >
        <div>
          <p
            className="uppercase tracking-[0.35em] text-[9px] font-bold mb-1"
            style={{ color: currentTeam.colorHex + "99" }}
          >
            Playoffs entre amis · Draft
          </p>
          <p className="font-black text-lg uppercase" style={{ color: currentTeam.colorHex }}>
            {currentTeam.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[var(--c-muted)] uppercase tracking-wider text-[8px] mb-0.5">
            Joueur
          </p>
          <p className="font-black text-xl" style={{ color: currentTeam.colorHex }}>
            {teamPickNum}<span className="text-sm opacity-50">/15</span>
          </p>
        </div>
      </header>

      {/* Club + player panel */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

        {/* Club name + reroll */}
        {!awaitingNext && (
          <div className="p-5 border-b border-[var(--c-border)] flex-shrink-0">
            <div>
              <p className="text-c-gold uppercase tracking-[0.35em] text-[9px] font-bold mb-1">Club tiré</p>
              <h2 className={`text-lg font-black leading-tight transition-colors duration-150 ${isSpinning ? "text-c-gold/60" : "text-c-fg"}`}>
                {spinName}
              </h2>
              {!isSpinning && season && (
                <p className="text-c-gold text-[10px] italic mt-0.5">Saison {season}</p>
              )}
            </div>
          </div>
        )}

        {/* Player list or handoff screen */}
        {awaitingNext ? (
          <div className="p-5 flex-1 flex flex-col justify-center">
            <div className="border-l-2 pl-3 mb-6" style={{ borderColor: currentTeam.colorHex }}>
              <p
                className="uppercase tracking-[0.3em] text-[8px] font-bold mb-2"
                style={{ color: currentTeam.colorHex }}
              >
                Suivant
              </p>
              <p className="font-black text-2xl uppercase" style={{ color: currentTeam.colorHex }}>
                {currentTeam.name}
              </p>
              <p className="text-[var(--c-muted)] text-[11px] mt-1">
                Joueur {currentTeam.players.length + 1}/15
              </p>
            </div>
            <button
              onClick={handleNextPlayer}
              style={{
                width: "100%", padding: "16px", border: "none",
                background: "#4AD98A", color: "#04060F",
                fontWeight: 900, fontSize: 13,
                textTransform: "uppercase", letterSpacing: "0.22em",
                cursor: "pointer",
              }}
            >
              C&apos;est à moi →
            </button>
          </div>
        ) : isSpinning ? null : (
          <>
            <div className="px-5 py-3 border-b border-[var(--c-border)] flex-shrink-0">
              <p className="text-[var(--c-muted)] uppercase tracking-[0.35em] text-[9px] font-bold">
                Choisis un joueur
              </p>
            </div>
            <div className="overflow-y-scroll flex-1 min-h-0">
              {clubPlayers.map(player => {
                const count = currentTeam.players.filter(p => p.position === player.position).length;
                const max = MAX_BY_POSITION[player.position] ?? 1;
                const full = count >= max;
                return (
                  <button
                    key={player.name}
                    disabled={full}
                    onClick={() => !full && handlePick(player)}
                    className={`w-full flex items-center justify-between px-5 py-2.5 border-b border-[var(--c-border-lo)] transition-colors ${
                      full ? "opacity-25 cursor-not-allowed" : "hover:bg-[var(--c-ghost)] active:bg-c-fg/10"
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-black text-xs text-c-fg">{abbreviateName(player.name)}</p>
                      <p className="text-[9px] uppercase tracking-wider text-[var(--c-muted)] mt-0.5">
                        {player.position}
                      </p>
                    </div>
                    <span className={`font-black text-base ml-4 ${full ? "text-[var(--c-faint)]" : "text-c-gold"}`}>
                      {player.rating}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Multi-team progress */}
      <div className="flex-shrink-0 p-5 border-t border-[var(--c-border)]">
        <div className="flex gap-3">
          {teams.map((team, i) => (
            <div key={i} className="flex-1">
              <div className="w-full h-0.5 bg-c-fg/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(team.players.length / 15) * 100}%`,
                    background: team.colorHex,
                  }}
                />
              </div>
              <p
                className="text-[8px] font-black mt-1.5 text-center"
                style={{ color: i === currentTeamIdx ? team.colorHex : "var(--c-faint)" }}
              >
                {team.players.length}/15
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
