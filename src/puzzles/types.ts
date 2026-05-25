export type Difficulty = "facil" | "medio" | "dificil";

export type Puzzle = {
  id: string;
  difficulty: Difficulty;
  puzzle: string;
  solution: string;
};
