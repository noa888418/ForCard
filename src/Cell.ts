import { Position, PlayerId } from './types.js';

export class Cell {
  private _stability: number = 0;
  private _position: Position;

  constructor(x: number, y: number) {
    this._position = { x, y };
  }

  get stability(): number {
    return this._stability;
  }

  get position(): Position {
    return this._position;
  }

  get owner(): PlayerId | null {
    if (this._stability > 0) return 'A';
    if (this._stability < 0) return 'B';
    return null;
  }

  // 安定度を変更（クリップ処理込み）
  setStability(value: number): void {
    this._stability = Math.max(-5, Math.min(5, value));
  }

  // 安定度を加算（クリップ処理込み）
  addStability(delta: number): void {
    this.setStability(this._stability + delta);
  }

  // 安定度をリセット
  reset(): void {
    this._stability = 0;
  }

  // 自色かどうか
  isOwnedBy(playerId: PlayerId): boolean {
    return this.owner === playerId;
  }

  // 敵色かどうか
  isOwnedByEnemy(playerId: PlayerId): boolean {
    return this.owner !== null && this.owner !== playerId;
  }

  // 中立かどうか
  isNeutral(): boolean {
    return this.owner === null;
  }
}

