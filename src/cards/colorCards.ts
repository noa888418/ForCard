import { ColorCard } from './ColorCard.js';
import { Position, PlayerId } from '../types.js';
import { Board } from '../Board.js';

// 弱い色カード（C01〜C10）
export class C01_SinglePoint extends ColorCard {
  constructor() {
    super('C01', '単点塗り', '任意のマス1つの安定度を+1', 1);
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    return [position];
  }
}

export class C02_SinglePointBoost extends ColorCard {
  constructor() {
    super('C02', '単点強化', '自色マス1つの安定度を+2', 2);
  }

  canPlay(board: Board, position: Position, playerId: PlayerId): boolean {
    const cell = board.getCell(position.x, position.y);
    return cell !== null && cell.isOwnedBy(playerId);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const cell = board.getCell(position.x, position.y);
    if (cell && cell.isOwnedBy(playerId)) {
      return [position];
    }
    return [];
  }
}

export class C03_Straight2 extends ColorCard {
  constructor() {
    super('C03', '直線2マス', 'ターゲットと上下or左右の隣接マス計2マスを+1', 1);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId, options?: { direction?: 'horizontal' | 'vertical' }): Position[] {
    const positions: Position[] = [position];
    const dir = options?.direction || 'horizontal';

    if (dir === 'horizontal') {
      // 左右
      const left = board.getCell(position.x - 1, position.y);
      const right = board.getCell(position.x + 1, position.y);
      if (left) positions.push({ x: position.x - 1, y: position.y });
      if (right) positions.push({ x: position.x + 1, y: position.y });
    } else {
      // 上下
      const up = board.getCell(position.x, position.y - 1);
      const down = board.getCell(position.x, position.y + 1);
      if (up) positions.push({ x: position.x, y: position.y - 1 });
      if (down) positions.push({ x: position.x, y: position.y + 1 });
    }

    return positions;
  }
}

export class C04_Diagonal2 extends ColorCard {
  constructor() {
    super('C04', '斜め2マス', 'ターゲットと斜め方向の隣接マス1つの計2マスを+1', 1);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId, options?: { diagonal?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }): Position[] {
    const positions: Position[] = [position];
    const dir = options?.diagonal || 'top-right';

    const offsets: Record<string, Position> = {
      'top-left': { x: -1, y: -1 },
      'top-right': { x: 1, y: -1 },
      'bottom-left': { x: -1, y: 1 },
      'bottom-right': { x: 1, y: 1 }
    };

    const offset = offsets[dir];
    const neighbor = board.getCell(position.x + offset.x, position.y + offset.y);
    if (neighbor) {
      positions.push({ x: position.x + offset.x, y: position.y + offset.y });
    }

    return positions;
  }
}

export class C05_SurroundOwnOnly extends ColorCard {
  constructor() {
    super('C05', '周囲自陣集中塗り', 'ターゲット+上下左右のうち自色マスだけ+1', 1);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const positions: Position[] = [];
    const neighbors = [
      position,
      { x: position.x, y: position.y - 1 },
      { x: position.x, y: position.y + 1 },
      { x: position.x - 1, y: position.y },
      { x: position.x + 1, y: position.y }
    ];

    for (const pos of neighbors) {
      const cell = board.getCell(pos.x, pos.y);
      if (cell && cell.isOwnedBy(playerId)) {
        positions.push(pos);
      }
    }

    return positions;
  }
}

export class C06_Corner3 extends ColorCard {
  constructor() {
    super('C06', '角専用3マス', '盤面の四隅にのみ置ける。角マス+内向き2マスを+1', 1);
  }

  canPlay(board: Board, position: Position): boolean {
    const size = board.getSize();
    const isCorner = 
      (position.x === 0 && position.y === 0) ||
      (position.x === 0 && position.y === size - 1) ||
      (position.x === size - 1 && position.y === 0) ||
      (position.x === size - 1 && position.y === size - 1);
    return isCorner;
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    const positions: Position[] = [position];
    const size = board.getSize();

    // 角の位置に応じて内向き2マスを追加
    if (position.x === 0 && position.y === 0) {
      // 左上
      positions.push({ x: 1, y: 0 }, { x: 0, y: 1 });
    } else if (position.x === 0 && position.y === size - 1) {
      // 左下
      positions.push({ x: 1, y: size - 1 }, { x: 0, y: size - 2 });
    } else if (position.x === size - 1 && position.y === 0) {
      // 右上
      positions.push({ x: size - 2, y: 0 }, { x: size - 1, y: 1 });
    } else if (position.x === size - 1 && position.y === size - 1) {
      // 右下
      positions.push({ x: size - 2, y: size - 1 }, { x: size - 1, y: size - 2 });
    }

    return positions.filter(pos => board.isValidPosition(pos.x, pos.y));
  }
}

export class C07_Edge3 extends ColorCard {
  constructor() {
    super('C07', '端専用3マス', '盤面の辺上のマスにのみ置ける。そのマス+内側方向2マスを+1', 1);
  }

  canPlay(board: Board, position: Position): boolean {
    const size = board.getSize();
    const isEdge = 
      position.x === 0 || position.x === size - 1 ||
      position.y === 0 || position.y === size - 1;
    const isCorner = 
      (position.x === 0 && position.y === 0) ||
      (position.x === 0 && position.y === size - 1) ||
      (position.x === size - 1 && position.y === 0) ||
      (position.x === size - 1 && position.y === size - 1);
    return isEdge && !isCorner;
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    const positions: Position[] = [position];
    const size = board.getSize();

    // 辺の位置に応じて内側方向2マスを追加
    if (position.x === 0) {
      // 左端
      positions.push({ x: 1, y: position.y }, { x: 2, y: position.y });
    } else if (position.x === size - 1) {
      // 右端
      positions.push({ x: size - 2, y: position.y }, { x: size - 3, y: position.y });
    } else if (position.y === 0) {
      // 上端
      positions.push({ x: position.x, y: 1 }, { x: position.x, y: 2 });
    } else if (position.y === size - 1) {
      // 下端
      positions.push({ x: position.x, y: size - 2 }, { x: position.x, y: size - 3 });
    }

    return positions.filter(pos => board.isValidPosition(pos.x, pos.y));
  }
}

export class C08_CenterOwnBoost extends ColorCard {
  constructor() {
    super('C08', '中心+自陣強化', 'ターゲット+上下左右のうち自色マスのみ+1', 1);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const positions: Position[] = [];
    const neighbors = [
      position,
      { x: position.x, y: position.y - 1 },
      { x: position.x, y: position.y + 1 },
      { x: position.x - 1, y: position.y },
      { x: position.x + 1, y: position.y }
    ];

    for (const pos of neighbors) {
      const cell = board.getCell(pos.x, pos.y);
      if (cell && cell.isOwnedBy(playerId)) {
        positions.push(pos);
      }
    }

    return positions;
  }
}

export class C09_EnemyReduce extends ColorCard {
  constructor() {
    super('C09', '敵色削り', '敵色マス1つの安定度を+1（0側に近づく）', 1);
  }

  canPlay(board: Board, position: Position, playerId: PlayerId): boolean {
    const cell = board.getCell(position.x, position.y);
    return cell !== null && cell.isOwnedByEnemy(playerId);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const cell = board.getCell(position.x, position.y);
    if (cell && cell.isOwnedByEnemy(playerId)) {
      return [position];
    }
    return [];
  }
}

export class C10_UpDown2 extends ColorCard {
  constructor() {
    super('C10', '上下2マス塗り', 'ターゲットの上と下の2マスを+1。ターゲット自身は変化なし', 1);
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    const positions: Position[] = [];
    const up = board.getCell(position.x, position.y - 1);
    const down = board.getCell(position.x, position.y + 1);
    if (up) positions.push({ x: position.x, y: position.y - 1 });
    if (down) positions.push({ x: position.x, y: position.y + 1 });
    return positions;
  }
}

// そこそこの色カード（C11〜C20）
export class C11_Cross extends ColorCard {
  constructor() {
    super('C11', '十字塗り', 'ターゲット+上下左右（最大5マス）を+1', 1);
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    const positions: Position[] = [position];
    const neighbors = [
      { x: position.x, y: position.y - 1 },
      { x: position.x, y: position.y + 1 },
      { x: position.x - 1, y: position.y },
      { x: position.x + 1, y: position.y }
    ];

    for (const pos of neighbors) {
      if (board.isValidPosition(pos.x, pos.y)) {
        positions.push(pos);
      }
    }

    return positions;
  }
}

export class C12_DiagonalCross extends ColorCard {
  constructor() {
    super('C12', '斜め十字塗り', 'ターゲット+斜め4マス（最大5マス）を+1', 1);
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    const positions: Position[] = [position];
    const diagonals = [
      { x: position.x - 1, y: position.y - 1 },
      { x: position.x + 1, y: position.y - 1 },
      { x: position.x - 1, y: position.y + 1 },
      { x: position.x + 1, y: position.y + 1 }
    ];

    for (const pos of diagonals) {
      if (board.isValidPosition(pos.x, pos.y)) {
        positions.push(pos);
      }
    }

    return positions;
  }
}

export class C13_Horizontal3 extends ColorCard {
  constructor() {
    super('C13', '横三連', 'ターゲットの左・中心・右（最大3マス）を+1', 1);
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    const positions: Position[] = [];
    const left = board.getCell(position.x - 1, position.y);
    const center = board.getCell(position.x, position.y);
    const right = board.getCell(position.x + 1, position.y);
    if (left) positions.push({ x: position.x - 1, y: position.y });
    if (center) positions.push(position);
    if (right) positions.push({ x: position.x + 1, y: position.y });
    return positions;
  }
}

export class C14_Vertical3 extends ColorCard {
  constructor() {
    super('C14', '縦三連', 'ターゲットの上・中心・下（最大3マス）を+1', 1);
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    const positions: Position[] = [];
    const up = board.getCell(position.x, position.y - 1);
    const center = board.getCell(position.x, position.y);
    const down = board.getCell(position.x, position.y + 1);
    if (up) positions.push({ x: position.x, y: position.y - 1 });
    if (center) positions.push(position);
    if (down) positions.push({ x: position.x, y: position.y + 1 });
    return positions;
  }
}

export class C15_Block2x2 extends ColorCard {
  constructor() {
    super('C15', '2×2ブロック塗り', 'ターゲットを左上とした2×2ブロック4マスを+1', 1);
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    const positions: Position[] = [];
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const pos = { x: position.x + dx, y: position.y + dy };
        if (board.isValidPosition(pos.x, pos.y)) {
          positions.push(pos);
        }
      }
    }
    return positions;
  }
}

export class C16_LShape extends ColorCard {
  constructor() {
    super('C16', 'L字形成', 'ターゲット+右+下（計3マス）を+1。回転可', 1);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId, options?: { rotation?: number }): Position[] {
    const positions: Position[] = [position];
    const rotation = (options?.rotation || 0) % 4;

    // 回転に応じたオフセット
    const offsets = [
      [{ x: 1, y: 0 }, { x: 0, y: 1 }], // 0度: 右+下
      [{ x: 0, y: -1 }, { x: 1, y: 0 }], // 90度: 上+右
      [{ x: -1, y: 0 }, { x: 0, y: -1 }], // 180度: 左+上
      [{ x: 0, y: 1 }, { x: -1, y: 0 }]  // 270度: 下+左
    ];

    const offset = offsets[rotation];
    for (const off of offset) {
      const pos = { x: position.x + off.x, y: position.y + off.y };
      if (board.isValidPosition(pos.x, pos.y)) {
        positions.push(pos);
      }
    }

    return positions;
  }
}

export class C17_TShape extends ColorCard {
  constructor() {
    super('C17', 'T字形成', 'ターゲット+左右+上or下（計3〜4マス）を+1', 1);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId, options?: { direction?: 'up' | 'down' }): Position[] {
    const positions: Position[] = [position];
    const dir = options?.direction || 'up';

    // 左右は常に追加
    const left = board.getCell(position.x - 1, position.y);
    const right = board.getCell(position.x + 1, position.y);
    if (left) positions.push({ x: position.x - 1, y: position.y });
    if (right) positions.push({ x: position.x + 1, y: position.y });

    // 上下のどちらかを追加
    if (dir === 'up') {
      const up = board.getCell(position.x, position.y - 1);
      if (up) positions.push({ x: position.x, y: position.y - 1 });
    } else {
      const down = board.getCell(position.x, position.y + 1);
      if (down) positions.push({ x: position.x, y: position.y + 1 });
    }

    return positions;
  }
}

export class C18_LShapeBoost extends ColorCard {
  constructor() {
    super('C18', 'L字強化（自陣のみ）', '任意の2×2ブロック内の自色マスだけ安定度+2', 2);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const positions: Position[] = [];
    // positionを左上とした2×2ブロック
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const pos = { x: position.x + dx, y: position.y + dy };
        const cell = board.getCell(pos.x, pos.y);
        if (cell && cell.isOwnedBy(playerId)) {
          positions.push(pos);
        }
      }
    }
    return positions;
  }
}

export class C19_CrossBoost extends ColorCard {
  constructor() {
    super('C19', '十字強化（自陣のみ）', 'ターゲット+上下左右のうち自色マスだけ+1', 1);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const positions: Position[] = [];
    const neighbors = [
      position,
      { x: position.x, y: position.y - 1 },
      { x: position.x, y: position.y + 1 },
      { x: position.x - 1, y: position.y },
      { x: position.x + 1, y: position.y }
    ];

    for (const pos of neighbors) {
      const cell = board.getCell(pos.x, pos.y);
      if (cell && cell.isOwnedBy(playerId)) {
        positions.push(pos);
      }
    }

    return positions;
  }
}

export class C20_SurroundOwnBoost extends ColorCard {
  constructor() {
    super('C20', '周囲自陣強化（中心自色限定）', 'ターゲットは自色マスのみ。ターゲット+上下左右のうち自色マスだけ+1', 1);
  }

  canPlay(board: Board, position: Position, playerId: PlayerId): boolean {
    const cell = board.getCell(position.x, position.y);
    return cell !== null && cell.isOwnedBy(playerId);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const positions: Position[] = [];
    const neighbors = [
      position,
      { x: position.x, y: position.y - 1 },
      { x: position.x, y: position.y + 1 },
      { x: position.x - 1, y: position.y },
      { x: position.x + 1, y: position.y }
    ];

    for (const pos of neighbors) {
      const cell = board.getCell(pos.x, pos.y);
      if (cell && cell.isOwnedBy(playerId)) {
        positions.push(pos);
      }
    }

    return positions;
  }
}

// 強い色カード（C21〜C30）
export class C21_HorizontalLine extends ColorCard {
  constructor() {
    super('C21', '横一列塗り', '任意の行（横一列）の全マスを+1', 1);
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    const positions: Position[] = [];
    const size = board.getSize();
    for (let x = 0; x < size; x++) {
      positions.push({ x, y: position.y });
    }
    return positions;
  }
}

export class C22_VerticalLine extends ColorCard {
  constructor() {
    super('C22', '縦一列塗り', '任意の列（縦一列）の全マスを+1', 1);
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    const positions: Position[] = [];
    const size = board.getSize();
    for (let y = 0; y < size; y++) {
      positions.push({ x: position.x, y });
    }
    return positions;
  }
}

export class C23_Block2x2Boost extends ColorCard {
  constructor() {
    super('C23', '2×2集中強化', '任意の2×2ブロック4マスの安定度を+2', 2);
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    const positions: Position[] = [];
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const pos = { x: position.x + dx, y: position.y + dy };
        if (board.isValidPosition(pos.x, pos.y)) {
          positions.push(pos);
        }
      }
    }
    return positions;
  }
}

export class C24_Block3x3 extends ColorCard {
  constructor() {
    super('C24', '3×3ブロック塗り', '任意の3×3ブロック内の全マスを+1', 1);
  }

  getTargetPositions(board: Board, position: Position): Position[] {
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
}

export class C25_AllOwnBoost extends ColorCard {
  constructor() {
    super('C25', '全自陣ブースト', '盤面上の自色マスすべての安定度を+1', 1);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const positions: Position[] = [];
    const size = board.getSize();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = board.getCell(x, y);
        if (cell && cell.isOwnedBy(playerId)) {
          positions.push({ x, y });
        }
      }
    }
    return positions;
  }
}

export class C26_AllOwnSuperBoost extends ColorCard {
  constructor() {
    super('C26', '全自陣超強化＋反動', '自色マスすべて+2。敵色マスすべて+1（0側に近づく）', 2);
  }

  applyEffect(board: Board, position: Position, playerId: PlayerId): void {
    // 自色マスに+2
    const ownPositions = this.getTargetPositions(board, position, playerId);
    for (const pos of ownPositions) {
      const cell = board.getCell(pos.x, pos.y);
      if (cell) {
        const delta = playerId === 'A' ? 2 : -2;
        cell.addStability(delta);
      }
    }

    // 敵色マスに+1（0側に近づく）
    const size = board.getSize();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = board.getCell(x, y);
        if (cell && cell.isOwnedByEnemy(playerId)) {
          const delta = playerId === 'A' ? 1 : -1; // 敵色を0側に近づける
          cell.addStability(delta);
        }
      }
    }
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const positions: Position[] = [];
    const size = board.getSize();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = board.getCell(x, y);
        if (cell && cell.isOwnedBy(playerId)) {
          positions.push({ x, y });
        }
      }
    }
    return positions;
  }
}

export class C27_RowFortress extends ColorCard {
  constructor() {
    super('C27', '行要塞化', '任意の行を1つ選び、その行の自色マスだけ安定度+2', 2);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const positions: Position[] = [];
    const size = board.getSize();
    for (let x = 0; x < size; x++) {
      const cell = board.getCell(x, position.y);
      if (cell && cell.isOwnedBy(playerId)) {
        positions.push({ x, y: position.y });
      }
    }
    return positions;
  }
}

export class C28_ColumnFortress extends ColorCard {
  constructor() {
    super('C28', '列要塞化', '任意の列を1つ選び、その列の自色マスだけ安定度+2', 2);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const positions: Position[] = [];
    const size = board.getSize();
    for (let y = 0; y < size; y++) {
      const cell = board.getCell(position.x, y);
      if (cell && cell.isOwnedBy(playerId)) {
        positions.push({ x: position.x, y });
      }
    }
    return positions;
  }
}

export class C29_ConnectedRegionBoost extends ColorCard {
  constructor() {
    super('C29', '連結領域強化', '任意の自色連結領域を1つ選び、その領域内の全マス安定度+1', 1);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const regions = board.getConnectedRegions(playerId);
    // positionが含まれる連結領域を探す
    for (const region of regions) {
      if (region.positions.some(p => p.x === position.x && p.y === position.y)) {
        return region.positions;
      }
    }
    return [];
  }
}

export class C30_ConnectedRegionWeaknessBoost extends ColorCard {
  constructor() {
    super('C30', '連結領域の弱点補強', '任意の自色連結領域を1つ選び、安定度≦2の自色マスだけ+2', 2);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const regions = board.getConnectedRegions(playerId);
    // positionが含まれる連結領域を探す
    for (const region of regions) {
      if (region.positions.some(p => p.x === position.x && p.y === position.y)) {
        // 安定度≦2のマスだけを返す
        return region.positions.filter(pos => {
          const cell = board.getCell(pos.x, pos.y);
          if (!cell) return false;
          const absStability = Math.abs(cell.stability);
          return absStability <= 2;
        });
      }
    }
    return [];
  }
}

