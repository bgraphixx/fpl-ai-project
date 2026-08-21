import type { Position } from "@/types/fpl";

export type DisplayPlayer = {
  id: number;
  name: string;
  club: string;
  position: Position;
  price: number;
  form?: number;
  points?: number;
  ownership?: number;
  availability?: "available" | "doubtful" | "unavailable";
  isCaptain?: boolean;
  isViceCaptain?: boolean;
};
