import { Card } from '../Card.js';
import { SpecialCardId, Position, PlayerId } from '../types.js';
import { Board } from '../Board.js';
import { ColorCard } from './ColorCard.js';

// 特殊カードの基底クラス
export abstract class SpecialCard extends Card {
  constructor(id: SpecialCardId, name: string, description: string) {
    super(id, name, description, 'special');
  }

  // 特殊カードは基本的にどこでも置ける（個別にオーバーライド可能）
  canPlay(board: Board, position: Position, playerId: PlayerId): boolean {
    return board.isValidPosition(position.x, position.y);
  }
}

// S01: リバーサル・フィールド
export class S01_ReversalField extends SpecialCard {
  private turnSnapshot: Board | null = null;
  private usedTurn: number = -1;

  constructor() {
    super('S01', 'リバーサル・フィールド', '使用時点の盤面を記録し、有効ターン内なら全マスの色ポイント符号を反転');
  }

  applyEffect(board: Board, position: Position, playerId: PlayerId, options?: { currentTurn: number, totalTurns: number }): void {
    const currentTurn = options?.currentTurn || 0;
    const totalTurns = options?.totalTurns || 15;

    // 有効ターン数 = 全ターン数 - 3
    // カードの残り枚数が3枚より多い間は有効となる
    const effectiveTurns = totalTurns - 3;

    if (currentTurn <= effectiveTurns) {
      // 有効ターン数まで: 全反転効果
      if (!this.turnSnapshot) {
        this.turnSnapshot = board.clone();
        this.usedTurn = currentTurn;
      }

      // 盤面の符号を反転
      const size = board.getSize();
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const cell = board.getCell(x, y);
          if (cell && cell.stability !== 0) {
            cell.setStability(-cell.stability);
          }
        }
      }
    } else {
      // 有効ターン数を超えた場合: C01と同じ効果
      const cell = board.getCell(position.x, position.y);
      if (cell) {
        const delta = playerId === 'A' ? 1 : -1;
        cell.addStability(delta);
      }
    }
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    return [position];
  }
}

// S02: フォーカスシフト
export class S02_FocusShift extends SpecialCard {
  constructor() {
    super('S02', 'フォーカスシフト', '自分ターンで最後に使った色カードと同じパターンをもう一度適用。最後に使った色カードが配置されたマスと同じマスに、同じ効果が適用される。色カードを一枚も使っていない場合はC01：単点塗りと同じ効果');
  }

  canPlay(board: Board, position: Position, playerId: PlayerId, options?: { lastColorCard: ColorCard | null; lastColorCardPosition?: Position | null }): boolean {
    // 常に使用可能（色カードを使っていない場合はC01効果として使用可能）
    return true;
  }

  applyEffect(board: Board, position: Position, playerId: PlayerId, options?: { lastColorCard: ColorCard | null; lastColorCardPosition?: Position | null }): void {
    const lastCard = options?.lastColorCard;
    const lastCardPosition = options?.lastColorCardPosition;
    
    if (!lastCard || !lastCardPosition) {
      // 色カードを一枚も使っていない場合：C01：単点塗りと同じ効果
      // S02を配置したマスに+1
      const cell = board.getCell(position.x, position.y);
      if (cell) {
        const delta = playerId === 'A' ? 1 : -1;
        cell.addStability(delta);
      }
      return;
    }

    // 最後に使った色カードが配置されたマスと同じマスに、同じ効果が適用される
    // S02の配置位置は関係なく、最後に使った色カードの位置を使用
    const targetPositions = lastCard.getTargetPositions(board, lastCardPosition, playerId);
    const power = lastCard.getPower();
    const delta = playerId === 'A' ? power : -power;

    for (const pos of targetPositions) {
      const cell = board.getCell(pos.x, pos.y);
      if (cell) {
        cell.addStability(delta);
      }
    }
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId, options?: { lastColorCard: ColorCard | null; lastColorCardPosition?: Position | null }): Position[] {
    const lastCard = options?.lastColorCard;
    const lastCardPosition = options?.lastColorCardPosition;
    
    if (!lastCard || !lastCardPosition) {
      // 色カードを一枚も使っていない場合：C01：単点塗りと同じパターン
      // S02を配置したマスのみ
      return [position];
    }
    
    // 最後に使った色カードが配置されたマスと同じマスに、同じ効果が適用される
    // S02の配置位置は関係なく、最後に使った色カードの位置を使用
    return lastCard.getTargetPositions(board, lastCardPosition, playerId);
  }
}

// S03: オーバーロード
export class S03_Overload extends SpecialCard {
  constructor() {
    super('S03', 'オーバーロード', '自色マスにのみ置ける。置いたマスの色ポイントを+5に設定し、上下左右4マスの色ポイントを-1');
  }

  canPlay(board: Board, position: Position, playerId: PlayerId): boolean {
    const cell = board.getCell(position.x, position.y);
    return cell !== null && cell.isOwnedBy(playerId);
  }

  applyEffect(board: Board, position: Position, playerId: PlayerId): void {
    // 置いたマスを+5に設定
    const centerCell = board.getCell(position.x, position.y);
    if (centerCell) {
      if (playerId === 'A') {
        centerCell.setStability(5);
      } else {
        centerCell.setStability(-5);
      }
    }

    // 上下左右を-1
    const neighbors = [
      { x: position.x, y: position.y - 1 },
      { x: position.x, y: position.y + 1 },
      { x: position.x - 1, y: position.y },
      { x: position.x + 1, y: position.y }
    ];

    for (const pos of neighbors) {
      const cell = board.getCell(pos.x, pos.y);
      if (cell) {
        const delta = playerId === 'A' ? -1 : 1;
        cell.addStability(delta);
      }
    }
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    return [position];
  }
}

// S04: ダブルアクション（ゲームマネージャーで処理が必要）
export class S04_DoubleAction extends SpecialCard {
  constructor() {
    super('S04', 'ダブルアクション', '次の自分ターンに限り、色カードを最大2枚まで連続でプレイできる。その次のターンは行動スキップ');
  }

  applyEffect(board: Board, position: Position, playerId: PlayerId): void {
    // このカード自体は盤面に影響しない
    // 効果はGameManagerで処理
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    return [position];
  }
}

// S05: スペシャルジャマー（ゲームマネージャーで処理が必要）
export class S05_SpecialJammer extends SpecialCard {
  constructor() {
    super('S05', 'スペシャルジャマー', 'このターン、相手が出したカードが特殊カードだった場合、その効果を完全に無効化');
  }

  applyEffect(board: Board, position: Position, playerId: PlayerId): void {
    // 効果はGameManagerで処理
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    return [position];
  }
}

// S06: カラーギャンブル（ゲームマネージャーで処理が必要）
export class S06_ColorGamble extends SpecialCard {
  constructor() {
    super('S06', 'カラーギャンブル', '相手が色カードを使うと読む。相手のパターンと同じパターンを適用し、相手から1マス奪う');
  }

  applyEffect(board: Board, position: Position, playerId: PlayerId): void {
    // 効果はGameManagerで処理
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    return [position];
  }
}

// S07: タイムボム
export class S07_TimeBomb extends SpecialCard {
  private explosionTurn: number = -1;

  constructor() {
    super('S07', 'タイムボム', '設置から2ターン後の自分ターン終了時に爆発。爆心地3×3内の自色マスの色ポイントを+2、敵色マスの色ポイントを+1');
  }

  applyEffect(board: Board, position: Position, playerId: PlayerId, options?: { currentTurn: number }): void {
    const currentTurn = options?.currentTurn || 0;
    this.explosionTurn = currentTurn + 2;
    // 爆発はGameManagerで処理
  }

  getExplosionTurn(): number {
    return this.explosionTurn;
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    // 3×3ブロック
    const positions: Position[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const pos = { x: position.x + dx, y: position.y + dy };
        if (board.isValidPosition(pos.x, pos.y)) {
          positions.push(pos);
        }
      }
    }
    return positions;
  }

  // 爆発処理
  explode(board: Board, position: Position, playerId: PlayerId): void {
    const positions = this.getTargetPositions(board, position, playerId);
    for (const pos of positions) {
      const cell = board.getCell(pos.x, pos.y);
      if (cell) {
        if (cell.isOwnedBy(playerId)) {
          // 自色マス: +2
          const delta = playerId === 'A' ? 2 : -2;
          cell.addStability(delta);
        } else if (cell.isOwnedByEnemy(playerId)) {
          // 敵色マス: +1（0側に近づく）
          const delta = playerId === 'A' ? 1 : -1;
          cell.addStability(delta);
        }
        // 中立マスは変化なし
      }
    }
  }
}

// S08: サクリファイス・スワップ
export class S08_SacrificeSwap extends SpecialCard {
  constructor() {
    super('S08', 'サクリファイス・スワップ', '中立or敵色マスにのみ置ける。自色マスから最大3マスを犠牲にして、その色ポイントを置いたマスに集約');
  }

  canPlay(board: Board, position: Position, playerId: PlayerId): boolean {
    const cell = board.getCell(position.x, position.y);
    return cell !== null && (cell.isNeutral() || cell.isOwnedByEnemy(playerId));
  }

  applyEffect(board: Board, position: Position, playerId: PlayerId, options?: { sacrificePositions: Position[] }): void {
    const sacrificePositions = options?.sacrificePositions || [];
    let totalStability = 0;

    // 犠牲マスの安定度を合計（まだ自色のままのもののみ）
    for (const pos of sacrificePositions) {
      const cell = board.getCell(pos.x, pos.y);
      if (cell && cell.isOwnedBy(playerId)) {
        totalStability += Math.abs(cell.stability);
        cell.reset(); // 中立にリセット
      }
    }

    // 置いたマスに配分
    const centerCell = board.getCell(position.x, position.y);
    if (centerCell && totalStability > 0) {
      const currentStability = centerCell.stability;
      const newStability = playerId === 'A' 
        ? Math.min(5, currentStability + totalStability)
        : Math.max(-5, currentStability - totalStability);
      
      centerCell.setStability(newStability);

      // 5を超えた分は周囲に振り分け
      const overflow = playerId === 'A'
        ? Math.max(0, currentStability + totalStability - 5)
        : Math.max(0, Math.abs(currentStability - totalStability) - 5);

      if (overflow > 0) {
        const neighbors = [
          { x: position.x, y: position.y - 1 },
          { x: position.x, y: position.y + 1 },
          { x: position.x - 1, y: position.y },
          { x: position.x + 1, y: position.y }
        ];

        let remaining = overflow;
        for (const pos of neighbors) {
          if (remaining <= 0) break;
          const cell = board.getCell(pos.x, pos.y);
          if (cell) {
            const delta = playerId === 'A' ? 1 : -1;
            const before = Math.abs(cell.stability);
            cell.addStability(delta);
            const after = Math.abs(cell.stability);
            if (after > before) {
              remaining--;
            }
          }
        }
      }
    }
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    return [position];
  }
}

// S09: ラストフォートレス
export class S09_LastFortress extends SpecialCard {
  constructor() {
    super('S09', 'ラストフォートレス', '自色連結領域を対象。残り4ターン以上ならランダム1〜3マスの色ポイントを+1。残り3ターン以内なら領域を要塞化し、他をリセット');
  }

  applyEffect(board: Board, position: Position, playerId: PlayerId, options?: { remainingTurns: number }): void {
    const remainingTurns = options?.remainingTurns || 0;
    const regions = board.getConnectedRegions(playerId);
    
    // positionが含まれる連結領域を探す
    let targetRegion = null;
    for (const region of regions) {
      if (region.positions.some(p => p.x === position.x && p.y === position.y)) {
        targetRegion = region;
        break;
      }
    }

    if (!targetRegion) {
      return; // 対象領域が見つからない
    }

    if (remainingTurns >= 4) {
      // 早期使用: ランダム1〜3マス+1
      const count = Math.floor(Math.random() * 3) + 1;
      const shuffled = [...targetRegion.positions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, count);
      
      for (const pos of selected) {
        const cell = board.getCell(pos.x, pos.y);
        if (cell) {
          const delta = playerId === 'A' ? 1 : -1;
          cell.addStability(delta);
        }
      }
    } else {
      // 覚醒状態: 領域内の自色マスを2倍、他をリセット
      const size = board.getSize();
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const cell = board.getCell(x, y);
          if (cell) {
            const isInRegion = targetRegion.positions.some(p => p.x === x && p.y === y);
            if (isInRegion && cell.isOwnedBy(playerId)) {
              // 領域内の自色マス: 2倍（上限5）
              const newStability = playerId === 'A'
                ? Math.min(5, Math.abs(cell.stability) * 2)
                : -Math.min(5, Math.abs(cell.stability) * 2);
              cell.setStability(newStability);
            } else if (cell.isOwnedBy(playerId)) {
              // 領域外の自色マス: リセット
              cell.reset();
            }
          }
        }
      }
    }
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const regions = board.getConnectedRegions(playerId);
    for (const region of regions) {
      if (region.positions.some(p => p.x === position.x && p.y === position.y)) {
        return region.positions;
      }
    }
    return [];
  }
}

// S10: ターゲットロック
export class S10_TargetLock extends SpecialCard {
  constructor() {
    super('S10', 'ターゲットロック', '相手が色カードを使うと読む。相手の対象にロック座標が含まれていれば、そのマスの色ポイントを自分色+2に。外れればペナルティ');
  }

  applyEffect(board: Board, position: Position, playerId: PlayerId, options?: { opponentTargetPositions: Position[] }): void {
    const opponentTargets = options?.opponentTargetPositions || [];
    const isHit = opponentTargets.some(p => p.x === position.x && p.y === position.y);

    if (isHit) {
      // 読み当たり: そのマスを自分色+2
      const cell = board.getCell(position.x, position.y);
      if (cell) {
        if (playerId === 'A') {
          cell.setStability(5); // 上限5でクリップ
        } else {
          cell.setStability(-5);
        }
        // +2を加算（既に上限ならそのまま）
        const delta = playerId === 'A' ? 2 : -2;
        cell.addStability(delta);
      }
    } else {
      // 読み外れ: ペナルティ
      const cell = board.getCell(position.x, position.y);
      if (cell) {
        if (cell.isOwnedBy(playerId)) {
          // 自色マス: -2
          const delta = playerId === 'A' ? -2 : 2;
          cell.addStability(delta);
        } else if (cell.isNeutral()) {
          // 中立マス: -1（敵側に傾く）
          const delta = playerId === 'A' ? -1 : 1;
          cell.addStability(delta);
        } else if (cell.isOwnedByEnemy(playerId)) {
          // 敵色マス: +1（相手が得する）
          const delta = playerId === 'A' ? 1 : -1;
          cell.addStability(delta);
        }
      }
    }
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    return [position];
  }
}

