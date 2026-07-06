"use client";

import { useEffect, useRef, useState } from "react";
import { clubs, MAX_BY_POSITION } from "@/lib/data";
import type { Player } from "@/lib/types";

/* ── Steel-blue palette ───────────────────────────────────────────
   All mercato UI uses these so it stays cold regardless of theme.  */
const S = {
  bg:       "#04060F",
  bgCard:   "#060A14",
  text:     "#E8EDF5",
  muted:    "rgba(143,175,200,0.65)",
  faint:    "rgba(143,175,200,0.30)",
  accent:   "#8FAFC8",
  border:   "rgba(143,175,200,0.15)",
  borderHi: "rgba(143,175,200,0.45)",
};

const SPIN_POOL = [...new Set(
  Object.keys(clubs).map((n) => n.replace(/\s\d{2}-\d{2}$/, ""))
)];

function getClubAndSeason(key: string) {
  const season = key.match(/\d{2}-\d{2}$/)![0];
  const club = key.slice(0, key.length - season.length - 1);
  return { club, season };
}
function abbreviateName(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length < 2 ? name : `${p[0][0]}.${p.slice(1).join(" ")}`;
}
function randomKey(exclude: Set<string> = new Set()) {
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
  const [phase, setPhase] = useState<"release" | "recruit" | "progress">("release");
  const [actOverlay, setActOverlay] = useState<{ text: string; act: number } | null>(
    { text: "DÉPARTS", act: 1 }
  );
  const [releasedIndices, setReleasedIndices] = useState<Set<number>>(new Set());
  const [squadForProgress, setSquadForProgress] = useState<Player[]>(selectedPlayers);

  const remainingPlayers = selectedPlayers.filter((_, i) => !releasedIndices.has(i));
  const slotsNeeded = releasedIndices.size;

  function toggleRelease(i: number) {
    setReleasedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else if (next.size < 3) { next.add(i); }
      return next;
    });
  }

  function handleConfirmReleases() {
    if (slotsNeeded === 0) {
      setSquadForProgress(selectedPlayers);
      setPhase("progress");
      setActOverlay({ text: "PRÉ-SAISON", act: 3 });
    } else {
      setPhase("recruit");
      setActOverlay({ text: "RECRUTEMENT", act: 2 });
    }
  }

  function handleRecruitDone(players: Player[]) {
    setSquadForProgress(players);
    setPhase("progress");
    setActOverlay({ text: "PRÉ-SAISON", act: 3 });
  }

  return (
    <main style={{ minHeight: "100svh", background: S.bg, color: S.text }} className="flex flex-col overflow-hidden">

      {/* Cinematic act title overlay */}
      {actOverlay && (
        <ActTitle act={actOverlay.act} text={actOverlay.text} onDone={() => setActOverlay(null)} />
      )}

      {/* Phase content rendered behind the overlay */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {phase === "release" && (
          <ReleasePhase
            players={selectedPlayers}
            releasedIndices={releasedIndices}
            onToggle={toggleRelease}
            onConfirm={handleConfirmReleases}
          />
        )}
        {phase === "recruit" && (
          <RecruitPhase
            remainingPlayers={remainingPlayers}
            slotsNeeded={slotsNeeded}
            onDone={handleRecruitDone}
          />
        )}
        {phase === "progress" && (
          <ProgressPhase
            players={squadForProgress}
            onConfirm={onComplete}
          />
        )}
      </div>
    </main>
  );
}

/* ── Cinematic act title ─────────────────────────────────────────── */

function ActTitle({ act, text, onDone }: { act: number; text: string; onDone: () => void }) {
  const chars = text.split("");
  const [visibleCount, setVisibleCount] = useState(0);
  const [punchIdx, setPunchIdx]         = useState(-1);
  const [pulse, setPulse]               = useState(false);
  const [showLabel, setShowLabel]       = useState(false);
  const [fadeOut, setFadeOut]           = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const at = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms); timers.current.push(t);
    };

    at(() => setShowLabel(true), 180);

    chars.forEach((_, i) => {
      at(() => { setVisibleCount(i + 1); setPunchIdx(i); }, 480 + i * 95);
      at(() => setPunchIdx(-1), 480 + i * 95 + 175);
    });
    const lastLetter = 480 + (chars.length - 1) * 95;

    at(() => setPulse(true),   lastLetter + 220);
    at(() => setPulse(false),  lastLetter + 460);
    at(() => setFadeOut(true), lastLetter + 560);
    at(() => onDoneRef.current(), lastLetter + 1050);

    return () => { timers.current.forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: S.bg,
      opacity: fadeOut ? 0 : 1,
      transition: fadeOut ? "opacity 0.5s ease" : "none",
      pointerEvents: fadeOut ? "none" : "all",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 20,
    }}>
      {/* Act number label */}
      <p style={{
        color: S.muted,
        fontSize: 10, fontWeight: 700,
        letterSpacing: "0.55em",
        textTransform: "uppercase",
        opacity: showLabel ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}>
        ACTE {act}
      </p>

      {/* Main title letters */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        transform: pulse ? "scale(1.07)" : "scale(1)",
        filter: pulse
          ? `drop-shadow(0 0 28px rgba(143,175,200,0.9)) drop-shadow(0 0 60px rgba(143,175,200,0.35))`
          : "none",
        transition: "transform 0.15s ease, filter 0.15s ease",
      }}>
        {chars.map((char, i) => (
          <span key={i} style={{
            display: "inline-block",
            fontSize: "clamp(36px, 8vw, 72px)",
            fontWeight: 900,
            lineHeight: 1,
            textTransform: "uppercase",
            color: char === "-" ? "rgba(143,175,200,0.4)" : S.accent,
            opacity: visibleCount > i ? 1 : 0,
            transform: punchIdx === i ? "scale(1.55) translateY(-5px)" : "scale(1) translateY(0)",
            transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.01s",
            textShadow: visibleCount > i
              ? "0 0 20px rgba(143,175,200,0.7), 0 0 50px rgba(143,175,200,0.25)"
              : "none",
          }}>
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Shared components ───────────────────────────────────────────── */

function PhaseHeader({ title, step }: { title: string; step: string }) {
  return (
    <header style={{ borderBottom: `1px solid ${S.border}` }} className="px-5 lg:px-8 py-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <span className="font-black text-2xl tracking-tighter" style={{ color: S.text }}>
          26<span style={{ color: S.accent }}>-</span>0
        </span>
        <div style={{ width: 1, height: 28, background: S.border }} />
        <div>
          <p style={{ color: S.accent, fontSize: 8, fontWeight: 700, letterSpacing: "0.35em", textTransform: "uppercase" }}>{step}</p>
          <p style={{ color: S.text, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</p>
        </div>
      </div>
    </header>
  );
}

function InstructionBox({ lines }: { lines: string[] }) {
  return (
    <div style={{
      background: S.bgCard,
      border: `1px solid ${S.border}`,
      borderLeft: `3px solid ${S.accent}`,
      margin: "12px 20px",
      padding: "10px 14px",
      flexShrink: 0,
    }}>
      <p style={{ color: S.accent, fontSize: 8, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 6 }}>
        Comment jouer
      </p>
      {lines.map((line, i) => (
        <p key={i} style={{ color: S.text, fontSize: 11, lineHeight: 1.65, opacity: i > 0 ? 0.7 : 1 }}>
          {line}
        </p>
      ))}
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ background: S.accent, color: S.bg }}
      className="w-full font-black uppercase tracking-[0.2em] text-sm py-4 transition-opacity hover:opacity-85"
    >
      {children}
    </button>
  );
}

function PlayerBadge({ rating }: { rating: number }) {
  const tier = rating >= 90 ? 3 : rating >= 85 ? 2 : 1;
  const bg = tier === 3 ? "#FFFFFF" : tier === 2 ? "#D4AF37" : "#0D0D0D";
  const fg = tier === 2 ? "#000000" : "#D4AF37";
  const border = tier === 3 ? "2px solid #D4AF37" : "none";
  return (
    <span style={{ background: bg, color: fg, border, padding: "1px 6px", fontSize: 10, fontWeight: 900, lineHeight: "16px", flexShrink: 0 }}>
      {rating}
    </span>
  );
}

/* ── Phase 1 : Départs ───────────────────────────────────────────── */

function ReleasePhase({ players, releasedIndices, onToggle, onConfirm }: {
  players: Player[];
  releasedIndices: Set<number>;
  onToggle: (i: number) => void;
  onConfirm: () => void;
}) {
  const sorted = [...players]
    .map((p, i) => ({ player: p, originalIndex: i }))
    .sort((a, b) => POSITION_ORDER.indexOf(a.player.position) - POSITION_ORDER.indexOf(b.player.position));

  return (
    <div className="flex flex-col h-full" style={{ minHeight: "100svh" }}>
      <PhaseHeader title="Libère tes joueurs" step="Acte I · Départs" />
      <InstructionBox lines={[
        "Sélectionne jusqu'à 3 joueurs à libérer. Ces joueurs quittent définitivement le club.",
        "Appuie sur Continuer si tu souhaites garder tout ton effectif.",
      ]} />

      {releasedIndices.size > 0 && (
        <div style={{ borderBottom: `1px solid ${S.border}`, padding: "6px 20px", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: S.accent, fontSize: 8, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase" }}>
            {releasedIndices.size} départ{releasedIndices.size > 1 ? "s" : ""} sélectionné{releasedIndices.size > 1 ? "s" : ""}
          </span>
          <span style={{ color: S.faint, fontSize: 8 }}>/ 3 max</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {sorted.map(({ player, originalIndex }) => {
          const isReleased = releasedIndices.has(originalIndex);
          const blocked = !isReleased && releasedIndices.size >= 3;
          return (
            <button
              key={originalIndex}
              onClick={() => onToggle(originalIndex)}
              disabled={blocked}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 20px",
                borderBottom: `1px solid ${S.border}`,
                background: isReleased ? "rgba(239,68,68,0.08)" : "transparent",
                opacity: blocked ? 0.3 : 1,
                cursor: blocked ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
            >
              <div style={{
                width: 20, height: 20, border: `1px solid ${isReleased ? "rgba(239,68,68,0.6)" : S.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {isReleased && <span style={{ color: "#F87171", fontSize: 10, fontWeight: 900 }}>✕</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
                  color: isReleased ? S.muted : S.text,
                  textDecoration: isReleased ? "line-through" : "none",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {abbreviateName(player.name)}
                </p>
                <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.25em", color: S.faint, marginTop: 2 }}>
                  {player.position}
                  {player.club && <span style={{ marginLeft: 4, opacity: 0.6 }}>· {player.club.replace(/\s\d{2}-\d{2}$/, "")}</span>}
                </p>
              </div>
              <PlayerBadge rating={player.rating} />
            </button>
          );
        })}
      </div>

      <div style={{ flexShrink: 0, padding: "16px 20px", borderTop: `1px solid ${S.border}` }}>
        <PrimaryButton onClick={onConfirm}>
          {releasedIndices.size === 0
            ? "Continuer sans changement →"
            : `Confirmer ${releasedIndices.size} départ${releasedIndices.size > 1 ? "s" : ""} →`}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ── Phase 2 : Recrutement ───────────────────────────────────────── */

function RecruitPhase({ remainingPlayers, slotsNeeded, onDone }: {
  remainingPlayers: Player[];
  slotsNeeded: number;
  onDone: (players: Player[]) => void;
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

  function handleRerollSameClub() {
    if (sameClubRerolls <= 0) return;
    const { club } = getClubAndSeason(currentClub);
    const next = new Set([...shownClubs, currentClub]);
    const opts = Object.keys(clubs).filter((k) => getClubAndSeason(k).club === club && !next.has(k));
    if (!opts.length) return;
    setCurrentClub(opts[Math.floor(Math.random() * opts.length)]);
    setShownClubs(next); setSameClubRerolls((n) => n - 1);
  }

  function handleRerollSameSeason() {
    if (sameSeasonRerolls <= 0) return;
    const { season } = getClubAndSeason(currentClub);
    const next = new Set([...shownClubs, currentClub]);
    const opts = Object.keys(clubs).filter((k) => getClubAndSeason(k).season === season && !next.has(k));
    if (!opts.length) return;
    setCurrentClub(opts[Math.floor(Math.random() * opts.length)]);
    setShownClubs(next); setSameSeasonRerolls((n) => n - 1);
  }

  function handleSelectPlayer(player: Player) {
    const next = [...recruited, { ...player, club: currentClub }];
    setRecruited(next);
    if (next.length < slotsNeeded) {
      setShownClubs(new Set()); setCurrentClub(randomKey()); setAwaitingNewClub(true);
    }
  }

  const season = currentClub.match(/\s(\d{2}-\d{2})$/)?.[1] ?? null;
  const clubDisplayName = currentClub.replace(/\s\d{2}-\d{2}$/, "");

  return (
    <div className="flex flex-col" style={{ minHeight: "100svh" }}>
      <PhaseHeader title="Recrute tes remplaçants" step="Acte II · Recrutement" />
      <InstructionBox lines={[
        `Pour chaque départ, un club est tiré au sort. Choisis un joueur parmi ceux proposés.`,
        "Tu as 3 relances disponibles par recrutement.",
      ]} />

      {recruited.length > 0 && (
        <div style={{ borderBottom: `1px solid ${S.border}`, padding: "8px 20px", flexShrink: 0, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {recruited.map((p, i) => (
            <span key={i} style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", color: S.accent, background: "rgba(143,175,200,0.1)", padding: "3px 8px" }}>
              {p.name.split(" ").at(-1)} · {p.rating}
            </span>
          ))}
          <span style={{ fontSize: 9, color: S.faint, textTransform: "uppercase", letterSpacing: "0.2em" }}>
            {recruited.length}/{slotsNeeded} recrues
          </span>
        </div>
      )}

      {done ? (
        <div className="flex-1 flex flex-col items-center justify-center px-5 gap-6">
          <div className="text-center">
            <p style={{ color: S.accent, fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.3em", marginBottom: 8 }}>
              Recrutement terminé
            </p>
            <p style={{ color: S.muted, fontSize: 12 }}>
              {slotsNeeded} recrue{slotsNeeded > 1 ? "s" : ""} intégrée{slotsNeeded > 1 ? "s" : ""} à l&apos;effectif
            </p>
          </div>
          <div className="w-full max-w-sm">
            <PrimaryButton onClick={() => onDone([...remainingPlayers, ...recruited])}>
              Passer à la pré-saison →
            </PrimaryButton>
          </div>
        </div>
      ) : awaitingNewClub ? (
        <div className="flex-1 flex flex-col items-center justify-center px-5 gap-5">
          <p style={{ color: S.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.35em" }}>
            Recrue {recruited.length + 1} / {slotsNeeded}
          </p>
          <div className="w-full max-w-sm">
            <PrimaryButton onClick={() => { setCurrentClub(randomKey(shownClubs)); setAwaitingNewClub(false); }}>
              Tirer un club →
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <MercatoClubDraft
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

/* ── Phase 3 : Pré-saison / Progression ─────────────────────────── */

function ProgressPhase({ players, onConfirm }: {
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
    <div className="flex flex-col" style={{ minHeight: "100svh" }}>
      <PhaseHeader title="Stage de pré-saison" step="Acte III · Entraînement" />
      <InstructionBox lines={[
        "Choisis un joueur pour lui faire suivre un stage intensif. Il gagne +2 points de note.",
        "Appuie sur Lancer la saison si tu ne veux booster personne. Maximum atteignable : 97.",
      ]} />

      <div className="flex-1 overflow-y-auto">
        {sorted.map(({ player, originalIndex }) => {
          const isSelected = selectedIndex === originalIndex;
          const blocked = player.rating >= 98;
          const displayRating = isSelected ? Math.min(99, player.rating + 2) : player.rating;
          return (
            <button
              key={originalIndex}
              onClick={() => !blocked && setSelectedIndex(isSelected ? null : originalIndex)}
              disabled={blocked}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 20px",
                borderBottom: `1px solid ${S.border}`,
                background: isSelected ? "rgba(143,175,200,0.07)" : "transparent",
                opacity: blocked ? 0.3 : 1,
                cursor: blocked ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
            >
              <div style={{
                width: 20, height: 20,
                border: `1px solid ${isSelected ? S.accent : S.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                transition: "border-color 0.15s",
              }}>
                {isSelected && <span style={{ color: S.accent, fontSize: 10, fontWeight: 900 }}>↑</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
                  color: isSelected ? S.accent : S.text,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  transition: "color 0.15s",
                }}>
                  {abbreviateName(player.name)}
                </p>
                <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.25em", color: S.faint, marginTop: 2 }}>
                  {player.position}
                  {player.club && <span style={{ marginLeft: 4, opacity: 0.6 }}>· {player.club.replace(/\s\d{2}-\d{2}$/, "")}</span>}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {isSelected && (
                  <span style={{ color: S.accent, fontSize: 9, fontWeight: 900, letterSpacing: "0.15em" }}>+2</span>
                )}
                <PlayerBadge rating={displayRating} />
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ flexShrink: 0, padding: "16px 20px", borderTop: `1px solid ${S.border}` }}>
        <PrimaryButton onClick={handleConfirm}>
          {selectedIndex === null ? "Lancer la saison →" : "Confirmer le stage →"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ── Club draw (Recrutement) ─────────────────────────────────────── */

function MercatoClubDraft({ clubDisplayName, season, players, squadSoFar, sameClubRerolls, sameSeasonRerolls, hasOtherSeasons, slotLabel, onSelectPlayer, onRerollSameClub, onRerollSameSeason }: {
  clubDisplayName: string; season: string | null; players: Player[]; squadSoFar: Player[];
  sameClubRerolls: number; sameSeasonRerolls: number; hasOtherSeasons: boolean; slotLabel: string;
  onSelectPlayer: (p: Player) => void; onRerollSameClub: () => void; onRerollSameSeason: () => void;
}) {
  const [isSpinning, setIsSpinning] = useState(true);
  const [spinName, setSpinName] = useState(clubDisplayName);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout); timers.current = [];
    const pool = SPIN_POOL.filter((n) => n !== clubDisplayName);
    setIsSpinning(true);
    const sched: [number, string | null][] = [];
    let t = 0;
    for (let i = 0; i < 10; i++) { t += 65; sched.push([t, pool[Math.floor(Math.random() * pool.length)]]); }
    for (let i = 0; i < 4; i++) { t += 120; sched.push([t, pool[Math.floor(Math.random() * pool.length)]]); }
    for (let i = 0; i < 3; i++) { t += 200; sched.push([t, pool[Math.floor(Math.random() * pool.length)]]); }
    sched.push([t + 220, null]);
    for (const [delay, name] of sched) {
      const id = setTimeout(() => {
        if (name === null) { setSpinName(clubDisplayName); setIsSpinning(false); }
        else setSpinName(name);
      }, delay);
      timers.current.push(id);
    }
    return () => { timers.current.forEach(clearTimeout); };
  }, [clubDisplayName]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Club header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
        <p style={{ color: S.faint, fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 4 }}>{slotLabel}</p>
        <h2 style={{
          fontSize: 18, fontWeight: 900, lineHeight: 1.2,
          color: isSpinning ? "rgba(143,175,200,0.45)" : S.text,
          transition: "color 0.15s",
        }}>
          {spinName}
        </h2>
        {!isSpinning && season && (
          <p style={{ color: S.accent, fontSize: 10, fontStyle: "italic", marginTop: 3 }}>Saison {season}</p>
        )}
        {!isSpinning && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "↻ Même club, autre saison", onClick: onRerollSameClub, disabled: !hasOtherSeasons || sameClubRerolls <= 0, count: sameClubRerolls },
                { label: "↻ Autre club, même saison", onClick: onRerollSameSeason, disabled: sameSeasonRerolls <= 0, count: sameSeasonRerolls },
              ].map(({ label, onClick, disabled, count }) => (
                <button
                  key={label}
                  onClick={onClick}
                  disabled={disabled}
                  style={{
                    flex: 1, border: `1px solid ${disabled ? S.border : S.borderHi}`,
                    color: disabled ? S.faint : S.accent,
                    fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
                    padding: "6px 4px", cursor: disabled ? "not-allowed" : "pointer",
                    background: "transparent", transition: "border-color 0.15s",
                  }}
                >
                  {label} · {count}/3
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto">
        {!isSpinning && (
          <>
            <div style={{ padding: "10px 20px", borderBottom: `1px solid ${S.border}` }}>
              <p style={{ color: S.muted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em" }}>
                Choisis un joueur
              </p>
            </div>
            {players.map((player) => {
              const count = squadSoFar.filter((sp) => sp.position === player.position).length;
              const full = count >= (MAX_BY_POSITION[player.position] ?? 1);
              return (
                <button
                  key={player.name}
                  disabled={full}
                  onClick={() => onSelectPlayer(player)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 20px", borderBottom: `1px solid ${S.border}`,
                    background: "transparent", cursor: full ? "not-allowed" : "pointer",
                    opacity: full ? 0.25 : 1, textAlign: "left", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!full) (e.currentTarget as HTMLButtonElement).style.background = "rgba(143,175,200,0.05)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <div>
                    <p style={{ fontWeight: 900, fontSize: 11, color: S.text }}>{abbreviateName(player.name)}</p>
                    <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.25em", color: S.faint, marginTop: 2 }}>{player.position}</p>
                  </div>
                  <PlayerBadge rating={player.rating} />
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
