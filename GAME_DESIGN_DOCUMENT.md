# Rocket Crush — Game Design Document (GDD)
**Version:** 1.0  
**Status:** Draft for Review  

---

## 1. Game Overview

| Property | Value |
|----------|-------|
| **Name** | Rocket Crush |
| **Genre** | Match-3 Puzzle |
| **Platform** | PWA (Progressive Web App) — playable on mobile browser & desktop |
| **Tech Stack** | Vite + React + TypeScript + Phaser 3 + Zustand |
| **Target** | Personal project / skill building |

**Core Concept:**  
A match-3 game where colored blocks (later replaced by rocket spaceships) are swapped on a grid to create matching shapes. Points are scored for every valid match. The game runs in an endless mode with a fixed number of moves.

---

## 2. Board

| Property | Value |
|----------|-------|
| **Grid Size** | 8 × 8 |
| **Block Types** | 5 colors (Phase 1: solid colors / Phase 2: rocket spaceship sprites) |
| **Orientation** | Portrait (mobile-first) |

### Board Initialization Rules
- On game start, the board is filled randomly with the 5 colors.
- **Before the game begins**, the board is validated: any pre-existing matches are detected and re-randomized until the board has zero matches.
- The board must always have **at least one valid move** available at game start.

---

## 3. Valid Match Shapes

All shapes must consist of **same-colored blocks**:

| Shape | Description | Blocks Removed |
|-------|-------------|----------------|
| **Line-3** | 3 in a row or column | 3 |
| **Line-4** | 4 in a row or column | 4 |
| **Line-5** | 5 in a row or column | 5 |
| **Square (2×2)** | 4 blocks in a 2×2 square | 4 |
| **T-Shape** | T-shaped pattern (any rotation) | 5 |
| **L-Shape** | 3 in a column + 2 in a row connected (any rotation) | 5 |

> **Note:** Larger or overlapping shapes should resolve as the highest-scoring valid combination.

---

## 4. Scoring System

### Base Score
Every block removed = **10 points**

### Shape Multipliers

| Shape | Blocks | Multiplier | Example Score |
|-------|--------|------------|---------------|
| Line-3 | 3 | ×1.0 | 30 pts |
| Square (2×2) | 4 | ×1.5 | 60 pts |
| T-Shape | 5 | ×1.5 | 75 pts |
| L-Shape | 5 | ×1.5 | 75 pts |
| Line-4 | 4 | ×2.0 | 80 pts |
| Line-5 | 5 | ×2.5 | 125 pts |

### Cascade Bonus
- After blocks are removed, new blocks fall from the top.
- If the falling blocks create new matches **automatically** (without player input), those matches are also scored using the same shape multiplier rules.
- Each cascade level scores independently.

---

## 5. Game Flow

### Move Limit
- Each game session = **20 moves**
- A move is only counted when a swap creates at least one valid match.
- An **invalid swap** (no match created) does NOT count as a move.

### Turn Sequence
```
Player swaps two adjacent blocks
        ↓
System checks if swap creates a valid match
        ↓ (if NO match)
Animate swap attempt → animate blocks back → show "invalid" effect → move NOT counted
        ↓ (if YES match)
Remove matched blocks → animate removal
        ↓
Apply gravity → blocks above fall down (animated)
        ↓
New blocks fall in from top (animated)
        ↓
Check for cascade matches → score them → repeat until no more matches
        ↓
Check if any valid move exists on board
        ↓ (if NO valid moves)
Re-randomize board (preserving color ratios)
        ↓
Deduct 1 from move counter → update HUD
        ↓
Wait for next player input
```

### No Valid Moves Detection
- After every player action and after every cascade, the system checks if **at least one valid swap** can create a match.
- If no valid moves exist → the board re-randomizes while keeping the **same ratio of colors** as much as possible.
- This does **not** cost the player a move.

### End of Game
- When the move counter reaches **0**, the game ends.
- The player is prompted to **enter their name**.
- Score is saved to the **leaderboard**.

---

## 6. Player Interaction

### Desktop (Mouse)
- **Tap-Tap:** Click one block to select it (highlight), then click an adjacent block to swap.
- Clicking the same block again deselects it.

### Mobile (Touch)
- **Drag:** Touch and drag a block toward an adjacent block to swap.

### Invalid Swap Feedback
- Blocks briefly animate in the swap direction, then snap back.
- A visual effect is shown (e.g., shake or flash) to indicate the move is invalid.
- Fast and non-disruptive — does not interrupt game flow.

---

## 7. Animations

All animations must be **clear and readable** — not too fast — so the player understands what is happening on the board at all times.

| Event | Animation |
|-------|-----------|
| Valid swap | Smooth slide between positions |
| Invalid swap | Quick slide attempt + snap back + shake effect |
| Block removal | Explosion / pop effect |
| Gravity (blocks falling) | Smooth fall with slight bounce |
| New blocks entering | Slide in from top |
| Cascade | Sequential — player sees each cascade step |
| Board re-randomize | Fade out → shuffle → fade in |

---

## 8. Visual Design

### Theme
- **Space / Cosmic** aesthetic throughout

### Background
- Animated starfield — stars moving slowly (parallax or simple scroll)
- Dark space colors (deep black/navy)

### Blocks
- **Phase 1 (current):** Solid colored squares with slight glow or border
- **Phase 2 (future):** Replace with rocket spaceship sprites — 5 different rockets, one per color

### UI Style
- Clean, space-themed UI
- Glowing text and buttons
- The main menu should look like a **landing page** — visually impressive even when mostly empty

---

## 9. Screens

### Main Menu
- Game title / logo
- Animated space background
- "Play" button
- High Score display (best score from leaderboard)
- Clean landing-page aesthetic

### Game Screen
- Phaser canvas (the 8×8 board)
- HUD overlay (React):
  - Current score
  - Moves remaining
  - Current multiplier (if cascade active)

### End Screen
- Final score displayed
- Input field: "Enter your name"
- Leaderboard table (top scores)
- "Play Again" button

---

## 10. Leaderboard

### Phase 1 — localStorage
- Saves player name + score locally on the device.
- Displayed on the end screen after each game.
- Persists between sessions on the same device/browser.

### Phase 2 — Supabase (future)
- The codebase must be structured so that the **data layer is abstracted**.
- Switching from localStorage to Supabase should only require changing the data service file — no changes to UI or game logic.
- Supabase will store all players and scores globally, visible across all sessions.

---

## 11. Technical Architecture Principles

These rules must be followed by Claude Code at all times:

1. **React** handles all UI outside the game board (menus, HUD, leaderboard).
2. **Phaser** handles everything inside the game canvas (board, sprites, animations).
3. **EventBus** is the only communication channel between Phaser and React — never import one inside the other.
4. **`/engine`** folder contains pure TypeScript logic — no Phaser, no React, no DOM.
5. **Data layer is abstracted** — leaderboard reads/writes go through a service interface, not directly to localStorage or Supabase.
6. **Types are defined first** in `/types/index.ts` before any implementation.
7. Every phase ends with at least one working feature the developer can see and test.

---

## 12. Development Phases (Claude Code Commands)

| Phase | Description |
|-------|-------------|
| **Phase 1** | Project setup: Vite + React + Phaser + TypeScript + PWA config + folder structure + EventBus |
| **Phase 2** | Pure game engine: Grid, MatchFinder, shape detection, scoring, gravity, board validation |
| **Phase 3** | Phaser visual layer: board rendering, colors, swap interaction, animations, cascade visuals |
| **Phase 4** | React UI: Main menu, HUD, end screen, leaderboard with localStorage |
| **Phase 5** | Polish: Space background animation, visual effects, mobile optimization, PWA testing |

---

## 13. Future Features (Out of Scope for V1)

- Rocket spaceship sprites replacing colored blocks
- Supabase leaderboard
- Level mode with specific goals (clear all blocks, reach score target, etc.)
- Powerups and special blocks
- Lives system
- Sound effects and music
