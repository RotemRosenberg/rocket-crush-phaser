// EventBus is the ONLY communication channel between Phaser and React.
// Neither side imports the other — they only emit and listen through this bus.

class EventBus {
  // Stores a map from event name → list of registered callbacks
  private listeners: Map<string, Function[]> = new Map();

  // Subscribe: register a callback to run when the given event fires
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  // Unsubscribe: remove a specific callback so it no longer fires
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    this.listeners.set(
      event,
      callbacks.filter((cb) => cb !== callback)
    );
  }

  // Fire an event and pass optional data to every registered listener
  emit(event: string, data?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    callbacks.forEach((cb) => cb(data));
  }
}

// Single shared instance — import this everywhere instead of creating new ones
export const eventBus = new EventBus();

// All event name constants in one place — use these instead of raw strings
export const EVENTS = {
  // Player has selected two adjacent cells and requested a swap
  SWAP_REQUESTED: 'swap_requested',

  // The engine detected one or more valid matches after a swap or cascade
  MATCH_FOUND: 'match_found',

  // The player's score has changed (after a match or cascade)
  SCORE_UPDATE: 'score_update',

  // The number of remaining moves has decreased
  MOVES_UPDATE: 'moves_update',

  // The board's cell data has changed and the visual layer should re-render
  BOARD_UPDATED: 'board_updated',

  // The move counter reached zero — the game is over
  GAME_OVER: 'game_over',

  // No valid moves remain; the board is being reshuffled (free, no move cost)
  BOARD_RESHUFFLE: 'board_reshuffle',

  // A swap was attempted but produced no match — blocks should snap back
  INVALID_SWAP: 'invalid_swap',
} as const;
