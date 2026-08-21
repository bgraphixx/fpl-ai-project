export type Position = "GK" | "DEF" | "MID" | "FWD";

export type SquadPlayer = {
  id: number;
  position: Position;
  club: string;
  price: number; // in millions, e.g. 8.5
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};
