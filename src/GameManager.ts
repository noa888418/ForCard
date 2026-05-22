import { Board } from './Board.js';
import { Player } from './Player.js';
import { Card } from './Card.js';
import { CardSelection, PlayerId, Position } from './types.js';
import { Scoring } from './Scoring.js';
import { ColorCard } from './cards/ColorCard.js';
import { FortCard } from './cards/FortCard.js';
import { DisruptionCard } from './cards/DisruptionCard.js';
import { SpecialCard } from './cards/specialCards.js';
import { S04_SpecialJammer, S05_ColorGamble, S06_TimeBomb } from './cards/specialCards.js';

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
  private timeBombs: Array<{ bomb: S06_TimeBomb; position: Position; playerId: PlayerId; turn: number; explosionTurn: number }> = [];
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

  isDoubleActionActive(playerId: PlayerId): boolean {
    return false;
  }

  getDoubleActionRemaining(playerId: PlayerId): number {
    return 0;
  }

  getDoubleActionFirstSelection(playerId: PlayerId): CardSelection | null {
    return null;
  }

  isSkipNextTurn(playerId: PlayerId): boolean {
    return false;
  }

  // カード選択
  selectCard(playerId: PlayerId, selection: CardSelection): boolean {
    if (this.state !== 'selecting') {
      return false;
    }

    const player = this.getPlayer(playerId);
    const card = player.getHand().find(c => c.getId() === selection.cardId);
    
    if (!card) {
      return false;
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

  cancelCardSelection(playerId: PlayerId): boolean {
    return false;
  }

  // 両プレイヤーが選択済みかチェック
  areBothPlayersReady(): boolean {
    return this.selections.get('A') !== null && this.selections.get('B') !== null;
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
    const cardA = playerA.useCard(selectionA.cardId);
    const cardB = playerB.useCard(selectionB.cardId);

    if (!cardA || !cardB) {
      this.state = 'selecting';
      return;
    }

    this.checkTimeBombs();

    const specialJammerA = cardA.getType() === 'special' && cardA.getId() === 'S04';
    const specialJammerB = cardB.getType() === 'special' && cardB.getId() === 'S04';
    const colorCardA = cardA.getType() === 'color' ? (cardA as ColorCard) : null;
    const colorCardB = cardB.getType() === 'color' ? (cardB as ColorCard) : null;
    const fortCardA = cardA.getType() === 'fort' ? (cardA as FortCard) : null;
    const fortCardB = cardB.getType() === 'fort' ? (cardB as FortCard) : null;
    const disruptionCardA = cardA.getType() === 'disruption' ? (cardA as DisruptionCard) : null;
    const disruptionCardB = cardB.getType() === 'disruption' ? (cardB as DisruptionCard) : null;

    if (colorCardA || colorCardB) {
      this.applyColorCardsSimultaneously(
        colorCardA, selectionA, 'A', !specialJammerB,
        colorCardB, selectionB, 'B', !specialJammerA
      );
    }

    if (fortCardA) {
      this.applyFortCard(fortCardA, selectionA.targetPosition, 'A', selectionA);
    }
    if (fortCardB) {
      this.applyFortCard(fortCardB, selectionB.targetPosition, 'B', selectionB);
    }

    if (disruptionCardA) {
      this.applyDisruptionCard(disruptionCardA, selectionA.targetPosition, 'A', selectionA);
    }
    if (disruptionCardB) {
      this.applyDisruptionCard(disruptionCardB, selectionB.targetPosition, 'B', selectionB);
    }

    if (cardA.getType() === 'special') {
      this.applySpecialCard(cardA as SpecialCard, selectionA.targetPosition, 'A', cardB, selectionB);
    }
    if (cardB.getType() === 'special') {
      this.applySpecialCard(cardB as SpecialCard, selectionB.targetPosition, 'B', cardA, selectionA);
    }

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

  private applyDisruptionCard(card: DisruptionCard, position: Position, playerId: PlayerId, selection: CardSelection): void {
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

    // S04: スペシャルジャマー
    if (cardId === 'S04') {
      const jammer = card as S04_SpecialJammer;
      if (opponentCard.getType() === 'special') {
        // 相手の特殊カードを無効化
        return; // 何もしない
      } else {
        // 読み外れ: ペナルティ
        this.applyPenalty(playerId, 3);
      }
      return;
    }

    // S05: カラーギャンブル
    if (cardId === 'S05') {
      const gamble = card as S05_ColorGamble;
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

    // S06: タイムボム
    if (cardId === 'S06') {
      const bomb = card as S06_TimeBomb;
      const options = { currentTurn: this.currentTurn };
      bomb.applyEffect(this.board, position, playerId, options);
      // 設置から2ターン後の自分ターン終了時に爆発
      // 設置ターン2の場合、ターン4の終了時に爆発（設置ターン + 2 = 爆発ターン）
      const explosionTurn = this.currentTurn + 2;
      console.log(`[GameManager.applySpecialCard] S06タイムボム設置: プレイヤー${playerId}, 位置(${position.x},${position.y}), 設置ターン${this.currentTurn}, 爆発ターン${explosionTurn}`);
      this.timeBombs.push({
        bomb,
        position,
        playerId,
        turn: this.currentTurn,
        explosionTurn: explosionTurn
      });
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

    if (card.getId() === 'S09' && selection) {
      // S09用のオプションは解決時に設定
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

  resetSkipFlag(playerId: PlayerId): void {
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
