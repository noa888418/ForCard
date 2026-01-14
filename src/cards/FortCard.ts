import { Card } from '../Card.js';
import { FortCardId, Position, PlayerId } from '../types.js';
import { Board } from '../Board.js';

export abstract class FortCard extends Card {
  protected power: number; // 安定度の変化量

  constructor(id: FortCardId, name: string, description: string, power: number) {
    super(id, name, description, 'fort');
    this.power = power;
  }

  getPower(): number {
    return this.power;
  }

  // 強化カードは基本的にどこでも置ける（個別にオーバーライド可能）
  canPlay(board: Board, position: Position, playerId: PlayerId): boolean {
    return board.isValidPosition(position.x, position.y);
  }

  // 強化カードの効果適用（プレイヤーAは+、プレイヤーBは-）
  applyEffect(
    board: Board,
    position: Position,
    playerId: PlayerId,
    options?: any
  ): void {
    const targetPositions = this.getTargetPositions(board, position, playerId, options);
    const delta = playerId === 'A' ? this.power : -this.power;

    for (const pos of targetPositions) {
      const cell = board.getCell(pos.x, pos.y);
      if (cell) {
        cell.addStability(delta);
      }
    }
  }

  // 対象マスを取得（抽象メソッド）
  abstract getTargetPositions(
    board: Board,
    position: Position,
    playerId: PlayerId,
    options?: any
  ): Position[];
}

