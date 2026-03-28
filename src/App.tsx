import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createBoard, addRandomTile, move, checkGameOver, Board, Direction } from './gameLogic';
import { getAIAgentSuggestion, AgentResponse } from './services/aiAgentService';

import { GENLAYER_CONTRACT_ADDRESS } from './constants';

export default function App() {
  const [board, setBoard] = useState<Board>(addRandomTile(addRandomTile(createBoard())));
  const [score, setScore] = useState(0);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<AgentResponse | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [judgeVerdict, setJudgeVerdict] = useState<AgentResponse | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<AgentResponse['challenge'] | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  const [apiError, setApiError] = useState<string | null>(null);

  const boardRef = useRef(board);
  const scoreRef = useRef(score);
  const historyRef = useRef(moveHistory);
  const gameOverRef = useRef(gameOver);
  const touchStartRef = useRef<{x: number, y: number} | null>(null);

  const handleMove = useCallback(async (direction: Direction) => {
    if (gameOverRef.current) return;
    
    const currentBoard = boardRef.current;
    const currentScore = scoreRef.current;
    const currentHistory = historyRef.current;

    const { board: newBoard, score: moveScore, moved } = move(currentBoard, direction);
    if (!moved) return;

    const boardWithNewTile = addRandomTile(newBoard);
    const newScore = currentScore + moveScore;
    const newHistory = [...currentHistory, direction];
    
    boardRef.current = boardWithNewTile;
    scoreRef.current = newScore;
    historyRef.current = newHistory;

    setBoard(boardWithNewTile);
    setScore(newScore);
    setMoveHistory(newHistory);
    
    if (checkGameOver(boardWithNewTile)) {
      gameOverRef.current = true;
      setGameOver(true);
      setIsAiThinking(true);
      setApiError(null);
      try {
        const verdict = await getAIAgentSuggestion(boardWithNewTile, newScore, newHistory, "judge");
        setJudgeVerdict(verdict);
      } catch (e: any) {
        console.error(e);
        setApiError("Failed to get final verdict due to rate limits.");
      } finally {
        setIsAiThinking(false);
      }
      return;
    }
  }, []);

  useEffect(() => {
    if (gameOver || moveHistory.length === 0) return;

    const timer = setTimeout(async () => {
      setIsAiThinking(true);
      setApiError(null);
      try {
        const suggestion = await getAIAgentSuggestion(board, score, moveHistory, "hint");
        setAiSuggestion(suggestion);
      } catch (e: any) {
        console.error(e);
        const errMsg = e?.message || "";
        if (e?.status === 429 || errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          setApiError("AI rate limit exceeded. Please wait a moment before making more moves to get hints.");
        } else {
          setApiError("AI is currently unavailable.");
        }
      } finally {
        setIsAiThinking(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [board, score, moveHistory, gameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const direction = e.key.replace('Arrow', '').toLowerCase() as Direction;
        handleMove(direction);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    const dx = touchEnd.x - touchStartRef.current.x;
    const dy = touchEnd.y - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 30) {
      if (absDx > absDy) {
        handleMove(dx > 0 ? 'right' : 'left');
      } else {
        handleMove(dy > 0 ? 'down' : 'up');
      }
    }
    touchStartRef.current = null;
  };

  const generateChallenge = async () => {
    setIsAiThinking(true);
    setApiError(null);
    try {
      const emptyBoard = createBoard();
      const challengeRes = await getAIAgentSuggestion(emptyBoard, 0, [], "challenge");
      if (challengeRes.challenge) {
        setDailyChallenge(challengeRes.challenge);
      }
    } catch (e: any) {
      console.error(e);
      const errMsg = e?.message || "";
      if (e?.status === 429 || errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        setApiError("AI rate limit exceeded. Please wait a moment before generating a challenge.");
      } else {
        setApiError("Failed to generate daily challenge.");
      }
    } finally {
      setIsAiThinking(false);
    }
  };

  const resetGame = () => {
    const newBoard = addRandomTile(addRandomTile(createBoard()));
    setBoard(newBoard);
    boardRef.current = newBoard;
    setScore(0);
    scoreRef.current = 0;
    setMoveHistory([]);
    historyRef.current = [];
    setGameOver(false);
    gameOverRef.current = false;
    setJudgeVerdict(null);
    setAiSuggestion(null);
  };

  const getTileColor = (val: number) => {
    if (val === 0) return 'bg-zinc-800 text-transparent';
    const colors: Record<number, string> = {
      2: 'bg-zinc-200 text-zinc-900',
      4: 'bg-zinc-300 text-zinc-900',
      8: 'bg-orange-400 text-white',
      16: 'bg-orange-500 text-white',
      32: 'bg-orange-600 text-white',
      64: 'bg-red-500 text-white',
      128: 'bg-red-600 text-white',
      256: 'bg-yellow-500 text-white',
      512: 'bg-yellow-600 text-white',
      1024: 'bg-yellow-700 text-white',
      2048: 'bg-yellow-800 text-white',
    };
    return colors[val] || 'bg-zinc-100 text-zinc-900';
  };

  return (
    <div className="min-h-screen bg-black py-4 px-4 sm:py-8 font-sans text-gray-100">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white">2048</h1>
            <p className="text-sm font-medium text-zinc-400 mt-1">AI Strategic Master</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-lg text-center">
              <div className="text-xs uppercase tracking-wider text-zinc-400">Score</div>
              <div className="font-bold text-xl">{score}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mb-4 gap-2">
          <button 
            onClick={resetGame}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm sm:text-base"
          >
            New Game
          </button>
          <button 
            onClick={generateChallenge}
            disabled={isAiThinking}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm sm:text-base"
          >
            Daily Challenge
          </button>
        </div>

        {dailyChallenge && (
          <div className="mb-6 p-4 bg-blue-950/50 border-l-4 border-blue-500 rounded-r-lg shadow-sm">
            <h3 className="font-bold text-blue-400 flex items-center gap-2">
              <span>🎯</span> {dailyChallenge.title}
            </h3>
            <p className="text-sm text-blue-200 mt-1">{dailyChallenge.description}</p>
            <div className="mt-2 text-xs font-semibold bg-blue-900 text-blue-300 inline-block px-2 py-1 rounded">
              Reward Multiplier: {dailyChallenge.reward_multiplier}x
            </div>
          </div>
        )}

        <div 
          className="bg-zinc-900 p-3 rounded-xl relative border border-zinc-800 touch-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 z-10 rounded-xl flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
              <h2 className="text-3xl font-bold text-white mb-2">Game Over!</h2>
              {judgeVerdict ? (
                <div className="bg-zinc-900 p-4 rounded-lg shadow-lg border border-zinc-700 max-w-sm w-full">
                  <div className="text-5xl font-black text-orange-500 mb-2">{judgeVerdict.strategy_score}</div>
                  <div className="text-xs uppercase tracking-wider text-zinc-400 mb-4">Final Strategy Score</div>
                  <p className="text-sm text-zinc-300 italic mb-4">"{judgeVerdict.feedback}"</p>
                  <button onClick={resetGame} className="w-full bg-white text-black py-3 rounded-lg font-bold">Try Again</button>
                </div>
              ) : (
                <div className="animate-pulse text-zinc-400 font-medium">AI is judging your game...</div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {board.flat().map((tile, i) => (
              <div 
                key={i} 
                className={`w-full aspect-square flex items-center justify-center font-bold text-2xl sm:text-3xl rounded-lg shadow-sm transition-all ${getTileColor(tile)}`}
              >
                {tile !== 0 ? tile : ''}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span>🤖</span> AI Coach
            {isAiThinking && <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full animate-pulse">Thinking...</span>}
          </h3>
          
          {apiError ? (
            <div className="bg-red-950/50 border border-red-900 rounded-xl p-4 text-center text-red-400 text-sm">
              {apiError}
            </div>
          ) : aiSuggestion ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
                <div className="font-semibold text-zinc-300">Suggested Move: <span className="uppercase text-orange-500">{aiSuggestion.suggestion.best_move}</span></div>
                <div className="text-sm font-medium bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-900/50">Score: {aiSuggestion.strategy_score}/100</div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">Tactical Hint</div>
                  <p className="text-zinc-200">{aiSuggestion.suggestion.hint}</p>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">Strategic Reasoning</div>
                  <p className="text-sm text-zinc-400 italic">{aiSuggestion.reasoning}</p>
                </div>
                <div className="pt-3 border-t border-zinc-800">
                  <p className="text-sm text-zinc-300"><strong>Feedback:</strong> {aiSuggestion.feedback}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-xl p-6 text-center text-zinc-500">
              Make a move to get AI coaching.
            </div>
          )}
        </div>
        
        <div className="mt-8 text-center text-sm text-zinc-500 pb-8 flex flex-col gap-2">
          <p>Swipe on the screen or use arrow keys to play. AI analyzes every move.</p>
          <p className="text-xs font-mono text-zinc-600">
            GenLayer Contract: {GENLAYER_CONTRACT_ADDRESS}
          </p>
        </div>
      </div>
    </div>
  );
}
