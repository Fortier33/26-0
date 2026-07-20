"use client";

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

interface Props {
  myTeamName: string;
  onChangeTeamName: (name: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function CareerHomeScreen({ myTeamName, onChangeTeamName, onContinue, onBack }: Props) {
  return (
    <main style={{ minHeight: "100svh", background: S.bg, color: S.text, display: "flex", alignItems: "flex-start" }}>
      <div style={{ maxWidth: 520, width: "100%", padding: "48px 24px 48px", margin: "0 auto" }}>

        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: S.faint, fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.35em",
            marginBottom: 40, display: "flex", alignItems: "center", gap: 8,
            padding: 0,
          }}
        >
          ← Retour
        </button>

        {/* Label */}
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.45em", color: S.accent, marginBottom: 20 }}>
          Mode Carrière
        </p>

        {/* Title */}
        <h1 style={{ fontSize: "clamp(44px, 10vw, 72px)", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 24, color: S.text }}>
          Construis<br />ta Dynastie
        </h1>

        {/* Description */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40, maxWidth: 400 }}>
          <p style={{ fontSize: 16, fontWeight: 900, color: S.text, lineHeight: 1.4 }}>
            Une équipe tirée au sort. Des saisons à enchaîner.
          </p>
          <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.65 }}>
            Tu reçois un effectif composé de joueurs historiques du Top 14, avec parmi eux des légendes (≥ 90) et des titulaires solides. À toi de faire évoluer ce groupe saison après saison.
          </p>
          <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.65 }}>
            Entre chaque saison, vends, recrute et investis dans ton club. L'objectif ultime : <span style={{ color: S.text, fontWeight: 700 }}>devenir le meilleur manager de l'histoire</span> avec un bilan parfait de 26-0.
          </p>
        </div>

        {/* Highlights */}
        <div style={{ display: "flex", gap: 20, marginBottom: 40 }}>
          {[
            { value: "2+", label: "Légendes min." },
            { value: "∞", label: "Saisons" },
            { value: "26-0", label: "L'objectif" },
          ].map(({ value, label }) => (
            <div key={label} style={{ flex: 1, borderTop: `1px solid ${S.border}`, paddingTop: 12 }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: S.accent, lineHeight: 1, marginBottom: 4 }}>{value}</p>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.25em", color: S.faint }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Team name */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em", color: S.accent, marginBottom: 10 }}>
            Nom de ton équipe
          </label>
          <div style={{ borderBottom: `1px solid ${S.borderHi}` }}>
            <input
              type="text"
              value={myTeamName}
              onChange={(e) => onChangeTeamName(e.target.value)}
              placeholder="Mon XV"
              style={{
                width: "100%", background: "transparent",
                border: "none", outline: "none",
                color: S.text, fontSize: 20, fontWeight: 700,
                padding: "12px 0",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onContinue}
          disabled={!myTeamName.trim()}
          style={{
            width: "100%", padding: "16px 24px",
            background: myTeamName.trim() ? S.accent : "rgba(143,175,200,0.15)",
            border: "none", cursor: myTeamName.trim() ? "pointer" : "not-allowed",
            color: myTeamName.trim() ? "#04060F" : S.faint,
            fontWeight: 900, fontSize: 13,
            textTransform: "uppercase", letterSpacing: "0.22em",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            transition: "background 0.2s, color 0.2s",
          }}
        >
          <span>Révéler mon équipe</span>
          <span>→</span>
        </button>

      </div>
    </main>
  );
}
