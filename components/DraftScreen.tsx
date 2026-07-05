"use client";

import { useEffect, useRef, useState } from "react";
import { Field } from "./Field";
import { clubs, MAX_BY_POSITION } from "@/lib/data";
import type { Player } from "@/lib/types";

// Deduplicated base club names for slot machine cycling (strip season suffix)
const SPIN_POOL = [...new Set(
  Object.keys(clubs).map((n) => n.replace(/\s\d{2}-\d{2}$/, ""))
)];

function abbreviateName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0][0]}.${parts.slice(1).join(" ")}`;
}

interface DraftScreenProps {
  currentClub: string;
  players: Player[];
  selectedPlayers: Player[];
  sameClubRerolls: number;
  sameSeasonRerolls: number;
  hasOtherSeasons: boolean;
  teamRating: number;
  awaitingNewClub: boolean;
  onSelectPlayer: (player: Player) => void;
  onRerollSameClub: () => void;
  onRerollSameSeason: () => void;
  onNewClub: () => void;
  onStartSeason: () => void;
}

export function DraftScreen({
  currentClub,
  players,
  selectedPlayers,
  sameClubRerolls,
  sameSeasonRerolls,
  hasOtherSeasons,
  teamRating,
  awaitingNewClub,
  onSelectPlayer,
  onRerollSameClub,
  onRerollSameSeason,
  onNewClub,
  onStartSeason,
}: DraftScreenProps) {
  const isFull = selectedPlayers.length >= 15;
  const isDraftStarted = !awaitingNewClub || selectedPlayers.length > 0;
  const [mobileTab, setMobileTab] = useState<"players" | "field">("players");

  const progress = (selectedPlayers.length / 15) * 100;

  const filteredPlayers = players.filter(
    (p) => !selectedPlayers.some((sp) => sp.name === p.name)
  );

  return (
    <main className="h-screen bg-c-bg text-c-fg flex flex-col overflow-hidden">

      {/* Header */}
      <header className="border-b border-[var(--c-border)] px-5 lg:px-8 py-4 lg:py-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-2xl lg:text-3xl font-black tracking-tighter">
            28<span className="text-c-gold">-</span>0
          </span>
          <div className="w-px h-7 bg-[var(--c-border)]" />
          <div>
            <p className="text-c-gold uppercase tracking-[0.35em] text-[8px] lg:text-[9px] font-bold">Draft Top 14</p>
            <p className="text-c-fg font-black text-xs lg:text-sm uppercase tracking-wide">Construis ton XV de légende</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[var(--c-muted)] uppercase tracking-wider text-[8px] mb-0.5">Note</p>
          <p className="text-c-gold font-black text-xl lg:text-2xl">{teamRating || "—"}</p>
        </div>
      </header>

      {/* Mobile: tab bar */}
      <div className="lg:hidden flex border-b border-[var(--c-border)] flex-shrink-0">
        <button
          onClick={() => setMobileTab("players")}
          className={`flex-1 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
            mobileTab === "players"
              ? "text-c-gold border-b-2 border-c-gold"
              : "text-[var(--c-muted)]"
          }`}
        >
          Joueurs · {selectedPlayers.length}/15
        </button>
        <button
          onClick={() => setMobileTab("field")}
          className={`flex-1 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
            mobileTab === "field"
              ? "text-c-gold border-b-2 border-c-gold"
              : "text-[var(--c-muted)]"
          }`}
        >
          Ta compo
        </button>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:grid grid-cols-[380px_1fr] flex-1 min-h-0">
        <LeftPanel
          currentClub={currentClub}
          filteredPlayers={filteredPlayers}
          selectedPlayers={selectedPlayers}
          sameClubRerolls={sameClubRerolls}
          sameSeasonRerolls={sameSeasonRerolls}
          hasOtherSeasons={hasOtherSeasons}
          awaitingNewClub={awaitingNewClub}
          isDraftStarted={isDraftStarted}
          isFull={isFull}
          progress={progress}
          onSelectPlayer={onSelectPlayer}
          onRerollSameClub={onRerollSameClub}
          onRerollSameSeason={onRerollSameSeason}
          onNewClub={onNewClub}
          onViewCompo={() => setMobileTab("field")}
        />
        <section className="bg-[#071A0C] flex flex-col overflow-hidden border-l border-[var(--c-border)]">
          <div className="px-6 py-4 border-b border-[var(--c-border-lo)] flex-shrink-0">
            <p className="text-[var(--c-muted)] uppercase tracking-[0.35em] text-[9px] font-bold">Ta compo</p>
          </div>
          <div className="flex-1 overflow-y-auto flex items-start justify-center">
            <Field selectedPlayers={selectedPlayers} />
          </div>
          {isFull && (
            <div className="px-6 py-4 border-t border-[var(--c-border)] flex-shrink-0">
              <button
                onClick={onStartSeason}
                className="w-full bg-c-gold hover:bg-[#F5F0E8] text-black font-black uppercase tracking-[0.2em] text-sm py-4 transition-colors"
              >
                Commencer la saison →
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Mobile: players tab */}
      {mobileTab === "players" && (
        <div className="lg:hidden flex-1 min-h-0 overflow-hidden">
          <LeftPanel
            currentClub={currentClub}
            filteredPlayers={filteredPlayers}
            selectedPlayers={selectedPlayers}
            sameClubRerolls={sameClubRerolls}
            sameSeasonRerolls={sameSeasonRerolls}
            hasOtherSeasons={hasOtherSeasons}
            awaitingNewClub={awaitingNewClub}
            isDraftStarted={isDraftStarted}
            isFull={isFull}
            progress={progress}
            onSelectPlayer={onSelectPlayer}
            onRerollSameClub={onRerollSameClub}
            onRerollSameSeason={onRerollSameSeason}
            onNewClub={onNewClub}
            onViewCompo={() => setMobileTab("field")}
          />
        </div>
      )}

      {/* Mobile: field tab */}
      {mobileTab === "field" && (
        <div className="lg:hidden flex-1 bg-[#071A0C] overflow-y-auto flex flex-col items-center">
          <Field selectedPlayers={selectedPlayers} />
          {isFull && (
            <div className="w-full px-5 py-4 flex-shrink-0">
              <button
                onClick={onStartSeason}
                className="w-full bg-c-gold hover:bg-[#F5F0E8] text-black font-black uppercase tracking-[0.2em] text-sm py-4 transition-colors"
              >
                Commencer la saison →
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

interface LeftPanelProps {
  currentClub: string;
  filteredPlayers: Player[];
  selectedPlayers: Player[];
  sameClubRerolls: number;
  sameSeasonRerolls: number;
  hasOtherSeasons: boolean;
  awaitingNewClub: boolean;
  isDraftStarted: boolean;
  isFull: boolean;
  progress: number;
  onSelectPlayer: (player: Player) => void;
  onRerollSameClub: () => void;
  onRerollSameSeason: () => void;
  onNewClub: () => void;
  onViewCompo: () => void;
}

function LeftPanel({
  currentClub,
  filteredPlayers,
  selectedPlayers,
  sameClubRerolls,
  sameSeasonRerolls,
  hasOtherSeasons,
  awaitingNewClub,
  isDraftStarted,
  isFull,
  progress,
  onSelectPlayer,
  onRerollSameClub,
  onRerollSameSeason,
  onNewClub,
  onViewCompo,
}: LeftPanelProps) {
  const [spinName, setSpinName] = useState(() => currentClub.replace(/\s\d{2}-\d{2}$/, ""));
  const [isSpinning, setIsSpinning] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (awaitingNewClub) return;

    const target = currentClub.replace(/\s\d{2}-\d{2}$/, "");
    const pool = SPIN_POOL.filter((n) => n !== target);

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
        if (name === null) {
          setSpinName(target);
          setIsSpinning(false);
        } else {
          setSpinName(name);
        }
      }, delay);
      timersRef.current.push(id);
    }

    return () => { timersRef.current.forEach(clearTimeout); };
  }, [currentClub, awaitingNewClub]);

  const season = currentClub.match(/\s(\d{2}-\d{2})$/)?.[1] ?? null;

  return (
    <aside className="border-r border-[var(--c-border)] flex flex-col h-full overflow-hidden">

      {/* Club + reroll */}
      {!awaitingNewClub && (
        <div className="p-5 lg:p-6 border-b border-[var(--c-border)] flex-shrink-0">
          <div className="mb-4 text-center lg:text-left">
            <p className="text-c-gold uppercase tracking-[0.35em] text-[9px] font-bold mb-1">Club tiré</p>
            <h2 className={`text-lg lg:text-xl font-black leading-tight transition-colors duration-150 ${isSpinning ? "text-c-gold/60" : "text-c-fg"}`}>
              {spinName}
            </h2>
            {!isSpinning && season && (
              <p className="text-c-gold text-[10px] italic mt-0.5">Saison {season}</p>
            )}
          </div>
          <div className="space-y-2">
            <button
              onClick={onRerollSameClub}
              disabled={!hasOtherSeasons || sameClubRerolls <= 0}
              className="w-full border border-c-gold/50 hover:border-c-gold text-c-gold font-black uppercase tracking-[0.15em] text-[10px] py-2.5 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              ↻ Même club, autre saison
            </button>
            <button
              onClick={onRerollSameSeason}
              disabled={sameSeasonRerolls <= 0}
              className="w-full border border-c-gold/50 hover:border-c-gold text-c-gold font-black uppercase tracking-[0.15em] text-[10px] py-2.5 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              ↻ Autre club, même saison
            </button>
            <div className="flex justify-between text-[8px] uppercase tracking-wider text-[var(--c-muted)] px-0.5">
              <span>{sameClubRerolls}/3</span>
              <span>{sameSeasonRerolls}/3</span>
            </div>
          </div>
        </div>
      )}

      {/* Players / actions */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {isFull ? (
          <div className="p-5 lg:p-6">
            <button
              onClick={onViewCompo}
              className="w-full bg-c-gold hover:bg-[#F5F0E8] text-black font-black uppercase tracking-[0.2em] text-sm py-4 transition-colors"
            >
              Voir ta compo →
            </button>
          </div>
        ) : awaitingNewClub ? (
          <div className="p-5 lg:p-6">
            <button
              onClick={onNewClub}
              className="w-full bg-c-gold hover:bg-[#F5F0E8] text-black font-black uppercase tracking-[0.2em] text-sm py-4 transition-colors"
            >
              {isDraftStarted ? "↻ Nouvelle équipe" : "Commencer le choix des joueurs →"}
            </button>
          </div>
        ) : isSpinning ? null : (
          <>
            <div className="px-5 lg:px-6 py-3 lg:py-4 border-b border-[var(--c-border)] flex-shrink-0">
              <p className="text-[var(--c-muted)] uppercase tracking-[0.35em] text-[9px] font-bold text-center lg:text-left">
                Choisis un joueur
              </p>
            </div>
            <div className="overflow-y-scroll flex-1 min-h-0">
              {filteredPlayers.map((player) => {
                const count = selectedPlayers.filter((sp) => sp.position === player.position).length;
                const max = MAX_BY_POSITION[player.position] ?? 1;
                const full = count >= max;
                return (
                  <button
                    key={player.name}
                    disabled={full}
                    onClick={() => onSelectPlayer(player)}
                    className={`w-full flex items-center justify-between px-5 lg:px-6 py-2.5 border-b border-[var(--c-border-lo)] transition-colors ${
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

      {/* Counter */}
      <div className="p-5 lg:p-6 border-t border-[var(--c-border)] flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[var(--c-muted)] uppercase tracking-wider text-[9px]">Joueurs</span>
          <span className="text-c-fg font-black text-sm">{selectedPlayers.length} / 15</span>
        </div>
        <div className="w-full h-0.5 bg-c-fg/10">
          <div
            className="h-full bg-c-gold transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
