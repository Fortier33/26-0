"use client";

interface HomeScreenProps {
  onStartDraft: () => void;
  onStartCareer: () => void;
  onStartFriends: () => void;
}

export function HomeScreen({ onStartDraft, onStartCareer, onStartFriends }: HomeScreenProps) {
  return (
    <main className="min-h-screen bg-c-bg text-c-fg flex items-start lg:items-center px-6 lg:px-20">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center py-10 lg:py-16">

        <section>
          <p className="text-c-gold uppercase tracking-[0.45em] text-[10px] font-bold mb-6 lg:mb-8">
            Top 14
          </p>

          <h1 className="text-[96px] sm:text-[140px] lg:text-[190px] font-black leading-none mb-4 lg:mb-6 select-none">
            26<span className="text-c-gold mx-3 lg:mx-8">-</span>0
          </h1>

          <h2 className="text-2xl lg:text-[38px] font-black leading-tight mb-3 lg:mb-4 text-c-fg">
            Le défi ultime
            <br />du rugby français.
          </h2>

          <div className="mb-8 lg:mb-10 max-w-md space-y-3">
            <p className="text-[var(--c-muted)] text-sm lg:text-base leading-relaxed">
              Mène ton équipe au <span className="text-c-gold font-bold">Bouclier de Brennus</span> avec
              un bilan parfait — <span className="text-c-fg font-bold">26 victoires, 0 défaite</span>.
              Deux façons de relever le défi :
            </p>
            <p className="text-[var(--c-muted)] text-sm lg:text-base leading-relaxed">
              <span className="text-c-fg font-bold">— Mode Draft :</span> Choisis tes joueurs poste par poste parmi toutes les équipes du Top 14 depuis 2005 et tente de gagner le championnat dès la 1ère saison.
            </p>
            <p className="text-[var(--c-muted)] text-sm lg:text-base leading-relaxed">
              <span className="text-c-fg font-bold">— Mode Carrière :</span> Récupère une équipe composée de joueurs historiques du championnat et construis ta dynastie saison après saison pour devenir le meilleur manager de l&apos;histoire.
            </p>
            <p className="text-[var(--c-muted)] text-sm lg:text-base leading-relaxed">
              <span className="text-c-fg font-bold">— Playoffs entre amis :</span> De 2 à 6 joueurs. Composez vos effectifs chacun votre tour et tentez de battre vos amis sur le format play-offs. Il n&apos;en restera qu&apos;un !
            </p>
          </div>

          {/* Mode selection */}
          <div className="space-y-3">
            <button
              onClick={onStartDraft}
              className="group w-full bg-c-gold text-black font-black uppercase tracking-[0.2em] text-sm px-8 py-4 hover:bg-[#F5F0E8] transition-colors flex items-center justify-between"
            >
              <span>Saison unique</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>

            <button
              onClick={onStartCareer}
              style={{
                width: "100%", padding: "16px 32px",
                background: "transparent", border: "1px solid #8FAFC8", cursor: "pointer",
                color: "#8FAFC8", fontWeight: 900, fontSize: 13,
                textTransform: "uppercase", letterSpacing: "0.2em",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "background 0.2s, color 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#8FAFC8"; e.currentTarget.style.color = "#04060F"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8FAFC8"; }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                Mode Carrière
                <span style={{
                  fontSize: 8, fontWeight: 900, letterSpacing: "0.2em",
                  border: "1px solid currentColor", padding: "2px 6px", lineHeight: 1,
                }}>
                  Nouveau
                </span>
              </span>
              <span>→</span>
            </button>

            <button
              onClick={onStartFriends}
              style={{
                width: "100%", padding: "16px 32px",
                background: "transparent", border: "1px solid #4AD98A", cursor: "pointer",
                color: "#4AD98A", fontWeight: 900, fontSize: 13,
                textTransform: "uppercase", letterSpacing: "0.2em",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "background 0.2s, color 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#4AD98A"; e.currentTarget.style.color = "#04060F"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#4AD98A"; }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                Playoffs entre amis
                <span style={{
                  fontSize: 8, fontWeight: 900, letterSpacing: "0.2em",
                  border: "1px solid currentColor", padding: "2px 6px", lineHeight: 1,
                }}>
                  Nouveau
                </span>
              </span>
              <span>→</span>
            </button>
          </div>

        </section>

        <section className="hidden lg:flex justify-center items-center">
          <TerrainPreview />
        </section>

      </div>
    </main>
  );
}

function TerrainPreview() {
  return (
    <div className="relative w-[340px] h-[520px] border border-c-gold/25 bg-c-surface overflow-hidden">
      <div className="absolute inset-8 border border-c-gold/10" />
      <div className="absolute left-8 right-8 h-px bg-c-gold/15" style={{ top: "21%" }} />
      <div className="absolute left-8 right-8 h-px bg-c-gold/10" style={{ top: "34%" }} />
      <div className="absolute left-8 right-8 h-px" style={{ top: "43%", background: "var(--color-c-gold)", opacity: 0.08 }} />
      <div className="absolute left-8 right-8 h-px bg-c-gold/15" style={{ top: "50%" }} />
      <div className="absolute left-8 right-8 h-px" style={{ top: "57%", background: "var(--color-c-gold)", opacity: 0.08 }} />
      <div className="absolute left-8 right-8 h-px bg-c-gold/10" style={{ top: "66%" }} />
      <div className="absolute left-8 right-8 h-px bg-c-gold/15" style={{ top: "79%" }} />
      <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-c-gold/20 to-transparent" />
      <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-c-gold/20 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-10">
        <div className="text-center">
          <p className="text-c-gold font-black text-6xl tracking-tighter mb-1">TOP 14</p>
          <p className="text-[var(--c-faint)] uppercase tracking-[0.4em] text-[9px]">Top 14</p>
        </div>
        <div className="border border-c-gold/30 px-8 py-2">
          <p className="text-c-gold font-black uppercase tracking-[0.4em] text-xs">Draft</p>
        </div>
      </div>
    </div>
  );
}
