export type Player = {
  name: string;
  rating: number;
  position: string;
  club?: string;
};

export type MatchEvent = {
  minute: number;
  team: "me" | "opponent";
  text: string;
  points: number;
};

export type ScoringAction = {
  type: "try_conv" | "try" | "penalty";
  points: number;
};

export type MatchResult = {
  matchNumber: number;
  opponent: string;
  myScore: number;
  opponentScore: number;
  events: MatchEvent[];
  result: "Victoire" | "Défaite" | "Nul";
};

export type Screen = "home" | "draft" | "season" | "playoffs" | "recap";

export type PlayoffMatchSummary = {
  round: string;
  opponent: string;
  myScore: number;
  opponentScore: number;
  won: boolean;
};

export type PlayoffSummary = {
  outcome: "champion" | "finaliste" | "eliminé" | "non-qualifié";
  eliminatedIn?: string;
  matches: PlayoffMatchSummary[];
};

export type FieldSlot = {
  position: string;
  top: string;
  left: string;
};

export type CalendarEntry = {
  opponent: string;
  isHome: boolean;
};
