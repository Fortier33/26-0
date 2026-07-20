"use client";

import { useMemo, useRef, useState } from "react";
import { ScreenTransition } from "@/components/ScreenTransition";
import { clubs } from "@/lib/data";
import {
  formatBudget, getMarketValue, getRecruiterDiscount, getTrainerBoost,
  nextUpgradeCost, UPGRADE_LABELS, UPGRADE_GRADE_DESCRIPTIONS,
} from "@/lib/budget";
import type { ClubUpgrade, Player, UpgradeGrades } from "@/lib/types";

/* ── Steel-blue palette ───────────────────────────────────────────── */
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

/* ── Helpers ──────────────────────────────────────────────────────── */

function abbreviateName(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length < 2 ? name.toUpperCase() : `${p[0][0].toUpperCase()}.${p.slice(1).join(" ").toUpperCase()}`;
}

function getRatingCap(position: number, season: number): number {
  const base = position <= 2 ? 92 : position <= 6 ? 90 : position <= 12 ? 87 : 85;
  return Math.min(99, base + (season - 1) * 3);
}

const POSITION_ORDER = [
  "Pilier gauche", "Talonneur", "Pilier droit",
  "Deuxième ligne", "Troisième ligne", "Numéro 8",
  "Demi de mêlée", "Ouvreur", "Centre", "Ailier", "Arrière",
];

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

/* ── Props ────────────────────────────────────────────────────────── */

interface Props {
  selectedPlayers: Player[];
  seasonNumber: number;
  myFinalPosition: number;
  budget: number;
  upgrades: UpgradeGrades;
  onComplete: (newPlayers: Player[], newBudget: number, newUpgrades: UpgradeGrades) => void;
}

/* ── Main component ───────────────────────────────────────────────── */

export function MercatoScreen({
  selectedPlayers, seasonNumber, myFinalPosition,
  budget, upgrades, onComplete,
}: Props) {
  // Snapshots at mercato start (used by reset)
  const budgetAtStart    = useRef(budget);
  const upgradesAtStart  = useRef({ ...upgrades });
  const squadAtStart     = useRef([...selectedPlayers]);

  const [phase, setPhase]               = useState<"main" | "recap" | "preseason">("main");
  const [phaseTransitioning, setPhaseTransitioning] = useState(false);
  const [squad, setSquad]               = useState<Player[]>([...selectedPlayers]);
  const [openPositions, setOpenPositions] = useState<string[]>([]);
  const [localBudget, setLocalBudget]   = useState(budget);
  const [localUpgrades, setLocalUpgrades] = useState<UpgradeGrades>({ ...upgrades });
  const [hasInvested, setHasInvested]   = useState(0);
  const [sales, setSales]               = useState<{ player: Player; value: number }[]>([]);
  const [purchases, setPurchases]       = useState<{ player: Player; price: number }[]>([]);

  const ratingCap = getRatingCap(myFinalPosition || 14, seasonNumber);
  const catalog   = useMemo(() => buildCatalog(), []);

  function handleReset() {
    setSquad([...squadAtStart.current]);
    setOpenPositions([]);
    setLocalBudget(budgetAtStart.current);
    setLocalUpgrades({ ...upgradesAtStart.current });
    setHasInvested(0);
    setSales([]);
    setPurchases([]);
  }

  function handleSell(playerIdx: number) {
    const player = squad[playerIdx];
    const value  = getMarketValue(player.rating);
    setSquad(prev => prev.filter((_, i) => i !== playerIdx));
    setOpenPositions(prev => [...prev, player.position]);
    setLocalBudget(prev => prev + value);
    setSales(prev => [...prev, { player, value }]);
  }

  function handleBuy(cp: CatalogPlayer) {
    const discount = getRecruiterDiscount(localUpgrades.recruiter);
    const price    = Math.round(getMarketValue(cp.rating) * (1 - discount));
    const newPlayer: Player = { name: cp.name, position: cp.position, rating: cp.rating, club: cp.clubKey };
    setSquad(prev => [...prev, newPlayer]);
    setOpenPositions(prev => {
      const idx = prev.indexOf(cp.position);
      if (idx === -1) return prev;
      const next = [...prev]; next.splice(idx, 1); return next;
    });
    setLocalBudget(prev => prev - price);
    setPurchases(prev => [...prev, { player: newPlayer, price }]);
  }

  function handleUpgrade(upgrade: ClubUpgrade) {
    const cost = nextUpgradeCost(upgrade, localUpgrades[upgrade]);
    if (cost === undefined || localBudget < cost || hasInvested >= 2) return;
    setLocalUpgrades(prev => ({ ...prev, [upgrade]: (prev[upgrade] + 1) as 0 | 1 | 2 | 3 }));
    setLocalBudget(prev => prev - cost);
    setHasInvested(prev => prev + 1);
  }

  function findUpgradesPurchased(): { key: ClubUpgrade; grade: number }[] {
    return (["stadium", "recruiter", "trainer", "marketing"] as ClubUpgrade[])
      .filter(key => localUpgrades[key] !== upgradesAtStart.current[key])
      .map(key => ({ key, grade: localUpgrades[key] }));
  }

  if (phase === "recap") {
    const upgradesPurchased = findUpgradesPurchased();
    return (
      <main style={{ minHeight: "100svh", background: S.bg, color: S.text }} className="flex flex-col overflow-hidden">
        <RecapInterSaison
          sales={sales}
          purchases={purchases}
          upgradesPurchased={upgradesPurchased}
          budgetBefore={budgetAtStart.current}
          budgetAfter={localBudget}
          seasonNumber={seasonNumber}
          onValidate={() => setPhaseTransitioning(true)}
          onBack={() => setPhase("main")}
        />
        {phaseTransitioning && (
          <ScreenTransition
            label="PRÉ-SAISON"
            color={S.accent}
            onReveal={() => setPhase("preseason")}
            onDone={() => setPhaseTransitioning(false)}
          />
        )}
      </main>
    );
  }

  if (phase === "preseason") {
    return (
      <main style={{ minHeight: "100svh", background: S.bg, color: S.text }} className="flex flex-col overflow-hidden">
        <ProgressPhase
          players={squad}
          boost={getTrainerBoost(localUpgrades.trainer)}
          onConfirm={(boosted) => onComplete(boosted, localBudget, localUpgrades)}
        />
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100svh", background: S.bg, color: S.text }} className="flex flex-col overflow-hidden">
      <InterSeasonPage
        squad={squad}
        openPositions={openPositions}
        localBudget={localBudget}
        localUpgrades={localUpgrades}
        hasInvested={hasInvested}
        catalog={catalog}
        ratingCap={ratingCap}
        seasonNumber={seasonNumber}
        purchasedNames={new Set(purchases.map(p => p.player.name))}
        onSell={handleSell}
        onBuy={handleBuy}
        onUpgrade={handleUpgrade}
        onReset={handleReset}
        onNext={() => setPhase("recap")}
      />
    </main>
  );
}

/* ── InterSeasonPage ──────────────────────────────────────────────── */

interface InterSeasonPageProps {
  squad: Player[];
  openPositions: string[];
  localBudget: number;
  localUpgrades: UpgradeGrades;
  hasInvested: number;
  catalog: CatalogPlayer[];
  ratingCap: number;
  seasonNumber: number;
  purchasedNames: Set<string>;
  onSell: (idx: number) => void;
  onBuy: (cp: CatalogPlayer) => void;
  onUpgrade: (upgrade: ClubUpgrade) => void;
  onReset: () => void;
  onNext: () => void;
}

function InterSeasonPage({
  squad, openPositions, localBudget, localUpgrades, hasInvested,
  catalog, ratingCap, seasonNumber, purchasedNames,
  onSell, onBuy, onUpgrade, onReset, onNext,
}: InterSeasonPageProps) {
  const [activeTab, setActiveTab] = useState<"ventes" | "achats" | "club">("club");
  const [resetKey, setResetKey]   = useState(0);

  function handleReset() {
    onReset();
    setResetKey(k => k + 1);
    setActiveTab("club");
  }

  const canProceed    = squad.length === 15 && openPositions.length === 0;
  const budgetNeg     = localBudget < 0;
  const openCount     = openPositions.length;

  return (
    <div className="flex flex-col" style={{ height: "100svh" }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 px-5 py-3.5"
        style={{ borderBottom: `1px solid ${S.border}` }}
      >
        <div className="flex items-center justify-between">
          {/* Brand + season */}
          <div className="flex items-center gap-3">
            <span className="font-black text-2xl tracking-tighter" style={{ color: S.text }}>
              26<span style={{ color: S.accent }}>-</span>0
            </span>
            <div style={{ width: 1, height: 24, background: S.border }} />
            <div>
              <p style={{ color: S.faint, fontSize: 8, fontWeight: 700, letterSpacing: "0.35em", textTransform: "uppercase" }}>
                Inter-saison
              </p>
              <p style={{ color: S.accent, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Saison {seasonNumber}
              </p>
            </div>
          </div>

          {/* Budget + effectif */}
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p style={{ color: S.faint, fontSize: 8, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 2 }}>
                Budget
              </p>
              <p style={{ color: budgetNeg ? "#F87171" : S.accent, fontSize: 13, fontWeight: 900 }}>
                {formatBudget(localBudget)}
              </p>
            </div>
            <div className="text-right">
              <p style={{ color: S.faint, fontSize: 8, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 2 }}>
                Effectif
              </p>
              <p style={{ color: squad.length === 15 && openCount === 0 ? S.accent : "#F87171", fontSize: 13, fontWeight: 900 }}>
                {squad.length}<span style={{ color: S.faint, fontSize: 9 }}>/15</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      {(() => {
        const transfersLocked = seasonNumber < 3;
        return (
          <>
            <div className="flex flex-shrink-0" style={{ borderBottom: `1px solid ${S.border}` }}>
              {(["club", "ventes", "achats"] as const).map(tab => {
                const locked = transfersLocked && (tab === "ventes" || tab === "achats");
                return (
                  <button
                    key={tab}
                    onClick={() => !locked && setActiveTab(tab)}
                    style={{
                      flex: 1, padding: "11px 0",
                      fontSize: 10, fontWeight: 900,
                      textTransform: "uppercase", letterSpacing: "0.2em",
                      color: locked ? S.faint : activeTab === tab ? S.accent : S.muted,
                      borderBottom: activeTab === tab ? `2px solid ${S.accent}` : "2px solid transparent",
                      background: "transparent",
                      cursor: locked ? "default" : "pointer",
                      transition: "color 0.15s",
                    }}
                  >
                    {tab === "ventes" ? (locked ? "Ventes (dispo S3)" : "Ventes") : tab === "achats" ? (locked ? "Achats (dispo S3)" : "Achats") : "Mon Club"}
                  </button>
                );
              })}
            </div>

            {/* ── Tab content ─────────────────────────────────────── */}
            <div key={resetKey} className="flex-1 overflow-y-auto">
              {activeTab === "ventes" && !transfersLocked && (
                <VentesTab squad={squad} purchasedNames={purchasedNames} onSell={onSell} />
              )}
              {activeTab === "achats" && !transfersLocked && (
                <AchatsTab
                  squad={squad}
                  openPositions={openPositions}
                  localBudget={localBudget}
                  localUpgrades={localUpgrades}
                  catalog={catalog}
                  onBuy={onBuy}
                />
              )}
              {(activeTab === "club" || transfersLocked) && activeTab !== "ventes" && activeTab !== "achats" && (
                <ClubTab
                  localUpgrades={localUpgrades}
                  localBudget={localBudget}
                  hasInvested={hasInvested}
                  seasonNumber={seasonNumber}
                  onUpgrade={onUpgrade}
                />
              )}
              {transfersLocked && (activeTab === "ventes" || activeTab === "achats") && (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <p style={{ color: S.muted, fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 10 }}>
                    Disponible à partir de la saison 3
                  </p>
                  <p style={{ color: S.faint, fontSize: 11, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
                    Les transferts s'ouvrent après ta deuxième saison. Concentre-toi d'abord sur le développement de ton club.
                  </p>
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* ── Bottom bar ────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pb-5 pt-3" style={{ borderTop: `1px solid ${S.border}` }}>
        {!canProceed && (
          <p style={{
            color: openCount > 0 ? "#F87171" : S.faint,
            fontSize: 9, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.2em",
            marginBottom: 10, textAlign: "center",
          }}>
            {openCount > 0
              ? `${openCount} poste${openCount > 1 ? "s" : ""} à pourvoir dans Achats`
              : `${15 - squad.length} joueur${15 - squad.length > 1 ? "s" : ""} manquant${15 - squad.length > 1 ? "s" : ""}`
            }
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            style={{
              padding: "13px 14px",
              border: `1px solid ${S.border}`,
              color: S.muted, fontSize: 9, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.15em",
              background: "transparent",
            }}
            title="Réinitialiser tous les mouvements de l'inter-saison"
          >
            ↺
          </button>
          <button
            onClick={canProceed ? onNext : undefined}
            disabled={!canProceed}
            style={{
              flex: 1, padding: "13px 0",
              background: canProceed ? S.accent : "rgba(143,175,200,0.10)",
              color: canProceed ? S.bg : S.faint,
              fontSize: 11, fontWeight: 900,
              textTransform: "uppercase", letterSpacing: "0.2em",
              border: "none",
              cursor: canProceed ? "pointer" : "not-allowed",
              transition: "background 0.2s, color 0.2s",
            }}
          >
            Passer à la saison suivante →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── VentesTab ────────────────────────────────────────────────────── */

function VentesTab({ squad, purchasedNames, onSell }: { squad: Player[]; purchasedNames: Set<string>; onSell: (idx: number) => void }) {
  const [confirmIdx, setConfirmIdx] = useState<number | null>(null);

  const sorted = [...squad]
    .map((p, i) => ({ player: p, originalIndex: i }))
    .sort((a, b) => POSITION_ORDER.indexOf(a.player.position) - POSITION_ORDER.indexOf(b.player.position));

  return (
    <div>
      <InstructionBox lines={[
        "Libère les joueurs dont tu n'as plus besoin. Les joueurs notés 80 ou moins partent gratuitement.",
        "Au-dessus de 80, leur valeur marchande est créditée sur ton budget.",
        "Attention : chaque poste libéré devra être comblé avant de passer à la saison suivante.",
      ]} />

      {sorted.map(({ player, originalIndex }) => {
        const value        = getMarketValue(player.rating);
        const isFree       = value === 0;
        const isConfirming = confirmIdx === originalIndex;
        const isNewRecruit = purchasedNames.has(player.name);

        return (
          <div
            key={originalIndex}
            style={{
              borderBottom: `1px solid ${S.border}`,
              background: isConfirming ? "rgba(239,68,68,0.07)" : "transparent",
              transition: "background 0.15s",
            }}
          >
            {!isConfirming ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 20px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontWeight: 900, fontSize: 11,
                    textTransform: "uppercase", letterSpacing: "0.06em", color: S.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {abbreviateName(player.name)}
                  </p>
                  <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: S.faint, marginTop: 2 }}>
                    {player.position}
                    {player.club && <span style={{ marginLeft: 5, opacity: 0.6 }}>· {player.club.replace(/\s\d{2}-\d{2}$/, "")}</span>}
                  </p>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: isFree ? S.faint : S.accent, flexShrink: 0, minWidth: 42, textAlign: "right" }}>
                  {isFree ? "Libre" : `+${formatBudget(value)}`}
                </span>
                <PlayerBadge rating={player.rating} />
                {isNewRecruit ? (
                  <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: S.faint, flexShrink: 0 }}>
                    Recrue
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmIdx(originalIndex)}
                    style={{
                      fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em",
                      color: "#F87171", border: "1px solid rgba(239,68,68,0.35)",
                      padding: "5px 9px", background: "transparent", flexShrink: 0,
                    }}
                  >
                    Vendre
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 20px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 900, fontSize: 11, color: "#F87171", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {abbreviateName(player.name)}
                  </p>
                  <p style={{ fontSize: 9, color: S.faint, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                    {isFree ? "Départ libre · 0 €" : `+${formatBudget(value)} sur ton budget`}
                  </p>
                </div>
                <button
                  onClick={() => setConfirmIdx(null)}
                  style={{
                    fontSize: 9, fontWeight: 700, color: S.muted, textTransform: "uppercase",
                    letterSpacing: "0.12em", background: "transparent",
                    padding: "5px 9px", border: `1px solid ${S.border}`, flexShrink: 0,
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => { setConfirmIdx(null); onSell(originalIndex); }}
                  style={{
                    fontSize: 9, fontWeight: 700, color: "#F87171", textTransform: "uppercase",
                    letterSpacing: "0.12em", background: "rgba(239,68,68,0.12)",
                    padding: "5px 9px", border: "1px solid rgba(239,68,68,0.4)", flexShrink: 0,
                  }}
                >
                  Confirmer
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── AchatsTab ────────────────────────────────────────────────────── */

interface AchatsTabProps {
  squad: Player[];
  openPositions: string[];
  localBudget: number;
  localUpgrades: UpgradeGrades;
  catalog: CatalogPlayer[];
  onBuy: (cp: CatalogPlayer) => void;
}

function AchatsTab({ squad, openPositions, localBudget, localUpgrades, catalog, onBuy }: AchatsTabProps) {
  const [confirmCp, setConfirmCp] = useState<CatalogPlayer | null>(null);

  const discount    = getRecruiterDiscount(localUpgrades.recruiter);
  const discountPct = Math.round(discount * 100);

  // All players from the full catalog that are affordable and not already in the squad.
  // Positions without an open slot are excluded — a vacancy must exist first (via Ventes).
  const allCandidates = useMemo(() => {
    const openPosSet = new Set(openPositions);
    return catalog
      .filter(cp => {
        const price = Math.round(getMarketValue(cp.rating) * (1 - discount));
        return (
          openPosSet.has(cp.position) &&
          !squad.some(sp => sp.name === cp.name) &&
          price <= localBudget
        );
      })
      .sort((a, b) => b.rating - a.rating);
  }, [catalog, openPositions, squad, localBudget, discount]);

  const uniqueOpenPos = [...new Set(openPositions)];

  const openPosSummary = POSITION_ORDER
    .filter(pos => uniqueOpenPos.includes(pos))
    .map(pos => {
      const count = openPositions.filter(p => p === pos).length;
      return count > 1 ? `${pos} ×${count}` : pos;
    })
    .join(" · ");

  const instructionLines: string[] = openPositions.length === 0
    ? [
        "Aucun poste à pourvoir pour l'instant.",
        "Rends-toi dans l'onglet Ventes pour libérer un joueur — les candidats apparaîtront ici automatiquement.",
      ]
    : allCandidates.length === 0
      ? [
          `À recruter : ${openPosSummary}.`,
          "Aucun joueur disponible avec ton budget actuel. Vends d'autres joueurs pour augmenter ton budget.",
        ]
      : [
          `À recruter : ${openPosSummary}.`,
          discountPct > 0
            ? `Réduction recruteur −${discountPct} % appliquée. ${allCandidates.length} joueur${allCandidates.length > 1 ? "s" : ""} disponible${allCandidates.length > 1 ? "s" : ""}.`
            : `${allCandidates.length} joueur${allCandidates.length > 1 ? "s" : ""} disponible${allCandidates.length > 1 ? "s" : ""}. Améliore ton recruteur pour obtenir des réductions.`,
        ];

  return (
    <div>
      <InstructionBox lines={instructionLines} />

      {allCandidates.length === 0 ? (
        <div style={{ padding: "24px 20px", textAlign: "center" }}>
          <p style={{ color: S.faint, fontSize: 11 }}>
            {openPositions.length === 0
              ? "Libère un poste dans Ventes pour voir les candidats."
              : "Aucun joueur accessible avec le budget actuel."}
          </p>
        </div>
      ) : (
        allCandidates.map(cp => {
          const price      = Math.round(getMarketValue(cp.rating) * (1 - discount));
          const isFree     = price === 0;
          const isConfirming = confirmCp?.name === cp.name && confirmCp?.clubKey === cp.clubKey;

          return (
            <div
              key={`${cp.clubKey}-${cp.name}`}
              style={{
                borderBottom: `1px solid ${S.border}`,
                background: isConfirming ? "rgba(143,175,200,0.06)" : "transparent",
                transition: "background 0.15s",
              }}
            >
              {!isConfirming ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 900, fontSize: 11, color: S.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {abbreviateName(cp.name)}
                    </p>
                    <p style={{ fontSize: 9, color: S.faint, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                      {cp.position} · {cp.clubName} {cp.season}
                    </p>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: isFree ? S.faint : "#F87171", flexShrink: 0, minWidth: 42, textAlign: "right" }}>
                    {isFree ? "Libre" : `−${formatBudget(price)}`}
                  </span>
                  <PlayerBadge rating={cp.rating} />
                  <button
                    onClick={() => setConfirmCp(cp)}
                    style={{
                      fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em",
                      color: S.accent, border: `1px solid ${S.borderHi}`,
                      padding: "5px 9px", background: "transparent", flexShrink: 0,
                    }}
                  >
                    Recruter
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 900, fontSize: 11, color: S.accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {abbreviateName(cp.name)}
                    </p>
                    <p style={{ fontSize: 9, color: S.faint, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                      {cp.position} · {isFree ? "0 €" : `−${formatBudget(price)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmCp(null)}
                    style={{
                      fontSize: 9, fontWeight: 700, color: S.muted, textTransform: "uppercase",
                      letterSpacing: "0.12em", background: "transparent",
                      padding: "5px 9px", border: `1px solid ${S.border}`, flexShrink: 0,
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => { setConfirmCp(null); onBuy(cp); }}
                    style={{
                      fontSize: 9, fontWeight: 700, color: S.accent, textTransform: "uppercase",
                      letterSpacing: "0.12em", background: "rgba(143,175,200,0.10)",
                      padding: "5px 9px", border: `1px solid ${S.borderHi}`, flexShrink: 0,
                    }}
                  >
                    Confirmer
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ── ClubTab ──────────────────────────────────────────────────────── */

interface ClubTabProps {
  localUpgrades: UpgradeGrades;
  localBudget: number;
  hasInvested: number;
  seasonNumber: number;
  onUpgrade: (upgrade: ClubUpgrade) => void;
}

function ClubTab({ localUpgrades, localBudget, hasInvested, seasonNumber, onUpgrade }: ClubTabProps) {
  const [confirmUpgrade, setConfirmUpgrade] = useState<ClubUpgrade | null>(null);

  const upgradeList: ClubUpgrade[] = ["stadium", "recruiter", "trainer", "marketing", "transport", "mentalCoach"];

  return (
    <div>
      <InstructionBox lines={[
        "Investis dans le développement de ton club pour améliorer tes performances saison après saison.",
        hasInvested >= 2
          ? "Tu as réalisé tes 2 investissements cette inter-saison. Rendez-vous la saison prochaine."
          : hasInvested === 1
          ? `1 investissement réalisé — il t'en reste encore un. Choisis bien.`
          : "Jusqu'à 2 investissements par inter-saison. Les effets sont permanents.",
      ]} />

      <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {upgradeList.map(upgrade => {
          const grade      = localUpgrades[upgrade] as 0 | 1 | 2 | 3;
          const cost       = nextUpgradeCost(upgrade, grade);
          const isMaxed    = grade >= 3;
          const canAfford  = cost !== undefined && localBudget >= cost;
          const lockedUntilS3 = upgrade === "recruiter" && seasonNumber < 3;
          const blocked    = lockedUntilS3 || hasInvested >= 2 || !canAfford || isMaxed;
          const isConfirming = confirmUpgrade === upgrade;
          const description = !isMaxed
            ? UPGRADE_GRADE_DESCRIPTIONS[upgrade][grade as 0 | 1 | 2]
            : "Niveau maximum atteint";

          return (
            <div
              key={upgrade}
              style={{
                border: `1px solid ${isMaxed ? "rgba(143,175,200,0.06)" : S.border}`,
                background: isConfirming ? "rgba(143,175,200,0.06)" : S.bgCard,
                padding: "14px 16px",
                transition: "background 0.15s",
              }}
            >
              {/* Name + grade bars */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <p style={{ color: isMaxed || lockedUntilS3 ? S.faint : S.text, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {UPGRADE_LABELS[upgrade]}
                    {lockedUntilS3 && <span style={{ fontSize: 9, fontWeight: 700, marginLeft: 6, letterSpacing: "0.15em" }}>(dispo S3)</span>}
                  </p>
                  <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
                    {[0, 1, 2].map(g => (
                      <span
                        key={g}
                        style={{
                          display: "inline-block", width: 20, height: 3,
                          background: g < grade ? S.accent : "rgba(143,175,200,0.15)",
                          transition: "background 0.25s",
                        }}
                      />
                    ))}
                  </div>
                </div>
                {isMaxed ? (
                  <span style={{ fontSize: 9, fontWeight: 700, color: S.faint, textTransform: "uppercase", letterSpacing: "0.2em" }}>
                    Max
                  </span>
                ) : (
                  cost !== undefined && (
                    <span style={{ fontSize: 12, fontWeight: 900, color: canAfford ? S.accent : S.faint }}>
                      {formatBudget(cost)}
                    </span>
                  )
                )}
              </div>

              {/* Effect description */}
              <p style={{ fontSize: 10, color: isMaxed ? S.faint : S.muted, lineHeight: 1.55 }}>
                {description}
              </p>

              {/* Status / action */}
              {!isMaxed && !isConfirming && (
                <>
                  {!blocked ? (
                    <button
                      onClick={() => setConfirmUpgrade(upgrade)}
                      style={{
                        width: "100%", marginTop: 10,
                        padding: "8px 0", background: "transparent",
                        border: `1px solid ${S.borderHi}`,
                        color: S.accent, fontSize: 9, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.2em",
                      }}
                    >
                      Investir {cost !== undefined ? formatBudget(cost) : ""} →
                    </button>
                  ) : (
                    <p style={{ fontSize: 9, color: S.faint, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                      {hasInvested ? "Déjà investi cette saison" : "Budget insuffisant"}
                    </p>
                  )}
                </>
              )}

              {isConfirming && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => setConfirmUpgrade(null)}
                    style={{
                      flex: 1, padding: "8px 0", background: "transparent",
                      border: `1px solid ${S.border}`,
                      color: S.muted, fontSize: 9, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.15em",
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => { setConfirmUpgrade(null); onUpgrade(upgrade); }}
                    style={{
                      flex: 2, padding: "8px 0",
                      background: "rgba(143,175,200,0.12)",
                      border: `1px solid ${S.borderHi}`,
                      color: S.accent, fontSize: 9, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.15em",
                    }}
                  >
                    Confirmer l&apos;investissement
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── ProgressPhase ────────────────────────────────────────────────── */

function ProgressPhase({ players, boost, onConfirm }: {
  players: Player[];
  boost: number;
  onConfirm: (players: Player[]) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const sorted = [...players]
    .map((p, i) => ({ player: p, originalIndex: i }))
    .sort((a, b) => POSITION_ORDER.indexOf(a.player.position) - POSITION_ORDER.indexOf(b.player.position));

  function handleConfirm() {
    if (selectedIndex === null) { onConfirm(players); return; }
    onConfirm(players.map((p, i) => i === selectedIndex ? { ...p, rating: Math.min(99, p.rating + boost) } : p));
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "100svh" }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${S.border}` }} className="px-5 lg:px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-black text-2xl tracking-tighter" style={{ color: S.text }}>
            26<span style={{ color: S.accent }}>-</span>0
          </span>
          <div style={{ width: 1, height: 28, background: S.border }} />
          <div>
            <p style={{ color: S.accent, fontSize: 8, fontWeight: 700, letterSpacing: "0.35em", textTransform: "uppercase" }}>Pré-saison</p>
            <p style={{ color: S.text, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>Stage d&apos;entraînement</p>
          </div>
        </div>
      </header>

      <InstructionBox lines={[
        `Choisis un joueur pour lui faire suivre un stage intensif. Il gagne +${boost} points de note.`,
        "Maximum atteignable : 99. Appuie sur Lancer la saison si tu ne veux booster personne.",
      ]} />

      <div className="flex-1 overflow-y-auto">
        {sorted.map(({ player, originalIndex }) => {
          const isSelected    = selectedIndex === originalIndex;
          const blocked       = player.rating >= 98;
          const displayRating = isSelected ? Math.min(99, player.rating + boost) : player.rating;
          return (
            <button
              key={originalIndex}
              onClick={() => !blocked && setSelectedIndex(isSelected ? null : originalIndex)}
              disabled={blocked}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 20px", borderBottom: `1px solid ${S.border}`,
                background: isSelected ? "rgba(143,175,200,0.07)" : "transparent",
                opacity: blocked ? 0.3 : 1,
                cursor: blocked ? "not-allowed" : "pointer",
                textAlign: "left", transition: "background 0.15s",
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
                  <span style={{ color: S.accent, fontSize: 9, fontWeight: 900, letterSpacing: "0.15em" }}>+{boost}</span>
                )}
                <PlayerBadge rating={displayRating} />
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ flexShrink: 0, padding: "16px 20px", borderTop: `1px solid ${S.border}` }}>
        <button
          onClick={handleConfirm}
          style={{ background: S.accent, color: S.bg, width: "100%" }}
          className="font-black uppercase tracking-[0.2em] text-sm py-4 transition-opacity hover:opacity-85"
        >
          {selectedIndex === null ? "Lancer la saison →" : "Confirmer →"}
        </button>
      </div>
    </div>
  );
}

/* ── Shared UI ────────────────────────────────────────────────────── */

function PlayerBadge({ rating }: { rating: number }) {
  const tier   = rating >= 90 ? 3 : rating >= 85 ? 2 : 1;
  const bg     = tier === 3 ? "#FFFFFF" : tier === 2 ? "#D4AF37" : "#0D0D0D";
  const fg     = tier === 2 ? "#000000" : "#D4AF37";
  const border = tier === 3 ? "2px solid #D4AF37" : "none";
  return (
    <span style={{ background: bg, color: fg, border, padding: "1px 6px", fontSize: 10, fontWeight: 900, lineHeight: "16px", flexShrink: 0 }}>
      {rating}
    </span>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div style={{ padding: "8px 20px 6px", borderBottom: `1px solid ${S.border}` }}>
      <p style={{ color: S.accent, fontSize: 8, fontWeight: 700, letterSpacing: "0.4em", textTransform: "uppercase" }}>
        {label}
      </p>
    </div>
  );
}

/* ── RecapInterSaison ─────────────────────────────────────────────── */

interface RecapInterSaisonProps {
  sales: { player: Player; value: number }[];
  purchases: { player: Player; price: number }[];
  upgradesPurchased: { key: ClubUpgrade; grade: number }[];
  budgetBefore: number;
  budgetAfter: number;
  seasonNumber: number;
  onValidate: () => void;
  onBack: () => void;
}

function RecapInterSaison({
  sales, purchases, upgradesPurchased,
  budgetBefore, budgetAfter, seasonNumber,
  onValidate, onBack,
}: RecapInterSaisonProps) {
  const hasChanges = sales.length > 0 || purchases.length > 0 || upgradesPurchased.length > 0;

  return (
    <div className="flex flex-col" style={{ height: "100svh" }}>
      {/* Header */}
      <header className="flex-shrink-0 px-5 py-3.5" style={{ borderBottom: `1px solid ${S.border}` }}>
        <div className="flex items-center gap-3">
          <span className="font-black text-2xl tracking-tighter" style={{ color: S.text }}>
            26<span style={{ color: S.accent }}>-</span>0
          </span>
          <div style={{ width: 1, height: 24, background: S.border }} />
          <div>
            <p style={{ color: S.faint, fontSize: 8, fontWeight: 700, letterSpacing: "0.35em", textTransform: "uppercase" }}>
              Inter-saison · S{seasonNumber}
            </p>
            <p style={{ color: S.accent, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Récapitulatif
            </p>
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {!hasChanges ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <p style={{ color: S.muted, fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em" }}>
              Aucune modification
            </p>
            <p style={{ color: S.faint, fontSize: 11, marginTop: 10, lineHeight: 1.6 }}>
              Tu passes à la prochaine saison avec le même effectif.
            </p>
          </div>
        ) : (
          <>
            {/* Départs */}
            {sales.length > 0 && (
              <div>
                <SectionTitle label={`Départs · ${sales.length}`} />
                {sales.map(({ player, value }, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: `1px solid ${S.border}` }}>
                    <span style={{ color: "#F87171", fontSize: 10, fontWeight: 900, width: 14, flexShrink: 0 }}>✕</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 900, fontSize: 11, color: S.muted, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {abbreviateName(player.name)}
                      </p>
                      <p style={{ fontSize: 9, color: S.faint, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.2em" }}>
                        {player.position}
                      </p>
                    </div>
                    <PlayerBadge rating={player.rating} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: value > 0 ? S.accent : S.faint, minWidth: 52, textAlign: "right", flexShrink: 0 }}>
                      {value > 0 ? `+${formatBudget(value)}` : "Libre"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Arrivées */}
            {purchases.length > 0 && (
              <div>
                <SectionTitle label={`Arrivées · ${purchases.length}`} />
                {purchases.map(({ player, price }, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: `1px solid ${S.border}` }}>
                    <span style={{ color: S.accent, fontSize: 10, fontWeight: 900, width: 14, flexShrink: 0 }}>✓</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 900, fontSize: 11, color: S.text, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {abbreviateName(player.name)}
                      </p>
                      <p style={{ fontSize: 9, color: S.faint, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.2em" }}>
                        {player.position}{player.club ? ` · ${player.club.replace(/\s\d{2}-\d{2}$/, "")}` : ""}
                      </p>
                    </div>
                    <PlayerBadge rating={player.rating} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: price > 0 ? "#F87171" : S.faint, minWidth: 52, textAlign: "right", flexShrink: 0 }}>
                      {price > 0 ? `−${formatBudget(price)}` : "Libre"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Investissements club */}
            {upgradesPurchased.length > 0 && (
              <div>
                <SectionTitle label={`Investissement${upgradesPurchased.length > 1 ? "s" : ""} club · ${upgradesPurchased.length}`} />
                {upgradesPurchased.map(({ key, grade }) => (
                  <div key={key} style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}` }}>
                    <p style={{ fontWeight: 900, fontSize: 11, color: S.text, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {UPGRADE_LABELS[key]}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                      {[0, 1, 2].map(g => (
                        <span key={g} style={{ display: "inline-block", width: 20, height: 3, background: g < grade ? S.accent : "rgba(143,175,200,0.15)" }} />
                      ))}
                      <span style={{ color: S.faint, fontSize: 9, marginLeft: 8 }}>Grade {grade}</span>
                    </div>
                    <p style={{ fontSize: 10, color: S.muted, marginTop: 7, lineHeight: 1.5 }}>
                      {UPGRADE_GRADE_DESCRIPTIONS[key][(grade - 1) as 0 | 1 | 2]}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Bilan budgétaire — always shown */}
        <div style={{ borderTop: hasChanges ? `1px solid ${S.border}` : "none" }}>
          <SectionTitle label="Bilan budgétaire" />
          <div style={{ padding: "10px 20px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ color: S.faint, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em" }}>Avant</span>
              <span style={{ color: S.muted, fontSize: 11, fontWeight: 700 }}>{formatBudget(budgetBefore)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ color: S.accent, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700 }}>Après</span>
              <span style={{ color: budgetAfter < 0 ? "#F87171" : S.accent, fontSize: 14, fontWeight: 900 }}>
                {formatBudget(budgetAfter)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-shrink-0 px-5 pb-5 pt-3" style={{ borderTop: `1px solid ${S.border}` }}>
        <button
          onClick={onBack}
          style={{
            flex: 1, padding: "13px 0",
            border: `1px solid ${S.border}`,
            color: S.muted, fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.15em",
            background: "transparent",
          }}
        >
          ← Retour
        </button>
        <button
          onClick={onValidate}
          style={{
            flex: 2, padding: "13px 0",
            background: S.accent, color: S.bg,
            fontSize: 11, fontWeight: 900,
            textTransform: "uppercase", letterSpacing: "0.2em",
            border: "none", cursor: "pointer",
          }}
        >
          Valider →
        </button>
      </div>
    </div>
  );
}

function InstructionBox({ lines }: { lines: string[] }) {
  return (
    <div style={{
      background: S.bgCard, border: `1px solid ${S.border}`,
      borderLeft: `3px solid ${S.accent}`,
      margin: "12px 20px", padding: "10px 14px", flexShrink: 0,
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
