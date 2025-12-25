import { Position, CardId, CardType, PlayerId } from './types.js';
import { Board } from './Board.js';

export abstract class Card {
  protected id: CardId;
  protected name: string;
  protected description: string;
  protected type: CardType;

  constructor(id: CardId, name: string, description: string, type: CardType) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.type = type;
  }

  getId(): CardId {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getType(): CardType {
    return this.type;
  }

  // カードを置けるかチェック
  abstract canPlay(board: Board, position: Position, playerId: PlayerId, options?: any): boolean;

  // カードの効果を適用
  abstract applyEffect(
    board: Board,
    position: Position,
    playerId: PlayerId,
    options?: any
  ): void;

  // カードの対象マスを取得（表示用）
  abstract getTargetPositions(
    board: Board,
    position: Position,
    playerId: PlayerId,
    options?: any
  ): Position[];
}

