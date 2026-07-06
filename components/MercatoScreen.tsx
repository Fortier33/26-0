"use client";

import { useEffect, useRef, useState } from "react";
import { clubs, MAX_BY_POSITION } from "@/lib/data";
import type { Player } from "@/lib/types";

const SPIN_POOL = [...new Set(
  Object.keys(clubs).map((n) => n.replace(/\s\d{2}-\d{2}$/, ""))
)];

function getClubAndSeason(key: string) {
  const season = key.match(/\d{2}-\d{2}$/)![0];
  const club = key.slice(0, key.length - season.length - 1);
  return { club, season };
}

function abbreviateName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0][0]}.${parts.slice(1).join(" ")}`;
}

function randomKey(exclude: Set<string> = new Set()): string {
  const keys = Object.keys(clubs).filter((k) => !exclude.has(k));
  return keys[Math.floor(Math.random() * keys.length)];
}

const POSITION_ORDER = [
  "Pilier gauche", "Talonneur", "Pilier droit",
  "Deuxième ligne", "Troisième ligne", "Numéro 8",
  "Demi de mêlée", "Ouvreur", "Centre", "Ailier", "Arrière",
];

interface Props {
  selectedPlayers: Player[];
  onComplete: (newPlayers: Player[]) => void;
}

export function MercatoScreen({ selectedPlayers, onComplete }: Props) {
  const [phase, setPhase] = useState<"progress" | "release" | "recruit">("progress");
  const [progressedPlayers, setProgressedPlayers] = useState<Player[]>(selectedPlayers);
  const [releasedIndices, setReleasedIndices] = useState<Set<number>>(new Set());

  const remainingPlayers = progressedPlayers.filter((_, i) => !releasedIndices.has(i));
  const slotsNeeded = releasedIndices.size;

  function handleProgressConfirm(boosted: Player[]) {
    setProgressedPlayers(boosted);
    setPhase("release");
  }

  function toggleRelease(i: number) {
    setReleasedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else if (next.size < 3) { next.add(i); }
      return next;
    });
  }

  function confirmReleases() {
    if (slotsNeeded === 0) { onComplete(progressedPlayers); return; }
    setPhase("recruit");
  }

  const headerTitle = phase === "progress" ? "Fais progresser un joueur"
    : phase === "release" ? "Libère tes joueurs"
    : "Recrute tes remplaçants";

  return (
    <main className="min-h-screen bg-c-bg text-c-fg flex flex-col overflow-hidden">
      <header className="border-b border-[var(--c-border)] px-5 lg:px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-black tracking-tighter">
            26<span className="text-c-gold">-</span>0
          </span>
          <div className="w-px h-7 bg-[var(--c-border)]" />
          <div>
            <p className="text-c-gold uppercase tracking-[0.35em] text-[8px] font-bold">
              {phase === "progress" ? "Progression" : "Mercato"}
            </p>
            <p className="text-c-fg font-black text-xs uppercase tracking-wide">
              {headerTitle}
            </p>
          </div>
        </div>
        <div className="text-right">
          {phase === "progress" ? (
            <p className="text-[var(--c-muted)] uppercase tracking-wider text-[8px]">+2 disponible</p>
          ) : phase === "release" ? (
            <>
              <p className="text-[var(--c-muted)] uppercase tracking-wider text-[8px] mb-0.5">Départs</p>
              <p className="text-c-gold font-black text-xl">
                {releasedIndices.size}
                <span className="text-[var(--c-faint)] text-sm font-bold"> / 3</span>
              </p>
            </>
          ) : null}
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {phase === "progress" ? (
          <ProgressPhase
            players={selectedPlayers}
            onConfirm={handleProgressConfirm}
          />
        ) : phase === "release" ? (
          <ReleasePhase
            selectedPlayers={progressedPlayers}
            releasedIndices={releasedIndices}
            onToggle={toggleRelease}
            onConfirm={confirmReleases}
          />
        ) : (
          <RecruitPhase
            remainingPlayers={remainingPlayers}
            slotsNeeded={slotsNeeded}
            onComplete={onComplete}
          />
        )}
      </div>
    </main>
  );
}

/* ── Phase 0 : Progression ───────────────────────────────────── */

function ProgressPhase({
  players,
  onConfirm,
}: {
  players: Player[];
  onConfirm: (players: Player[]) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const sorted = [...players]
    .map((p, i) => ({ player: p, originalIndex: i }))
    .sort((a, b) => POSITION_ORDER.indexOf(a.player.position) - POSITION_ORDER.indexOf(b.player.position));

  function handleConfirm() {
    if (selectedIndex === null) { onConfirm(players); return; }
    onConfirm(players.map((p, i) => i === selectedIndex ? { ...p, rating: Math.min(99, p.rating + 2) } : p));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-[var(--c-border-lo)] flex-shrink-0">
        <p className="text-[var(--c-muted)] text-[11px]">
          Choisis un joueur pour lui accorder <span className="text-c-gold font-bold">+2 de note</span> · max 99
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map(({ player, originalIndex }) => {
          const isSelected = selectedIndex === originalIndex;
          const boostedRating = Math.min(99, player.rating + 2);
          const displayRating = isSelected ? boostedRating : player.rating;
          const alreadyMax = player.rating >= 98;
          const tier = displayRating >= 90 ? 3 : displayRating >= 85 ? 2 : 1;
          const badgeBg = tier === 3 ? "#FFFFFF" : tier === 2 ? "#D4AF37" : "#0D0D0D";
          const badgeFg = tier === 2 ? "#000000" : "#D4AF37";
          const badgeBorder = tier === 3 ? "2px solid #D4AF37" : "none";

          return (
            <button
              key={originalIndex}
              onClick={() => !alreadyMax && setSelectedIndex(isSelected ? null : originalIndex)}
              disabled={alreadyMax}
              className={`w-full flex items-center gap-3 px-5 py-3 border-b border-[var(--c-border-lo)] transition-all text-left ${
                isSelected
                  ? "bg-c-gold/10"
                  : alreadyMax
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-[var(--c-ghost)]"
              }`}
            >
              <div className="w-5 h-5 border border-[var(--c-border)] flex items-center justify-center flex-shrink-0"
                style={isSelected ? { borderColor: "#D4AF37" } : undefined}>
                {isSelected && <span className="text-c-gold text-xs font-black">↑</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-black text-xs uppercase tracking-wide truncate ${isSelected ? "text-c-gold" : "text-c-fg"}`}>
                  {abbreviateName(player.name)}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--c-muted)] mt-0.5">
                  {player.position}
                  {player.club && <span className="ml-1 opacity-60">· {player.club.replace(/\s\d{2}-\d{2}$/, "")}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isSelected && (
                  <span className="text-c-gold text-[9px] font-black tracking-wider">+2</span>
                )}
                <span style={{ background: badgeBg, color: badgeFg, border: badgeBorder, padding: "1px 6px", fontSize: 10, fontWeight: 900, lineHeight: "16px", transition: "all 0.2s" }}>
                  {displayRating}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex-shrink-0 px-5 py-4 border-t border-[var(--c-border-lo)]">
        <button
          onClick={handleConfirm}
          className="w-full bg-c-gold hover:bg-[#F5F0E8] text-black font-black uppercase tracking-[0.2em] text-sm py-4 transition-colors"
        >
          {selectedIndex === null ? "Passer →" : "Confirmer la progression →"}
        </button>
      </div>
    </div>
  );
}

/* ── Phase 1 : Release ───────────────────────────────────────── */

function ReleasePhase({
  selectedPlayers, releasedIndices, onToggle, onConfirm,
}: {
  selectedPlayers: Player[];
  releasedIndices: Set<number>;
  onToggle: (i: number) => void;
  onConfirm: () => void;
}) {
  const sorted = [...selectedPlayers]
    .map((p, i) => ({ player: p, originalIndex: i }))
    .sort((a, b) => POSITION_ORDER.indexOf(a.player.position) - POSITION_ORDER.indexOf(b.player.position));

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-[var(--c-border-lo)] flex-shrink-0">
        <p className="text-[var(--c-muted)] text-[11px]">
          Clique sur un joueur pour le libérer · <span className="text-c-gold">max 3</span>
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map(({ player, originalIndex }) => {
          const isReleased = releasedIndices.has(originalIndex);
          const tier = player.rating >= 90 ? 3 : player.rating >= 85 ? 2 : 1;
          const badgeBg = tier === 3 ? "#FFFFFF" : tier === 2 ? "#D4AF37" : "#0D0D0D";
          const badgeFg = tier === 2 ? "#000000" : "#D4AF37";
          const badgeBorder = tier === 3 ? "2px solid #D4AF37" : "none";
          return (
            <button
              key={originalIndex}
              onClick={() => onToggle(originalIndex)}
              disabled={!isReleased && releasedIndices.size >= 3}
              className={`w-full flex items-center gap-3 px-5 py-3 border-b border-[var(--c-border-lo)] transition-all text-left ${
                isReleased
                  ? "bg-red-500/10 opacity-60"
                  : releasedIndices.size >= 3
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-[var(--c-ghost)]"
              }`}
            >
              <div className="w-5 h-5 border border-[var(--c-border)] flex items-center justify-center flex-shrink-0">
                {isReleased && <span className="text-red-400 text-xs font-black">✕</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-black text-xs uppercase tracking-wide truncate ${isReleased ? "line-through text-[var(--c-muted)]" : "text-c-fg"}`}>
                  {abbreviateName(player.name)}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--c-muted)] mt-0.5">
                  {player.position}
                  {player.club && <span className="ml-1 opacity-60">· {player.club.replace(/\s\d{2}-\d{2}$/, "")}</span>}
                </p>
              </div>
              <span style={{ background: badgeBg, color: badgeFg, border: badgeBorder, padding: "1px 6px", fontSize: 10, fontWeight: 900, lineHeight: "16px", flexShrink: 0 }}>
                {player.rating}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex-shrink-0 px-5 py-4 border-t border-[var(--c-border-lo)]">
        <button
          onClick={onConfirm}
          className="w-full bg-c-gold hover:bg-[#F5F0E8] text-black font-black uppercase tracking-[0.2em] text-sm py-4 transition-colors"
        >
          {releasedIndices.size === 0
            ? "Continuer sans changement →"
            : `Confirmer ${releasedIndices.size} départ${releasedIndices.size > 1 ? "s" : ""} →`}
        </button>
      </div>
    </div>
  );
}

/* ── Phase 2 : Recruit ───────────────────────────────────────── */

function RecruitPhase({
  remainingPlayers, slotsNeeded, onComplete,
}: {
  remainingPlayers: Player[];
  slotsNeeded: number;
  onComplete: (players: Player[]) => void;
}) {
  const [recruited, setRecruited] = useState<Player[]>([]);
  const [currentClub, setCurrentClub] = useState(() => randomKey());
  const [awaitingNewClub, setAwaitingNewClub] = useState(true);
  const [sameClubRerolls, setSameClubRerolls] = useState(3);
  const [sameSeasonRerolls, setSameSeasonRerolls] = useState(3);
  const [shownClubs, setShownClubs] = useState<Set<string>>(new Set());

  const squadSoFar = [...remainingPlayers, ...recruited];
  const done = recruited.length >= slotsNeeded;

  const hasOtherSeasons = (() => {
    const { club } = getClubAndSeason(currentClub);
    return Object.keys(clubs).some((k) => getClubAndSeason(k).club === club && k !== currentClub);
  })();

  const currentPlayers = (clubs[currentClub] ?? []).filter(
    (p) => !squadSoFar.some((sp) => sp.name === p.name)
  );

  function handleNewClub() {
    setCurrentClub(randomKey(shownClubs));
    setAwaitingNewClub(false);
  }

  function handleRerollSameClub() {
    if (sameClubRerolls <= 0) return;
    const { club } = getClubAndSeason(currentClub);
    const nextShown = new Set([...shownClubs, currentClub]);
    const options = Object.keys(clubs).filter((k) => getClubAndSeason(k).club === club && !nextShown.has(k));
    if (options.length === 0) return;
    setCurrentClub(options[Math.floor(Math.random() * options.length)]);
    setShownClubs(nextShown);
    setSameClubRerolls((n) => n - 1);
  }

  function handleRerollSameSeason() {
    if (sameSeasonRerolls <= 0) return;
    const { season } = getClubAndSeason(currentClub);
    const nextShown = new Set([...shownClubs, currentClub]);
    const options = Object.keys(clubs).filter((k) => getClubAndSeason(k).season === season && !nextShown.has(k));
    if (options.length === 0) return;
    setCurrentClub(options[Math.floor(Math.random() * options.length)]);
    setShownClubs(nextShown);
    setSameSeasonRerolls((n) => n - 1);
  }

  function handleSelectPlayer(player: Player) {
    const withClub = { ...player, club: currentClub };
    const next = [...recruited, withClub];
    setRecruited(next);
    if (next.length < slotsNeeded) {
      setShownClubs(new Set());
      setCurrentClub(randomKey());
      setAwaitingNewClub(true);
    }
  }

  const season = currentClub.match(/\s(\d{2}-\d{2})$/)?.[1] ?? null;
  const clubDisplayName = currentClub.replace(/\s\d{2}-\d{2}$/, "");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {recruited.length > 0 && (
        <div className="flex-shrink-0 px-5 py-2 border-b border-[var(--c-border-lo)] flex gap-2 flex-wrap">
          {recruited.map((p, i) => (
            <span key={i} className="text-[9px] font-black uppercase text-c-gold bg-c-gold/10 px-2 py-1">
              {p.name.split(" ").at(-1)} · {p.rating}
            </span>
          ))}
          <span className="text-[9px] text-[var(--c-muted)] uppercase tracking-wider self-center">
            {recruited.length}/{slotsNeeded} recrues
          </span>
        </div>
      )}

      {done ? (
        <div className="flex-1 flex flex-col items-center justify-center px-5 gap-6">
          <div className="text-center">
            <p className="text-c-gold font-black text-lg uppercase tracking-[0.3em] mb-2">Mercato terminé</p>
            <p className="text-[var(--c-muted)] text-sm">{slotsNeeded} recrue{slotsNeeded > 1 ? "s" : ""} intégrée{slotsNeeded > 1 ? "s" : ""} à l&apos;effectif</p>
          </div>
          <button
            onClick={() => onComplete([...remainingPlayers, ...recruited])}
            className="w-full max-w-sm bg-c-gold hover:bg-[#F5F0E8] text-black font-black uppercase tracking-[0.2em] text-sm py-4 transition-colors"
          >
            Commencer la saison suivante →
          </button>
        </div>
      ) : awaitingNewClub ? (
        <div className="flex-1 flex flex-col items-center justify-center px-5 gap-4">
          <p className="text-[var(--c-muted)] text-xs uppercase tracking-[0.3em]">
            Recrue {recruited.length + 1} / {slotsNeeded}
          </p>
          <button
            onClick={handleNewClub}
            className="w-full max-w-sm bg-c-gold hover:bg-[#F5F0E8] text-black font-black uppercase tracking-[0.2em] text-sm py-4 transition-colors"
          >
            Tirer un club →
          </button>
        </div>
      ) : (
        <ClubDraft
          clubDisplayName={clubDisplayName}
          season={season}
          players={currentPlayers}
          squadSoFar={squadSoFar}
          sameClubRerolls={sameClubRerolls}
          sameSeasonRerolls={sameSeasonRerolls}
          hasOtherSeasons={hasOtherSeasons}
          slotLabel={`Recrue ${recruited.length + 1} / ${slotsNeeded}`}
          onSelectPlayer={handleSelectPlayer}
          onRerollSameClub={handleRerollSameClub}
          onRerollSameSeason={handleRerollSameSeason}
        />
      )}
    </div>
  );
}

/* ── Club draft sub-component ────────────────────────────────── */

function ClubDraft({
  clubDisplayName, season, players, squadSoFar,
  sameClubRerolls, sameSeasonRerolls, hasOtherSeasons, slotLabel,
  onSelectPlayer, onRerollSameClub, onRerollSameSeason,
}: {
  clubDisplayName: string;
  season: string | null;
  players: Player[];
  squadSoFar: Player[];
  sameClubRerolls: number;
  sameSeasonRerolls: number;
  hasOtherSeasons: boolean;
  slotLabel: string;
  onSelectPlayer: (p: Player) => void;
  onRerollSameClub: () => void;
  onRerollSameSeason: () => void;
}) {
  const [isSpinning, setIsSpinning] = useState(true);
  const [spinName, setSpinName] = useState(clubDisplayName);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const pool = SPIN_POOL.filter((n) => n !== clubDisplayName);
    setIsSpinning(true);
    const schedule: [number, string | null][] = [];
    let t = 0;
    for (let i = 0; i < 10; i++) { t += 65; schedule.push([t, pool[Math.floor(Math.random() * pool.length)]]); }
    for (let i = 0; i < 4; i++) { t += 120; schedule.push([t, pool[Math.floor(Math.random() * pool.length)]]); }
    for (let i = 0; i < 3; i++) { t += 200; schedule.push([t, pool[Math.floor(Math.random() * pool.length)]]); }
    t += 220;
    schedule.push([t, null]);
    for (const [delay, name] of schedule) {
      const id = setTimeout(() => {
        if (name === null) { setSpinName(clubDisplayName); setIsSpinning(false); }
        else setSpinName(name);
      }, delay);
      timersRef.current.push(id);
    }
    return () => { timersRef.current.forEach(clearTimeout); };
  }, [clubDisplayName]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--c-border)] flex-shrink-0">
        <p className="text-[var(--c-muted)] uppercase tracking-[0.3em] text-[9px] font-bold mb-1">{slotLabel}</p>
        <h2 className={`text-lg font-black leading-tight transition-colors duration-150 ${isSpinning ? "text-c-gold/60" : "text-c-fg"}`}>
          {spinName}
        </h2>
        {!isSpinning && season && (
          <p className="text-c-gold text-[10px] italic mt-0.5">Saison {season}</p>
        )}
        {!isSpinning && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={onRerollSameClub}
                disabled={!hasOtherSeasons || sameClubRerolls <= 0}
                className="flex-1 border border-c-gold/50 hover:border-c-gold text-c-gold font-black uppercase tracking-[0.1em] text-[9px] py-2 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              >
                ↻ Même club, autre saison
              </button>
              <button
                onClick={onRerollSameSeason}
                disabled={sameSeasonRerolls <= 0}
                className="flex-1 border border-c-gold/50 hover:border-c-gold text-c-gold font-black uppercase tracking-[0.1em] text-[9px] py-2 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              >
                ↻ Autre club, même saison
              </button>
            </div>
            <div className="flex justify-between text-[8px] uppercase tracking-wider text-[var(--c-muted)] px-0.5">
              <span>{sameClubRerolls}/3</span>
              <span>{sameSeasonRerolls}/3</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {!isSpinning && (
          <>
            <div className="px-5 py-3 border-b border-[var(--c-border-lo)]">
              <p className="text-[var(--c-muted)] uppercase tracking-[0.35em] text-[9px] font-bold">Choisis un joueur</p>
            </div>
            {players.map((player) => {
              const count = squadSoFar.filter((sp) => sp.position === player.position).length;
              const max = MAX_BY_POSITION[player.position] ?? 1;
              const full = count >= max;
              return (
                <button
                  key={player.name}
                  disabled={full}
                  onClick={() => onSelectPlayer(player)}
                  className={`w-full flex items-center justify-between px-5 py-2.5 border-b border-[var(--c-border-lo)] transition-colors ${
                    full ? "opacity-25 cursor-not-allowed" : "hover:bg-[var(--c-ghost)]"
                  }`}
                >
                  <div className="text-left">
                    <p className="font-black text-xs text-c-fg">{abbreviateName(player.name)}</p>
                    <p className="text-[9px] uppercase tracking-wider text-[var(--c-muted)] mt-0.5">{player.position}</p>
                  </div>
                  <span className={`font-black text-base ml-4 ${full ? "text-[var(--c-faint)]" : "text-c-gold"}`}>
                    {player.rating}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
