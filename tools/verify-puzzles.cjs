const fs = require('fs');

const source = fs.readFileSync('src/main.ts', 'utf8');
const boardSize = 5;

const specRegex = /\{\s*id:\s*'(C|F)(\d+)'[\s\S]*?type:\s*'(color|fort)'[\s\S]*?power:\s*(\d+)[\s\S]*?originIndex:\s*(\d+)[\s\S]*?shape:\s*'([A-Z0-9]+)'[\s\S]*?\}/g;
const specs = new Map();
for (const match of source.matchAll(specRegex)) {
  const id = `${match[1]}${match[2]}`;
  specs.set(id, {
    id,
    type: match[3],
    power: Number(match[4]),
    originIndex: Number(match[5]),
    shape: match[6],
  });
}

const levels = source
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line.startsWith('{ level: '))
  .map(line => {
    const level = Number(line.match(/level:\s*(\d+)/)?.[1] ?? 0);
    const cardIdsRaw = line.match(/cardIds:\s*\[([^\]]+)\]/)?.[1] ?? '';
    const initialRaw = line.match(/initialBoard:\s*\[([^\]]+)\]/)?.[1] ?? '';
    const targetRaw = line.match(/target:\s*\[([^\]]+)\]/)?.[1] ?? '';
    return {
      level,
      cardIds: [...cardIdsRaw.matchAll(/'([^']+)'/g)].map(idMatch => idMatch[1]),
      initialBoard: initialRaw
        ? initialRaw.split(',').map(value => Number(value.trim()))
        : Array(boardSize * boardSize).fill(0),
      target: targetRaw.split(',').map(value => Number(value.trim())),
    };
  })
  .filter(config => (config.level >= 31 && config.level <= 39) || (config.level >= 41 && config.level <= 50));

const offsetsByShape = {
  H3: [[-1, 0], [0, 0], [1, 0]],
  V3: [[0, -1], [0, 0], [0, 1]],
  B2: [[0, 0], [1, 0], [0, 1], [1, 1]],
  X: [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]],
  D: [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]],
  P: [[0, 0]],
  H2: [[0, 0], [1, 0]],
  V2: [[0, 0], [0, 1]],
  LDR: [[0, 0], [1, 0], [0, 1]],
  LDL: [[0, 0], [-1, 0], [0, 1]],
  LUR: [[0, 0], [1, 0], [0, -1]],
  LUL: [[0, 0], [-1, 0], [0, -1]],
  TU: [[0, 0], [-1, 0], [1, 0], [0, -1]],
  TD: [[0, 0], [-1, 0], [1, 0], [0, 1]],
  TL: [[0, 0], [0, -1], [0, 1], [-1, 0]],
  TR: [[0, 0], [0, -1], [0, 1], [1, 0]],
  N: [[0, 0], [1, 0], [1, -1], [2, -1]],
  S: [[0, 0], [1, 0], [1, 1], [2, 1]],
  Z: [[0, 0], [-1, 0], [-1, 1], [-2, 1]],
  STEP: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],
  HOOK: [[0, 0], [1, 0], [2, 0], [0, 1]],
  J: [[0, 0], [0, 1], [0, 2], [-1, 2]],
  R: [[0, 0], [0, 1], [1, 1], [1, 2]],
};

function targetIndexes(spec, originIndex) {
  const x = originIndex % boardSize;
  const y = Math.floor(originIndex / boardSize);
  const seen = new Set();
  const indexes = [];
  for (const [dx, dy] of offsetsByShape[spec.shape]) {
    const px = x + dx;
    const py = y + dy;
    if (px < 0 || px >= boardSize || py < 0 || py >= boardSize) continue;
    const index = py * boardSize + px;
    if (seen.has(index)) continue;
    seen.add(index);
    indexes.push(index);
  }
  return indexes;
}

function apply(board, spec, originIndex) {
  if (spec.type === 'fort' && board[originIndex] <= 0) return null;
  const indexes = spec.type === 'fort'
    ? targetIndexes(spec, originIndex).filter(index => board[index] > 0)
    : targetIndexes(spec, originIndex);
  if (!indexes.length) return null;
  const next = board.slice();
  for (const index of indexes) next[index] += spec.power;
  return next;
}

function solve(cardIds, initialBoard, target, limit = 2) {
  const solutions = [];
  const used = Array(cardIds.length).fill(false);
  const targetKey = target.join(',');
  const dfs = (board, moves) => {
    if (solutions.length >= limit) return;
    if (moves.length === cardIds.length) {
      if (board.join(',') === targetKey) solutions.push(moves.slice());
      return;
    }
    const seenCards = new Set();
    for (let cardIndex = 0; cardIndex < cardIds.length; cardIndex++) {
      if (used[cardIndex]) continue;
      const cardId = cardIds[cardIndex];
      if (seenCards.has(cardId)) continue;
      seenCards.add(cardId);
      const spec = specs.get(cardId);
      if (!spec) throw new Error(`Missing fixed-card spec for ${cardId}`);
      used[cardIndex] = true;
      for (let originIndex = 0; originIndex < boardSize * boardSize; originIndex++) {
        const next = apply(board, spec, originIndex);
        if (!next) continue;
        if (next.every((value, index) => value <= target[index])) {
          dfs(next, moves.concat([[cardId, originIndex]]));
        }
      }
      used[cardIndex] = false;
    }
  };
  dfs(initialBoard.slice(), []);
  return solutions;
}

let failed = false;
for (const level of levels) {
  const solutions = solve(level.cardIds, level.initialBoard, level.target);
  const first = solutions[0]?.map(([id, index]) => `${id}@${index}`).join(' -> ') ?? 'none';
  console.log(`Level ${level.level}: ${solutions.length} solution(s)`);
  console.log(`  ${first}`);
  if (solutions.length !== 1) failed = true;
}

if (failed) process.exit(1);
