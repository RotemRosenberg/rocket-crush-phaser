import type { MatchResult } from '../types';
import { BASE_SCORE, SHAPE_MULTIPLIERS } from '../config/constants';

/*
  Worked example — Line-4 match:
    cells:      4 blocks
    BASE_SCORE: 10 pts per block
    multiplier: ×2.0  (LINE4)
    result:     4 × 10 × 2.0 = 80 pts
*/

export class ScoreCalculator {
  // Score a single match: cell count × base score × shape multiplier
  calculateMatchScore(match: MatchResult): number {
    return Math.round(match.cells.length * BASE_SCORE * SHAPE_MULTIPLIERS[match.shape]);
  }

  // Score all matches produced by one cascade level
  calculateCascadeScore(matches: MatchResult[]): number {
    return matches.reduce((total, match) => total + this.calculateMatchScore(match), 0);
  }

  // Score a full turn: the player's direct matches + every cascade level that follows
  calculateTurnScore(
    playerMatches: MatchResult[],
    cascadeMatches: MatchResult[][]
  ): number {
    const playerTotal = this.calculateCascadeScore(playerMatches);
    const cascadeTotal = cascadeMatches.reduce(
      (sum, level) => sum + this.calculateCascadeScore(level),
      0
    );
    return playerTotal + cascadeTotal;
  }
}

// Single shared instance — import this wherever scores need to be calculated
export const scoreCalculator = new ScoreCalculator();
