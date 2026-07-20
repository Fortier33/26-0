"use client";

interface Props {
  myTeamName: string;
  onChangeTeamName: (name: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function DraftHomeScreen({ myTeamName, onChangeTeamName, onContinue, onBack }: Props) {
  return (
    <main className="min-h-screen bg-c-bg text-c-fg flex items-start lg:items-center px-6 lg:px-20">
      <div className="max-w-lg w-full py-12 lg:py-20">

        <button
          onClick={onBack}
          className="text-[var(--c-muted)] hover:text-c-fg text-[10px] uppercase tracking-[0.35em] font-bold mb-10 transition-colors flex items-center gap-2"
        >
          ← Retour
        </button>

        <p className="text-c-gold uppercase tracking-[0.45em] text-[10px] font-bold mb-5">
          Saison Unique
        </p>

        <h1 className="text-[56px] lg:text-[80px] font-black leading-none tracking-tighter mb-6">
          26<span className="text-c-gold mx-2">—</span>0
        </h1>

        <div className="space-y-4 mb-10 max-w-sm">
          <p className="text-c-fg font-black text-lg leading-snug">
            Construis le XV parfait en une seule draft.
          </p>
          <p className="text-[var(--c-muted)] text-sm leading-relaxed">
            Un club est tiré au sort parmi toute l'histoire du Top 14 depuis 2005. Sélectionne un joueur, puis un nouveau club est tiré. 15 joueurs, 15 tirages, zéro droit à l'erreur.
          </p>
          <p className="text-[var(--c-muted)] text-sm leading-relaxed">
            Objectif : <span className="text-c-fg font-bold">26 victoires, 0 défaite</span>. Une seule saison pour décrocher le Bouclier de Brennus.
          </p>
        </div>

        <div className="mb-8">
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
          onClick={onContinue}
          disabled={!myTeamName.trim()}
          className="w-full bg-c-gold hover:bg-[#F5F0E8] disabled:opacity-40 disabled:cursor-not-allowed text-black font-black uppercase tracking-[0.2em] text-sm px-8 py-4 transition-colors flex items-center justify-between"
        >
          <span>Commencer la Draft</span>
          <span>→</span>
        </button>

      </div>
    </main>
  );
}
