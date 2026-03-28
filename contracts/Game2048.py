# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# ============================================================
#  Game 2048 — GenLayer Intelligent Contract
#  Fixed & production-ready for GenLayer Studio
# ============================================================

from genlayer import *


class Game2048(gl.Contract):

    # ── Storage — GenLayer-compatible types only ───────────
    # Board stored as 16 comma-separated values per player (flat 4x4)
    board_state:   TreeMap[str, str]    # player -> "0,2,0,4,..."
    game_score:    TreeMap[str, u256]
    game_over:     TreeMap[str, str]    # "true" | "false"
    move_count:    TreeMap[str, u256]
    last_hint:     TreeMap[str, str]
    last_bestmove: TreeMap[str, str]
    last_feedback: TreeMap[str, str]
    last_strategy: TreeMap[str, u256]

    # Leaderboard (parallel arrays, max 10)
    lb_addresses: DynArray[str]
    lb_scores:    DynArray[u256]

    # Daily challenge fields
    challenge_title:      str
    challenge_description: str

    # ── Constructor ────────────────────────────────────────
    def __init__(self) -> None:
        self.challenge_title       = "Daily Challenge"
        self.challenge_description = "Reach the 1024 tile."

    # ══════════════════════════════════════════════════════
    #  BOARD HELPERS — flat string encoding
    #  Board = 16 integers joined by commas
    #  Index: row*4 + col  (row 0-3, col 0-3)
    # ══════════════════════════════════════════════════════

    def _board_to_str(self, board: list) -> str:
        parts = DynArray[str]([])
        idx = 0
        while idx < 16:
            parts.append(str(board[idx]))
            idx = idx + 1
        result = ""
        idx = 0
        while idx < 16:
            if idx > 0:
                result = result + ","
            result = result + parts[idx]
            idx = idx + 1
        return result

    def _str_to_board(self, s: str) -> list:
        tokens = s.split(",")
        board = DynArray[int]([])
        idx = 0
        while idx < 16:
            board.append(int(tokens[idx]))
            idx = idx + 1
        return board

    def _get(self, board: list, row: int, col: int) -> int:
        return board[row * 4 + col]

    def _set(self, board: list, row: int, col: int, val: int) -> list:
        new_board = DynArray[int]([])
        idx = 0
        while idx < 16:
            new_board.append(board[idx])
            idx = idx + 1
        new_board[row * 4 + col] = val
        return new_board

    def _make_empty_board(self) -> list:
        board = DynArray[int]([])
        idx = 0
        while idx < 16:
            board.append(0)
            idx = idx + 1
        return board

    def _spawn_tile(self, board: list, seed: u256) -> list:
        # Collect empty positions
        empties = DynArray[int]([])
        idx = 0
        while idx < 16:
            if board[idx] == 0:
                empties.append(idx)
            idx = idx + 1
        if len(empties) == 0:
            return board
        # Use seed to pick position deterministically
        pick = int(seed % u256(len(empties)))
        pos  = empties[pick]
        # Use seed to decide tile value: 10% chance of 4, 90% chance of 2
        tile_val = 4 if int(seed % u256(10)) == 0 else 2
        new_board = DynArray[int]([])
        idx = 0
        while idx < 16:
            new_board.append(board[idx])
            idx = idx + 1
        new_board[pos] = tile_val
        return new_board

    def _compress_row_left(self, row: list) -> tuple:
        # row is a list of 4 ints
        # Step 1: remove zeros
        tiles = DynArray[int]([])
        idx = 0
        while idx < 4:
            if row[idx] != 0:
                tiles.append(row[idx])
            idx = idx + 1
        # Step 2: merge adjacent equal tiles
        merged = DynArray[int]([])
        gained = 0
        idx = 0
        while idx < len(tiles):
            if idx + 1 < len(tiles) and tiles[idx] == tiles[idx + 1]:
                val = tiles[idx] * 2
                merged.append(val)
                gained = gained + val
                idx = idx + 2
            else:
                merged.append(tiles[idx])
                idx = idx + 1
        # Step 3: pad to 4
        while len(merged) < 4:
            merged.append(0)
        return merged, gained

    def _apply_move(self, board: list, direction: str) -> tuple:
        gained = 0
        new_board = DynArray[int]([])
        idx = 0
        while idx < 16:
            new_board.append(board[idx])
            idx = idx + 1

        if direction == "left":
            r = 0
            while r < 4:
                row = DynArray[int]([])
                c = 0
                while c < 4:
                    row.append(self._get(new_board, r, c))
                    c = c + 1
                merged, g = self._compress_row_left(row)
                gained = gained + g
                c = 0
                while c < 4:
                    new_board = self._set(new_board, r, c, merged[c])
                    c = c + 1
                r = r + 1

        elif direction == "right":
            r = 0
            while r < 4:
                row = DynArray[int]([])
                c = 3
                while c >= 0:
                    row.append(self._get(new_board, r, c))
                    c = c - 1
                merged, g = self._compress_row_left(row)
                gained = gained + g
                c = 3
                i = 0
                while c >= 0:
                    new_board = self._set(new_board, r, c, merged[i])
                    c = c - 1
                    i = i + 1
                r = r + 1

        elif direction == "up":
            c = 0
            while c < 4:
                col = DynArray[int]([])
                r = 0
                while r < 4:
                    col.append(self._get(new_board, r, c))
                    r = r + 1
                merged, g = self._compress_row_left(col)
                gained = gained + g
                r = 0
                while r < 4:
                    new_board = self._set(new_board, r, c, merged[r])
                    r = r + 1
                c = c + 1

        elif direction == "down":
            c = 0
            while c < 4:
                col = DynArray[int]([])
                r = 3
                while r >= 0:
                    col.append(self._get(new_board, r, c))
                    r = r - 1
                merged, g = self._compress_row_left(col)
                gained = gained + g
                r = 3
                i = 0
                while r >= 0:
                    new_board = self._set(new_board, r, c, merged[i])
                    r = r - 1
                    i = i + 1
                c = c + 1

        return new_board, gained

    def _is_game_over(self, board: list) -> bool:
        # If any cell is empty, game is not over
        idx = 0
        while idx < 16:
            if board[idx] == 0:
                return False
            idx = idx + 1
        # If any adjacent pair can merge, game is not over
        r = 0
        while r < 4:
            c = 0
            while c < 4:
                val = self._get(board, r, c)
                if c + 1 < 4 and self._get(board, r, c + 1) == val:
                    return False
                if r + 1 < 4 and self._get(board, r + 1, c) == val:
                    return False
                c = c + 1
            r = r + 1
        return True

    def _boards_equal(self, a: list, b: list) -> bool:
        idx = 0
        while idx < 16:
            if a[idx] != b[idx]:
                return False
            idx = idx + 1
        return True

    def _max_tile(self, board: list) -> int:
        best = 0
        idx = 0
        while idx < 16:
            if board[idx] > best:
                best = board[idx]
            idx = idx + 1
        return best

    def _empty_count(self, board: list) -> int:
        count = 0
        idx = 0
        while idx < 16:
            if board[idx] == 0:
                count = count + 1
            idx = idx + 1
        return count

    def _board_to_display(self, board: list) -> str:
        # Returns a readable 4x4 grid as string
        result = ""
        r = 0
        while r < 4:
            c = 0
            while c < 4:
                val = self._get(board, r, c)
                result = result + str(val)
                if c < 3:
                    result = result + ","
                c = c + 1
            if r < 3:
                result = result + "|"
            r = r + 1
        return result

    # ══════════════════════════════════════════════════════
    #  LEADERBOARD HELPER
    # ══════════════════════════════════════════════════════

    def _update_leaderboard(self, player: str, score: u256) -> None:
        # Remove existing entry for player
        temp_addr  = DynArray[str]([])
        temp_score = DynArray[u256]([])
        idx = 0
        while idx < len(self.lb_addresses):
            if self.lb_addresses[idx] != player:
                temp_addr.append(self.lb_addresses[idx])
                temp_score.append(self.lb_scores[idx])
            idx = idx + 1

        # Insert in descending order
        out_addr  = DynArray[str]([])
        out_score = DynArray[u256]([])
        placed = False
        idx = 0
        while idx < len(temp_addr):
            if not placed and score >= temp_score[idx]:
                out_addr.append(player)
                out_score.append(score)
                placed = True
            out_addr.append(temp_addr[idx])
            out_score.append(temp_score[idx])
            idx = idx + 1
        if not placed:
            out_addr.append(player)
            out_score.append(score)

        # Trim to top 10
        final_addr  = DynArray[str]([])
        final_score = DynArray[u256]([])
        idx = 0
        while idx < len(out_addr) and idx < 10:
            final_addr.append(out_addr[idx])
            final_score.append(out_score[idx])
            idx = idx + 1

        self.lb_addresses = final_addr
        self.lb_scores    = final_score

    # ══════════════════════════════════════════════════════
    #  AI AGENT HELPER
    # ══════════════════════════════════════════════════════

    def _call_ai(self, board: list, score: u256, mode: str) -> str:
        max_t   = self._max_tile(board)
        empties = self._empty_count(board)
        board_s = self._board_to_display(board)

        prompt = (
            "You are an AI agent for the 2048 game on GenLayer blockchain.\n"
            "Current board (rows separated by |, columns by comma): " + board_s + "\n"
            "Current score: " + str(score) + "\n"
            "Max tile: " + str(max_t) + "\n"
            "Empty cells: " + str(empties) + "\n"
            "Mode: " + mode + "\n\n"
        )

        if mode == "hint":
            prompt = prompt + (
                "Give the best next move for this 2048 board.\n"
                "Respond in EXACTLY this format, no other text:\n"
                "MOVE: [up or down or left or right]\n"
                "HINT: [one sentence explanation, max 15 words]\n"
                "SCORE: [strategy quality from 0 to 100]\n"
                "FEEDBACK: [one sentence about overall strategy, max 20 words]\n"
                "Rules: Only suggest a move that actually changes the board. "
                "Prefer keeping the highest tile in a corner. "
                "Prefer moves that create the most merges."
            )
        elif mode == "challenge":
            prompt = prompt + (
                "Generate a daily challenge for this 2048 game.\n"
                "Respond in EXACTLY this format, no other text:\n"
                "TITLE: [challenge name, max 5 words]\n"
                "DESCRIPTION: [challenge goal, max 20 words]\n"
                "Rules: Make it interesting and blockchain-themed. "
                "Examples: reach 512 tile, score 5000, survive 50 moves."
            )
        else:
            prompt = prompt + (
                "The game just ended. Evaluate the player's performance.\n"
                "Respond in EXACTLY this format, no other text:\n"
                "SCORE: [strategy quality from 0 to 100]\n"
                "FEEDBACK: [two sentences evaluating the game, max 30 words total]\n"
                "Rules: Be honest but encouraging. Reference tile merging strategy."
            )

        result = gl.exec_prompt(prompt)
        return result.strip()

    def _parse_field(self, text: str, field: str) -> str:
        # Extract value after "FIELD: " on a line
        lines = text.split("\n")
        idx = 0
        while idx < len(lines):
            line = lines[idx].strip()
            prefix = field + ": "
            if line.startswith(prefix):
                return line[len(prefix):]
            idx = idx + 1
        return ""

    # ══════════════════════════════════════════════════════
    #  PUBLIC WRITE METHODS
    # ══════════════════════════════════════════════════════

    @gl.public.write
    def start_game(self, player: str) -> None:
        board = self._make_empty_board()
        # Use game_counter equivalent via move_count as seed
        seed1 = u256(7)
        seed2 = u256(13)
        board = self._spawn_tile(board, seed1)
        board = self._spawn_tile(board, seed2)

        self.board_state[player]   = self._board_to_str(board)
        self.game_score[player]    = u256(0)
        self.game_over[player]     = "false"
        self.move_count[player]    = u256(0)
        self.last_hint[player]     = ""
        self.last_bestmove[player] = ""
        self.last_feedback[player] = ""
        self.last_strategy[player] = u256(0)

    @gl.public.write
    def move(self, player: str, direction: str) -> str:
        if self.game_over.get(player, "true") == "true":
            return "GAME_OVER"
        if direction != "up" and direction != "down" and direction != "left" and direction != "right":
            return "INVALID_DIRECTION"

        board_str = self.board_state.get(player, "")
        if board_str == "":
            return "NO_ACTIVE_GAME"

        board     = self._str_to_board(board_str)
        new_board, gained = self._apply_move(board, direction)

        # If board did not change, move is impossible
        if self._boards_equal(board, new_board):
            return "IMPOSSIBLE_MOVE"

        # Spawn new tile using move_count as seed
        old_moves = self.move_count.get(player, u256(0))
        new_moves = old_moves + u256(1)
        seed      = new_moves * u256(31) + u256(17)
        new_board = self._spawn_tile(new_board, seed)

        old_score = self.game_score.get(player, u256(0))
        new_score = old_score + u256(gained)

        self.board_state[player] = self._board_to_str(new_board)
        self.game_score[player]  = new_score
        self.move_count[player]  = new_moves

        if self._is_game_over(new_board):
            self.game_over[player] = "true"
            self._update_leaderboard(player, new_score)
            return "GAME_OVER"

        return "OK"

    @gl.public.write
    def end_game(self, player: str) -> None:
        score = self.game_score.get(player, u256(0))
        self.game_over[player] = "true"
        self._update_leaderboard(player, score)

    @gl.public.write
    def get_hint(self, player: str) -> None:
        if self.game_over.get(player, "true") == "true":
            return

        board_str = self.board_state.get(player, "")
        if board_str == "":
            return

        board = self._str_to_board(board_str)
        score = self.game_score.get(player, u256(0))

        ai_text = self._call_ai(board, score, "hint")

        move_val     = self._parse_field(ai_text, "MOVE")
        hint_val     = self._parse_field(ai_text, "HINT")
        score_val    = self._parse_field(ai_text, "SCORE")
        feedback_val = self._parse_field(ai_text, "FEEDBACK")

        self.last_bestmove[player] = move_val
        self.last_hint[player]     = hint_val
        self.last_feedback[player] = feedback_val

        strategy_int = u256(0)
        if score_val != "":
            # Parse integer safely
            clean = score_val.strip()
            parsed = 0
            ci = 0
            while ci < len(clean):
                ch = clean[ci]
                if ch >= "0" and ch <= "9":
                    parsed = parsed * 10 + (ord(ch) - ord("0"))
                ci = ci + 1
            if parsed > 100:
                parsed = 100
            strategy_int = u256(parsed)

        self.last_strategy[player] = strategy_int

    @gl.public.write
    def generate_daily_challenge(self) -> None:
        board    = self._make_empty_board()
        ai_text  = self._call_ai(board, u256(0), "challenge")
        title    = self._parse_field(ai_text, "TITLE")
        desc     = self._parse_field(ai_text, "DESCRIPTION")
        if title != "":
            self.challenge_title = title
        if desc != "":
            self.challenge_description = desc

    # ══════════════════════════════════════════════════════
    #  PUBLIC VIEW METHODS
    # ══════════════════════════════════════════════════════

    @gl.public.view
    def get_state(self, player: str) -> str:
        board_str = self.board_state.get(player, "")
        if board_str == "":
            return '{"error":"No active game. Call start_game() first."}'

        score    = self.game_score.get(player,    u256(0))
        over     = self.game_over.get(player,     "false")
        moves    = self.move_count.get(player,    u256(0))
        hint     = self.last_hint.get(player,     "")
        bestmove = self.last_bestmove.get(player, "")
        feedback = self.last_feedback.get(player, "")
        strategy = self.last_strategy.get(player, u256(0))

        return (
            '{"board":"' + board_str + '"'
            + ',"score":' + str(score)
            + ',"move_count":' + str(moves)
            + ',"game_over":"' + over + '"'
            + ',"last_hint":"' + hint + '"'
            + ',"last_best_move":"' + bestmove + '"'
            + ',"last_feedback":"' + feedback + '"'
            + ',"strategy_score":' + str(strategy) + '}'
        )

    @gl.public.view
    def get_leaderboard(self) -> str:
        result = "["
        idx = 0
        while idx < len(self.lb_addresses):
            if idx > 0:
                result = result + ","
            result = (
                result
                + '{"rank":' + str(idx + 1)
                + ',"address":"' + self.lb_addresses[idx] + '"'
                + ',"score":' + str(self.lb_scores[idx]) + '}'
            )
            idx = idx + 1
        return result + "]"

    @gl.public.view
    def get_daily_challenge(self) -> str:
        return (
            '{"title":"' + self.challenge_title + '"'
            + ',"description":"' + self.challenge_description + '"}'
        )

    @gl.public.view
    def get_player_score(self, player: str) -> u256:
        return self.game_score.get(player, u256(0))

    @gl.public.view
    def is_game_over(self, player: str) -> str:
        return self.game_over.get(player, "false")
