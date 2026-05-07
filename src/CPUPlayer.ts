import { Player } from './Player.js';
import { Card } from './Card.js';
import { CardSelection, PlayerId, Position } from './types.js';
import { Board } from './Board.js';
import { Scoring } from './Scoring.js';

export class CPUPlayer {
  private player: Player;
  private playerId: PlayerId;
  private randomPickRate: number;
  private maxSimulationsPerCard: number | null;

  constructor(
    player: Player,
    playerId: PlayerId,
    options: Partial<{ difficulty: 'easy' | 'normal' | 'hard'; level: number }> = {}
  ) {
    this.player = player;
    this.playerId = playerId;

    if (typeof options.level === 'number') {
      const cpuLevel = Math.max(1, Math.min(20, Math.round(options.level)));
      const t = (cpuLevel - 1) / 19;
      this.randomPickRate = 0.55 - t * 0.51;
      this.maxSimulationsPerCard = cpuLevel >= 12 ? null : Math.max(8, Math.round(8 + t * 24));
    } else {
      const difficulty = options.difficulty ?? 'normal';
      if (difficulty === 'easy') {
        this.randomPickRate = 0.55;
        this.maxSimulationsPerCard = 10;
      } else if (difficulty === 'hard') {
        this.randomPickRate = 0.08;
        this.maxSimulationsPerCard = null;
      } else {
        this.randomPickRate = 0.3;
        this.maxSimulationsPerCard = null;
      }
    }
  }

  // CPUのターン: カードと位置を選択
  selectCard(board: Board): CardSelection | null {
    const hand = this.player.getHand();
    if (hand.length === 0) {
      return null;
    }

    // 簡単なAI: スコアが最も高くなるカードと位置を選択
    let bestSelection: CardSelection | null = null;
    let bestScore = -Infinity;

    for (const card of hand) {
      // カードが置ける位置を探す
      const positions = this.getValidPositions(board, card);
      const effectivePositions =
        this.maxSimulationsPerCard && positions.length > this.maxSimulationsPerCard
          ? this.samplePositions(positions, this.maxSimulationsPerCard)
          : positions;

      for (const position of effectivePositions) {
        // この選択でスコアがどう変わるかシミュレート
        const simulatedScore = this.simulateMove(board, card, position);
        
        if (simulatedScore > bestScore) {
          bestScore = simulatedScore;
          bestSelection = {
            cardId: card.getId(),
            targetPosition: position
          };
        }
      }
    }

    // ランダム要素を追加（完全に最適化されすぎないように）
    if (Math.random() < this.randomPickRate && hand.length > 1) {
      // 難易度に応じた確率でランダムなカードを選ぶ
      const randomCard = hand[Math.floor(Math.random() * hand.length)];
      const validPositions = this.getValidPositions(board, randomCard);
      if (validPositions.length > 0) {
        const randomPos = validPositions[Math.floor(Math.random() * validPositions.length)];
        return {
          cardId: randomCard.getId(),
          targetPosition: randomPos
        };
      }
    }

    return bestSelection || this.getRandomSelection(board, hand);
  }

  private samplePositions(positions: Position[], max: number): Position[] {
    if (positions.length <= max) return positions;
    const result: Position[] = [];
    const used = new Set<number>();
    while (result.length < max && used.size < positions.length) {
      const idx = Math.floor(Math.random() * positions.length);
      if (used.has(idx)) continue;
      used.add(idx);
      result.push(positions[idx]);
    }
    return result.length > 0 ? result : positions.slice(0, max);
  }

  // カードが置ける有効な位置を取得
  private getValidPositions(board: Board, card: Card): Position[] {
    const positions: Position[] = [];
    const size = board.getSize();

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const position = { x, y };
        if (card.canPlay(board, position, this.playerId)) {
          positions.push(position);
        }
      }
    }

    return positions;
  }

  // 移動をシミュレートしてスコアを計算
  private simulateMove(board: Board, card: Card, position: Position): number {
    // 盤面をクローン
    const clonedBoard = board.clone();
    
    // カードの効果を適用
    try {
      card.applyEffect(clonedBoard, position, this.playerId);
    } catch (e) {
      return -Infinity;
    }

    // スコアを計算
    const score = Scoring.calculateTotalScore(clonedBoard, this.playerId);
    return score;
  }

  // ランダムな選択を取得（フォールバック用）
  private getRandomSelection(board: Board, hand: Card[]): CardSelection | null {
    if (hand.length === 0) {
      return null;
    }

    const card = hand[Math.floor(Math.random() * hand.length)];
    const positions = this.getValidPositions(board, card);
    
    if (positions.length === 0) {
      // 置ける位置がない場合、手札が1枚だけなら不発でプレイ
      if (hand.length === 1) {
        return {
          cardId: card.getId(),
          targetPosition: { x: 0, y: 0 }
        };
      }
      return null;
    }

    const position = positions[Math.floor(Math.random() * positions.length)];
    return {
      cardId: card.getId(),
      targetPosition: position
    };
  }

  getPlayer(): Player {
    return this.player;
  }
}
