import React, { useState, useEffect, useCallback, useRef } from 'react';

interface TetrisProps {
  onClose: () => void;
}

type Piece = number[][];
type Board = (string | null)[][];

const PIECES: { shape: Piece; color: string }[] = [
  { shape: [[1,1,1,1]], color: '#00f0f0' }, // I
  { shape: [[1,1],[1,1]], color: '#f0f000' }, // O
  { shape: [[0,1,0],[1,1,1]], color: '#a000f0' }, // T
  { shape: [[1,0,0],[1,1,1]], color: '#f0a000' }, // L
  { shape: [[0,0,1],[1,1,1]], color: '#0000f0' }, // J
  { shape: [[0,1,1],[1,1,0]], color: '#00f000' }, // S
  { shape: [[1,1,0],[0,1,1]], color: '#f00000' }, // Z
];

const ROWS = 20;
const COLS = 10;
const CELL_SIZE = 24;

const createBoard = (): Board => Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

const Tetris: React.FC<TetrisProps> = ({ onClose }) => {
  const [board, setBoard] = useState<Board>(createBoard);
  const [currentPiece, setCurrentPiece] = useState<{ shape: Piece; color: string; x: number; y: number } | null>(null);
  const [nextPiece, setNextPiece] = useState<{ shape: Piece; color: string } | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  
  const gameLoopRef = useRef<number | null>(null);

  const getRandomPiece = () => PIECES[Math.floor(Math.random() * PIECES.length)];

  const spawnPiece = useCallback(() => {
    const piece = nextPiece || getRandomPiece();
    setNextPiece(getRandomPiece());
    
    const x = Math.floor((COLS - piece.shape[0].length) / 2);
    const y = 0;
    
    // Check if spawn position is blocked
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] && board[y + r]?.[x + c]) {
          setGameOver(true);
          return null;
        }
      }
    }
    
    return { ...piece, x, y };
  }, [nextPiece, board]);

  const isValidMove = useCallback((piece: Piece, x: number, y: number): boolean => {
    for (let r = 0; r < piece.length; r++) {
      for (let c = 0; c < piece[r].length; c++) {
        if (piece[r][c]) {
          const newX = x + c;
          const newY = y + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return false;
          if (newY >= 0 && board[newY][newX]) return false;
        }
      }
    }
    return true;
  }, [board]);

  const rotatePiece = useCallback((piece: Piece): Piece => {
    const rows = piece.length;
    const cols = piece[0].length;
    const rotated: Piece = Array(cols).fill(null).map(() => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        rotated[c][rows - 1 - r] = piece[r][c];
      }
    }
    return rotated;
  }, []);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;
    
    const newBoard = board.map(row => [...row]);
    for (let r = 0; r < currentPiece.shape.length; r++) {
      for (let c = 0; c < currentPiece.shape[r].length; c++) {
        if (currentPiece.shape[r][c]) {
          const y = currentPiece.y + r;
          const x = currentPiece.x + c;
          if (y >= 0) newBoard[y][x] = currentPiece.color;
        }
      }
    }
    
    // Clear lines
    let clearedLines = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (newBoard[r].every(cell => cell !== null)) {
        newBoard.splice(r, 1);
        newBoard.unshift(Array(COLS).fill(null));
        clearedLines++;
        r++;
      }
    }
    
    if (clearedLines > 0) {
      const points = [0, 100, 300, 500, 800][clearedLines] * level;
      setScore(s => s + points);
      setLines(l => {
        const newLines = l + clearedLines;
        setLevel(Math.floor(newLines / 10) + 1);
        return newLines;
      });
    }
    
    setBoard(newBoard);
    setCurrentPiece(null);
  }, [currentPiece, board, level]);

  const moveDown = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;
    
    if (isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
      setCurrentPiece(p => p ? { ...p, y: p.y + 1 } : null);
    } else {
      lockPiece();
    }
  }, [currentPiece, isValidMove, lockPiece, gameOver, isPaused]);

  const move = useCallback((dx: number) => {
    if (!currentPiece || gameOver || isPaused) return;
    if (isValidMove(currentPiece.shape, currentPiece.x + dx, currentPiece.y)) {
      setCurrentPiece(p => p ? { ...p, x: p.x + dx } : null);
    }
  }, [currentPiece, isValidMove, gameOver, isPaused]);

  const rotate = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;
    const rotated = rotatePiece(currentPiece.shape);
    if (isValidMove(rotated, currentPiece.x, currentPiece.y)) {
      setCurrentPiece(p => p ? { ...p, shape: rotated } : null);
    }
  }, [currentPiece, rotatePiece, isValidMove, gameOver, isPaused]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;
    let y = currentPiece.y;
    while (isValidMove(currentPiece.shape, currentPiece.x, y + 1)) y++;
    setCurrentPiece(p => p ? { ...p, y } : null);
    setTimeout(lockPiece, 0);
  }, [currentPiece, isValidMove, lockPiece, gameOver, isPaused]);

  useEffect(() => {
    if (!currentPiece && !gameOver && !isPaused) {
      const newPiece = spawnPiece();
      if (newPiece) setCurrentPiece(newPiece);
    }
  }, [currentPiece, spawnPiece, gameOver, isPaused]);

  useEffect(() => {
    if (gameOver || isPaused) return;
    
    const speed = Math.max(100, 1000 - (level - 1) * 100);
    gameLoopRef.current = window.setInterval(moveDown, speed);
    
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [moveDown, level, gameOver, isPaused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && gameOver) {
        setBoard(createBoard());
        setScore(0);
        setLevel(1);
        setLines(0);
        setGameOver(false);
        setCurrentPiece(null);
        setNextPiece(null);
        setIsPaused(false);
        return;
      }
      
      if (e.key === 'p' || e.key === 'P' || (e.key === ' ' && !gameOver)) {
        e.preventDefault();
        setIsPaused(p => !p);
        return;
      }
      
      const keys: Record<string, () => void> = {
        ArrowLeft: () => move(-1),
        ArrowRight: () => move(1),
        ArrowDown: moveDown,
        ArrowUp: rotate,
        ' ': hardDrop,
      };
      
      if (keys[e.key]) {
        e.preventDefault();
        keys[e.key]();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, moveDown, rotate, hardDrop, gameOver]);

  const renderBoard = () => {
    const display = board.map(row => [...row]);
    
    // Add current piece
    if (currentPiece) {
      for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
          if (currentPiece.shape[r][c]) {
            const y = currentPiece.y + r;
            const x = currentPiece.x + c;
            if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
              display[y][x] = currentPiece.color;
            }
          }
        }
      }
    }
    
    return display;
  };

  return (
    <div className="h-full flex items-center justify-center bg-gray-900 p-4">
      <div className="flex gap-4">
        {/* Main board */}
        <div className="bg-gray-800 p-2 rounded">
          <div
            className="grid gap-px bg-gray-700"
            style={{
              gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
            }}
          >
            {renderBoard().flat().map((cell, i) => (
              <div
                key={i}
                className="aspect-square"
                style={{
                  width: CELL_SIZE,
                  backgroundColor: cell || '#1a1a2e',
                  boxShadow: cell ? 'inset 2px 2px 4px rgba(255,255,255,0.3)' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-4 w-32">
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-gray-400 text-xs mb-1">SCORE</div>
            <div className="text-white text-xl font-bold">{score}</div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-gray-400 text-xs mb-1">LEVEL</div>
            <div className="text-white text-xl font-bold">{level}</div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-gray-400 text-xs mb-1">LINES</div>
            <div className="text-white text-xl font-bold">{lines}</div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-gray-400 text-xs mb-2">NEXT</div>
            {nextPiece && (
              <div className="flex justify-center">
                <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, 16px)` }}>
                  {nextPiece.shape.flat().map((cell, i) => (
                    <div
                      key={i}
                      className="w-4 h-4"
                      style={{ backgroundColor: cell ? nextPiece.color : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="text-gray-500 text-xs">
            <p>← → Move</p>
            <p>↑ Rotate</p>
            <p>↓ Soft drop</p>
            <p>Space Hard drop</p>
            <p>P Pause</p>
          </div>
        </div>
      </div>

      {/* Overlays */}
      {(isPaused || gameOver) && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">{gameOver ? '💀' : '⏸️'}</div>
            <div className="text-white text-2xl font-bold mb-2">
              {gameOver ? 'GAME OVER' : 'PAUSED'}
            </div>
            {gameOver && <div className="text-gray-400 mb-4">Score: {score}</div>}
            <div className="text-gray-400">Press SPACE to {gameOver ? 'restart' : 'continue'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tetris;
