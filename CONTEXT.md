# Rocket Crush — Session Context

## What it is
Match-3 puzzle game, space theme. Player swaps adjacent ships to form matching shapes.
20 moves per game. Score is saved to a leaderboard. Fully functional as a PWA.

## Tech Stack
- **Vite + React + TypeScript** — UI, routing, HUD
- **Phaser 3** — game board, sprites, all animations
- **Zustand** — shared state (score, moves, game state)
- **EventBus** — the only bridge between Phaser and React

## Project Status

### Done (all 5 phases complete)
- ✅ Phase 1 — Project setup, EventBus, Zustand store, types/constants
- ✅ Phase 2 — Pure engine: Grid, MatchFinder, ScoreCalculator, Gravity, BoardFiller
- ✅ Phase 3 — Phaser visual layer: board rendering, swap input, all animations
- ✅ Phase 4 — React UI: MainMenu, HUD, EndScreen, leaderboard (localStorage)
- ✅ Phase 5 — Polish: space background, PWA config, mobile touch, spaceship sprites

### Polish added beyond the GDD
- Spaceship PNG sprites loaded from `public/assets/` (AI-generated, grey background
  removed by `node scripts/remove-bg.mjs`)
- CSS star field (`SpaceBackground.tsx`) fixed behind every screen in `App.tsx`
- Phaser internal starfield (3 parallax layers, 80 stars) in `GameScene.ts`
- `CELL_SIZE = 90px` → board is 720×720px, capped at native size via `scale.max`

---

## Key Decisions NOT in the GDD

### Match shape power rules (implemented in MatchFinder + GameScene)

| Shape | Clear zone | Score |
|-------|-----------|-------|
| Line-3 | 3 cells | 30 pts |
| Square | 4 cells | 60 pts |
| **Line-4** | **Full row or column (8 cells)** | **160 pts** |
| **L-Shape** | **Full row + full column that the two arms occupy (15 cells)** | **225 pts** |
| **T-Shape** | **Same as L-Shape (15 cells)** | **225 pts** |
| **Line-5** | **Entire board (64 cells)** | **1600 pts** |

`MatchResult` has three cell fields: `matchCells` (shape only), `bonusCells` (power zone),
`cells` (union). This separation exists so future animations can tell them apart.

### Animations (BeamAnim.ts + GameScene.ts)

- **Line-4** → light beam shoots from swap cell in both directions along the row/col.
  Cells disappear as the beam passes. 400ms.
- **L-Shape / T-Shape** → two simultaneous cross beams from the arm intersection point.
  One horizontal, one vertical. Both resolve before gravity. 400ms.
- **Line-5** → "Nova Explosion": bright flash at grid centre → 9 concentric wave rings
  expand outward (60ms per ring). Each ring pops its cells with sparks + scale-to-0.
  Expanding golden shockwave circle visual. ~690ms total.

### Architecture decisions
- `StrictMode` removed from `main.tsx` — Phaser + React Strict Mode double-mount
  caused two GameScene instances and doubled all EventBus events (score/moves).
- `ROCKET_COLORS` is exported from `ExplosionAnim.ts` and shared with `BeamAnim.ts`
  and `GameScene.ts` for beam colour lookup.

---

## Last Session — What We Built
Nova Explosion animation for Line-5 matches (`playNovaExplosion` in `BeamAnim.ts`).
Cells group into 9 wave rings by distance from grid centre, each ring pops 60ms after
the previous. Full board clears in ~690ms. Integrated into the `GameScene` cascade loop.

## Next Steps (suggested)
1. **Sound effects** — swap, pop, beam, nova, UI clicks (not in GDD, would add polish)
2. **Score flash animation** — the "+N pts" popup in the HUD could use the beam colour
3. **Supabase leaderboard** — replace `LocalLeaderboardService` with Supabase implementation
   (service interface is already abstracted in `src/services/leaderboardService.ts`)
4. **Rocket spaceship sprites Phase 2** — swap remaining placeholder colors for distinct
   ship designs per rocket type if higher-quality art is available
5. **Deploy** — build and host as PWA (Vercel / Netlify / GitHub Pages)
