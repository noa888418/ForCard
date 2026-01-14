/**
 * シミュレーター実行クラス
 * すべての検証を実行し、結果を表示
 */

import { CardEffectSimulator, SimulationResult } from './CardEffectSimulator.js';
import { GameFlowSimulator } from './GameFlowSimulator.js';

export class SimulatorRunner {
  private cardSimulator: CardEffectSimulator;
  private flowSimulator: GameFlowSimulator;

  constructor() {
    this.cardSimulator = new CardEffectSimulator();
    this.flowSimulator = new GameFlowSimulator();
  }

  /**
   * すべてのシミュレーションを実行
   */
  async runAll(): Promise<void> {
    console.log('=== カード効果シミュレーター開始 ===\n');

    // カード効果の検証
    console.log('カード効果を検証中...');
    const cardResults = await this.cardSimulator.runAllTests();
    this.printCardResults(cardResults);

    console.log('\n=== ゲームフローシミュレーター開始 ===\n');

    // ゲームフローの検証
    console.log('ゲームフローを検証中...');
    const flowResults = await this.flowSimulator.runAllTests();
    this.printFlowResults(flowResults);

    console.log('\n=== シミュレーション完了 ===');
  }

  /**
   * カード効果の結果を表示
   */
  private printCardResults(results: SimulationResult): void {
    console.log(`\n総テスト数: ${results.totalTests}`);
    console.log(`成功: ${results.passed}`);
    console.log(`失敗: ${results.failed}\n`);

    for (const result of results.results) {
      const status = result.passed ? '✓' : '✗';
      console.log(`${status} ${result.cardId}: ${result.cardName}`);

      if (result.errors.length > 0) {
        for (const error of result.errors) {
          console.log(`  エラー: ${error}`);
        }
      }

      if (result.warnings.length > 0) {
        for (const warning of result.warnings) {
          console.log(`  警告: ${warning}`);
        }
      }
    }
  }

  /**
   * ゲームフローの結果を表示
   */
  private printFlowResults(results: { total: number; passed: number; failed: number; results: any[] }): void {
    console.log(`\n総テスト数: ${results.total}`);
    console.log(`成功: ${results.passed}`);
    console.log(`失敗: ${results.failed}\n`);

    for (const result of results.results) {
      const status = result.passed ? '✓' : '✗';
      console.log(`${status} ${result.testName}`);

      if (result.errors.length > 0) {
        for (const error of result.errors) {
          console.log(`  エラー: ${error}`);
        }
      }

      if (result.warnings.length > 0) {
        for (const warning of result.warnings) {
          console.log(`  警告: ${warning}`);
        }
      }
    }
  }

  /**
   * 特定のカードのみを検証
   */
  async testSpecificCard(cardId: string): Promise<void> {
    console.log(`=== ${cardId} の検証 ===\n`);
    
    const allResults = await this.cardSimulator.runAllTests();
    const cardResult = allResults.results.find(r => r.cardId === cardId);

    if (cardResult) {
      const status = cardResult.passed ? '✓' : '✗';
      console.log(`${status} ${cardResult.cardId}: ${cardResult.cardName}`);

      if (cardResult.errors.length > 0) {
        console.log('\nエラー:');
        for (const error of cardResult.errors) {
          console.log(`  - ${error}`);
        }
      }

      if (cardResult.warnings.length > 0) {
        console.log('\n警告:');
        for (const warning of cardResult.warnings) {
          console.log(`  - ${warning}`);
        }
      }
    } else {
      console.log(`カード ${cardId} が見つかりません`);
    }
  }
}


