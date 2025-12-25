import { Card } from '../Card.js';
import { ColorCardId, Position, PlayerId } from '../types.js';
import { Board } from '../Board.js';

export abstract class ColorCard extends Card {
  protected power: number; // 安定度の変化量

  constructor(id: ColorCardId, name: string, description: string, power: number) {
    super(id, name, description, 'color');
    this.power = power;
  }

  getPower(): number {
    return this.power;
  }

  // 色カードは基本的にどこでも置ける
  canPlay(board: Board, position: Position, playerId: PlayerId): boolean {
    return board.isValidPosition(position.x, position.y);
  }

  // 色カードの効果適用（プレイヤーAは+、プレイヤーBは-）
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

