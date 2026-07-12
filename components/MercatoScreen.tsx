"use client";

import { useEffect, useRef, useState } from "react";
import { clubs } from "@/lib/data";
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

function abbreviateName(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length < 2 ? name.toUpperCase() : `${p[0][0].toUpperCase()}.${p.slice(1).join(" ").toUpperCase()}`;
}

function getRatingCap(position: number, season: number): number {
  const base = position <= 2 ? 92 : position <= 6 ? 90 : position <= 12 ? 87 : 85;
  return Math.min(99, base + (season - 1) * 3);
}

interface CatalogPlayer {
  name: string;
  position: string;
  rating: number;
  clubName: string;
  season: string;
  clubKey: string;
}

function buildCatalog(): CatalogPlayer[] {
  const catalog: CatalogPlayer[] = [];
  for (const [key, players] of Object.entries(clubs)) {
    const seasonMatch = key.match(/\d{2}-\d{2}$/);
    if (!seasonMatch) continue;
    const season = seasonMatch[0];
    const clubName = key.slice(0, key.length - season.length - 1);
    for (const p of players) {
      catalog.push({ name: p.name, position: p.position, rating: p.rating, clubName, season, clubKey: key });
    }
  }
  return catalog;
}

const POSITION_ORDER = [
  "Pilier gauche", "Talonneur", "Pilier droit",
  "Deuxième ligne", "Troisième ligne", "Numéro 8",
  "Demi de mêlée", "Ouvreur", "Centre", "Ailier", "Arrière",
];

interface Props {
  selectedPlayers: Player[];
  seasonNumber: number;
  myFinalPosition: number;
  onComplete: (newPlayers: Player[]) => void;
}

export function MercatoScreen({ selectedPlayers, seasonNumber, myFinalPosition, onComplete }: Props) {
  const [phase, setPhase] = useState<"release" | "recruit" | "progress">("release");
  const [actOverlay, setActOverlay] = useState<{ text: string; act: number } | null>(
    { text: "DÉPARTS", act: 1 }
  );
  const [releasedIndices, setReleasedIndices] = useState<Set<number>>(new Set());
  const [squadForProgress, setSquadForProgress] = useState<Player[]>(selectedPlayers);

  const remainingPlayers = selectedPlayers.filter((_, i) => !releasedIndices.has(i));
  const releasedPositions = selectedPlayers.filter((_, i) => releasedIndices.has(i)).map(p => p.position);
  const ratingCap = getRatingCap(myFinalPosition || 14, seasonNumber);

  function toggleRelease(i: number) {
    setReleasedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else if (next.size < 3) { next.add(i); }
      return next;
    });
  }

  function handleConfirmReleases() {
    if (releasedPositions.length === 0) {
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
            releasedPositions={releasedPositions}
            ratingCap={ratingCap}
            myFinalPosition={myFinalPosition || 14}
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

function RecruitPhase({ remainingPlayers, releasedPositions, ratingCap, myFinalPosition, onDone }: {
  remainingPlayers: Player[];
  releasedPositions: string[];
  ratingCap: number;
  myFinalPosition: number;
  onDone: (players: Player[]) => void;
}) {
  const [recruited, setRecruited] = useState<Player[]>([]);
  const currentSlot = recruited.length;
  const done = currentSlot >= releasedPositions.length;
  const squadSoFar = [...remainingPlayers, ...recruited];
  const currentPosition = releasedPositions[currentSlot];

  const catalog = buildCatalog();
  const eligible = done ? [] : catalog
    .filter(cp =>
      cp.position === currentPosition &&
      cp.rating <= ratingCap &&
      !squadSoFar.some(sp => sp.name === cp.name)
    )
    .sort((a, b) => b.rating - a.rating);

  function handleSelectPlayer(cp: CatalogPlayer) {
    setRecruited([...recruited, { name: cp.name, position: cp.position, rating: cp.rating, club: cp.clubKey }]);
  }

  const posRange = myFinalPosition <= 2 ? "1er-2e"
    : myFinalPosition <= 6 ? "3e-6e"
    : myFinalPosition <= 12 ? "7e-12e"
    : "13e-14e";
  const instructionLines = [
    "Continue à construire ton XV de légende en recrutant parmi les meilleurs joueurs de l'histoire du TOP 14.",
    `Classement ${posRange} la saison dernière = note maximale pour recruter : ${ratingCap}.`,
  ];

  if (done) {
    return (
      <div className="flex flex-col" style={{ minHeight: "100svh" }}>
        <PhaseHeader title="Recrute tes remplaçants" step="Acte II · Recrutement" />
        <div className="flex-1 flex flex-col items-center justify-center px-5 gap-6">
          <div className="text-center">
            <p style={{ color: S.accent, fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.3em", marginBottom: 8 }}>
              Recrutement terminé
            </p>
            <p style={{ color: S.muted, fontSize: 12 }}>
              {releasedPositions.length} recrue{releasedPositions.length > 1 ? "s" : ""} intégrée{releasedPositions.length > 1 ? "s" : ""} à l&apos;effectif
            </p>
          </div>
          {recruited.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {recruited.map((p, i) => (
                <span key={i} style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", color: S.accent, background: "rgba(143,175,200,0.1)", padding: "3px 8px" }}>
                  ✓ {p.name.split(" ").at(-1)} · {p.rating}
                </span>
              ))}
            </div>
          )}
          <div className="w-full max-w-sm">
            <PrimaryButton onClick={() => onDone([...remainingPlayers, ...recruited])}>
              Passer à la pré-saison →
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "100svh" }}>
      <PhaseHeader title="Recrute tes remplaçants" step="Acte II · Recrutement" />
      <InstructionBox lines={instructionLines} />
      <RecruitCatalogView
        position={currentPosition}
        slotLabel={`Recrue ${currentSlot + 1} / ${releasedPositions.length}`}
        ratingCap={ratingCap}
        candidates={eligible}
        recruited={recruited}
        onSelectPlayer={handleSelectPlayer}
      />
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
        "Appuie sur Lancer la saison si tu ne veux booster personne. Maximum atteignable : 99.",
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
          {selectedIndex === null ? "Lancer la saison →" : "Confirmer →"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ── Catalog view (Recrutement) ──────────────────────────────────── */

function RecruitCatalogView({ position, slotLabel, ratingCap, candidates, recruited, onSelectPlayer }: {
  position: string;
  slotLabel: string;
  ratingCap: number;
  candidates: CatalogPlayer[];
  recruited: Player[];
  onSelectPlayer: (cp: CatalogPlayer) => void;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Position header */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
        <p style={{ color: S.faint, fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 4 }}>{slotLabel}</p>
        <h2 style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.2, color: S.text }}>{position}</h2>
        <p style={{ color: S.accent, fontSize: 10, marginTop: 4 }}>
          Note max : <strong>{ratingCap}</strong>
          <span style={{ color: S.faint }}> · {candidates.length} joueur{candidates.length !== 1 ? "s" : ""} disponible{candidates.length !== 1 ? "s" : ""}</span>
        </p>
        {recruited.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {recruited.map((p, i) => (
              <span key={i} style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", color: S.accent, background: "rgba(143,175,200,0.1)", padding: "3px 8px" }}>
                ✓ {p.name.split(" ").at(-1)} · {p.rating}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Column header */}
      <div style={{ padding: "7px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <span style={{ flex: 1, fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em", color: S.faint }}>Joueur — Club — Saison</span>
        <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em", color: S.faint }}>Note</span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {candidates.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: S.muted, fontSize: 12 }}>Aucun joueur disponible pour ce poste avec le cap actuel.</p>
          </div>
        ) : (
          candidates.map((cp) => (
            <button
              key={`${cp.clubKey}-${cp.name}`}
              onClick={() => onSelectPlayer(cp)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 20px", borderBottom: `1px solid ${S.border}`,
                background: "transparent", cursor: "pointer", textAlign: "left",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(143,175,200,0.05)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 900, fontSize: 11, color: S.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {abbreviateName(cp.name)}
                  <span style={{ color: S.faint, fontWeight: 400 }}> — {cp.clubName} — {cp.season}</span>
                </p>
              </div>
              <PlayerBadge rating={cp.rating} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
