import { Card } from '../Card.js';
import { DisruptionCardId, Position, PlayerId } from '../types.js';
import { Board } from '../Board.js';

export abstract class DisruptionCard extends Card {
  protected power: number;

  constructor(id: DisruptionCardId, name: string, description: string, power: number) {
    super(id, name, description, 'disruption');
    this.power = power;
  }

  getPower(): number {
    return this.power;
  }

  canPlay(board: Board, position: Position, playerId: PlayerId): boolean {
    return board.isValidPosition(position.x, position.y);
  }

  applyEffect(
    board: Board,
    position: Position,
    playerId: PlayerId,
    options?: any
  ): void {
    const targetPositions = this.getTargetPositions(board, position, playerId, options);

    for (const pos of targetPositions) {
      const cell = board.getCell(pos.x, pos.y);
      if (!cell || !cell.isOwnedByEnemy(playerId)) continue;

      const targetStability = playerId === 'A'
        ? Math.min(0, cell.stability + this.power)
        : Math.max(0, cell.stability - this.power);
      cell.setStability(targetStability);
    }
  }

  abstract getTargetPositions(
    board: Board,
    position: Position,
    playerId: PlayerId,
    options?: any
  ): Position[];
}
