"use client";

interface HomeScreenProps {
  myTeamName: string;
  onChangeTeamName: (name: string) => void;
  onStartDraft: () => void;
}

export function HomeScreen({ myTeamName, onChangeTeamName, onStartDraft }: HomeScreenProps) {
  return (
    <main className="min-h-screen bg-c-bg text-c-fg flex items-start lg:items-center px-6 lg:px-20">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center py-10 lg:py-16">

        <section>
          <p className="text-c-gold uppercase tracking-[0.45em] text-[10px] font-bold mb-6 lg:mb-8">
            Draft Top 14 · 2025 — 2026
          </p>

          <h1 className="text-[96px] sm:text-[140px] lg:text-[190px] font-black leading-none mb-4 lg:mb-6 select-none">
            26<span className="text-c-gold mx-3 lg:mx-8">-</span>0
          </h1>

          <h2 className="text-2xl lg:text-[42px] font-black leading-tight mb-4 lg:mb-6 text-c-fg">
            Prêt à remporter
            <br />le Bouclier ?
          </h2>

          <p className="text-[var(--c-muted)] max-w-md mb-8 lg:mb-12 leading-relaxed text-[14px] lg:text-[15px]">
            Construis ton XV de légende. Sélectionne tes joueurs parmi les meilleurs équipes du Top 14 de l'histoire. Tente de remporter les 26 matchs de la saison, ainsi que les play-offs !
          </p>

          <div className="mb-8 lg:mb-10">
            <label className="block text-c-gold uppercase tracking-[0.3em] text-[10px] font-bold mb-3">
              Nom de ton équipe
            </label>
            <div className="border-b border-c-gold/50 focus-within:border-c-gold transition-colors">
              <input
                type="text"
                value={myTeamName}
                onChange={(e) => onChangeTeamName(e.target.value)}
                placeholder="Mon XV"
                className="w-full bg-transparent text-c-fg text-xl font-bold py-3 placeholder:text-[var(--c-faint)] focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={onStartDraft}
            className="group w-full sm:w-auto bg-c-gold text-black font-black uppercase tracking-[0.2em] text-sm px-12 py-4 hover:bg-[#F5F0E8] transition-colors"
          >
            Jouer maintenant
            <span className="inline-block ml-3 group-hover:translate-x-1 transition-transform">→</span>
          </button>

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
          <p className="text-[var(--c-faint)] uppercase tracking-[0.4em] text-[9px]">Saison 2025-2026</p>
        </div>
        <div className="border border-c-gold/30 px-8 py-2">
          <p className="text-c-gold font-black uppercase tracking-[0.4em] text-xs">Draft</p>
        </div>
      </div>
    </div>
  );
}
