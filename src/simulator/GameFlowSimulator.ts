/**
 * ゲームフローシミュレーター
 * ゲーム全体の流れ（ターン進行、スコア計算など）を検証
 */

import { GameManager } from '../GameManager.js';
import { Player } from '../Player.js';
import { CardSelection, PlayerId } from '../types.js';
import { CardFactory } from '../CardFactory.js';

export interface GameFlowTestResult {
  testName: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export class GameFlowSimulator {
  private results: GameFlowTestResult[] = [];

  /**
   * すべてのゲームフローテストを実行
   */
  async runAllTests(): Promise<{ total: number; passed: number; failed: number; results: GameFlowTestResult[] }> {
    this.results = [];

    // 基本的なゲーム進行テスト
    this.testBasicGameFlow();
    
    // S04（ダブルアクション）のテスト
    this.testS04_DoubleAction();
    
    // S05（スペシャルジャマー）のテスト
    this.testS05_SpecialJammer();

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    return {
      total: this.results.length,
      passed,
      failed,
      results: this.results
    };
  }

  /**
   * 基本的なゲーム進行をテスト
   */
  private testBasicGameFlow(): void {
    const result: GameFlowTestResult = {
      testName: '基本的なゲーム進行',
      passed: true,
      errors: [],
      warnings: []
    };

    try {
      // プレイヤーを作成
      const deck = CardFactory.createDefaultDeck();
      const playerA = new Player('A', deck);
      const playerB = new Player('B', deck);
      const gameManager = new GameManager(playerA, playerB, 5, 15);

      // 初期状態の確認
      if (gameManager.getState() !== 'selecting') {
        result.errors.push(`初期状態が正しくありません: ${gameManager.getState()}`);
        result.passed = false;
      }

      if (gameManager.getCurrentTurn() !== 1) {
        result.errors.push(`初期ターンが正しくありません: ${gameManager.getCurrentTurn()}`);
        result.passed = false;
      }

    } catch (error) {
      result.errors.push(`エラー: ${error instanceof Error ? error.message : String(error)}`);
      result.passed = false;
    }

    this.results.push(result);
  }

  /**
   * S04（ダブルアクション）のテスト
   */
  private testS04_DoubleAction(): void {
    const result: GameFlowTestResult = {
      testName: 'S04: ダブルアクション',
      passed: true,
      errors: [],
      warnings: []
    };

    try {
      // プレイヤーを作成
      const deck = CardFactory.createDefaultDeck();
      const playerA = new Player('A', deck);
      const playerB = new Player('B', deck);
      const gameManager = new GameManager(playerA, playerB, 5, 15);

      // S04カードを取得
      const allCards = CardFactory.createAllCards();
      const s04Card = allCards.find(c => c.getId() === 'S04');
      
      if (!s04Card) {
        result.errors.push('S04カードが見つかりません');
        result.passed = false;
        this.results.push(result);
        return;
      }

      // S04をプレイ
      const selection: CardSelection = {
        cardId: 'S04',
        targetPosition: { x: 2, y: 2 }
      };

      const canSelect = gameManager.selectCard('A', selection);
      if (!canSelect) {
        result.errors.push('S04の選択に失敗しました');
        result.passed = false;
      }

      // ダブルアクションが有効になっているか確認
      // （GameManagerにisDoubleActionActiveメソッドがあることを前提）
      result.warnings.push('ダブルアクションの詳細な動作確認は手動テストが必要です');

    } catch (error) {
      result.errors.push(`エラー: ${error instanceof Error ? error.message : String(error)}`);
      result.passed = false;
    }

    this.results.push(result);
  }

  /**
   * S05（スペシャルジャマー）のテスト
   */
  private testS05_SpecialJammer(): void {
    const result: GameFlowTestResult = {
      testName: 'S05: スペシャルジャマー',
      passed: true,
      errors: [],
      warnings: []
    };

    try {
      // プレイヤーを作成
      const deck = CardFactory.createDefaultDeck();
      const playerA = new Player('A', deck);
      const playerB = new Player('B', deck);
      const gameManager = new GameManager(playerA, playerB, 5, 15);

      // S05カードを取得
      const allCards = CardFactory.createAllCards();
      const s05Card = allCards.find(c => c.getId() === 'S05');
      
      if (!s05Card) {
        result.errors.push('S05カードが見つかりません');
        result.passed = false;
        this.results.push(result);
        return;
      }

      // S05の選択テスト
      const selection: CardSelection = {
        cardId: 'S05',
        targetPosition: { x: 2, y: 2 }
      };

      const canSelect = gameManager.selectCard('A', selection);
      if (!canSelect) {
        result.errors.push('S05の選択に失敗しました');
        result.passed = false;
      }

      result.warnings.push('S05の相互干渉テスト（相手の特殊カード無効化など）は手動テストが必要です');

    } catch (error) {
      result.errors.push(`エラー: ${error instanceof Error ? error.message : String(error)}`);
      result.passed = false;
    }

    this.results.push(result);
  }
}

