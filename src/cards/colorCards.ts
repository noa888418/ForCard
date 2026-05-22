import { ColorCard } from './ColorCard.js';
import { FortCard } from './FortCard.js';
import { Position, PlayerId } from '../types.js';
import { Board } from '../Board.js';

type PositionFactory = (board: Board, position: Position, playerId: PlayerId) => Position[];

const uniqueValidPositions = (board: Board, positions: Position[]): Position[] => {
  const seen = new Set<string>();
  const valid: Position[] = [];
  for (const pos of positions) {
    if (!board.isValidPosition(pos.x, pos.y)) continue;
    const key = `${pos.x},${pos.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push(pos);
  }
  return valid;
};

const rectPositions = (board: Board, x0: number, y0: number, width: number, height: number): Position[] => {
  const positions: Position[] = [];
  for (let y = y0; y < y0 + height; y++) {
    for (let x = x0; x < x0 + width; x++) {
      positions.push({ x, y });
    }
  }
  return uniqueValidPositions(board, positions);
};

const offsetsFrom = (board: Board, position: Position, offsets: Position[]): Position[] => {
  return uniqueValidPositions(board, offsets.map(offset => ({
    x: position.x + offset.x,
    y: position.y + offset.y
  })));
};

export class ConfigurableColorCard extends ColorCard {
  private minBoardSize: number;
  private maxBoardSize: number;
  private positionFactory: PositionFactory;
  private canPlayFactory?: PositionFactory;

  constructor(
    id: `C${number}`,
    name: string,
    description: string,
    power: number,
    minBoardSize: number,
    maxBoardSize: number,
    positionFactory: PositionFactory,
    canPlayFactory?: PositionFactory
  ) {
    super(id, name, description, power);
    this.minBoardSize = minBoardSize;
    this.maxBoardSize = maxBoardSize;
    this.positionFactory = positionFactory;
    this.canPlayFactory = canPlayFactory;
  }

  supportsBoardSize(boardSize: number): boolean {
    return boardSize >= this.minBoardSize && boardSize <= this.maxBoardSize;
  }

  canPlay(board: Board, position: Position, playerId: PlayerId): boolean {
    if (!this.supportsBoardSize(board.getSize()) || !super.canPlay(board, position, playerId)) return false;
    return this.canPlayFactory ? this.canPlayFactory(board, position, playerId).length > 0 : true;
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    if (!this.supportsBoardSize(board.getSize())) return [];
    return uniqueValidPositions(board, this.positionFactory(board, position, playerId));
  }
}

// 弱い色カード（C01〜C10）
export class C01_SinglePoint extends ColorCard {
  constructor() {
    super('C01', '単点塗り', '任意のマス1つの色ポイントを+1', 1);
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    return [position];
  }
}

export class F01_SinglePointBoost extends FortCard {
  constructor() {
    super('F01', '単点強化', '自色マス1つの色ポイントを+2', 2);
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
    super('C03', '直線2マス', 'ターゲットと上下or左右の隣接マス計2マスの色ポイントを+1', 1);
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
    super('C04', '斜め2マス', 'ターゲットと斜め方向の隣接マス1つの計2マスの色ポイントを+1', 1);
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

export class F02_SurroundOwnOnly extends FortCard {
  constructor() {
    super('F02', '周囲自陣集中塗り', 'ターゲット+上下左右のうち自色マスだけ色ポイントを+1', 1);
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
    super('C06', '角専用3マス', '盤面の四隅にのみ置ける。角マス+内向き2マスの色ポイントを+1', 1);
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
    super('C07', '端専用3マス', '盤面の辺上のマスにのみ置ける、4隅に配置することはできない。そのマス+内側方向2マスの色ポイントを+1', 1);
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

export class F03_CenterOwnBoost extends FortCard {
  constructor() {
    super('F03', '中心+自陣強化', 'ターゲット+上下左右のうち自色マスのみ色ポイントを+1', 1);
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
    super('C09', '敵色削り', '敵色マス1つを選び、その色ポイントを+2（＝0側に2近づく）。自色や中立マスを選んだ場合は色ポイント+1', 1);
  }

  canPlay(board: Board, position: Position, playerId: PlayerId): boolean {
    // すべてのマスを選べる（制限なし）
    return board.isValidPosition(position.x, position.y);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    // すべてのマスを対象とする
    return [position];
  }

  // マスの種類に応じて異なる効果を適用
  applyEffect(
    board: Board,
    position: Position,
    playerId: PlayerId,
    options?: any
  ): void {
    const cell = board.getCell(position.x, position.y);
    if (!cell) return;

    // 敵色マスの場合：+2（0側に2近づく）
    // 自色や中立マスの場合：+1
    if (cell.isOwnedByEnemy(playerId)) {
      // 敵色マス：0側に2近づく
      // プレイヤーAの場合：負の値（敵色）に+2を適用 → 0側に近づく
      // プレイヤーBの場合：正の値（敵色）に-2を適用 → 0側に近づく
      const currentStability = cell.stability;
      if (playerId === 'A') {
        // プレイヤーA: 敵色マスは負の値なので、+2で0側に近づく
        // ただし、0を超えないようにする（0側に近づくだけ）
        const targetStability = Math.min(0, currentStability + 2);
        cell.setStability(targetStability);
      } else {
        // プレイヤーB: 敵色マスは正の値なので、-2で0側に近づく
        // ただし、0を下回らないようにする（0側に近づくだけ）
        const targetStability = Math.max(0, currentStability - 2);
        cell.setStability(targetStability);
      }
    } else {
      // 自色や中立マス：+1
      const delta = playerId === 'A' ? 1 : -1;
      cell.addStability(delta);
    }
  }
}

export class C10_UpDown2 extends ColorCard {
  constructor() {
    super('C10', '上下2マス塗り', 'ターゲットの上と下の2マスの色ポイントを+1。ターゲット自身は変化なし', 1);
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
    super('C11', '十字塗り', 'ターゲット+上下左右（最大5マス）の色ポイントを+1', 1);
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
    super('C12', '斜め十字塗り', 'ターゲット+斜め4マス（最大5マス）の色ポイントを+1', 1);
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
    super('C13', '横三連', 'ターゲットの左・中心・右（最大3マス）の色ポイントを+1', 1);
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
    super('C14', '縦三連', 'ターゲットの上・中心・下（最大3マス）の色ポイントを+1', 1);
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
    super('C15', '2×2ブロック塗り', 'ターゲットを左上とした2×2ブロック4マスの色ポイントを+1', 1);
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
    super('C16', 'L字形成', 'ターゲット+右+下（計3マス）の色ポイントを+1。回転可', 1);
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
    super('C17', 'T字形成', 'ターゲット+左右+上or下（計3〜4マス）の色ポイントを+1', 1);
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

export class C18_LShapeUpRight extends C16_LShape {
  constructor() {
    super();
    this.id = 'C18';
    this.name = 'L字形成（上右）';
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    return super.getTargetPositions(board, position, playerId, { rotation: 1 });
  }
}

export class C19_LShapeUpLeft extends C16_LShape {
  constructor() {
    super();
    this.id = 'C19';
    this.name = 'L字形成（上左）';
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    return super.getTargetPositions(board, position, playerId, { rotation: 2 });
  }
}

export class C20_LShapeDownLeft extends C16_LShape {
  constructor() {
    super();
    this.id = 'C20';
    this.name = 'L字形成（下左）';
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    return super.getTargetPositions(board, position, playerId, { rotation: 3 });
  }
}

export class C23_TShapeDown extends C17_TShape {
  constructor() {
    super();
    this.id = 'C23';
    this.name = 'T字形成（下）';
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    return super.getTargetPositions(board, position, playerId, { direction: 'down' });
  }
}

export class C25_TShapeLeft extends C17_TShape {
  constructor() {
    super();
    this.id = 'C25';
    this.name = 'T字形成（左）';
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    const positions: Position[] = [position];
    const offsets = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ];
    for (const off of offsets) {
      const pos = { x: position.x + off.x, y: position.y + off.y };
      if (board.isValidPosition(pos.x, pos.y)) {
        positions.push(pos);
      }
    }
    return positions;
  }
}

export class C26_TShapeRight extends C17_TShape {
  constructor() {
    super();
    this.id = 'C26';
    this.name = 'T字形成（右）';
  }

  getTargetPositions(board: Board, position: Position): Position[] {
    const positions: Position[] = [position];
    const offsets = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: 1, y: 0 }
    ];
    for (const off of offsets) {
      const pos = { x: position.x + off.x, y: position.y + off.y };
      if (board.isValidPosition(pos.x, pos.y)) {
        positions.push(pos);
      }
    }
    return positions;
  }
}

export class F04_LShapeBoost extends FortCard {
  constructor() {
    super('F04', 'L字強化（自陣のみ）', '任意の2×2ブロック内の自色マスだけ色ポイント+2', 2);
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

export class F05_CrossBoost extends FortCard {
  constructor() {
    super('F05', '十字強化（自陣のみ）', 'ターゲット+上下左右のうち自色マスだけ色ポイントを+1', 1);
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

export class F06_SurroundOwnBoost extends FortCard {
  constructor() {
    super('F06', '周囲自陣強化（中心自色限定）', 'ターゲットは自色マスのみ。ターゲット+上下左右のうち自色マスだけ色ポイントを+1', 1);
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
    super('C21', '横一列塗り', '任意の行（横一列）の全マスの色ポイントを+1', 1);
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
    super('C22', '縦一列塗り', '任意の列（縦一列）の全マスの色ポイントを+1', 1);
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

export class F07_Block2x2Boost extends FortCard {
  constructor() {
    super('F07', '2×2集中強化', '任意の2×2ブロック内の自色マスのみの色ポイントを+2', 2);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const positions: Position[] = [];
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

export class C24_Block3x3 extends ColorCard {
  constructor() {
    super('C24', '3×3ブロック塗り', '任意の3×3ブロック内の全マスの色ポイントを+1', 1);
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

export function createAdditionalColorCards(): ColorCard[] {
  return [
    // ① 色ポイント少 / 適用範囲広
    new ConfigurableColorCard('C27', '外周なぞり', '指定した辺1つの全マスの色ポイントを+1', 1, 5, 7, (board, p) => {
      const size = board.getSize();
      if (p.y === 0 || p.y === size - 1) return rectPositions(board, 0, p.y, size, 1);
      if (p.x === 0 || p.x === size - 1) return rectPositions(board, p.x, 0, 1, size);
      return rectPositions(board, 0, p.y, size, 1);
    }, (board, p) => (p.x === 0 || p.y === 0 || p.x === board.getSize() - 1 || p.y === board.getSize() - 1) ? [p] : []),
    new ConfigurableColorCard('C28', '半列塗り', '指定列の上半分または下半分の色ポイントを+1', 1, 4, 7, (board, p) => {
      const size = board.getSize();
      const start = p.y < size / 2 ? 0 : Math.floor(size / 2);
      const end = p.y < size / 2 ? Math.ceil(size / 2) : size;
      return rectPositions(board, p.x, start, 1, end - start);
    }),
    new ConfigurableColorCard('C29', '半行塗り', '指定行の左半分または右半分の色ポイントを+1', 1, 4, 7, (board, p) => {
      const size = board.getSize();
      const start = p.x < size / 2 ? 0 : Math.floor(size / 2);
      const end = p.x < size / 2 ? Math.ceil(size / 2) : size;
      return rectPositions(board, start, p.y, end - start, 1);
    }),
    new ConfigurableColorCard('C30', '大十字', '中心+上下左右2マスまでの色ポイントを+1', 1, 5, 7, (board, p) =>
      offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 0, y: -1 }, { x: 0, y: -2 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: -1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }])),
    new ConfigurableColorCard('C31', '大斜め十字', '中心+斜め2マスまでの色ポイントを+1', 1, 5, 7, (board, p) =>
      offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: -1, y: -1 }, { x: -2, y: -2 }, { x: 1, y: -1 }, { x: 2, y: -2 }, { x: -1, y: 1 }, { x: -2, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 2 }])),
    new ConfigurableColorCard('C32', '周囲リング', '指定マスの周囲8マスのみ色ポイントを+1。中心は変化なし', 1, 5, 7, (board, p) =>
      offsetsFrom(board, p, [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }])),
    new ConfigurableColorCard('C33', '端から波', '端マスから内側方向へ最大4マスの色ポイントを+1', 1, 4, 7, (board, p) => {
      const size = board.getSize();
      if (p.x === 0) return rectPositions(board, 0, p.y, 4, 1);
      if (p.x === size - 1) return rectPositions(board, size - 4, p.y, 4, 1);
      if (p.y === 0) return rectPositions(board, p.x, 0, 1, 4);
      return rectPositions(board, p.x, Math.max(0, size - 4), 1, 4);
    }, (board, p) => (p.x === 0 || p.y === 0 || p.x === board.getSize() - 1 || p.y === board.getSize() - 1) ? [p] : []),
    new ConfigurableColorCard('C34', '角扇形', '角寄り3×3内の6マスの色ポイントを+1', 1, 4, 7, (board, p) => {
      const size = board.getSize();
      const sx = p.x < size / 2 ? 0 : size - 3;
      const sy = p.y < size / 2 ? 0 : size - 3;
      return rectPositions(board, sx, sy, 3, 3).filter(pos => Math.abs(pos.x - p.x) + Math.abs(pos.y - p.y) <= 4).slice(0, 6);
    }),
    new ConfigurableColorCard('C35', '市松薄塗り', '指定3×3内の市松模様5マスの色ポイントを+1', 1, 5, 7, (board, p) =>
      rectPositions(board, p.x - 1, p.y - 1, 3, 3).filter(pos => (pos.x + pos.y) % 2 === (p.x + p.y) % 2)),
    new ConfigurableColorCard('C36', '広域散布', '指定マスからマンハッタン距離2の外周マスの色ポイントを+1', 1, 5, 7, (board, p) =>
      offsetsFrom(board, p, [{ x: 0, y: -2 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -2, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }])),

    // ② 色ポイント多 / 適用範囲狭
    new ConfigurableColorCard('C37', '強単点塗り', '任意の1マスの色ポイントを+2', 2, 3, 7, (board, p) => [p]),
    new ConfigurableColorCard('C38', '極点塗り', '任意の1マスの色ポイントを+3', 3, 3, 7, (board, p) => [p]),
    new ConfigurableColorCard('C39', '敵陣穿ち', '任意の1マスの色ポイントを+3', 3, 3, 7, (board, p) => [p]),
    new ConfigurableColorCard('C40', '中立確保', '任意の1マスの色ポイントを+2', 2, 3, 7, (board, p) => [p]),
    new ConfigurableColorCard('C41', '双点強化', '横隣接2マスの色ポイントを+2', 2, 3, 7, (board, p) => offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 1, y: 0 }])),
    new ConfigurableColorCard('C42', '斜め双点強化', '斜め隣接2マスの色ポイントを+2', 2, 3, 7, (board, p) => offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 1, y: 1 }])),
    new ConfigurableColorCard('C43', '前線突破', '縦隣接2マスの色ポイントを+3', 3, 4, 7, (board, p) => offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 0, y: -1 }])),
    new ConfigurableColorCard('C44', '要点奪取', '任意の1マスの色ポイントを+2', 2, 3, 7, (board, p) => [p]),
    new ConfigurableColorCard('C45', '角杭打ち', '角マス1つの色ポイントを+3', 3, 3, 7, (board, p) => [p], (board, p) => {
      const size = board.getSize();
      return ((p.x === 0 || p.x === size - 1) && (p.y === 0 || p.y === size - 1)) ? [p] : [];
    }),
    new ConfigurableColorCard('C46', '端杭打ち', '辺上マス1つの色ポイントを+3', 3, 3, 7, (board, p) => [p], (board, p) =>
      (p.x === 0 || p.y === 0 || p.x === board.getSize() - 1 || p.y === board.getSize() - 1) ? [p] : []),

    // ③ 両方そこそこ
    new ConfigurableColorCard('C47', '強三連横', '横3マスの色ポイントを+2', 2, 4, 7, (board, p) => offsetsFrom(board, p, [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }])),
    new ConfigurableColorCard('C48', '強三連縦', '縦3マスの色ポイントを+2', 2, 4, 7, (board, p) => offsetsFrom(board, p, [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }])),
    new ConfigurableColorCard('C49', '小十字強化', '中心+上下左右から2方向の色ポイントを+2', 2, 4, 7, (board, p) => offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 0 }])),
    new ConfigurableColorCard('C50', '小斜め十字強化', '中心+斜め2方向の色ポイントを+2', 2, 4, 7, (board, p) => offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: -1, y: -1 }, { x: 1, y: -1 }])),
    new ConfigurableColorCard('C51', '2×2強塗り', '2×2ブロック4マスの色ポイントを+2', 2, 4, 7, (board, p) => rectPositions(board, p.x, p.y, 2, 2)),
    new ConfigurableColorCard('C52', 'L字強塗り', 'L字3マスの色ポイントを+2', 2, 4, 7, (board, p) => offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }])),
    new ConfigurableColorCard('C53', 'T字強塗り', 'T字4マスの色ポイントを+2', 2, 5, 7, (board, p) => offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }])),
    new ConfigurableColorCard('C54', '小包囲', '中心を除く上下左右4マスの色ポイントを+2', 2, 4, 7, (board, p) => offsetsFrom(board, p, [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }])),
    new ConfigurableColorCard('C55', 'くさび塗り', '指定方向に中心+前方2マスの色ポイントを+2', 2, 4, 7, (board, p) => offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 0, y: -1 }, { x: 0, y: -2 }])),
    new ConfigurableColorCard('C56', '折れ線塗り', '直角に曲がる3マスの色ポイントを+2', 2, 4, 7, (board, p) => offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }])),

    // ④ 色ポイント少 / 適用範囲狭
    new ConfigurableColorCard('C57', '微塗り', '任意の1マスの色ポイントを+1', 1, 3, 4, (board, p) => [p]),
    new ConfigurableColorCard('C58', '横隣塗り', '中心+右隣1マスの色ポイントを+1', 1, 3, 4, (board, p) => offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 1, y: 0 }])),
    new ConfigurableColorCard('C59', '縦隣塗り', '中心+下隣1マスの色ポイントを+1', 1, 3, 4, (board, p) => offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 0, y: 1 }])),
    new ConfigurableColorCard('C60', '斜め隣塗り', '中心+右下隣1マスの色ポイントを+1', 1, 3, 4, (board, p) => offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 1, y: 1 }])),
    new ConfigurableColorCard('C61', '中心なし隣接', '右隣1マスのみ色ポイントを+1。中心は変化なし', 1, 3, 4, (board, p) => offsetsFrom(board, p, [{ x: 1, y: 0 }])),
    new ConfigurableColorCard('C62', '角小塗り', '角+内側1マスの色ポイントを+1', 1, 3, 4, (board, p) => {
      const size = board.getSize();
      const dx = p.x < size / 2 ? 1 : -1;
      const dy = p.y < size / 2 ? 1 : -1;
      return offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: dx, y: dy }]);
    }, (board, p) => {
      const size = board.getSize();
      return ((p.x === 0 || p.x === size - 1) && (p.y === 0 || p.y === size - 1)) ? [p] : [];
    }),
    new ConfigurableColorCard('C63', '端小塗り', '辺上マス+内側1マスの色ポイントを+1', 1, 3, 4, (board, p) => {
      const size = board.getSize();
      if (p.x === 0) return offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 1, y: 0 }]);
      if (p.x === size - 1) return offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: -1, y: 0 }]);
      if (p.y === 0) return offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 0, y: 1 }]);
      return offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 0, y: -1 }]);
    }, (board, p) => {
      const size = board.getSize();
      const isEdge = p.x === 0 || p.y === 0 || p.x === size - 1 || p.y === size - 1;
      const isCorner = (p.x === 0 || p.x === size - 1) && (p.y === 0 || p.y === size - 1);
      return isEdge && !isCorner ? [p] : [];
    }),
    new ConfigurableColorCard('C64', '敵色小削り', '任意の1マスの色ポイントを+1', 1, 3, 4, (board, p) => [p]),
    new ConfigurableColorCard('C65', '中立小確保', '任意の1マスの色ポイントを+1', 1, 3, 4, (board, p) => [p]),
    new ConfigurableColorCard('C66', '空白補修', '任意の1マスの色ポイントを+1', 1, 3, 4, (board, p) => [p]),

    // ⑤ 色ポイント多 / 適用範囲広
    new ConfigurableColorCard('C67', '豪雨塗り', '指定3×3ブロックの色ポイントを+2', 2, 6, 7, (board, p) => rectPositions(board, p.x - 1, p.y - 1, 3, 3)),
    new ConfigurableColorCard('C68', '制圧十字', '大十字の色ポイントを+2', 2, 6, 7, (board, p) =>
      offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: 0, y: -1 }, { x: 0, y: -2 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: -1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }])),
    new ConfigurableColorCard('C69', '制圧斜十字', '大斜め十字の色ポイントを+2', 2, 6, 7, (board, p) =>
      offsetsFrom(board, p, [{ x: 0, y: 0 }, { x: -1, y: -1 }, { x: -2, y: -2 }, { x: 1, y: -1 }, { x: 2, y: -2 }, { x: -1, y: 1 }, { x: -2, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 2 }])),
    new ConfigurableColorCard('C70', '横列強襲', '指定行の全マスの色ポイントを+2', 2, 6, 7, (board, p) => rectPositions(board, 0, p.y, board.getSize(), 1)),
    new ConfigurableColorCard('C71', '縦列強襲', '指定列の全マスの色ポイントを+2', 2, 6, 7, (board, p) => rectPositions(board, p.x, 0, 1, board.getSize())),
    new ConfigurableColorCard('C72', '4×4圧塗り', '指定4×4ブロックの色ポイントを+2', 2, 6, 7, (board, p) => rectPositions(board, p.x - 1, p.y - 1, 4, 4)),
    new ConfigurableColorCard('C73', '巨大リング', '指定5×5の外周マスの色ポイントを+2', 2, 6, 7, (board, p) =>
      rectPositions(board, p.x - 2, p.y - 2, 5, 5).filter(pos => Math.abs(pos.x - p.x) === 2 || Math.abs(pos.y - p.y) === 2)),
    new ConfigurableColorCard('C74', '戦線拡張', '指定行と隣接行の5列範囲の色ポイントを+2', 2, 6, 7, (board, p) => rectPositions(board, p.x - 2, p.y - 1, 5, 2)),
    new ConfigurableColorCard('C75', '大包囲', '指定マス周囲8マスの色ポイントを+2。中心は変化なし', 2, 6, 7, (board, p) =>
      offsetsFrom(board, p, [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }])),
    new ConfigurableColorCard('C76', '決戦領域', '7×7限定。指定3×3ブロックの色ポイントを+3', 3, 7, 7, (board, p) => rectPositions(board, p.x - 1, p.y - 1, 3, 3))
  ];
}

export class F08_AllOwnBoost extends FortCard {
  constructor() {
    super('F08', '全自陣ブースト', '盤面上の自色マスすべての色ポイントを+1', 1);
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

export class F09_AllOwnSuperBoost extends FortCard {
  constructor() {
    super('F09', '全自陣超強化＋反動', '自色マスすべての色ポイントを+2。敵色マスすべての色ポイントを+1（0側に近づく）', 2);
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

export class F10_RowFortress extends FortCard {
  constructor() {
    super('F10', '行要塞化', '任意の行を1つ選び、その行の自色マスだけ色ポイント+2', 2);
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

export class F11_ColumnFortress extends FortCard {
  constructor() {
    super('F11', '列要塞化', '任意の列を1つ選び、その列の自色マスだけ色ポイント+2', 2);
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

export class F12_ConnectedRegionBoost extends FortCard {
  constructor() {
    super('F12', '連結領域強化', '任意の自色連結領域を1つ選び、その領域内の全マス色ポイント+1', 1);
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

export class F13_ConnectedRegionWeaknessBoost extends FortCard {
  constructor() {
    super('F13', '連結領域の弱点補強', '任意の自色連結領域を1つ選び、色ポイント≦2の自色マスだけ色ポイントを+2', 2);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    const regions = board.getConnectedRegions(playerId);
    // positionが含まれる連結領域を探す
    for (const region of regions) {
      if (region.positions.some(p => p.x === position.x && p.y === position.y)) {
        // 色ポイント≦2のマスだけを返す
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
