import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Difficulty = "facil" | "medio" | "dificil";
type ErrorMode = "instantaneo" | "verificar";
type ThemeMode = "light" | "dark";

type Puzzle = {
  id: string;
  difficulty: Difficulty;
  puzzle: string;
  solution: string;
};

type SavedGame = {
  puzzleCode: string;
  solution: string;
  difficulty: Difficulty;
  cells: number[];
  notes: number[][];
  selected: number | null;
  elapsedSeconds: number;
  errorCount: number;
  hintsUsed: number;
  errorMode: ErrorMode;
  theme: ThemeMode;
  notesMode: boolean;
};

const STORAGE_KEY = "sudoku-web-game";
const SETTINGS_KEY = "sudoku-web-settings";

const puzzles: Puzzle[] = [
  {
    id: "facil-1",
    difficulty: "facil",
    puzzle: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
  },
  {
    id: "facil-2",
    difficulty: "facil",
    puzzle: "200080300060070084030500209000105408000000000402706000301007040720040060004010003",
    solution: "245986371169273584837541269976125438513498627482736915391657842728349156654812793",
  },
  {
    id: "medio-1",
    difficulty: "medio",
    puzzle: "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
    solution: "435269781682571493197834562826195347374682915951743628519326874248957136763418259",
  },
  {
    id: "medio-2",
    difficulty: "medio",
    puzzle: "100007090030020008009600500005300900010080002600004000300000010040000007007000300",
    solution: "162857493534129678789643521475312986913586742628794135356478219241935867897261354",
  },
  {
    id: "dificil-1",
    difficulty: "dificil",
    puzzle: "000000907000420180000705026100904000050000040000507009920108000034059000507000000",
    solution: "462831957795426183381795426173984265659312748248567319926178534834259671517643892",
  },
  {
    id: "dificil-2",
    difficulty: "dificil",
    puzzle: "030000080009000500007509200700105000000090000000402001006208300001000600080000010",
    solution: "534621789219784536867539214743185962625397148198462371456218397371946825982753416",
  },
];

const emptyNotes = () => Array.from({ length: 81 }, () => []);

function toCells(code: string): number[] {
  return code.split("").map((char) => Number(char) || 0);
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function rowOf(index: number): number {
  return Math.floor(index / 9);
}

function colOf(index: number): number {
  return index % 9;
}

function boxOf(index: number): number {
  return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);
}

function isPeer(first: number, second: number): boolean {
  return rowOf(first) === rowOf(second) || colOf(first) === colOf(second) || boxOf(first) === boxOf(second);
}

function isValidPuzzleCode(value: string): boolean {
  return /^[0-9.]{81}$/.test(value.trim());
}

function normalizePuzzleCode(value: string): string {
  return value.trim().replaceAll(".", "0");
}

function findPuzzleByCode(code: string): Puzzle | undefined {
  return puzzles.find((puzzle) => puzzle.puzzle === code);
}

function getRandomPuzzle(difficulty: Difficulty): Puzzle {
  const options = puzzles.filter((puzzle) => puzzle.difficulty === difficulty);
  return options[Math.floor(Math.random() * options.length)];
}

function getSettings(): Pick<SavedGame, "errorMode" | "theme"> {
  const fallback = { errorMode: "instantaneo" as ErrorMode, theme: "light" as ThemeMode };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return fallback;
  }
}

function createGame(puzzle: Puzzle): SavedGame {
  const settings = getSettings();
  return {
    puzzleCode: puzzle.puzzle,
    solution: puzzle.solution,
    difficulty: puzzle.difficulty,
    cells: toCells(puzzle.puzzle),
    notes: emptyNotes(),
    selected: null,
    elapsedSeconds: 0,
    errorCount: 0,
    hintsUsed: 0,
    errorMode: settings.errorMode,
    theme: settings.theme,
    notesMode: false,
  };
}

function loadGame(): SavedGame {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as SavedGame;
      if (parsed.cells?.length === 81 && parsed.solution?.length === 81) {
        return parsed;
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return createGame(puzzles[0]);
}

function getConflicts(cells: number[], index: number): boolean {
  const value = cells[index];
  if (!value) return false;

  return cells.some((cell, otherIndex) => {
    if (otherIndex === index || cell !== value) return false;
    return rowOf(otherIndex) === rowOf(index) || colOf(otherIndex) === colOf(index) || boxOf(otherIndex) === boxOf(index);
  });
}

function App() {
  const [game, setGame] = useState<SavedGame>(() => loadGame());
  const [difficulty, setDifficulty] = useState<Difficulty>(game.difficulty);
  const [configOpen, setConfigOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [checked, setChecked] = useState(false);
  const [importCode, setImportCode] = useState(game.puzzleCode);
  const [message, setMessage] = useState("");
  const [animatedCell, setAnimatedCell] = useState<number | null>(null);
  const givenCells = useMemo(() => toCells(game.puzzleCode), [game.puzzleCode]);

  useEffect(() => {
    document.documentElement.dataset.theme = game.theme;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ errorMode: game.errorMode, theme: game.theme }));
  }, [game]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setGame((current) => ({ ...current, elapsedSeconds: current.elapsedSeconds + 1 }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    if (animatedCell === null) return;
    const timer = window.setTimeout(() => setAnimatedCell(null), 180);
    return () => window.clearTimeout(timer);
  }, [animatedCell]);

  const selectedValue = game.selected !== null ? game.cells[game.selected] : 0;
  const completedCount = useMemo(() => {
    return Array.from({ length: 9 }, (_, index) => index + 1).reduce<Record<number, number>>((acc, number) => {
      acc[number] = game.cells.filter((cell, cellIndex) => cell === number && String(number) === game.solution[cellIndex]).length;
      return acc;
    }, {});
  }, [game.cells, game.solution]);

  function updateCell(value: number) {
    if (game.selected === null || givenCells[game.selected]) return;

    const nextCells = [...game.cells];
    const previous = nextCells[game.selected];
    nextCells[game.selected] = value;

    const isWrong = value > 0 && String(value) !== game.solution[game.selected];
    const shouldCountError = game.errorMode === "instantaneo" && isWrong && previous !== value;

    setChecked(false);
    setMessage("");
    if (value > 0) {
      setAnimatedCell(game.selected);
    }
    setGame((current) => ({
      ...current,
      cells: nextCells,
      notes: current.notes.map((notes, index) => {
        if (index === current.selected) return [];
        if (value > 0 && current.selected !== null && isPeer(index, current.selected)) {
          return notes.filter((note) => note !== value);
        }
        return notes;
      }),
      errorCount: current.errorCount + (shouldCountError ? 1 : 0),
    }));
  }

  function toggleNote(value: number) {
    if (game.selected === null || givenCells[game.selected]) return;

    setGame((current) => ({
      ...current,
      notes: current.notes.map((notes, index) => {
        if (index !== current.selected) return notes;
        return notes.includes(value) ? notes.filter((note) => note !== value) : [...notes, value].sort();
      }),
    }));
  }

  function handleNumber(value: number) {
    if (game.notesMode) {
      toggleNote(value);
      return;
    }
    updateCell(value);
  }

  function clearCell() {
    updateCell(0);
  }

  function moveSelection(deltaRow: number, deltaCol: number) {
    const start = game.selected ?? 0;
    const nextRow = Math.min(8, Math.max(0, rowOf(start) + deltaRow));
    const nextCol = Math.min(8, Math.max(0, colOf(start) + deltaCol));
    setGame((current) => ({ ...current, selected: nextRow * 9 + nextCol }));
  }

  function verifyGame() {
    const hasEmpty = game.cells.some((cell) => cell === 0);
    const wrongCells = game.cells.filter((cell, index) => cell > 0 && String(cell) !== game.solution[index]).length;

    setChecked(true);
    if (wrongCells > 0) {
      setMessage(`Existem ${wrongCells} célula(s) incorreta(s).`);
      return;
    }

    if (hasEmpty) {
      setMessage("Ainda existem células vazias.");
      return;
    }

    setMessage(`Vitória em ${formatTime(game.elapsedSeconds)} com ${game.errorCount} erro(s).`);
  }

  function restartGame() {
    const puzzle = findPuzzleByCode(game.puzzleCode);
    setGame(puzzle ? createGame(puzzle) : { ...createGame(puzzles[0]), puzzleCode: game.puzzleCode, solution: game.solution });
    setMessage("");
    setChecked(false);
    setPaused(false);
  }

  function newGame(nextDifficulty = difficulty) {
    const puzzle = getRandomPuzzle(nextDifficulty);
    setDifficulty(nextDifficulty);
    setImportCode(puzzle.puzzle);
    setGame(createGame(puzzle));
    setMessage("");
    setChecked(false);
    setPaused(false);
  }

  function revealHint() {
    const target = game.cells.findIndex((cell, index) => cell === 0 && !givenCells[index]);
    if (target === -1) return;
    const nextCells = [...game.cells];
    nextCells[target] = Number(game.solution[target]);
    setGame((current) => ({ ...current, cells: nextCells, hintsUsed: current.hintsUsed + 1, selected: target }));
  }

  function importPuzzle() {
    if (!isValidPuzzleCode(importCode)) {
      setMessage("O código precisa ter 81 caracteres usando números, 0 ou ponto.");
      return;
    }

    const code = normalizePuzzleCode(importCode);
    const known = findPuzzleByCode(code);
    if (!known) {
      setMessage("Este código ainda não está na lista de puzzles prontos. O gerador/solver entra na próxima etapa para aceitar qualquer código.");
      return;
    }

    setDifficulty(known.difficulty);
    setGame(createGame(known));
    setConfigOpen(false);
    setMessage("");
  }

  function cellClass(index: number): string {
    const row = rowOf(index);
    const col = colOf(index);
    const selected = game.selected;
    const value = game.cells[index];
    const wrongByMode = value > 0 && String(value) !== game.solution[index] && (game.errorMode === "instantaneo" || checked);

    return [
      "cell",
      givenCells[index] ? "given" : "",
      !givenCells[index] && value > 0 ? "user-value" : "",
      animatedCell === index ? "just-entered" : "",
      selected === index ? "selected" : "",
      selected !== null && (rowOf(selected) === row || colOf(selected) === col) ? "related" : "",
      selectedValue && value === selectedValue ? "same-number" : "",
      wrongByMode || getConflicts(game.cells, index) ? "wrong" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("textarea, select, input")) return;

      if (event.key === "Escape" && configOpen) {
        event.preventDefault();
        setConfigOpen(false);
        return;
      }

      if (paused) return;

      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        handleNumber(Number(event.key));
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        event.preventDefault();
        clearCell();
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setGame((current) => ({ ...current, notesMode: !current.notesMode }));
        return;
      }

      const moves: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      const move = moves[event.key];
      if (move) {
        event.preventDefault();
        moveSelection(move[0], move[1]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <main className="app">
      <section className="topbar" aria-label="Informações da partida">
        <div>
          <p className="eyebrow">Sudoku</p>
          <h1>Partida {difficulty}</h1>
        </div>
        <div className="stats">
          <span>{formatTime(game.elapsedSeconds)}</span>
          <span>{game.errorCount} erros</span>
          <span>{game.hintsUsed} dicas</span>
        </div>
        <button className="iconButton" type="button" aria-label="Abrir código do Sudoku" onClick={() => setConfigOpen(true)}>
          #
        </button>
      </section>

      <section className="gameArea">
        <div className="boardWrap">
          {paused && <button className="pauseOverlay" type="button" onClick={() => setPaused(false)}>Continuar</button>}
          <div className="board" aria-label="Tabuleiro de Sudoku">
            {game.cells.map((cell, index) => (
              <button
                className={cellClass(index)}
                key={index}
                type="button"
                onClick={() => setGame((current) => ({ ...current, selected: index }))}
                disabled={paused}
                aria-label={`Linha ${rowOf(index) + 1}, coluna ${colOf(index) + 1}`}
              >
                {cell > 0 ? (
                  cell
                ) : (
                  <span className="notesGrid" aria-hidden="true">
                    {Array.from({ length: 9 }, (_, noteIndex) => noteIndex + 1).map((note) => (
                      <span key={note}>{game.notes[index].includes(note) ? note : ""}</span>
                    ))}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <aside className="controls">
          <div className="quickSettings" aria-label="Ajustes da partida">
            <label>
              <span>Dificuldade</span>
              <select value={difficulty} onChange={(event) => newGame(event.target.value as Difficulty)}>
                <option value="facil">Fácil</option>
                <option value="medio">Médio</option>
                <option value="dificil">Difícil</option>
              </select>
            </label>

            <label>
              <span>Erros</span>
              <select
                value={game.errorMode}
                onChange={(event) => setGame((current) => ({ ...current, errorMode: event.target.value as ErrorMode }))}
              >
                <option value="instantaneo">Na hora</option>
                <option value="verificar">Ao verificar</option>
              </select>
            </label>

            <label>
              <span>Tema</span>
              <select
                value={game.theme}
                onChange={(event) => setGame((current) => ({ ...current, theme: event.target.value as ThemeMode }))}
              >
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
              </select>
            </label>
          </div>

          <div className="numberPad" aria-label="Teclado numérico">
            {Array.from({ length: 9 }, (_, index) => index + 1).map((number) => (
              <button
                type="button"
                key={number}
                onClick={() => handleNumber(number)}
                disabled={paused || completedCount[number] >= 9}
                title={completedCount[number] >= 9 ? "Número completo" : `Inserir ${number}`}
              >
                <strong>{number}</strong>
                <small>{completedCount[number]}/9</small>
              </button>
            ))}
          </div>

          <div className="actions">
            <button type="button" onClick={clearCell} disabled={paused} aria-label="Limpar célula">
              <span aria-hidden="true">⌫</span>
              Limpar
            </button>
            <button
              type="button"
              className={game.notesMode ? "active" : ""}
              onClick={() => setGame((current) => ({ ...current, notesMode: !current.notesMode }))}
              disabled={paused}
              aria-label="Alternar rascunho"
            >
              <span aria-hidden="true">✎</span>
              Rascunho
            </button>
            <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Continuar partida" : "Pausar partida"}>
              <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
              {paused ? "Continuar" : "Pausar"}
            </button>
            <button type="button" onClick={revealHint} disabled={paused} aria-label="Revelar dica">
              <span aria-hidden="true">?</span>
              Dica
            </button>
            <button type="button" onClick={verifyGame} disabled={paused} aria-label="Verificar jogo">
              <span aria-hidden="true">✓</span>
              Verificar
            </button>
            <button type="button" className="primary" onClick={() => newGame()} aria-label="Novo jogo">
              <span aria-hidden="true">+</span>
              Novo
            </button>
          </div>

          <button className="quietAction" type="button" onClick={restartGame}>
            <span aria-hidden="true">↻</span>
            Reiniciar partida
          </button>

          <p className="message" aria-live="polite">{message || "Selecione uma célula e escolha um número."}</p>
        </aside>
      </section>

      {configOpen && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Código do Sudoku">
          <div className="drawerPanel">
            <div className="drawerHeader">
              <h2>Código</h2>
              <button className="iconButton" type="button" aria-label="Fechar configurações" onClick={() => setConfigOpen(false)}>×</button>
            </div>

            <label>
              Código deste Sudoku
              <textarea value={game.puzzleCode} readOnly rows={3} />
            </label>

            <label>
              Aplicar código salvo
              <textarea value={importCode} onChange={(event) => setImportCode(event.target.value)} rows={3} />
            </label>

            <button className="primary wide" type="button" onClick={importPuzzle}>Aplicar código</button>
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
