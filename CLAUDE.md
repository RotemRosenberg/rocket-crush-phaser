# Rocket Crush — Claude Code Instructions

## About the developer
- Learning to code (~6 months experience), building this as a learning project
- Communicates in short messages, sometimes with spelling/grammar variations — read intent, don't correct
- Wants to understand what's happening, not just see code appear

## How we work together
- **One task at a time** — complete a task fully before moving to the next
- **Explain before coding** — for anything non-trivial, briefly say what you found and what you'll do, then wait for a go-ahead
- **Plan mode for big changes** — use EnterPlanMode when a feature touches many files
- **Always push to GitHub after finishing a feature** — `git add`, `git commit`, `git push` so Vercel auto-deploys
- **Run `npx tsc --noEmit` after every set of changes** — catch type errors before reporting done
- **Never leave the app broken** — if a change breaks the build mid-way, fix it before stopping

## Project overview
Read `CONTEXT.md` for the full current state, architecture, and file map.
This is a space-themed match-3 game (Rocket Crush) with:
- 5 planet difficulty modes (Mercury=Easy → Black Hole=Extreme)
- Google OAuth login + Supabase cloud leaderboard
- Phaser 3 game engine inside a React/Vite app
- Deployed live at https://rocket-crush-phaser.vercel.app

## Critical architecture rules
1. **EventBus only** between Phaser and React — never import React components into Phaser or vice versa
2. **`/engine` is pure TypeScript** — no Phaser, no React, no DOM APIs
3. **Zustand stores** (`gameStore`, `authStore`) can be imported by Phaser scenes — they are not React
4. **Leaderboard calls always pass `difficulty` (planet id string)** — per-planet leaderboards
5. **`startGame(config: DifficultyConfig)`** — always pass the difficulty config when starting a game

## Dev commands
```bash
npm run dev      # start dev server (usually localhost:5173 or next available)
npm run build    # production build
npx tsc --noEmit # type check only
```

## Env vars needed (in .env, gitignored)
```
VITE_SUPABASE_URL=https://vsmrdgfazkbrdjjzoujs.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```
