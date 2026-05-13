# Rocket Crush — Session Context

## What it is
Match-3 puzzle game, space theme. Player swaps adjacent rockets to form matching shapes.
5 difficulty modes (planets). Score saved to a per-planet leaderboard. Deployed as a PWA.

Live: https://rocket-crush-phaser.vercel.app
GitHub: https://github.com/RotemRosenberg/rocket-crush-phaser

## Tech Stack
- **Vite + React + TypeScript** — UI, routing, HUD, menus
- **Phaser 3** — game board, sprites, all in-game animations
- **Zustand** — shared state (score, moves, timer, game state, auth state)
- **EventBus** (`src/bridge/EventBus.ts`) — ONLY bridge between Phaser and React
- **Supabase** — Google OAuth login + cloud leaderboard (Postgres)

---

## Project Status — Everything Built

### Original 5 phases (complete)
- ✅ Phase 1 — Project setup, EventBus, Zustand, types/constants
- ✅ Phase 2 — Pure engine: Grid, MatchFinder, ScoreCalculator, Gravity, BoardFiller
- ✅ Phase 3 — Phaser visual layer: board rendering, swap input, beam/nova animations
- ✅ Phase 4 — React UI: menus, HUD, EndScreen
- ✅ Phase 5 — Polish: space background, PWA, mobile touch, spaceship PNG sprites

### Post-GDD additions (all complete)
- ✅ **Supabase auth** — Google OAuth, username set once at first login
- ✅ **Cloud leaderboard** — per-planet, best-score-only per user (Supabase Postgres)
- ✅ **5 difficulty modes** — Mercury→Black Hole (moves/colors/timer vary per planet)
- ✅ **Planet map menu** — interactive map with Milky Way path, draggable rocket
- ✅ **Timer system** — countdown for Mars (90s) and Black Hole (60s), turns red at 10s
- ✅ **Enhanced starfield** — 3 depth layers (155 stars) + shooting stars (SpaceBackground)
- ✅ **Rocket animation** — drag/click rocket on map to select planet, LAUNCH starts game
- ✅ **HUD improvements** — planet name, difficulty label, timer display
- ✅ **Deployed** — Vercel auto-deploys on every git push to main

---

## Architecture Rules (never break these)

1. **React** handles all UI outside the game board (menus, HUD, leaderboard)
2. **Phaser** handles everything inside the canvas (board, sprites, animations)
3. **EventBus** is the ONLY channel between Phaser and React — never import one into the other
4. **`/engine`** folder is pure TypeScript — no Phaser, no React, no DOM
5. **Data layer is abstracted** — `LeaderboardService` interface, swap impl without touching UI
6. **`/store/gameStore.ts`** and **`/store/authStore.ts`** are Zustand — Phaser CAN import them (they're not React)

---

## The 5 Planets (difficulty config in `src/config/difficultyConfig.ts`)

| Planet | Difficulty | Moves | Colors | Timer |
|--------|-----------|-------|--------|-------|
| Mercury | Easy | 30 | 4 | none |
| Venus | Medium | 25 | 4 | none |
| Earth | Hard | 20 | 5 | none |
| Mars | Expert | 15 | 5 | 90s |
| Black Hole | Extreme | 10 | 5 | 60s |

---

## Match Shape Power Rules

| Shape | Clear zone | Score |
|-------|-----------|-------|
| Line-3 | 3 cells | 30 pts |
| Square (2×2) | 4 cells | 60 pts |
| Line-4 | Full row or column (8 cells) | 160 pts |
| L-Shape | Full row + full column of both arms (15 cells) | 225 pts |
| T-Shape | Same as L-Shape (15 cells) | 225 pts |
| Line-5 | Entire board (64 cells) | 1600 pts |

---

## Key Architecture Files

```
src/
├── config/
│   ├── difficultyConfig.ts   ← 5 planet configs (moves, colors, timer, visual)
│   └── constants.ts          ← CELL_SIZE, GRID_ROWS/COLS, BASE_SCORE, etc.
├── types/index.ts            ← GameState enum (MENU, PLANET_SELECT, PLAYING, ANIMATING, GAME_OVER)
├── bridge/EventBus.ts        ← All events: SCORE_UPDATE, MOVES_UPDATE, GAME_OVER, TIME_UPDATE, etc.
├── store/
│   ├── gameStore.ts          ← score, moves, timeRemaining, selectedDifficulty, gameState
│   └── authStore.ts          ← user, username, needsUsername, signInWithGoogle, signOut
├── services/
│   ├── leaderboardService.ts         ← interface + LocalLeaderboardService
│   └── supabaseLeaderboardService.ts ← SupabaseLeaderboardService (per-difficulty)
├── engine/                   ← Pure TS: Grid, MatchFinder, Gravity, BoardFiller, ScoreCalculator
├── phaser/
│   ├── scenes/GameScene.ts   ← reads selectedDifficulty from store, runs timer, manages board
│   └── animations/           ← SwapAnim, ExplosionAnim, BeamAnim (beam + nova)
└── components/
    ├── App.tsx               ← Root: SpaceBackground + UsernameSetup modal + AppRouter
    ├── components/App.tsx    ← AppRouter: switches screens by gameState
    ├── screens/
    │   ├── MainMenu.tsx      ← Planet map: Milky Way path, draggable rocket, planet nodes
    │   ├── GameScreen.tsx    ← HUD (← MENU, planet label, timer, score, moves) + PhaserGame
    │   └── EndScreen.tsx     ← Final score, per-planet leaderboard, Play Again
    ├── hud/
    │   ├── ScoreDisplay.tsx  ← Score + "+N pts" popup animation
    │   ├── MovesCounter.tsx  ← Moves left, turns red at ≤5
    │   └── TimerDisplay.tsx  ← Countdown timer (Mars/Black Hole only), red at ≤10s
    └── auth/
        ├── AuthPanel.tsx     ← Sign in with Google / username + sign out
        └── UsernameSetup.tsx ← First-login modal to pick game name
```

---

## Supabase Setup

- Project URL + anon key in `.env` (gitignored)
- Tables: `profiles` (user_id, username), `leaderboard_entries` (user_id, player_name, score, difficulty, created_at)
- RLS: anyone can read leaderboard, users can only insert their own rows
- Unique constraint: `(user_id, difficulty)` on leaderboard_entries (one best score per planet per user)
- Google OAuth enabled; redirect URLs: `http://localhost:517x` + `https://rocket-crush-phaser.vercel.app`

---

## Deployment

- **Vercel** auto-deploys on every push to `main` branch
- Env vars set in Vercel dashboard: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `npm run build` → `tsc -b && vite build` → `dist/`

---

## Possible Next Steps
1. **Sound effects** — swap, pop, beam, nova, UI clicks
2. **Confetti / celebration** when beating personal best
3. **Global leaderboard on menu** — show top players per planet
4. **More planet visual detail** — craters on Mercury, rings on a gas giant
5. **Level progression** — unlock harder planets after completing easier ones
