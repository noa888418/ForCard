import { Board } from './Board.js';
import { Player } from './Player.js';
import { Card } from './Card.js';
import { CardSelection, PlayerId, Position } from './types.js';
import { Scoring } from './Scoring.js';
import { ColorCard } from './cards/ColorCard.js';
import { FortCard } from './cards/FortCard.js';
import { SpecialCard } from './cards/specialCards.js';
import { S04_DoubleAction, S05_SpecialJammer, S06_ColorGamble, S07_TimeBomb } from './cards/specialCards.js';

export type GameState = 'setup' | 'selecting' | 'resolving' | 'finished';
export type GameResult = {
  playerAScore: number;
  playerBScore: number;
  winner: PlayerId | 'draw';
};

export class GameManager {
  private board: Board;
  private playerA: Player;
  private playerB: Player;
  private currentTurn: number = 1;
  private totalTurns: number = 15;
  private state: GameState = 'setup';
  private selections: Map<PlayerId, CardSelection | null> = new Map();
  private timeBombs: Array<{ bomb: S07_TimeBomb; position: Position; playerId: PlayerId; turn: number; explosionTurn: number }> = [];
  private doubleActionActive: Map<PlayerId, boolean> = new Map();
  private doubleActionRemaining: Map<PlayerId, number> = new Map(); // ダブルアクション中に残りのプレイ回数（1または2）
  private doubleActionFirstSelection: Map<PlayerId, CardSelection | null> = new Map(); // ダブルアクション中の1枚目のカード選択
  private skipNextTurn: Map<PlayerId, boolean> = new Map();
  private lastColorCard: Map<PlayerId, ColorCard | null> = new Map();
  private lastColorCardPosition: Map<PlayerId, Position | null> = new Map(); // S02用：最後に使った色カードの位置

  constructor(playerA: Player, playerB: Player, boardSize: number = 5, totalTurns: number = 15) {
    this.board = new Board(boardSize);
    this.playerA = playerA;
    this.playerB = playerB;
    this.totalTurns = totalTurns;
    this.state = 'selecting';
    this.selections.set('A', null);
    this.selections.set('B', null);
    this.doubleActionActive.set('A', false);
    this.doubleActionActive.set('B', false);
    this.doubleActionRemaining.set('A', 0);
    this.doubleActionRemaining.set('B', 0);
    this.doubleActionFirstSelection.set('A', null);
    this.doubleActionFirstSelection.set('B', null);
    this.skipNextTurn.set('A', false);
    this.skipNextTurn.set('B', false);
    this.lastColorCard.set('A', null);
    this.lastColorCard.set('B', null);
    this.lastColorCardPosition.set('A', null);
    this.lastColorCardPosition.set('B', null);
  }

  getBoard(): Board {
    return this.board;
  }

  getPlayer(playerId: PlayerId): Player {
    return playerId === 'A' ? this.playerA : this.playerB;
  }

  // プレイヤーの選択を取得（公開フェーズ用）
  getSelection(playerId: PlayerId): CardSelection | null {
    return this.selections.get(playerId) || null;
  }

  getCurrentTurn(): number {
    return this.currentTurn;
  }

  getTotalTurns(): number {
    return this.totalTurns;
  }

  getState(): GameState {
    return this.state;
  }

  getRemainingTurns(): number {
    return this.totalTurns - this.currentTurn + 1;
  }

  // ダブルアクションが有効かどうか
  isDoubleActionActive(playerId: PlayerId): boolean {
    return this.doubleActionActive.get(playerId) || false;
  }

  // ダブルアクション中に残りのプレイ回数を取得
  getDoubleActionRemaining(playerId: PlayerId): number {
    return this.doubleActionRemaining.get(playerId) || 0;
  }

  // ダブルアクション中の1枚目のカード選択を取得
  getDoubleActionFirstSelection(playerId: PlayerId): CardSelection | null {
    return this.doubleActionFirstSelection.get(playerId) || null;
  }

  // 次のターンがスキップかどうか
  isSkipNextTurn(playerId: PlayerId): boolean {
    return this.skipNextTurn.get(playerId) || false;
  }

  // カード選択
  selectCard(playerId: PlayerId, selection: CardSelection): boolean {
    if (this.state !== 'selecting') {
      return false;
    }

    // スキップターンの場合は選択不可
    if (this.skipNextTurn.get(playerId)) {
      return false;
    }

    const player = this.getPlayer(playerId);
    const card = player.getHand().find(c => c.getId() === selection.cardId);
    
    if (!card) {
      return false;
    }

    // ダブルアクション中は色カード（Color Cards）のみ選択可能（強化カードFxxは不可）
    if (this.doubleActionActive.get(playerId)) {
      const cardId = card.getId();
      // 色カードはCxx（Fxxは強化カードなので不可）
      if (!cardId.startsWith('C')) {
        return false; // 特殊カードと強化カードは選択不可
      }
    }

    // カードが置けるかチェック
    const cardOptions = this.getCardOptions(card, playerId);
    if (!card.canPlay(this.board, selection.targetPosition, playerId, cardOptions)) {
      // 手札がそのカード1枚だけの場合は不発でプレイ可
      if (player.getHand().length === 1) {
        // 不発として記録（効果は適用しない）
        this.selections.set(playerId, selection);
        return true;
      }
      return false;
    }

    this.selections.set(playerId, selection);
    return true;
  }

  // カード選択をキャンセル（ダブルアクション用）
  cancelCardSelection(playerId: PlayerId): boolean {
    if (this.state !== 'selecting') {
      return false;
    }

    // ダブルアクション中で、1枚目のカードが選択されている場合のみキャンセル可能
    if (!this.doubleActionActive.get(playerId)) {
      return false;
    }

    const remaining = this.doubleActionRemaining.get(playerId) || 0;
    if (remaining < 1) {
      return false; // 2枚目のカードを決定した後（remaining === 0）はキャンセル不可
    }
    // remaining >= 1 の時（1枚目を決定した後、2枚目を決定するまで）はキャンセル可能

    // 選択をリセット
    this.selections.set(playerId, null);
    return true;
  }

  // 両プレイヤーが選択済みかチェック
  areBothPlayersReady(): boolean {
    const selectionA = this.selections.get('A');
    const selectionB = this.selections.get('B');
    
    // ダブルアクション中は、1枚目のカードを決定した後も選択を保持するため、
    // ダブルアクション中でない場合のみ、両方の選択がnullでないことを確認
    const doubleActionA = this.doubleActionActive.get('A');
    const doubleActionB = this.doubleActionActive.get('B');
    
    // ダブルアクション中でない場合、通常のチェック
    if (!doubleActionA && !doubleActionB) {
      return selectionA !== null && selectionB !== null;
    }
    
    // ダブルアクション中の場合、残り回数が0になったら解決可能
    if (doubleActionA) {
      const remaining = this.doubleActionRemaining.get('A') || 0;
      if (remaining > 1 && selectionA !== null) {
        // まだ2枚目のカードを選択できる（1枚目を決定した直後）
        // この時点で1枚目のカードを処理するため、trueを返してresolveTurnを呼ばせる
        return selectionA !== null && selectionB !== null;
      }
      if (remaining === 1 && selectionA !== null) {
        // 2枚目のカードを決定した後
        return selectionA !== null && selectionB !== null;
      }
    }
    
    if (doubleActionB) {
      const remaining = this.doubleActionRemaining.get('B') || 0;
      if (remaining > 1 && selectionB !== null) {
        // まだ2枚目のカードを選択できる（1枚目を決定した直後）
        // この時点で1枚目のカードを処理するため、trueを返してresolveTurnを呼ばせる
        return selectionA !== null && selectionB !== null;
      }
      if (remaining === 1 && selectionB !== null) {
        // 2枚目のカードを決定した後
        return selectionA !== null && selectionB !== null;
      }
    }
    
    // ダブルアクションが終了したか、通常の選択が完了した場合
    return selectionA !== null && selectionB !== null;
  }

  // ターン解決
  resolveTurn(): void {
    if (this.state !== 'selecting' || !this.areBothPlayersReady()) {
      return;
    }

    this.state = 'resolving';

    const selectionA = this.selections.get('A')!;
    const selectionB = this.selections.get('B')!;

    const playerA = this.getPlayer('A');
    const playerB = this.getPlayer('B');

    // ダブルアクション中の処理
    // ダブルアクション中は、1枚目のカードを決定した後も選択を保持しているため、
    // 2枚目のカードを選択するまで待つ
    const doubleActionA = this.doubleActionActive.get('A');
    const doubleActionB = this.doubleActionActive.get('B');
    
    let doubleActionCompletedA = false;
    let doubleActionCompletedB = false;
    
    if (doubleActionA) {
      const remaining = this.doubleActionRemaining.get('A') || 0;
      if (remaining > 1 && selectionA !== null) {
        // まだ2枚目のカードを選択できる状態（remaining > 1の時のみ）
        // 1枚目のカードを実際に使用する
        const cardA = playerA.useCard(selectionA.cardId);
        if (!cardA) {
          this.state = 'selecting';
          return;
        }
        
        // 色カードの効果を適用（ダブルアクション中は色カードのみ）
        if (cardA.getType() === 'color') {
          const colorCardA = cardA as ColorCard;
          this.applyColorCard(colorCardA, selectionA.targetPosition, 'A', selectionA);
        }
        
        // 1枚目のカード選択を保存
        this.doubleActionFirstSelection.set('A', { ...selectionA });
        
        // 残り回数を減らす
        this.doubleActionRemaining.set('A', remaining - 1);
        // 選択をリセットして、2枚目のカードを選択できるようにする
        this.selections.set('A', null);
        this.state = 'selecting';
        return;
      } else if (remaining === 1 && selectionA !== null) {
        // 2枚目のカードを決定した時
        const cardA = playerA.useCard(selectionA.cardId);
        if (!cardA) {
          this.state = 'selecting';
          return;
        }
        
        // 色カードの効果を適用（ダブルアクション中は色カードのみ）
        if (cardA.getType() === 'color') {
          const colorCardA = cardA as ColorCard;
          this.applyColorCard(colorCardA, selectionA.targetPosition, 'A', selectionA);
        }
        
        // ダブルアクションを解除し、次のターンでスキップ
        this.doubleActionActive.set('A', false);
        this.doubleActionRemaining.set('A', 0);
        this.skipNextTurn.set('A', true);
        // 1枚目のカード選択をクリア
        this.doubleActionFirstSelection.set('A', null);
        doubleActionCompletedA = true;
      }
    }
    
    if (doubleActionB) {
      const remaining = this.doubleActionRemaining.get('B') || 0;
      if (remaining > 1 && selectionB !== null) {
        // まだ2枚目のカードを選択できる状態（remaining > 1の時のみ）
        // 1枚目のカードを実際に使用する
        const cardB = playerB.useCard(selectionB.cardId);
        if (!cardB) {
          this.state = 'selecting';
          return;
        }
        
        // 色カードの効果を適用（ダブルアクション中は色カードのみ）
        if (cardB.getType() === 'color') {
          const colorCardB = cardB as ColorCard;
          this.applyColorCard(colorCardB, selectionB.targetPosition, 'B', selectionB);
        }
        
        // 1枚目のカード選択を保存
        this.doubleActionFirstSelection.set('B', { ...selectionB });
        
        // 残り回数を減らす
        this.doubleActionRemaining.set('B', remaining - 1);
        // 選択をリセットして、2枚目のカードを選択できるようにする
        this.selections.set('B', null);
        this.state = 'selecting';
        return;
      } else if (remaining === 1 && selectionB !== null) {
        // 2枚目のカードを決定した時
        const cardB = playerB.useCard(selectionB.cardId);
        if (!cardB) {
          this.state = 'selecting';
          return;
        }
        
        // 色カードの効果を適用（ダブルアクション中は色カードのみ）
        if (cardB.getType() === 'color') {
          const colorCardB = cardB as ColorCard;
          this.applyColorCard(colorCardB, selectionB.targetPosition, 'B', selectionB);
        }
        
        // ダブルアクションを解除し、次のターンでスキップ
        this.doubleActionActive.set('B', false);
        this.doubleActionRemaining.set('B', 0);
        this.skipNextTurn.set('B', true);
        // 1枚目のカード選択をクリア
        this.doubleActionFirstSelection.set('B', null);
        doubleActionCompletedB = true;
      }
    }

    // ダブルアクションが完了した場合は、通常のカード処理をスキップしてendTurn()を呼ぶ
    if (doubleActionCompletedA || doubleActionCompletedB) {
      // ダブルアクションが完了した場合でも、相手のカードは通常通り処理する必要がある
      // ただし、ダブルアクション中は色カードのみなので、相手のカードも通常通り処理できる
      // 両方がダブルアクション完了した場合は、通常の処理をスキップ
      if (doubleActionCompletedA && doubleActionCompletedB) {
        // 両方がダブルアクション完了した場合、通常の処理をスキップ
        this.endTurn();
        return;
      }
      
      // 片方だけがダブルアクション完了した場合、相手のカードを処理する必要がある
      // ただし、ダブルアクション中は色カードのみなので、相手のカードも既に処理されている
      // この場合は、通常の処理をスキップしてendTurn()を呼ぶ
      this.endTurn();
      return;
    }

    const cardA = playerA.useCard(selectionA.cardId);
    const cardB = playerB.useCard(selectionB.cardId);

    if (!cardA || !cardB) {
      // エラー処理
      this.state = 'selecting';
      return;
    }

    // タイムボムの爆発チェック
    this.checkTimeBombs();

    // 特殊カードの相互干渉チェック
    const specialJammerA = cardA.getType() === 'special' && cardA.getId() === 'S05';
    const specialJammerB = cardB.getType() === 'special' && cardB.getId() === 'S05';

    // 色カード・強化カードフェーズ（設計書通り：同時適用）
    // 両方の色カード・強化カードの効果を計算してから、同時に適用
    const colorCardA = cardA.getType() === 'color' ? (cardA as ColorCard) : null;
    const colorCardB = cardB.getType() === 'color' ? (cardB as ColorCard) : null;
    const fortCardA = cardA.getType() === 'fort' ? (cardA as FortCard) : null;
    const fortCardB = cardB.getType() === 'fort' ? (cardB as FortCard) : null;

    if (colorCardA || colorCardB) {
      this.applyColorCardsSimultaneously(
        colorCardA, selectionA, 'A', !specialJammerB,
        colorCardB, selectionB, 'B', !specialJammerA
      );
    }
    
    // 強化カードの効果を適用（色カードとは別に処理）
    if (fortCardA) {
      this.applyFortCard(fortCardA, selectionA.targetPosition, 'A', selectionA);
    }
    if (fortCardB) {
      this.applyFortCard(fortCardB, selectionB.targetPosition, 'B', selectionB);
    }

    // 特殊カードフェーズ
    if (cardA.getType() === 'special') {
      this.applySpecialCard(cardA as SpecialCard, selectionA.targetPosition, 'A', cardB, selectionB);
    }
    if (cardB.getType() === 'special') {
      this.applySpecialCard(cardB as SpecialCard, selectionB.targetPosition, 'B', cardA, selectionA);
    }

    // ターン終了処理
    this.endTurn();
  }

  private applyColorCard(card: ColorCard, position: Position, playerId: PlayerId, selection: CardSelection): void {
    const options = this.getCardOptions(card, playerId, selection);
    card.applyEffect(this.board, position, playerId, options);
    
    // 直前の色カードと位置を記録（S02用）
    this.lastColorCard.set(playerId, card);
    this.lastColorCardPosition.set(playerId, position);
  }

  private applyFortCard(card: FortCard, position: Position, playerId: PlayerId, selection: CardSelection): void {
    const options = this.getCardOptions(card, playerId, selection);
    card.applyEffect(this.board, position, playerId, options);
  }

  // 色カードを同時適用（設計書通り：足し合わせてから判定）
  private applyColorCardsSimultaneously(
    cardA: ColorCard | null, selectionA: CardSelection, playerIdA: PlayerId, enabledA: boolean,
    cardB: ColorCard | null, selectionB: CardSelection, playerIdB: PlayerId, enabledB: boolean
  ): void {
    // 各マスに対する変化量を計算
    const changes = new Map<string, number>(); // key: "x,y", value: delta

    // プレイヤーAの色カード効果を計算
    if (cardA && enabledA) {
      const optionsA = this.getCardOptions(cardA, playerIdA, selectionA);
      const targetPositionsA = cardA.getTargetPositions(this.board, selectionA.targetPosition, playerIdA, optionsA);
      const powerA = cardA.getPower();
      const deltaA = playerIdA === 'A' ? powerA : -powerA;

      for (const pos of targetPositionsA) {
        const key = `${pos.x},${pos.y}`;
        changes.set(key, (changes.get(key) || 0) + deltaA);
      }

      // 直前の色カードと位置を記録（S02用）
      this.lastColorCard.set(playerIdA, cardA);
      this.lastColorCardPosition.set(playerIdA, selectionA.targetPosition);
    }

    // プレイヤーBの色カード効果を計算
    if (cardB && enabledB) {
      const optionsB = this.getCardOptions(cardB, playerIdB, selectionB);
      const targetPositionsB = cardB.getTargetPositions(this.board, selectionB.targetPosition, playerIdB, optionsB);
      const powerB = cardB.getPower();
      const deltaB = playerIdB === 'A' ? powerB : -powerB;

      for (const pos of targetPositionsB) {
        const key = `${pos.x},${pos.y}`;
        changes.set(key, (changes.get(key) || 0) + deltaB);
      }

      // 直前の色カードと位置を記録（S02用）
      this.lastColorCard.set(playerIdB, cardB);
      this.lastColorCardPosition.set(playerIdB, selectionB.targetPosition);
    }

    // 全ての変化を同時に適用（足し合わせてから判定）
    for (const [key, delta] of changes.entries()) {
      const [x, y] = key.split(',').map(Number);
      const cell = this.board.getCell(x, y);
      if (cell) {
        cell.addStability(delta); // 内部で-5〜+5にクリップされる
      }
    }
  }

  private applySpecialCard(
    card: SpecialCard,
    position: Position,
    playerId: PlayerId,
    opponentCard: Card,
    opponentSelection: CardSelection
  ): void {
    const cardId = card.getId();

    // S05: スペシャルジャマー
    if (cardId === 'S05') {
      const jammer = card as S05_SpecialJammer;
      if (opponentCard.getType() === 'special') {
        // 相手の特殊カードを無効化
        return; // 何もしない
      } else {
        // 読み外れ: ペナルティ
        this.applyPenalty(playerId, 3);
      }
      return;
    }

    // S06: カラーギャンブル
    if (cardId === 'S06') {
      const gamble = card as S06_ColorGamble;
      if (opponentCard.getType() === 'color') {
        // 読み当たり: 相手のパターンをコピーして1マス奪う
        const opponentColorCard = opponentCard as ColorCard;
        const opponentTargets = opponentColorCard.getTargetPositions(
          this.board,
          opponentSelection.targetPosition,
          playerId === 'A' ? 'B' : 'A',
          opponentSelection
        );

        // 1マスをランダムに選んで奪う
        if (opponentTargets.length > 0) {
          const stealIndex = Math.floor(Math.random() * opponentTargets.length);
          const stealPos = opponentTargets[stealIndex];
          const stealCell = this.board.getCell(stealPos.x, stealPos.y);
          if (stealCell) {
            const delta = playerId === 'A' ? 1 : -1;
            stealCell.addStability(delta);
          }
        }

        // 自分のパターンを適用
        const myTargets = opponentColorCard.getTargetPositions(
          this.board,
          position,
          playerId,
          opponentSelection
        );
        const power = opponentColorCard.getPower();
        const delta = playerId === 'A' ? power : -power;
        for (const pos of myTargets) {
          const cell = this.board.getCell(pos.x, pos.y);
          if (cell) {
            cell.addStability(delta);
          }
        }
      } else {
        // 読み外れ: ペナルティ
        this.applyPenalty(playerId, 3);
      }
      return;
    }

    // S07: タイムボム
    if (cardId === 'S07') {
      const bomb = card as S07_TimeBomb;
      const options = { currentTurn: this.currentTurn };
      bomb.applyEffect(this.board, position, playerId, options);
      // 設置から2ターン後の自分ターン終了時に爆発
      // 設置ターン2の場合、ターン4の終了時に爆発（設置ターン + 2 = 爆発ターン）
      const explosionTurn = this.currentTurn + 2;
      console.log(`[GameManager.applySpecialCard] S07タイムボム設置: プレイヤー${playerId}, 位置(${position.x},${position.y}), 設置ターン${this.currentTurn}, 爆発ターン${explosionTurn}`);
      this.timeBombs.push({
        bomb,
        position,
        playerId,
        turn: this.currentTurn,
        explosionTurn: explosionTurn
      });
      return;
    }

    // S04: ダブルアクション
    if (cardId === 'S04') {
      const player = this.getPlayer(playerId);
      const hand = player.getHand();
      
      // S04が手札の最後の1枚だった場合（不発、ペナルティなし）
      if (hand.length === 1) {
        // 何も起こらない
        return;
      }
      
      // S04を除く残り手札に色カード（Color Cards）が1枚以下の場合のチェック（強化カードFxxは含まない）
      const remainingColorCards = hand.filter(c => {
        const id = c.getId();
        // 色カードはCxx（Fxxは強化カードなので除外）
        return id !== 'S04' && id.startsWith('C');
      });
      
      // S04を除く残り手札の色カードが1枚以下の場合、C01として処理（単点塗り）
      // これには「S04が手札の最後の1枚」や「残りカードがS04と色カード1枚だけ」のケースも含まれる
      if (remainingColorCards.length <= 1) {
        console.log(`[GameManager.applySpecialCard] S04使用: 色カードが1枚以下（${remainingColorCards.length}枚）→ C01として処理`);
        // C01として処理（単点塗り）
        const cell = this.board.getCell(position.x, position.y);
        if (cell) {
          const delta = playerId === 'A' ? 1 : -1;
          cell.addStability(delta);
          console.log(`[GameManager.applySpecialCard] S04使用: C01効果適用（マス(${position.x},${position.y})の安定度${delta > 0 ? '+' : ''}${delta}）`);
        }
        // ダブルアクション効果は発動しない（次ターンの追加行動／スキップ効果も一切発生しない）
        return;
      }
      
      // 通常のダブルアクション効果
      console.log(`[GameManager.applySpecialCard] S04使用: 通常のダブルアクション効果を発動`);
      this.doubleActionActive.set(playerId, true);
      this.doubleActionRemaining.set(playerId, 2); // 2回までプレイ可能
      return;
    }

    // その他の特殊カード
    const options = this.getCardOptions(card, playerId);
    card.applyEffect(this.board, position, playerId, options);
  }

  private checkTimeBombs(): void {
    if (this.timeBombs.length === 0) {
      return; // タイムボムがない場合は何もしない
    }

    console.log(`[GameManager.checkTimeBombs] チェック開始: 現在ターン${this.currentTurn}, タイムボム数${this.timeBombs.length}`);
    
    const toExplode: typeof this.timeBombs = [];
    const remaining: typeof this.timeBombs = [];

    for (const bombData of this.timeBombs) {
      // 設置から2ターン後の自分ターン終了時に爆発
      // 設置ターン2の場合、ターン4の終了時に爆発（設置ターン + 2 = 爆発ターン）
      // 現在のターンが爆発ターン以上の場合、爆発する
      const explosionTurn = bombData.explosionTurn;
      console.log(`[GameManager.checkTimeBombs] タイムボム確認: プレイヤー${bombData.playerId}, 位置(${bombData.position.x},${bombData.position.y}), 設置ターン${bombData.turn}, 爆発ターン${explosionTurn}, 現在ターン${this.currentTurn}`);
      
      if (this.currentTurn >= explosionTurn) {
        toExplode.push(bombData);
      } else {
        remaining.push(bombData);
      }
    }

    if (toExplode.length > 0) {
      console.log(`[GameManager.checkTimeBombs] ${toExplode.length}個のタイムボムが爆発します`);
    }

    for (const bombData of toExplode) {
      console.log(`[GameManager.checkTimeBombs] タイムボム爆発: プレイヤー${bombData.playerId}, 位置(${bombData.position.x},${bombData.position.y}), 設置ターン${bombData.turn}, 爆発ターン${bombData.explosionTurn}, 現在ターン${this.currentTurn}`);
      bombData.bomb.explode(this.board, bombData.position, bombData.playerId);
    }

    this.timeBombs = remaining;
    
    if (toExplode.length > 0) {
      console.log(`[GameManager.checkTimeBombs] 爆発後、残りタイムボム数: ${this.timeBombs.length}`);
    }
  }

  // タイムボム一覧を取得（UI表示用）
  getTimeBombs(): Array<{ position: Position; playerId: PlayerId; turn: number; explosionTurn: number; remainingTurns: number }> {
    return this.timeBombs.map(bombData => {
      // 設置から2ターン後の自分ターン終了時に爆発
      // 設置ターン2の場合、ターン4の終了時に爆発（設置ターン + 2 = 爆発ターン）
      const explosionTurn = bombData.explosionTurn;
      const remainingTurns = Math.max(0, explosionTurn - this.currentTurn);
      return {
        position: bombData.position,
        playerId: bombData.playerId,
        turn: bombData.turn,
        explosionTurn: explosionTurn,
        remainingTurns: remainingTurns
      };
    });
  }

  // プレイヤーの選択をクリア
  clearSelection(playerId: PlayerId): void {
    this.selections.set(playerId, null);
  }

  private applyPenalty(playerId: PlayerId, count: number): void {
    const ownCells: Position[] = [];
    const size = this.board.getSize();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = this.board.getCell(x, y);
        if (cell && cell.isOwnedBy(playerId)) {
          ownCells.push({ x, y });
        }
      }
    }

    // ランダムに選んで-1
    const shuffled = [...ownCells].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, ownCells.length));
    for (const pos of selected) {
      const cell = this.board.getCell(pos.x, pos.y);
      if (cell) {
        const delta = playerId === 'A' ? -1 : 1;
        cell.addStability(delta);
      }
    }
  }

  private getCardOptions(card: Card, playerId: PlayerId, selection?: CardSelection): any {
    const options: any = {
      currentTurn: this.currentTurn,
      totalTurns: this.totalTurns,
      remainingTurns: this.getRemainingTurns()
    };

    if (card.getId() === 'S02') {
      options.lastColorCard = this.lastColorCard.get(playerId);
      options.lastColorCardPosition = this.lastColorCardPosition.get(playerId);
    }

    if (card.getId() === 'S10' && selection) {
      // S10用のオプションは解決時に設定
    }

    // C16などの回転可能カードの場合、回転を設定
    if (selection && (selection.rotation !== undefined && selection.rotation !== null)) {
      options.rotation = selection.rotation;
    }

    // C17の方向切り替え可能カードの場合、方向を設定
    if (selection && selection.direction) {
      options.direction = selection.direction;
    }

    return options;
  }

  endTurn(): void {
    // ダブルアクションの処理
    // この処理はresolveTurn()内で既に実行されているため、ここでは不要
    
    // スキップフラグのリセットは、スキップターンが実際に処理された後に行う
    // ここではリセットしない（main.tsのresolvePhaseで処理される）

    this.currentTurn++;
    
    // 選択をリセット
    this.selections.set('A', null);
    this.selections.set('B', null);

    if (this.currentTurn > this.totalTurns) {
      this.state = 'finished';
    } else {
      this.state = 'selecting';
    }
  }

  // スキップフラグをリセット（スキップターンが処理された後に呼ぶ）
  resetSkipFlag(playerId: PlayerId): void {
    this.skipNextTurn.set(playerId, false);
  }

  // ゲーム終了時のスコア計算
  calculateScores(): GameResult {
    const scoreA = Scoring.calculateTotalScore(this.board, 'A');
    const scoreB = Scoring.calculateTotalScore(this.board, 'B');

    let winner: PlayerId | 'draw' = 'draw';
    if (scoreA > scoreB) {
      winner = 'A';
    } else if (scoreB > scoreA) {
      winner = 'B';
    }

    return {
      playerAScore: scoreA,
      playerBScore: scoreB,
      winner
    };
  }
}

