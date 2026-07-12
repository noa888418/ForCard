import { Board } from '../Board.js';
import { DisruptionCard } from './DisruptionCard.js';
import { FortCard } from './FortCard.js';
import { DisruptionCardId, FortCardId, PlayerId, Position } from '../types.js';

type TargetKind =
  | 'single'
  | 'horizontal2'
  | 'vertical2'
  | 'diagonal2'
  | 'horizontal3'
  | 'vertical3'
  | 'cross'
  | 'diagonalCross'
  | 'block2x2'
  | 'lShape'
  | 'tShape'
  | 'around4'
  | 'block3x3'
  | 'bigCross'
  | 'bigDiagonalCross'
  | 'row'
  | 'column'
  | 'block4x4'
  | 'ring5x5'
  | 'front5x2'
  | 'connected'
  | 'globalLimit';

type CardSpec = {
  id: string;
  name: string;
  description: string;
  power: number;
  minBoardSize: number;
  maxBoardSize: number;
  targetKind: TargetKind;
  limit?: number;
  placement?: 'any' | 'corner' | 'edge';
};

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

const isCorner = (board: Board, position: Position): boolean => {
  const size = board.getSize();
  return (position.x === 0 || position.x === size - 1) && (position.y === 0 || position.y === size - 1);
};

const isEdge = (board: Board, position: Position): boolean => {
  const size = board.getSize();
  return position.x === 0 || position.y === 0 || position.x === size - 1 || position.y === size - 1;
};

const getShapePositions = (board: Board, position: Position, playerId: PlayerId, spec: CardSpec): Position[] => {
  const size = board.getSize();
  switch (spec.targetKind) {
    case 'single':
      return [position];
    case 'horizontal2':
      return offsetsFrom(board, position, [{ x: 0, y: 0 }, { x: 1, y: 0 }]);
    case 'vertical2':
      return offsetsFrom(board, position, [{ x: 0, y: 0 }, { x: 0, y: 1 }]);
    case 'diagonal2':
      return offsetsFrom(board, position, [{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    case 'horizontal3':
      return offsetsFrom(board, position, [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }]);
    case 'vertical3':
      return offsetsFrom(board, position, [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }]);
    case 'cross':
      return offsetsFrom(board, position, [{ x: 0, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }]);
    case 'diagonalCross':
      return offsetsFrom(board, position, [{ x: 0, y: 0 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }]);
    case 'block2x2':
      return rectPositions(board, position.x, position.y, 2, 2);
    case 'lShape':
      return offsetsFrom(board, position, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]);
    case 'tShape':
      return offsetsFrom(board, position, [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }]);
    case 'around4':
      return offsetsFrom(board, position, [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }]);
    case 'block3x3':
      return rectPositions(board, position.x - 1, position.y - 1, 3, 3);
    case 'bigCross':
      return offsetsFrom(board, position, [{ x: 0, y: 0 }, { x: 0, y: -1 }, { x: 0, y: -2 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: -1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]);
    case 'bigDiagonalCross':
      return offsetsFrom(board, position, [{ x: 0, y: 0 }, { x: -1, y: -1 }, { x: -2, y: -2 }, { x: 1, y: -1 }, { x: 2, y: -2 }, { x: -1, y: 1 }, { x: -2, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 2 }]);
    case 'row':
      return rectPositions(board, 0, position.y, size, 1);
    case 'column':
      return rectPositions(board, position.x, 0, 1, size);
    case 'block4x4':
      return rectPositions(board, position.x - 1, position.y - 1, 4, 4);
    case 'ring5x5':
      return rectPositions(board, position.x - 2, position.y - 2, 5, 5).filter(pos => Math.abs(pos.x - position.x) === 2 || Math.abs(pos.y - position.y) === 2);
    case 'front5x2':
      return rectPositions(board, position.x - 2, position.y - 1, 5, 2);
    case 'connected':
      return board.getConnectedRegions(playerId).find(region => region.positions.some(pos => pos.x === position.x && pos.y === position.y))?.positions ?? [];
    case 'globalLimit':
      return rectPositions(board, 0, 0, size, size);
  }
};

const filterOwned = (board: Board, positions: Position[], playerId: PlayerId, owner: 'own' | 'enemy', limit?: number): Position[] => {
  const filtered = positions.filter(pos => {
    const cell = board.getCell(pos.x, pos.y);
    if (!cell) return false;
    return owner === 'own' ? cell.isOwnedBy(playerId) : cell.isOwnedByEnemy(playerId);
  });
  return limit === undefined ? filtered : filtered.slice(0, limit);
};

export class ConfigurableFortCard extends FortCard {
  private spec: CardSpec;

  constructor(spec: CardSpec) {
    super(spec.id as FortCardId, spec.name, spec.description, spec.power);
    this.spec = spec;
  }

  supportsBoardSize(boardSize: number): boolean {
    return boardSize >= this.spec.minBoardSize && boardSize <= this.spec.maxBoardSize;
  }

  canPlay(board: Board, position: Position, playerId: PlayerId): boolean {
    if (!this.supportsBoardSize(board.getSize())) return false;
    if (this.spec.placement === 'corner' && !isCorner(board, position)) return false;
    if (this.spec.placement === 'edge' && !isEdge(board, position)) return false;
    return super.canPlay(board, position, playerId);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    if (!this.canPlay(board, position, playerId)) return [];
    return filterOwned(board, getShapePositions(board, position, playerId, this.spec), playerId, 'own', this.spec.limit);
  }
}

export class ConfigurableDisruptionCard extends DisruptionCard {
  private spec: CardSpec;

  constructor(spec: CardSpec) {
    super(spec.id as DisruptionCardId, spec.name, spec.description, spec.power);
    this.spec = spec;
  }

  supportsBoardSize(boardSize: number): boolean {
    return boardSize >= this.spec.minBoardSize && boardSize <= this.spec.maxBoardSize;
  }

  canPlay(board: Board, position: Position, playerId: PlayerId): boolean {
    if (!this.supportsBoardSize(board.getSize())) return false;
    if (this.spec.placement === 'corner' && !isCorner(board, position)) return false;
    if (this.spec.placement === 'edge' && !isEdge(board, position)) return false;
    return super.canPlay(board, position, playerId);
  }

  getTargetPositions(board: Board, position: Position, playerId: PlayerId): Position[] {
    if (!this.canPlay(board, position, playerId)) return [];
    return filterOwned(board, getShapePositions(board, position, playerId, this.spec), playerId, 'enemy', this.spec.limit);
  }
}

const fortSpecs: CardSpec[] = [
  { id: 'F14', name: '広域補強', description: '自色マスを最大8マス、色ポイント+1', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'globalLimit', limit: 8 },
  { id: 'F15', name: '自陣横列補強', description: '指定行の自色マスだけ色ポイント+1', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'row' },
  { id: 'F16', name: '自陣縦列補強', description: '指定列の自色マスだけ色ポイント+1', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'column' },
  { id: 'F17', name: '外周防壁', description: '指定した外周ラインの自色マスだけ色ポイント+1', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'row', placement: 'edge' },
  { id: 'F18', name: '連結面補強', description: '指定自色連結領域の最大7マスを色ポイント+1', power: 1, minBoardSize: 4, maxBoardSize: 7, targetKind: 'connected', limit: 7 },
  { id: 'F19', name: '薄層装甲', description: '自色マスを最大8マス、色ポイント+1', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'globalLimit', limit: 8 },
  { id: 'F20', name: '前線維持', description: '自色マスを最大6マス、色ポイント+1', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'globalLimit', limit: 6 },
  { id: 'F21', name: '後方整備', description: '自色マスを最大8マス、色ポイント+1', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'globalLimit', limit: 8 },
  { id: 'F22', name: '斜線補強', description: '斜め十字内の自色マスだけ色ポイント+1', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'diagonalCross' },
  { id: 'F23', name: '拠点網強化', description: '自色マスを最大10マス、色ポイント+1', power: 1, minBoardSize: 6, maxBoardSize: 7, targetKind: 'globalLimit', limit: 10 },
  { id: 'F24', name: '要塞芯強化', description: '自色1マスの色ポイント+3', power: 3, minBoardSize: 3, maxBoardSize: 7, targetKind: 'single' },
  { id: 'F25', name: '角要塞化', description: '角の自色1マスの色ポイント+3', power: 3, minBoardSize: 3, maxBoardSize: 7, targetKind: 'single', placement: 'corner' },
  { id: 'F26', name: '端要塞化', description: '辺上の自色1マスの色ポイント+3', power: 3, minBoardSize: 3, maxBoardSize: 7, targetKind: 'single', placement: 'edge' },
  { id: 'F27', name: '前線杭打ち', description: '自色1マスの色ポイント+3', power: 3, minBoardSize: 4, maxBoardSize: 7, targetKind: 'single' },
  { id: 'F28', name: '中核圧縮', description: '自色連結領域内の最大1マスを色ポイント+3', power: 3, minBoardSize: 4, maxBoardSize: 7, targetKind: 'connected', limit: 1 },
  { id: 'F29', name: '双芯強化', description: '隣接する自色最大2マスの色ポイント+2', power: 2, minBoardSize: 3, maxBoardSize: 7, targetKind: 'horizontal2' },
  { id: 'F30', name: '斜双芯強化', description: '斜め隣接する自色最大2マスの色ポイント+2', power: 2, minBoardSize: 3, maxBoardSize: 7, targetKind: 'diagonal2' },
  { id: 'F31', name: '瀕死補強', description: '自色1マスの色ポイント+3', power: 3, minBoardSize: 3, maxBoardSize: 7, targetKind: 'single' },
  { id: 'F32', name: '防衛重点化', description: '自色最大2マスの色ポイント+2', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'horizontal2' },
  { id: 'F33', name: '拠点固定', description: '自色1マスの色ポイント+3', power: 3, minBoardSize: 5, maxBoardSize: 7, targetKind: 'single' },
  { id: 'F34', name: '十字補強', description: '十字内の自色マスだけ色ポイント+2', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'cross' },
  { id: 'F35', name: '斜め十字補強', description: '斜め十字内の自色マスだけ色ポイント+2', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'diagonalCross' },
  { id: 'F36', name: '横三連補強', description: '横3マス内の自色マスだけ色ポイント+2', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'horizontal3' },
  { id: 'F37', name: '縦三連補強', description: '縦3マス内の自色マスだけ色ポイント+2', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'vertical3' },
  { id: 'F38', name: '2×2装甲化', description: '2×2内の自色マスだけ色ポイント+2', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'block2x2' },
  { id: 'F39', name: 'L字装甲化', description: 'L字3マス内の自色マスだけ色ポイント+2', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'lShape' },
  { id: 'F40', name: 'T字装甲化', description: 'T字4マス内の自色マスだけ色ポイント+2', power: 2, minBoardSize: 5, maxBoardSize: 7, targetKind: 'tShape' },
  { id: 'F41', name: '小包囲補強', description: '上下左右の自色マスだけ色ポイント+2', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'around4' },
  { id: 'F42', name: '前線三点補強', description: '自色マスを最大3マス、色ポイント+2', power: 2, minBoardSize: 5, maxBoardSize: 7, targetKind: 'globalLimit', limit: 3 },
  { id: 'F43', name: '連結核補強', description: '指定自色連結領域の最大4マスを色ポイント+2', power: 2, minBoardSize: 5, maxBoardSize: 7, targetKind: 'connected', limit: 4 },
  { id: 'F44', name: '微補強', description: '自色1マスの色ポイント+1', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'single' },
  { id: 'F45', name: '横隣補強', description: '自色最大2マスの色ポイント+1', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'horizontal2' },
  { id: 'F46', name: '縦隣補強', description: '自色最大2マスの色ポイント+1', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'vertical2' },
  { id: 'F47', name: '斜隣補強', description: '自色最大2マスの色ポイント+1', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'diagonal2' },
  { id: 'F48', name: '角小補強', description: '角付近の自色最大2マスを色ポイント+1', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'diagonal2', placement: 'corner' },
  { id: 'F49', name: '端小補強', description: '辺上の自色最大2マスを色ポイント+1', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'horizontal2', placement: 'edge' },
  { id: 'F50', name: '弱点補修', description: '自色1マスの色ポイント+1', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'single' },
  { id: 'F51', name: '中立隣接補強', description: '自色1マスの色ポイント+1', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'single' },
  { id: 'F52', name: '孤立補強', description: '自色1マスの色ポイント+1', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'single' },
  { id: 'F53', name: '小拠点維持', description: '自色1マスの色ポイント+1', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'single' },
  { id: 'F54', name: '大要塞化', description: '3×3内の自色マスだけ色ポイント+2', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'block3x3' },
  { id: 'F55', name: '制圧補強', description: '大十字内の自色マスだけ色ポイント+2', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'bigCross' },
  { id: 'F56', name: '斜制圧補強', description: '大斜め十字内の自色マスだけ色ポイント+2', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'bigDiagonalCross' },
  { id: 'F57', name: '横防衛線', description: '指定行の自色マスだけ色ポイント+2', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'row' },
  { id: 'F58', name: '縦防衛線', description: '指定列の自色マスだけ色ポイント+2', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'column' },
  { id: 'F59', name: '巨大連結補強', description: '指定自色連結領域の最大10マスを色ポイント+2', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'connected', limit: 10 },
  { id: 'F60', name: '全前線装甲', description: '自色マスを最大8マス、色ポイント+2', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'globalLimit', limit: 8 },
  { id: 'F61', name: '4×4装甲化', description: '4×4内の自色マスだけ色ポイント+2', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'block4x4' },
  { id: 'F62', name: '最終防壁', description: '3×3内の自色マスだけ色ポイント+3', power: 3, minBoardSize: 7, maxBoardSize: 7, targetKind: 'block3x3' },
  { id: 'F63', name: '領域固定', description: '指定自色連結領域の最大12マスを色ポイント+2', power: 2, minBoardSize: 7, maxBoardSize: 7, targetKind: 'connected', limit: 12 },
  { id: 'F80', name: '縦隣補正', description: '縦隣接2マス内の自色マスだけ色ポイント+1', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'vertical2' },
  { id: 'F81', name: '横三連補正', description: '横3マス内の自色マスだけ色ポイント+2', power: 2, minBoardSize: 5, maxBoardSize: 7, targetKind: 'horizontal3' }
];

const disruptionSpecs: CardSpec[] = [
  { id: 'W01', name: '広域攪乱', description: '敵色マスを最大8マス、0側へ1近づける', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'globalLimit', limit: 8 },
  { id: 'W02', name: '横列妨害', description: '指定行の敵色マスを0側へ1近づける', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'row' },
  { id: 'W03', name: '縦列妨害', description: '指定列の敵色マスを0側へ1近づける', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'column' },
  { id: 'W04', name: '外周削り', description: '指定外周ラインの敵色マスを0側へ1近づける', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'row', placement: 'edge' },
  { id: 'W05', name: '前線摩耗', description: '敵色マスを最大6マス、0側へ1近づける', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'globalLimit', limit: 6 },
  { id: 'W06', name: '後方撹乱', description: '敵色マスを最大8マス、0側へ1近づける', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'globalLimit', limit: 8 },
  { id: 'W07', name: '斜線妨害', description: '斜め十字内の敵色マスを0側へ1近づける', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'diagonalCross' },
  { id: 'W08', name: '市松妨害', description: '敵色マスを最大10マス、0側へ1近づける', power: 1, minBoardSize: 6, maxBoardSize: 7, targetKind: 'globalLimit', limit: 10 },
  { id: 'W09', name: '薄削り網', description: '敵色マスを最大8マス、0側へ1近づける', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'globalLimit', limit: 8 },
  { id: 'W10', name: '境界侵食', description: '敵色マスを最大6マス、0側へ1近づける', power: 1, minBoardSize: 5, maxBoardSize: 7, targetKind: 'globalLimit', limit: 6 },
  { id: 'W11', name: '要塞破砕', description: '敵色1マスを0側へ3近づける', power: 3, minBoardSize: 3, maxBoardSize: 7, targetKind: 'single' },
  { id: 'W12', name: '角破砕', description: '角の敵色1マスを0側へ3近づける', power: 3, minBoardSize: 3, maxBoardSize: 7, targetKind: 'single', placement: 'corner' },
  { id: 'W13', name: '端破砕', description: '辺上の敵色1マスを0側へ3近づける', power: 3, minBoardSize: 3, maxBoardSize: 7, targetKind: 'single', placement: 'edge' },
  { id: 'W14', name: '前線突破妨害', description: '敵色1マスを0側へ3近づける', power: 3, minBoardSize: 4, maxBoardSize: 7, targetKind: 'single' },
  { id: 'W15', name: '中核破壊', description: '敵色1マスを0側へ3近づける', power: 3, minBoardSize: 4, maxBoardSize: 7, targetKind: 'single' },
  { id: 'W16', name: '双点破砕', description: '隣接する敵色最大2マスを0側へ2近づける', power: 2, minBoardSize: 3, maxBoardSize: 7, targetKind: 'horizontal2' },
  { id: 'W17', name: '斜双点破砕', description: '斜め隣接する敵色最大2マスを0側へ2近づける', power: 2, minBoardSize: 3, maxBoardSize: 7, targetKind: 'diagonal2' },
  { id: 'W18', name: '高耐久崩し', description: '敵色1マスを0側へ3近づける', power: 3, minBoardSize: 4, maxBoardSize: 7, targetKind: 'single' },
  { id: 'W19', name: '拠点抜き', description: '敵色1マスを0側へ2近づける', power: 2, minBoardSize: 3, maxBoardSize: 7, targetKind: 'single' },
  { id: 'W20', name: '孤立破壊', description: '敵色1マスを0側へ3近づける', power: 3, minBoardSize: 3, maxBoardSize: 7, targetKind: 'single' },
  { id: 'W21', name: '十字崩し', description: '十字内の敵色マスを0側へ2近づける', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'cross' },
  { id: 'W22', name: '斜十字崩し', description: '斜め十字内の敵色マスを0側へ2近づける', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'diagonalCross' },
  { id: 'W23', name: '横三連崩し', description: '横3マス内の敵色マスを0側へ2近づける', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'horizontal3' },
  { id: 'W24', name: '縦三連崩し', description: '縦3マス内の敵色マスを0側へ2近づける', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'vertical3' },
  { id: 'W25', name: '2×2崩し', description: '2×2内の敵色マスを0側へ2近づける', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'block2x2' },
  { id: 'W26', name: 'L字崩し', description: 'L字3マス内の敵色マスを0側へ2近づける', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'lShape' },
  { id: 'W27', name: 'T字崩し', description: 'T字4マス内の敵色マスを0側へ2近づける', power: 2, minBoardSize: 5, maxBoardSize: 7, targetKind: 'tShape' },
  { id: 'W28', name: '小包囲崩し', description: '上下左右の敵色マスを0側へ2近づける', power: 2, minBoardSize: 4, maxBoardSize: 7, targetKind: 'around4' },
  { id: 'W29', name: '前線三点崩し', description: '敵色マスを最大3マス、0側へ2近づける', power: 2, minBoardSize: 5, maxBoardSize: 7, targetKind: 'globalLimit', limit: 3 },
  { id: 'W30', name: '連結核崩し', description: '敵色マスを最大4マス、0側へ2近づける', power: 2, minBoardSize: 5, maxBoardSize: 7, targetKind: 'globalLimit', limit: 4 },
  { id: 'W31', name: '微削り', description: '敵色1マスを0側へ1近づける', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'single' },
  { id: 'W32', name: '横隣削り', description: '敵色最大2マスを0側へ1近づける', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'horizontal2' },
  { id: 'W33', name: '縦隣削り', description: '敵色最大2マスを0側へ1近づける', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'vertical2' },
  { id: 'W34', name: '斜隣削り', description: '敵色最大2マスを0側へ1近づける', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'diagonal2' },
  { id: 'W35', name: '角小削り', description: '角付近の敵色最大2マスを0側へ1近づける', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'diagonal2', placement: 'corner' },
  { id: 'W36', name: '端小削り', description: '辺上の敵色最大2マスを0側へ1近づける', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'horizontal2', placement: 'edge' },
  { id: 'W37', name: '弱点削り', description: '敵色1マスを0側へ1近づける', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'single' },
  { id: 'W38', name: '中立際削り', description: '敵色1マスを0側へ1近づける', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'single' },
  { id: 'W39', name: '孤立削り', description: '敵色1マスを0側へ1近づける', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'single' },
  { id: 'W40', name: '小崩し', description: '敵色1マスを0側へ1近づける', power: 1, minBoardSize: 3, maxBoardSize: 4, targetKind: 'single' },
  { id: 'W41', name: '大侵食', description: '3×3内の敵色マスを0側へ2近づける', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'block3x3' },
  { id: 'W42', name: '制圧妨害', description: '大十字内の敵色マスを0側へ2近づける', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'bigCross' },
  { id: 'W43', name: '斜制圧妨害', description: '大斜め十字内の敵色マスを0側へ2近づける', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'bigDiagonalCross' },
  { id: 'W44', name: '横防衛線破壊', description: '指定行の敵色マスを0側へ2近づける', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'row' },
  { id: 'W45', name: '縦防衛線破壊', description: '指定列の敵色マスを0側へ2近づける', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'column' },
  { id: 'W46', name: '巨大連結崩し', description: '敵色マスを最大10マス、0側へ2近づける', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'globalLimit', limit: 10 },
  { id: 'W47', name: '全前線侵食', description: '敵色マスを最大8マス、0側へ2近づける', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'globalLimit', limit: 8 },
  { id: 'W48', name: '4×4崩壊', description: '4×4内の敵色マスを0側へ2近づける', power: 2, minBoardSize: 6, maxBoardSize: 7, targetKind: 'block4x4' },
  { id: 'W49', name: '最終破砕', description: '3×3内の敵色マスを0側へ3近づける', power: 3, minBoardSize: 7, maxBoardSize: 7, targetKind: 'block3x3' },
  { id: 'W50', name: '領域崩壊', description: '敵色マスを最大12マス、0側へ2近づける', power: 2, minBoardSize: 7, maxBoardSize: 7, targetKind: 'globalLimit', limit: 12 }
];

export function createAdditionalFortCards(): FortCard[] {
  return fortSpecs.map(spec => new ConfigurableFortCard(spec));
}

export function createDisruptionCards(): DisruptionCard[] {
  return disruptionSpecs.map(spec => new ConfigurableDisruptionCard(spec));
}
