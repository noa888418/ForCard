import { Card } from './Card.js';
import * as ColorCards from './cards/colorCards.js';
import * as AdvancedCards from './cards/advancedCards.js';
import * as SpecialCards from './cards/specialCards.js';

export class CardFactory {
  // 全カードを作成
  static createAllCards(): Card[] {
    const cards: Card[] = [];

    // 色カード（Cxx）
    cards.push(new ColorCards.C01_SinglePoint());
    cards.push(new ColorCards.C03_Straight2());
    cards.push(new ColorCards.C04_Diagonal2());
    cards.push(new ColorCards.C06_Corner3());
    cards.push(new ColorCards.C07_Edge3());
    cards.push(new ColorCards.C09_EnemyReduce());
    cards.push(new ColorCards.C10_UpDown2());
    cards.push(new ColorCards.C11_Cross());
    cards.push(new ColorCards.C12_DiagonalCross());
    cards.push(new ColorCards.C13_Horizontal3());
    cards.push(new ColorCards.C14_Vertical3());
    cards.push(new ColorCards.C15_Block2x2());
    cards.push(new ColorCards.C16_LShape());
    cards.push(new ColorCards.C17_TShape());
    cards.push(new ColorCards.C18_LShapeUpRight());
    cards.push(new ColorCards.C19_LShapeUpLeft());
    cards.push(new ColorCards.C20_LShapeDownLeft());
    cards.push(new ColorCards.C21_HorizontalLine());
    cards.push(new ColorCards.C22_VerticalLine());
    cards.push(new ColorCards.C23_TShapeDown());
    cards.push(new ColorCards.C24_Block3x3());
    cards.push(new ColorCards.C25_TShapeLeft());
    cards.push(new ColorCards.C26_TShapeRight());
    cards.push(...ColorCards.createAdditionalColorCards());

    // 強化カード（Fxx）
    cards.push(new ColorCards.F01_SinglePointBoost());
    cards.push(new ColorCards.F02_SurroundOwnOnly());
    cards.push(new ColorCards.F03_CenterOwnBoost());
    cards.push(new ColorCards.F04_LShapeBoost());
    cards.push(new ColorCards.F05_CrossBoost());
    cards.push(new ColorCards.F06_SurroundOwnBoost());
    cards.push(new ColorCards.F07_Block2x2Boost());
    cards.push(new ColorCards.F08_AllOwnBoost());
    cards.push(new ColorCards.F09_AllOwnSuperBoost());
    cards.push(new ColorCards.F10_RowFortress());
    cards.push(new ColorCards.F11_ColumnFortress());
    cards.push(new ColorCards.F12_ConnectedRegionBoost());
    cards.push(new ColorCards.F13_ConnectedRegionWeaknessBoost());
    cards.push(...AdvancedCards.createAdditionalFortCards());

    // 妨害カード（Wxx）
    cards.push(...AdvancedCards.createDisruptionCards());

    // 特殊カード（S01〜S09）
    cards.push(new SpecialCards.S01_ReversalField());
    cards.push(new SpecialCards.S02_FocusShift());
    cards.push(new SpecialCards.S03_Overload());
    cards.push(new SpecialCards.S04_SpecialJammer());
    cards.push(new SpecialCards.S05_ColorGamble());
    cards.push(new SpecialCards.S06_TimeBomb());
    cards.push(new SpecialCards.S07_SacrificeSwap());
    cards.push(new SpecialCards.S08_LastFortress());
    cards.push(new SpecialCards.S09_TargetLock());

    return cards;
  }

  // デフォルトデッキ（15枚）をランダムに作成
  static createDefaultDeck(boardSize?: number): Card[] {
    return this.createRandomDeck(15, boardSize);
  }

  // 指定された枚数のデッキをランダムに作成
  static createRandomDeck(totalCards: number = 15, boardSize?: number): Card[] {
    const allCards = this.createAllCards().filter(card => this.isAvailableForBoard(card, boardSize));
    
    // 新しい分類に基づいてカテゴリ別に分類
    // 色カード（Color Cards）：新たに色を塗るタイプ（Cxx）
    const colorCards = allCards.filter(c => {
      const id = c.getId();
      return id.startsWith('C');
    });
    
    // 強化カード（Fort Cards）：既存の自色マスを強化するタイプ（Fxx）
    const fortCards = allCards.filter(c => {
      const id = c.getId();
      return id.startsWith('F');
    });

    // 妨害カード：相手色マスを弱体化するタイプ（Wxx）
    const disruptionCards = allCards.filter(c => {
      const id = c.getId();
      return id.startsWith('W');
    });
    
    // 特殊カード（Special Cards）
    const specialCards = allCards.filter(c => c.getId().startsWith('S'));

    // カード配分: 色カード:強化カード:妨害カード:特殊カード = 6:1.5:1.5:1
    const counts = this.calculateDeckTypeCounts(totalCards);
    const numColorCards = counts.color;
    const numFortCards = counts.fort;
    const numDisruptionCards = counts.disruption;
    const numSpecialCards = counts.special;

    const selectedCards: Card[] = [];

    // 色カードを選ぶ
    const colorSelected = this.selectColorCardsForBoard(colorCards, numColorCards, boardSize);
    selectedCards.push(...colorSelected);

    // 色カードが足りない場合は、残りのカードから補填
    if (selectedCards.length < numColorCards) {
      const remainingColorCards = colorCards.filter(c => !selectedCards.includes(c));
      const needed = numColorCards - selectedCards.length;
      const additional = this.randomSelect(remainingColorCards, Math.min(needed, remainingColorCards.length));
      selectedCards.push(...additional);
    }

    // 強化カードを選ぶ
    const fortSelected = this.selectTypedCardsForBoard(fortCards, numFortCards, boardSize, 'F', 54, 63);
    selectedCards.push(...fortSelected);

    // 強化カードが足りない場合は、残りのカードから補填
    if (selectedCards.length < numColorCards + numFortCards) {
      const remainingFortCards = fortCards.filter(c => !selectedCards.includes(c));
      const needed = (numColorCards + numFortCards) - selectedCards.length;
      const additional = this.randomSelect(remainingFortCards, Math.min(needed, remainingFortCards.length));
      selectedCards.push(...additional);
    }

    // 妨害カードを選ぶ
    const disruptionSelected = this.selectTypedCardsForBoard(disruptionCards, numDisruptionCards, boardSize, 'W', 41, 50);
    selectedCards.push(...disruptionSelected);

    // 妨害カードが足りない場合は、残りのカードから補填
    if (selectedCards.length < numColorCards + numFortCards + numDisruptionCards) {
      const remainingDisruptionCards = disruptionCards.filter(c => !selectedCards.includes(c));
      const needed = (numColorCards + numFortCards + numDisruptionCards) - selectedCards.length;
      const additional = this.randomSelect(remainingDisruptionCards, Math.min(needed, remainingDisruptionCards.length));
      selectedCards.push(...additional);
    }

    // 特殊カードを選ぶ
    const specialSelected = this.randomSelect(specialCards, Math.min(numSpecialCards, specialCards.length));
    selectedCards.push(...specialSelected);

    // カードが足りない場合は、残りのカードから補填
    if (selectedCards.length < totalCards) {
      const remainingCards = allCards.filter(c => !selectedCards.includes(c));
      const needed = totalCards - selectedCards.length;
      const additional = this.randomSelect(remainingCards, Math.min(needed, remainingCards.length));
      selectedCards.push(...additional);
    }

    // シャッフルして指定枚数まで
    return this.shuffle(selectedCards).slice(0, totalCards);
  }

  // 配列からランダムにn枚選択
  private static randomSelect<T>(array: T[], n: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, array.length));
  }

  private static calculateDeckTypeCounts(totalCards: number): { color: number; fort: number; disruption: number; special: number } {
    const weights = [
      { key: 'color' as const, value: 6 },
      { key: 'fort' as const, value: 1.5 },
      { key: 'disruption' as const, value: 1.5 },
      { key: 'special' as const, value: 1 }
    ];
    const totalWeight = weights.reduce((sum, item) => sum + item.value, 0);
    const exact = weights.map(item => {
      const value = (totalCards * item.value) / totalWeight;
      return { ...item, exact: value, count: Math.floor(value), remainder: value - Math.floor(value) };
    });
    let remaining = totalCards - exact.reduce((sum, item) => sum + item.count, 0);
    exact.sort((a, b) => b.remainder - a.remainder);
    for (const item of exact) {
      if (remaining <= 0) break;
      item.count++;
      remaining--;
    }
    return {
      color: exact.find(item => item.key === 'color')?.count ?? 0,
      fort: exact.find(item => item.key === 'fort')?.count ?? 0,
      disruption: exact.find(item => item.key === 'disruption')?.count ?? 0,
      special: exact.find(item => item.key === 'special')?.count ?? 0
    };
  }

  private static selectColorCardsForBoard(colorCards: Card[], count: number, boardSize?: number): Card[] {
    if (count <= 0) return [];
    if (boardSize === undefined || boardSize < 6) {
      return this.randomSelect(colorCards, Math.min(count, colorCards.length));
    }

    const type5Cards = colorCards.filter(card => this.isType5ColorCard(card));
    const otherCards = colorCards.filter(card => !this.isType5ColorCard(card));
    const type5Target = Math.min(type5Cards.length, Math.round(count * 0.85));
    const selectedType5 = this.randomSelect(type5Cards, type5Target);
    const selectedOthers = this.randomSelect(otherCards, Math.min(count - selectedType5.length, otherCards.length));
    const selected = [...selectedType5, ...selectedOthers];

    if (selected.length < count) {
      const remaining = colorCards.filter(card => !selected.includes(card));
      selected.push(...this.randomSelect(remaining, Math.min(count - selected.length, remaining.length)));
    }

    return this.shuffle(selected).slice(0, count);
  }

  private static isType5ColorCard(card: Card): boolean {
    const idNumber = Number(card.getId().replace(/^C/, ''));
    return idNumber >= 67 && idNumber <= 76;
  }

  private static selectTypedCardsForBoard(cards: Card[], count: number, boardSize: number | undefined, prefix: string, type5Start: number, type5End: number): Card[] {
    if (count <= 0) return [];
    if (boardSize === undefined || boardSize < 6) {
      return this.randomSelect(cards, Math.min(count, cards.length));
    }

    const type5Cards = cards.filter(card => {
      const idNumber = Number(card.getId().replace(new RegExp(`^${prefix}`), ''));
      return idNumber >= type5Start && idNumber <= type5End;
    });
    const otherCards = cards.filter(card => !type5Cards.includes(card));
    const type5Target = Math.min(type5Cards.length, Math.round(count * 0.85));
    const selectedType5 = this.randomSelect(type5Cards, type5Target);
    const selectedOthers = this.randomSelect(otherCards, Math.min(count - selectedType5.length, otherCards.length));
    const selected = [...selectedType5, ...selectedOthers];

    if (selected.length < count) {
      const remaining = cards.filter(card => !selected.includes(card));
      selected.push(...this.randomSelect(remaining, Math.min(count - selected.length, remaining.length)));
    }

    return this.shuffle(selected).slice(0, count);
  }

  // 配列をシャッフル
  private static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // カードIDからカードを作成
  static createCardById(id: string): Card | null {
    const allCards = this.createAllCards();
    return allCards.find(card => card.getId() === id) || null;
  }

  static isAvailableForBoard(card: Card, boardSize?: number): boolean {
    if (boardSize === undefined) return true;
    if (boardSize >= 5 && this.isSmallScopeLowPowerCard(card)) return false;
    const cardWithBoardRange = card as Card & { supportsBoardSize?: (size: number) => boolean };
    return cardWithBoardRange.supportsBoardSize ? cardWithBoardRange.supportsBoardSize(boardSize) : true;
  }

  private static isSmallScopeLowPowerCard(card: Card): boolean {
    const id = card.getId();
    const number = Number(id.slice(1));
    if (['C01', 'C03', 'C04', 'C10'].includes(id)) return true;
    if (id.startsWith('C') && number >= 57 && number <= 66) return true;
    if (id.startsWith('F') && number >= 44 && number <= 53) return true;
    if (id.startsWith('W') && number >= 31 && number <= 40) return true;
    return false;
  }
}
