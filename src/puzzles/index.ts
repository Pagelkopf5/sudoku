import { facilPuzzles } from "./facil";
import { medioPuzzles } from "./medio";
import { dificilPuzzles } from "./dificil";

export type { Difficulty, Puzzle } from "./types";
export { facilPuzzles, medioPuzzles, dificilPuzzles };

export const puzzles = [...facilPuzzles, ...medioPuzzles, ...dificilPuzzles];
