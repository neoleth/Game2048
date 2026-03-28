import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface AgentResponse {
  reasoning: string;
  suggestion: {
    best_move: "up" | "down" | "left" | "right" | "none";
    hint: string;
    expected_score_gain: number;
  };
  strategy_score: number;
  feedback: string;
  challenge?: {
    title: string;
    description: string;
    reward_multiplier: number;
  };
}

const buildSystemPrompt = () => `You are the AI 2048 Strategic Master Agent — an expert-level 2048 AI with deep mastery of all advanced strategies. You analyze board states with the precision of a chess engine and the clarity of a coach.

Your strategic knowledge base covers:

CORE STRATEGIES (apply all simultaneously):
1. Snake/Zigzag Pattern — highest tiles follow a winding path across the board, never scattered
2. Corner Anchoring — lock the highest tile in a corner (prefer bottom-left or bottom-right); never let it move
3. Staircase Monotonicity — tiles must decrease monotonically along rows AND columns from the anchor corner
4. Smoothness — minimize value gaps between adjacent tiles; a 256→128→64→32 chain is ideal, a 256→4 jump is catastrophic
5. Empty Cell Maximization — more empty cells = more options = lower death risk; always factor empty cell count into scoring
6. Merge Chaining — prefer moves that create multiple merges in a single action (combos)
7. Edge Locking — keep large tiles on edges/corners; central high tiles are extremely difficult to manage

SCORING RUBRIC (used for strategy_score field, 0–100):
- 0–20:  Random or panic play, no pattern, high tiles in center
- 21–40: Some awareness, inconsistent corner use, poor monotonicity
- 41–60: Moderate strategy, corner mostly held, occasional bad breaks
- 61–75: Good corner control, mostly monotonic rows, minor inefficiencies
- 76–89: Strong snake pattern, excellent empty cell management, consistent chaining
- 90–100: Near-perfect play — complete snake, zero wasted merges, all tiles aligned

MOVE EVALUATION PROTOCOL:
Before suggesting a move, mentally simulate all 4 directions:
- Will this break monotonicity?
- Will this dislodge the corner tile?
- How many merges does this create?
- How many empty cells result?
- Does this improve or worsen the snake pattern?
Reject any move that violates corner anchoring unless all alternatives lead to game over.

IMPOSSIBLE MOVE DETECTION:
A move is impossible if it produces no change in the board state (no tile shifts, no merges). Never suggest an impossible move. If all moves are impossible, the game is over — set best_move to "none".

GAME OVER / NEAR-GAME-OVER HANDLING:
If empty cells <= 2, escalate urgency in feedback. If empty cells = 0 and no merges are possible anywhere, declare game over. If survival is the only option, prioritize any move that opens cells, even at the cost of pattern quality.

OUTPUT BEHAVIOR:
- Respond ONLY with a single valid JSON object
- No markdown, no code fences, no preamble, no postamble
- All string fields must be properly escaped
- Never include comments inside the JSON
- strategy_score must be an integer, not a float
- expected_score_gain must be a non-negative integer
- reward_multiplier must be a float between 1.0 and 3.0 inclusive`;

const buildUserPrompt = (board: number[][], score: number, moveHistory: string[], mode: string) => {
  const flat = board.flat();
  const emptyCount = flat.filter(x => x === 0).length;
  const maxTile = Math.max(...flat);
  const totalTiles = flat.filter(x => x > 0).length;

  const corners: Record<string, number> = {
    "top_left": board[0][0],
    "top_right": board[0][3],
    "bottom_left": board[3][0],
    "bottom_right": board[3][3],
  };
  const bestCorner = Object.keys(corners).reduce((a, b) => corners[a] > corners[b] ? a : b);
  const bestCornerVal = corners[bestCorner];

  const historyStr = JSON.stringify(moveHistory.slice(-10));
  const boardStr = JSON.stringify(board);

  let modeInstruction = "Provide the single best next move and a brief tactical hint.";
  if (mode === "judge") {
    modeInstruction = "The game has ended. Evaluate overall play quality, explain what strategic decisions worked or failed, and give an honest final strategy_score.";
  } else if (mode === "challenge") {
    modeInstruction = "Generate a daily challenge based on the current board state or a clean start. The challenge must be specific, achievable in one session, and reward skillful application of snake or corner strategy. Include the challenge object in your response.";
  }

  const schemaNote = mode === "challenge" ? `\nSince mode is "challenge", include this additional field in your JSON:\n  "challenge": {\n    "title": "<short catchy name, max 5 words>",\n    "description": "<one clear sentence describing the goal, max 25 words>",\n    "reward_multiplier": <float 1.0–3.0, higher = harder>\n  }\n` : "";

  return `CURRENT GAME STATE:
Board (4x4 JSON array, 0 = empty):
${boardStr}

Score: ${score}
Empty cells: ${emptyCount} / 16
Max tile: ${maxTile}
Occupied tiles: ${totalTiles}
Best corner: ${bestCorner} = ${bestCornerVal}
Recent moves (last ${Math.min(moveHistory.length, 10)}): ${historyStr}

TASK:
Mode: ${mode}
Instruction: ${modeInstruction}
${schemaNote}
REQUIRED JSON RESPONSE SCHEMA:
{
  "reasoning": "<strategic rationale, max 20 words>",
  "suggestion": {
    "best_move": "up" | "down" | "left" | "right" | "none",
    "hint": "<actionable player tip, max 15 words>",
    "expected_score_gain": <integer >= 0>
  },
  "strategy_score": <integer 0-100>,
  "feedback": "<constructive coaching feedback, max 30 words>"
}

STRICT OUTPUT RULES:
- Return ONLY the JSON object. Nothing before or after it.
- best_move must be a valid direction or "none" — never null, never an empty string.
- expected_score_gain = sum of tile values created by the suggested merge(s), or 0 if no merges.
- strategy_score must reflect the rubric in your system instructions — do not round to convenient numbers like 50 or 100.
- feedback must be encouraging even when critical.`;
};

export const getAIAgentSuggestion = async (
  board: number[][],
  score: number,
  moveHistory: string[],
  mode: "hint" | "judge" | "challenge" = "hint"
): Promise<AgentResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: buildUserPrompt(board, score, moveHistory, mode),
      config: {
        systemInstruction: buildSystemPrompt(),
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Agent Error:", error);
    throw error;
  }
};
