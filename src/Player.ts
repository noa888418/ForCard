import { CardId, CardSelection } from './types.js';
import { Card } from './Card.js';

export class Player {
  private id: 'A' | 'B';
  private hand: Card[];
  private usedCards: Set<CardId>;
  private lastColorCard: Card | null = null; // S02用

  constructor(id: 'A' | 'B', initialHand: Card[]) {
    this.id = id;
    this.hand = [...initialHand];
    this.usedCards = new Set();
  }

  getId(): 'A' | 'B' {
    return this.id;
  }

  getHand(): Card[] {
    return this.hand.filter(card => !this.usedCards.has(card.getId()));
  }

  getUsedCards(): Set<CardId> {
    return new Set(this.usedCards);
  }

  // カードを使用
  useCard(cardId: CardId): Card | null {
    const card = this.hand.find(c => c.getId() === cardId);
    if (!card || this.usedCards.has(cardId)) {
      return null;
    }

    this.usedCards.add(cardId);
    
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
    return this.hand.length - this.usedCards.size;
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
}

