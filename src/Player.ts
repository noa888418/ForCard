import { CardId } from './types.js';
import { Card } from './Card.js';

export class Player {
  private id: 'A' | 'B';
  private hand: Card[];
  private usedCardCounts: Map<CardId, number>;
  private lastColorCard: Card | null = null; // S02用

  constructor(id: 'A' | 'B', initialHand: Card[]) {
    this.id = id;
    this.hand = [...initialHand];
    this.usedCardCounts = new Map();
  }

  getId(): 'A' | 'B' {
    return this.id;
  }

  getHand(): Card[] {
    const remainingUsedCounts = new Map(this.usedCardCounts);
    return this.hand.filter(card => {
      const cardId = card.getId();
      const usedCount = remainingUsedCounts.get(cardId) || 0;
      if (usedCount > 0) {
        remainingUsedCounts.set(cardId, usedCount - 1);
        return false;
      }
      return true;
    });
  }

  getUsedCards(): Set<CardId> {
    const usedCards = new Set<CardId>();
    const totalCounts = this.getCardCounts();
    for (const [cardId, usedCount] of this.usedCardCounts.entries()) {
      if (usedCount >= (totalCounts.get(cardId) || 0)) {
        usedCards.add(cardId);
      }
    }
    return usedCards;
  }

  // カードを使用
  useCard(cardId: CardId): Card | null {
    const card = this.getHand().find(c => c.getId() === cardId);
    if (!card) {
      return null;
    }

    this.usedCardCounts.set(cardId, (this.usedCardCounts.get(cardId) || 0) + 1);
    
    // 色カードの場合は記録（S02用）
    if (card.getType() === 'color') {
      this.lastColorCard = card;
    }

    return card;
  }

  // 直前の色カードを取得（S02用）
  getLastColorCard(): Card | null {
    return this.lastColorCard;
  }

  // 残りカード数
  getRemainingCardCount(): number {
    let usedCount = 0;
    for (const count of this.usedCardCounts.values()) {
      usedCount += count;
    }
    return this.hand.length - usedCount;
  }

  // 手札に色カード（Color Cards）があるか（強化カードFxxは含まない）
  hasColorCardInHand(): boolean {
    return this.getHand().some(card => {
      const id = card.getId();
      // 色カードはCxx（Fxxは強化カードなので除外）
      return id.startsWith('C');
    });
  }

  // カードIDでカードを取得（usedCardsに含まれていても取得可能）
  getCardById(cardId: CardId): Card | null {
    return this.hand.find(c => c.getId() === cardId) || null;
  }

  private getCardCounts(): Map<CardId, number> {
    const counts = new Map<CardId, number>();
    for (const card of this.hand) {
      const cardId = card.getId();
      counts.set(cardId, (counts.get(cardId) || 0) + 1);
    }
    return counts;
  }
}
