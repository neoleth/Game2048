export type Board = number[][];
export type Direction = 'up' | 'down' | 'left' | 'right';

export const createBoard = (): Board => Array(4).fill(0).map(() => Array(4).fill(0));

export const addRandomTile = (board: Board): Board => {
  const newBoard = board.map(row => [...row]);
  const emptyCells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (newBoard[r][c] === 0) emptyCells.push({ r, c });
    }
  }
  if (emptyCells.length === 0) return newBoard;
  const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
};

const slideAndMerge = (line: number[]): { newLine: number[], score: number } => {
  let score = 0;
  let filtered = line.filter(val => val !== 0);
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] !== 0 && filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      score += filtered[i];
      filtered[i + 1] = 0;
    }
  }
  filtered = filtered.filter(val => val !== 0);
  while (filtered.length < 4) {
    filtered.push(0);
  }
  return { newLine: filtered, score };
};

export const move = (board: Board, direction: Direction): { board: Board; score: number; moved: boolean } => {
  let newBoard = createBoard();
  let score = 0;
  let moved = false;

  if (direction === 'left' || direction === 'right') {
    for (let r = 0; r < 4; r++) {
      let row = board[r];
      if (direction === 'right') row = [...row].reverse();
      const { newLine, score: lineScore } = slideAndMerge(row);
      if (direction === 'right') newLine.reverse();
      newBoard[r] = newLine;
      score += lineScore;
      if (board[r].join(',') !== newBoard[r].join(',')) moved = true;
    }
  } else {
    for (let c = 0; c < 4; c++) {
      let col = [board[0][c], board[1][c], board[2][c], board[3][c]];
      if (direction === 'down') col.reverse();
      const { newLine, score: lineScore } = slideAndMerge(col);
      if (direction === 'down') newLine.reverse();
      for (let r = 0; r < 4; r++) {
        newBoard[r][c] = newLine[r];
        if (board[r][c] !== newBoard[r][c]) moved = true;
      }
      score += lineScore;
    }
  }

  return { board: newBoard, score, moved };
};

export const checkGameOver = (board: Board): boolean => {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return false;
      if (c < 3 && board[r][c] === board[r][c + 1]) return false;
      if (r < 3 && board[r][c] === board[r + 1][c]) return false;
    }
  }
  return true;
};
