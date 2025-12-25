import { Cell } from './Cell.js';
import { Position, PlayerId, ConnectedRegion } from './types.js';

export class Board {
  private cells: Cell[][];
  private size: number;

  constructor(size: number = 5) {
    this.size = size;
    this.cells = [];
    for (let y = 0; y < size; y++) {
      this.cells[y] = [];
      for (let x = 0; x < size; x++) {
        this.cells[y][x] = new Cell(x, y);
      }
    }
  }

  getSize(): number {
    return this.size;
  }

  getCell(x: number, y: number): Cell | null {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
      return null;
    }
    return this.cells[y][x];
  }

  getAllCells(): Cell[] {
    const all: Cell[] = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        all.push(this.cells[y][x]);
      }
    }
    return all;
  }

  // 座標が有効かチェック
  isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  // 4方向連結で連結領域を取得
  getConnectedRegions(playerId: PlayerId): ConnectedRegion[] {
    const visited = new Set<string>();
    const regions: ConnectedRegion[] = [];

    const key = (x: number, y: number) => `${x},${y}`;

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const cell = this.getCell(x, y);
        if (!cell || !cell.isOwnedBy(playerId) || visited.has(key(x, y))) {
          continue;
        }

        // BFSで連結領域を探索
        const region: Position[] = [];
        const queue: Position[] = [{ x, y }];
        visited.add(key(x, y));

        while (queue.length > 0) {
          const pos = queue.shift()!;
          region.push(pos);

          // 上下左右をチェック
          const directions = [
            { x: 0, y: -1 }, // 上
            { x: 0, y: 1 },  // 下
            { x: -1, y: 0 }, // 左
            { x: 1, y: 0 }   // 右
          ];

          for (const dir of directions) {
            const nx = pos.x + dir.x;
            const ny = pos.y + dir.y;
            const nKey = key(nx, ny);

            if (visited.has(nKey)) continue;

            const neighbor = this.getCell(nx, ny);
            if (neighbor && neighbor.isOwnedBy(playerId)) {
              visited.add(nKey);
              queue.push({ x: nx, y: ny });
            }
          }
        }

        if (region.length > 0) {
          regions.push({ positions: region, playerId });
        }
      }
    }

    return regions;
  }

  // 盤面のコピーを作成（特殊カード用）
  clone(): Board {
    const cloned = new Board(this.size);
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const original = this.getCell(x, y);
        const clonedCell = cloned.getCell(x, y);
        if (original && clonedCell) {
          clonedCell.setStability(original.stability);
        }
      }
    }
    return cloned;
  }
}

