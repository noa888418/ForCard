import { Card } from './Card.js';
import * as ColorCards from './cards/colorCards.js';
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
    cards.push(new ColorCards.C21_HorizontalLine());
    cards.push(new ColorCards.C22_VerticalLine());
    cards.push(new ColorCards.C24_Block3x3());

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

    // 特殊カード（S01〜S10）
    cards.push(new SpecialCards.S01_ReversalField());
    cards.push(new SpecialCards.S02_FocusShift());
    cards.push(new SpecialCards.S03_Overload());
    cards.push(new SpecialCards.S04_DoubleAction());
    cards.push(new SpecialCards.S05_SpecialJammer());
    cards.push(new SpecialCards.S06_ColorGamble());
    cards.push(new SpecialCards.S07_TimeBomb());
    cards.push(new SpecialCards.S08_SacrificeSwap());
    cards.push(new SpecialCards.S09_LastFortress());
    cards.push(new SpecialCards.S10_TargetLock());

    return cards;
  }

  // デフォルトデッキ（15枚）をランダムに作成
  static createDefaultDeck(): Card[] {
    return this.createRandomDeck(15);
  }

  // 指定された枚数のデッキをランダムに作成
  static createRandomDeck(totalCards: number = 15): Card[] {
    const allCards = this.createAllCards();
    
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
    
    // 特殊カード（Special Cards）
    const specialCards = allCards.filter(c => c.getId().startsWith('S'));

    // 色カード:強化カード = 5:5 の比率で配分（特殊カードは残り）
    // 特殊カードは全体の約30%程度とする
    const numSpecialCards = Math.round(totalCards * 0.3);
    const remainingCards = totalCards - numSpecialCards;
    const numColorCards = Math.round(remainingCards * 0.5);
    const numFortCards = remainingCards - numColorCards;

    const selectedCards: Card[] = [];

    // 色カードを選ぶ
    const colorSelected = this.randomSelect(colorCards, Math.min(numColorCards, colorCards.length));
    selectedCards.push(...colorSelected);

    // 色カードが足りない場合は、残りのカードから補填
    if (selectedCards.length < numColorCards) {
      const remainingColorCards = colorCards.filter(c => !selectedCards.includes(c));
      const needed = numColorCards - selectedCards.length;
      const additional = this.randomSelect(remainingColorCards, Math.min(needed, remainingColorCards.length));
      selectedCards.push(...additional);
    }

    // 強化カードを選ぶ
    const fortSelected = this.randomSelect(fortCards, Math.min(numFortCards, fortCards.length));
    selectedCards.push(...fortSelected);

    // 強化カードが足りない場合は、残りのカードから補填
    if (selectedCards.length < numColorCards + numFortCards) {
      const remainingFortCards = fortCards.filter(c => !selectedCards.includes(c));
      const needed = (numColorCards + numFortCards) - selectedCards.length;
      const additional = this.randomSelect(remainingFortCards, Math.min(needed, remainingFortCards.length));
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
}

