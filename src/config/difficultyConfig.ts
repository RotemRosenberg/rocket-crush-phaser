export interface DifficultyConfig {
  id: string;
  label: string;        // planet name shown in UI
  difficulty: string;   // Easy / Medium / Hard / Expert / Extreme
  maxMoves: number;
  colorCount: number;   // how many of the 5 rocket colors are active
  timeLimit: number | null; // seconds; null = no timer
  planetSize: number;   // CSS diameter in px
  gradient: [string, string]; // CSS radial-gradient stops
  glowColor: string;    // CSS box-shadow glow
}

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: 'mercury',
    label: 'Mercury',
    difficulty: 'Easy',
    maxMoves: 30,
    colorCount: 4,
    timeLimit: null,
    planetSize: 72,
    gradient: ['#c8c8c8', '#5a5a5a'],
    glowColor: 'rgba(200,200,200,0.45)',
  },
  {
    id: 'venus',
    label: 'Venus',
    difficulty: 'Medium',
    maxMoves: 25,
    colorCount: 4,
    timeLimit: null,
    planetSize: 98,
    gradient: ['#f7d080', '#c47a1a'],
    glowColor: 'rgba(247,208,128,0.45)',
  },
  {
    id: 'earth',
    label: 'Earth',
    difficulty: 'Hard',
    maxMoves: 20,
    colorCount: 5,
    timeLimit: null,
    planetSize: 122,
    gradient: ['#5bc8f5', '#1246a0'],
    glowColor: 'rgba(91,200,245,0.45)',
  },
  {
    id: 'mars',
    label: 'Mars',
    difficulty: 'Expert',
    maxMoves: 15,
    colorCount: 5,
    timeLimit: 90,
    planetSize: 104,
    gradient: ['#f06050', '#8b1a0e'],
    glowColor: 'rgba(240,96,80,0.45)',
  },
  {
    id: 'blackhole',
    label: 'Black Hole',
    difficulty: 'Extreme',
    maxMoves: 10,
    colorCount: 5,
    timeLimit: 60,
    planetSize: 148,
    gradient: ['#7c3aed', '#0a0010'],
    glowColor: 'rgba(124,58,237,0.6)',
  },
];

// Default (Earth/Hard) — used as fallback until a planet is chosen
export const DEFAULT_DIFFICULTY = DIFFICULTIES[2];
