import { Player } from './Player.js';
import { Card } from './Card.js';
import { CardSelection, PlayerId, Position } from './types.js';
import { Board } from './Board.js';
import { Scoring } from './Scoring.js';

export class CPUPlayer {
  private player: Player;
  private playerId: PlayerId;

  constructor(player: Player, playerId: PlayerId) {
    this.player = player;
    this.playerId = playerId;
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

      for (const position of positions) {
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
    if (Math.random() < 0.3 && hand.length > 1) {
      // 30%の確率でランダムなカードを選ぶ
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

