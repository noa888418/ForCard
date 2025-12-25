// 座標型
export type Position = {
  x: number;
  y: number;
};

// プレイヤーID
export type PlayerId = 'A' | 'B';

// カードの種類
export type CardType = 'color' | 'special';

// カードID
export type ColorCardId = `C${number}`;
export type SpecialCardId = `S${number}`;
export type CardId = ColorCardId | SpecialCardId;

// カード選択情報
export type CardSelection = {
  cardId: CardId;
  targetPosition: Position;
  rotation?: number; // L字やT字などの回転用
  direction?: 'up' | 'down' | 'left' | 'right'; // T字などの方向用
};

// 連結領域
export type ConnectedRegion = {
  positions: Position[];
  playerId: PlayerId;
};

// 要塞形の種類
export type FortressPattern = '2x2' | 'L' | 'cross';

// 要塞形の情報
export type FortressShape = {
  pattern: FortressPattern;
  positions: Position[];
  minStability: number;
};

