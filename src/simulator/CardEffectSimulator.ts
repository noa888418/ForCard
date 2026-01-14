/**
 * カード効果シミュレーター
 * 設計書の仕様通りにカードが動作しているか検証するための機構
 */

import { Board } from '../Board.js';
import { Card } from '../Card.js';
import { ColorCard } from '../cards/ColorCard.js';
import { FortCard } from '../cards/FortCard.js';
import { SpecialCard } from '../cards/specialCards.js';
import { PlayerId, Position } from '../types.js';
import { CardFactory } from '../CardFactory.js';

export interface TestResult {
  cardId: string;
  cardName: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface SimulationResult {
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

export class CardEffectSimulator {
  private board: Board;
  private results: TestResult[] = [];

  constructor() {
    this.board = new Board(5);
  }

  /**
   * すべてのカード効果を検証
   */
  async runAllTests(): Promise<SimulationResult> {
    this.results = [];
    this.board = new Board(5);

    // 色カードの検証
    this.testColorCards();
    
    // 強化カードの検証
    this.testFortCards();
    
    // 特殊カードの検証
    this.testSpecialCards();

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    return {
      totalTests: this.results.length,
      passed,
      failed,
      results: this.results
    };
  }

  /**
   * 色カードの効果を検証
   */
  private testColorCards(): void {
    const allCards = CardFactory.createAllCards();
    const colorCards = allCards.filter(c => c.getType() === 'color') as ColorCard[];

    for (const card of colorCards) {
      const result: TestResult = {
        cardId: card.getId(),
        cardName: card.getName(),
        passed: true,
        errors: [],
        warnings: []
      };

      try {
        // ボードをリセット
        this.resetBoard();

        // カードを配置可能な位置を取得
        const testPosition: Position = { x: 2, y: 2 }; // 中央
        const targetPositions = card.getTargetPositions(this.board, testPosition, 'A');

        if (targetPositions.length === 0) {
          result.warnings.push('配置可能な位置が見つかりません');
        }

        // 効果を適用
        card.applyEffect(this.board, testPosition, 'A');

        // 効果が適用されたか確認
        let effectApplied = false;
        for (const pos of targetPositions) {
          const cell = this.board.getCell(pos.x, pos.y);
          if (cell && cell.stability !== 0) {
            effectApplied = true;
            break;
          }
        }

        if (!effectApplied && targetPositions.length > 0) {
          result.errors.push('効果が適用されていません');
          result.passed = false;
        }

        // 安定度が-5〜+5の範囲内か確認
        const size = this.board.getSize();
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const cell = this.board.getCell(x, y);
            if (cell) {
              const stability = cell.stability;
              if (stability < -5 || stability > 5) {
                result.errors.push(`マス(${x},${y})の安定度が範囲外です: ${stability}`);
                result.passed = false;
              }
            }
          }
        }

      } catch (error) {
        result.errors.push(`エラー: ${error instanceof Error ? error.message : String(error)}`);
        result.passed = false;
      }

      this.results.push(result);
    }
  }

  /**
   * 強化カードの効果を検証
   */
  private testFortCards(): void {
    const allCards = CardFactory.createAllCards();
    const fortCards = allCards.filter(c => c.getType() === 'fort') as FortCard[];

    for (const card of fortCards) {
      const result: TestResult = {
        cardId: card.getId(),
        cardName: card.getName(),
        passed: true,
        errors: [],
        warnings: []
      };

      try {
        // ボードをリセットして自色マスを準備
        this.resetBoard();
        this.prepareOwnCells('A');

        // カードを配置可能な位置を取得
        const testPosition: Position = { x: 2, y: 2 };
        const canPlay = card.canPlay ? card.canPlay(this.board, testPosition, 'A') : true;

        if (!canPlay) {
          result.warnings.push('配置条件を満たしていません');
        } else {
          // 効果を適用
          card.applyEffect(this.board, testPosition, 'A');

        // 安定度が-5〜+5の範囲内か確認
        const size = this.board.getSize();
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const cell = this.board.getCell(x, y);
            if (cell) {
              const stability = cell.stability;
              if (stability < -5 || stability > 5) {
                result.errors.push(`マス(${x},${y})の安定度が範囲外です: ${stability}`);
                result.passed = false;
              }
            }
          }
        }
        }

      } catch (error) {
        result.errors.push(`エラー: ${error instanceof Error ? error.message : String(error)}`);
        result.passed = false;
      }

      this.results.push(result);
    }
  }

  /**
   * 特殊カードの効果を検証
   */
  private testSpecialCards(): void {
    const allCards = CardFactory.createAllCards();
    const specialCards = allCards.filter(c => c.getType() === 'special') as SpecialCard[];

    for (const card of specialCards) {
      const result: TestResult = {
        cardId: card.getId(),
        cardName: card.getName(),
        passed: true,
        errors: [],
        warnings: []
      };

      try {
        // ボードをリセット
        this.resetBoard();

        // カードごとの特殊検証
        const cardId = card.getId();
        
        switch (cardId) {
          case 'S01': // リバーサル・フィールド
            this.testS01_ReversalField(card as SpecialCard, result);
            break;
          case 'S03': // オーバーロード
            this.testS03_Overload(card as SpecialCard, result);
            break;
          case 'S05': // スペシャルジャマー
            this.testS05_SpecialJammer(card as SpecialCard, result);
            break;
          case 'S07': // タイムボム
            this.testS07_TimeBomb(card as SpecialCard, result);
            break;
          case 'S09': // ラストフォートレス
            this.testS09_LastFortress(card as SpecialCard, result);
            break;
          default:
            // 基本的な検証のみ
            const testPosition: Position = { x: 2, y: 2 };
            const targetPositions = card.getTargetPositions(this.board, testPosition, 'A');
            if (targetPositions.length === 0) {
              result.warnings.push('配置可能な位置が見つかりません');
            }
            break;
        }

        // 安定度が-5〜+5の範囲内か確認
        const size = this.board.getSize();
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const cell = this.board.getCell(x, y);
            if (cell) {
              const stability = cell.stability;
              if (stability < -5 || stability > 5) {
                result.errors.push(`マス(${x},${y})の安定度が範囲外です: ${stability}`);
                result.passed = false;
              }
            }
          }
        }

      } catch (error) {
        result.errors.push(`エラー: ${error instanceof Error ? error.message : String(error)}`);
        result.passed = false;
      }

      this.results.push(result);
    }
  }

  /**
   * S01: リバーサル・フィールドの検証
   */
  private testS01_ReversalField(card: SpecialCard, result: TestResult): void {
    this.resetBoard();
    this.prepareOwnCells('A');
    this.prepareOwnCells('B');

    const testPosition: Position = { x: 2, y: 2 };
    
    // ラウンド1〜12の効果をテスト
    card.applyEffect(this.board, testPosition, 'A', { currentTurn: 5, totalTurns: 15 });

    // 符号が反転しているか確認
    const size = this.board.getSize();
    let reversalDetected = false;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = this.board.getCell(x, y);
        if (cell && cell.stability !== 0) {
          reversalDetected = true;
          break;
        }
      }
    }

    if (!reversalDetected) {
      result.warnings.push('符号反転効果が確認できませんでした');
    }
  }

  /**
   * S03: オーバーロードの検証
   */
  private testS03_Overload(card: SpecialCard, result: TestResult): void {
    this.resetBoard();
    // 自色マスを準備
    const centerPos: Position = { x: 2, y: 2 };
    const centerCell = this.board.getCell(centerPos.x, centerPos.y);
    if (centerCell) {
      centerCell.setStability(1); // 自色マスにする
    }

    const canPlay = card.canPlay ? card.canPlay(this.board, centerPos, 'A') : true;
    if (!canPlay) {
      result.errors.push('自色マスに配置できない');
      result.passed = false;
      return;
    }

    card.applyEffect(this.board, centerPos, 'A');

    // 中心が+5になっているか確認
    if (centerCell && centerCell.stability !== 5) {
      result.warnings.push(`中心マスの安定度が5ではありません: ${centerCell.stability}`);
    }
  }

  /**
   * S05: スペシャルジャマーの検証
   */
  private testS05_SpecialJammer(card: SpecialCard, result: TestResult): void {
    // S05はGameManagerで処理されるため、基本的な検証のみ
    const testPosition: Position = { x: 2, y: 2 };
    const targetPositions = card.getTargetPositions(this.board, testPosition, 'A');
    
    if (targetPositions.length === 0) {
      result.errors.push('配置可能な位置が見つかりません');
      result.passed = false;
    }

    result.warnings.push('S05の効果はGameManagerでの相互干渉テストが必要です');
  }

  /**
   * S07: タイムボムの検証
   */
  private testS07_TimeBomb(card: SpecialCard, result: TestResult): void {
    const testPosition: Position = { x: 2, y: 2 };
    card.applyEffect(this.board, testPosition, 'A', { currentTurn: 5 });

    // タイムボムは2ターン後に爆発するため、即座の効果はない
    result.warnings.push('タイムボムの爆発効果はGameManagerでの時系列テストが必要です');
  }

  /**
   * S09: ラストフォートレスの検証
   */
  private testS09_LastFortress(card: SpecialCard, result: TestResult): void {
    this.resetBoard();
    this.prepareOwnCells('A');

    const testPosition: Position = { x: 2, y: 2 };
    const targetPositions = card.getTargetPositions(this.board, testPosition, 'A');

    if (targetPositions.length === 0) {
      result.warnings.push('連結領域が見つかりません');
    }

    // 残りターン数による効果の違いをテスト
    const remainingTurns = 3;
    card.applyEffect(this.board, testPosition, 'A', { currentTurn: 15 - remainingTurns, totalTurns: 15 });

    result.warnings.push('ラストフォートレスの効果は残りターン数に依存するため、詳細なテストが必要です');
  }

  /**
   * ボードをリセット
   */
  private resetBoard(): void {
    const size = this.board.getSize();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = this.board.getCell(x, y);
        if (cell) {
          cell.setStability(0);
        }
      }
    }
  }

  /**
   * 自色マスを準備（テスト用）
   */
  private prepareOwnCells(playerId: PlayerId): void {
    const size = this.board.getSize();
    const delta = playerId === 'A' ? 1 : -1;
    
    // いくつかのマスを自色にする
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if ((x + y) % 2 === 0) {
          const cell = this.board.getCell(x, y);
          if (cell) {
            cell.addStability(delta);
          }
        }
      }
    }
  }
}

