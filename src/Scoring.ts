import { Board } from './Board.js';
import { PlayerId, FortressShape, FortressPattern } from './types.js';

export class Scoring {
  // 基本エリアスコア（×2スケール）
  static calculateAreaScore(board: Board, playerId: PlayerId): number {
    const size = board.getSize();
    let score = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = board.getCell(x, y);
        if (cell && cell.isOwnedBy(playerId)) {
          score += 2; // 1マス = 2点（×2スケール）
        }
      }
    }
    return score;
  }

  // 堅牢ボーナス（×2スケール）
  static calculateSturdinessBonus(board: Board, playerId: PlayerId): number {
    const size = board.getSize();
    let bonus = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = board.getCell(x, y);
        if (cell && cell.isOwnedBy(playerId)) {
          const absStability = Math.abs(cell.stability);
          // 堅牢ボーナス表（×2スケール）
          const bonusMap: Record<number, number> = {
            1: 0,
            2: 1,
            3: 2,
            4: 3,
            5: 4
          };
          bonus += bonusMap[absStability] || 0;
        }
      }
    }
    return bonus;
  }

  // 要塞形を検出
  static detectFortressShapes(board: Board, region: { positions: { x: number; y: number }[] }, playerId: PlayerId): FortressShape[] {
    const shapes: FortressShape[] = [];
    const regionSet = new Set(region.positions.map(p => `${p.x},${p.y}`));

    // 2×2ブロックを検出
    for (const pos of region.positions) {
      const block2x2 = [
        { x: pos.x, y: pos.y },
        { x: pos.x + 1, y: pos.y },
        { x: pos.x, y: pos.y + 1 },
        { x: pos.x + 1, y: pos.y + 1 }
      ];

      if (block2x2.every(p => regionSet.has(`${p.x},${p.y}`))) {
        const cells = block2x2.map(p => board.getCell(p.x, p.y)).filter(c => c !== null);
        if (cells.length === 4 && cells.every(c => c!.isOwnedBy(playerId))) {
          const stabilities = cells.map(c => Math.abs(c!.stability));
          const minStability = Math.min(...stabilities);
          if (minStability >= 2) {
            shapes.push({
              pattern: '2x2',
              positions: block2x2,
              minStability
            });
          }
        }
      }
    }

    // L字を検出（2×2のうち3マス）
    for (const pos of region.positions) {
      const lShapes = [
        // 左上L
        [{ x: pos.x, y: pos.y }, { x: pos.x + 1, y: pos.y }, { x: pos.x, y: pos.y + 1 }],
        // 右上L
        [{ x: pos.x, y: pos.y }, { x: pos.x + 1, y: pos.y }, { x: pos.x + 1, y: pos.y + 1 }],
        // 左下L
        [{ x: pos.x, y: pos.y }, { x: pos.x, y: pos.y + 1 }, { x: pos.x + 1, y: pos.y + 1 }],
        // 右下L
        [{ x: pos.x + 1, y: pos.y }, { x: pos.x, y: pos.y + 1 }, { x: pos.x + 1, y: pos.y + 1 }]
      ];

      for (const lShape of lShapes) {
        if (lShape.every(p => regionSet.has(`${p.x},${p.y}`))) {
          const cells = lShape.map(p => board.getCell(p.x, p.y)).filter(c => c !== null);
          if (cells.length === 3 && cells.every(c => c!.isOwnedBy(playerId))) {
            const stabilities = cells.map(c => Math.abs(c!.stability));
            const minStability = Math.min(...stabilities);
            if (minStability >= 2) {
              shapes.push({
                pattern: 'L',
                positions: lShape,
                minStability
              });
            }
          }
        }
      }
    }

    // 十字を検出（中心+上下左右5マス）
    for (const pos of region.positions) {
      const cross = [
        { x: pos.x, y: pos.y }, // 中心
        { x: pos.x, y: pos.y - 1 }, // 上
        { x: pos.x, y: pos.y + 1 }, // 下
        { x: pos.x - 1, y: pos.y }, // 左
        { x: pos.x + 1, y: pos.y }  // 右
      ];

      if (cross.every(p => regionSet.has(`${p.x},${p.y}`))) {
        const cells = cross.map(p => board.getCell(p.x, p.y)).filter(c => c !== null);
        if (cells.length === 5 && cells.every(c => c!.isOwnedBy(playerId))) {
          const stabilities = cells.map(c => Math.abs(c!.stability));
          const minStability = Math.min(...stabilities);
          if (minStability >= 2) {
            shapes.push({
              pattern: 'cross',
              positions: cross,
              minStability
            });
          }
        }
      }
    }

    return shapes;
  }

  // 要塞ボーナス（×2スケール）
  static calculateFortressBonus(board: Board, playerId: PlayerId): number {
    const regions = board.getConnectedRegions(playerId);
    let totalBonus = 0;

    for (const region of regions) {
      const shapes = this.detectFortressShapes(board, region, playerId);
      
      if (shapes.length === 0) continue;

      // 最小安定度でソート（大きい順）
      shapes.sort((a, b) => b.minStability - a.minStability);

      // 基礎ボーナス表（×2スケール）
      const bonusMap: Record<number, number> = {
        2: 2,
        3: 4,
        4: 6,
        5: 8
      };

      // 1つ目: 全額加算
      if (shapes.length > 0) {
        totalBonus += bonusMap[shapes[0].minStability] || 0;
      }

      // 2つ目以降: 半分加算（整数割り）
      for (let i = 1; i < shapes.length; i++) {
        const baseBonus = bonusMap[shapes[i].minStability] || 0;
        totalBonus += Math.floor(baseBonus / 2);
      }
    }

    return totalBonus;
  }

  // 総スコア計算（×2スケール）
  static calculateTotalScore(board: Board, playerId: PlayerId): number {
    const areaScore = this.calculateAreaScore(board, playerId);
    const sturdinessBonus = this.calculateSturdinessBonus(board, playerId);
    const fortressBonus = this.calculateFortressBonus(board, playerId);
    return areaScore + sturdinessBonus + fortressBonus;
  }
}

