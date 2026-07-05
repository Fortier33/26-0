import { fieldPositions } from "@/lib/data";
import type { Player } from "@/lib/types";

const HEX = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

const SLOT_JERSEY: Record<string, number> = {
  "Arrière": 15,
  "Ailier 1": 11, "Ailier 2": 14,
  "Centre 1": 12, "Centre 2": 13,
  "Ouvreur": 10, "Demi de mêlée": 9,
  "3e ligne 1": 6, "3e ligne 2": 7, "Numéro 8": 8,
  "2e ligne 1": 4, "2e ligne 2": 5,
  "Pilier gauche": 1, "Talonneur": 2, "Pilier droit": 3,
};

const SLOT_SHORT: Record<string, string> = {
  "Arrière": "ARR",
  "Ailier 1": "AIL", "Ailier 2": "AIL",
  "Centre 1": "CTR", "Centre 2": "CTR",
  "Ouvreur": "OUV", "Demi de mêlée": "½MEL",
  "3e ligne 1": "3eL", "3e ligne 2": "3eL", "Numéro 8": "N°8",
  "2e ligne 1": "2eL", "2e ligne 2": "2eL",
  "Pilier gauche": "PIL G", "Talonneur": "TALON", "Pilier droit": "PIL D",
};

interface FieldProps {
  selectedPlayers: Player[];
  compact?: boolean;
}

export function Field({ selectedPlayers, compact = false }: FieldProps) {
  const height = compact ? "h-[520px] w-[340px]" : "h-[calc(100dvh-170px)] max-h-[560px] min-h-[380px] w-full";
  const W = compact ? 50 : 48;
  const H = compact ? 58 : 56;
  const available = W - 14;

  // Unified font sizes: smallest across all selected players so every hex looks the same
  const lastSizes = selectedPlayers.map((p) => {
    const last = p.name.split(" ").pop() ?? "";
    return Math.min(10, Math.max(5, Math.floor(available / (last.length * 0.55))));
  });
  const uLastSize = lastSizes.length > 0 ? Math.min(...lastSizes) : 7;

  return (
    <div
      className={`relative ${height} overflow-hidden`}
      style={{
        background:
          "radial-gradient(ellipse 110% 85% at 50% 48%, #1E6B2E 0%, #145220 38%, #0C3A16 65%, #071A0C 100%)",
      }}
    >
      {/* Mowed grass stripes */}
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0"
          style={{
            top: `${(i / 14) * 100}%`,
            height: `${100 / 14}%`,
            background: i % 2 === 0 ? "rgba(0,0,0,0.055)" : "transparent",
          }}
        />
      ))}

      {/* Field lines */}
      {/* Outer boundary */}
      <div
        className="absolute"
        style={{ inset: "3% 5%", border: "1px solid rgba(255,255,255,0.22)" }}
      />
      {/* In-goal / try lines */}
      <div
        className="absolute"
        style={{
          left: "5%", right: "5%", top: "11%",
          height: 1, background: "rgba(255,255,255,0.22)",
        }}
      />
      <div
        className="absolute"
        style={{
          left: "5%", right: "5%", bottom: "11%",
          height: 1, background: "rgba(255,255,255,0.22)",
        }}
      />
      {/* 22m lines */}
      <div
        className="absolute"
        style={{
          left: "5%", right: "5%", top: "28%",
          height: 1, background: "rgba(255,255,255,0.13)",
        }}
      />
      <div
        className="absolute"
        style={{
          left: "5%", right: "5%", bottom: "28%",
          height: 1, background: "rgba(255,255,255,0.13)",
        }}
      />
      {/* Halfway — brighter */}
      <div
        className="absolute"
        style={{
          left: "5%", right: "5%", top: "50%",
          height: 1, background: "rgba(255,255,255,0.30)",
          marginTop: -0.5,
        }}
      />
      {/* Kickoff spot */}
      <div
        className="absolute rounded-full"
        style={{
          left: "50%", top: "50%",
          width: 6, height: 6,
          marginLeft: -3, marginTop: -3,
          border: "1px solid rgba(255,255,255,0.22)",
        }}
      />

      {/* Player badges */}
      {(() => {
        const usedPlayers: Player[] = [];
        return Object.entries(fieldPositions).map(([slot, coords]) => {
          const player = selectedPlayers.find((p) => {
            if (usedPlayers.includes(p)) return false;
            if (p.position === coords.position) {
              usedPlayers.push(p);
              return true;
            }
            return false;
          });

          return (
            <div
              key={slot}
              className="absolute"
              style={{
                top: coords.top,
                left: coords.left,
                transform: "translate(-50%, -50%)",
              }}
            >
              <PlayerHex
                player={player}
                jersey={SLOT_JERSEY[slot]}
                label={SLOT_SHORT[slot] ?? slot}
                W={W}
                H={H}
                lastSize={uLastSize}
              />
            </div>
          );
        });
      })()}
    </div>
  );
}

function PlayerHex({
  player,
  jersey,
  label,
  W,
  H,
  lastSize,
}: {
  player?: Player;
  jersey?: number;
  label: string;
  W: number;
  H: number;
  lastSize: number;
}) {
  if (player) {
    const last = player.name.split(" ").at(-1) ?? player.name;
    const tier = player.rating >= 90 ? 3 : player.rating >= 85 ? 2 : 1;

    const shadow =
      tier === 3 ? "drop-shadow(0 4px 14px rgba(212,175,55,0.8))"
      : tier === 2 ? "drop-shadow(0 3px 10px rgba(212,175,55,0.5))"
      : "drop-shadow(0 2px 6px rgba(0,0,0,0.6))";

    const borderBg =
      tier === 2 ? "#0D0D0D" : "#D4AF37";

    const fillBg =
      tier === 3 ? "#FFFFFF"
      : tier === 2 ? "linear-gradient(155deg, #EDCC5A 0%, #C49820 100%)"
      : "#0D0D0D";

    const nameColor =
      tier === 2 ? "rgba(0,0,0,0.92)" : "#D4AF37";

    const ratingColor =
      tier === 2 ? "rgba(0,0,0,0.48)" : "rgba(212,175,55,0.65)";

    return (
      <div
        style={{
          position: "relative",
          width: W,
          height: H,
          filter: shadow,
        }}
      >
        {/* Border hex */}
        <div
          style={{
            position: "absolute", inset: 0,
            clipPath: HEX,
            background: borderBg,
          }}
        />
        {/* Fill hex */}
        <div
          style={{
            position: "absolute", inset: 2,
            clipPath: HEX,
            background: fillBg,
          }}
        />
        {/* Text */}
        <div
          style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 1, padding: "0 7px",
          }}
        >
          <span
            style={{
              color: nameColor,
              fontSize: lastSize, fontWeight: 900, lineHeight: 1.15,
              textTransform: "uppercase", letterSpacing: "0.01em",
              textAlign: "center", maxWidth: W - 8,
              overflow: "hidden", whiteSpace: "nowrap",
            }}
          >
            {last}
          </span>
          <span
            style={{
              color: ratingColor,
              fontSize: 7, fontWeight: 800, lineHeight: 1,
              marginTop: 1,
            }}
          >
            {player.rating}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: W, height: H }}>
      {/* Ghost border */}
      <div
        style={{
          position: "absolute", inset: 0,
          clipPath: HEX,
          background: "rgba(255,255,255,0.09)",
        }}
      />
      {/* Ghost fill */}
      <div
        style={{
          position: "absolute", inset: 2,
          clipPath: HEX,
          background: "rgba(0,0,0,0.22)",
        }}
      />
      {/* Content */}
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 2,
        }}
      >
        {jersey !== undefined && (
          <span
            style={{
              color: "rgba(255,255,255,0.28)",
              fontSize: 15, fontWeight: 900, lineHeight: 1,
            }}
          >
            {jersey}
          </span>
        )}
        <span
          style={{
            color: "rgba(255,255,255,0.18)",
            fontSize: 6.5, fontWeight: 700,
            letterSpacing: "0.07em", textTransform: "uppercase",
            textAlign: "center", maxWidth: W - 10,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
