import { facilPuzzles } from "./facil";
import { medioPuzzles } from "./medio";
import { dificilPuzzles } from "./dificil";
import { mestrePuzzles } from "./mestre";

export type { Difficulty, Puzzle } from "./types";
export { facilPuzzles, medioPuzzles, dificilPuzzles, mestrePuzzles };

export const puzzles = [...facilPuzzles, ...medioPuzzles, ...dificilPuzzles, ...mestrePuzzles];
