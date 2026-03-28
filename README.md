# 🧠 AI 2048 Strategic Master Agent

An advanced AI-powered decision engine for the 2048 game, designed for integration with GenLayer Intelligent Contracts. This agent provides strategic move suggestions, evaluates gameplay quality, and can generate dynamic challenges to enhance player engagement.

---

## 🚀 Overview

The **AI 2048 Strategic Master Agent** is built to simulate expert-level 2048 gameplay using well-known high-performance strategies:

* Snake Pattern
* Corner Strategy
* Monotonicity Optimization
* Smoothness Heuristics
* Empty Cell Maximization

It analyzes the current board state, score, and recent move history to produce intelligent recommendations in a structured JSON format.

---

## ⚙️ Features

### ✅ Smart Move Suggestions

* Recommends the best possible move (`up`, `down`, `left`, `right`)
* Avoids invalid or impossible moves
* Focuses on long-term board control rather than short-term gains

### 📊 Strategy Evaluation

* Provides a `strategy_score` (0–100)
* Evaluates how well the player is following optimal strategies

### 💡 Actionable Feedback

* Short, clear hints to improve gameplay
* Constructive and educational feedback

### 🎯 Challenge Mode

* Generates dynamic in-game challenges
* Includes reward multipliers (1.0–3.0)
* Encourages skill-based play

---

## 🧩 Function Usage

### `_call_ai_2048_agent`

```python
def _call_ai_2048_agent(self, board: list, score: int, move_history: list = None, mode: str = "hint"):
```

### Parameters

| Parameter      | Type   | Description                         |
| -------------- | ------ | ----------------------------------- |
| `board`        | list   | 4x4 grid (0 represents empty cells) |
| `score`        | int    | Current game score                  |
| `move_history` | list   | Optional list of recent moves       |
| `mode`         | string | `"hint"` or `"challenge"`           |

---

## 📥 Example Input

```json
{
  "board": [[2,4,8,16],[0,2,4,8],[0,0,2,4],[0,0,0,2]],
  "score": 1200,
  "move_history": ["left","up","left"]
}
```

---

## 📤 Example Output

```json
{
  "reasoning": "Maintains corner control and preserves monotonic structure",
  "suggestion": {
    "best_move": "left",
    "hint": "Keep highest tile locked in corner",
    "expected_score_gain": 16
  },
  "strategy_score": 82,
  "feedback": "Good structure, but avoid breaking tile order near the corner."
}
```

---

## 🧠 Strategy Principles

The agent prioritizes:

* Keeping the highest tile in a fixed corner
* Maintaining a monotonic decreasing pattern
* Avoiding unnecessary merges that break structure
* Maximizing available empty cells
* Preventing board lock situations

---

## 🎮 Modes

### 🔹 Hint Mode (default)

* Provides best move suggestion
* Gives quick feedback and evaluation

### 🔹 Challenge Mode

Includes additional field:

```json
"challenge": {
  "title": "Corner Mastery",
  "description": "Keep your highest tile in the same corner for 10 moves",
  "reward_multiplier": 1.5
}
```

---

## ⚠️ Rules & Constraints

* Output is always **valid JSON only**
* No extra text or formatting outside JSON
* If no moves are possible:

  ```json
  "best_move": "none"
  ```
* Strategy score guidelines:

  * `<30` → Random / poor play
  * `50–70` → متوسط (moderate strategy)
  * `70–90` → Good structured play
  * `90+` → Near-perfect strategy

---

## 🔗 Integration (GenLayer)

```python
result = gl.nondet.exec_prompt(prompt, response_format="json")
return json.loads(result)
```

### Best Practices

* Limit move history to last 10 entries
* Use compact JSON (`separators=(',', ':')`)
* Always validate returned JSON
* Keep prompts deterministic for contract execution

---

## 📌 Use Cases

* 🎮 Web / mobile 2048 games
* 🧪 AI gameplay research
* 🏆 Competitive or multiplayer modes
* 📚 Educational tools for strategy learning

---

## 🛠 Future Improvements

* Multiplayer AI opponent mode
* Adaptive difficulty scaling
* Reinforcement learning integration
* Personalized strategy coaching

---

## 📄 License

MIT License – free to use and modify.

---

## ✨ Summary

This agent transforms a simple puzzle game into a strategic experience by combining expert heuristics with structured AI reasoning—perfect for modern on-chain or AI-enhanced gaming systems.
