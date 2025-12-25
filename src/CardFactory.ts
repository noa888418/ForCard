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

  // デフォルトデッキ（15枚）を作成
  static createDefaultDeck(): Card[] {
    const allCards = this.createAllCards();
    // デフォルトでは弱いカードと特殊カードを中心に選ぶ
    // 実際のゲームでは、バランスを考慮して選択
    const defaultIds = [
      'C01', 'C02', 'C03', 'C04', 'C05',
      'C11', 'C12', 'C13', 'C14', 'C15',
      'C21', 'C22', 'C23',
      'S01', 'S02'
    ];

    return allCards.filter(card => defaultIds.includes(card.getId()));
  }

  // カードIDからカードを作成
  static createCardById(id: string): Card | null {
    const allCards = this.createAllCards();
    return allCards.find(card => card.getId() === id) || null;
  }
}

