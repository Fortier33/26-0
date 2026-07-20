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

export type Screen = "home" | "draft-home" | "career-home" | "draft" | "season" | "playoffs" | "recap" | "mercato" | "reveal" | "friends-setup" | "friends-draft" | "friends-recap" | "friends-bracket" | "friends-champion";

export type FriendsTeam = {
  id: number;
  name: string;
  colorHex: string;
  players: Player[];
  isBot: boolean;
};

export type FriendsBracketMatch = {
  id: string;
  round: string;
  teamA: FriendsTeam | null;
  teamB: FriendsTeam | null;
  scoreA: number | null;
  scoreB: number | null;
  winner: FriendsTeam | null;
};

export type FriendsBracket = {
  teams: FriendsTeam[];
  matches: FriendsBracketMatch[];
  currentMatchIndex: number;
  champion: FriendsTeam | null;
};

export type SeasonRecord = {
  seasonNumber: number;
  finalPosition: number;
  wins: number;
  draws: number;
  losses: number;
  leaguePoints: number;
  pointsScored: number;
  pointsConceded: number;
  longestWinStreak: number;
  topTryScorer: { name: string; tries: number } | null;
  biggestWinMargin: number;
  biggestWinDetails: string;
  biggestLossMargin: number;
  biggestLossDetails: string;
  playoffOutcome: "champion" | "finaliste" | "eliminé" | "non-qualifié";
};

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

export type Fixture = {
  home: string;
  away: string;
};

export type RoundMatchResult = {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
};

export type ClubUpgrade = "stadium" | "recruiter" | "trainer" | "marketing" | "transport" | "mentalCoach";

export type UpgradeGrades = Record<ClubUpgrade, 0 | 1 | 2 | 3>;
