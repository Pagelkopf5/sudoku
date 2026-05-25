export type Difficulty = "facil" | "medio" | "dificil" | "mestre";

export type Puzzle = {
  id: string;
  difficulty: Difficulty;
  puzzle: string;
  solution: string;
};
