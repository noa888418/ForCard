import { Card } from './Card.js';
import * as ColorCards from './cards/colorCards.js';
import * as SpecialCards from './cards/specialCards.js';

export class CardFactory {
  // 全カードを作成
  static createAllCards(): Card[] {
    const cards: Card[] = [];

    // 色カード（C01〜C30）
    cards.push(new ColorCards.C01_SinglePoint());
    cards.push(new ColorCards.C02_SinglePointBoost());
    cards.push(new ColorCards.C03_Straight2());
    cards.push(new ColorCards.C04_Diagonal2());
    cards.push(new ColorCards.C05_SurroundOwnOnly());
    cards.push(new ColorCards.C06_Corner3());
    cards.push(new ColorCards.C07_Edge3());
    cards.push(new ColorCards.C08_CenterOwnBoost());
    cards.push(new ColorCards.C09_EnemyReduce());
    cards.push(new ColorCards.C10_UpDown2());
    cards.push(new ColorCards.C11_Cross());
    cards.push(new ColorCards.C12_DiagonalCross());
    cards.push(new ColorCards.C13_Horizontal3());
    cards.push(new ColorCards.C14_Vertical3());
    cards.push(new ColorCards.C15_Block2x2());
    cards.push(new ColorCards.C16_LShape());
    cards.push(new ColorCards.C17_TShape());
    cards.push(new ColorCards.C18_LShapeBoost());
    cards.push(new ColorCards.C19_CrossBoost());
    cards.push(new ColorCards.C20_SurroundOwnBoost());
    cards.push(new ColorCards.C21_HorizontalLine());
    cards.push(new ColorCards.C22_VerticalLine());
    cards.push(new ColorCards.C23_Block2x2Boost());
    cards.push(new ColorCards.C24_Block3x3());
    cards.push(new ColorCards.C25_AllOwnBoost());
    cards.push(new ColorCards.C26_AllOwnSuperBoost());
    cards.push(new ColorCards.C27_RowFortress());
    cards.push(new ColorCards.C28_ColumnFortress());
    cards.push(new ColorCards.C29_ConnectedRegionBoost());
    cards.push(new ColorCards.C30_ConnectedRegionWeaknessBoost());

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
    const allCards = this.createAllCards();
    
    // カテゴリ別に分類
    const weakCards = allCards.filter(c => {
      const id = c.getId();
      return id.startsWith('C') && parseInt(id.substring(1)) >= 1 && parseInt(id.substring(1)) <= 10;
    });
    const mediumCards = allCards.filter(c => {
      const id = c.getId();
      return id.startsWith('C') && parseInt(id.substring(1)) >= 11 && parseInt(id.substring(1)) <= 20;
    });
    const strongCards = allCards.filter(c => {
      const id = c.getId();
      return id.startsWith('C') && parseInt(id.substring(1)) >= 21 && parseInt(id.substring(1)) <= 30;
    });
    const specialCards = allCards.filter(c => c.getId().startsWith('S'));

    // 手札15枚の配分（色カード:特殊カード = 7:3）
    // 色カード10枚、特殊カード5枚（10:5 = 2:1 ≈ 7:3.5、ほぼ7:3）
    const selectedCards: Card[] = [];

    // 色カード10枚を選ぶ（弱:中:強 = 4:3:3 くらい）
    const weakSelected = this.randomSelect(weakCards, 4);
    const mediumSelected = this.randomSelect(mediumCards, 3);
    const strongSelected = this.randomSelect(strongCards, 3);

    selectedCards.push(...weakSelected, ...mediumSelected, ...strongSelected);

    // 特殊カード5枚を選ぶ
    const specialSelected = this.randomSelect(specialCards, 5);
    selectedCards.push(...specialSelected);

    // シャッフル
    return this.shuffle(selectedCards);
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

