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
  } = {
    boardSize: 5,
    totalTurns: 15,
    cardIds: null,
    playerBIsCPU: true,
    cpuDifficulty: 'normal'
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
    this.cpuPlayer = new CPUPlayer(playerB, 'B', { difficulty: this.devSettings.cpuDifficulty });
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
    const resolveBtn = document.getElementById('resolve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const closeResultBtn = document.getElementById('close-result-btn');
    const mainMenuBtn = document.getElementById('main-menu-btn');
    const menuConfirmModal = document.getElementById('menu-confirm-modal');
    const menuConfirmOk = document.getElementById('menu-confirm-ok');
    const menuConfirmCancel = document.getElementById('menu-confirm-cancel');

    if (resolveBtn) {
      resolveBtn.addEventListener('click', () => this.onDecideButtonClick());
    }

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

    if (closeResultBtn) {
      closeResultBtn.addEventListener('click', () => {
        const modal = document.getElementById('result-modal');
        if (modal) {
          modal.classList.add('hidden');
        }
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
  }

  private toggleColorPointsDisplay(): void {
    this.showColorPoints = !this.showColorPoints;
    const toggleBtn = document.getElementById('toggle-color-points-btn');
    if (toggleBtn) {
      toggleBtn.textContent = `色ポイント: ${this.showColorPoints ? '表示' : '非表示'}`;
    }
    // 盤面を更新して表示/非表示を反映
    this.updateBoard();
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
    statusDiv.className = 'cpu-status';
    if (this.playerBDecided) {
      statusDiv.textContent = '✅ CPU決定済み';
      statusDiv.style.color = '#4caf50';
      statusDiv.style.fontWeight = 'bold';
    } else {
      statusDiv.textContent = '⏳ CPU選択中...';
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
        
      case 'C24': // 3×3ブロック塗り
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            pattern.push({ x: centerX + dx, y: centerY + dy });
          }
        }
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

  private renderHand(container: HTMLElement, playerId: PlayerId, isCPU: boolean = false): void {
    if (!this.gameManager) return;

    container.innerHTML = '';
    
    if (isCPU) {
      const player = this.gameManager.getPlayer(playerId);
      const remaining = player.getRemainingCardCount();
      const cpuInfo = document.createElement('div');
      cpuInfo.className = 'cpu-info';
      cpuInfo.textContent = `CPU (残りカード: ${remaining}枚)`;
      container.appendChild(cpuInfo);
      return;
    }

    const player = this.gameManager.getPlayer(playerId);
    let hand = player.getHand();
    const usedCards = player.getUsedCards();

    // ダブルアクション中で1枚目のカードが決定済みの場合、そのカードを手札に追加して表示
    // remaining >= 1 の時（1枚目を決定した後、2枚目を決定するまで）は1枚目のカードを表示し続ける
    const isDoubleActionActive = this.gameManager.isDoubleActionActive(playerId);
    const remaining = this.gameManager.getDoubleActionRemaining(playerId);
    if (isDoubleActionActive && remaining >= 1 && this.doubleActionFirstSelection) {
      const firstCardId = this.doubleActionFirstSelection.cardId;
      // 1枚目のカードがusedCardsに含まれている場合（手札から除外されている場合）、手札に追加
      if (usedCards.has(firstCardId)) {
        const firstCard = player.getCardById(firstCardId);
        if (firstCard && !hand.find(c => c.getId() === firstCardId)) {
          // 手札に1枚目のカードを追加
          hand = [...hand, firstCard];
        }
      }
    }

    // 手札をソート：色カード → 強化カード → 特殊カードの順、それぞれ番号順
    const sortedHand = [...hand].sort((a, b) => {
      const idA = a.getId();
      const idB = b.getId();
      
      // カードの種類を判定
      const getCardCategory = (id: string): number => {
        if (id.startsWith('S')) return 3; // 特殊カード
        if (id.startsWith('F')) return 2; // 強化カード（Fxx）
        if (id.startsWith('C')) return 1; // 色カード（Cxx）
        return 4; // その他
      };
      
      const categoryA = getCardCategory(idA);
      const categoryB = getCardCategory(idB);
      
      // カテゴリで比較
      if (categoryA !== categoryB) {
        return categoryA - categoryB;
      }
      
      // 同じカテゴリなら番号で比較
      const numA = parseInt(idA.substring(1));
      const numB = parseInt(idB.substring(1));
      return numA - numB;
    });

    sortedHand.forEach(card => {
      const cardElement = document.createElement('div');
      cardElement.className = 'card';
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

      // ダブルアクション中は特殊カードと強化カードを選択不可
      const isDoubleActionActive = this.gameManager ? this.gameManager.isDoubleActionActive(playerId) : false;
      const remaining = this.gameManager ? this.gameManager.getDoubleActionRemaining(playerId) : 0;
      const isSpecialCard = card.getType() === 'special';
      // 強化カードかどうかを判定（Fxxで始まるID）
      const cardIdForCheck = card.getId();
      const isFortCard = cardIdForCheck.startsWith('F');
      if (isSpecialCard) {
        cardElement.classList.add('is-special');
      }
      if (isFortCard) {
        cardElement.classList.add('is-fort');
      }
      
      // スキップフラグをチェック
      const isSkipped = this.gameManager ? this.gameManager.isSkipNextTurn(playerId) : false;
      
      // 1枚目で選択したカードを選択不可にする（表示はされる）
      // remaining >= 1 の時（1枚目を決定した後、2枚目を決定するまで）は1枚目のカードを選択不可にする
      let isFirstCardUsed = false;
      if (isDoubleActionActive && remaining >= 1 && this.doubleActionFirstSelection) {
        if (playerId === 'A' && this.doubleActionFirstSelection.cardId === card.getId()) {
          isFirstCardUsed = true;
        } else if (playerId === 'B' && this.doubleActionFirstSelection.cardId === card.getId()) {
          isFirstCardUsed = true;
        }
      }
      
      const isDisabled = isSkipped || (isDoubleActionActive && (isSpecialCard || isFortCard)) || isFirstCardUsed;
      
      if (isDisabled) {
        cardElement.classList.add('disabled');
      }

      // クリックイベント
      // プレイヤーAのみ操作可能
      if (playerId === 'A' && this.currentPlayer === playerId && !usedCards.has(card.getId()) && !isDisabled) {
        cardElement.addEventListener('click', () => this.selectCard(card.getId(), playerId));
      }

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
      gameState.textContent = stateText;
    }

    // ダブルアクション状態を更新
    this.updatePlayerStatus();
  }

  private clearActionLog(): void {
    const actionLog = document.getElementById('action-log');
    if (actionLog) {
      actionLog.innerHTML = '';
    }
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

    const remainingTurns = this.gameManager.getRemainingTurns();
    const scoreA = document.getElementById('score-a');
    const scoreB = document.getElementById('score-b');
    const scoreASection = scoreA?.parentElement; // .score要素
    const scoreBSection = scoreB?.parentElement; // .score要素

    // 残りターンが4以下になったらスコアを非表示
    if (remainingTurns <= 4) {
      if (scoreASection) {
        scoreASection.style.display = 'none';
      }
      if (scoreBSection) {
        scoreBSection.style.display = 'none';
      }
    } else {
      // 残りターンが5以上なら表示
      if (scoreASection) {
        scoreASection.style.display = '';
      }
      if (scoreBSection) {
        scoreBSection.style.display = '';
      }
      
      // スコアを更新
      if (scoreA) {
        const score = this.gameManager.calculateScores().playerAScore;
        scoreA.textContent = score.toString();
      }
      if (scoreB) {
        const score = this.gameManager.calculateScores().playerBScore;
        scoreB.textContent = score.toString();
      }
    }
  }

  private updateControls(): void {
    if (!this.gameManager) return;

    const resolveBtn = document.getElementById('resolve-btn') as HTMLButtonElement;
    if (resolveBtn) {
      const state = this.gameManager.getState();
      const activePlayer = this.currentPlayer;
      const isDoubleActionA = this.gameManager.isDoubleActionActive('A');
      const remainingA = this.gameManager.getDoubleActionRemaining('A');
      
      let canResolve = false;
      // プレイヤーAのみ
      const playerAReady = this.selectedCardId !== null && this.selectedPosition !== null;
      canResolve = activePlayer === 'A' && playerAReady && state === 'selecting' && !this.playerADecided;
      
      // ダブルアクション中で1枚目のカードが未決定の場合、「次のカードを選択する」に変更
      if (isDoubleActionA && remainingA > 1 && !this.doubleActionFirstCardSelected) {
        resolveBtn.textContent = '次のカードを選択する';
      } else {
        resolveBtn.textContent = '決定';
      }
      
      resolveBtn.disabled = !canResolve || this.gameManager.areBothPlayersReady();
    }

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

  private selectCard(cardId: string, playerId: PlayerId): void {
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
      this.selectedCardIndex = null; // 通常モードではインデックス不要
      this.selectedPosition = null;
      this.selectedRotation = 0; // 回転をリセット
      this.selectedDirection = 'up'; // 方向をリセット
      this.hoveredPosition = null;
    } 
    // 開発者モード（プレイヤーBが手動の場合）
    else {
      if (playerId === 'A' && !this.playerADecided) {
        this.selectedCardId = cardId;
        this.selectedCardIndex = null;
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
    const isRotatableCard = selectedCardId === 'C16';
    const isDirectionCard = selectedCardId === 'C17';
    
    // 通常モード：プレイヤーAのみ
    if (this.devSettings.playerBIsCPU) {
      if (playerId !== 'A' || !this.selectedCardId) return;
      
      // 同じ位置がクリックされた場合
      if (this.selectedPosition && this.selectedPosition.x === x && this.selectedPosition.y === y) {
        if (isRotatableCard) {
          // C16: 回転を進める
          this.selectedRotation = (this.selectedRotation + 1) % 4;
          console.log(`[selectPosition] C16回転: ${this.selectedRotation * 90}度`);
        } else if (isDirectionCard) {
          // C17: 方向を切り替える
          this.selectedDirection = this.selectedDirection === 'up' ? 'down' : 'up';
          console.log(`[selectPosition] C17方向切り替え: ${this.selectedDirection === 'up' ? '上向き' : '下向き'}`);
        }
      } else {
        // 位置が変わった場合はリセット
        this.selectedPosition = { x, y };
        if (isRotatableCard) {
          this.selectedRotation = 0;
        } else if (isDirectionCard) {
          this.selectedDirection = 'up';
        }
      }
      
      this.hoveredPosition = null;
      this.updateCardTargets();
      this.updateUI();
    }
    // 開発者モード（プレイヤーBが手動の場合）
    else {
      if (playerId === 'A') {
        if (!this.selectedCardId) return;
        
        // 同じ位置がクリックされた場合
        if (this.selectedPosition && this.selectedPosition.x === x && this.selectedPosition.y === y) {
          if (isRotatableCard) {
            // C16: 回転を進める
            this.selectedRotation = (this.selectedRotation + 1) % 4;
            console.log(`[selectPosition] C16回転: ${this.selectedRotation * 90}度`);
          } else if (isDirectionCard) {
            // C17: 方向を切り替える
            this.selectedDirection = this.selectedDirection === 'up' ? 'down' : 'up';
            console.log(`[selectPosition] C17方向切り替え: ${this.selectedDirection === 'up' ? '上向き' : '下向き'}`);
          }
        } else {
          // 位置が変わった場合はリセット
          this.selectedPosition = { x, y };
          if (isRotatableCard) {
            this.selectedRotation = 0;
          } else if (isDirectionCard) {
            this.selectedDirection = 'up';
          }
        }
        
        this.hoveredPosition = null;
        this.updateCardTargets();
        this.updateUI();
      } else if (playerId === 'B' && !this.playerBIsCPU) {
        // ダブルアクション中で1枚目のカードが決定済みの場合、2枚目のカードの位置を選択できる
        const isDoubleActionB = this.gameManager.isDoubleActionActive('B');
        const remainingB = this.gameManager.getDoubleActionRemaining('B');
        if (isDoubleActionB && remainingB > 1 && this.doubleActionFirstCardSelected) {
          // 2枚目のカードの位置を選択
          if (!this.playerBSelectedCardId) return;
          
          // 同じ位置がクリックされた場合
          if (this.playerBSelectedPosition && this.playerBSelectedPosition.x === x && this.playerBSelectedPosition.y === y) {
            if (isRotatableCard) {
              // C16: 回転を進める
              this.playerBSelectedRotation = (this.playerBSelectedRotation + 1) % 4;
              console.log(`[selectPosition] C16回転（プレイヤーB）: ${this.playerBSelectedRotation * 90}度`);
            } else if (isDirectionCard) {
              // C17: 方向を切り替える
              this.playerBSelectedDirection = this.playerBSelectedDirection === 'up' ? 'down' : 'up';
              console.log(`[selectPosition] C17方向切り替え（プレイヤーB）: ${this.playerBSelectedDirection === 'up' ? '上向き' : '下向き'}`);
            }
          } else {
            // 位置が変わった場合はリセット
            this.playerBSelectedPosition = { x, y };
            if (isRotatableCard) {
              this.playerBSelectedRotation = 0;
            } else if (isDirectionCard) {
              this.playerBSelectedDirection = 'up';
            }
          }
          
          this.hoveredPosition = null;
          this.updateCardTargets();
          this.updateUI();
        } else if (!this.playerBSelectedCardId) {
          return;
        } else {
          // 同じ位置がクリックされた場合
          if (this.playerBSelectedPosition && this.playerBSelectedPosition.x === x && this.playerBSelectedPosition.y === y) {
            if (isRotatableCard) {
              // C16: 回転を進める
              this.playerBSelectedRotation = (this.playerBSelectedRotation + 1) % 4;
              console.log(`[selectPosition] C16回転（プレイヤーB）: ${this.playerBSelectedRotation * 90}度`);
            } else if (isDirectionCard) {
              // C17: 方向を切り替える
              this.playerBSelectedDirection = this.playerBSelectedDirection === 'up' ? 'down' : 'up';
              console.log(`[selectPosition] C17方向切り替え（プレイヤーB）: ${this.playerBSelectedDirection === 'up' ? '上向き' : '下向き'}`);
            }
          } else {
            // 位置が変わった場合はリセット
            this.playerBSelectedPosition = { x, y };
            if (isRotatableCard) {
              this.playerBSelectedRotation = 0;
            } else if (isDirectionCard) {
              this.playerBSelectedDirection = 'up';
            }
          }
          
          this.hoveredPosition = null;
          this.updateCardTargets();
          this.updateUI();
        }
      }
    }
  }

  // プレイヤーAが決定
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

  // 決定ボタンの処理
  private onDecideButtonClick(): void {
    const activePlayer = this.currentPlayer;
    if (activePlayer === 'A') {
      this.playerADecide();
    } else if (activePlayer === 'B' && !this.playerBIsCPU) {
      this.playerBDecide();
    }
  }

  private shuffleIntervalId: number | null = null;

  private showResult(): void {
    if (!this.gameManager) return;

    const result = this.gameManager.calculateScores();
    const modal = document.getElementById('result-modal');
    const content = document.getElementById('result-content');

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

type ScreenMode = 'story' | 'free' | 'tutorial';

class ScreenFlow {
  private root: HTMLElement;
  private isTransitioning = false;
  private onStart: (mode: ScreenMode, settings?: GameStartSettings) => void;

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

    const proceed = () => {
      if (this.isTransitioning) return;
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

    window.addEventListener('keydown', onKeyDown, { once: true });
    this.root.addEventListener('pointerdown', onPointerDown, { once: true });
  }

  showMenu(): void {
    this.root.innerHTML = `
      <div class="screen" data-screen="menu">
        <div class="screen-inner">
          <div class="menu-title">MAIN MENU</div>
          <div class="menu-grid" role="menu" aria-label="メインメニュー">
            <button class="mode-card bg-story" data-mode="story" type="button">
              <div class="mode-chip">20 STAGES</div>
              <div class="mode-title">ストーリーモード</div>
              <div class="mode-desc">
                CPUと戦いながら全20ステージを攻略。<br/>
                少しずつカードや盤面が増え、CPUも賢くなる。
              </div>
            </button>

            <div class="menu-col">
              <button class="mode-card bg-free" data-mode="free" type="button">
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

    const firstBtn = this.root.querySelector<HTMLButtonElement>('button[data-mode="story"]');
    firstBtn?.focus();

    const onActivate = (mode: ScreenMode) => {
      if (this.isTransitioning) return;
      this.isTransitioning = true;
      const screen = this.root.querySelector('.screen') as HTMLElement | null;
      if (screen) screen.classList.add('screen-exit');
      window.setTimeout(() => {
        if (mode === 'free') {
          this.isTransitioning = false;
          this.showFreeSetup();
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

  private showFreeSetup(): void {
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
      <div class="screen" data-screen="free-setup">
        <div class="setup-panel">
          <div class="setup-title">FREE MODE</div>
          <div class="setup-sub">対戦条件をカスタマイズしてから開始します</div>

          <div class="setup-grid">
            <div class="setup-field">
              <div class="setup-label">CPU strength</div>
              <select id="free-cpu">
                <option value="easy">Easy</option>
                <option value="normal" selected>Normal</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div class="setup-field">
              <div class="setup-label">Board size</div>
              <select id="free-board">
                <option value="3">3×3</option>
                <option value="4">4×4</option>
                <option value="5" selected>5×5</option>
                <option value="6">6×6</option>
                <option value="7">7×7</option>
              </select>
            </div>
            <div class="setup-field">
              <div class="setup-label">Turns</div>
              <input id="free-turns" type="number" min="1" max="30" value="15" />
            </div>

            <div class="setup-field setup-cards">
              <div class="setup-label">Cards (optional)</div>
              <div class="setup-row">
                <select id="free-card-select">
                  <option value="">カードを選択（任意）</option>
                </select>
                <button class="setup-add-btn" id="free-card-add" type="button">追加</button>
              </div>
              <div class="setup-selected" id="free-selected"></div>
              <div class="setup-help">
                選択したカードが <b>ターン数より少ない</b> 場合は、足りない分をランダムで補完します。<br/>
                何も選ばなければ、すべてランダムデッキになります。
              </div>
            </div>
          </div>

          <div class="setup-actions">
            <button class="setup-secondary" id="free-back" type="button">戻る</button>
            <button class="setup-primary" id="free-start" type="button">この設定で開始</button>
          </div>
        </div>
      </div>
    `;

    const cardSelect = this.root.querySelector<HTMLSelectElement>('#free-card-select')!;
    for (const card of sortedCards) {
      const opt = document.createElement('option');
      opt.value = card.getId();
      opt.textContent = `${card.getName()} (${card.getId()})`;
      cardSelect.appendChild(opt);
    }

    const selectedEl = this.root.querySelector<HTMLElement>('#free-selected')!;
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

    const addBtn = this.root.querySelector<HTMLButtonElement>('#free-card-add')!;
    addBtn.addEventListener('click', () => {
      if (!cardSelect.value) return;
      selected.push(cardSelect.value);
      cardSelect.value = '';
      renderSelected();
    });

    this.root.querySelector<HTMLButtonElement>('#free-back')!.addEventListener('click', () => {
      this.showMenu();
    });

    this.root.querySelector<HTMLButtonElement>('#free-start')!.addEventListener('click', () => {
      const cpuDifficulty = (this.root.querySelector<HTMLSelectElement>('#free-cpu')!.value || defaults.cpuDifficulty) as
        | 'easy'
        | 'normal'
        | 'hard';
      const boardSize = parseInt(this.root.querySelector<HTMLSelectElement>('#free-board')!.value || `${defaults.boardSize}`);
      const totalTurns = parseInt((this.root.querySelector<HTMLInputElement>('#free-turns')!.value || `${defaults.totalTurns}`));

      const settings: GameStartSettings = {
        boardSize,
        totalTurns,
        cpuDifficulty,
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
        this.onStart('free', settings);
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
        ? { boardSize: 3, totalTurns: 5, playerBIsCPU: true, cpuDifficulty: 'easy' }
        : mode === 'story'
          ? { playerBIsCPU: true, cpuDifficulty: 'normal' }
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
