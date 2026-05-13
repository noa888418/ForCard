import { GameManager } from './GameManager.js';
import { Player } from './Player.js';
import { CardFactory } from './CardFactory.js';
import { CardSelection, PlayerId, Position, CardId } from './types.js';
import { Board } from './Board.js';
import { CPUPlayer } from './CPUPlayer.js';
import { Card } from './Card.js';

// 色パターンの型定義
type ColorPattern = {
  color1: string;
  color2: string;
  name: string;
};

type GameStartSettings = Partial<{
  boardSize: number;
  totalTurns: number;
  cardIds: string[] | null;
  playerBIsCPU: boolean;
  cpuDifficulty: 'easy' | 'normal' | 'hard';
  cpuLevel: number;
}>;

class GameUI {
  private gameManager: GameManager | null = null;
  private cpuPlayer: CPUPlayer | null = null;
  private currentPlayer: PlayerId = 'A';
  private selectedCardId: string | null = null;
  private selectedCardIndex: number | null = null; // 同じカードが複数ある場合のインデックス
  private selectedPosition: { x: number; y: number } | null = null;
  private hoveredPosition: { x: number; y: number } | null = null;
  private playerADecided: boolean = false; // プレイヤーAが決定したか
  private playerBDecided: boolean = false; // プレイヤーB（CPU）が決定したか
  private showingReveal: boolean = false; // 公開フェーズ表示中か
  private doubleActionFirstCardSelected: boolean = false; // ダブルアクション中に1枚目のカードが選択されているか
  private doubleActionFirstSelection: CardSelection | null = null; // ダブルアクション中に1枚目に選択されたカード
  private devSettings: {
    boardSize: number;
    totalTurns: number;
    cardIds: string[] | null;
    playerBIsCPU: boolean;
    cpuDifficulty: 'easy' | 'normal' | 'hard';
    cpuLevel: number;
  } = {
    boardSize: 5,
    totalTurns: 15,
    cardIds: null,
    playerBIsCPU: true,
    cpuDifficulty: 'normal',
    cpuLevel: 10
  };

  private playerBIsCPU: boolean = true; // プレイヤーBがCPUかどうか
  private showColorPoints: boolean = true; // 色ポイントの表示/非表示
  // 以前の「プレイヤーB手動操作」用の選択状態（現在はCPU固定だが、既存ロジック互換のため保持）
  private playerBSelectedCardId: string | null = null;
  private playerBSelectedCardIndex: number | null = null;
  private playerBSelectedPosition: { x: number; y: number } | null = null;
  private selectedRotation: number = 0; // C16などの回転可能カードの回転角度（0=0度, 1=90度, 2=180度, 3=270度）
  private playerBSelectedRotation: number = 0; // 互換維持用（現在は未使用）
  private selectedDirection: 'up' | 'down' = 'up'; // C17用の方向（上向き/下向き）
  private playerBSelectedDirection: 'up' | 'down' = 'up'; // 互換維持用（現在は未使用）
  private previousStabilities: Map<string, number> = new Map(); // 前の安定度状態（key: "x,y", value: stability）
  private onReturnToMenu?: () => void;
  private menuConfirmOpen: boolean = false;

  /** プレイヤーA 手札カルーセル（中央インデックス） */
  private handCarouselCenterIndex: number = 0;
  private lastPlayerASortedHand: Card[] = [];
  private handCardUiIdSeed: number = 1;
  private handCardUiIdMap: WeakMap<Card, number> = new WeakMap();
  /** updateHands 内で手札から選択を同期したあと、盤面ハイライトをもう一度合わせる */
  private postHandBoardRefresh: boolean = false;
  private handDeckModalOpen: boolean = false;
  private actionLogExpanded: boolean = false;

  /** 手札円盤UI：円の中心はカラム右端（100%）。半径・弧の半開き角 — 左半円弧上に3枚 */
  private static readonly handDiscHubLeftPct = 100;
  /** 半径を大きくすると弧上のカード同士の距離が広がる */
  private static readonly handDiscRadiusPx = 348;
  /** 中央から上下への角度差（大きいほど3枚の縦方向の間隔が広い） */
  private static readonly handDiscArcHalfStepDeg = 14.45;
  /** カーソル位置に合わせるためのカード全体Xオフセット（負で左へ） */
  private static readonly handDiscCardOffsetXPx = -90;
  /** 上下カードをY方向に少し離して重なりを減らす */
  private static readonly handDiscWingYOffsetPx = 128;
  /** 近い上下カードをX方向に少し右へ */
  private static readonly handDiscWingXOffsetPx = 15;
  /** 外側上下カードをX方向にさらに右へ */
  private static readonly handDiscOuterWingXOffsetPx = 70;

  // 色パターンの定義（補色の関係になるような組み合わせを多数用意）
  // 各パターンは2色のグラデーションで構成され、補色の関係になるように設計
  private colorPatterns: ColorPattern[] = [
    // 赤系とシアン系（補色）
    { color1: '#ff6b6b', color2: '#ee5a6f', name: '赤' },
    { color1: '#ff4757', color2: '#ff3838', name: '深紅' },
    { color1: '#ff6348', color2: '#ff4757', name: 'コーラルレッド' },
    { color1: '#ff3838', color2: '#ff6b6b', name: '鮮紅' },
    { color1: '#ff5252', color2: '#ff1744', name: 'ライトレッド' },
    
    // オレンジ系と青系（補色）
    { color1: '#ff9a56', color2: '#ff6a88', name: 'オレンジ' },
    { color1: '#ff8a65', color2: '#ff7043', name: 'ディープオレンジ' },
    { color1: '#ffa726', color2: '#ff9800', name: 'アンバー' },
    { color1: '#ffb74d', color2: '#ffa726', name: 'ライトオレンジ' },
    { color1: '#ffcc80', color2: '#ffb74d', name: 'ピーチオレンジ' },
    
    // 黄系と青紫系（補色）
    { color1: '#feca57', color2: '#ff9ff3', name: '黄' },
    { color1: '#ffd54f', color2: '#ffc107', name: 'イエロー' },
    { color1: '#fff176', color2: '#ffeb3b', name: 'ライトイエロー' },
    { color1: '#ffd700', color2: '#ffed4e', name: 'ゴールド' },
    { color1: '#ffc947', color2: '#ffd54f', name: 'アンバーイエロー' },
    
    // 黄緑系と紫系（補色）
    { color1: '#43e97b', color2: '#38f9d7', name: '黄緑' },
    { color1: '#7cb518', color2: '#5cb85c', name: 'ライムグリーン' },
    { color1: '#8bc34a', color2: '#9ccc65', name: 'ライトグリーン' },
    { color1: '#aed581', color2: '#c5e1a5', name: 'パステルグリーン' },
    { color1: '#66bb6a', color2: '#81c784', name: 'グリーン' },
    
    // 緑系とマゼンタ系（補色）
    { color1: '#4caf50', color2: '#66bb6a', name: 'エメラルドグリーン' },
    { color1: '#26a69a', color2: '#4db6ac', name: 'ティールグリーン' },
    { color1: '#009688', color2: '#26a69a', name: 'ティール' },
    { color1: '#00897b', color2: '#009688', name: 'ダークティール' },
    { color1: '#00695c', color2: '#00897b', name: 'ディープティール' },
    
    // 青緑系とピンク系（補色）
    { color1: '#00bcd4', color2: '#4dd0e1', name: 'シアン' },
    { color1: '#00acc1', color2: '#00bcd4', name: 'ライトシアン' },
    { color1: '#0097a7', color2: '#00acc1', name: 'ダークシアン' },
    { color1: '#00838f', color2: '#0097a7', name: 'ディープシアン' },
    { color1: '#006064', color2: '#00838f', name: 'ダークシアン' },
    
    // 青系とオレンジ系（補色）
    { color1: '#4facfe', color2: '#00f2fe', name: '青' },
    { color1: '#2196f3', color2: '#42a5f5', name: 'ブルー' },
    { color1: '#1e88e5', color2: '#2196f3', name: 'ディープブルー' },
    { color1: '#1565c0', color2: '#1e88e5', name: 'ダークブルー' },
    { color1: '#0d47a1', color2: '#1565c0', name: 'ネイビーブルー' },
    
    // 青紫系と黄系（補色）
    { color1: '#667eea', color2: '#764ba2', name: '青紫' },
    { color1: '#5c6bc0', color2: '#7986cb', name: 'インディゴ' },
    { color1: '#3f51b5', color2: '#5c6bc0', name: 'ディープインディゴ' },
    { color1: '#303f9f', color2: '#3f51b5', name: 'ダークインディゴ' },
    { color1: '#1a237e', color2: '#303f9f', name: 'ネイビーインディゴ' },
    
    // 紫系と黄緑系（補色）
    { color1: '#9c27b0', color2: '#ab47bc', name: 'パープル' },
    { color1: '#8e24aa', color2: '#9c27b0', name: 'ディープパープル' },
    { color1: '#7b1fa2', color2: '#8e24aa', name: 'ダークパープル' },
    { color1: '#6a1b9a', color2: '#7b1fa2', name: 'ディープパープル' },
    { color1: '#4a148c', color2: '#6a1b9a', name: 'ダークパープル' },
    
    // マゼンタ系と緑系（補色）
    { color1: '#e91e63', color2: '#ec407a', name: 'ピンク' },
    { color1: '#c2185b', color2: '#e91e63', name: 'ディープピンク' },
    { color1: '#ad1457', color2: '#c2185b', name: 'ダークピンク' },
    { color1: '#880e4f', color2: '#ad1457', name: 'ディープピンク' },
    { color1: '#f50057', color2: '#ff4081', name: 'ホットピンク' },
    
    // ピンク系と青緑系（補色）
    { color1: '#f093fb', color2: '#f5576c', name: 'ピンク' },
    { color1: '#f48fb1', color2: '#f06292', name: 'ライトピンク' },
    { color1: '#ec407a', color2: '#f48fb1', name: 'ローズピンク' },
    { color1: '#e91e63', color2: '#ec407a', name: 'ローズ' },
    { color1: '#c2185b', color2: '#e91e63', name: 'ディープローズ' },
    
    // 追加の補色ペア
    { color1: '#00e676', color2: '#00c853', name: 'エメラルド' },
    { color1: '#64ffda', color2: '#1de9b6', name: 'アクア' },
    { color1: '#18ffff', color2: '#00e5ff', name: 'シアンライト' },
    { color1: '#00b0ff', color2: '#0091ea', name: 'ライトブルー' },
    { color1: '#2962ff', color2: '#0039cb', name: 'ロイヤルブルー' },
    { color1: '#651fff', color2: '#6200ea', name: 'バイオレット' },
    { color1: '#b388ff', color2: '#9c27b0', name: 'ライトパープル' },
    { color1: '#ff4081', color2: '#e91e63', name: 'マゼンタ' },
    { color1: '#ff1744', color2: '#d50000', name: 'レッド' },
    { color1: '#ff9100', color2: '#ff6d00', name: 'オレンジ' },
    { color1: '#ffc400', color2: '#ffab00', name: 'アンバー' },
    { color1: '#76ff03', color2: '#64dd17', name: 'ライム' },
    { color1: '#00e676', color2: '#00c853', name: 'グリーン' },
    { color1: '#1de9b6', color2: '#00bcd4', name: 'ティール' },
    { color1: '#00e5ff', color2: '#00b8d4', name: 'シアン' },
    { color1: '#2979ff', color2: '#2962ff', name: 'ブルー' },
    { color1: '#7c4dff', color2: '#651fff', name: 'インディゴ' },
    { color1: '#d500f9', color2: '#aa00ff', name: 'パープル' },
    { color1: '#ff00ea', color2: '#d500f9', name: 'マゼンタ' },
    { color1: '#ff1744', color2: '#c51162', name: 'ピンクレッド' }
  ];

  constructor(initialSettings: GameStartSettings = {}, options: Partial<{ onReturnToMenu: () => void }> = {}) {
    this.devSettings = { ...this.devSettings, ...initialSettings };
    this.onReturnToMenu = options.onReturnToMenu;
    this.setupEventListeners();
  }

  startNewGame(settings: GameStartSettings = {}): void {
    this.devSettings = { ...this.devSettings, ...settings };
    this.initializeGame();
  }

  private initializeGame(): void {
    // 色をランダムに選択（お互いが似ないように）
    this.selectRandomColors();

    // デッキを作成
    let deck: Card[];
    if (this.devSettings.cardIds && this.devSettings.cardIds.length > 0) {
      deck = this.createDeckFromCardIds(this.devSettings.cardIds);
      // 選択数が足りない場合はランダムで補完、超える場合は切り詰め
      if (deck.length < this.devSettings.totalTurns) {
        const fill = CardFactory.createRandomDeck(this.devSettings.totalTurns - deck.length);
        deck = [...deck, ...fill];
      } else if (deck.length > this.devSettings.totalTurns) {
        deck = deck.slice(0, this.devSettings.totalTurns);
      }
    } else {
      // 総ターン数に応じたデッキを作成
      deck = CardFactory.createRandomDeck(this.devSettings.totalTurns);
    }

    const playerA = new Player('A', [...deck]);
    const playerB = new Player('B', [...deck]);

    this.gameManager = new GameManager(playerA, playerB, this.devSettings.boardSize, this.devSettings.totalTurns);
    this.cpuPlayer = new CPUPlayer(playerB, 'B', { difficulty: this.devSettings.cpuDifficulty, level: this.devSettings.cpuLevel });
    this.currentPlayer = 'A';
    this.playerADecided = false;
    this.playerBDecided = false;
    this.showingReveal = false;
    this.doubleActionFirstCardSelected = false;
    this.doubleActionFirstSelection = null;
    this.selectedCardId = null;
    this.selectedCardIndex = null;
    this.selectedPosition = null;
    this.selectedRotation = 0;
    this.selectedDirection = 'up';
    this.hoveredPosition = null;
    this.handCarouselCenterIndex = 0;
    this.lastPlayerASortedHand = [];

    // プレイヤーBはCPU固定（開発者モード削除）
    this.playerBIsCPU = true;

    // CPUモードの場合のみCPU選択を開始
    if (this.playerBIsCPU) {
      this.startCPUSelection();
    }

    // 操作ログをクリア（ゲーム開始時のみ）
    this.clearActionLog();
    
    // 初期状態を previousStabilities に保存
    if (this.gameManager) {
      const board = this.gameManager.getBoard();
      const size = board.getSize();
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const cell = board.getCell(x, y);
          if (cell) {
            const key = `${x},${y}`;
            this.previousStabilities.set(key, cell.stability);
          }
        }
      }
    }
    
    this.updateUI();
  }

  // 色をランダムに選択（お互いが似ないように）
  private selectRandomColors(): void {
    // 2つの色パターンをランダムに選択
    const availablePatterns = [...this.colorPatterns];
    const patternAIndex = Math.floor(Math.random() * availablePatterns.length);
    const patternA = availablePatterns[patternAIndex];
    
    // プレイヤーBの色は、プレイヤーAと補色の関係になるように選択
    const remainingPatterns = availablePatterns.filter((_, index) => index !== patternAIndex);
    
    // プレイヤーAの色相を取得
    const hueA = this.getHue(patternA.color1);
    
    // 補色の関係（色相が180度離れている）に最も近い色を選ぶ
    let bestPatternB: ColorPattern | null = null;
    let minComplementaryDifference = Infinity;
    
    for (const patternB of remainingPatterns) {
      const hueB = this.getHue(patternB.color1);
      // 色相の差を計算（0-180度の範囲で）
      const hueDiff = Math.abs(hueA - hueB);
      const complementaryDiff = Math.min(hueDiff, 360 - hueDiff);
      // 180度（補色）に最も近い色を選ぶ
      const distanceFromComplementary = Math.abs(complementaryDiff - 180);
      
      if (distanceFromComplementary < minComplementaryDifference) {
        minComplementaryDifference = distanceFromComplementary;
        bestPatternB = patternB;
      }
    }
    
    // もし見つからなかった場合はランダムに選ぶ
    if (!bestPatternB) {
      const randomIndex = Math.floor(Math.random() * remainingPatterns.length);
      bestPatternB = remainingPatterns[randomIndex];
    }
    
    // CSS変数で色を設定
    const root = document.documentElement;
    root.style.setProperty('--player-a-color-1', patternA.color1);
    root.style.setProperty('--player-a-color-2', patternA.color2);
    root.style.setProperty('--player-b-color-1', bestPatternB.color1);
    root.style.setProperty('--player-b-color-2', bestPatternB.color2);
    
    // アニメーション用の色も設定（rgba形式）
    const rgbA = this.hexToRgb(patternA.color1);
    const rgbB = this.hexToRgb(bestPatternB.color1);
    
    if (rgbA) {
      root.style.setProperty('--player-a-rgb', `${rgbA.r}, ${rgbA.g}, ${rgbA.b}`);
    }
    if (rgbB) {
      root.style.setProperty('--player-b-rgb', `${rgbB.r}, ${rgbB.g}, ${rgbB.b}`);
    }
    
    // 動的にアニメーションスタイルを生成
    this.updateWinnerGlowAnimations(patternA.color1, bestPatternB.color1);
  }

  // 勝敗表示のグローアニメーションを動的に更新
  private updateWinnerGlowAnimations(colorA: string, colorB: string): void {
    const rgbA = this.hexToRgb(colorA);
    const rgbB = this.hexToRgb(colorB);
    
    if (!rgbA || !rgbB) return;
    
    // 既存のスタイルシートを削除
    const existingStyle = document.getElementById('dynamic-winner-glow-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // 新しいスタイルシートを追加
    const style = document.createElement('style');
    style.id = 'dynamic-winner-glow-styles';
    style.textContent = `
      @keyframes winner-glow-a {
        0%, 100% {
          text-shadow: 2px 2px 4px rgba(${rgbA.r}, ${rgbA.g}, ${rgbA.b}, 0.5), 0 0 10px rgba(${rgbA.r}, ${rgbA.g}, ${rgbA.b}, 0.3);
        }
        50% {
          text-shadow: 2px 2px 8px rgba(${rgbA.r}, ${rgbA.g}, ${rgbA.b}, 0.8), 0 0 20px rgba(${rgbA.r}, ${rgbA.g}, ${rgbA.b}, 0.6);
        }
      }
      
      @keyframes winner-glow-b {
        0%, 100% {
          text-shadow: 2px 2px 4px rgba(${rgbB.r}, ${rgbB.g}, ${rgbB.b}, 0.5), 0 0 10px rgba(${rgbB.r}, ${rgbB.g}, ${rgbB.b}, 0.3);
        }
        50% {
          text-shadow: 2px 2px 8px rgba(${rgbB.r}, ${rgbB.g}, ${rgbB.b}, 0.8), 0 0 20px rgba(${rgbB.r}, ${rgbB.g}, ${rgbB.b}, 0.6);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // 16進数カラーコードをRGBに変換
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // RGBから色相（Hue）を取得（0-360度）
  private getHue(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;
    
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    let hue = 0;
    
    if (delta === 0) {
      hue = 0; // 無彩色
    } else if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    
    hue = hue * 60;
    if (hue < 0) {
      hue += 360;
    }
    
    return hue;
  }

  private createDeckFromCardIds(cardIds: string[]): Card[] {
    const deck: Card[] = [];
    const allCards = CardFactory.createAllCards();
    const maxCards = this.devSettings.totalTurns;
    
    for (const cardId of cardIds) {
      const trimmedId = cardId.trim() as CardId;
      const card = CardFactory.createCardById(trimmedId);
      if (card) {
        deck.push(card);
      } else {
        console.warn(`カードID "${trimmedId}" が見つかりません`);
      }
    }
    
    // 総ターン数に満たない場合はランダムで補填
    while (deck.length < maxCards) {
      const remainingCards = allCards.filter(c => !cardIds.includes(c.getId()));
      if (remainingCards.length === 0) break;
      const randomCard = remainingCards[Math.floor(Math.random() * remainingCards.length)];
      const newCard = CardFactory.createCardById(randomCard.getId());
      if (newCard) {
        deck.push(newCard);
      }
    }
    
    return deck.slice(0, maxCards); // 総ターン数まで
  }


  // CPUの秘密選択を開始
  private startCPUSelection(): void {
    if (!this.gameManager || !this.cpuPlayer || this.playerBDecided || !this.playerBIsCPU) return;

    // スキップフラグをチェックして、スキップしているプレイヤーを決定済みにする
    const skipA = this.gameManager.isSkipNextTurn('A');
    const skipB = this.gameManager.isSkipNextTurn('B');
    
    if (skipA && !this.playerADecided) {
      // プレイヤーAがスキップの場合、自動的に決定済みにする
      this.playerADecided = true;
      // スキップしているプレイヤーのログを追加（重複を防ぐ）
      const currentTurn = this.gameManager.getCurrentTurn();
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`プレイヤーA: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`プレイヤーA: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
      this.updateUI();
    }
    if (skipB && !this.playerBDecided) {
      // プレイヤーBがスキップの場合、自動的に決定済みにする
      this.playerBDecided = true;
      // スキップしているプレイヤーのログを追加（重複を防ぐ）
      const currentTurn = this.gameManager.getCurrentTurn();
      const playerBName = this.playerBIsCPU ? 'CPU' : 'プレイヤーB';
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`${playerBName}: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`${playerBName}: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
      this.updateUI();
      // 両方ともスキップしている場合は、直接resolvePhase()を呼ぶ
      if (skipA && skipB) {
        setTimeout(() => {
          this.resolvePhase();
        }, 100);
      }
      return;
    }

    // 少し遅延を入れて自然に見せる
    setTimeout(() => {
      if (!this.gameManager || !this.cpuPlayer || this.playerBDecided || !this.playerBIsCPU) return;
      
      // 念のため、GameManagerの選択状態を確認してリセット
      const currentSelection = this.gameManager.getSelection('B');
      if (currentSelection !== null) {
        // 前のターンの選択が残っている場合はリセット
        this.gameManager.clearSelection('B');
        this.playerBSelectedCardId = null;
        this.playerBSelectedCardIndex = null;
        this.playerBSelectedPosition = null;
        console.log(`[startCPUSelection] 前のターンの選択をリセット`);
      }
      
      // 手札と使用済みカードを確認（デバッグ用）
      const playerB = this.gameManager.getPlayer('B');
      const hand = playerB.getHand();
      const usedCards = playerB.getUsedCards();
      const currentTurn = this.gameManager.getCurrentTurn();
      console.log(`[startCPUSelection] ターン${currentTurn}: 手札=${hand.map(c => c.getId()).join(',')}, 使用済み=${Array.from(usedCards).join(',')}`);
      
      const selection = this.cpuPlayer.selectCard(this.gameManager.getBoard());
      if (selection) {
        // 選択したカードが使用済みでないことを確認
        if (usedCards.has(selection.cardId)) {
          console.error(`[startCPUSelection] エラー: カード${selection.cardId}は既に使用済みです！`);
          return;
        }
        // CPUの選択を記録（まだ決定していない）
        const success = this.gameManager.selectCard('B', selection);
        if (!success) {
          console.error(`[startCPUSelection] エラー: カード${selection.cardId}の選択に失敗しました`);
          return;
        }
        console.log(`[startCPUSelection] CPUがカード${selection.cardId}を選択`);
        // CPUは自動で決定する（プレイヤーが決定するまで待たない）
        this.cpuDecide();
      }
    }, 1000 + Math.random() * 2000); // 1-3秒のランダム遅延
  }

  // CPUが決定
  private cpuDecide(): void {
    if (this.playerBDecided || !this.playerBIsCPU || !this.gameManager) return;
    
    // ダブルアクション中で、まだ残り回数がある場合は、2枚目のカードを選択できるようにする
    if (this.gameManager.isDoubleActionActive('B')) {
      const remaining = this.gameManager.getDoubleActionRemaining('B');
      if (remaining > 1) {
        // 1枚目のカードが選択されたことを記録
        const selectionB = this.gameManager.getSelection('B');
        if (selectionB) {
          this.doubleActionFirstCardSelected = true;
          this.doubleActionFirstSelection = selectionB; // 1枚目の選択を保存
        }
        // 1枚目のカードを処理してremainingを減らすため、checkBothDecidedを呼ぶ
        this.playerBDecided = true;
        this.updateUI();
        this.checkBothDecided();
        // 2枚目のカードを選択できるように、選択状態をリセット
        this.playerBDecided = false;
        // CPUが2枚目のカードを選択
        this.startCPUSelection();
        return;
      }
    }
    
    this.playerBDecided = true;
    this.updateUI();
    this.checkBothDecided();
  }

  private setupEventListeners(): void {
    const resetBtn = document.getElementById('reset-btn');
    const resultLogBtn = document.getElementById('result-log-btn');
    const resultRetryBtn = document.getElementById('result-retry-btn');
    const resultTitleBtn = document.getElementById('result-title-btn');
    const resultLogModal = document.getElementById('result-log-modal');
    const resultLogClose = document.getElementById('result-log-close');
    const mainMenuBtn = document.getElementById('main-menu-btn');
    const menuConfirmModal = document.getElementById('menu-confirm-modal');
    const menuConfirmOk = document.getElementById('menu-confirm-ok');
    const menuConfirmCancel = document.getElementById('menu-confirm-cancel');

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('ゲームをリセットしますか？')) {
          this.initializeGame();
        }
      });
    }

    if (mainMenuBtn) {
      mainMenuBtn.addEventListener('click', () => {
        if (!menuConfirmModal) return;
        this.menuConfirmOpen = true;
        menuConfirmModal.classList.remove('hidden');
      });
    }

    const closeMenuConfirm = () => {
      if (!menuConfirmModal) return;
      this.menuConfirmOpen = false;
      menuConfirmModal.classList.add('hidden');
    };

    if (menuConfirmCancel) {
      menuConfirmCancel.addEventListener('click', closeMenuConfirm);
    }
    if (menuConfirmOk) {
      menuConfirmOk.addEventListener('click', () => {
        closeMenuConfirm();
        this.onReturnToMenu?.();
      });
    }
    if (menuConfirmModal) {
      menuConfirmModal.addEventListener('click', (e) => {
        if (e.target === menuConfirmModal) closeMenuConfirm();
      });
      window.addEventListener('keydown', (e) => {
        if (!this.menuConfirmOpen) return;
        if (e.key === 'Escape') closeMenuConfirm();
      });
    }

    if (resultLogBtn) {
      resultLogBtn.addEventListener('click', () => this.openResultLogModal());
    }
    if (resultRetryBtn) {
      resultRetryBtn.addEventListener('click', () => {
        this.closeResultLogModal();
        document.getElementById('result-modal')?.classList.add('hidden');
        this.initializeGame();
      });
    }
    if (resultTitleBtn) {
      resultTitleBtn.addEventListener('click', () => {
        this.closeResultLogModal();
        document.getElementById('result-modal')?.classList.add('hidden');
        this.onReturnToMenu?.();
      });
    }
    if (resultLogClose) {
      resultLogClose.addEventListener('click', () => this.closeResultLogModal());
    }
    if (resultLogModal) {
      resultLogModal.addEventListener('click', (e) => {
        if (e.target === resultLogModal) this.closeResultLogModal();
      });
    }

    // 選びなおすボタン
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.cancelFirstCard();
      });
    }

    // 色ポイント表示/非表示のトグル
    const toggleColorPointsBtn = document.getElementById('toggle-color-points-btn');
    if (toggleColorPointsBtn) {
      toggleColorPointsBtn.addEventListener('click', () => {
        this.toggleColorPointsDisplay();
      });
    }

    const handWheel = document.getElementById('hand-a-wheel');
    if (handWheel) {
      handWheel.addEventListener('wheel', (e) => this.onHandCarouselWheel(e as WheelEvent), { passive: false });
    }

    document.addEventListener('keydown', (e) => this.onHandCarouselKey(e));

    const handDeckTrigger = document.getElementById('hand-deck-trigger');
    if (handDeckTrigger) {
      handDeckTrigger.addEventListener('click', () => this.openHandDeckModal());
    }

    const actionLogToggle = document.getElementById('action-log-toggle');
    if (actionLogToggle) {
      actionLogToggle.addEventListener('click', () => this.toggleActionLogPanel());
    }

    const handDeckModal = document.getElementById('hand-deck-modal');
    const handDeckClose = document.getElementById('hand-deck-close');
    const handDeckTab = document.getElementById('hand-deck-tab');
    if (handDeckClose) {
      handDeckClose.addEventListener('click', () => this.closeHandDeckModal());
    }
    if (handDeckTab) {
      handDeckTab.addEventListener('click', () => this.closeHandDeckModal());
    }
    if (handDeckModal) {
      handDeckModal.addEventListener('click', (e) => {
        if (e.target === handDeckModal) this.closeHandDeckModal();
      });
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.handDeckModalOpen) {
        this.closeHandDeckModal();
      }
    });

    // 画面リサイズ時も中央カードにカーソル枠を追従させる
    window.addEventListener('resize', () => {
      requestAnimationFrame(() => this.syncHandCursorToCenterCard());
    });
  }

  private toggleColorPointsDisplay(): void {
    this.showColorPoints = !this.showColorPoints;
    this.updateColorPointsToggleButton();
    // 盤面を更新して表示/非表示を反映
    this.updateBoard();
  }

  private updateColorPointsToggleButton(): void {
    const toggleBtn = document.getElementById('toggle-color-points-btn');
    if (toggleBtn) {
      const text = toggleBtn.querySelector<HTMLElement>('.ctrl-btn__text');
      if (text) {
        text.textContent = this.showColorPoints ? '1' : '';
      }
      toggleBtn.setAttribute('aria-pressed', this.showColorPoints ? 'true' : 'false');
    }
  }

  private onCardSelectorChange(playerId: PlayerId, value: string): void {
    // このメソッドは使用されていません（削除予定）
    return;

    const [cardId, indexStr] = value.split(':');
    const cardIndex = indexStr ? parseInt(indexStr) : 0;

    if (playerId === 'A' && !this.playerADecided) {
      this.selectedCardId = cardId;
      this.selectedCardIndex = cardIndex;
      this.selectedPosition = null;
      this.hoveredPosition = null;
      // プレイヤーAのターンに切り替え（カード選択時）
      this.currentPlayer = 'A';
      this.updateCardTargets();
      this.updateUI();
    }
  }

  private updateUI(): void {
    if (!this.gameManager) return;
    this.updateColorPointsToggleButton();

    // スキップフラグをチェックして、スキップしているプレイヤーを決定済みにする
    // これはターン開始時に実行されるため、スキップしているプレイヤーがカードを選択できないようにする
    const skipA = this.gameManager.isSkipNextTurn('A');
    const skipB = this.gameManager.isSkipNextTurn('B');
    const currentTurn = this.gameManager.getCurrentTurn();
    
    // デバッグ用ログ（開発時のみ）
    if (skipA || skipB) {
      console.log(`[updateUI] ターン${currentTurn}: skipA=${skipA}, skipB=${skipB}, playerADecided=${this.playerADecided}, playerBDecided=${this.playerBDecided}`);
    }
    
    if (skipA && !this.playerADecided) {
      // プレイヤーAがスキップの場合、自動的に決定済みにする
      this.playerADecided = true;
      console.log(`[updateUI] ターン${currentTurn}: プレイヤーAをスキップとして決定済みに設定`);
      // スキップしているプレイヤーのログを追加（重複を防ぐ）
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`プレイヤーA: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`プレイヤーA: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
    }
    if (skipB && !this.playerBDecided) {
      // プレイヤーBがスキップの場合、自動的に決定済みにする
      this.playerBDecided = true;
      console.log(`[updateUI] ターン${currentTurn}: プレイヤーBをスキップとして決定済みに設定`);
      // スキップしているプレイヤーのログを追加（重複を防ぐ）
      const playerBName = this.playerBIsCPU ? 'CPU' : 'プレイヤーB';
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`${playerBName}: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`${playerBName}: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
    }

    this.updateBoard();
    this.updateHands();
    if (this.postHandBoardRefresh) {
      this.postHandBoardRefresh = false;
      this.updateBoard();
      this.updateCardTargets();
    }
    this.updateGameInfo();
    this.updateScores();
    this.updateControls();
    
    // CPUの決定状態を表示
    this.updateCPUStatus();
    
    // 操作ログはクリアしない（ログを保持するため）
  }

  // CPUの決定状態を表示
  private updateCPUStatus(): void {
    const cpuInfo = document.getElementById('hand-b');
    if (!cpuInfo || !this.gameManager) return;

    // CPUの決定状態を表示
    const cpuStatus = cpuInfo.querySelector('.cpu-status');
    if (cpuStatus) {
      cpuStatus.remove();
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = `cpu-status ${this.playerBDecided ? 'cpu-status--ready' : 'cpu-status--pending'}`;
    statusDiv.title = this.playerBDecided ? 'CPU決定済み' : 'CPU選択中';
    statusDiv.setAttribute('aria-label', statusDiv.title);
    if (this.playerBDecided) {
      statusDiv.style.color = '#4caf50';
      statusDiv.style.fontWeight = 'bold';
    } else {
      statusDiv.style.color = '#ff9800';
    }
    cpuInfo.insertBefore(statusDiv, cpuInfo.firstChild);
  }

  private updateBoard(): void {
    if (!this.gameManager) return;

    const boardElement = document.getElementById('board');
    const columnLabelsElement = document.getElementById('board-column-labels');
    const rowLabelsElement = document.getElementById('board-row-labels');
    const boardWrapperElement = document.getElementById('board-wrapper');
    
    if (!boardElement || !columnLabelsElement || !rowLabelsElement) return;

    const board = this.gameManager.getBoard();
    const size = board.getSize();

    // 盤面サイズに応じて見た目を調整（5×5固定をやめる）
    const cellSize =
      size <= 3 ? 76 :
      size === 4 ? 68 :
      size === 5 ? 60 :
      size === 6 ? 54 : 48;
    const labelSize = Math.max(26, Math.round(cellSize * 0.5));
    const applyVars = (el: HTMLElement) => {
      el.style.setProperty('--board-size', String(size));
      el.style.setProperty('--cell-size', `${cellSize}px`);
      el.style.setProperty('--label-size', `${labelSize}px`);
    };
    if (boardWrapperElement) applyVars(boardWrapperElement);
    applyVars(boardElement);
    applyVars(columnLabelsElement);
    applyVars(rowLabelsElement);

    // 現在の安定度状態を保存（DOM要素を削除する前に保存）
    const currentStabilities = new Map<string, number>();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = board.getCell(x, y);
        if (cell) {
          const key = `${x},${y}`;
          currentStabilities.set(key, cell.stability);
        }
      }
    }

    // 盤面のグリッド設定
    boardElement.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
    columnLabelsElement.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
    rowLabelsElement.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;
    boardElement.innerHTML = '';

    // 列番号（上）
    columnLabelsElement.innerHTML = '';
    for (let x = 0; x < size; x++) {
      const label = document.createElement('div');
      label.className = 'column-label';
      label.textContent = String.fromCharCode(65 + x); // A, B, C, D, E
      columnLabelsElement.appendChild(label);
    }

    // 行番号（左）
    rowLabelsElement.innerHTML = '';
    for (let y = 0; y < size; y++) {
      const label = document.createElement('div');
      label.className = 'row-label';
      label.textContent = (y + 1).toString(); // 1, 2, 3, 4, 5
      rowLabelsElement.appendChild(label);
    }

    // マスを生成
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = board.getCell(x, y);
        if (!cell) continue;

        const cellElement = document.createElement('div');
        cellElement.className = 'cell';
        cellElement.dataset.x = x.toString();
        cellElement.dataset.y = y.toString();

        const owner = cell.owner;
        if (owner === 'A') {
          cellElement.classList.add('player-a');
        } else if (owner === 'B') {
          cellElement.classList.add('player-b');
        } else {
          cellElement.classList.add('neutral');
        }

        const absStability = Math.abs(cell.stability);
        if (absStability > 0) {
          cellElement.classList.add(`stability-${absStability}`);
        }

        // 安定度の変化を検出してアニメーションを適用
        const key = `${x},${y}`;
        const previousStability = this.previousStabilities.get(key) ?? 0;
        const currentStability = cell.stability;

        // 変化パターンを検出
        const prevAbs = Math.abs(previousStability);
        const currAbs = Math.abs(currentStability);
        const prevOwner = previousStability > 0 ? 'A' : previousStability < 0 ? 'B' : null;
        const currOwner = currentStability > 0 ? 'A' : currentStability < 0 ? 'B' : null;

        // 0→1, 0→-1: 中立から色が付く
        if (prevAbs === 0 && currAbs === 1) {
          console.log(`[Animation] 0→1/-1 at (${x},${y}): ${previousStability} → ${currentStability}`);
          cellElement.classList.add('animate-color-appear');
          // アニメーション完了後にクラスを削除
          cellElement.addEventListener('animationend', () => {
            cellElement.classList.remove('animate-color-appear');
          }, { once: true });
        }
        // 1→0, -1→0: 色が消える
        else if (prevAbs === 1 && currAbs === 0) {
          console.log(`[Animation] 1/-1→0 at (${x},${y}): ${previousStability} → ${currentStability}`);
          cellElement.classList.add('animate-color-disappear');
          // アニメーション完了後にクラスを削除
          cellElement.addEventListener('animationend', () => {
            cellElement.classList.remove('animate-color-disappear');
          }, { once: true });
        }
        // 1→2, -1→-2: 色が濃くなる（同じプレイヤーの色の場合）
        else if (prevAbs === 1 && currAbs === 2 && prevOwner === currOwner) {
          console.log(`[Animation] 1/-1→2/-2 at (${x},${y}): ${previousStability} → ${currentStability}`);
          cellElement.classList.add('animate-color-intensify');
          // アニメーション完了後にクラスを削除
          cellElement.addEventListener('animationend', () => {
            cellElement.classList.remove('animate-color-intensify');
          }, { once: true });
        }

        // 色ポイントの表示/非表示
        if (this.showColorPoints) {
          cellElement.textContent = cell.stability.toString();
        } else {
          cellElement.textContent = '';
        }
        const positionStr = this.formatPosition(x, y);
        cellElement.title = `${positionStr} (${x}, ${y}) 色ポイント: ${cell.stability}`;

        // タイムボムの表示
        const timeBombs = this.gameManager.getTimeBombs();
        for (const bombData of timeBombs) {
          const bombPositions = this.getBombBlastArea(bombData.position);
          const isBombCenter = bombData.position.x === x && bombData.position.y === y;
          const isInBlastArea = bombPositions.some(p => p.x === x && p.y === y);
          
          if (isBombCenter) {
            // タイムボムの中心マス
            cellElement.classList.add('time-bomb-center');
            const bombInfo = document.createElement('div');
            bombInfo.className = 'time-bomb-info';
            bombInfo.textContent = `💣${bombData.remainingTurns}`;
            bombInfo.title = `タイムボム（プレイヤー${bombData.playerId}設置、残り${bombData.remainingTurns}ターンで爆発）`;
            cellElement.appendChild(bombInfo);
            cellElement.title = `${positionStr} (${x}, ${y}) 色ポイント: ${cell.stability} | タイムボム（残り${bombData.remainingTurns}ターン）`;
          } else if (isInBlastArea) {
            // 爆心地3×3内のマス
            cellElement.classList.add('time-bomb-blast-area');
          }
        }

        // クリックイベント（常に設定、条件はselectPosition内でチェック）
        cellElement.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.currentPlayer === 'A' && this.selectedCardId && !this.playerADecided) {
            this.selectPosition(x, y, 'A');
          }
        });

        // ホバーイベント（カード選択中のみ、かつまだ位置を選択していない場合）
        const activePlayer = this.currentPlayer;
        let hasSelectedCard: boolean = false;
        let hasSelectedPosition: boolean = false;
        
        hasSelectedCard = activePlayer === 'A' && this.selectedCardId !== null && !this.playerADecided;
        hasSelectedPosition = activePlayer === 'A' && this.selectedPosition !== null;
        
        if (hasSelectedCard && !hasSelectedPosition) {
          cellElement.style.cursor = 'pointer';
          cellElement.addEventListener('mouseenter', () => {
            this.hoveredPosition = { x, y };
            this.updateCardTargets();
          });
          cellElement.addEventListener('mouseleave', () => {
            this.hoveredPosition = null;
            this.updateCardTargets();
          });
        } else {
          cellElement.style.cursor = hasSelectedCard ? 'pointer' : 'default';
        }

        boardElement.appendChild(cellElement);
      }
    }

    // 初期の適用範囲表示を更新
    this.updateCardTargets();

    // 現在の状態を前の状態として保存（次の更新で使用）
    this.previousStabilities = currentStabilities;
  }

  // 座標を文字列に変換（例：B2）
  private formatPosition(x: number, y: number): string {
    return `${String.fromCharCode(65 + x)}${y + 1}`;
  }

  // タイムボムの爆心地3×3エリアを取得
  private getBombBlastArea(center: Position): Position[] {
    const positions: Position[] = [];
    if (!this.gameManager) return positions;
    
    const board = this.gameManager.getBoard();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const pos = { x: center.x + dx, y: center.y + dy };
        if (board.isValidPosition(pos.x, pos.y)) {
          positions.push(pos);
        }
      }
    }
    return positions;
  }

  /** 1行に収まるようフォントサイズを調整（カード名・種別など） */
  private fitTextOneLine(textEl: HTMLElement, maxPx: number = 36, minPx: number = 11): void {
    const wrap = textEl.parentElement;
    if (!wrap) return;
    textEl.style.fontSize = `${maxPx}px`;
    const maxW = wrap.clientWidth;
    if (maxW <= 0) return;
    let lo = minPx;
    let hi = maxPx;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      textEl.style.fontSize = `${mid}px`;
      if (textEl.scrollWidth <= maxW) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    textEl.style.fontSize = `${lo}px`;
  }

  private getStarFillCount(cardId: string): number {
    if (cardId.startsWith('C')) {
      const num = parseInt(cardId.substring(1), 10);
      if ([1, 3, 4, 6, 7, 9, 10].includes(num)) return 1;
      if ([11, 12, 13, 14, 15, 16, 17].includes(num)) return 2;
      if ([21, 22, 24].includes(num)) return 3;
      return 1;
    }
    if (cardId.startsWith('F')) {
      const num = parseInt(cardId.substring(1), 10);
      if ([1, 2, 3].includes(num)) return 1;
      if ([4, 5, 6].includes(num)) return 2;
      if ([7, 8, 9, 10, 11, 12, 13].includes(num)) return 3;
      return 1;
    }
    if (cardId.startsWith('S')) {
      return 1;
    }
    return 1;
  }

  /**
   * 強化カード用（参考HTMLの star-container + SVG）
   */
  /**
   * 色カード：特殊カードと同一レイアウト（SVGは緑系グラデ・種別枠はイロ）
   */
  private buildColorCardVisual(
    visual: HTMLElement,
    card: Card,
    description: string,
    turnInfo: string | null,
    isEffectChanged: boolean
  ): { titleEl: HTMLElement; typeTextInner: HTMLElement } {
    const gradId = `paint0_color_${card.getId()}_${Math.random().toString(36).slice(2, 11)}`;
    const frameFill = this.getCardTypeFrameFill('color');

    const whole = document.createElement('div');
    whole.className = 'card-whole';
    const wholeInner = document.createElement('div');
    wholeInner.className = 'card-whole-inner';
    wholeInner.innerHTML = `<svg class="card-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 657.963 311">
                    <path d="M623.963 3H34C16.8792 3 3 16.8792 3 34V277C3 294.121 16.8792 308 34 308H623.963C641.083 308 654.963 294.121 654.963 277V34C654.963 16.8792 641.083 3 623.963 3Z" fill="url(#${gradId})" stroke="black" stroke-width="6" />
                    <defs>
                        <linearGradient gradientUnits="userSpaceOnUse" id="${gradId}" x1="60" x2="643" y1="380.5" y2="-53">
                            <stop offset="0.719918" stop-color="#474747" />
                            <stop offset="0.72034" stop-color="#1bbf4a" />
                        </linearGradient>
                    </defs>
                </svg>`;
    whole.appendChild(wholeInner);
    visual.appendChild(whole);

    const hLine = document.createElement('div');
    hLine.className = 'horizontal-line';
    hLine.innerHTML = `<div class="horizontal-line-inner">
                <svg class="line-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 654 3">
                    <line stroke="black" stroke-width="3" x2="654" y1="1.5" y2="1.5" />
                </svg>
            </div>`;
    visual.appendChild(hLine);

    const typeFrame = document.createElement('div');
    typeFrame.className = 'card-type-frame';
    const typeFrameInner = document.createElement('div');
    typeFrameInner.className = 'card-type-frame-inner';
    typeFrameInner.innerHTML = `<svg class="card-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 221.422 76.8846">
                    <path d="M193.673 1.5H2.92202L55.922 75.3846H219.922V28.5C215.607 10.7505 209.338 5.4729 193.673 1.5Z" fill="${frameFill}" stroke="black" stroke-width="3" />
                </svg>`;
    typeFrame.appendChild(typeFrameInner);
    visual.appendChild(typeFrame);

    const typeP = document.createElement('p');
    typeP.className = 'special-text';
    const typeTextInner = document.createElement('span');
    typeTextInner.className = 'special-text-inner';
    typeTextInner.textContent = 'イロ';
    typeP.appendChild(typeTextInner);
    visual.appendChild(typeP);

    const header = document.createElement('div');
    header.className = 'card-header';
    const headerInner = document.createElement('div');
    headerInner.className = 'card-header-inner';
    headerInner.innerHTML = `<svg class="card-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 484.935 77">
                    <g>
                        <path d="M1.5 29.5V75.5H481.5H482L428.5 1.5H28.5C11.5316 7.60056 5.68163 13.7925 1.5 29.5Z" fill="#474747" />
                        <path d="M481.5 75.5H482M482 75.5H1.5V29.5C5.68163 13.7925 11.5316 7.60056 28.5 1.5H428.5L482 75.5Z" stroke="black" stroke-width="3" />
                    </g>
                </svg>`;
    header.appendChild(headerInner);
    visual.appendChild(header);

    const nameWrap = document.createElement('div');
    nameWrap.className = 'card-name';
    const titleP = document.createElement('p');
    titleP.textContent = card.getName();
    nameWrap.appendChild(titleP);
    visual.appendChild(nameWrap);

    const starN = this.getStarFillCount(card.getId());
    const starSeq = [
      { cls: 'star-1', filled: starN >= 1 },
      { cls: 'star-3', filled: starN >= 2 },
      { cls: 'star-2', filled: starN >= 3 },
    ];
    for (const { cls, filled } of starSeq) {
      const sc = this.createSpecialStarIcon(filled);
      sc.classList.add(cls);
      visual.appendChild(sc);
    }

    const fp = document.createElement('div');
    fp.className = 'flavor-power-button';
    visual.appendChild(fp);
    const fs1 = document.createElement('div');
    fs1.className = 'flavor-side-button-1';
    visual.appendChild(fs1);
    const fs2 = document.createElement('div');
    fs2.className = 'flavor-side-button-2';
    visual.appendChild(fs2);

    const vLine = document.createElement('div');
    vLine.className = 'vertical-line-container';
    vLine.innerHTML = `<div class="vertical-line-rotated">
                <div class="vertical-line">
                    <div class="vertical-line-inner">
                        <svg class="line-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 77 6">
                            <line stroke="black" stroke-width="6" x2="77" y1="3" y2="3" />
                        </svg>
                    </div>
                </div>
            </div>`;
    visual.appendChild(vLine);

    const descBox = document.createElement('div');
    descBox.className = 'card-description-box';
    visual.appendChild(descBox);

    const isColorCard = card.getType() === 'color';
    if (isColorCard) {
      const wrap = document.createElement('div');
      wrap.className = 'color-card-pattern-wrap';
      wrap.appendChild(this.createColorCardPattern(card.getId()));
      visual.appendChild(wrap);
    } else if (turnInfo) {
      const descP = document.createElement('p');
      descP.className = 'description-text';
      descP.textContent = description;
      visual.appendChild(descP);
      const remainP = document.createElement('p');
      remainP.className = 'remaining-turns-text' + (isEffectChanged ? ' effect-changed' : '');
      remainP.textContent = turnInfo;
      visual.appendChild(remainP);
    } else {
      const descP = document.createElement('p');
      descP.className = 'description-text';
      descP.textContent = description;
      visual.appendChild(descP);
    }

    return { titleEl: titleP, typeTextInner };
  }

  /**
   * 強化カード：特殊カードと同一レイアウト（SVGは赤系グラデ・種別枠はキョウカ）
   */
  private buildFortCardVisual(
    visual: HTMLElement,
    card: Card,
    description: string,
    turnInfo: string | null,
    isEffectChanged: boolean
  ): { titleEl: HTMLElement; typeTextInner: HTMLElement } {
    const gradId = `paint0_fort_${card.getId()}_${Math.random().toString(36).slice(2, 11)}`;

    const whole = document.createElement('div');
    whole.className = 'card-whole';
    const wholeInner = document.createElement('div');
    wholeInner.className = 'card-whole-inner';
    wholeInner.innerHTML = `<svg class="card-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 657.963 311">
                    <path d="M623.963 3H34C16.8792 3 3 16.8792 3 34V277C3 294.121 16.8792 308 34 308H623.963C641.083 308 654.963 294.121 654.963 277V34C654.963 16.8792 641.083 3 623.963 3Z" fill="url(#${gradId})" stroke="black" stroke-width="6" />
                    <defs>
                        <linearGradient gradientUnits="userSpaceOnUse" id="${gradId}" x1="60" x2="643" y1="380.5" y2="-53">
                            <stop offset="0.719918" stop-color="#474747" />
                            <stop offset="0.72034" stop-color="#FF3134" />
                        </linearGradient>
                    </defs>
                </svg>`;
    whole.appendChild(wholeInner);
    visual.appendChild(whole);

    const hLine = document.createElement('div');
    hLine.className = 'horizontal-line';
    hLine.innerHTML = `<div class="horizontal-line-inner">
                <svg class="line-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 654 3">
                    <line stroke="black" stroke-width="3" x2="654" y1="1.5" y2="1.5" />
                </svg>
            </div>`;
    visual.appendChild(hLine);

    const typeFrame = document.createElement('div');
    typeFrame.className = 'card-type-frame';
    const typeFrameInner = document.createElement('div');
    typeFrameInner.className = 'card-type-frame-inner';
    typeFrameInner.innerHTML = `<svg class="card-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 221.422 76.8846">
                    <path d="M193.673 1.5H2.92202L55.922 75.3846H219.922V28.5C215.607 10.7505 209.338 5.4729 193.673 1.5Z" fill="#FF0004" stroke="black" stroke-width="3" />
                </svg>`;
    typeFrame.appendChild(typeFrameInner);
    visual.appendChild(typeFrame);

    const typeP = document.createElement('p');
    typeP.className = 'special-text';
    const typeTextInner = document.createElement('span');
    typeTextInner.className = 'special-text-inner';
    typeTextInner.textContent = 'キョウカ';
    typeP.appendChild(typeTextInner);
    visual.appendChild(typeP);

    const header = document.createElement('div');
    header.className = 'card-header';
    const headerInner = document.createElement('div');
    headerInner.className = 'card-header-inner';
    headerInner.innerHTML = `<svg class="card-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 484.935 77">
                    <g>
                        <path d="M1.5 29.5V75.5H481.5H482L428.5 1.5H28.5C11.5316 7.60056 5.68163 13.7925 1.5 29.5Z" fill="#474747" />
                        <path d="M481.5 75.5H482M482 75.5H1.5V29.5C5.68163 13.7925 11.5316 7.60056 28.5 1.5H428.5L482 75.5Z" stroke="black" stroke-width="3" />
                    </g>
                </svg>`;
    header.appendChild(headerInner);
    visual.appendChild(header);

    const nameWrap = document.createElement('div');
    nameWrap.className = 'card-name';
    const titleP = document.createElement('p');
    titleP.textContent = card.getName();
    nameWrap.appendChild(titleP);
    visual.appendChild(nameWrap);

    const starN = this.getStarFillCount(card.getId());
    const starSeq = [
      { cls: 'star-1', filled: starN >= 1 },
      { cls: 'star-3', filled: starN >= 2 },
      { cls: 'star-2', filled: starN >= 3 },
    ];
    for (const { cls, filled } of starSeq) {
      const sc = this.createSpecialStarIcon(filled);
      sc.classList.add(cls);
      visual.appendChild(sc);
    }

    const fp = document.createElement('div');
    fp.className = 'flavor-power-button';
    visual.appendChild(fp);
    const fs1 = document.createElement('div');
    fs1.className = 'flavor-side-button-1';
    visual.appendChild(fs1);
    const fs2 = document.createElement('div');
    fs2.className = 'flavor-side-button-2';
    visual.appendChild(fs2);

    const vLine = document.createElement('div');
    vLine.className = 'vertical-line-container';
    vLine.innerHTML = `<div class="vertical-line-rotated">
                <div class="vertical-line">
                    <div class="vertical-line-inner">
                        <svg class="line-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 77 6">
                            <line stroke="black" stroke-width="6" x2="77" y1="3" y2="3" />
                        </svg>
                    </div>
                </div>
            </div>`;
    visual.appendChild(vLine);

    const descBox = document.createElement('div');
    descBox.className = 'card-description-box';
    visual.appendChild(descBox);

    const descP = document.createElement('p');
    descP.className = 'description-text';
    descP.textContent = description;
    visual.appendChild(descP);

    if (turnInfo) {
      const remainP = document.createElement('p');
      remainP.className = 'remaining-turns-text' + (isEffectChanged ? ' effect-changed' : '');
      remainP.textContent = turnInfo;
      visual.appendChild(remainP);
    }

    return { titleEl: titleP, typeTextInner };
  }

  /**
   * 特殊カード：参考HTML（オレンジグラデ・トクシュ・説明＋残りターン行）
   */
  private createSpecialStarIcon(filled: boolean): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'star-container';
    const inner = document.createElement('div');
    inner.className = 'star-inner';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'star-svg');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('viewBox', '0 0 34.238 32.5623');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute(
      'd',
      'M20.2089 12.7471L20.4335 13.4375H31.161L23.0702 19.3154L22.4823 19.7422L22.7069 20.4336L25.7968 29.9434L17.7069 24.0664L17.119 23.6396L16.5311 24.0664L8.44031 29.9434L11.5311 20.4336L11.7557 19.7422L11.1678 19.3154L3.07702 13.4375H13.8046L14.0292 12.7471L17.119 3.23633L20.2089 12.7471Z'
    );
    path.setAttribute('stroke', '#F1FF2C');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', filled ? '#F1FF2C' : '#474747');
    svg.appendChild(path);
    inner.appendChild(svg);
    wrap.appendChild(inner);
    return wrap;
  }

  private buildSpecialCardVisual(
    visual: HTMLElement,
    card: Card,
    description: string,
    turnInfo: string | null,
    isEffectChanged: boolean
  ): { titleEl: HTMLElement; typeTextInner: HTMLElement } {
    const gradId = `paint0_sp_${card.getId()}_${Math.random().toString(36).slice(2, 11)}`;

    const whole = document.createElement('div');
    whole.className = 'card-whole';
    const wholeInner = document.createElement('div');
    wholeInner.className = 'card-whole-inner';
    wholeInner.innerHTML = `<svg class="card-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 657.963 311">
                    <path d="M623.963 3H34C16.8792 3 3 16.8792 3 34V277C3 294.121 16.8792 308 34 308H623.963C641.083 308 654.963 294.121 654.963 277V34C654.963 16.8792 641.083 3 623.963 3Z" fill="url(#${gradId})" stroke="black" stroke-width="6" />
                    <defs>
                        <linearGradient gradientUnits="userSpaceOnUse" id="${gradId}" x1="60" x2="643" y1="380.5" y2="-53">
                            <stop offset="0.719918" stop-color="#474747" />
                            <stop offset="0.72034" stop-color="#FDA43E" />
                        </linearGradient>
                    </defs>
                </svg>`;
    whole.appendChild(wholeInner);
    visual.appendChild(whole);

    const hLine = document.createElement('div');
    hLine.className = 'horizontal-line';
    hLine.innerHTML = `<div class="horizontal-line-inner">
                <svg class="line-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 654 3">
                    <line stroke="black" stroke-width="3" x2="654" y1="1.5" y2="1.5" />
                </svg>
            </div>`;
    visual.appendChild(hLine);

    const typeFrame = document.createElement('div');
    typeFrame.className = 'card-type-frame';
    const typeFrameInner = document.createElement('div');
    typeFrameInner.className = 'card-type-frame-inner';
    typeFrameInner.innerHTML = `<svg class="card-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 221.422 76.8846">
                    <path d="M193.673 1.5H2.92202L55.922 75.3846H219.922V28.5C215.607 10.7505 209.338 5.4729 193.673 1.5Z" fill="#FF9500" stroke="black" stroke-width="3" />
                </svg>`;
    typeFrame.appendChild(typeFrameInner);
    visual.appendChild(typeFrame);

    const typeP = document.createElement('p');
    typeP.className = 'special-text';
    const typeTextInner = document.createElement('span');
    typeTextInner.className = 'special-text-inner';
    typeTextInner.textContent = 'トクシュ';
    typeP.appendChild(typeTextInner);
    visual.appendChild(typeP);

    const header = document.createElement('div');
    header.className = 'card-header';
    const headerInner = document.createElement('div');
    headerInner.className = 'card-header-inner';
    headerInner.innerHTML = `<svg class="card-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 484.935 77">
                    <g>
                        <path d="M1.5 29.5V75.5H481.5H482L428.5 1.5H28.5C11.5316 7.60056 5.68163 13.7925 1.5 29.5Z" fill="#474747" />
                        <path d="M481.5 75.5H482M482 75.5H1.5V29.5C5.68163 13.7925 11.5316 7.60056 28.5 1.5H428.5L482 75.5Z" stroke="black" stroke-width="3" />
                    </g>
                </svg>`;
    header.appendChild(headerInner);
    visual.appendChild(header);

    const nameWrap = document.createElement('div');
    nameWrap.className = 'card-name';
    const titleP = document.createElement('p');
    titleP.textContent = card.getName();
    nameWrap.appendChild(titleP);
    visual.appendChild(nameWrap);

    const starN = this.getStarFillCount(card.getId());
    const starSeq = [
      { cls: 'star-1', filled: starN >= 1 },
      { cls: 'star-3', filled: starN >= 2 },
      { cls: 'star-2', filled: starN >= 3 },
    ];
    for (const { cls, filled } of starSeq) {
      const sc = this.createSpecialStarIcon(filled);
      sc.classList.add(cls);
      visual.appendChild(sc);
    }

    const fp = document.createElement('div');
    fp.className = 'flavor-power-button';
    visual.appendChild(fp);
    const fs1 = document.createElement('div');
    fs1.className = 'flavor-side-button-1';
    visual.appendChild(fs1);
    const fs2 = document.createElement('div');
    fs2.className = 'flavor-side-button-2';
    visual.appendChild(fs2);

    const vLine = document.createElement('div');
    vLine.className = 'vertical-line-container';
    vLine.innerHTML = `<div class="vertical-line-rotated">
                <div class="vertical-line">
                    <div class="vertical-line-inner">
                        <svg class="line-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 77 6">
                            <line stroke="black" stroke-width="6" x2="77" y1="3" y2="3" />
                        </svg>
                    </div>
                </div>
            </div>`;
    visual.appendChild(vLine);

    const descBox = document.createElement('div');
    descBox.className = 'card-description-box';
    visual.appendChild(descBox);

    const descP = document.createElement('p');
    descP.className = 'description-text';
    descP.textContent = description;
    visual.appendChild(descP);

    if (turnInfo) {
      const remainP = document.createElement('p');
      remainP.className = 'remaining-turns-text' + (isEffectChanged ? ' effect-changed' : '');
      remainP.textContent = turnInfo;
      visual.appendChild(remainP);
    }

    return { titleEl: titleP, typeTextInner };
  }

  /**
   * カード種別ごとに種別枠の塗り色（参考デザイン）
   */
  private getCardTypeFrameFill(kind: 'color' | 'fort' | 'special'): string {
    if (kind === 'color') return '#00E050';
    if (kind === 'fort') return '#FF0004';
    return '#FF9500';
  }

  /**
   * 色カードのパターンを描画するSVGを作成（黒地・蛍光グリッド）
   */
  private createColorCardPattern(cardId: string): HTMLElement {
    const container = document.createElement('div');
    container.className = 'color-card-pattern';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const cellSize = 14;
    const offset = 15;
    const gridSize = 5;
    const pattern = this.getColorCardPattern(cardId);
    const gridStroke = '#3cff00';
    const cellBg = '#0b0c0b';
    const fillHi = '#3cff00';

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(offset + x * cellSize));
        rect.setAttribute('y', String(offset + y * cellSize));
        rect.setAttribute('width', String(cellSize - 1));
        rect.setAttribute('height', String(cellSize - 1));
        rect.setAttribute('fill', cellBg);
        rect.setAttribute('stroke', gridStroke);
        rect.setAttribute('stroke-width', '0.75');
        svg.appendChild(rect);
      }
    }

    for (const pos of pattern) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(offset + pos.x * cellSize));
      rect.setAttribute('y', String(offset + pos.y * cellSize));
      rect.setAttribute('width', String(cellSize - 1));
      rect.setAttribute('height', String(cellSize - 1));
      rect.setAttribute('fill', fillHi);
      rect.setAttribute('stroke', gridStroke);
      rect.setAttribute('stroke-width', '1.25');
      svg.appendChild(rect);
    }

    container.appendChild(svg);
    return container;
  }

  // 色カードIDからパターンを取得（中心を(2,2)とする5×5グリッド）
  private getColorCardPattern(cardId: string): Array<{ x: number; y: number }> {
    const centerX = 2;
    const centerY = 2;
    const pattern: Array<{ x: number; y: number }> = [];
    
    switch (cardId) {
      case 'C01': // 単点塗り
        pattern.push({ x: centerX, y: centerY });
        break;
        
      case 'C03': // 直線2マス（左右）
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX - 1, y: centerY });
        pattern.push({ x: centerX + 1, y: centerY });
        break;
        
      case 'C04': // 斜め2マス
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX - 1, y: centerY - 1 });
        break;
        
      case 'C06': // 角専用3マス（右下角）
        pattern.push({ x: 4, y: 4 });
        pattern.push({ x: 3, y: 4 });
        pattern.push({ x: 4, y: 3 });
        break;
        
      case 'C07': // 端専用3マス（下端）
        pattern.push({ x: centerX, y: 4 });
        pattern.push({ x: centerX, y: 3 });
        pattern.push({ x: centerX, y: 2 });
        break;
        
      case 'C09': // 敵色削り（単点）
        pattern.push({ x: centerX, y: centerY });
        break;
        
      case 'C10': // 上下2マス塗り
        pattern.push({ x: centerX, y: centerY - 1 });
        pattern.push({ x: centerX, y: centerY + 1 });
        break;
        
      case 'C11': // 十字塗り
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX, y: centerY - 1 });
        pattern.push({ x: centerX, y: centerY + 1 });
        pattern.push({ x: centerX - 1, y: centerY });
        pattern.push({ x: centerX + 1, y: centerY });
        break;
        
      case 'C12': // 斜め十字塗り
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX - 1, y: centerY - 1 });
        pattern.push({ x: centerX + 1, y: centerY - 1 });
        pattern.push({ x: centerX - 1, y: centerY + 1 });
        pattern.push({ x: centerX + 1, y: centerY + 1 });
        break;
        
      case 'C13': // 横三連
        pattern.push({ x: centerX - 1, y: centerY });
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX + 1, y: centerY });
        break;
        
      case 'C14': // 縦三連
        pattern.push({ x: centerX, y: centerY - 1 });
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX, y: centerY + 1 });
        break;
        
      case 'C15': // 2×2ブロック塗り
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX + 1, y: centerY });
        pattern.push({ x: centerX, y: centerY + 1 });
        pattern.push({ x: centerX + 1, y: centerY + 1 });
        break;
        
      case 'C16': // L字形成
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX + 1, y: centerY });
        pattern.push({ x: centerX, y: centerY + 1 });
        break;
        
      case 'C17': // T字形成（下向きT）
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX - 1, y: centerY });
        pattern.push({ x: centerX + 1, y: centerY });
        pattern.push({ x: centerX, y: centerY + 1 });
        break;
        
      case 'C18':
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX, y: centerY - 1 });
        pattern.push({ x: centerX + 1, y: centerY });
        break;

      case 'C19':
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX - 1, y: centerY });
        pattern.push({ x: centerX, y: centerY - 1 });
        break;

      case 'C20':
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX, y: centerY + 1 });
        pattern.push({ x: centerX - 1, y: centerY });
        break;

      case 'C21': // 横一列塗り
        for (let x = 0; x < 5; x++) {
          pattern.push({ x, y: centerY });
        }
        break;
        
      case 'C22': // 縦一列塗り
        for (let y = 0; y < 5; y++) {
          pattern.push({ x: centerX, y });
        }
        break;
        
      case 'C23':
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX - 1, y: centerY });
        pattern.push({ x: centerX + 1, y: centerY });
        pattern.push({ x: centerX, y: centerY + 1 });
        break;

      case 'C24': // 3×3ブロック塗り
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            pattern.push({ x: centerX + dx, y: centerY + dy });
          }
        }
        break;

      case 'C25':
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX, y: centerY - 1 });
        pattern.push({ x: centerX, y: centerY + 1 });
        pattern.push({ x: centerX - 1, y: centerY });
        break;

      case 'C26':
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX, y: centerY - 1 });
        pattern.push({ x: centerX, y: centerY + 1 });
        pattern.push({ x: centerX + 1, y: centerY });
        break;
        
      default:
        // デフォルトは単点
        pattern.push({ x: centerX, y: centerY });
        break;
    }
    
    return pattern;
  }

  // カードの適用範囲表示を更新（ホバー時はupdateBoardを呼ばずにこれだけ呼ぶ）
  private updateCardTargets(): void {
    if (!this.gameManager) {
      const boardElement = document.getElementById('board');
      if (boardElement) {
        boardElement.querySelectorAll('.card-target').forEach(el => {
          el.classList.remove('card-target');
        });
      }
      return;
    }

    const activePlayer = this.currentPlayer;
    let selectedCardId: string | null = null;
    let selectedCardIndex: number | null = null;
    let selectedPosition: { x: number; y: number } | null = null;
    let playerId: PlayerId = 'A';

    // ダブルアクション中に1枚目のカードが選択されている場合、その適用範囲も表示する必要がある
    const isDoubleActionA = this.gameManager.isDoubleActionActive('A');
    const remainingA = this.gameManager.getDoubleActionRemaining('A');
    
    // ダブルアクション中で1枚目のカードが選択されている場合、適用範囲を表示するために処理を続行
    // remainingが1以下でも、1枚目のカードが選択されている場合は表示し続ける
    const shouldShowFirstCard = (isDoubleActionA && remainingA >= 1 && this.doubleActionFirstSelection && activePlayer === 'A');
    
    if (activePlayer === 'A' && (this.selectedCardId && !this.playerADecided || shouldShowFirstCard)) {
      selectedCardId = this.selectedCardId;
      selectedCardIndex = null; // インデックスは使用しない
      selectedPosition = this.selectedPosition;
      playerId = 'A';
    } else if (!shouldShowFirstCard) {
      // 全てのcard-targetクラスを削除
      const boardElement = document.getElementById('board');
      if (boardElement) {
        boardElement.querySelectorAll('.card-target').forEach(el => {
          el.classList.remove('card-target');
        });
      }
      return;
    }
    
    const board = this.gameManager.getBoard();
    
    // 全てのcard-targetクラスを削除
    const boardElement = document.getElementById('board');
    if (!boardElement) return;

    boardElement.querySelectorAll('.card-target').forEach(el => {
      el.classList.remove('card-target');
    });

    // ダブルアクション中に1枚目のカードが選択されている場合、その適用範囲を表示
    // remainingが1以上の場合（1枚目を決定した後、2枚目を決定するまで）
    if (isDoubleActionA && remainingA >= 1 && this.doubleActionFirstSelection && activePlayer === 'A') {
      const playerA = this.gameManager.getPlayer('A');
      const handA = playerA.getHand();
      const firstCard = handA.find(c => c.getId() === this.doubleActionFirstSelection!.cardId);
      if (firstCard) {
        try {
          const firstTargetPositions = firstCard.getTargetPositions(board, this.doubleActionFirstSelection.targetPosition, 'A');
          firstTargetPositions.forEach((pos: Position) => {
            const cellElement = boardElement.querySelector(`[data-x="${pos.x}"][data-y="${pos.y}"]`);
            if (cellElement) {
              cellElement.classList.add('card-target');
            }
          });
        } catch (e) {
          // エラーは無視
        }
      }
    }
    
    // プレイヤーBはCPUのみのため、手動選択の適用範囲表示は不要

    // 選択されたカードがある場合、その適用範囲を表示
    if (selectedCardId) {
      const player = this.gameManager.getPlayer(playerId);
      const hand = player.getHand();
      
      // 選択されたカードを取得（最初に見つかったカード）
      const card = hand.find(c => c.getId() === selectedCardId) || null;
      
      if (card) {
        // 適用範囲を計算する位置を決定
        // 選択済みの位置がある場合はそれを使い、ない場合はホバー位置を使う
        const targetPosition = selectedPosition || this.hoveredPosition;
        
        if (targetPosition) {
          // canPlay()をチェックして、選択できないマスには適用範囲を表示しない
          let canPlayAtPosition = true;
          if (card.canPlay) {
            try {
              canPlayAtPosition = card.canPlay(board, targetPosition, playerId);
            } catch (e) {
              canPlayAtPosition = false;
            }
          }
          
          if (canPlayAtPosition) {
            // 適用範囲を計算
            let targetPositions: Position[] = [];
            try {
              // C16などの回転可能カード、C17の方向切り替え可能カードの場合、オプションを設定
              const isRotatableCard = selectedCardId === 'C16';
              const isDirectionCard = selectedCardId === 'C17';
              const options: any = {};
              
              if (isRotatableCard) {
                if (playerId === 'A') {
                  options.rotation = this.selectedRotation;
                } else if (playerId === 'B') {
                  options.rotation = this.playerBSelectedRotation;
                }
              } else if (isDirectionCard) {
                if (playerId === 'A') {
                  options.direction = this.selectedDirection;
                } else if (playerId === 'B') {
                  options.direction = this.playerBSelectedDirection;
                }
              }
              
              targetPositions = card.getTargetPositions(board, targetPosition, playerId, options);
            } catch (e) {
              // エラーは無視
            }

            // 適用範囲のマスにcard-targetクラスを追加
            targetPositions.forEach((pos: Position) => {
              const cellElement = boardElement.querySelector(`[data-x="${pos.x}"][data-y="${pos.y}"]`);
              if (cellElement) {
                cellElement.classList.add('card-target');
              }
            });
          }
        }
      }
    }
  }

  private updateHands(): void {
    if (!this.gameManager) return;

    const handA = document.getElementById('hand-a');
    const handB = document.getElementById('hand-b');

    if (handA) {
      this.renderHand(handA, 'A');
    }
    if (handB) {
      const isCPU = this.playerBIsCPU;
      this.renderHand(handB, 'B', isCPU);
    }
  }

  private updateCardSelector(playerId: PlayerId): void {
    if (!this.gameManager) return;

    const selectorId = playerId === 'A' ? 'card-selector-a' : 'card-selector-b';
    const selector = document.getElementById(selectorId) as HTMLSelectElement;
    if (!selector) return;

    const player = this.gameManager.getPlayer(playerId);
    const hand = player.getHand();
    const usedCards = player.getUsedCards();

    // 現在の選択を保存
    const currentValue = selector.value;

    // セレクターをクリア
    selector.innerHTML = '<option value="">カードを選択してください</option>';

    // 手札のカードをグループ化（同じIDのカードをまとめる）
    const cardGroups = new Map<string, Card[]>();
    hand.forEach(card => {
      const id = card.getId();
      if (!cardGroups.has(id)) {
        cardGroups.set(id, []);
      }
      cardGroups.get(id)!.push(card);
    });

    // ソートして追加
    const sortedGroups = Array.from(cardGroups.entries()).sort(([idA], [idB]) => {
      const isColorA = idA.startsWith('C');
      const isColorB = idB.startsWith('C');
      if (isColorA && !isColorB) return -1;
      if (!isColorA && isColorB) return 1;
      const numA = parseInt(idA.substring(1));
      const numB = parseInt(idB.substring(1));
      return numA - numB;
    });

    sortedGroups.forEach(([cardId, cards]) => {
      const card = cards[0];
      const count = cards.length;
      const option = document.createElement('option');
      option.value = `${cardId}:${count > 1 ? '0' : ''}`; // 複数ある場合はインデックス0を指定
      option.textContent = `${card.getName()} (${cardId})${count > 1 ? ` ×${count}` : ''}`;
      selector.appendChild(option);

      // 同じカードが複数ある場合は、それぞれにオプションを追加
      if (count > 1) {
        for (let i = 1; i < count; i++) {
          const subOption = document.createElement('option');
          subOption.value = `${cardId}:${i}`;
          subOption.textContent = `${card.getName()} (${cardId}) #${i + 1}`;
          selector.appendChild(subOption);
        }
      }
    });

    // 前の選択を復元（可能な場合）
    if (currentValue) {
      selector.value = currentValue;
    }
  }

  private prepareSortedHandForPlayer(playerId: PlayerId): { sortedHand: Card[]; usedCards: Set<CardId> } | null {
    if (!this.gameManager) return null;
    const player = this.gameManager.getPlayer(playerId);
    let hand = player.getHand();
    const usedCards = player.getUsedCards();

    const isDoubleActionActive = this.gameManager.isDoubleActionActive(playerId);
    const remainingDA = this.gameManager.getDoubleActionRemaining(playerId);
    if (isDoubleActionActive && remainingDA >= 1 && this.doubleActionFirstSelection) {
      const firstCardId = this.doubleActionFirstSelection.cardId;
      if (usedCards.has(firstCardId)) {
        const firstCard = player.getCardById(firstCardId);
        if (firstCard && !hand.find(c => c.getId() === firstCardId)) {
          hand = [...hand, firstCard];
        }
      }
    }

    const sortedHand = [...hand].sort((a, b) => {
      const idA = a.getId();
      const idB = b.getId();
      const getCardCategory = (id: string): number => {
        if (id.startsWith('S')) return 3;
        if (id.startsWith('F')) return 2;
        if (id.startsWith('C')) return 1;
        return 4;
      };
      const categoryA = getCardCategory(idA);
      const categoryB = getCardCategory(idB);
      if (categoryA !== categoryB) {
        return categoryA - categoryB;
      }
      const numA = parseInt(idA.substring(1));
      const numB = parseInt(idB.substring(1));
      return numA - numB;
    });

    return { sortedHand, usedCards };
  }

  private isPlayerHandCardPickDisabled(card: Card, playerId: PlayerId): boolean {
    if (!this.gameManager) return true;
    const isDoubleActionActive = this.gameManager.isDoubleActionActive(playerId);
    const remaining = this.gameManager.getDoubleActionRemaining(playerId);
    const isSpecialCard = card.getType() === 'special';
    const isFortCard = card.getId().startsWith('F');
    const isSkipped = this.gameManager.isSkipNextTurn(playerId);
    let isFirstCardUsed = false;
    if (isDoubleActionActive && remaining >= 1 && this.doubleActionFirstSelection) {
      if (playerId === 'A' && this.doubleActionFirstSelection.cardId === card.getId()) {
        isFirstCardUsed = true;
      } else if (playerId === 'B' && this.doubleActionFirstSelection.cardId === card.getId()) {
        isFirstCardUsed = true;
      }
    }
    return isSkipped || (isDoubleActionActive && (isSpecialCard || isFortCard)) || isFirstCardUsed;
  }

  private buildPlayerHandCardElement(
    card: Card,
    playerId: PlayerId,
    usedCards: Set<CardId>,
    options?: { suppressPickClick?: boolean }
  ): HTMLElement {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.dataset.carouselCardUid = this.getHandCardUiId(card);
    const cardIdForType = card.getId();

    if (cardIdForType.startsWith('C')) {
      cardElement.classList.add('card--color');
    } else if (cardIdForType.startsWith('F')) {
      cardElement.classList.add('card--fort');
    } else {
      cardElement.classList.add('card--special');
    }

    if (usedCards.has(card.getId())) {
      cardElement.classList.add('used');
    }
    if (playerId === 'A' && this.selectedCardId === card.getId() && this.currentPlayer === playerId) {
      cardElement.classList.add('selected');
    }

    const kind: 'color' | 'fort' | 'special' = cardIdForType.startsWith('C')
      ? 'color'
      : cardIdForType.startsWith('F')
        ? 'fort'
        : 'special';

    let description = card.getDescription();
    let turnInfo: string | null = null;
    let isEffectChanged = false;

    if (this.gameManager) {
      const currentTurn = this.gameManager.getCurrentTurn();
      const totalTurns = this.gameManager.getTotalTurns();
      const remainingTurns = this.gameManager.getRemainingTurns();
      const cardId = card.getId();

      if (cardId === 'S01') {
        const effectiveTurns = totalTurns - 3;
        if (currentTurn <= effectiveTurns) {
          const turnsUntilChange = effectiveTurns + 1 - currentTurn;
          turnInfo = `のこり${turnsUntilChange}ターンでこうかぎれ`;
          description = '使用時点の盤面を記録し、有効ターン内なら全マスの色ポイント符号を反転';
        } else {
          isEffectChanged = true;
          description = '任意のマス1つの色ポイントを+1（C01：単点塗りと同じ効果）';
          turnInfo = 'こうかがきれました';
        }
      } else if (cardId === 'S09') {
        if (remainingTurns >= 4) {
          const turnsUntilChange = remainingTurns - 3;
          turnInfo = `のこり${turnsUntilChange}ターンでかくせい`;
          description = '自色連結領域を対象。ランダム1〜3マス+1';
        } else {
          isEffectChanged = true;
          turnInfo = 'かくせいしました';
          description = '自色連結領域を対象。領域内の自色マスを2倍、領域外の自色マスをリセット';
        }
      } else if (cardId === 'S04') {
        const pl = this.gameManager.getPlayer(playerId);
        const handList = pl.getHand();
        const remainingColorCards = handList.filter(c => {
          const id = c.getId();
          return id !== 'S04' && id.startsWith('C');
        });

        if (remainingColorCards.length <= 1) {
          description = '任意のマス1つの色ポイントを+1';
          isEffectChanged = true;
        }
      }
    }

    const visual = document.createElement('div');
    visual.className = 'card-visual';

    let titleSpan: HTMLElement;
    let typeTextInner: HTMLElement;

    if (kind === 'fort') {
      const built = this.buildFortCardVisual(visual, card, description, turnInfo, isEffectChanged);
      titleSpan = built.titleEl;
      typeTextInner = built.typeTextInner;
      if (isEffectChanged) {
        cardElement.classList.add('effect-changed');
      }
      cardElement.title = `${card.getName()} (${card.getId()})\n${description}`;
    } else if (kind === 'special') {
      const built = this.buildSpecialCardVisual(visual, card, description, turnInfo, isEffectChanged);
      titleSpan = built.titleEl;
      typeTextInner = built.typeTextInner;
      if (isEffectChanged) {
        cardElement.classList.add('effect-changed');
      }
      cardElement.title = `${card.getName()} (${card.getId()})\n${description}`;
    } else {
      const built = this.buildColorCardVisual(visual, card, description, turnInfo, isEffectChanged);
      titleSpan = built.titleEl;
      typeTextInner = built.typeTextInner;
      if (isEffectChanged) {
        cardElement.classList.add('effect-changed');
      }
      cardElement.title = `${card.getName()} (${card.getId()})\n${description}`;
    }

    cardElement.appendChild(visual);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.fitTextOneLine(titleSpan, 20, 11);
        this.fitTextOneLine(typeTextInner, 32, 12);
      });
    });

    const isSpecialCard = card.getType() === 'special';
    const cardIdForCheck = card.getId();
    const isFortCard = cardIdForCheck.startsWith('F');
    if (isSpecialCard) {
      cardElement.classList.add('is-special');
    }
    if (isFortCard) {
      cardElement.classList.add('is-fort');
    }

    const pickDisabled = this.isPlayerHandCardPickDisabled(card, playerId);
    if (pickDisabled) {
      cardElement.classList.add('disabled');
    }

    if (
      !options?.suppressPickClick &&
      playerId === 'A' &&
      this.currentPlayer === playerId &&
      !usedCards.has(card.getId()) &&
      !pickDisabled
    ) {
      cardElement.addEventListener('click', () => this.selectCard(card.getId(), playerId));
    }

    return cardElement;
  }

  private getHandCardUiId(card: Card): string {
    let id = this.handCardUiIdMap.get(card);
    if (!id) {
      id = this.handCardUiIdSeed++;
      this.handCardUiIdMap.set(card, id);
    }
    return String(id);
  }

  private captureHandCarouselCardRects(root: HTMLElement): Map<string, DOMRect> {
    const rects = new Map<string, DOMRect>();
    const cards = root.querySelectorAll('.hand-carousel-card[data-carousel-card-uid]');
    cards.forEach((el) => {
      const card = el as HTMLElement;
      const uid = card.dataset.carouselCardUid;
      if (!uid) return;
      rects.set(uid, card.getBoundingClientRect());
    });
    return rects;
  }

  private animateHandCarouselCardsFromPreviousRects(root: HTMLElement, previousRects: Map<string, DOMRect>): void {
    if (previousRects.size === 0) return;
    const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';
    requestAnimationFrame(() => {
      const cards = root.querySelectorAll('.hand-carousel-card[data-carousel-card-uid]');
      cards.forEach((el) => {
        const card = el as HTMLElement;
        const uid = card.dataset.carouselCardUid;
        if (!uid) return;
        const prev = previousRects.get(uid);
        if (!prev) {
          // 画面外スロットから入ってくるカード向けのフェードイン
          this.animateHandCarouselCardEntry(card, easing);
          return;
        }
        const next = card.getBoundingClientRect();
        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
        card.style.transition = 'none';
        card.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
        requestAnimationFrame(() => {
          card.style.transition = `transform 400ms ${easing}`;
          card.style.transform = 'translate(0px, 0px)';
          window.setTimeout(() => {
            if (card.style.transform === 'translate(0px, 0px)') {
              card.style.transform = '';
            }
            if (card.style.transition === `transform 400ms ${easing}`) {
              card.style.transition = '';
            }
          }, 420);
        });
      });
    });
  }

  private animateHandCarouselCardEntry(card: HTMLElement, easing: string): void {
    const slot = card.closest('.card-picker-slot') as HTMLElement | null;
    const slotId = slot?.id ?? '';
    const isUpper = slotId.endsWith('prev2') || slotId.endsWith('prev');
    const isLower = slotId.endsWith('next2') || slotId.endsWith('next');
    if (!isUpper && !isLower) return;

    const entryDy = isUpper ? -32 : 32;
    card.style.transition = 'none';
    card.style.opacity = '0';
    card.style.transform = `translate(0px, ${entryDy}px)`;
    requestAnimationFrame(() => {
      card.style.transition = `opacity 320ms ${easing}, transform 320ms ${easing}`;
      card.style.opacity = '1';
      card.style.transform = 'translate(0px, 0px)';
      window.setTimeout(() => {
        if (card.style.opacity === '1') {
          card.style.opacity = '';
        }
        if (card.style.transform === 'translate(0px, 0px)') {
          card.style.transform = '';
        }
        if (card.style.transition === `opacity 320ms ${easing}, transform 320ms ${easing}`) {
          card.style.transition = '';
        }
      }, 360);
    });
  }

  /**
   * 円盤上の位置（数学座標：0°=右、反時計回り）。画面はY下向きなので dy は反転。
   * カードは円の接線方向に近いチルト（rotateX ではなく平面内の rotate）。
   */
  private layoutHandDiscSlot(
    el: HTMLElement,
    angleDeg: number,
    zIndex: number,
    yOffsetPx: number = 0,
    xOffsetPx: number = 0
  ): void {
    const r = GameUI.handDiscRadiusPx;
    const hubPct = GameUI.handDiscHubLeftPct;
    const rad = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(rad) * r + GameUI.handDiscCardOffsetXPx + xOffsetPx;
    const dy = -Math.sin(rad) * r + yOffsetPx;
    /* 参照：上のカードは時計回り（+）、中央0°、下は反時計回り（−）。弧の角度に対し (180−θ) で接線チルトと揃える */
    const tiltDeg = (180 - angleDeg) * 0.82;
    el.style.position = 'absolute';
    el.style.left = `calc(${hubPct}% + ${dx.toFixed(2)}px)`;
    el.style.top = `calc(50% + ${dy.toFixed(2)}px)`;
    el.style.transform = `translate(-50%, -50%) rotate(${tiltDeg.toFixed(2)}deg)`;
    el.style.zIndex = String(zIndex);
  }

  private clearHandDiscSlotLayout(el: HTMLElement): void {
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';
    el.style.transform = '';
    el.style.zIndex = '';
  }

  private syncCardLoaderRotation(cardCount: number): void {
    const ring = document.getElementById('hand-deck-trigger') as HTMLElement | null;
    if (!ring) return;

    const stepDeg = cardCount > 0 ? 360 / cardCount : 0;
    const rotationDeg = -this.handCarouselCenterIndex * stepDeg;
    ring.style.setProperty('--loader-rotation', `${rotationDeg.toFixed(2)}deg`);
    ring.style.setProperty('--loader-counter-rotation', `${(-rotationDeg * 0.72).toFixed(2)}deg`);
    ring.style.setProperty('--loader-inner-rotation', `${(rotationDeg * 0.42).toFixed(2)}deg`);
  }

  /**
   * 中央カードの実寸・実位置に合わせて、固定カーソル枠を追従させる。
   * これにより解像度やスケール変更時もズレにくくなる。
   */
  private syncHandCursorToCenterCard(): void {
    const stage = document.querySelector('.hand-carousel-stage') as HTMLElement | null;
    const cursor = document.querySelector('.card-picker-cursor-fixed') as HTMLElement | null;
    const centerCard = document.querySelector('#hand-a-slot-center .hand-carousel-card--center') as HTMLElement | null;
    if (!cursor) return;
    if (!stage || !centerCard) {
      cursor.style.opacity = '0';
      return;
    }

    const visual = centerCard.querySelector('.card-visual') as HTMLElement | null;
    if (!visual) {
      cursor.style.opacity = '0';
      return;
    }

    const stageRect = stage.getBoundingClientRect();

    // カーソルは中央カードの「静止位置」で完全に固定する。
    // FLIPアニメ中の transform の影響を受けないよう、一時的に transform を外して静止矩形を測定する。
    const savedCardTransform = centerCard.style.transform;
    const savedCardTransition = centerCard.style.transition;
    const hadInlineTransform = savedCardTransform !== '';
    if (hadInlineTransform) {
      centerCard.style.transition = 'none';
      centerCard.style.transform = '';
    }
    const visualRect = visual.getBoundingClientRect();
    if (hadInlineTransform) {
      centerCard.style.transform = savedCardTransform;
      centerCard.style.transition = savedCardTransition;
    }

    const framePadding = 6;
    const width = visualRect.width + framePadding * 2;
    const height = visualRect.height + framePadding * 2;
    const centerX = visualRect.left - stageRect.left + visualRect.width / 2;
    const centerY = visualRect.top - stageRect.top + visualRect.height / 2;

    cursor.style.left = `${centerX}px`;
    cursor.style.top = `${centerY}px`;
    cursor.style.width = `${width}px`;
    cursor.style.height = `${height}px`;
    cursor.style.opacity = '1';
  }

  private renderHandCarousel(): void {
    if (!this.gameManager) return;

    const shell = document.getElementById('hand-a');
    const wheel = document.getElementById('hand-a-wheel');
    const prev2Slot = document.getElementById('hand-a-slot-prev2');
    const prevSlot = document.getElementById('hand-a-slot-prev');
    const centerSlot = document.getElementById('hand-a-slot-center');
    const nextSlot = document.getElementById('hand-a-slot-next');
    const next2Slot = document.getElementById('hand-a-slot-next2');
    if (!shell || !wheel || !prev2Slot || !prevSlot || !centerSlot || !nextSlot || !next2Slot) return;

    const previousRects = this.captureHandCarouselCardRects(wheel);
    const prep = this.prepareSortedHandForPlayer('A');
    if (!prep) return;
    const { sortedHand, usedCards } = prep;
    this.lastPlayerASortedHand = sortedHand;

    const n = sortedHand.length;
    const indexedSelection =
      this.selectedCardIndex !== null &&
      this.selectedCardIndex >= 0 &&
      this.selectedCardIndex < n &&
      sortedHand[this.selectedCardIndex]?.getId() === this.selectedCardId;
    const selIdx = indexedSelection
      ? this.selectedCardIndex!
      : this.selectedCardId
        ? sortedHand.findIndex(c => c.getId() === this.selectedCardId)
        : -1;
    if (selIdx >= 0) {
      this.handCarouselCenterIndex = selIdx;
    } else if (n > 0) {
      this.handCarouselCenterIndex = Math.max(0, Math.min(this.handCarouselCenterIndex, n - 1));
    } else {
      this.handCarouselCenterIndex = 0;
    }
    this.syncCardLoaderRotation(n);

    const state = this.gameManager.getState();
    const inactive =
      this.playerADecided ||
      this.currentPlayer !== 'A' ||
      state !== 'selecting' ||
      this.gameManager.isSkipNextTurn('A');
    shell.classList.toggle('hand-carousel--inactive', inactive);
    wheel.classList.toggle('hand-carousel--inactive', inactive);

    const clearSlot = (el: HTMLElement) => {
      el.innerHTML = '';
    };
    const slots = [prev2Slot, prevSlot, centerSlot, nextSlot, next2Slot];
    slots.forEach(slot => {
      clearSlot(slot);
      this.clearHandDiscSlotLayout(slot);
      slot.classList.remove('card-picker-slot--hidden');
    });

    const half = GameUI.handDiscArcHalfStepDeg;

    if (n === 0) {
      centerSlot.innerHTML = '<div class="hand-carousel-empty">手札がありません</div>';
      prev2Slot.classList.add('card-picker-slot--hidden');
      prevSlot.classList.add('card-picker-slot--hidden');
      nextSlot.classList.add('card-picker-slot--hidden');
      next2Slot.classList.add('card-picker-slot--hidden');
      this.layoutHandDiscSlot(centerSlot, 180, 2);
      this.syncHandCursorToCenterCard();
      return;
    }

    const c = this.handCarouselCenterIndex;
    const prev2Card = n > 4 ? sortedHand[(c - 2 + n) % n] : null;
    const prevCard = n > 2 ? sortedHand[(c - 1 + n) % n] : null;
    const currCard = sortedHand[c];
    const nextCard = n > 1 ? sortedHand[(c + 1) % n] : null;
    const next2Card = n > 4 ? sortedHand[(c + 2) % n] : null;

    if (n === 1) {
      prev2Slot.classList.add('card-picker-slot--hidden');
      prevSlot.classList.add('card-picker-slot--hidden');
      nextSlot.classList.add('card-picker-slot--hidden');
      next2Slot.classList.add('card-picker-slot--hidden');
    } else if (n === 2) {
      prev2Slot.classList.add('card-picker-slot--hidden');
      prevSlot.classList.add('card-picker-slot--hidden');
      next2Slot.classList.add('card-picker-slot--hidden');
    } else if (n <= 4) {
      prev2Slot.classList.add('card-picker-slot--hidden');
      next2Slot.classList.add('card-picker-slot--hidden');
    }

    const appendToSlot = (slot: HTMLElement, card: Card, role: 'prev2' | 'prev' | 'center' | 'next' | 'next2') => {
      const el = this.buildPlayerHandCardElement(card, 'A', usedCards, { suppressPickClick: true });
      el.classList.add('hand-carousel-card');
      if (role === 'center') {
        el.classList.add('hand-carousel-card--center');
      } else if (role === 'prev2' || role === 'next2') {
        el.classList.add(role === 'prev2' ? 'hand-carousel-card--wing-up' : 'hand-carousel-card--wing-down');
      } else {
        el.classList.add(role === 'prev' ? 'hand-carousel-card--wing-up' : 'hand-carousel-card--wing-down');
      }
      slot.appendChild(el);
    };

    if (n === 1) {
      appendToSlot(centerSlot, currCard, 'center');
      this.layoutHandDiscSlot(centerSlot, 180, 5);
    } else {
      if (prev2Card) {
        appendToSlot(prev2Slot, prev2Card, 'prev2');
        this.layoutHandDiscSlot(
          prev2Slot,
          180 - half * 2,
          1,
          -GameUI.handDiscWingYOffsetPx * 2,
          GameUI.handDiscOuterWingXOffsetPx
        );
      }
      if (prevCard) {
        appendToSlot(prevSlot, prevCard, 'prev');
        this.layoutHandDiscSlot(
          prevSlot,
          180 - half,
          3,
          -GameUI.handDiscWingYOffsetPx,
          GameUI.handDiscWingXOffsetPx
        );
      }
      appendToSlot(centerSlot, currCard, 'center');
      this.layoutHandDiscSlot(centerSlot, 180, 5);
      if (nextCard) {
        appendToSlot(nextSlot, nextCard, 'next');
        this.layoutHandDiscSlot(
          nextSlot,
          180 + half,
          3,
          GameUI.handDiscWingYOffsetPx,
          GameUI.handDiscWingXOffsetPx
        );
      }
      if (next2Card) {
        appendToSlot(next2Slot, next2Card, 'next2');
        this.layoutHandDiscSlot(
          next2Slot,
          180 + half * 2,
          1,
          GameUI.handDiscWingYOffsetPx * 2,
          GameUI.handDiscOuterWingXOffsetPx
        );
      }
    }

    const rotate = (delta: number) => {
      if (inactive || n <= 1) return;
      this.handCarouselCenterIndex = (this.handCarouselCenterIndex + delta + n * 100) % n;
      const card = sortedHand[this.handCarouselCenterIndex];
      this.selectCard(card.getId(), 'A', this.handCarouselCenterIndex);
    };

    prev2Slot.onclick = inactive || n <= 4 ? null : () => rotate(-2);
    prevSlot.onclick = inactive || n <= 1 ? null : () => rotate(-1);
    nextSlot.onclick = inactive || n <= 1 ? null : () => rotate(1);
    next2Slot.onclick = inactive || n <= 4 ? null : () => rotate(2);
    centerSlot.onclick = null;

    if (!inactive && n > 0 && this.selectedCardId === null) {
      const cand = sortedHand[this.handCarouselCenterIndex];
      if (!this.isPlayerHandCardPickDisabled(cand, 'A')) {
        this.selectedCardId = cand.getId();
        this.selectedCardIndex = this.handCarouselCenterIndex;
        this.selectedPosition = null;
        this.selectedRotation = 0;
        this.selectedDirection = 'up';
        this.hoveredPosition = null;
        this.postHandBoardRefresh = true;
      }
    }

    this.animateHandCarouselCardsFromPreviousRects(wheel, previousRects);
    requestAnimationFrame(() => this.syncHandCursorToCenterCard());
  }

  private wheelAccumDeltaY: number = 0;
  private wheelLastStepAt: number = 0;

  private onHandCarouselWheel(ev: WheelEvent): void {
    if (!this.gameManager) return;
    const inactive =
      this.playerADecided ||
      this.currentPlayer !== 'A' ||
      this.gameManager.getState() !== 'selecting' ||
      this.gameManager.isSkipNextTurn('A');
    if (inactive) return;
    const n = this.lastPlayerASortedHand.length;
    if (n <= 1) return;
    ev.preventDefault();

    // ホイールのイベント頻度が高い環境（Windowsなど）で1ステップずつ連打されるとFLIPアニメが
    // 重なり、カードが上下にばらつく見え方になる。
    // → deltaY を累積し、閾値と時間スロットルで 1ステップ/≈160ms に制限する。
    this.wheelAccumDeltaY += ev.deltaY;
    const stepThreshold = 40;
    const minStepIntervalMs = 160;
    if (Math.abs(this.wheelAccumDeltaY) < stepThreshold) return;
    const now = performance.now();
    if (now - this.wheelLastStepAt < minStepIntervalMs) return;

    const delta = this.wheelAccumDeltaY > 0 ? 1 : -1;
    this.wheelAccumDeltaY = 0;
    this.wheelLastStepAt = now;

    this.handCarouselCenterIndex = (this.handCarouselCenterIndex + delta + n * 100) % n;
    const card = this.lastPlayerASortedHand[this.handCarouselCenterIndex];
    this.selectCard(card.getId(), 'A', this.handCarouselCenterIndex);
  }

  private onHandCarouselKey(ev: KeyboardEvent): void {
    if (!this.gameManager) return;
    if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;

    // テキスト入力やモーダルへの入力中はカルーセルを操作しない
    const target = ev.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }
    }
    const openModal = document.querySelector('.modal:not(.hidden)');
    if (openModal) return;

    const inactive =
      this.playerADecided ||
      this.currentPlayer !== 'A' ||
      this.gameManager.getState() !== 'selecting' ||
      this.gameManager.isSkipNextTurn('A');
    if (inactive) return;

    const n = this.lastPlayerASortedHand.length;
    if (n <= 1) return;

    // ホイールと同じ時間スロットルを共有して、長押しで連続切替する場合も
    // FLIPアニメが重ならないようにする。
    const minStepIntervalMs = 160;
    const now = performance.now();
    if (now - this.wheelLastStepAt < minStepIntervalMs) {
      ev.preventDefault();
      return;
    }
    this.wheelLastStepAt = now;
    this.wheelAccumDeltaY = 0;

    ev.preventDefault();

    const delta = ev.key === 'ArrowDown' ? 1 : -1;
    this.handCarouselCenterIndex = (this.handCarouselCenterIndex + delta + n * 100) % n;
    const card = this.lastPlayerASortedHand[this.handCarouselCenterIndex];
    this.selectCard(card.getId(), 'A', this.handCarouselCenterIndex);
  }

  private openHandDeckModal(): void {
    const modal = document.getElementById('hand-deck-modal');
    const grid = document.getElementById('hand-deck-grid');
    if (!modal || !grid || !this.gameManager) return;

    if (
      this.playerADecided ||
      this.currentPlayer !== 'A' ||
      this.gameManager.getState() !== 'selecting' ||
      this.gameManager.isSkipNextTurn('A')
    ) {
      return;
    }

    this.handDeckModalOpen = true;
    modal.classList.remove('hand-deck-modal--closing');
    modal.classList.remove('hidden');
    grid.innerHTML = '';

    const prep = this.prepareSortedHandForPlayer('A');
    if (!prep) {
      this.closeHandDeckModal();
      return;
    }
    const { sortedHand, usedCards } = prep;

    sortedHand.forEach((card, index) => {
      const wrap = document.createElement('button');
      wrap.type = 'button';
      wrap.className = 'hand-deck-item';
      const el = this.buildPlayerHandCardElement(card, 'A', usedCards);
      el.classList.add('hand-deck-item-card');
      wrap.appendChild(el);

      const disabled = this.isPlayerHandCardPickDisabled(card, 'A');
      wrap.disabled = disabled;
      if (!disabled) {
        wrap.addEventListener('click', () => {
          this.handCarouselCenterIndex = index;
          this.selectCard(card.getId(), 'A', index);
          this.closeHandDeckModal();
        });
      }
      grid.appendChild(wrap);
    });
  }

  private closeHandDeckModal(): void {
    const modal = document.getElementById('hand-deck-modal');
    if (modal) {
      if (!modal.classList.contains('hidden')) {
        modal.classList.add('hand-deck-modal--closing');
        window.setTimeout(() => {
          modal.classList.add('hidden');
          modal.classList.remove('hand-deck-modal--closing');
        }, 260);
      }
    }
    this.handDeckModalOpen = false;
  }

  private renderHand(container: HTMLElement, playerId: PlayerId, isCPU: boolean = false): void {
    if (!this.gameManager) return;

    if (isCPU) {
      container.innerHTML = '';
      const player = this.gameManager.getPlayer(playerId);
      const remaining = player.getRemainingCardCount();
      const cpuInfo = document.createElement('div');
      cpuInfo.className = 'cpu-info';
      cpuInfo.textContent = `CPU (残りカード: ${remaining}枚)`;
      container.appendChild(cpuInfo);
      return;
    }

    if (playerId === 'A') {
      this.renderHandCarousel();
      return;
    }

    container.innerHTML = '';

    const prep = this.prepareSortedHandForPlayer(playerId);
    if (!prep) return;
    const { sortedHand, usedCards } = prep;

    sortedHand.forEach(card => {
      const cardElement = this.buildPlayerHandCardElement(card, playerId, usedCards);
      container.appendChild(cardElement);
    });
  }

  private updateGameInfo(): void {
    if (!this.gameManager) return;

    const turnCounter = document.getElementById('turn-counter');
    const totalTurns = document.getElementById('total-turns');
    const gameState = document.getElementById('game-state');

    if (turnCounter) {
      turnCounter.textContent = this.gameManager.getCurrentTurn().toString();
    }
    if (totalTurns) {
      totalTurns.textContent = this.gameManager.getTotalTurns().toString();
    }
    if (gameState) {
      const state = this.gameManager.getState();
      let stateText = '';
      if (this.showingReveal) {
        stateText = '公開フェーズ - 両方の選択を確認中...';
      } else if (state === 'selecting') {
        if (this.playerADecided && this.playerBDecided) {
          stateText = '両方決定済み - 公開フェーズへ...';
        } else if (this.playerADecided && !this.playerBDecided) {
          if (this.playerBIsCPU) {
            stateText = 'あなたは決定済み - CPUの決定を待っています...';
          } else {
            stateText = 'プレイヤーAは決定済み - プレイヤーBの決定を待っています...';
          }
        } else if (!this.playerADecided && this.playerBDecided) {
          if (this.playerBIsCPU) {
            stateText = 'CPUは決定済み - あなたの決定を待っています...';
          } else {
            stateText = 'プレイヤーBは決定済み - プレイヤーAの決定を待っています...';
          }
        } else {
          if (this.currentPlayer === 'A') {
            stateText = 'プレイヤーAのターン - カードと位置を選択してください';
          } else {
            stateText = 'プレイヤーBのターン - カードと位置を選択してください';
          }
        }
      } else {
        const stateTextMap: Record<string, string> = {
          'setup': '準備中',
          'resolving': '解決中',
          'finished': '終了'
        };
        stateText = stateTextMap[state] || state;
      }
      gameState.textContent = this.getHudStateLabel();
    }

    // ダブルアクション状態を更新
    this.updatePlayerStatus();
  }

  private getHudStateLabel(): string {
    if (!this.gameManager) return 'STANDBY';
    const state = this.gameManager.getState();
    if (this.showingReveal) return 'REVEAL';
    if (state === 'resolving') return 'SYNC';
    if (state === 'finished') return 'COMPLETE';
    if (state !== 'selecting') return 'STANDBY';
    if (this.playerADecided && this.playerBDecided) return 'LOCKED';
    if (this.playerBDecided) return 'SCAN OK';
    if (this.playerADecided) return 'WAIT CPU';
    return 'INPUT';
  }

  private clearActionLog(): void {
    const actionLog = document.getElementById('action-log');
    if (actionLog) {
      actionLog.innerHTML = '';
    }
  }

  private toggleActionLogPanel(): void {
    this.actionLogExpanded = !this.actionLogExpanded;
    const boardInfo = document.getElementById('board-info');
    const toggle = document.getElementById('action-log-toggle') as HTMLButtonElement | null;

    boardInfo?.classList.toggle('action-log-expanded', this.actionLogExpanded);
    if (toggle) {
      toggle.setAttribute('aria-expanded', this.actionLogExpanded ? 'true' : 'false');
      toggle.title = this.actionLogExpanded ? 'ログを最小化' : 'ログを展開';
    }
  }

  private openResultLogModal(): void {
    const modal = document.getElementById('result-log-modal');
    const content = document.getElementById('result-log-content');
    const actionLog = document.getElementById('action-log');
    if (!modal || !content) return;

    content.innerHTML = '';
    const entries = actionLog ? Array.from(actionLog.children).reverse() : [];

    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'result-log-entry result-log-entry--empty';
      empty.textContent = 'ログはありません';
      content.appendChild(empty);
    } else {
      let logNumber = 1;
      entries.forEach((entry) => {
        const row = document.createElement('div');
        const isHeader = entry.classList.contains('log-header');
        row.className = `result-log-entry${isHeader ? ' result-log-entry--header' : ''}`;
        if (!isHeader) {
          const number = document.createElement('span');
          number.className = 'result-log-entry__number';
          number.textContent = String(logNumber).padStart(2, '0');
          logNumber++;
          row.appendChild(number);
        }
        const text = document.createElement('span');
        text.className = 'result-log-entry__text';
        text.textContent = entry.textContent || '';
        row.appendChild(text);
        content.appendChild(row);
      });
    }

    modal.classList.remove('hidden');
  }

  private closeResultLogModal(): void {
    document.getElementById('result-log-modal')?.classList.add('hidden');
  }

  private addActionLog(message: string, isHeader: boolean = false): void {
    const actionLog = document.getElementById('action-log');
    if (!actionLog) {
      console.error('action-log element not found');
      return;
    }
    
    const logEntry = document.createElement('div');
    if (isHeader) {
      logEntry.className = 'log-header';
    } else {
      logEntry.className = 'log-entry';
    }
    logEntry.textContent = message;
    
    // 新しいログを上から追加（先頭に挿入）
    if (actionLog.firstChild) {
      actionLog.insertBefore(logEntry, actionLog.firstChild);
    } else {
      actionLog.appendChild(logEntry);
    }
    
    // スクロールを最上部に
    actionLog.scrollTop = 0;
  }

  private addTurnHeader(turnNumber: number): void {
    this.addActionLog(`━━━ ターン ${turnNumber} ━━━`, true);
  }

  private updatePlayerStatus(): void {
    if (!this.gameManager) return;

    const playerAStatus = document.getElementById('player-a-status');
    const playerBStatus = document.getElementById('player-b-status');

    // プレイヤーAの状態
    if (playerAStatus) {
      const statusMessages: string[] = [];
      
      if (this.gameManager.isDoubleActionActive('A')) {
        const remaining = this.gameManager.getDoubleActionRemaining('A');
        statusMessages.push(`⚡ ダブルアクション有効（残り${remaining}回、色カードのみ使用可能）`);
      }
      
      if (this.gameManager.isSkipNextTurn('A')) {
        statusMessages.push('⏸️ 次ターンは行動スキップ');
      }
      
      playerAStatus.textContent = statusMessages.join(' | ');
      playerAStatus.style.display = statusMessages.length > 0 ? 'block' : 'none';
    }

    // プレイヤーB（CPU）の状態
    if (playerBStatus) {
      const statusMessages: string[] = [];
      
      if (this.gameManager.isDoubleActionActive('B')) {
        const remaining = this.gameManager.getDoubleActionRemaining('B');
        statusMessages.push(`⚡ ダブルアクション有効（残り${remaining}回）`);
      }
      
      if (this.gameManager.isSkipNextTurn('B')) {
        statusMessages.push('⏸️ 次ターンは行動スキップ');
      }
      
      playerBStatus.textContent = statusMessages.join(' | ');
      playerBStatus.style.display = statusMessages.length > 0 ? 'block' : 'none';
    }
  }

  private updateScores(): void {
    if (!this.gameManager) return;

    const scoreBoard = document.getElementById('board-scores');
    const scoreA = document.getElementById('score-a');
    const scoreB = document.getElementById('score-b');
    const scores = this.gameManager.calculateScores();
    const shouldSealScores = this.gameManager.getRemainingTurns() <= 3 && this.gameManager.getState() !== 'finished';

    scoreBoard?.classList.toggle('board-hud-scores--sealed', shouldSealScores);
    if (scoreA) {
      scoreA.textContent = shouldSealScores ? '--' : scores.playerAScore.toString();
    }
    if (scoreB) {
      scoreB.textContent = shouldSealScores ? '--' : scores.playerBScore.toString();
    }
  }

  private updateControls(): void {
    if (!this.gameManager) return;

    // 「選びなおす」ボタンの表示制御
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      const isDoubleActionA = this.gameManager.isDoubleActionActive('A');
      const remainingA = this.gameManager.getDoubleActionRemaining('A');
      const activePlayer = this.currentPlayer;
      
      // 1枚目のカードを決定した後、2枚目のカードを選択中の場合に表示
      // remaining >= 1 の時（1枚目を決定した後、2枚目を決定するまで）は「選びなおす」ボタンを表示
      const showRetry = (isDoubleActionA && remainingA >= 1 && this.doubleActionFirstCardSelected && activePlayer === 'A');
      
      if (showRetry) {
        retryBtn.classList.remove('hidden');
      } else {
        retryBtn.classList.add('hidden');
      }
    }
  }

  // 1枚目のカード選択を取り消し
  private cancelFirstCard(): void {
    if (!this.gameManager) return;

    const activePlayer = this.currentPlayer;
    
    if (activePlayer === 'A') {
      if (this.gameManager.isDoubleActionActive('A')) {
        const remaining = this.gameManager.getDoubleActionRemaining('A');
        // remaining >= 1 の時（1枚目を決定した後、2枚目を決定するまで）はキャンセル可能
        if (remaining >= 1 && this.doubleActionFirstCardSelected) {
          // 選択をキャンセル
          if (this.gameManager.cancelCardSelection('A')) {
            this.selectedCardId = null;
            this.handCarouselCenterIndex = 0;
            this.selectedPosition = null;
            this.selectedRotation = 0; // 回転をリセット
            this.playerADecided = false;
            this.doubleActionFirstCardSelected = false;
            this.doubleActionFirstSelection = null;
            this.updateUI();
          }
        }
      }
    } else if (activePlayer === 'B' && !this.playerBIsCPU) {
      if (this.gameManager.isDoubleActionActive('B')) {
        const remaining = this.gameManager.getDoubleActionRemaining('B');
        // remaining >= 1 の時（1枚目を決定した後、2枚目を決定するまで）はキャンセル可能
        if (remaining >= 1 && this.doubleActionFirstCardSelected) {
          // 選択をキャンセル
          if (this.gameManager.cancelCardSelection('B')) {
            this.playerBSelectedCardId = null;
            this.playerBSelectedPosition = null;
            this.playerBSelectedRotation = 0; // 回転をリセット
            this.playerBDecided = false;
            this.doubleActionFirstCardSelected = false;
            this.doubleActionFirstSelection = null;
            this.updateUI();
          }
        }
      }
    }
  }

  private selectCard(cardId: string, playerId: PlayerId, handIndex: number | null = null): void {
    if (!this.gameManager) return;

    // スキップフラグをチェック
    if (playerId === 'A' && this.gameManager.isSkipNextTurn('A')) {
      // プレイヤーAがスキップしている場合は選択不可
      console.log(`[selectCard] プレイヤーAがスキップ中なので、カード選択を拒否: ${cardId}`);
      return;
    }
    if (playerId === 'B' && this.gameManager.isSkipNextTurn('B')) {
      // プレイヤーBがスキップしている場合は選択不可
      console.log(`[selectCard] プレイヤーBがスキップ中なので、カード選択を拒否: ${cardId}`);
      return;
    }

    // 通常モード：プレイヤーAのみ、currentPlayerチェック
    if (this.devSettings.playerBIsCPU) {
      if (this.currentPlayer !== playerId || playerId !== 'A') return;
      this.selectedCardId = cardId;
      this.selectedCardIndex = handIndex;
      this.selectedPosition = null;
      this.selectedRotation = 0; // 回転をリセット
      this.selectedDirection = 'up'; // 方向をリセット
      this.hoveredPosition = null;
    } 
    // 開発者モード（プレイヤーBが手動の場合）
    else {
      if (playerId === 'A' && !this.playerADecided) {
        this.selectedCardId = cardId;
        this.selectedCardIndex = handIndex;
        this.selectedPosition = null;
        this.selectedRotation = 0; // 回転をリセット
        this.hoveredPosition = null;
        // プレイヤーAのターンに切り替え（カード選択時）
        this.currentPlayer = 'A';
      } else if (playerId === 'B' && !this.playerBIsCPU) {
        // ダブルアクション中で1枚目のカードが決定済みの場合、2枚目のカードを選択できる
        const isDoubleActionB = this.gameManager.isDoubleActionActive('B');
        const remainingB = this.gameManager.getDoubleActionRemaining('B');
        if (isDoubleActionB && remainingB > 1 && this.doubleActionFirstCardSelected) {
          // 2枚目のカードを選択
          this.playerBSelectedCardId = cardId;
          this.playerBSelectedCardIndex = null;
          this.playerBSelectedPosition = null;
          this.playerBSelectedRotation = 0; // 回転をリセット
          this.playerBSelectedDirection = 'up'; // 方向をリセット
          this.hoveredPosition = null;
          this.currentPlayer = 'B';
        } else if (!this.playerBDecided) {
          this.playerBSelectedCardId = cardId;
          this.playerBSelectedCardIndex = null;
          this.playerBSelectedPosition = null;
          this.playerBSelectedRotation = 0; // 回転をリセット
          this.playerBSelectedDirection = 'up'; // 方向をリセット
          this.hoveredPosition = null;
          // プレイヤーBのターンに切り替え（カード選択時）
          this.currentPlayer = 'B';
        }
      }
    }

    this.updateUI();
  }

  private selectPosition(x: number, y: number, playerId: PlayerId): void {
    if (!this.gameManager) return;

    // スキップフラグをチェック
    if (playerId === 'A' && this.gameManager.isSkipNextTurn('A')) {
      // プレイヤーAがスキップしている場合は位置選択不可
      return;
    }
    if (playerId === 'B' && this.gameManager.isSkipNextTurn('B')) {
      // プレイヤーBがスキップしている場合は位置選択不可
      return;
    }

    // 選択されたカードを取得してcanPlay()をチェック
    let selectedCardId: string | null = null;
    if (playerId === 'A') {
      selectedCardId = this.selectedCardId;
    } else if (playerId === 'B') {
      // ダブルアクション中で1枚目のカードが決定済みの場合、2枚目のカードをチェック
      const isDoubleActionB = this.gameManager.isDoubleActionActive('B');
      const remainingB = this.gameManager.getDoubleActionRemaining('B');
      if (isDoubleActionB && remainingB > 1 && this.doubleActionFirstCardSelected) {
        selectedCardId = this.playerBSelectedCardId;
      } else {
        selectedCardId = this.playerBSelectedCardId;
      }
    }

    if (!selectedCardId) return;

    // カードを取得してcanPlay()をチェック
    const player = this.gameManager.getPlayer(playerId);
    const hand = player.getHand();
    const card = hand.find(c => c.getId() === selectedCardId);
    
    if (card && card.canPlay) {
      const board = this.gameManager.getBoard();
      const canPlayAtPosition = card.canPlay(board, { x, y }, playerId);
      if (!canPlayAtPosition) {
        // この位置には配置できない
        return;
      }
    }

    // C16などの回転可能カード、C17の方向切り替え可能カードの処理
    if (playerId === 'A') {
      if (!this.selectedCardId) return;
      this.selectedPosition = { x, y };
      this.hoveredPosition = null;
      this.playerADecide();
      return;
    }

    if (playerId === 'B' && !this.playerBIsCPU) {
      if (!this.playerBSelectedCardId) return;
      this.playerBSelectedPosition = { x, y };
      this.hoveredPosition = null;
      this.playerBDecide();
      return;
    }

    return;
  }

  private playerADecide(): void {
    if (!this.gameManager || this.playerADecided) return;
    if (!this.selectedCardId || !this.selectedPosition) return;

    // スキップフラグをチェック
    if (this.gameManager.isSkipNextTurn('A')) {
      // プレイヤーAがスキップしている場合は決定不可
      console.log(`[playerADecide] プレイヤーAがスキップ中なので、決定を拒否: ${this.selectedCardId}`);
      return;
    }

    // 選択されたカードを取得（最初に見つかったカード）
    const player = this.gameManager.getPlayer('A');
    const hand = player.getHand();
    const selectedCard = hand.find(c => c.getId() === this.selectedCardId) || null;
    
    if (!selectedCard) return;

    // ダブルアクション中は色カード（Color Cards）のみ選択可能（強化カードFxxは不可）
    if (this.gameManager.isDoubleActionActive('A')) {
      const cardIdForCheck = selectedCard.getId();
      // 色カードはCxx（Fxxは強化カードなので不可）
      if (!cardIdForCheck.startsWith('C')) {
        alert('ダブルアクション中は色カードのみ使用できます');
        return;
      }
    }

    // 選択をGameManagerに記録
    const selection: CardSelection = {
      cardId: this.selectedCardId as any,
      targetPosition: this.selectedPosition
    };
    
    // C16などの回転可能カードの場合、回転を設定
    if (selectedCard.getId() === 'C16') {
      selection.rotation = this.selectedRotation;
    }
    // C17の方向切り替え可能カードの場合、方向を設定
    if (selectedCard.getId() === 'C17') {
      selection.direction = this.selectedDirection;
    }

    if (!this.gameManager.selectCard('A', selection)) {
      // 選択失敗
      return;
    }

    this.playerADecided = true;
    
    // ダブルアクション中で、まだ残り回数がある場合は、2枚目のカードを選択できるようにする
    if (this.gameManager.isDoubleActionActive('A')) {
      const remaining = this.gameManager.getDoubleActionRemaining('A');
      if (remaining > 1) {
        // 1枚目のカードが選択されたことを記録
        this.doubleActionFirstCardSelected = true;
        this.doubleActionFirstSelection = selection; // 1枚目の選択を保存
        // 決定後は適用範囲を非表示しない（1枚目の適用範囲を表示し続ける）
        this.hoveredPosition = null;
        // UIを更新して、2枚目のカードを選択できることを示す
        this.updateUI();
        this.updateCardTargets(); // 1枚目の適用範囲を表示
        // 1枚目のカードを処理してremainingを減らすため、checkBothDecidedを呼ぶ
        // ただし、この時点ではCPUがまだ決定していない可能性があるため、
        // areBothPlayersReady()がtrueを返すかどうかはGameManager側で判断される
        this.checkBothDecided();
        // 2枚目のカードを選択できるように、選択状態をリセット
        this.selectedCardId = null;
        this.handCarouselCenterIndex = 0;
        this.selectedPosition = null;
        this.selectedRotation = 0; // 回転をリセット
        this.selectedDirection = 'up'; // 方向をリセット
        this.playerADecided = false;
        return;
      }
    }
    
    // 決定後は適用範囲を非表示
    this.hoveredPosition = null;
    this.updateCardTargets();
    
    this.updateUI();
    this.checkBothDecided();
  }

  // プレイヤーBが決定（手動の場合）
  private playerBDecide(): void {
    if (!this.gameManager || this.playerBDecided || this.playerBIsCPU) return;
    if (!this.playerBSelectedCardId || !this.playerBSelectedPosition) return;

    // スキップフラグをチェック
    if (this.gameManager.isSkipNextTurn('B')) {
      // プレイヤーBがスキップしている場合は決定不可
      return;
    }

    // 選択されたカードを取得（インデックスを使用）
    const player = this.gameManager.getPlayer('B');
    const hand = player.getHand();
    const cardsWithId = hand.filter(c => c.getId() === this.playerBSelectedCardId);
    const selectedCard = cardsWithId[this.playerBSelectedCardIndex || 0];
    
    if (!selectedCard) return;

    // ダブルアクション中は色カード（Color Cards）のみ選択可能（強化カードFxxは不可）
    if (this.gameManager.isDoubleActionActive('B')) {
      const cardIdForCheck = selectedCard.getId();
      // 色カードはCxx（Fxxは強化カードなので不可）
      if (!cardIdForCheck.startsWith('C')) {
        alert('ダブルアクション中は色カードのみ使用できます');
        return;
      }
    }

    // 選択をGameManagerに記録
    const selection: CardSelection = {
      cardId: this.playerBSelectedCardId as any,
      targetPosition: this.playerBSelectedPosition
    };
    
    // C16などの回転可能カードの場合、回転を設定
    if (selectedCard.getId() === 'C16') {
      selection.rotation = this.playerBSelectedRotation;
    }
    // C17の方向切り替え可能カードの場合、方向を設定
    if (selectedCard.getId() === 'C17') {
      selection.direction = this.playerBSelectedDirection;
    }

    if (!this.gameManager.selectCard('B', selection)) {
      // 選択失敗
      return;
    }

    this.playerBDecided = true;
    
    // ダブルアクション中で、まだ残り回数がある場合は、2枚目のカードを選択できるようにする
    if (this.gameManager.isDoubleActionActive('B')) {
      const remaining = this.gameManager.getDoubleActionRemaining('B');
      if (remaining > 1) {
        // 1枚目のカードが選択されたことを記録
        this.doubleActionFirstCardSelected = true;
        this.doubleActionFirstSelection = selection; // 1枚目の選択を保存
        // 決定後は適用範囲を非表示しない（1枚目の適用範囲を表示し続ける）
        this.hoveredPosition = null;
        // UIを更新して、2枚目のカードを選択できることを示す
        this.updateUI();
        this.updateCardTargets(); // 1枚目の適用範囲を表示
        // 1枚目のカードを処理してremainingを減らすため、checkBothDecidedを呼ぶ
        this.checkBothDecided();
        // 2枚目のカードを選択できるように、選択状態をリセット
        this.playerBSelectedCardId = null;
        this.playerBSelectedPosition = null;
        this.playerBSelectedRotation = 0; // 回転をリセット
        this.playerBSelectedDirection = 'up'; // 方向をリセット
        this.playerBDecided = false;
        return;
      }
    }
    
    // 決定後は適用範囲を非表示
    this.hoveredPosition = null;
    this.updateCardTargets();
    
    this.updateUI();
    this.checkBothDecided();
  }

  // 両方が決定したかチェック
  private checkBothDecided(): void {
    if (!this.gameManager) return;
    
    console.log(`[checkBothDecided] 呼ばれました: playerADecided=${this.playerADecided}, playerBDecided=${this.playerBDecided}`);
    
    // スキップフラグをチェックして、スキップしているプレイヤーを決定済みにする
    const skipA = this.gameManager.isSkipNextTurn('A');
    const skipB = this.gameManager.isSkipNextTurn('B');
    const currentTurn = this.gameManager.getCurrentTurn();
    
    console.log(`[checkBothDecided] ターン${currentTurn}: skipA=${skipA}, skipB=${skipB}`);
    
    if (skipA && !this.playerADecided) {
      // プレイヤーAがスキップの場合、自動的に決定済みにする
      this.playerADecided = true;
      // スキップしているプレイヤーのログを追加（重複を防ぐ）
      const currentTurn = this.gameManager.getCurrentTurn();
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`プレイヤーA: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`プレイヤーA: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
    }
    if (skipB && !this.playerBDecided) {
      // プレイヤーBがスキップの場合、自動的に決定済みにする
      this.playerBDecided = true;
      // スキップしているプレイヤーのログを追加（重複を防ぐ）
      const currentTurn = this.gameManager.getCurrentTurn();
      const playerBName = this.playerBIsCPU ? 'CPU' : 'プレイヤーB';
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`${playerBName}: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`${playerBName}: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
    }
    
    // ダブルアクション中の場合、2枚目のカードを決定した後も公開フェーズへ移行する必要がある
    const isDoubleActionA = this.gameManager.isDoubleActionActive('A');
    const isDoubleActionB = this.gameManager.isDoubleActionActive('B');
    const remainingA = this.gameManager.getDoubleActionRemaining('A');
    const remainingB = this.gameManager.getDoubleActionRemaining('B');
    
    // ダブルアクション中で1枚目のカードが選択されている場合の処理
    // この場合は、両方が決定済みでも公開フェーズへ移行しない（remaining > 1の場合）
    if (isDoubleActionA && this.doubleActionFirstSelection && remainingA > 1) {
      // 1枚目のカードを決定した直後は、resolveTurnを呼んでremainingを減らす
      // この時点では公開フェーズへ移行しない
      // プレイヤーAが先に決定した場合でも、プレイヤーBが決定するまで待つ
      if (this.playerADecided && !this.showingReveal) {
        // プレイヤーBも決定済みの場合のみresolveTurnを呼ぶ
        if (this.playerBDecided && this.gameManager.areBothPlayersReady()) {
          this.gameManager.resolveTurn();
          this.updateUI();
        }
        // プレイヤーBがまだ決定していない場合は、そのまま待つ
        return;
      }
      // プレイヤーAがまだ決定していない場合は、通常の処理を続ける
      return;
    }
    
    if (isDoubleActionB && this.doubleActionFirstSelection && remainingB > 1) {
      // 1枚目のカードを決定した直後は、resolveTurnを呼んでremainingを減らす
      // この時点では公開フェーズへ移行しない
      // プレイヤーBが先に決定した場合でも、プレイヤーAが決定するまで待つ
      if (this.playerBDecided && !this.showingReveal) {
        // プレイヤーAも決定済みの場合のみresolveTurnを呼ぶ
        if (this.playerADecided && this.gameManager.areBothPlayersReady()) {
          this.gameManager.resolveTurn();
          this.updateUI();
        }
        // プレイヤーAがまだ決定していない場合は、そのまま待つ
        return;
      }
      // プレイヤーBがまだ決定していない場合は、通常の処理を続ける
      return;
    }
    
    // 通常の場合（ダブルアクション中でない、または1枚目のカードが選択されていない場合）
    // または、ダブルアクション中で2枚目のカードを決定した後（remainingが1以下）
    if (this.playerADecided && this.playerBDecided && !this.showingReveal) {
      console.log(`[checkBothDecided] 両方が決定済み: playerADecided=${this.playerADecided}, playerBDecided=${this.playerBDecided}, skipA=${skipA}, skipB=${skipB}`);
      
      // 両方のプレイヤーがスキップしている場合は、公開フェーズをスキップして直接解決フェーズへ
      if (skipA && skipB) {
        console.log(`[checkBothDecided] 両方がスキップなので、直接resolvePhase()を呼ぶ`);
        setTimeout(() => {
          this.resolvePhase();
        }, 100);
        return;
      }
      
      // 片方だけがスキップしている場合も、公開フェーズをスキップして直接解決フェーズへ
      if (skipA || skipB) {
        console.log(`[checkBothDecided] 片方がスキップなので、直接resolvePhase()を呼ぶ (skipA=${skipA}, skipB=${skipB})`);
        setTimeout(() => {
          this.resolvePhase();
        }, 100);
        return;
      }
      
      // 2枚目のカードを決定した後（remainingが1以下）、または通常の場合
      // ダブルアクション中で2枚目のカードを決定した場合も公開フェーズへ移行
      if (isDoubleActionA && this.doubleActionFirstSelection && remainingA <= 1) {
        // 2枚目のカードを決定した後
        console.log(`[checkBothDecided] ダブルアクションA完了、showRevealPhase()を呼ぶ`);
        this.showRevealPhase();
        return;
      }
      
      if (isDoubleActionB && this.doubleActionFirstSelection && remainingB <= 1) {
        // 2枚目のカードを決定した後
        console.log(`[checkBothDecided] ダブルアクションB完了、showRevealPhase()を呼ぶ`);
        this.showRevealPhase();
        return;
      }
      
      // 通常の場合
      // 公開フェーズ
      console.log(`[checkBothDecided] 通常の場合、showRevealPhase()を呼ぶ`);
      this.showRevealPhase();
    }
  }

  // 公開フェーズ
  private showRevealPhase(): void {
    // 既に公開フェーズ中なら何もしない（重複防止）
    if (this.showingReveal) {
      return;
    }
    
    // スキップフラグがある場合は、公開フェーズをスキップして直接解決フェーズへ
    if (!this.gameManager) return;
    const skipA = this.gameManager.isSkipNextTurn('A');
    const skipB = this.gameManager.isSkipNextTurn('B');
    if (skipA || skipB) {
      console.log(`[showRevealPhase] スキップフラグがあるので、公開フェーズをスキップして直接resolvePhase()を呼ぶ`);
      setTimeout(() => {
        this.resolvePhase();
      }, 100);
      return;
    }
    
    this.showingReveal = true;
    
    // 操作ログに追加
    if (this.gameManager) {
      const currentTurn = this.gameManager.getCurrentTurn();
      const selectionA = this.gameManager.getSelection('A');
      const selectionB = this.gameManager.getSelection('B');
      
      // スキップフラグをチェック
      const skipA = this.gameManager.isSkipNextTurn('A');
      const skipB = this.gameManager.isSkipNextTurn('B');
      
      // ダブルアクション中の1枚目のカード選択を取得
      const firstSelectionA = this.gameManager.getDoubleActionFirstSelection('A');
      const firstSelectionB = this.gameManager.getDoubleActionFirstSelection('B');
      const isDoubleActionA = this.gameManager.isDoubleActionActive('A') || firstSelectionA !== null;
      const isDoubleActionB = this.gameManager.isDoubleActionActive('B') || firstSelectionB !== null;
      
      // ログの重複を防ぐため、既に同じターンのログが追加されているかチェック
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isHeaderAlreadyAdded = firstEntry?.classList.contains('log-header') && 
                                   firstEntry?.textContent?.includes(`ターン ${currentTurn}`);
      
      // スキップしていないプレイヤーの選択があればログに追加
      // スキップしているプレイヤーの選択はnullでもOK
      if ((selectionA || skipA) && (selectionB || skipB)) {
        const playerA = this.gameManager.getPlayer('A');
        const playerB = this.gameManager.getPlayer('B');
        const allCards = CardFactory.createAllCards();
        
        // ターンヘッダーを追加（重複を防ぐ）
        if (!isHeaderAlreadyAdded) {
          this.addTurnHeader(currentTurn);
        }
        
        const playerBName = this.playerBIsCPU ? 'CPU' : 'プレイヤーB';
        const playerAName = 'プレイヤーA';
        
        // プレイヤーBのログ（スキップしていない場合のみ）
        if (!skipB && selectionB) {
          if (isDoubleActionB && firstSelectionB) {
            // ダブルアクション中：1枚目と2枚目の両方をログに記録
            const firstCardB = allCards.find(c => c.getId() === firstSelectionB.cardId);
            const secondCardB = allCards.find(c => c.getId() === selectionB.cardId);
            if (firstCardB && secondCardB) {
              const pos1B = this.formatPosition(firstSelectionB.targetPosition.x, firstSelectionB.targetPosition.y);
              const pos2B = this.formatPosition(selectionB.targetPosition.x, selectionB.targetPosition.y);
              this.addActionLog(`${playerBName}: ${secondCardB.getName()} (${selectionB.cardId}) → マス ${pos2B}`);
              this.addActionLog(`${playerBName}: ${firstCardB.getName()} (${firstSelectionB.cardId}) → マス ${pos1B}`);
            }
          } else {
            // 通常の場合
            const cardB = allCards.find(c => c.getId() === selectionB.cardId);
            if (cardB) {
              const posB = this.formatPosition(selectionB.targetPosition.x, selectionB.targetPosition.y);
              this.addActionLog(`${playerBName}: ${cardB.getName()} (${selectionB.cardId}) → マス ${posB}`);
            }
          }
        }
        
        // プレイヤーAのログ（スキップしていない場合のみ）
        if (!skipA && selectionA) {
          if (isDoubleActionA && firstSelectionA) {
            // ダブルアクション中：1枚目と2枚目の両方をログに記録
            const firstCardA = allCards.find(c => c.getId() === firstSelectionA.cardId);
            const secondCardA = allCards.find(c => c.getId() === selectionA.cardId);
            if (firstCardA && secondCardA) {
              const pos1A = this.formatPosition(firstSelectionA.targetPosition.x, firstSelectionA.targetPosition.y);
              const pos2A = this.formatPosition(selectionA.targetPosition.x, selectionA.targetPosition.y);
              this.addActionLog(`${playerAName}: ${secondCardA.getName()} (${selectionA.cardId}) → マス ${pos2A}`);
              this.addActionLog(`${playerAName}: ${firstCardA.getName()} (${firstSelectionA.cardId}) → マス ${pos1A}`);
            }
          } else {
            // 通常の場合
            const cardA = allCards.find(c => c.getId() === selectionA.cardId);
            if (cardA) {
              const posA = this.formatPosition(selectionA.targetPosition.x, selectionA.targetPosition.y);
              this.addActionLog(`${playerAName}: ${cardA.getName()} (${selectionA.cardId}) → マス ${posA}`);
            }
          }
        }
      }
    }

    this.updateUI();

    // 2秒後に解決フェーズへ
    setTimeout(() => {
      this.resolvePhase();
    }, 2000);
  }

  // 解決フェーズ
  private resolvePhase(): void {
    if (!this.gameManager) return;
    
    const currentTurn = this.gameManager.getCurrentTurn();
    console.log(`[resolvePhase] 開始: ターン${currentTurn}, playerADecided=${this.playerADecided}, playerBDecided=${this.playerBDecided}`);
    
    // まず、現在のターンがスキップかどうかをチェック
    // 注意：これはターン開始時（resolveTurn()を呼ぶ前）のチェック
    // スキップフラグは前のターンの解決時に設定されるため、ここでチェックする
    const skipA = this.gameManager.isSkipNextTurn('A');
    const skipB = this.gameManager.isSkipNextTurn('B');
    
    console.log(`[resolvePhase] スキップフラグチェック: ターン${currentTurn}, skipA=${skipA}, skipB=${skipB}`);
    
    // スキップしているプレイヤーは自動的に「決定済み」として扱う
    // ただし、もう一方のプレイヤーは通常通りプレイできる
    if (skipA) {
      // プレイヤーAがスキップの場合、プレイヤーAを自動的に決定済みにする
      this.playerADecided = true;
      console.log(`[resolvePhase] プレイヤーAをスキップとして決定済みに設定: ターン${currentTurn}`);
      // スキップしているプレイヤーのログを追加
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`プレイヤーA: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`プレイヤーA: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
    }
    if (skipB) {
      // プレイヤーBがスキップの場合、プレイヤーBを自動的に決定済みにする
      this.playerBDecided = true;
      console.log(`[resolvePhase] プレイヤーBをスキップとして決定済みに設定: ターン${currentTurn}`);
      // スキップしているプレイヤーのログを追加
      const playerBName = this.playerBIsCPU ? 'CPU' : 'プレイヤーB';
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`${playerBName}: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`${playerBName}: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
    }
    
    // 両方ともスキップしている場合は、直接endTurn()を呼ぶ
    if (skipA && skipB) {
      // 両方ともスキップの場合（通常は発生しないが、念のため）
      this.gameManager.endTurn();
      
      // スキップフラグをリセット
      this.gameManager.resetSkipFlag('A');
      this.gameManager.resetSkipFlag('B');
      
      // 状態をリセット
      this.currentPlayer = 'A';
      this.selectedCardId = null;
      this.handCarouselCenterIndex = 0;
      this.selectedCardIndex = null;
      this.selectedPosition = null;
      this.selectedRotation = 0;
      this.selectedDirection = 'up';
      this.hoveredPosition = null;
      this.playerBSelectedCardId = null;
      this.playerBSelectedCardIndex = null;
      this.playerBSelectedPosition = null;
      this.playerBSelectedRotation = 0;
      this.playerBSelectedDirection = 'up';
      this.playerADecided = false;
      this.playerBDecided = false;
      this.showingReveal = false;
      this.doubleActionFirstCardSelected = false;
      this.doubleActionFirstSelection = null;
      
      this.updateUI();
      
      // 次のターンがスキップかどうかを確認して、再帰的に処理
      const nextSkipA = this.gameManager.isSkipNextTurn('A');
      const nextSkipB = this.gameManager.isSkipNextTurn('B');
      
      if (nextSkipA || nextSkipB) {
        setTimeout(() => {
          this.resolvePhase();
        }, 100);
      } else {
        if (this.playerBIsCPU) {
          this.startCPUSelection();
        }
      }
      return;
    }
    
    // 片方だけがスキップしている場合、もう一方のプレイヤーが選択を完了したらresolveTurn()を呼ぶ
    // これは通常の処理フローで処理される（checkBothDecided()で処理される）
    // ただし、スキップしているプレイヤーは既に決定済みなので、もう一方のプレイヤーが決定したら
    // 自動的にresolveTurn()が呼ばれる
    
    // 現在のターンがスキップかどうかをチェック
    // スキップしている場合は、通常の処理をスキップして、もう一方のプレイヤーの選択を待つ
    if (skipA || skipB) {
      // 既に両方のプレイヤーが「決定済み」の場合は、
      // ここで待たずにこのまま通常のresolveTurn()フローへ進む
      if (this.playerADecided && this.playerBDecided) {
        console.log(
          `[resolvePhase] スキップターンだが両方決定済みなのでresolveTurn()へ進む: skipA=${skipA}, skipB=${skipB}`
        );
        // スキップしていないプレイヤーの選択が前のターンのまま残っている可能性があるため、
        // 念のため確認（ただし、この時点で両方決定済みなので、選択は既に設定されているはず）
        // 何もせずこのまま下の通常処理へ
      } else {
        console.log(`[resolvePhase] スキップターンなので、通常の処理を一時停止: skipA=${skipA}, skipB=${skipB}`);
        // スキップしているプレイヤーは既に決定済みなので、もう一方のプレイヤーが決定するまで待つ
        // CPUの選択を開始（CPUモードの場合のみ）
        if (this.playerBIsCPU && !skipB) {
          // プレイヤーB（CPU）がスキップしていない場合、CPUの選択をリセットしてから開始
          // 前のターンの選択が残っている可能性があるため、リセットする
          this.playerBSelectedCardId = null;
          this.playerBSelectedCardIndex = null;
          this.playerBSelectedPosition = null;
          this.playerBSelectedRotation = 0;
          this.playerBDecided = false;
          // GameManagerの選択状態もリセット
          if (this.gameManager) {
            this.gameManager.clearSelection('B');
          }
          console.log(`[resolvePhase] CPUの選択をリセットして開始`);
          this.startCPUSelection();
        }
        // checkBothDecided()で処理される
        return;
      }
    }
    
    // 通常のターンの場合：resolveTurn()を呼ぶ（内部でendTurn()も呼ばれる）
    // ダブルアクション解除のログを記録するため、解決前の状態を確認
    const wasDoubleActionA = this.gameManager.isDoubleActionActive('A');
    const wasDoubleActionB = this.gameManager.isDoubleActionActive('B');
    const firstSelectionA = wasDoubleActionA ? this.gameManager.getDoubleActionFirstSelection('A') : null;
    const firstSelectionB = wasDoubleActionB ? this.gameManager.getDoubleActionFirstSelection('B') : null;
    const selectionA = this.gameManager.getSelection('A');
    const selectionB = this.gameManager.getSelection('B');

    // スキップターンで、スキップしていないプレイヤーのログを出力（showRevealPhase()が呼ばれていない場合）
    if ((skipA || skipB) && !this.showingReveal) {
      const currentTurn = this.gameManager.getCurrentTurn();
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isHeaderAlreadyAdded = firstEntry?.classList.contains('log-header') && 
                                   firstEntry?.textContent?.includes(`ターン ${currentTurn}`);
      
      if (!isHeaderAlreadyAdded) {
        this.addTurnHeader(currentTurn);
      }
      
      const playerBName = this.playerBIsCPU ? 'CPU' : 'プレイヤーB';
      const playerAName = 'プレイヤーA';
      const allCards = CardFactory.createAllCards();
      
      // スキップしていないプレイヤーのログを出力
      if (!skipB && selectionB) {
        const cardB = allCards.find(c => c.getId() === selectionB.cardId);
        if (cardB) {
          const posB = this.formatPosition(selectionB.targetPosition.x, selectionB.targetPosition.y);
          this.addActionLog(`${playerBName}: ${cardB.getName()} (${selectionB.cardId}) → マス ${posB}`);
        }
      }
      if (!skipA && selectionA) {
        const cardA = allCards.find(c => c.getId() === selectionA.cardId);
        if (cardA) {
          const posA = this.formatPosition(selectionA.targetPosition.x, selectionA.targetPosition.y);
          this.addActionLog(`${playerAName}: ${cardA.getName()} (${selectionA.cardId}) → マス ${posA}`);
        }
      }
    }

    // resolveTurn()の前に現在の状態を保存（アニメーション検出のため）
    if (this.gameManager) {
      const board = this.gameManager.getBoard();
      const size = board.getSize();
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const cell = board.getCell(x, y);
          if (cell) {
            const key = `${x},${y}`;
            this.previousStabilities.set(key, cell.stability);
          }
        }
      }
      console.log(`[Animation] 状態を保存しました（resolveTurn前）`);
    }

    this.gameManager.resolveTurn();
    
    // ダブルアクションが解除された場合のログ（2枚の色カードを選択したことを記録）
    // 注意：resolveTurn()内でendTurn()が呼ばれているので、既に次のターンに進んでいる
    if (wasDoubleActionA && !this.gameManager.isDoubleActionActive('A') && firstSelectionA && selectionA) {
      // ダブルアクション終了：2枚の色カードを選択したことをログに記録
      const allCards = CardFactory.createAllCards();
      const firstCardA = allCards.find(c => c.getId() === firstSelectionA.cardId);
      const secondCardA = allCards.find(c => c.getId() === selectionA.cardId);
      if (firstCardA && secondCardA) {
        const pos1A = this.formatPosition(firstSelectionA.targetPosition.x, firstSelectionA.targetPosition.y);
        const pos2A = this.formatPosition(selectionA.targetPosition.x, selectionA.targetPosition.y);
        this.addActionLog(`プレイヤーA: ダブルアクション完了 - ${firstCardA.getName()} (${firstSelectionA.cardId}) → マス ${pos1A}、${secondCardA.getName()} (${selectionA.cardId}) → マス ${pos2A}をプレイ。次ターンはスキップ`);
      }
    }
    if (wasDoubleActionB && !this.gameManager.isDoubleActionActive('B') && firstSelectionB && selectionB) {
      // ダブルアクション終了：2枚の色カードを選択したことをログに記録
      const allCards = CardFactory.createAllCards();
      const playerBName = this.playerBIsCPU ? 'CPU' : 'プレイヤーB';
      const firstCardB = allCards.find(c => c.getId() === firstSelectionB.cardId);
      const secondCardB = allCards.find(c => c.getId() === selectionB.cardId);
      if (firstCardB && secondCardB) {
        const pos1B = this.formatPosition(firstSelectionB.targetPosition.x, firstSelectionB.targetPosition.y);
        const pos2B = this.formatPosition(selectionB.targetPosition.x, selectionB.targetPosition.y);
        this.addActionLog(`${playerBName}: ダブルアクション完了 - ${firstCardB.getName()} (${firstSelectionB.cardId}) → マス ${pos1B}、${secondCardB.getName()} (${selectionB.cardId}) → マス ${pos2B}をプレイ。次ターンはスキップ`);
      }
    }
    
    // 状態をリセット
    this.currentPlayer = 'A';
    this.selectedCardId = null;
    this.handCarouselCenterIndex = 0;
    this.selectedCardIndex = null;
    this.selectedPosition = null;
    this.selectedRotation = 0;
    this.selectedDirection = 'up';
    this.hoveredPosition = null;
    this.playerBSelectedCardId = null;
    this.playerBSelectedCardIndex = null;
    this.playerBSelectedPosition = null;
    this.playerBSelectedRotation = 0;
    this.playerBSelectedDirection = 'up';
    this.playerADecided = false;  // リセット
    this.playerBDecided = false;  // リセット
    this.showingReveal = false;
    this.doubleActionFirstCardSelected = false;
    this.doubleActionFirstSelection = null;
    
    // GameManagerの選択状態も念のため確認してリセット
    if (this.gameManager) {
      const selectionA = this.gameManager.getSelection('A');
      const selectionB = this.gameManager.getSelection('B');
      if (selectionA !== null) {
        this.gameManager.clearSelection('A');
        console.log(`[resolvePhase] プレイヤーAの選択をリセット`);
      }
      if (selectionB !== null) {
        this.gameManager.clearSelection('B');
        console.log(`[resolvePhase] プレイヤーBの選択をリセット`);
      }
    }

    // スキップフラグをリセット（resolveTurn()が呼ばれた後）
    if (skipA) {
      this.gameManager.resetSkipFlag('A');
    }
    if (skipB) {
      this.gameManager.resetSkipFlag('B');
    }
    
    // 次のターンがスキップかどうかを確認（endTurn()が呼ばれた後なので、既に次のターンに進んでいる）
    const nextSkipA = this.gameManager.isSkipNextTurn('A');
    const nextSkipB = this.gameManager.isSkipNextTurn('B');
    const nextTurn = this.gameManager.getCurrentTurn();
    
    // デバッグ用ログ（開発時のみ）
    if (nextSkipA || nextSkipB) {
      console.log(`[resolvePhase] 次のターン${nextTurn}: nextSkipA=${nextSkipA}, nextSkipB=${nextSkipB}`);
    }
    
    // 次のターンがスキップの場合、スキップしているプレイヤーを決定済みにする
    // updateUI()を呼ぶ前に設定することで、プレイヤーがカードを選択できないようにする
    if (nextSkipA) {
      this.playerADecided = true;
      console.log(`[resolvePhase] ターン${nextTurn}: プレイヤーAをスキップとして決定済みに設定`);
    } else {
      this.playerADecided = false;
    }
    if (nextSkipB) {
      this.playerBDecided = true;
      console.log(`[resolvePhase] ターン${nextTurn}: プレイヤーBをスキップとして決定済みに設定`);
    } else {
      this.playerBDecided = false;
    }
    
    this.updateUI();
    
    // ゲーム終了チェック（startCPUSelection()を呼ぶ前にチェック）
    if (this.gameManager.getState() === 'finished') {
      this.showResult();
      return;
    }
    
    if (nextSkipA || nextSkipB) {
      // 次のターンがスキップの場合、再帰的に処理（スキップターンの処理を実行）
      setTimeout(() => {
        this.resolvePhase();
      }, 100);
    } else {
      // CPUの次の選択を開始（CPUモードの場合のみ）
      if (this.playerBIsCPU) {
        this.startCPUSelection();
      }
    }
  }

  private shuffleIntervalId: number | null = null;

  private showResult(): void {
    if (!this.gameManager) return;

    const result = this.gameManager.calculateScores();
    const modal = document.getElementById('result-modal');
    const content = document.getElementById('result-content');
    const actions = document.querySelector<HTMLElement>('#result-modal .result-actions');

    if (modal && content) {
      if (this.shuffleIntervalId !== null) {
        clearInterval(this.shuffleIntervalId);
        this.shuffleIntervalId = null;
      }

      const scoreDiff = Math.abs(result.playerAScore - result.playerBScore);
      const resultToneClass =
        result.winner === 'A' ? 'battle-result--win' :
        result.winner === 'B' ? 'battle-result--lose' :
        'battle-result--draw';
      const verdictText =
        result.winner === 'A' ? 'YOU WIN' :
        result.winner === 'B' ? 'CPU WINS' :
        'DRAW';
      const verdictSubText =
        result.winner === 'A' ? 'territory secured' :
        result.winner === 'B' ? 'cpu dominance confirmed' :
        'control remains contested';
      const diffText = scoreDiff === 0 ? 'NO GAP' : `${scoreDiff} PT GAP`;

      modal.classList.add('result-modal--battle');
      actions?.classList.remove('result-actions--visible');
      modal.classList.remove('hidden');
      content.innerHTML = `
        <div class="battle-result battle-result--counting">
          <div class="battle-result__scanner" aria-hidden="true"></div>
          <div class="battle-result__kicker">FINAL TALLY</div>
          <div class="battle-result__headline">SCORE SEALED</div>
          <div class="battle-result__subline">Calculating territory control...</div>
          <div class="battle-result__duel">
            <div class="battle-result__score-card battle-result__score-card--player">
              <span class="battle-result__name">YOU</span>
              <span class="battle-result__score" id="shuffling-score-a" data-score="${result.playerAScore}">--</span>
              <span class="battle-result__unit">PTS</span>
            </div>
            <div class="battle-result__versus">VS</div>
            <div class="battle-result__score-card battle-result__score-card--cpu">
              <span class="battle-result__name">CPU</span>
              <span class="battle-result__score" id="shuffling-score-b" data-score="${result.playerBScore}">--</span>
              <span class="battle-result__unit">PTS</span>
            </div>
          </div>
          <div class="battle-result__meter"><span></span></div>
        </div>
      `;

      this.shuffleScores(result.playerAScore, result.playerBScore);

      window.setTimeout(() => {
        if (this.shuffleIntervalId !== null) {
          clearInterval(this.shuffleIntervalId);
          this.shuffleIntervalId = null;
        }

        content.innerHTML = `
          <div class="battle-result battle-result--revealed ${resultToneClass}">
            <div class="battle-result__burst" aria-hidden="true"></div>
            <div class="battle-result__kicker">RESULT CONFIRMED</div>
            <div class="battle-result__verdict">${verdictText}</div>
            <div class="battle-result__subline">${verdictSubText}</div>
            <div class="battle-result__duel battle-result__duel--final">
              <div class="battle-result__score-card battle-result__score-card--player ${result.winner === 'A' ? 'is-winner' : ''}">
                <span class="battle-result__name">YOU</span>
                <span class="battle-result__score battle-result__score--final">${result.playerAScore}</span>
                <span class="battle-result__unit">PTS</span>
              </div>
              <div class="battle-result__versus battle-result__versus--final">${diffText}</div>
              <div class="battle-result__score-card battle-result__score-card--cpu ${result.winner === 'B' ? 'is-winner' : ''}">
                <span class="battle-result__name">CPU</span>
                <span class="battle-result__score battle-result__score--final">${result.playerBScore}</span>
                <span class="battle-result__unit">PTS</span>
              </div>
            </div>
          </div>
        `;
        actions?.classList.add('result-actions--visible');
      }, 2500);
      return;
    }

    if (modal && content) {
      // 既存のシャッフルをクリア
      if (this.shuffleIntervalId !== null) {
        clearInterval(this.shuffleIntervalId);
        this.shuffleIntervalId = null;
      }

      // モーダルを表示（最初からスコア表示部分を表示）
      modal.classList.remove('hidden');
      
      // 最初からスコア表示部分を表示（シャッフル中）
      content.innerHTML = `
        <div class="result-scores-shuffling">
          <div class="result-score-item">
            <span class="result-score-label">あなた:</span>
            <span class="result-score-value" id="shuffling-score-a" data-score="${result.playerAScore}">0</span>
            <span class="result-score-unit">点</span>
          </div>
          <div class="result-score-item">
            <span class="result-score-label">CPU:</span>
            <span class="result-score-value" id="shuffling-score-b" data-score="${result.playerBScore}">0</span>
            <span class="result-score-unit">点</span>
          </div>
        </div>
      `;

      // スコアをシャッフル表示（2.5秒間）
      this.shuffleScores(result.playerAScore, result.playerBScore);
        
      // 2.5秒後に結果を発表
      setTimeout(() => {
        // シャッフルを停止
        if (this.shuffleIntervalId !== null) {
          clearInterval(this.shuffleIntervalId);
          this.shuffleIntervalId = null;
        }

        // 結果を発表
        let winnerText = '';
        let winnerClass = '';
        if (result.winner === 'A') {
          winnerText = 'あなたの勝利！';
          winnerClass = 'result-winner-a';
        } else if (result.winner === 'B') {
          winnerText = 'CPUの勝利！';
          winnerClass = 'result-winner-b';
        } else {
          winnerText = '引き分け！';
          winnerClass = 'result-draw';
        }

        // 勝敗とスコアを表示
        content.innerHTML = `
          <div class="result-winner ${winnerClass}">${winnerText}</div>
          <div class="result-scores" style="margin-top: 30px;">
            <div class="result-score-item">
              <span class="result-score-label">あなた:</span>
              <span class="result-score-value" data-score="${result.playerAScore}">${result.playerAScore}</span>
              <span class="result-score-unit">点</span>
            </div>
            <div class="result-score-item">
              <span class="result-score-label">CPU:</span>
              <span class="result-score-value" data-score="${result.playerBScore}">${result.playerBScore}</span>
              <span class="result-score-unit">点</span>
            </div>
          </div>
        `;
      }, 2500);
    }
  }

  private shuffleScores(scoreA: number, scoreB: number): void {
    const scoreAElement = document.getElementById('shuffling-score-a');
    const scoreBElement = document.getElementById('shuffling-score-b');

    if (!scoreAElement || !scoreBElement) return;

    // スコアの範囲を推定（実際のスコアの±50%程度の範囲でランダム）
    const maxScore = Math.max(scoreA, scoreB);
    const minRange = Math.max(0, maxScore - Math.floor(maxScore * 0.5));
    const maxRange = maxScore + Math.floor(maxScore * 0.5);

    // シャッフル間隔（50msごとに更新）
    this.shuffleIntervalId = window.setInterval(() => {
      // ランダムなスコアを表示
      const randomA = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
      const randomB = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
      
      scoreAElement.textContent = randomA.toString();
      scoreBElement.textContent = randomB.toString();
    }, 50);
  }

}

type ScreenMode = 'battle' | 'puzzle' | 'tutorial';

type PuzzleLevelConfig = {
  level: number;
  boardSize: number;
  cardIds: CardId[];
  target: number[];
};

class ScreenFlow {
  private static readonly minBattleTurns = 4;
  private root: HTMLElement;
  private isTransitioning = false;
  private onStart: (mode: ScreenMode, settings?: GameStartSettings) => void;
  private readonly puzzleClearStorageKey = 'forcard:puzzle-cleared-levels';
  private readonly puzzleLevels: PuzzleLevelConfig[] = [
    { level: 1, boardSize: 3, cardIds: ['C01', 'C01', 'C01'], target: [0, 1, 0, 0, 1, 0, 0, 1, 0] },
    { level: 2, boardSize: 3, cardIds: ['C01', 'C01', 'C01'], target: [0, 0, 0, 1, 1, 1, 0, 0, 0] },
    { level: 3, boardSize: 3, cardIds: ['C01', 'C01', 'C01', 'C01'], target: [1, 0, 1, 0, 0, 0, 1, 0, 1] },
    { level: 4, boardSize: 3, cardIds: ['C01', 'C01', 'C01', 'C01', 'C01'], target: [0, 1, 0, 1, 1, 1, 0, 1, 0] },
    { level: 5, boardSize: 3, cardIds: ['C03'], target: [0, 0, 0, 1, 1, 1, 0, 0, 0] },
    { level: 6, boardSize: 3, cardIds: ['C14'], target: [0, 1, 0, 0, 1, 0, 0, 1, 0] },
    { level: 7, boardSize: 3, cardIds: ['C01', 'C03'], target: [1, 1, 1, 0, 1, 0, 0, 0, 0] },
    { level: 8, boardSize: 3, cardIds: ['C01', 'C14'], target: [1, 1, 0, 0, 1, 0, 0, 1, 0] },
    { level: 9, boardSize: 4, cardIds: ['C01', 'C01', 'C01', 'C01'], target: [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0] },
    { level: 10, boardSize: 4, cardIds: ['C15'], target: [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0] },
    { level: 11, boardSize: 4, cardIds: ['C03', 'C01'], target: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
    { level: 12, boardSize: 4, cardIds: ['C01', 'C01', 'C14'], target: [0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1] },
    { level: 13, boardSize: 4, cardIds: ['C03', 'C03'], target: [0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0] },
    { level: 14, boardSize: 4, cardIds: ['C14', 'C14'], target: [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0] },
    { level: 15, boardSize: 4, cardIds: ['C15', 'C15'], target: [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1] },
    { level: 16, boardSize: 4, cardIds: ['C01', 'C15', 'C03'], target: [1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1] },
    { level: 17, boardSize: 4, cardIds: ['C11', 'C01', 'C01'], target: [0, 1, 0, 0, 1, 2, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1] },
    { level: 18, boardSize: 4, cardIds: ['C12', 'C03', 'C01'], target: [1, 0, 1, 0, 0, 1, 0, 0, 2, 1, 2, 0, 0, 0, 0, 1] },
    { level: 19, boardSize: 4, cardIds: ['C13', 'C14'], target: [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0] },
    { level: 20, boardSize: 5, cardIds: ['C11', 'C12', 'C01', 'C01'], target: [1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 2, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1] },
    { level: 21, boardSize: 4, cardIds: ['C13', 'C14', 'F01'], target: [0, 1, 0, 0, 1, 4, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0] },
    { level: 22, boardSize: 4, cardIds: ['C15', 'F07'], target: [0, 0, 0, 0, 0, 3, 3, 0, 0, 3, 3, 0, 0, 0, 0, 0] },
    { level: 23, boardSize: 4, cardIds: ['C11', 'F05'], target: [0, 2, 0, 0, 2, 2, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0] },
    { level: 24, boardSize: 4, cardIds: ['C12', 'C14', 'F02'], target: [1, 0, 2, 0, 0, 2, 2, 0, 1, 0, 2, 0, 0, 0, 0, 0] },
    { level: 25, boardSize: 5, cardIds: ['C13', 'C14', 'F02'], target: [0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2, 3, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0] },
    { level: 26, boardSize: 5, cardIds: ['C15', 'C15', 'F07'], target: [0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 3, 3, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0] },
    { level: 27, boardSize: 5, cardIds: ['C11', 'C12', 'F05'], target: [0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 2, 3, 2, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0] },
    { level: 28, boardSize: 5, cardIds: ['C21', 'C14', 'F10'], target: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 3, 3, 4, 3, 3, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] },
    { level: 29, boardSize: 5, cardIds: ['C24', 'C11', 'F08', 'F05'], target: [0, 0, 0, 0, 0, 0, 2, 4, 2, 0, 0, 4, 4, 4, 0, 0, 2, 4, 2, 0, 0, 0, 0, 0, 0] },
    { level: 30, boardSize: 5, cardIds: ['C24', 'F08', 'C21', 'F10'], target: [0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 3, 5, 5, 5, 3, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0] }
  ];

  constructor(root: HTMLElement, onStart: (mode: ScreenMode, settings?: GameStartSettings) => void) {
    this.root = root;
    this.onStart = onStart;
  }

  showTitle(): void {
    this.root.innerHTML = `
      <div class="screen" data-screen="title">
        <div class="screen-inner">
          <div class="title-logo">For Card</div>
          <div class="title-sub">STRATEGY CARD GAME</div>
          <div class="press-any">press any button</div>
          <div class="hint-row">クリック / タップ / キー入力で進む</div>
        </div>
      </div>
    `;

    let titleInputCleaned = false;
    const cleanupTitleInput = () => {
      if (titleInputCleaned) return;
      titleInputCleaned = true;
      window.removeEventListener('keydown', onKeyDown);
      this.root.removeEventListener('pointerdown', onPointerDown);
    };

    const proceed = () => {
      if (this.isTransitioning) return;
      cleanupTitleInput();
      this.isTransitioning = true;
      const screen = this.root.querySelector('.screen') as HTMLElement | null;
      if (screen) screen.classList.add('screen-exit');
      window.setTimeout(() => {
        this.isTransitioning = false;
        this.showMenu();
      }, 520);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // 修飾キー単体は無視
      if (e.key === 'Shift' || e.key === 'Alt' || e.key === 'Control' || e.key === 'Meta') return;
      proceed();
    };

    const onPointerDown = () => proceed();

    window.addEventListener('keydown', onKeyDown);
    this.root.addEventListener('pointerdown', onPointerDown);
  }

  showMenu(): void {
    this.root.innerHTML = `
      <div class="screen" data-screen="menu">
        <div class="screen-inner">
          <div class="menu-title">MAIN MENU</div>
          <div class="menu-grid" role="menu" aria-label="メインメニュー">
            <button class="mode-card bg-battle" data-mode="battle" type="button">
              <div class="mode-chip">20 STAGES</div>
              <div class="mode-title">ストーリーモード</div>
              <div class="mode-desc">
                CPUと戦いながら全20ステージを攻略。<br/>
                少しずつカードや盤面が増え、CPUも賢くなる。
              </div>
            </button>

            <div class="menu-col">
              <button class="mode-card bg-puzzle" data-mode="puzzle" type="button">
                <div class="mode-chip">CUSTOM</div>
                <div class="mode-title">フリーモード</div>
                <div class="mode-desc">
                  CPUの強さ / 盤面 / ターン / 使用カードを<br/>
                  自由に選んで対戦できる。
                </div>
              </button>

              <button class="mode-card bg-tutorial" data-mode="tutorial" type="button">
                <div class="mode-chip">LEARN</div>
                <div class="mode-title">チュートリアル</div>
                <div class="mode-desc">
                  ルールを段階的に学ぶモード。<br/>
                  最後は 3×3 / 5ターン の試合でクリア！
                </div>
              </button>
            </div>
          </div>
          <div class="hint-row">Enter / クリックで開始（Tabでフォーカス移動）</div>
        </div>
      </div>
    `;

    const battleBtn = this.root.querySelector<HTMLButtonElement>('button[data-mode="battle"]');
    if (battleBtn) {
      battleBtn.innerHTML = `
        <div class="mode-chip">BATTLE</div>
        <div class="mode-title">バトル</div>
        <div class="mode-desc">
          CPUレベル、盤面、ターン、使用カードを設定して<br/>
          発光床の制御競技を開始します。
        </div>
      `;
    }
    const puzzleBtn = this.root.querySelector<HTMLButtonElement>('button[data-mode="puzzle"]');
    if (puzzleBtn) {
      puzzleBtn.innerHTML = `
        <div class="mode-chip">INSPECTION</div>
        <div class="mode-title">パズルモード</div>
        <div class="mode-desc">
          目標盤面と完全一致するように、制御端末を使って<br/>
          出荷前の点検作業を行います。
        </div>
      `;
    }

    const firstBtn = this.root.querySelector<HTMLButtonElement>('button[data-mode="battle"]');
    firstBtn?.focus();

    const onActivate = (mode: ScreenMode) => {
      if (this.isTransitioning) return;
      this.isTransitioning = true;
      const screen = this.root.querySelector('.screen') as HTMLElement | null;
      if (screen) screen.classList.add('screen-exit');
      window.setTimeout(() => {
        if (mode === 'battle') {
          this.isTransitioning = false;
          this.showBattleSetup();
          return;
        }
        if (mode === 'puzzle') {
          this.isTransitioning = false;
          this.showPuzzleLevelSelect();
          return;
        }
        this.root.innerHTML = '';
        this.onStart(mode);
      }, 520);
    };

    this.root.querySelectorAll<HTMLButtonElement>('button[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => onActivate(btn.dataset.mode as ScreenMode));
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate(btn.dataset.mode as ScreenMode);
        }
      });
    });
  }

  private showPuzzleLevelSelect(page = 0): void {
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(this.puzzleLevels.length / pageSize));
    let currentPage = Math.min(Math.max(page, 0), totalPages - 1);
    const buildLevelButtons = (pageIndex: number) => {
      const visibleLevels = this.puzzleLevels.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);
      return visibleLevels.map(level => `
              <button class="puzzle-level-card ${this.isPuzzleLevelCleared(level.level) ? 'is-cleared' : ''}" data-puzzle-level="${level.level}" type="button">
                ${this.isPuzzleLevelCleared(level.level) ? '<span class="puzzle-level-card__clear-mark" aria-hidden="true"></span>' : ''}
                <span class="puzzle-level-card__title">LEVEL ${level.level}</span>
              </button>
            `).join('');
    };
    this.root.innerHTML = `
      <div class="screen puzzle-level-screen" data-screen="puzzle-level-select">
        <div class="puzzle-bg" aria-hidden="true"></div>
        <div class="puzzle-level-select-panel">
          <div class="menu-title">PUZZLE MODE</div>
          <div class="puzzle-level-pager" aria-label="page navigation">
            <button class="setup-secondary puzzle-page-btn" id="puzzle-page-prev" type="button" ${currentPage === 0 ? 'disabled' : ''}>PREV</button>
            <div class="puzzle-page-label">PAGE ${currentPage + 1} / ${totalPages}</div>
            <button class="setup-secondary puzzle-page-btn" id="puzzle-page-next" type="button" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>NEXT</button>
          </div>
          <div class="puzzle-level-grid-viewport">
            <div class="puzzle-level-grid">
              ${buildLevelButtons(currentPage)}
            </div>
          </div>
          <div class="setup-actions">
            <button class="setup-secondary" id="puzzle-level-back" type="button">戻る</button>
          </div>
        </div>
      </div>
    `;

    const grid = this.root.querySelector<HTMLElement>('.puzzle-level-grid');
    const pageLabel = this.root.querySelector<HTMLElement>('.puzzle-page-label');
    const prevBtn = this.root.querySelector<HTMLButtonElement>('#puzzle-page-prev');
    const nextBtn = this.root.querySelector<HTMLButtonElement>('#puzzle-page-next');
    const bindLevelButtons = () => {
      this.root.querySelectorAll<HTMLButtonElement>('[data-puzzle-level]').forEach(btn => {
        btn.addEventListener('click', () => {
          const level = Number(btn.dataset.puzzleLevel || '1');
          this.showPuzzleLevel(level);
        });
      });
    };
    const updatePager = () => {
      if (pageLabel) pageLabel.textContent = `PAGE ${currentPage + 1} / ${totalPages}`;
      if (prevBtn) prevBtn.disabled = currentPage === 0;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;
    };
    const switchPage = (nextPage: number) => {
      if (!grid || nextPage < 0 || nextPage >= totalPages || nextPage === currentPage || grid.classList.contains('is-sliding')) return;
      const direction = nextPage > currentPage ? 'next' : 'prev';
      grid.classList.add('is-sliding', direction === 'next' ? 'slide-out-left' : 'slide-out-right');
      window.setTimeout(() => {
        currentPage = nextPage;
        grid.innerHTML = buildLevelButtons(currentPage);
        updatePager();
        bindLevelButtons();
        grid.classList.remove('slide-out-left', 'slide-out-right');
        grid.classList.add(direction === 'next' ? 'slide-in-right' : 'slide-in-left');
        window.setTimeout(() => {
          grid.classList.remove('is-sliding', 'slide-in-right', 'slide-in-left');
        }, 220);
      }, 220);
    };
    bindLevelButtons();
    this.root.querySelector<HTMLButtonElement>('#puzzle-level-back')?.addEventListener('click', () => this.showMenu());
    prevBtn?.addEventListener('click', () => switchPage(currentPage - 1));
    nextBtn?.addEventListener('click', () => switchPage(currentPage + 1));
  }

  private showPuzzleLevelOne(): void {
    this.showPuzzleLevel(1);
  }

  private getClearedPuzzleLevels(): Set<number> {
    try {
      const raw = window.localStorage.getItem(this.puzzleClearStorageKey);
      const levels = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(levels) ? levels.filter((level): level is number => Number.isInteger(level)) : []);
    } catch {
      return new Set();
    }
  }

  private isPuzzleLevelCleared(level: number): boolean {
    return this.getClearedPuzzleLevels().has(level);
  }

  private markPuzzleLevelCleared(level: number): void {
    try {
      const cleared = this.getClearedPuzzleLevels();
      cleared.add(level);
      window.localStorage.setItem(this.puzzleClearStorageKey, JSON.stringify([...cleared].sort((a, b) => a - b)));
    } catch {
      // localStorageが使えない環境では、クリア印の永続化だけ諦める。
    }
  }

  private showPuzzleLevel(levelNumber: number): void {
    const config = this.puzzleLevels.find(level => level.level === levelNumber) ?? this.puzzleLevels[0];
    const orderedCardIds = [...config.cardIds].sort((a, b) => {
      const order = (id: CardId) => id.startsWith('C') ? 0 : id.startsWith('F') ? 1 : 2;
      return order(a) - order(b);
    });
    const board = Array(config.boardSize * config.boardSize).fill(0) as number[];
    const used = orderedCardIds.map(() => false);
    let selectedCardIndex: number | null = 0;
    let pendingPositions: number[] = [];
    let applySelectedPuzzleCard = (originIndex: number) => {};
    const history: Array<{ board: number[]; used: boolean[]; selectedCardIndex: number | null }> = [];
    const cards = orderedCardIds
      .map(id => CardFactory.createCardById(id))
      .filter((card): card is Card => card !== null);
    if (cards.length !== orderedCardIds.length) return;

    const renderBoard = () => {
      const current = this.root.querySelector<HTMLElement>('#puzzle-current-grid');
      const cardsLeft = this.root.querySelector<HTMLElement>('#puzzle-cards-left');
      const turnState = this.root.querySelector<HTMLElement>('#puzzle-turn-state');
      const undoBtn = this.root.querySelector<HTMLButtonElement>('#puzzle-undo');
      if (current) current.innerHTML = this.buildPuzzleGrid(board, config.boardSize, true, pendingPositions);
      if (cardsLeft) cardsLeft.textContent = String(used.filter(v => !v).length);
      if (turnState) turnState.textContent = `${used.filter(Boolean).length} / ${orderedCardIds.length}`;
      if (undoBtn) undoBtn.disabled = history.length === 0;
      this.attachPuzzleCellHandlers(() => selectedCardIndex, value => {
        if (selectedCardIndex === null) return;
        applySelectedPuzzleCard(value);
      });
    };

    this.root.innerHTML = `
      <div class="screen puzzle-screen" data-screen="puzzle-level-1">
        <div class="puzzle-bg" aria-hidden="true"></div>
        <div class="puzzle-current-level">LEVEL ${config.level}</div>
        <div class="puzzle-topbar puzzle-topbar--battle">
          <button id="puzzle-reset" class="ctrl-btn ctrl-btn--retry" type="button" title="リセット" aria-label="リセット">
            <span class="ctrl-btn__icon ctrl-btn__icon--reload" aria-hidden="true"></span>
          </button>
          <button id="puzzle-undo" class="ctrl-btn ctrl-btn--undo" type="button" title="一手戻す" aria-label="一手戻す" disabled>
            <span class="ctrl-btn__icon ctrl-btn__icon--undo" aria-hidden="true"></span>
          </button>
          <button id="puzzle-back" class="ctrl-btn ctrl-btn--menu" type="button" title="レベル選択に戻る" aria-label="レベル選択に戻る">
            <span class="ctrl-btn__icon ctrl-btn__icon--power" aria-hidden="true"></span>
          </button>
        </div>

        <main class="puzzle-main">
          <section class="puzzle-board-panel puzzle-board-panel--current">
            <div class="puzzle-panel-label">OPERATE FLOOR</div>
            <div class="puzzle-grid puzzle-grid--current" id="puzzle-current-grid" style="--puzzle-board-size: ${config.boardSize};"></div>
          </section>
          <section class="puzzle-board-panel puzzle-board-panel--target">
            <div class="puzzle-panel-label">TARGET FLOOR</div>
            <div class="puzzle-grid puzzle-grid--target" style="--puzzle-board-size: ${config.boardSize};">
              ${this.buildPuzzleGrid(config.target, config.boardSize, false, [])}
            </div>
          </section>
        </main>

        <section class="puzzle-card-dock" aria-label="カード選択欄">
          <div class="puzzle-card-edge puzzle-card-edge--left" aria-hidden="true"></div>
          <div class="puzzle-card-edge puzzle-card-edge--right" aria-hidden="true"></div>
          <div class="puzzle-card-strip puzzle-card-strip--battle" id="puzzle-card-strip">
            ${cards.map((card, i) => this.buildPuzzleBattleCard(card, i)).join('')}
          </div>
        </section>
        <div class="puzzle-result-overlay hidden" id="puzzle-result-overlay" role="status" aria-live="polite"></div>
      </div>
    `;

    const selectCard = (index: number | null) => {
      selectedCardIndex = index;
      pendingPositions = [];
      updateHandState();
      renderBoard();
    };
    const updateHandState = () => {
      this.root.querySelectorAll<HTMLElement>('.puzzle-hand-card').forEach((el) => {
        const i = Number(el.dataset.cardIndex);
        el.classList.toggle('selected', selectedCardIndex === i && !used[i]);
        el.classList.toggle('used', used[i]);
      });
    };

    this.root.querySelectorAll<HTMLButtonElement>('.puzzle-hand-card').forEach((el) => {
      el.addEventListener('click', () => {
        const index = Number(el.dataset.cardIndex);
        if (used[index]) return;
        selectCard(index);
      });
    });
    this.root.querySelector<HTMLButtonElement>('#puzzle-back')?.addEventListener('click', () => this.showPuzzleLevelSelect(Math.floor((config.level - 1) / 10)));
    this.root.querySelector<HTMLButtonElement>('#puzzle-reset')?.addEventListener('click', () => this.showPuzzleLevel(config.level));
    this.root.querySelector<HTMLButtonElement>('#puzzle-undo')?.addEventListener('click', () => {
      const snapshot = history.pop();
      if (!snapshot) return;
      board.splice(0, board.length, ...snapshot.board);
      used.splice(0, used.length, ...snapshot.used);
      selectedCardIndex = snapshot.selectedCardIndex;
      pendingPositions = [];
      renderBoard();
      updateHandState();
    });
    applySelectedPuzzleCard = (originIndex: number) => {
      if (selectedCardIndex === null || used[selectedCardIndex]) return;
      const effects = this.getPuzzleCardEffects(board, config.boardSize, cards[selectedCardIndex].getId(), originIndex);
      pendingPositions = effects.map(effect => effect.index);
      if (effects.length === 0) return;
      history.push({ board: [...board], used: [...used], selectedCardIndex });
      for (const effect of effects) {
        board[effect.index] += effect.delta;
      }
      used[selectedCardIndex] = true;
      const next = used.findIndex(v => !v);
      selectedCardIndex = next >= 0 ? next : null;
      pendingPositions = [];
      renderBoard();
      updateHandState();
      if (used.every(Boolean)) {
        const success = board.every((v, i) => v === config.target[i]);
        if (success) this.markPuzzleLevelCleared(config.level);
        window.setTimeout(() => this.showPuzzleResult(config.level, success), 220);
      }
    };
    renderBoard();
    selectCard(selectedCardIndex);
    this.attachPuzzleCardAutoScroll();
  }

  private buildPuzzleGrid(values: number[], boardSize: number, interactive: boolean, pendingIndexes: number[]): string {
    const pendingSet = new Set(pendingIndexes);
    return values.map((value, index) => {
      const stateClass = value > 0
        ? ` player-a stability-${Math.min(value, 5)}`
        : value < 0
          ? ` player-b stability-${Math.min(Math.abs(value), 5)}`
          : ' neutral';
      const pendingClass = interactive && pendingSet.has(index) ? ' selected-target' : '';
      const attrs = interactive ? ` role="button" tabindex="0" data-cell-index="${index}"` : '';
      return `<div class="puzzle-cell cell${stateClass}${pendingClass}"${attrs}><span>${value}</span></div>`;
    }).join('');
  }

  private getPuzzleCardEffects(board: number[], boardSize: number, cardId: CardId, originIndex: number): Array<{ index: number; delta: number }> {
    const targetIndexes = this.getPuzzleCardTargetIndexes(boardSize, cardId, originIndex);
    const ownOnly = (indexes: number[]) => indexes.filter(index => board[index] > 0);

    if (cardId === 'F01') {
      return board[originIndex] > 0 ? [{ index: originIndex, delta: 2 }] : [];
    }
    if (cardId === 'F02' || cardId === 'F05' || cardId === 'F06') {
      return ownOnly(targetIndexes).map(index => ({ index, delta: 1 }));
    }
    if (cardId === 'F07') {
      return ownOnly(targetIndexes).map(index => ({ index, delta: 2 }));
    }
    if (cardId === 'F08') {
      return board
        .map((value, index) => value > 0 ? { index, delta: 1 } : null)
        .filter((effect): effect is { index: number; delta: number } => effect !== null);
    }
    if (cardId === 'F10' || cardId === 'F11') {
      return ownOnly(targetIndexes).map(index => ({ index, delta: 2 }));
    }

    return targetIndexes.map(index => ({ index, delta: 1 }));
  }

  private getPuzzleCardTargetIndexes(boardSize: number, cardId: CardId, originIndex: number): number[] {
    const x = originIndex % boardSize;
    const y = Math.floor(originIndex / boardSize);
    const positions: Array<{ x: number; y: number }> = [];
    const add = (px: number, py: number) => {
      if (px >= 0 && px < boardSize && py >= 0 && py < boardSize) {
        positions.push({ x: px, y: py });
      }
    };

    if (cardId === 'C03' || cardId === 'C13') {
      add(x - 1, y);
      add(x, y);
      add(x + 1, y);
    } else if (cardId === 'C21' || cardId === 'F10') {
      for (let px = 0; px < boardSize; px++) add(px, y);
    } else if (cardId === 'C22' || cardId === 'F11') {
      for (let py = 0; py < boardSize; py++) add(x, py);
    } else if (cardId === 'C11') {
      add(x, y);
      add(x, y - 1);
      add(x - 1, y);
      add(x + 1, y);
      add(x, y + 1);
    } else if (cardId === 'C12') {
      add(x, y);
      add(x - 1, y - 1);
      add(x + 1, y - 1);
      add(x - 1, y + 1);
      add(x + 1, y + 1);
    } else if (cardId === 'C14') {
      add(x, y - 1);
      add(x, y);
      add(x, y + 1);
    } else if (cardId === 'F02' || cardId === 'F05' || cardId === 'F06') {
      add(x, y);
      add(x, y - 1);
      add(x, y + 1);
      add(x - 1, y);
      add(x + 1, y);
    } else if (cardId === 'C15') {
      add(x, y);
      add(x + 1, y);
      add(x, y + 1);
      add(x + 1, y + 1);
    } else if (cardId === 'F07') {
      add(x, y);
      add(x + 1, y);
      add(x, y + 1);
      add(x + 1, y + 1);
    } else if (cardId === 'C24') {
      for (let py = y - 1; py <= y + 1; py++) {
        for (let px = x - 1; px <= x + 1; px++) {
          add(px, py);
        }
      }
    } else if (cardId === 'C16') {
      add(x, y);
      add(x + 1, y);
      add(x, y + 1);
    } else if (cardId === 'C18') {
      add(x, y);
      add(x, y - 1);
      add(x + 1, y);
    } else if (cardId === 'C19') {
      add(x, y);
      add(x - 1, y);
      add(x, y - 1);
    } else if (cardId === 'C20') {
      add(x, y);
      add(x, y + 1);
      add(x - 1, y);
    } else if (cardId === 'C17') {
      add(x, y);
      add(x - 1, y);
      add(x + 1, y);
      add(x, y - 1);
    } else if (cardId === 'C23') {
      add(x, y);
      add(x - 1, y);
      add(x + 1, y);
      add(x, y + 1);
    } else if (cardId === 'C25') {
      add(x, y);
      add(x, y - 1);
      add(x, y + 1);
      add(x - 1, y);
    } else if (cardId === 'C26') {
      add(x, y);
      add(x, y - 1);
      add(x, y + 1);
      add(x + 1, y);
    } else {
      add(x, y);
    }

    return [...new Set(positions.map(pos => pos.y * boardSize + pos.x))];
  }

  private buildPuzzleBattleCard(card: Card, index: number): string {
    const isFort = card.getId().startsWith('F');
    const kind = isFort ? 'fort' : 'color';
    const typeFill = isFort ? '#FF0004' : '#00E050';
    const typeLabel = isFort ? 'キョウカ' : 'イロ';
    const bodyContent = isFort
      ? `<p class="description-text">${card.getDescription()}</p>`
      : `<div class="color-card-pattern-wrap"><div class="color-card-pattern">${this.buildPuzzleColorPattern(card.getId())}</div></div>`;
    return `
      <button class="card card--${kind} puzzle-hand-card" type="button" data-card-index="${index}" title="${card.getName()} (${card.getId()})">
        <div class="card-visual">
          <div class="card-whole"><div class="card-whole-inner">${this.buildCardShellSvg(kind)}</div></div>
          <div class="horizontal-line"><div class="horizontal-line-inner"><svg class="line-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 654 3"><line stroke="black" stroke-width="3" x2="654" y1="1.5" y2="1.5" /></svg></div></div>
          <div class="card-type-frame"><div class="card-type-frame-inner"><svg class="card-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 221.422 76.8846"><path d="M193.673 1.5H2.92202L55.922 75.3846H219.922V28.5C215.607 10.7505 209.338 5.4729 193.673 1.5Z" fill="${typeFill}" stroke="black" stroke-width="3" /></svg></div></div>
          <p class="special-text"><span class="special-text-inner">${typeLabel}</span></p>
          <div class="card-header"><div class="card-header-inner"><svg class="card-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 484.935 77"><g><path d="M1.5 29.5V75.5H481.5H482L428.5 1.5H28.5C11.5316 7.60056 5.68163 13.7925 1.5 29.5Z" fill="#474747" /><path d="M481.5 75.5H482M482 75.5H1.5V29.5C5.68163 13.7925 11.5316 7.60056 28.5 1.5H428.5L482 75.5Z" stroke="black" stroke-width="3" /></g></svg></div></div>
          <div class="card-name"><p>${card.getName()}</p></div>
          ${this.buildPuzzleStars()}
          <div class="flavor-power-button"></div><div class="flavor-side-button-1"></div><div class="flavor-side-button-2"></div>
          <div class="vertical-line-container"><div class="vertical-line-rotated"><div class="vertical-line"><div class="vertical-line-inner"><svg class="line-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 77 6"><line stroke="black" stroke-width="6" x2="77" y1="3" y2="3" /></svg></div></div></div></div>
          <div class="card-description-box"></div>
          ${bodyContent}
        </div>
      </button>
    `;
  }

  private buildCardShellSvg(kind: 'color' | 'fort'): string {
    const color = kind === 'fort' ? '#FF3134' : '#1bbf4a';
    const gradId = `puzzle-card-grad-${Math.random().toString(36).slice(2)}`;
    return `<svg class="card-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 657.963 311"><path d="M623.963 3H34C16.8792 3 3 16.8792 3 34V277C3 294.121 16.8792 308 34 308H623.963C641.083 308 654.963 294.121 654.963 277V34C654.963 16.8792 641.083 3 623.963 3Z" fill="url(#${gradId})" stroke="black" stroke-width="6" /><defs><linearGradient gradientUnits="userSpaceOnUse" id="${gradId}" x1="60" x2="643" y1="380.5" y2="-53"><stop offset="0.719918" stop-color="#474747" /><stop offset="0.72034" stop-color="${color}" /></linearGradient></defs></svg>`;
  }

  private buildPuzzleStars(): string {
    return `
      <div class="star-container star-1"><div class="star-inner">${this.buildStarSvg(true)}</div></div>
      <div class="star-container star-3"><div class="star-inner">${this.buildStarSvg(false)}</div></div>
      <div class="star-container star-2"><div class="star-inner">${this.buildStarSvg(false)}</div></div>
    `;
  }

  private buildStarSvg(filled: boolean): string {
    return `<svg class="star-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 34.238 32.5623"><path d="M20.2089 12.7471L20.4335 13.4375H31.161L23.0702 19.3154L22.4823 19.7422L22.7069 20.4336L25.7968 29.9434L17.7069 24.0664L17.119 23.6396L16.5311 24.0664L8.44031 29.9434L11.5311 20.4336L11.7557 19.7422L11.1678 19.3154L3.07702 13.4375H13.8046L14.0292 12.7471L17.119 3.23633L20.2089 12.7471Z" stroke="#F1FF2C" stroke-width="2" fill="${filled ? '#F1FF2C' : '#474747'}" /></svg>`;
  }

  private buildPuzzleColorPattern(cardId: CardId): string {
    const patterns: Partial<Record<CardId, number[]>> = {
      C03: [11, 12, 13],
      C11: [7, 11, 12, 13, 17],
      C12: [6, 8, 12, 16, 18],
      C13: [11, 12, 13],
      C14: [7, 12, 17],
      C15: [12, 13, 17, 18],
      C16: [12, 13, 17],
      C17: [7, 11, 12, 13],
      C18: [7, 12, 13],
      C19: [7, 11, 12],
      C20: [11, 12, 17],
      C23: [11, 12, 13, 17],
      C25: [7, 11, 12, 17],
      C21: [10, 11, 12, 13, 14],
      C22: [2, 7, 12, 17, 22],
      C24: [6, 7, 8, 11, 12, 13, 16, 17, 18],
      C26: [7, 12, 13, 17],
      F01: [12],
      F02: [7, 11, 12, 13, 17],
      F05: [7, 11, 12, 13, 17],
      F07: [12, 13, 17, 18],
      F08: [6, 7, 8, 11, 12, 13, 16, 17, 18],
      F10: [10, 11, 12, 13, 14],
      F11: [2, 7, 12, 17, 22]
    };
    const lit = new Set<number>(patterns[cardId] ?? [12]);
    const cells = Array.from({ length: 25 }, (_, i) => {
      const x = 15 + (i % 5) * 14;
      const y = 15 + Math.floor(i / 5) * 14;
      const isCenter = lit.has(i);
      return `<rect x="${x}" y="${y}" width="13" height="13" fill="${isCenter ? '#3cff00' : '#0b0c0b'}" stroke="#3cff00" stroke-width="${isCenter ? '1.25' : '0.75'}" />`;
    }).join('');
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">${cells}</svg>`;
  }

  private attachPuzzleCellHandlers(
    getSelected: () => number | null,
    setPending: (value: number) => void
  ): void {
    this.root.querySelectorAll<HTMLElement>('#puzzle-current-grid .puzzle-cell').forEach((cell) => {
      const preview = () => {
        const selected = getSelected();
        if (selected === null) return;
        const index = Number(cell.dataset.cellIndex);
        setPending(index);
      };
      cell.addEventListener('click', preview);
      cell.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          preview();
        }
      });
    });
  }

  private showPuzzleResult(level: number, success: boolean): void {
    const overlay = this.root.querySelector<HTMLElement>('#puzzle-result-overlay');
    if (!overlay || !overlay.classList.contains('hidden')) return;
    const nextLevel = this.puzzleLevels.find(config => config.level === level + 1);
    const levelPage = Math.floor((level - 1) / 10);
    overlay.className = `puzzle-result-overlay puzzle-result-overlay--${success ? 'success' : 'failure'}`;
    overlay.innerHTML = `
      <div class="puzzle-result-panel">
        <div class="puzzle-result-title">${success ? 'INSPECTION COMPLETE' : 'INSPECTION FAILED'}</div>
        <div class="puzzle-result-main">${success ? '検査合格' : '検査不合格'}</div>
        <div class="puzzle-result-sub">${success ? '目標盤面と完全一致しました' : '提示盤面と一致していません'}</div>
        <div class="setup-actions">
          <button class="setup-secondary" id="puzzle-result-retry" type="button">リトライ</button>
          <button class="setup-secondary" id="puzzle-result-levels" type="button">レベル選択</button>
          ${success && nextLevel ? '<button class="setup-primary" id="puzzle-result-next" type="button">次のレベルへ</button>' : ''}
        </div>
      </div>
    `;
    this.root.querySelector<HTMLButtonElement>('#puzzle-result-retry')?.addEventListener('click', () => this.showPuzzleLevel(level));
    this.root.querySelector<HTMLButtonElement>('#puzzle-result-next')?.addEventListener('click', () => {
      if (nextLevel) this.showPuzzleLevel(nextLevel.level);
    });
    this.root.querySelector<HTMLButtonElement>('#puzzle-result-levels')?.addEventListener('click', () => this.showPuzzleLevelSelect(levelPage));
  }

  private attachPuzzleCardAutoScroll(): void {
    const strip = this.root.querySelector<HTMLElement>('#puzzle-card-strip');
    if (!strip) return;
    let scrollDir = 0;
    let raf = 0;
    const step = () => {
      if (scrollDir !== 0) {
        strip.scrollLeft += scrollDir * 10;
        raf = window.requestAnimationFrame(step);
      }
    };
    const stop = () => {
      scrollDir = 0;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };
    strip.addEventListener('mousemove', (ev) => {
      const rect = strip.getBoundingClientRect();
      const edge = Math.max(90, rect.width * 0.12);
      const nextDir = ev.clientX - rect.left < edge ? -1 : rect.right - ev.clientX < edge ? 1 : 0;
      if (nextDir === scrollDir) return;
      stop();
      scrollDir = nextDir;
      if (scrollDir !== 0) raf = window.requestAnimationFrame(step);
    });
    strip.addEventListener('mouseleave', stop);
  }

  private showBattleSetup(): void {
    const defaults = { boardSize: 5, totalTurns: 15, cpuDifficulty: 'normal' as const };
    const allCards = CardFactory.createAllCards();
    const sortedCards = [...allCards].sort((a, b) => {
      const idA = a.getId();
      const idB = b.getId();
      const cat = (id: string) => (id.startsWith('C') ? 1 : id.startsWith('F') ? 2 : id.startsWith('S') ? 3 : 4);
      const ca = cat(idA);
      const cb = cat(idB);
      if (ca !== cb) return ca - cb;
      const na = parseInt(idA.substring(1));
      const nb = parseInt(idB.substring(1));
      return na - nb;
    });

    const selected: string[] = [];

    this.root.innerHTML = `
      <div class="screen" data-screen="battle-setup">
        <div class="setup-panel">
          <div class="setup-title">FREE MODE</div>
          <div class="setup-sub">対戦条件をカスタマイズしてから開始します</div>

          <div class="setup-grid">
            <div class="setup-field">
              <div class="setup-label">CPU strength</div>
              <select id="battle-cpu">
                <option value="easy">Easy</option>
                <option value="normal" selected>Normal</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div class="setup-field">
              <div class="setup-label">Board size</div>
              <select id="battle-board">
                <option value="3">3×3</option>
                <option value="4">4×4</option>
                <option value="5" selected>5×5</option>
                <option value="6">6×6</option>
                <option value="7">7×7</option>
              </select>
            </div>
            <div class="setup-field">
              <div class="setup-label">Turns</div>
              <input id="battle-turns" type="number" min="${ScreenFlow.minBattleTurns}" max="30" value="15" />
            </div>

            <div class="setup-field setup-cards">
              <div class="setup-label">Cards (optional)</div>
              <div class="setup-row">
                <select id="battle-card-select">
                  <option value="">カードを選択（任意）</option>
                </select>
                <button class="setup-add-btn" id="battle-card-add" type="button">追加</button>
              </div>
              <div class="setup-selected" id="battle-selected"></div>
              <div class="setup-help">
                選択したカードが <b>ターン数より少ない</b> 場合は、足りない分をランダムで補完します。<br/>
                何も選ばなければ、すべてランダムデッキになります。
              </div>
            </div>
          </div>

          <div class="setup-actions">
            <button class="setup-secondary" id="battle-back" type="button">戻る</button>
            <button class="setup-primary" id="battle-start" type="button">この設定で開始</button>
          </div>
        </div>
      </div>
    `;

    const setupTitle = this.root.querySelector<HTMLElement>('.setup-title');
    if (setupTitle) setupTitle.textContent = 'BATTLE SETUP';
    const setupSub = this.root.querySelector<HTMLElement>('.setup-sub');
    if (setupSub) setupSub.textContent = '対戦条件を設定して発光床バトルを開始します';
    const cpuField = this.root.querySelector<HTMLElement>('.setup-field');
    if (cpuField) {
      cpuField.innerHTML = `
        <div class="setup-label">CPU level</div>
        <input id="battle-cpu-level" type="number" min="1" max="20" value="10" />
        <div class="setup-help">1: やさしい / 20: 最高難度</div>
      `;
    }
    const startBtn = this.root.querySelector<HTMLButtonElement>('#battle-start');
    if (startBtn) startBtn.textContent = 'バトル開始';

    const turnsInput = this.root.querySelector<HTMLInputElement>('#battle-turns')!;
    turnsInput.addEventListener('change', () => {
      const turns = parseInt(turnsInput.value || `${defaults.totalTurns}`, 10) || defaults.totalTurns;
      turnsInput.value = `${Math.max(ScreenFlow.minBattleTurns, Math.min(30, turns))}`;
    });

    const cardSelect = this.root.querySelector<HTMLSelectElement>('#battle-card-select')!;
    for (const card of sortedCards) {
      const opt = document.createElement('option');
      opt.value = card.getId();
      opt.textContent = `${card.getName()} (${card.getId()})`;
      cardSelect.appendChild(opt);
    }

    const selectedEl = this.root.querySelector<HTMLElement>('#battle-selected')!;
    const renderSelected = () => {
      if (selected.length === 0) {
        selectedEl.innerHTML = '<div class="setup-help">選択されたカードはありません</div>';
        return;
      }
      selectedEl.innerHTML = '';
      selected.forEach((id, idx) => {
        const row = document.createElement('div');
        row.className = 'setup-selected-item';
        row.innerHTML = `<span>${id}</span>`;
        const rm = document.createElement('button');
        rm.className = 'setup-remove-btn';
        rm.type = 'button';
        rm.textContent = '削除';
        rm.addEventListener('click', () => {
          selected.splice(idx, 1);
          renderSelected();
        });
        row.appendChild(rm);
        selectedEl.appendChild(row);
      });
    };
    renderSelected();

    const addBtn = this.root.querySelector<HTMLButtonElement>('#battle-card-add')!;
    addBtn.addEventListener('click', () => {
      if (!cardSelect.value) return;
      selected.push(cardSelect.value);
      cardSelect.value = '';
      renderSelected();
    });

    this.root.querySelector<HTMLButtonElement>('#battle-back')!.addEventListener('click', () => {
      this.showMenu();
    });

    this.root.querySelector<HTMLButtonElement>('#battle-start')!.addEventListener('click', () => {
      const cpuLevelInput = this.root.querySelector<HTMLInputElement>('#battle-cpu-level');
      const cpuLevel = Math.max(1, Math.min(20, parseInt(cpuLevelInput?.value || '10', 10) || 10));
      const cpuDifficulty = defaults.cpuDifficulty;
      const boardSize = parseInt(this.root.querySelector<HTMLSelectElement>('#battle-board')!.value || `${defaults.boardSize}`);
      const rawTotalTurns = parseInt(turnsInput.value || `${defaults.totalTurns}`, 10);
      const totalTurns = Math.max(ScreenFlow.minBattleTurns, Math.min(30, rawTotalTurns || defaults.totalTurns));

      const settings: GameStartSettings = {
        boardSize,
        totalTurns,
        cpuDifficulty,
        cpuLevel,
        playerBIsCPU: true,
        cardIds: selected.length > 0 ? [...selected] : null
      };

      if (this.isTransitioning) return;
      this.isTransitioning = true;
      const screen = this.root.querySelector('.screen') as HTMLElement | null;
      if (screen) screen.classList.add('screen-exit');
      window.setTimeout(() => {
        this.isTransitioning = false;
        this.root.innerHTML = '';
        this.onStart('battle', settings);
      }, 520);
    });
  }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
  // シミュレーターをグローバルに公開（開発者用）
  if (typeof window !== 'undefined') {
    (window as any).runSimulator = async () => {
      const { SimulatorRunner } = await import('./simulator/index.js');
      const runner = new SimulatorRunner();
      await runner.runAll();
    };
    
    (window as any).testCard = async (cardId: string) => {
      const { SimulatorRunner } = await import('./simulator/index.js');
      const runner = new SimulatorRunner();
      await runner.testSpecificCard(cardId);
    };
    
    console.log('開発者モード: ブラウザコンソールで以下を実行できます:');
    console.log('  - runSimulator() : すべてのカード効果を検証');
    console.log('  - testCard("S05") : 特定のカードを検証');
  }

  const app = document.getElementById('app');
  app?.classList.add('game-hidden');

  const screenRoot = document.getElementById('screen-root') ?? (() => {
    const el = document.createElement('div');
    el.id = 'screen-root';
    document.body.appendChild(el);
    return el;
  })();

  let gameUI: GameUI | null = null;
  const flow = new ScreenFlow(screenRoot, (mode, settings) => {
    const startSettings: GameStartSettings =
      mode === 'tutorial'
        ? { boardSize: 3, totalTurns: 5, playerBIsCPU: true, cpuDifficulty: 'easy', cpuLevel: 1 }
        : { playerBIsCPU: true, ...settings };

    app?.classList.remove('game-hidden');

    if (!gameUI) {
      gameUI = new GameUI({}, {
        onReturnToMenu: () => {
          app?.classList.add('game-hidden');
          flow.showMenu();
        }
      });
      if (typeof window !== 'undefined') {
        (window as any).gameUI = gameUI;
        (window as any).screenFlow = flow;
      }
    }

    gameUI.startNewGame(startSettings);
  });

  flow.showTitle();
});
