import { GameManager } from './GameManager.js';
import { Player } from './Player.js';
import { CardFactory } from './CardFactory.js';
import { CardSelection, PlayerId, Position, CardId } from './types.js';
import { Board } from './Board.js';
import { CPUPlayer } from './CPUPlayer.js';
import { Card } from './Card.js';

class GameUI {
  private gameManager: GameManager | null = null;
  private cpuPlayer: CPUPlayer | null = null;
  private currentPlayer: PlayerId = 'A';
  private selectedCardId: string | null = null;
  private selectedCardIndex: number | null = null; // 同じカードが複数ある場合のインデックス
  private selectedPosition: { x: number; y: number } | null = null;
  private hoveredPosition: { x: number; y: number } | null = null;
  private playerADecided: boolean = false; // プレイヤーAが決定したか
  private playerBDecided: boolean = false; // プレイヤーB（CPU）が決定したか
  private showingReveal: boolean = false; // 公開フェーズ表示中か
  private doubleActionFirstCardSelected: boolean = false; // ダブルアクション中に1枚目のカードが選択されているか
  private doubleActionFirstSelection: CardSelection | null = null; // ダブルアクション中に1枚目に選択されたカード
  private devModeEnabled: boolean = false; // 開発者モードが有効か
  private devSettings: {
    boardSize: number;
    totalTurns: number;
    cardIds: string[] | null;
    playerBIsCPU: boolean;
  } = {
    boardSize: 5,
    totalTurns: 15,
    cardIds: null,
    playerBIsCPU: true
  };
  
  private devSelectedCards: string[] = []; // 開発者モードで選択されたカードIDのリスト
  
  // 開発者モード用の変数
  private playerBIsCPU: boolean = true; // プレイヤーBがCPUかどうか（開発者モード設定から取得）
  private playerBSelectedCardId: string | null = null;
  private playerBSelectedCardIndex: number | null = null;
  private playerBSelectedPosition: { x: number; y: number } | null = null;

  constructor() {
    this.initializeGame();
    this.setupEventListeners();
  }

  private initializeGame(): void {
    // デッキを作成
    let deck: Card[];
    if (this.devSettings.cardIds && this.devSettings.cardIds.length > 0) {
      deck = this.createDeckFromCardIds(this.devSettings.cardIds);
    } else {
      // 総ターン数に応じたデッキを作成
      deck = CardFactory.createRandomDeck(this.devSettings.totalTurns);
    }

    const playerA = new Player('A', [...deck]);
    const playerB = new Player('B', [...deck]);

    this.gameManager = new GameManager(playerA, playerB, this.devSettings.boardSize, this.devSettings.totalTurns);
    this.cpuPlayer = new CPUPlayer(playerB, 'B');
    this.currentPlayer = 'A';
    this.playerADecided = false;
    this.playerBDecided = false;
    this.showingReveal = false;
    this.doubleActionFirstCardSelected = false;
    this.doubleActionFirstSelection = null;
    this.selectedCardId = null;
    this.selectedCardIndex = null;
    this.selectedPosition = null;
    this.hoveredPosition = null;
    this.playerBSelectedCardId = null;
    this.playerBSelectedCardIndex = null;
    this.playerBSelectedPosition = null;

    // 開発者モードの設定からプレイヤーBのモードを取得
    this.playerBIsCPU = this.devSettings.playerBIsCPU;

    // CPUモードの場合のみCPU選択を開始
    if (this.playerBIsCPU) {
      this.startCPUSelection();
    }

    // 操作ログをクリア（ゲーム開始時のみ）
    this.clearActionLog();
    
    this.updateUI();
  }

  private createDeckFromCardIds(cardIds: string[]): Card[] {
    const deck: Card[] = [];
    const allCards = CardFactory.createAllCards();
    const maxCards = this.devSettings.totalTurns;
    
    for (const cardId of cardIds) {
      const trimmedId = cardId.trim() as CardId;
      const card = CardFactory.createCardById(trimmedId);
      if (card) {
        deck.push(card);
      } else {
        console.warn(`カードID "${trimmedId}" が見つかりません`);
      }
    }
    
    // 総ターン数に満たない場合はランダムで補填
    while (deck.length < maxCards) {
      const remainingCards = allCards.filter(c => !cardIds.includes(c.getId()));
      if (remainingCards.length === 0) break;
      const randomCard = remainingCards[Math.floor(Math.random() * remainingCards.length)];
      const newCard = CardFactory.createCardById(randomCard.getId());
      if (newCard) {
        deck.push(newCard);
      }
    }
    
    return deck.slice(0, maxCards); // 総ターン数まで
  }


  // CPUの秘密選択を開始
  private startCPUSelection(): void {
    if (!this.gameManager || !this.cpuPlayer || this.playerBDecided || !this.playerBIsCPU) return;

    // スキップフラグをチェックして、スキップしているプレイヤーを決定済みにする
    const skipA = this.gameManager.isSkipNextTurn('A');
    const skipB = this.gameManager.isSkipNextTurn('B');
    
    if (skipA && !this.playerADecided) {
      // プレイヤーAがスキップの場合、自動的に決定済みにする
      this.playerADecided = true;
      // スキップしているプレイヤーのログを追加（重複を防ぐ）
      const currentTurn = this.gameManager.getCurrentTurn();
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`プレイヤーA: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`プレイヤーA: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
      this.updateUI();
    }
    if (skipB && !this.playerBDecided) {
      // プレイヤーBがスキップの場合、自動的に決定済みにする
      this.playerBDecided = true;
      // スキップしているプレイヤーのログを追加（重複を防ぐ）
      const currentTurn = this.gameManager.getCurrentTurn();
      const playerBName = this.playerBIsCPU ? 'CPU' : 'プレイヤーB';
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`${playerBName}: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`${playerBName}: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
      this.updateUI();
      // 両方ともスキップしている場合は、直接resolvePhase()を呼ぶ
      if (skipA && skipB) {
        setTimeout(() => {
          this.resolvePhase();
        }, 100);
      }
      return;
    }

    // 少し遅延を入れて自然に見せる
    setTimeout(() => {
      if (!this.gameManager || !this.cpuPlayer || this.playerBDecided || !this.playerBIsCPU) return;
      
      // 念のため、GameManagerの選択状態を確認してリセット
      const currentSelection = this.gameManager.getSelection('B');
      if (currentSelection !== null) {
        // 前のターンの選択が残っている場合はリセット
        this.gameManager.clearSelection('B');
        this.playerBSelectedCardId = null;
        this.playerBSelectedCardIndex = null;
        this.playerBSelectedPosition = null;
        console.log(`[startCPUSelection] 前のターンの選択をリセット`);
      }
      
      // 手札と使用済みカードを確認（デバッグ用）
      const playerB = this.gameManager.getPlayer('B');
      const hand = playerB.getHand();
      const usedCards = playerB.getUsedCards();
      const currentTurn = this.gameManager.getCurrentTurn();
      console.log(`[startCPUSelection] ターン${currentTurn}: 手札=${hand.map(c => c.getId()).join(',')}, 使用済み=${Array.from(usedCards).join(',')}`);
      
      const selection = this.cpuPlayer.selectCard(this.gameManager.getBoard());
      if (selection) {
        // 選択したカードが使用済みでないことを確認
        if (usedCards.has(selection.cardId)) {
          console.error(`[startCPUSelection] エラー: カード${selection.cardId}は既に使用済みです！`);
          return;
        }
        // CPUの選択を記録（まだ決定していない）
        const success = this.gameManager.selectCard('B', selection);
        if (!success) {
          console.error(`[startCPUSelection] エラー: カード${selection.cardId}の選択に失敗しました`);
          return;
        }
        console.log(`[startCPUSelection] CPUがカード${selection.cardId}を選択`);
        // CPUは自動で決定する（プレイヤーが決定するまで待たない）
        this.cpuDecide();
      }
    }, 1000 + Math.random() * 2000); // 1-3秒のランダム遅延
  }

  // CPUが決定
  private cpuDecide(): void {
    if (this.playerBDecided || !this.playerBIsCPU || !this.gameManager) return;
    
    // ダブルアクション中で、まだ残り回数がある場合は、2枚目のカードを選択できるようにする
    if (this.gameManager.isDoubleActionActive('B')) {
      const remaining = this.gameManager.getDoubleActionRemaining('B');
      if (remaining > 1) {
        // 1枚目のカードが選択されたことを記録
        const selectionB = this.gameManager.getSelection('B');
        if (selectionB) {
          this.doubleActionFirstCardSelected = true;
          this.doubleActionFirstSelection = selectionB; // 1枚目の選択を保存
        }
        // 1枚目のカードを処理してremainingを減らすため、checkBothDecidedを呼ぶ
        this.playerBDecided = true;
        this.updateUI();
        this.checkBothDecided();
        // 2枚目のカードを選択できるように、選択状態をリセット
        this.playerBDecided = false;
        // CPUが2枚目のカードを選択
        this.startCPUSelection();
        return;
      }
    }
    
    this.playerBDecided = true;
    this.updateUI();
    this.checkBothDecided();
  }

  private setupEventListeners(): void {
    const resolveBtn = document.getElementById('resolve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const closeResultBtn = document.getElementById('close-result-btn');
    const devModeToggle = document.getElementById('dev-mode-toggle');
    const devApplyBtn = document.getElementById('dev-apply-btn');

    if (resolveBtn) {
      resolveBtn.addEventListener('click', () => this.onDecideButtonClick());
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('ゲームをリセットしますか？')) {
          this.initializeGame();
        }
      });
    }

    if (closeResultBtn) {
      closeResultBtn.addEventListener('click', () => {
        const modal = document.getElementById('result-modal');
        if (modal) {
          modal.classList.add('hidden');
        }
      });
    }

    // 開発者モードのトグル
    if (devModeToggle) {
      devModeToggle.addEventListener('click', () => {
        this.toggleDevMode();
      });
    }

    // 開発者モードの設定適用
    if (devApplyBtn) {
      devApplyBtn.addEventListener('click', () => {
        this.applyDevSettings();
      });
    }

    // 選びなおすボタン
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.cancelFirstCard();
      });
    }
  }

  private onCardSelectorChange(playerId: PlayerId, value: string): void {
    // このメソッドは使用されていません（削除予定）
    return;

    const [cardId, indexStr] = value.split(':');
    const cardIndex = indexStr ? parseInt(indexStr) : 0;

    if (playerId === 'A' && !this.playerADecided) {
      this.selectedCardId = cardId;
      this.selectedCardIndex = cardIndex;
      this.selectedPosition = null;
      this.hoveredPosition = null;
      // プレイヤーAのターンに切り替え（カード選択時）
      this.currentPlayer = 'A';
      this.updateCardTargets();
      this.updateUI();
    } else if (playerId === 'B' && !this.playerBIsCPU && !this.playerBDecided) {
      this.playerBSelectedCardId = cardId;
      this.playerBSelectedCardIndex = cardIndex;
      this.playerBSelectedPosition = null;
      this.hoveredPosition = null;
      // プレイヤーBのターンに切り替え（カード選択時）
      this.currentPlayer = 'B';
      this.updateCardTargets();
      this.updateUI();
    }
  }

  private toggleDevMode(): void {
    this.devModeEnabled = !this.devModeEnabled;
    
    const devPanel = document.getElementById('dev-mode-panel');
    const devToggle = document.getElementById('dev-mode-toggle');
    
    if (devPanel) {
      if (this.devModeEnabled) {
        devPanel.classList.remove('hidden');
        // 開発者モードが有効になったときにカードセレクターを初期化
        this.initializeDevCardSelector();
      } else {
        devPanel.classList.add('hidden');
      }
    }
    
    
    if (devToggle) {
      if (this.devModeEnabled) {
        devToggle.textContent = '🔧 開発者モード（ON）';
        devToggle.classList.add('active');
      } else {
        devToggle.textContent = '🔧 開発者モード';
        devToggle.classList.remove('active');
      }
    }
  }
  
  private initializeDevCardSelector(): void {
    // カードセレクターを初期化
    const cardSelector = document.getElementById('dev-card-selector') as HTMLSelectElement;
    if (!cardSelector) return;
    
    // 既存のイベントリスナーを削除
    const newCardSelector = cardSelector.cloneNode(true) as HTMLSelectElement;
    cardSelector.parentNode?.replaceChild(newCardSelector, cardSelector);
    
    // 全てのカードを取得
    const allCards = CardFactory.createAllCards();
    
    // セレクターをクリア
    newCardSelector.innerHTML = '<option value="">カードを選択してください</option>';
    
    // カードをソートして追加
    // 色カード（Cxx）、強化カード（Fxx）、特殊カード（Sxx）の順番でまとめる
    // 各カテゴリ内では番号順にソート
    const sortedCards = [...allCards].sort((a, b) => {
      const idA = a.getId();
      const idB = b.getId();
      
      // カードの種類を判定（優先順位: 色カード > 強化カード > 特殊カード）
      const getCardCategory = (id: string): number => {
        if (id.startsWith('C')) return 1; // 色カード
        if (id.startsWith('F')) return 2; // 強化カード
        if (id.startsWith('S')) return 3; // 特殊カード
        return 4; // その他
      };
      
      const categoryA = getCardCategory(idA);
      const categoryB = getCardCategory(idB);
      
      // カテゴリで比較
      if (categoryA !== categoryB) {
        return categoryA - categoryB;
      }
      
      // 同じカテゴリなら番号で比較
      const numA = parseInt(idA.substring(1));
      const numB = parseInt(idB.substring(1));
      return numA - numB;
    });
    
    sortedCards.forEach(card => {
      const option = document.createElement('option');
      option.value = card.getId();
      option.textContent = `${card.getName()} (${card.getId()})`;
      newCardSelector.appendChild(option);
    });
    
    // 追加ボタンのイベントリスナー（既存のものを削除してから追加）
    const addCardBtn = document.getElementById('dev-add-card-btn');
    if (addCardBtn) {
      const newAddCardBtn = addCardBtn.cloneNode(true) as HTMLButtonElement;
      addCardBtn.parentNode?.replaceChild(newAddCardBtn, addCardBtn);
      newAddCardBtn.addEventListener('click', () => {
        this.addDevCard();
      });
    }
    
    // 現在の設定から選択されたカードリストを復元
    if (this.devSettings.cardIds && this.devSettings.cardIds.length > 0) {
      this.devSelectedCards = [...this.devSettings.cardIds];
    } else {
      this.devSelectedCards = [];
    }
    
    // 選択されたカードリストを更新
    this.updateDevSelectedCardsList();
  }
  
  private addDevCard(): void {
    const cardSelector = document.getElementById('dev-card-selector') as HTMLSelectElement;
    if (!cardSelector || !cardSelector.value) return;
    
    const cardId = cardSelector.value;
    
    // 総ターン数に応じた最大枚数を取得
    const maxCards = this.devSettings.totalTurns;
    
    // 最大枚数まで
    if (this.devSelectedCards.length >= maxCards) {
      alert(`最大${maxCards}枚まで選択できます（総ターン数: ${maxCards}）`);
      return;
    }
    
    // カードを追加（同じカードを複数選択可能）
    this.devSelectedCards.push(cardId);
    
    // リストを更新
    this.updateDevSelectedCardsList();
    
    // セレクターをリセット
    cardSelector.value = '';
  }
  
  private updateDevSelectedCardsList(): void {
    const listContainer = document.getElementById('dev-selected-cards-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    if (this.devSelectedCards.length === 0) {
      listContainer.textContent = '選択されたカードはありません';
      return;
    }
    
    // カードIDごとにグループ化して表示
    const cardCounts = new Map<string, number>();
    this.devSelectedCards.forEach(cardId => {
      cardCounts.set(cardId, (cardCounts.get(cardId) || 0) + 1);
    });
    
    const cardList = document.createElement('div');
    cardList.className = 'dev-card-list';
    
    cardCounts.forEach((count, cardId) => {
      const card = CardFactory.createCardById(cardId);
      if (!card) return;
      
      const cardItem = document.createElement('div');
      cardItem.className = 'dev-card-item';
      
      const cardName = document.createElement('span');
      cardName.textContent = `${card.getName()} (${cardId})${count > 1 ? ` ×${count}` : ''}`;
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '削除';
      removeBtn.className = 'dev-remove-card-btn';
      removeBtn.addEventListener('click', () => {
        this.removeDevCard(cardId);
      });
      
      cardItem.appendChild(cardName);
      cardItem.appendChild(removeBtn);
      cardList.appendChild(cardItem);
    });
    
    listContainer.appendChild(cardList);
    
    // カウント表示（総ターン数に応じた最大枚数を表示）
    const maxCards = this.devSettings.totalTurns;
    const countInfo = document.createElement('div');
    countInfo.className = 'dev-card-count';
    countInfo.textContent = `選択中: ${this.devSelectedCards.length} / ${maxCards}枚（総ターン数: ${maxCards}）`;
    listContainer.appendChild(countInfo);
  }
  
  private removeDevCard(cardId: string): void {
    const index = this.devSelectedCards.indexOf(cardId);
    if (index !== -1) {
      this.devSelectedCards.splice(index, 1);
      this.updateDevSelectedCardsList();
    }
  }

  private applyDevSettings(): void {
    const boardSizeSelect = document.getElementById('dev-board-size') as HTMLSelectElement;
    const totalTurnsInput = document.getElementById('dev-total-turns') as HTMLInputElement;
    const playerBModeSelect = document.getElementById('dev-player-b-mode') as HTMLSelectElement;

    if (boardSizeSelect && totalTurnsInput) {
      this.devSettings.boardSize = parseInt(boardSizeSelect.value);
      this.devSettings.totalTurns = parseInt(totalTurnsInput.value);
      
      // 選択されたカードIDを取得（総ターン数に応じた最大枚数まで）
      const maxCards = this.devSettings.totalTurns;
      if (this.devSelectedCards.length > 0) {
        this.devSettings.cardIds = [...this.devSelectedCards].slice(0, maxCards);
      } else {
        this.devSettings.cardIds = null;
      }
      
      // プレイヤーBのモード
      if (playerBModeSelect) {
        this.devSettings.playerBIsCPU = playerBModeSelect.value === 'cpu';
      }
      
      // ゲームを再初期化
      if (confirm('設定を適用してゲームを開始しますか？')) {
        this.initializeGame();
      }
    }
  }

  private updateUI(): void {
    if (!this.gameManager) return;

    // スキップフラグをチェックして、スキップしているプレイヤーを決定済みにする
    // これはターン開始時に実行されるため、スキップしているプレイヤーがカードを選択できないようにする
    const skipA = this.gameManager.isSkipNextTurn('A');
    const skipB = this.gameManager.isSkipNextTurn('B');
    const currentTurn = this.gameManager.getCurrentTurn();
    
    // デバッグ用ログ（開発時のみ）
    if (skipA || skipB) {
      console.log(`[updateUI] ターン${currentTurn}: skipA=${skipA}, skipB=${skipB}, playerADecided=${this.playerADecided}, playerBDecided=${this.playerBDecided}`);
    }
    
    if (skipA && !this.playerADecided) {
      // プレイヤーAがスキップの場合、自動的に決定済みにする
      this.playerADecided = true;
      console.log(`[updateUI] ターン${currentTurn}: プレイヤーAをスキップとして決定済みに設定`);
      // スキップしているプレイヤーのログを追加（重複を防ぐ）
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`プレイヤーA: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`プレイヤーA: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
    }
    if (skipB && !this.playerBDecided) {
      // プレイヤーBがスキップの場合、自動的に決定済みにする
      this.playerBDecided = true;
      console.log(`[updateUI] ターン${currentTurn}: プレイヤーBをスキップとして決定済みに設定`);
      // スキップしているプレイヤーのログを追加（重複を防ぐ）
      const playerBName = this.playerBIsCPU ? 'CPU' : 'プレイヤーB';
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`${playerBName}: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`${playerBName}: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
    }

    this.updateBoard();
    this.updateHands();
    this.updateGameInfo();
    this.updateScores();
    this.updateControls();
    
    // CPUの決定状態を表示
    this.updateCPUStatus();
    
    // 操作ログはクリアしない（ログを保持するため）
  }

  // CPUの決定状態を表示
  private updateCPUStatus(): void {
    const cpuInfo = document.getElementById('hand-b');
    if (!cpuInfo || !this.gameManager) return;

    // CPUの決定状態を表示
    const cpuStatus = cpuInfo.querySelector('.cpu-status');
    if (cpuStatus) {
      cpuStatus.remove();
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = 'cpu-status';
    if (this.playerBDecided) {
      statusDiv.textContent = '✅ CPU決定済み';
      statusDiv.style.color = '#4caf50';
      statusDiv.style.fontWeight = 'bold';
    } else {
      statusDiv.textContent = '⏳ CPU選択中...';
      statusDiv.style.color = '#ff9800';
    }
    cpuInfo.insertBefore(statusDiv, cpuInfo.firstChild);
  }

  private updateBoard(): void {
    if (!this.gameManager) return;

    const boardElement = document.getElementById('board');
    const columnLabelsElement = document.getElementById('board-column-labels');
    const rowLabelsElement = document.getElementById('board-row-labels');
    
    if (!boardElement || !columnLabelsElement || !rowLabelsElement) return;

    const board = this.gameManager.getBoard();
    const size = board.getSize();

    // 盤面のグリッド設定
    boardElement.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    boardElement.innerHTML = '';

    // 列番号（上）
    columnLabelsElement.innerHTML = '';
    for (let x = 0; x < size; x++) {
      const label = document.createElement('div');
      label.className = 'column-label';
      label.textContent = String.fromCharCode(65 + x); // A, B, C, D, E
      columnLabelsElement.appendChild(label);
    }

    // 行番号（左）
    rowLabelsElement.innerHTML = '';
    for (let y = 0; y < size; y++) {
      const label = document.createElement('div');
      label.className = 'row-label';
      label.textContent = (y + 1).toString(); // 1, 2, 3, 4, 5
      rowLabelsElement.appendChild(label);
    }

    // マスを生成
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = board.getCell(x, y);
        if (!cell) continue;

        const cellElement = document.createElement('div');
        cellElement.className = 'cell';
        cellElement.dataset.x = x.toString();
        cellElement.dataset.y = y.toString();

        const owner = cell.owner;
        if (owner === 'A') {
          cellElement.classList.add('player-a');
        } else if (owner === 'B') {
          cellElement.classList.add('player-b');
        } else {
          cellElement.classList.add('neutral');
        }

        const absStability = Math.abs(cell.stability);
        if (absStability > 0) {
          cellElement.classList.add(`stability-${absStability}`);
        }

        cellElement.textContent = cell.stability.toString();
        const positionStr = this.formatPosition(x, y);
        cellElement.title = `${positionStr} (${x}, ${y}) 安定度: ${cell.stability}`;

        // タイムボムの表示
        const timeBombs = this.gameManager.getTimeBombs();
        for (const bombData of timeBombs) {
          const bombPositions = this.getBombBlastArea(bombData.position);
          const isBombCenter = bombData.position.x === x && bombData.position.y === y;
          const isInBlastArea = bombPositions.some(p => p.x === x && p.y === y);
          
          if (isBombCenter) {
            // タイムボムの中心マス
            cellElement.classList.add('time-bomb-center');
            const bombInfo = document.createElement('div');
            bombInfo.className = 'time-bomb-info';
            bombInfo.textContent = `💣${bombData.remainingTurns}`;
            bombInfo.title = `タイムボム（プレイヤー${bombData.playerId}設置、残り${bombData.remainingTurns}ターンで爆発）`;
            cellElement.appendChild(bombInfo);
            cellElement.title = `${positionStr} (${x}, ${y}) 安定度: ${cell.stability} | タイムボム（残り${bombData.remainingTurns}ターン）`;
          } else if (isInBlastArea) {
            // 爆心地3×3内のマス
            cellElement.classList.add('time-bomb-blast-area');
          }
        }

        // クリックイベント（常に設定、条件はselectPosition内でチェック）
        cellElement.addEventListener('click', (e) => {
          e.stopPropagation();
          // 通常モード：プレイヤーAのみ
          if (this.devSettings.playerBIsCPU) {
            if (this.currentPlayer === 'A' && this.selectedCardId && !this.playerADecided) {
              this.selectPosition(x, y, 'A');
            }
          }
          // 開発者モード（プレイヤーBが手動の場合）
          else {
            // プレイヤーAのターンで、カードが選択されている場合
            if (this.currentPlayer === 'A' && this.selectedCardId && !this.playerADecided) {
              this.selectPosition(x, y, 'A');
            } 
            // プレイヤーBのターンで、カードが選択されている場合（手動モードのみ）
            else if (this.currentPlayer === 'B' && !this.playerBIsCPU) {
              // ダブルアクション中で1枚目のカードを決定した後、2枚目のカードを選択する場合
              const isDoubleActionB = this.gameManager ? this.gameManager.isDoubleActionActive('B') : false;
              const remainingB = this.gameManager ? this.gameManager.getDoubleActionRemaining('B') : 0;
              if (isDoubleActionB && remainingB > 1 && this.doubleActionFirstCardSelected && this.playerBSelectedCardId && !this.playerBDecided) {
                this.selectPosition(x, y, 'B');
              } else if (this.playerBSelectedCardId && !this.playerBDecided) {
                this.selectPosition(x, y, 'B');
              }
            }
          }
        });

        // ホバーイベント（カード選択中のみ、かつまだ位置を選択していない場合）
        const activePlayer = this.currentPlayer;
        let hasSelectedCard: boolean = false;
        let hasSelectedPosition: boolean = false;
        
        // 通常モード：プレイヤーAのみ
        if (this.devSettings.playerBIsCPU) {
          hasSelectedCard = activePlayer === 'A' && this.selectedCardId !== null && !this.playerADecided;
          hasSelectedPosition = activePlayer === 'A' && this.selectedPosition !== null;
        }
        // 開発者モード（プレイヤーBが手動の場合）
        else {
          hasSelectedCard = (activePlayer === 'A' && this.selectedCardId !== null && !this.playerADecided) || 
                           (activePlayer === 'B' && this.playerBSelectedCardId !== null && !this.playerBIsCPU && !this.playerBDecided);
          hasSelectedPosition = (activePlayer === 'A' && this.selectedPosition !== null) || 
                                (activePlayer === 'B' && this.playerBSelectedPosition !== null);
        }
        
        if (hasSelectedCard && !hasSelectedPosition) {
          cellElement.style.cursor = 'pointer';
          cellElement.addEventListener('mouseenter', () => {
            this.hoveredPosition = { x, y };
            this.updateCardTargets();
          });
          cellElement.addEventListener('mouseleave', () => {
            this.hoveredPosition = null;
            this.updateCardTargets();
          });
        } else {
          cellElement.style.cursor = hasSelectedCard ? 'pointer' : 'default';
        }

        boardElement.appendChild(cellElement);
      }
    }

    // 初期の適用範囲表示を更新
    this.updateCardTargets();
  }

  // 座標を文字列に変換（例：B2）
  private formatPosition(x: number, y: number): string {
    return `${String.fromCharCode(65 + x)}${y + 1}`;
  }

  // タイムボムの爆心地3×3エリアを取得
  private getBombBlastArea(center: Position): Position[] {
    const positions: Position[] = [];
    if (!this.gameManager) return positions;
    
    const board = this.gameManager.getBoard();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const pos = { x: center.x + dx, y: center.y + dy };
        if (board.isValidPosition(pos.x, pos.y)) {
          positions.push(pos);
        }
      }
    }
    return positions;
  }

  // 色カードのパターンを描画するSVGを作成
  private createColorCardPattern(cardId: string): HTMLElement {
    const container = document.createElement('div');
    container.className = 'color-card-pattern';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    // カード内に収まるようにサイズを調整（5×5グリッド + パディング）
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.width = '100%';
    svg.style.height = '60px'; // 固定高さでカード内に収まるように
    svg.style.maxWidth = '100%';
    
    const cellSize = 14; // セルサイズをさらに小さく
    const offset = 15; // オフセットを調整（中央寄せ）
    const gridSize = 5; // グリッドサイズ
    
    // パターンに応じてマスを塗る
    const pattern = this.getColorCardPattern(cardId);
    
    // グリッドの背景を描画
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(offset + x * cellSize));
        rect.setAttribute('y', String(offset + y * cellSize));
        rect.setAttribute('width', String(cellSize - 1));
        rect.setAttribute('height', String(cellSize - 1));
        rect.setAttribute('fill', '#f5f5f5');
        rect.setAttribute('stroke', '#ddd');
        rect.setAttribute('stroke-width', '0.5');
        svg.appendChild(rect);
      }
    }
    
    // パターンに応じてマスを塗る
    for (const pos of pattern) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(offset + pos.x * cellSize));
      rect.setAttribute('y', String(offset + pos.y * cellSize));
      rect.setAttribute('width', String(cellSize - 1));
      rect.setAttribute('height', String(cellSize - 1));
      rect.setAttribute('fill', '#667eea');
      rect.setAttribute('stroke', '#333');
      rect.setAttribute('stroke-width', '1');
      svg.appendChild(rect);
    }
    
    container.appendChild(svg);
    return container;
  }

  // 色カードIDからパターンを取得（中心を(2,2)とする5×5グリッド）
  private getColorCardPattern(cardId: string): Array<{ x: number; y: number }> {
    const centerX = 2;
    const centerY = 2;
    const pattern: Array<{ x: number; y: number }> = [];
    
    switch (cardId) {
      case 'C01': // 単点塗り
        pattern.push({ x: centerX, y: centerY });
        break;
        
      case 'C03': // 直線2マス（左右）
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX - 1, y: centerY });
        pattern.push({ x: centerX + 1, y: centerY });
        break;
        
      case 'C04': // 斜め2マス
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX - 1, y: centerY - 1 });
        break;
        
      case 'C06': // 角専用3マス（右下角）
        pattern.push({ x: 4, y: 4 });
        pattern.push({ x: 3, y: 4 });
        pattern.push({ x: 4, y: 3 });
        break;
        
      case 'C07': // 端専用3マス（下端）
        pattern.push({ x: centerX, y: 4 });
        pattern.push({ x: centerX, y: 3 });
        pattern.push({ x: centerX, y: 2 });
        break;
        
      case 'C09': // 敵色削り（単点）
        pattern.push({ x: centerX, y: centerY });
        break;
        
      case 'C10': // 上下2マス塗り
        pattern.push({ x: centerX, y: centerY - 1 });
        pattern.push({ x: centerX, y: centerY + 1 });
        break;
        
      case 'C11': // 十字塗り
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX, y: centerY - 1 });
        pattern.push({ x: centerX, y: centerY + 1 });
        pattern.push({ x: centerX - 1, y: centerY });
        pattern.push({ x: centerX + 1, y: centerY });
        break;
        
      case 'C12': // 斜め十字塗り
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX - 1, y: centerY - 1 });
        pattern.push({ x: centerX + 1, y: centerY - 1 });
        pattern.push({ x: centerX - 1, y: centerY + 1 });
        pattern.push({ x: centerX + 1, y: centerY + 1 });
        break;
        
      case 'C13': // 横三連
        pattern.push({ x: centerX - 1, y: centerY });
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX + 1, y: centerY });
        break;
        
      case 'C14': // 縦三連
        pattern.push({ x: centerX, y: centerY - 1 });
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX, y: centerY + 1 });
        break;
        
      case 'C15': // 2×2ブロック塗り
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX + 1, y: centerY });
        pattern.push({ x: centerX, y: centerY + 1 });
        pattern.push({ x: centerX + 1, y: centerY + 1 });
        break;
        
      case 'C16': // L字形成
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX + 1, y: centerY });
        pattern.push({ x: centerX, y: centerY + 1 });
        break;
        
      case 'C17': // T字形成（下向きT）
        pattern.push({ x: centerX, y: centerY });
        pattern.push({ x: centerX - 1, y: centerY });
        pattern.push({ x: centerX + 1, y: centerY });
        pattern.push({ x: centerX, y: centerY + 1 });
        break;
        
      case 'C21': // 横一列塗り
        for (let x = 0; x < 5; x++) {
          pattern.push({ x, y: centerY });
        }
        break;
        
      case 'C22': // 縦一列塗り
        for (let y = 0; y < 5; y++) {
          pattern.push({ x: centerX, y });
        }
        break;
        
      case 'C24': // 3×3ブロック塗り
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            pattern.push({ x: centerX + dx, y: centerY + dy });
          }
        }
        break;
        
      default:
        // デフォルトは単点
        pattern.push({ x: centerX, y: centerY });
        break;
    }
    
    return pattern;
  }

  // カードの適用範囲表示を更新（ホバー時はupdateBoardを呼ばずにこれだけ呼ぶ）
  private updateCardTargets(): void {
    if (!this.gameManager) {
      const boardElement = document.getElementById('board');
      if (boardElement) {
        boardElement.querySelectorAll('.card-target').forEach(el => {
          el.classList.remove('card-target');
        });
      }
      return;
    }

    const activePlayer = this.currentPlayer;
    let selectedCardId: string | null = null;
    let selectedCardIndex: number | null = null;
    let selectedPosition: { x: number; y: number } | null = null;
    let playerId: PlayerId = 'A';

    // ダブルアクション中に1枚目のカードが選択されている場合、その適用範囲も表示する必要がある
    const isDoubleActionA = this.gameManager.isDoubleActionActive('A');
    const isDoubleActionB = this.gameManager.isDoubleActionActive('B');
    const remainingA = this.gameManager.getDoubleActionRemaining('A');
    const remainingB = this.gameManager.getDoubleActionRemaining('B');
    
    // ダブルアクション中で1枚目のカードが選択されている場合、適用範囲を表示するために処理を続行
    // remainingが1以下でも、1枚目のカードが選択されている場合は表示し続ける
    const shouldShowFirstCard = (isDoubleActionA && remainingA >= 1 && this.doubleActionFirstSelection && activePlayer === 'A') ||
                                (isDoubleActionB && remainingB >= 1 && this.doubleActionFirstSelection && activePlayer === 'B' && !this.playerBIsCPU);
    
    // 通常モード：プレイヤーAのみ
    if (this.devSettings.playerBIsCPU) {
      if (activePlayer === 'A' && (this.selectedCardId && !this.playerADecided || shouldShowFirstCard)) {
        selectedCardId = this.selectedCardId;
        selectedCardIndex = null; // 通常モードではインデックス不要
        selectedPosition = this.selectedPosition;
        playerId = 'A';
      } else if (!shouldShowFirstCard) {
        // 全てのcard-targetクラスを削除
        const boardElement = document.getElementById('board');
        if (boardElement) {
          boardElement.querySelectorAll('.card-target').forEach(el => {
            el.classList.remove('card-target');
          });
        }
        return;
      }
    }
    // 開発者モード（プレイヤーBが手動の場合）
    else {
      if (activePlayer === 'A' && (this.selectedCardId && !this.playerADecided || shouldShowFirstCard)) {
        selectedCardId = this.selectedCardId;
        selectedCardIndex = null; // インデックスは使用しない
        selectedPosition = this.selectedPosition;
        playerId = 'A';
      } else if (activePlayer === 'B' && ((this.playerBSelectedCardId && !this.playerBIsCPU && !this.playerBDecided) || shouldShowFirstCard)) {
        selectedCardId = this.playerBSelectedCardId;
        selectedCardIndex = null;
        selectedPosition = this.playerBSelectedPosition;
        playerId = 'B';
      } else if (!shouldShowFirstCard) {
        // 全てのcard-targetクラスを削除
        const boardElement = document.getElementById('board');
        if (boardElement) {
          boardElement.querySelectorAll('.card-target').forEach(el => {
            el.classList.remove('card-target');
          });
        }
        return;
      }
    }
    
    const board = this.gameManager.getBoard();
    
    // 全てのcard-targetクラスを削除
    const boardElement = document.getElementById('board');
    if (!boardElement) return;

    boardElement.querySelectorAll('.card-target').forEach(el => {
      el.classList.remove('card-target');
    });

    // ダブルアクション中に1枚目のカードが選択されている場合、その適用範囲を表示
    // remainingが1以上の場合（1枚目を決定した後、2枚目を決定するまで）
    if (isDoubleActionA && remainingA >= 1 && this.doubleActionFirstSelection && activePlayer === 'A') {
      const playerA = this.gameManager.getPlayer('A');
      const handA = playerA.getHand();
      const firstCard = handA.find(c => c.getId() === this.doubleActionFirstSelection!.cardId);
      if (firstCard) {
        try {
          const firstTargetPositions = firstCard.getTargetPositions(board, this.doubleActionFirstSelection.targetPosition, 'A');
          firstTargetPositions.forEach((pos: Position) => {
            const cellElement = boardElement.querySelector(`[data-x="${pos.x}"][data-y="${pos.y}"]`);
            if (cellElement) {
              cellElement.classList.add('card-target');
            }
          });
        } catch (e) {
          // エラーは無視
        }
      }
    }
    
    if (isDoubleActionB && remainingB >= 1 && this.doubleActionFirstSelection && activePlayer === 'B' && !this.playerBIsCPU) {
      const playerB = this.gameManager.getPlayer('B');
      const handB = playerB.getHand();
      const firstCard = handB.find(c => c.getId() === this.doubleActionFirstSelection!.cardId);
      if (firstCard) {
        try {
          const firstTargetPositions = firstCard.getTargetPositions(board, this.doubleActionFirstSelection.targetPosition, 'B');
          firstTargetPositions.forEach((pos: Position) => {
            const cellElement = boardElement.querySelector(`[data-x="${pos.x}"][data-y="${pos.y}"]`);
            if (cellElement) {
              cellElement.classList.add('card-target');
            }
          });
        } catch (e) {
          // エラーは無視
        }
      }
    }

    // 選択されたカードがある場合、その適用範囲を表示
    if (selectedCardId) {
      const player = this.gameManager.getPlayer(playerId);
      const hand = player.getHand();
      
      // 選択されたカードを取得（最初に見つかったカード）
      const card = hand.find(c => c.getId() === selectedCardId) || null;
      
      if (card) {
        // 適用範囲を計算する位置を決定
        // 選択済みの位置がある場合はそれを使い、ない場合はホバー位置を使う
        const targetPosition = selectedPosition || this.hoveredPosition;
        
        if (targetPosition) {
          // canPlay()をチェックして、選択できないマスには適用範囲を表示しない
          let canPlayAtPosition = true;
          if (card.canPlay) {
            try {
              canPlayAtPosition = card.canPlay(board, targetPosition, playerId);
            } catch (e) {
              canPlayAtPosition = false;
            }
          }
          
          if (canPlayAtPosition) {
            // 適用範囲を計算
            let targetPositions: Position[] = [];
            try {
              targetPositions = card.getTargetPositions(board, targetPosition, playerId);
            } catch (e) {
              // エラーは無視
            }

            // 適用範囲のマスにcard-targetクラスを追加
            targetPositions.forEach((pos: Position) => {
              const cellElement = boardElement.querySelector(`[data-x="${pos.x}"][data-y="${pos.y}"]`);
              if (cellElement) {
                cellElement.classList.add('card-target');
              }
            });
          }
        }
      }
    }
  }

  private updateHands(): void {
    if (!this.gameManager) return;

    const handA = document.getElementById('hand-a');
    const handB = document.getElementById('hand-b');

    if (handA) {
      this.renderHand(handA, 'A');
    }
    if (handB) {
      const isCPU = this.playerBIsCPU;
      this.renderHand(handB, 'B', isCPU);
    }
  }

  private updateCardSelector(playerId: PlayerId): void {
    if (!this.gameManager) return;

    const selectorId = playerId === 'A' ? 'card-selector-a' : 'card-selector-b';
    const selector = document.getElementById(selectorId) as HTMLSelectElement;
    if (!selector) return;

    const player = this.gameManager.getPlayer(playerId);
    const hand = player.getHand();
    const usedCards = player.getUsedCards();

    // 現在の選択を保存
    const currentValue = selector.value;

    // セレクターをクリア
    selector.innerHTML = '<option value="">カードを選択してください</option>';

    // 手札のカードをグループ化（同じIDのカードをまとめる）
    const cardGroups = new Map<string, Card[]>();
    hand.forEach(card => {
      const id = card.getId();
      if (!cardGroups.has(id)) {
        cardGroups.set(id, []);
      }
      cardGroups.get(id)!.push(card);
    });

    // ソートして追加
    const sortedGroups = Array.from(cardGroups.entries()).sort(([idA], [idB]) => {
      const isColorA = idA.startsWith('C');
      const isColorB = idB.startsWith('C');
      if (isColorA && !isColorB) return -1;
      if (!isColorA && isColorB) return 1;
      const numA = parseInt(idA.substring(1));
      const numB = parseInt(idB.substring(1));
      return numA - numB;
    });

    sortedGroups.forEach(([cardId, cards]) => {
      const card = cards[0];
      const count = cards.length;
      const option = document.createElement('option');
      option.value = `${cardId}:${count > 1 ? '0' : ''}`; // 複数ある場合はインデックス0を指定
      option.textContent = `${card.getName()} (${cardId})${count > 1 ? ` ×${count}` : ''}`;
      selector.appendChild(option);

      // 同じカードが複数ある場合は、それぞれにオプションを追加
      if (count > 1) {
        for (let i = 1; i < count; i++) {
          const subOption = document.createElement('option');
          subOption.value = `${cardId}:${i}`;
          subOption.textContent = `${card.getName()} (${cardId}) #${i + 1}`;
          selector.appendChild(subOption);
        }
      }
    });

    // 前の選択を復元（可能な場合）
    if (currentValue) {
      selector.value = currentValue;
    }
  }

  private renderHand(container: HTMLElement, playerId: PlayerId, isCPU: boolean = false): void {
    if (!this.gameManager) return;

    container.innerHTML = '';
    
    if (isCPU) {
      const player = this.gameManager.getPlayer(playerId);
      const remaining = player.getRemainingCardCount();
      const cpuInfo = document.createElement('div');
      cpuInfo.className = 'cpu-info';
      cpuInfo.textContent = `CPU (残りカード: ${remaining}枚)`;
      container.appendChild(cpuInfo);
      return;
    }

    const player = this.gameManager.getPlayer(playerId);
    let hand = player.getHand();
    const usedCards = player.getUsedCards();

    // ダブルアクション中で1枚目のカードが決定済みの場合、そのカードを手札に追加して表示
    // remaining >= 1 の時（1枚目を決定した後、2枚目を決定するまで）は1枚目のカードを表示し続ける
    const isDoubleActionActive = this.gameManager.isDoubleActionActive(playerId);
    const remaining = this.gameManager.getDoubleActionRemaining(playerId);
    if (isDoubleActionActive && remaining >= 1 && this.doubleActionFirstSelection) {
      const firstCardId = this.doubleActionFirstSelection.cardId;
      // 1枚目のカードがusedCardsに含まれている場合（手札から除外されている場合）、手札に追加
      if (usedCards.has(firstCardId)) {
        const firstCard = player.getCardById(firstCardId);
        if (firstCard && !hand.find(c => c.getId() === firstCardId)) {
          // 手札に1枚目のカードを追加
          hand = [...hand, firstCard];
        }
      }
    }

    // 手札をソート：色カード → 強化カード → 特殊カードの順、それぞれ番号順
    const sortedHand = [...hand].sort((a, b) => {
      const idA = a.getId();
      const idB = b.getId();
      
      // カードの種類を判定
      const getCardCategory = (id: string): number => {
        if (id.startsWith('S')) return 3; // 特殊カード
        if (id.startsWith('F')) return 2; // 強化カード（Fxx）
        if (id.startsWith('C')) return 1; // 色カード（Cxx）
        return 4; // その他
      };
      
      const categoryA = getCardCategory(idA);
      const categoryB = getCardCategory(idB);
      
      // カテゴリで比較
      if (categoryA !== categoryB) {
        return categoryA - categoryB;
      }
      
      // 同じカテゴリなら番号で比較
      const numA = parseInt(idA.substring(1));
      const numB = parseInt(idB.substring(1));
      return numA - numB;
    });

    sortedHand.forEach(card => {
      const cardElement = document.createElement('div');
      cardElement.className = 'card';
      if (usedCards.has(card.getId())) {
        cardElement.classList.add('used');
      }
      // 選択状態を表示
      // 通常モード：プレイヤーAのみ、currentPlayerチェック
      if (this.devSettings.playerBIsCPU) {
        if (playerId === 'A' && this.selectedCardId === card.getId() && this.currentPlayer === playerId) {
          cardElement.classList.add('selected');
        }
      }
      // 開発者モード（プレイヤーBが手動の場合）
      else {
        if (playerId === 'A' && this.selectedCardId === card.getId() && !this.playerADecided) {
          cardElement.classList.add('selected');
        } else if (playerId === 'B' && this.playerBSelectedCardId === card.getId() && !this.playerBDecided && !this.playerBIsCPU) {
          cardElement.classList.add('selected');
        }
      }

      const header = document.createElement('div');
      header.className = 'card-header';

      const idSpan = document.createElement('span');
      idSpan.className = 'card-id';
      idSpan.textContent = card.getId();

      const typeSpan = document.createElement('span');
      // カードの種類を判定して表示
      const cardIdForType = card.getId();
      let typeText = '特殊';
      let typeClass = 'special';
      if (cardIdForType.startsWith('C')) {
        typeText = '色';
        typeClass = 'color';
      } else if (cardIdForType.startsWith('F')) {
        typeText = '強化';
        typeClass = 'fort';
      }
      typeSpan.className = `card-type ${typeClass}`;
      typeSpan.textContent = typeText;

      // カードの強さ（★）を表示
      const strengthSpan = document.createElement('span');
      strengthSpan.className = 'card-strength';
      let strengthText = '';
      if (cardIdForType.startsWith('C')) {
        const num = parseInt(cardIdForType.substring(1));
        // 色カードの強さ
        if ([1, 3, 4, 6, 7, 9, 10].includes(num)) {
          strengthText = '★☆☆';
        } else if ([11, 12, 13, 14, 15, 16, 17].includes(num)) {
          strengthText = '★★☆';
        } else if ([21, 22, 24].includes(num)) {
          strengthText = '★★★';
        }
      } else if (cardIdForType.startsWith('F')) {
        const num = parseInt(cardIdForType.substring(1));
        // 強化カードの強さ
        if ([1, 2, 3].includes(num)) {
          strengthText = '★☆☆';
        } else if ([4, 5, 6].includes(num)) {
          strengthText = '★★☆';
        } else if ([7, 8, 9, 10, 11, 12, 13].includes(num)) {
          strengthText = '★★★';
        }
      }
      if (strengthText) {
        strengthSpan.textContent = strengthText;
        header.appendChild(strengthSpan);
      }

      header.appendChild(idSpan);
      header.appendChild(typeSpan);

      const nameDiv = document.createElement('div');
      nameDiv.className = 'card-name';
      nameDiv.textContent = card.getName();

      const descDiv = document.createElement('div');
      descDiv.className = 'card-description';
      
      // 色カードの場合は図で表示、それ以外はテキストで表示
      const isColorCard = card.getType() === 'color';
      let description = card.getDescription();
      let turnInfo: string | null = null;
      let isEffectChanged = false;
      
      if (this.gameManager) {
        const currentTurn = this.gameManager.getCurrentTurn();
        const totalTurns = this.gameManager.getTotalTurns();
        const remainingTurns = this.gameManager.getRemainingTurns();
        const cardId = card.getId();
        
        if (cardId === 'S01') {
          // S01: リバーサル・フィールド
          // 有効ターン数 = 全ターン数 - 3
          // 有効ターン数まで: 全反転効果
          // それ以降: C01と同じ効果
          const effectiveTurns = totalTurns - 3;
          if (currentTurn <= effectiveTurns) {
            const turnsUntilChange = effectiveTurns + 1 - currentTurn;
            turnInfo = `【全反転効果】残り${turnsUntilChange}ターンで効果切替`;
            description = '使用時点の盤面を記録し、有効ターン内なら全マスの安定度符号を反転';
          } else {
            isEffectChanged = true;
            description = '任意のマス1つの安定度を+1（C01：単点塗りと同じ効果）';
            turnInfo = '【効果切替済み】C01と同じ効果';
          }
        } else if (cardId === 'S09') {
          // S09: ラストフォートレス
          // 残り4ターン以上: 早期使用モード
          // 残り3ターン以内: 覚醒状態
          if (remainingTurns >= 4) {
            const turnsUntilChange = remainingTurns - 3;
            turnInfo = `【早期使用モード】残り${turnsUntilChange}ターンで覚醒`;
            description = '自色連結領域を対象。ランダム1〜3マス+1';
          } else {
            isEffectChanged = true;
            turnInfo = '【覚醒状態】領域を要塞化し、他をリセット';
            description = '自色連結領域を対象。領域内の自色マスを2倍、領域外の自色マスをリセット';
          }
        } else if (cardId === 'S04') {
          // S04: ダブルアクション
          // S04を除く残り手札の色カードが1枚以下の場合、C01と同じ効果になる
          const player = this.gameManager.getPlayer(playerId);
          const hand = player.getHand();
          const remainingColorCards = hand.filter(c => {
            const id = c.getId();
            // 色カードはCxx（Fxxは強化カードなので除外）
            return id !== 'S04' && id.startsWith('C');
          });
          
          if (remainingColorCards.length <= 1) {
            // C01と同じ説明に変更
            description = '任意のマス1つの安定度を+1';
            isEffectChanged = true;
          }
        }
      }
      
      // 色カードの場合は図で表示、それ以外はテキストで表示
      if (isColorCard) {
        // 色カードのパターンを描画
        const patternDiv = this.createColorCardPattern(card.getId());
        descDiv.appendChild(patternDiv);
        // マウスホバー時に元の説明文を表示
        descDiv.title = description;
        cardElement.title = `${card.getName()} (${card.getId()})\n${description}`;
      } else {
        // 強化カード・特殊カードはテキストで表示
        if (turnInfo) {
          descDiv.innerHTML = `<div class="card-desc-main">${description}</div><div class="card-turn-info ${isEffectChanged ? 'effect-changed' : ''}">${turnInfo}</div>`;
        } else {
          descDiv.textContent = description;
        }
      }
      
      // 効果が切り替わった場合、カードに視覚的なマークを追加
      if (isEffectChanged) {
        cardElement.classList.add('effect-changed');
      }

      cardElement.appendChild(header);
      cardElement.appendChild(nameDiv);
      cardElement.appendChild(descDiv);

      // ダブルアクション中は特殊カードと強化カードを選択不可
      const isDoubleActionActive = this.gameManager ? this.gameManager.isDoubleActionActive(playerId) : false;
      const remaining = this.gameManager ? this.gameManager.getDoubleActionRemaining(playerId) : 0;
      const isSpecialCard = card.getType() === 'special';
      // 強化カードかどうかを判定（Fxxで始まるID）
      const cardIdForCheck = card.getId();
      const isFortCard = cardIdForCheck.startsWith('F');
      
      // スキップフラグをチェック
      const isSkipped = this.gameManager ? this.gameManager.isSkipNextTurn(playerId) : false;
      
      // 1枚目で選択したカードを選択不可にする（表示はされる）
      // remaining >= 1 の時（1枚目を決定した後、2枚目を決定するまで）は1枚目のカードを選択不可にする
      let isFirstCardUsed = false;
      if (isDoubleActionActive && remaining >= 1 && this.doubleActionFirstSelection) {
        if (playerId === 'A' && this.doubleActionFirstSelection.cardId === card.getId()) {
          isFirstCardUsed = true;
        } else if (playerId === 'B' && this.doubleActionFirstSelection.cardId === card.getId()) {
          isFirstCardUsed = true;
        }
      }
      
      const isDisabled = isSkipped || (isDoubleActionActive && (isSpecialCard || isFortCard)) || isFirstCardUsed;
      
      if (isDisabled) {
        cardElement.classList.add('disabled');
        cardElement.style.opacity = '0.5';
        cardElement.style.cursor = 'not-allowed';
      }

      // クリックイベント
      // 通常モード：プレイヤーAのみ、currentPlayerチェック
      if (this.devSettings.playerBIsCPU) {
        if (this.currentPlayer === playerId && !usedCards.has(card.getId()) && !isDisabled) {
          cardElement.addEventListener('click', () => this.selectCard(card.getId(), playerId));
        }
      }
      // 開発者モード（プレイヤーBが手動の場合）
      else {
        if (playerId === 'A' && !usedCards.has(card.getId()) && !this.playerADecided && !isDisabled) {
          cardElement.addEventListener('click', () => this.selectCard(card.getId(), playerId));
        } else if (playerId === 'B' && !this.playerBIsCPU && !usedCards.has(card.getId()) && !this.playerBDecided && !isDisabled) {
          cardElement.addEventListener('click', () => this.selectCard(card.getId(), playerId));
        }
      }

      container.appendChild(cardElement);
    });
  }

  private updateGameInfo(): void {
    if (!this.gameManager) return;

    const turnCounter = document.getElementById('turn-counter');
    const totalTurns = document.getElementById('total-turns');
    const gameState = document.getElementById('game-state');

    if (turnCounter) {
      turnCounter.textContent = this.gameManager.getCurrentTurn().toString();
    }
    if (totalTurns) {
      totalTurns.textContent = this.gameManager.getTotalTurns().toString();
    }
    if (gameState) {
      const state = this.gameManager.getState();
      let stateText = '';
      if (this.showingReveal) {
        stateText = '公開フェーズ - 両方の選択を確認中...';
      } else if (state === 'selecting') {
        if (this.playerADecided && this.playerBDecided) {
          stateText = '両方決定済み - 公開フェーズへ...';
        } else if (this.playerADecided && !this.playerBDecided) {
          if (this.playerBIsCPU) {
            stateText = 'あなたは決定済み - CPUの決定を待っています...';
          } else {
            stateText = 'プレイヤーAは決定済み - プレイヤーBの決定を待っています...';
          }
        } else if (!this.playerADecided && this.playerBDecided) {
          if (this.playerBIsCPU) {
            stateText = 'CPUは決定済み - あなたの決定を待っています...';
          } else {
            stateText = 'プレイヤーBは決定済み - プレイヤーAの決定を待っています...';
          }
        } else {
          if (this.currentPlayer === 'A') {
            stateText = 'プレイヤーAのターン - カードと位置を選択してください';
          } else {
            stateText = 'プレイヤーBのターン - カードと位置を選択してください';
          }
        }
      } else {
        const stateTextMap: Record<string, string> = {
          'setup': '準備中',
          'resolving': '解決中',
          'finished': '終了'
        };
        stateText = stateTextMap[state] || state;
      }
      gameState.textContent = stateText;
    }

    // ダブルアクション状態を更新
    this.updatePlayerStatus();
  }

  private clearActionLog(): void {
    const actionLog = document.getElementById('action-log');
    if (actionLog) {
      actionLog.innerHTML = '';
    }
  }

  private addActionLog(message: string, isHeader: boolean = false): void {
    const actionLog = document.getElementById('action-log');
    if (!actionLog) {
      console.error('action-log element not found');
      return;
    }
    
    const logEntry = document.createElement('div');
    if (isHeader) {
      logEntry.className = 'log-header';
    } else {
      logEntry.className = 'log-entry';
    }
    logEntry.textContent = message;
    
    // 新しいログを上から追加（先頭に挿入）
    if (actionLog.firstChild) {
      actionLog.insertBefore(logEntry, actionLog.firstChild);
    } else {
      actionLog.appendChild(logEntry);
    }
    
    // スクロールを最上部に
    actionLog.scrollTop = 0;
  }

  private addTurnHeader(turnNumber: number): void {
    this.addActionLog(`━━━ ターン ${turnNumber} ━━━`, true);
  }

  private updatePlayerStatus(): void {
    if (!this.gameManager) return;

    const playerAStatus = document.getElementById('player-a-status');
    const playerBStatus = document.getElementById('player-b-status');

    // プレイヤーAの状態
    if (playerAStatus) {
      const statusMessages: string[] = [];
      
      if (this.gameManager.isDoubleActionActive('A')) {
        const remaining = this.gameManager.getDoubleActionRemaining('A');
        statusMessages.push(`⚡ ダブルアクション有効（残り${remaining}回、色カードのみ使用可能）`);
      }
      
      if (this.gameManager.isSkipNextTurn('A')) {
        statusMessages.push('⏸️ 次ターンは行動スキップ');
      }
      
      playerAStatus.textContent = statusMessages.join(' | ');
      playerAStatus.style.display = statusMessages.length > 0 ? 'block' : 'none';
    }

    // プレイヤーB（CPU）の状態
    if (playerBStatus) {
      const statusMessages: string[] = [];
      
      if (this.gameManager.isDoubleActionActive('B')) {
        const remaining = this.gameManager.getDoubleActionRemaining('B');
        statusMessages.push(`⚡ ダブルアクション有効（残り${remaining}回）`);
      }
      
      if (this.gameManager.isSkipNextTurn('B')) {
        statusMessages.push('⏸️ 次ターンは行動スキップ');
      }
      
      playerBStatus.textContent = statusMessages.join(' | ');
      playerBStatus.style.display = statusMessages.length > 0 ? 'block' : 'none';
    }
  }

  private updateScores(): void {
    if (!this.gameManager) return;

    const scoreA = document.getElementById('score-a');
    const scoreB = document.getElementById('score-b');

    if (scoreA) {
      const score = this.gameManager.calculateScores().playerAScore;
      scoreA.textContent = score.toString();
    }
    if (scoreB) {
      const score = this.gameManager.calculateScores().playerBScore;
      scoreB.textContent = score.toString();
    }
  }

  private updateControls(): void {
    if (!this.gameManager) return;

    const resolveBtn = document.getElementById('resolve-btn') as HTMLButtonElement;
    if (resolveBtn) {
      const state = this.gameManager.getState();
      const activePlayer = this.currentPlayer;
      const isDoubleActionA = this.gameManager.isDoubleActionActive('A');
      const isDoubleActionB = this.gameManager.isDoubleActionActive('B');
      const remainingA = this.gameManager.getDoubleActionRemaining('A');
      const remainingB = this.gameManager.getDoubleActionRemaining('B');
      
      let canResolve = false;
      // 通常モード：プレイヤーAのみ
      if (this.devSettings.playerBIsCPU) {
        const playerAReady = this.selectedCardId !== null && this.selectedPosition !== null;
        canResolve = playerAReady && state === 'selecting' && !this.playerADecided;
        
        // ダブルアクション中で1枚目のカードが未決定の場合、「次のカードを選択する」に変更
        if (isDoubleActionA && remainingA > 1 && !this.doubleActionFirstCardSelected) {
          resolveBtn.textContent = '次のカードを選択する';
        } else {
          resolveBtn.textContent = '決定';
        }
      }
      // 開発者モード（プレイヤーBが手動の場合）
      else {
        if (activePlayer === 'A') {
          const playerAReady = this.selectedCardId !== null && this.selectedPosition !== null;
          canResolve = playerAReady && state === 'selecting' && !this.playerADecided;
          
          // ダブルアクション中で1枚目のカードが未決定の場合、「次のカードを選択する」に変更
          if (isDoubleActionA && remainingA > 1 && !this.doubleActionFirstCardSelected) {
            resolveBtn.textContent = '次のカードを選択する';
          } else {
            resolveBtn.textContent = '決定';
          }
        } else if (activePlayer === 'B' && !this.playerBIsCPU) {
          const playerBReady = this.playerBSelectedCardId !== null && this.playerBSelectedPosition !== null;
          canResolve = playerBReady && state === 'selecting' && !this.playerBDecided;
          
          // ダブルアクション中で1枚目のカードが未決定の場合、「次のカードを選択する」に変更
          if (isDoubleActionB && remainingB > 1 && !this.doubleActionFirstCardSelected) {
            resolveBtn.textContent = '次のカードを選択する';
          } else {
            resolveBtn.textContent = '決定（プレイヤーB）';
          }
        } else {
          resolveBtn.textContent = '決定';
        }
      }
      
      resolveBtn.disabled = !canResolve || this.gameManager.areBothPlayersReady();
    }

    // 「選びなおす」ボタンの表示制御
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      const isDoubleActionA = this.gameManager.isDoubleActionActive('A');
      const isDoubleActionB = this.gameManager.isDoubleActionActive('B');
      const remainingA = this.gameManager.getDoubleActionRemaining('A');
      const remainingB = this.gameManager.getDoubleActionRemaining('B');
      const activePlayer = this.currentPlayer;
      
      // 1枚目のカードを決定した後、2枚目のカードを選択中の場合に表示
      // remaining >= 1 の時（1枚目を決定した後、2枚目を決定するまで）は「選びなおす」ボタンを表示
      const showRetry = (isDoubleActionA && remainingA >= 1 && this.doubleActionFirstCardSelected && activePlayer === 'A') ||
                        (isDoubleActionB && remainingB >= 1 && this.doubleActionFirstCardSelected && activePlayer === 'B' && !this.playerBIsCPU);
      
      if (showRetry) {
        retryBtn.classList.remove('hidden');
      } else {
        retryBtn.classList.add('hidden');
      }
    }
  }

  // 1枚目のカード選択を取り消し
  private cancelFirstCard(): void {
    if (!this.gameManager) return;

    const activePlayer = this.currentPlayer;
    
    if (activePlayer === 'A') {
      if (this.gameManager.isDoubleActionActive('A')) {
        const remaining = this.gameManager.getDoubleActionRemaining('A');
        // remaining >= 1 の時（1枚目を決定した後、2枚目を決定するまで）はキャンセル可能
        if (remaining >= 1 && this.doubleActionFirstCardSelected) {
          // 選択をキャンセル
          if (this.gameManager.cancelCardSelection('A')) {
            this.selectedCardId = null;
            this.selectedPosition = null;
            this.playerADecided = false;
            this.doubleActionFirstCardSelected = false;
            this.doubleActionFirstSelection = null;
            this.updateUI();
          }
        }
      }
    } else if (activePlayer === 'B' && !this.playerBIsCPU) {
      if (this.gameManager.isDoubleActionActive('B')) {
        const remaining = this.gameManager.getDoubleActionRemaining('B');
        // remaining >= 1 の時（1枚目を決定した後、2枚目を決定するまで）はキャンセル可能
        if (remaining >= 1 && this.doubleActionFirstCardSelected) {
          // 選択をキャンセル
          if (this.gameManager.cancelCardSelection('B')) {
            this.playerBSelectedCardId = null;
            this.playerBSelectedPosition = null;
            this.playerBDecided = false;
            this.doubleActionFirstCardSelected = false;
            this.doubleActionFirstSelection = null;
            this.updateUI();
          }
        }
      }
    }
  }

  private selectCard(cardId: string, playerId: PlayerId): void {
    if (!this.gameManager) return;

    // スキップフラグをチェック
    if (playerId === 'A' && this.gameManager.isSkipNextTurn('A')) {
      // プレイヤーAがスキップしている場合は選択不可
      console.log(`[selectCard] プレイヤーAがスキップ中なので、カード選択を拒否: ${cardId}`);
      return;
    }
    if (playerId === 'B' && this.gameManager.isSkipNextTurn('B')) {
      // プレイヤーBがスキップしている場合は選択不可
      console.log(`[selectCard] プレイヤーBがスキップ中なので、カード選択を拒否: ${cardId}`);
      return;
    }

    // 通常モード：プレイヤーAのみ、currentPlayerチェック
    if (this.devSettings.playerBIsCPU) {
      if (this.currentPlayer !== playerId || playerId !== 'A') return;
      this.selectedCardId = cardId;
      this.selectedCardIndex = null; // 通常モードではインデックス不要
      this.selectedPosition = null;
      this.hoveredPosition = null;
    } 
    // 開発者モード（プレイヤーBが手動の場合）
    else {
      if (playerId === 'A' && !this.playerADecided) {
        this.selectedCardId = cardId;
        this.selectedCardIndex = null;
        this.selectedPosition = null;
        this.hoveredPosition = null;
        // プレイヤーAのターンに切り替え（カード選択時）
        this.currentPlayer = 'A';
      } else if (playerId === 'B' && !this.playerBIsCPU) {
        // ダブルアクション中で1枚目のカードが決定済みの場合、2枚目のカードを選択できる
        const isDoubleActionB = this.gameManager.isDoubleActionActive('B');
        const remainingB = this.gameManager.getDoubleActionRemaining('B');
        if (isDoubleActionB && remainingB > 1 && this.doubleActionFirstCardSelected) {
          // 2枚目のカードを選択
          this.playerBSelectedCardId = cardId;
          this.playerBSelectedCardIndex = null;
          this.playerBSelectedPosition = null;
          this.hoveredPosition = null;
          this.currentPlayer = 'B';
        } else if (!this.playerBDecided) {
          this.playerBSelectedCardId = cardId;
          this.playerBSelectedCardIndex = null;
          this.playerBSelectedPosition = null;
          this.hoveredPosition = null;
          // プレイヤーBのターンに切り替え（カード選択時）
          this.currentPlayer = 'B';
        }
      }
    }

    this.updateUI();
  }

  private selectPosition(x: number, y: number, playerId: PlayerId): void {
    if (!this.gameManager) return;

    // スキップフラグをチェック
    if (playerId === 'A' && this.gameManager.isSkipNextTurn('A')) {
      // プレイヤーAがスキップしている場合は位置選択不可
      return;
    }
    if (playerId === 'B' && this.gameManager.isSkipNextTurn('B')) {
      // プレイヤーBがスキップしている場合は位置選択不可
      return;
    }

    // 選択されたカードを取得してcanPlay()をチェック
    let selectedCardId: string | null = null;
    if (playerId === 'A') {
      selectedCardId = this.selectedCardId;
    } else if (playerId === 'B') {
      // ダブルアクション中で1枚目のカードが決定済みの場合、2枚目のカードをチェック
      const isDoubleActionB = this.gameManager.isDoubleActionActive('B');
      const remainingB = this.gameManager.getDoubleActionRemaining('B');
      if (isDoubleActionB && remainingB > 1 && this.doubleActionFirstCardSelected) {
        selectedCardId = this.playerBSelectedCardId;
      } else {
        selectedCardId = this.playerBSelectedCardId;
      }
    }

    if (!selectedCardId) return;

    // カードを取得してcanPlay()をチェック
    const player = this.gameManager.getPlayer(playerId);
    const hand = player.getHand();
    const card = hand.find(c => c.getId() === selectedCardId);
    
    if (card && card.canPlay) {
      const board = this.gameManager.getBoard();
      const canPlayAtPosition = card.canPlay(board, { x, y }, playerId);
      if (!canPlayAtPosition) {
        // この位置には配置できない
        return;
      }
    }

    // 通常モード：プレイヤーAのみ
    if (this.devSettings.playerBIsCPU) {
      if (playerId !== 'A' || !this.selectedCardId) return;
      this.selectedPosition = { x, y };
      this.hoveredPosition = null;
      this.updateCardTargets();
      this.updateUI();
    }
    // 開発者モード（プレイヤーBが手動の場合）
    else {
      if (playerId === 'A') {
        if (!this.selectedCardId) return;
        this.selectedPosition = { x, y };
        this.hoveredPosition = null;
        this.updateCardTargets();
        this.updateUI();
      } else if (playerId === 'B' && !this.playerBIsCPU) {
        // ダブルアクション中で1枚目のカードが決定済みの場合、2枚目のカードの位置を選択できる
        const isDoubleActionB = this.gameManager.isDoubleActionActive('B');
        const remainingB = this.gameManager.getDoubleActionRemaining('B');
        if (isDoubleActionB && remainingB > 1 && this.doubleActionFirstCardSelected) {
          // 2枚目のカードの位置を選択
          if (!this.playerBSelectedCardId) return;
          this.playerBSelectedPosition = { x, y };
          this.hoveredPosition = null;
          this.updateCardTargets();
          this.updateUI();
        } else if (!this.playerBSelectedCardId) {
          return;
        } else {
          this.playerBSelectedPosition = { x, y };
          this.hoveredPosition = null;
          this.updateCardTargets();
          this.updateUI();
        }
      }
    }
  }

  // プレイヤーAが決定
  private playerADecide(): void {
    if (!this.gameManager || this.playerADecided) return;
    if (!this.selectedCardId || !this.selectedPosition) return;

    // スキップフラグをチェック
    if (this.gameManager.isSkipNextTurn('A')) {
      // プレイヤーAがスキップしている場合は決定不可
      console.log(`[playerADecide] プレイヤーAがスキップ中なので、決定を拒否: ${this.selectedCardId}`);
      return;
    }

    // 選択されたカードを取得（最初に見つかったカード）
    const player = this.gameManager.getPlayer('A');
    const hand = player.getHand();
    const selectedCard = hand.find(c => c.getId() === this.selectedCardId) || null;
    
    if (!selectedCard) return;

    // ダブルアクション中は色カード（Color Cards）のみ選択可能（強化カードFxxは不可）
    if (this.gameManager.isDoubleActionActive('A')) {
      const cardIdForCheck = selectedCard.getId();
      // 色カードはCxx（Fxxは強化カードなので不可）
      if (!cardIdForCheck.startsWith('C')) {
        alert('ダブルアクション中は色カードのみ使用できます');
        return;
      }
    }

    // 選択をGameManagerに記録
    const selection: CardSelection = {
      cardId: this.selectedCardId as any,
      targetPosition: this.selectedPosition
    };

    if (!this.gameManager.selectCard('A', selection)) {
      // 選択失敗
      return;
    }

    this.playerADecided = true;
    
    // ダブルアクション中で、まだ残り回数がある場合は、2枚目のカードを選択できるようにする
    if (this.gameManager.isDoubleActionActive('A')) {
      const remaining = this.gameManager.getDoubleActionRemaining('A');
      if (remaining > 1) {
        // 1枚目のカードが選択されたことを記録
        this.doubleActionFirstCardSelected = true;
        this.doubleActionFirstSelection = selection; // 1枚目の選択を保存
        // 決定後は適用範囲を非表示しない（1枚目の適用範囲を表示し続ける）
        this.hoveredPosition = null;
        // UIを更新して、2枚目のカードを選択できることを示す
        this.updateUI();
        this.updateCardTargets(); // 1枚目の適用範囲を表示
        // 1枚目のカードを処理してremainingを減らすため、checkBothDecidedを呼ぶ
        // ただし、この時点ではCPUがまだ決定していない可能性があるため、
        // areBothPlayersReady()がtrueを返すかどうかはGameManager側で判断される
        this.checkBothDecided();
        // 2枚目のカードを選択できるように、選択状態をリセット
        this.selectedCardId = null;
        this.selectedPosition = null;
        this.playerADecided = false;
        return;
      }
    }
    
    // 決定後は適用範囲を非表示
    this.hoveredPosition = null;
    this.updateCardTargets();
    
    this.updateUI();
    this.checkBothDecided();
  }

  // プレイヤーBが決定（手動の場合）
  private playerBDecide(): void {
    if (!this.gameManager || this.playerBDecided || this.playerBIsCPU) return;
    if (!this.playerBSelectedCardId || !this.playerBSelectedPosition) return;

    // スキップフラグをチェック
    if (this.gameManager.isSkipNextTurn('B')) {
      // プレイヤーBがスキップしている場合は決定不可
      return;
    }

    // 選択されたカードを取得（インデックスを使用）
    const player = this.gameManager.getPlayer('B');
    const hand = player.getHand();
    const cardsWithId = hand.filter(c => c.getId() === this.playerBSelectedCardId);
    const selectedCard = cardsWithId[this.playerBSelectedCardIndex || 0];
    
    if (!selectedCard) return;

    // ダブルアクション中は色カード（Color Cards）のみ選択可能（強化カードFxxは不可）
    if (this.gameManager.isDoubleActionActive('B')) {
      const cardIdForCheck = selectedCard.getId();
      // 色カードはCxx（Fxxは強化カードなので不可）
      if (!cardIdForCheck.startsWith('C')) {
        alert('ダブルアクション中は色カードのみ使用できます');
        return;
      }
    }

    // 選択をGameManagerに記録
    const selection: CardSelection = {
      cardId: this.playerBSelectedCardId as any,
      targetPosition: this.playerBSelectedPosition
    };

    if (!this.gameManager.selectCard('B', selection)) {
      // 選択失敗
      return;
    }

    this.playerBDecided = true;
    
    // ダブルアクション中で、まだ残り回数がある場合は、2枚目のカードを選択できるようにする
    if (this.gameManager.isDoubleActionActive('B')) {
      const remaining = this.gameManager.getDoubleActionRemaining('B');
      if (remaining > 1) {
        // 1枚目のカードが選択されたことを記録
        this.doubleActionFirstCardSelected = true;
        this.doubleActionFirstSelection = selection; // 1枚目の選択を保存
        // 決定後は適用範囲を非表示しない（1枚目の適用範囲を表示し続ける）
        this.hoveredPosition = null;
        // UIを更新して、2枚目のカードを選択できることを示す
        this.updateUI();
        this.updateCardTargets(); // 1枚目の適用範囲を表示
        // 1枚目のカードを処理してremainingを減らすため、checkBothDecidedを呼ぶ
        this.checkBothDecided();
        // 2枚目のカードを選択できるように、選択状態をリセット
        this.playerBSelectedCardId = null;
        this.playerBSelectedPosition = null;
        this.playerBDecided = false;
        return;
      }
    }
    
    // 決定後は適用範囲を非表示
    this.hoveredPosition = null;
    this.updateCardTargets();
    
    this.updateUI();
    this.checkBothDecided();
  }

  // 両方が決定したかチェック
  private checkBothDecided(): void {
    if (!this.gameManager) return;
    
    console.log(`[checkBothDecided] 呼ばれました: playerADecided=${this.playerADecided}, playerBDecided=${this.playerBDecided}`);
    
    // スキップフラグをチェックして、スキップしているプレイヤーを決定済みにする
    const skipA = this.gameManager.isSkipNextTurn('A');
    const skipB = this.gameManager.isSkipNextTurn('B');
    const currentTurn = this.gameManager.getCurrentTurn();
    
    console.log(`[checkBothDecided] ターン${currentTurn}: skipA=${skipA}, skipB=${skipB}`);
    
    if (skipA && !this.playerADecided) {
      // プレイヤーAがスキップの場合、自動的に決定済みにする
      this.playerADecided = true;
      // スキップしているプレイヤーのログを追加（重複を防ぐ）
      const currentTurn = this.gameManager.getCurrentTurn();
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`プレイヤーA: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`プレイヤーA: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
    }
    if (skipB && !this.playerBDecided) {
      // プレイヤーBがスキップの場合、自動的に決定済みにする
      this.playerBDecided = true;
      // スキップしているプレイヤーのログを追加（重複を防ぐ）
      const currentTurn = this.gameManager.getCurrentTurn();
      const playerBName = this.playerBIsCPU ? 'CPU' : 'プレイヤーB';
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`${playerBName}: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`${playerBName}: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
    }
    
    // ダブルアクション中の場合、2枚目のカードを決定した後も公開フェーズへ移行する必要がある
    const isDoubleActionA = this.gameManager.isDoubleActionActive('A');
    const isDoubleActionB = this.gameManager.isDoubleActionActive('B');
    const remainingA = this.gameManager.getDoubleActionRemaining('A');
    const remainingB = this.gameManager.getDoubleActionRemaining('B');
    
    // ダブルアクション中で1枚目のカードが選択されている場合の処理
    // この場合は、両方が決定済みでも公開フェーズへ移行しない（remaining > 1の場合）
    if (isDoubleActionA && this.doubleActionFirstSelection && remainingA > 1) {
      // 1枚目のカードを決定した直後は、resolveTurnを呼んでremainingを減らす
      // この時点では公開フェーズへ移行しない
      // プレイヤーAが先に決定した場合でも、プレイヤーBが決定するまで待つ
      if (this.playerADecided && !this.showingReveal) {
        // プレイヤーBも決定済みの場合のみresolveTurnを呼ぶ
        if (this.playerBDecided && this.gameManager.areBothPlayersReady()) {
          this.gameManager.resolveTurn();
          this.updateUI();
        }
        // プレイヤーBがまだ決定していない場合は、そのまま待つ
        return;
      }
      // プレイヤーAがまだ決定していない場合は、通常の処理を続ける
      return;
    }
    
    if (isDoubleActionB && this.doubleActionFirstSelection && remainingB > 1) {
      // 1枚目のカードを決定した直後は、resolveTurnを呼んでremainingを減らす
      // この時点では公開フェーズへ移行しない
      // プレイヤーBが先に決定した場合でも、プレイヤーAが決定するまで待つ
      if (this.playerBDecided && !this.showingReveal) {
        // プレイヤーAも決定済みの場合のみresolveTurnを呼ぶ
        if (this.playerADecided && this.gameManager.areBothPlayersReady()) {
          this.gameManager.resolveTurn();
          this.updateUI();
        }
        // プレイヤーAがまだ決定していない場合は、そのまま待つ
        return;
      }
      // プレイヤーBがまだ決定していない場合は、通常の処理を続ける
      return;
    }
    
    // 通常の場合（ダブルアクション中でない、または1枚目のカードが選択されていない場合）
    // または、ダブルアクション中で2枚目のカードを決定した後（remainingが1以下）
    if (this.playerADecided && this.playerBDecided && !this.showingReveal) {
      console.log(`[checkBothDecided] 両方が決定済み: playerADecided=${this.playerADecided}, playerBDecided=${this.playerBDecided}, skipA=${skipA}, skipB=${skipB}`);
      
      // 両方のプレイヤーがスキップしている場合は、公開フェーズをスキップして直接解決フェーズへ
      if (skipA && skipB) {
        console.log(`[checkBothDecided] 両方がスキップなので、直接resolvePhase()を呼ぶ`);
        setTimeout(() => {
          this.resolvePhase();
        }, 100);
        return;
      }
      
      // 片方だけがスキップしている場合も、公開フェーズをスキップして直接解決フェーズへ
      if (skipA || skipB) {
        console.log(`[checkBothDecided] 片方がスキップなので、直接resolvePhase()を呼ぶ (skipA=${skipA}, skipB=${skipB})`);
        setTimeout(() => {
          this.resolvePhase();
        }, 100);
        return;
      }
      
      // 2枚目のカードを決定した後（remainingが1以下）、または通常の場合
      // ダブルアクション中で2枚目のカードを決定した場合も公開フェーズへ移行
      if (isDoubleActionA && this.doubleActionFirstSelection && remainingA <= 1) {
        // 2枚目のカードを決定した後
        console.log(`[checkBothDecided] ダブルアクションA完了、showRevealPhase()を呼ぶ`);
        this.showRevealPhase();
        return;
      }
      
      if (isDoubleActionB && this.doubleActionFirstSelection && remainingB <= 1) {
        // 2枚目のカードを決定した後
        console.log(`[checkBothDecided] ダブルアクションB完了、showRevealPhase()を呼ぶ`);
        this.showRevealPhase();
        return;
      }
      
      // 通常の場合
      // 公開フェーズ
      console.log(`[checkBothDecided] 通常の場合、showRevealPhase()を呼ぶ`);
      this.showRevealPhase();
    }
  }

  // 公開フェーズ
  private showRevealPhase(): void {
    // 既に公開フェーズ中なら何もしない（重複防止）
    if (this.showingReveal) {
      return;
    }
    
    // スキップフラグがある場合は、公開フェーズをスキップして直接解決フェーズへ
    if (!this.gameManager) return;
    const skipA = this.gameManager.isSkipNextTurn('A');
    const skipB = this.gameManager.isSkipNextTurn('B');
    if (skipA || skipB) {
      console.log(`[showRevealPhase] スキップフラグがあるので、公開フェーズをスキップして直接resolvePhase()を呼ぶ`);
      setTimeout(() => {
        this.resolvePhase();
      }, 100);
      return;
    }
    
    this.showingReveal = true;
    
    // 操作ログに追加
    if (this.gameManager) {
      const currentTurn = this.gameManager.getCurrentTurn();
      const selectionA = this.gameManager.getSelection('A');
      const selectionB = this.gameManager.getSelection('B');
      
      // スキップフラグをチェック
      const skipA = this.gameManager.isSkipNextTurn('A');
      const skipB = this.gameManager.isSkipNextTurn('B');
      
      // ダブルアクション中の1枚目のカード選択を取得
      const firstSelectionA = this.gameManager.getDoubleActionFirstSelection('A');
      const firstSelectionB = this.gameManager.getDoubleActionFirstSelection('B');
      const isDoubleActionA = this.gameManager.isDoubleActionActive('A') || firstSelectionA !== null;
      const isDoubleActionB = this.gameManager.isDoubleActionActive('B') || firstSelectionB !== null;
      
      // ログの重複を防ぐため、既に同じターンのログが追加されているかチェック
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isHeaderAlreadyAdded = firstEntry?.classList.contains('log-header') && 
                                   firstEntry?.textContent?.includes(`ターン ${currentTurn}`);
      
      // スキップしていないプレイヤーの選択があればログに追加
      // スキップしているプレイヤーの選択はnullでもOK
      if ((selectionA || skipA) && (selectionB || skipB)) {
        const playerA = this.gameManager.getPlayer('A');
        const playerB = this.gameManager.getPlayer('B');
        const allCards = CardFactory.createAllCards();
        
        // ターンヘッダーを追加（重複を防ぐ）
        if (!isHeaderAlreadyAdded) {
          this.addTurnHeader(currentTurn);
        }
        
        const playerBName = this.playerBIsCPU ? 'CPU' : 'プレイヤーB';
        const playerAName = 'プレイヤーA';
        
        // プレイヤーBのログ（スキップしていない場合のみ）
        if (!skipB && selectionB) {
          if (isDoubleActionB && firstSelectionB) {
            // ダブルアクション中：1枚目と2枚目の両方をログに記録
            const firstCardB = allCards.find(c => c.getId() === firstSelectionB.cardId);
            const secondCardB = allCards.find(c => c.getId() === selectionB.cardId);
            if (firstCardB && secondCardB) {
              const pos1B = this.formatPosition(firstSelectionB.targetPosition.x, firstSelectionB.targetPosition.y);
              const pos2B = this.formatPosition(selectionB.targetPosition.x, selectionB.targetPosition.y);
              this.addActionLog(`${playerBName}: ${secondCardB.getName()} (${selectionB.cardId}) → マス ${pos2B}`);
              this.addActionLog(`${playerBName}: ${firstCardB.getName()} (${firstSelectionB.cardId}) → マス ${pos1B}`);
            }
          } else {
            // 通常の場合
            const cardB = allCards.find(c => c.getId() === selectionB.cardId);
            if (cardB) {
              const posB = this.formatPosition(selectionB.targetPosition.x, selectionB.targetPosition.y);
              this.addActionLog(`${playerBName}: ${cardB.getName()} (${selectionB.cardId}) → マス ${posB}`);
            }
          }
        }
        
        // プレイヤーAのログ（スキップしていない場合のみ）
        if (!skipA && selectionA) {
          if (isDoubleActionA && firstSelectionA) {
            // ダブルアクション中：1枚目と2枚目の両方をログに記録
            const firstCardA = allCards.find(c => c.getId() === firstSelectionA.cardId);
            const secondCardA = allCards.find(c => c.getId() === selectionA.cardId);
            if (firstCardA && secondCardA) {
              const pos1A = this.formatPosition(firstSelectionA.targetPosition.x, firstSelectionA.targetPosition.y);
              const pos2A = this.formatPosition(selectionA.targetPosition.x, selectionA.targetPosition.y);
              this.addActionLog(`${playerAName}: ${secondCardA.getName()} (${selectionA.cardId}) → マス ${pos2A}`);
              this.addActionLog(`${playerAName}: ${firstCardA.getName()} (${firstSelectionA.cardId}) → マス ${pos1A}`);
            }
          } else {
            // 通常の場合
            const cardA = allCards.find(c => c.getId() === selectionA.cardId);
            if (cardA) {
              const posA = this.formatPosition(selectionA.targetPosition.x, selectionA.targetPosition.y);
              this.addActionLog(`${playerAName}: ${cardA.getName()} (${selectionA.cardId}) → マス ${posA}`);
            }
          }
        }
      }
    }

    this.updateUI();

    // 2秒後に解決フェーズへ
    setTimeout(() => {
      this.resolvePhase();
    }, 2000);
  }

  // 解決フェーズ
  private resolvePhase(): void {
    if (!this.gameManager) return;
    
    const currentTurn = this.gameManager.getCurrentTurn();
    console.log(`[resolvePhase] 開始: ターン${currentTurn}, playerADecided=${this.playerADecided}, playerBDecided=${this.playerBDecided}`);
    
    // まず、現在のターンがスキップかどうかをチェック
    // 注意：これはターン開始時（resolveTurn()を呼ぶ前）のチェック
    // スキップフラグは前のターンの解決時に設定されるため、ここでチェックする
    const skipA = this.gameManager.isSkipNextTurn('A');
    const skipB = this.gameManager.isSkipNextTurn('B');
    
    console.log(`[resolvePhase] スキップフラグチェック: ターン${currentTurn}, skipA=${skipA}, skipB=${skipB}`);
    
    // スキップしているプレイヤーは自動的に「決定済み」として扱う
    // ただし、もう一方のプレイヤーは通常通りプレイできる
    if (skipA) {
      // プレイヤーAがスキップの場合、プレイヤーAを自動的に決定済みにする
      this.playerADecided = true;
      console.log(`[resolvePhase] プレイヤーAをスキップとして決定済みに設定: ターン${currentTurn}`);
      // スキップしているプレイヤーのログを追加
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`プレイヤーA: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`プレイヤーA: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
    }
    if (skipB) {
      // プレイヤーBがスキップの場合、プレイヤーBを自動的に決定済みにする
      this.playerBDecided = true;
      console.log(`[resolvePhase] プレイヤーBをスキップとして決定済みに設定: ターン${currentTurn}`);
      // スキップしているプレイヤーのログを追加
      const playerBName = this.playerBIsCPU ? 'CPU' : 'プレイヤーB';
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isAlreadyLogged = firstEntry?.textContent?.includes(`${playerBName}: ターン${currentTurn}はスキップ`);
      if (!isAlreadyLogged) {
        this.addActionLog(`${playerBName}: ターン${currentTurn}はスキップ（ダブルアクションの効果）`);
      }
    }
    
    // 両方ともスキップしている場合は、直接endTurn()を呼ぶ
    if (skipA && skipB) {
      // 両方ともスキップの場合（通常は発生しないが、念のため）
      this.gameManager.endTurn();
      
      // スキップフラグをリセット
      this.gameManager.resetSkipFlag('A');
      this.gameManager.resetSkipFlag('B');
      
      // 状態をリセット
      this.currentPlayer = 'A';
      this.selectedCardId = null;
      this.selectedCardIndex = null;
      this.selectedPosition = null;
      this.hoveredPosition = null;
      this.playerBSelectedCardId = null;
      this.playerBSelectedCardIndex = null;
      this.playerBSelectedPosition = null;
      this.playerADecided = false;
      this.playerBDecided = false;
      this.showingReveal = false;
      this.doubleActionFirstCardSelected = false;
      this.doubleActionFirstSelection = null;
      
      this.updateUI();
      
      // 次のターンがスキップかどうかを確認して、再帰的に処理
      const nextSkipA = this.gameManager.isSkipNextTurn('A');
      const nextSkipB = this.gameManager.isSkipNextTurn('B');
      
      if (nextSkipA || nextSkipB) {
        setTimeout(() => {
          this.resolvePhase();
        }, 100);
      } else {
        if (this.playerBIsCPU) {
          this.startCPUSelection();
        }
      }
      return;
    }
    
    // 片方だけがスキップしている場合、もう一方のプレイヤーが選択を完了したらresolveTurn()を呼ぶ
    // これは通常の処理フローで処理される（checkBothDecided()で処理される）
    // ただし、スキップしているプレイヤーは既に決定済みなので、もう一方のプレイヤーが決定したら
    // 自動的にresolveTurn()が呼ばれる
    
    // 現在のターンがスキップかどうかをチェック
    // スキップしている場合は、通常の処理をスキップして、もう一方のプレイヤーの選択を待つ
    if (skipA || skipB) {
      // 既に両方のプレイヤーが「決定済み」の場合は、
      // ここで待たずにこのまま通常のresolveTurn()フローへ進む
      if (this.playerADecided && this.playerBDecided) {
        console.log(
          `[resolvePhase] スキップターンだが両方決定済みなのでresolveTurn()へ進む: skipA=${skipA}, skipB=${skipB}`
        );
        // スキップしていないプレイヤーの選択が前のターンのまま残っている可能性があるため、
        // 念のため確認（ただし、この時点で両方決定済みなので、選択は既に設定されているはず）
        // 何もせずこのまま下の通常処理へ
      } else {
        console.log(`[resolvePhase] スキップターンなので、通常の処理を一時停止: skipA=${skipA}, skipB=${skipB}`);
        // スキップしているプレイヤーは既に決定済みなので、もう一方のプレイヤーが決定するまで待つ
        // CPUの選択を開始（CPUモードの場合のみ）
        if (this.playerBIsCPU && !skipB) {
          // プレイヤーB（CPU）がスキップしていない場合、CPUの選択をリセットしてから開始
          // 前のターンの選択が残っている可能性があるため、リセットする
          this.playerBSelectedCardId = null;
          this.playerBSelectedCardIndex = null;
          this.playerBSelectedPosition = null;
          this.playerBDecided = false;
          // GameManagerの選択状態もリセット
          if (this.gameManager) {
            this.gameManager.clearSelection('B');
          }
          console.log(`[resolvePhase] CPUの選択をリセットして開始`);
          this.startCPUSelection();
        }
        // checkBothDecided()で処理される
        return;
      }
    }
    
    // 通常のターンの場合：resolveTurn()を呼ぶ（内部でendTurn()も呼ばれる）
    // ダブルアクション解除のログを記録するため、解決前の状態を確認
    const wasDoubleActionA = this.gameManager.isDoubleActionActive('A');
    const wasDoubleActionB = this.gameManager.isDoubleActionActive('B');
    const firstSelectionA = wasDoubleActionA ? this.gameManager.getDoubleActionFirstSelection('A') : null;
    const firstSelectionB = wasDoubleActionB ? this.gameManager.getDoubleActionFirstSelection('B') : null;
    const selectionA = this.gameManager.getSelection('A');
    const selectionB = this.gameManager.getSelection('B');

    // スキップターンで、スキップしていないプレイヤーのログを出力（showRevealPhase()が呼ばれていない場合）
    if ((skipA || skipB) && !this.showingReveal) {
      const currentTurn = this.gameManager.getCurrentTurn();
      const actionLog = document.getElementById('action-log');
      const firstEntry = actionLog?.firstChild as HTMLElement;
      const isHeaderAlreadyAdded = firstEntry?.classList.contains('log-header') && 
                                   firstEntry?.textContent?.includes(`ターン ${currentTurn}`);
      
      if (!isHeaderAlreadyAdded) {
        this.addTurnHeader(currentTurn);
      }
      
      const playerBName = this.playerBIsCPU ? 'CPU' : 'プレイヤーB';
      const playerAName = 'プレイヤーA';
      const allCards = CardFactory.createAllCards();
      
      // スキップしていないプレイヤーのログを出力
      if (!skipB && selectionB) {
        const cardB = allCards.find(c => c.getId() === selectionB.cardId);
        if (cardB) {
          const posB = this.formatPosition(selectionB.targetPosition.x, selectionB.targetPosition.y);
          this.addActionLog(`${playerBName}: ${cardB.getName()} (${selectionB.cardId}) → マス ${posB}`);
        }
      }
      if (!skipA && selectionA) {
        const cardA = allCards.find(c => c.getId() === selectionA.cardId);
        if (cardA) {
          const posA = this.formatPosition(selectionA.targetPosition.x, selectionA.targetPosition.y);
          this.addActionLog(`${playerAName}: ${cardA.getName()} (${selectionA.cardId}) → マス ${posA}`);
        }
      }
    }

    this.gameManager.resolveTurn();
    
    // ダブルアクションが解除された場合のログ（2枚の色カードを選択したことを記録）
    // 注意：resolveTurn()内でendTurn()が呼ばれているので、既に次のターンに進んでいる
    if (wasDoubleActionA && !this.gameManager.isDoubleActionActive('A') && firstSelectionA && selectionA) {
      // ダブルアクション終了：2枚の色カードを選択したことをログに記録
      const allCards = CardFactory.createAllCards();
      const firstCardA = allCards.find(c => c.getId() === firstSelectionA.cardId);
      const secondCardA = allCards.find(c => c.getId() === selectionA.cardId);
      if (firstCardA && secondCardA) {
        const pos1A = this.formatPosition(firstSelectionA.targetPosition.x, firstSelectionA.targetPosition.y);
        const pos2A = this.formatPosition(selectionA.targetPosition.x, selectionA.targetPosition.y);
        this.addActionLog(`プレイヤーA: ダブルアクション完了 - ${firstCardA.getName()} (${firstSelectionA.cardId}) → マス ${pos1A}、${secondCardA.getName()} (${selectionA.cardId}) → マス ${pos2A}をプレイ。次ターンはスキップ`);
      }
    }
    if (wasDoubleActionB && !this.gameManager.isDoubleActionActive('B') && firstSelectionB && selectionB) {
      // ダブルアクション終了：2枚の色カードを選択したことをログに記録
      const allCards = CardFactory.createAllCards();
      const playerBName = this.playerBIsCPU ? 'CPU' : 'プレイヤーB';
      const firstCardB = allCards.find(c => c.getId() === firstSelectionB.cardId);
      const secondCardB = allCards.find(c => c.getId() === selectionB.cardId);
      if (firstCardB && secondCardB) {
        const pos1B = this.formatPosition(firstSelectionB.targetPosition.x, firstSelectionB.targetPosition.y);
        const pos2B = this.formatPosition(selectionB.targetPosition.x, selectionB.targetPosition.y);
        this.addActionLog(`${playerBName}: ダブルアクション完了 - ${firstCardB.getName()} (${firstSelectionB.cardId}) → マス ${pos1B}、${secondCardB.getName()} (${selectionB.cardId}) → マス ${pos2B}をプレイ。次ターンはスキップ`);
      }
    }
    
    // 状態をリセット
    this.currentPlayer = 'A';
    this.selectedCardId = null;
    this.selectedCardIndex = null;
    this.selectedPosition = null;
    this.hoveredPosition = null;
    this.playerBSelectedCardId = null;
    this.playerBSelectedCardIndex = null;
    this.playerBSelectedPosition = null;
    this.playerADecided = false;  // リセット
    this.playerBDecided = false;  // リセット
    this.showingReveal = false;
    this.doubleActionFirstCardSelected = false;
    this.doubleActionFirstSelection = null;
    
    // GameManagerの選択状態も念のため確認してリセット
    if (this.gameManager) {
      const selectionA = this.gameManager.getSelection('A');
      const selectionB = this.gameManager.getSelection('B');
      if (selectionA !== null) {
        this.gameManager.clearSelection('A');
        console.log(`[resolvePhase] プレイヤーAの選択をリセット`);
      }
      if (selectionB !== null) {
        this.gameManager.clearSelection('B');
        console.log(`[resolvePhase] プレイヤーBの選択をリセット`);
      }
    }

    // スキップフラグをリセット（resolveTurn()が呼ばれた後）
    if (skipA) {
      this.gameManager.resetSkipFlag('A');
    }
    if (skipB) {
      this.gameManager.resetSkipFlag('B');
    }
    
    // 次のターンがスキップかどうかを確認（endTurn()が呼ばれた後なので、既に次のターンに進んでいる）
    const nextSkipA = this.gameManager.isSkipNextTurn('A');
    const nextSkipB = this.gameManager.isSkipNextTurn('B');
    const nextTurn = this.gameManager.getCurrentTurn();
    
    // デバッグ用ログ（開発時のみ）
    if (nextSkipA || nextSkipB) {
      console.log(`[resolvePhase] 次のターン${nextTurn}: nextSkipA=${nextSkipA}, nextSkipB=${nextSkipB}`);
    }
    
    // 次のターンがスキップの場合、スキップしているプレイヤーを決定済みにする
    // updateUI()を呼ぶ前に設定することで、プレイヤーがカードを選択できないようにする
    if (nextSkipA) {
      this.playerADecided = true;
      console.log(`[resolvePhase] ターン${nextTurn}: プレイヤーAをスキップとして決定済みに設定`);
    } else {
      this.playerADecided = false;
    }
    if (nextSkipB) {
      this.playerBDecided = true;
      console.log(`[resolvePhase] ターン${nextTurn}: プレイヤーBをスキップとして決定済みに設定`);
    } else {
      this.playerBDecided = false;
    }
    
    this.updateUI();
    
    // ゲーム終了チェック（startCPUSelection()を呼ぶ前にチェック）
    if (this.gameManager.getState() === 'finished') {
      this.showResult();
      return;
    }
    
    if (nextSkipA || nextSkipB) {
      // 次のターンがスキップの場合、再帰的に処理（スキップターンの処理を実行）
      setTimeout(() => {
        this.resolvePhase();
      }, 100);
    } else {
      // CPUの次の選択を開始（CPUモードの場合のみ）
      if (this.playerBIsCPU) {
        this.startCPUSelection();
      }
    }
  }

  // 決定ボタンの処理
  private onDecideButtonClick(): void {
    const activePlayer = this.currentPlayer;
    if (activePlayer === 'A') {
      this.playerADecide();
    } else if (activePlayer === 'B' && !this.playerBIsCPU) {
      this.playerBDecide();
    }
  }

  private showResult(): void {
    if (!this.gameManager) return;

    const result = this.gameManager.calculateScores();
    const modal = document.getElementById('result-modal');
    const content = document.getElementById('result-content');

    if (modal && content) {
      let winnerText = '';
      if (result.winner === 'A') {
        winnerText = 'あなたの勝利！';
      } else if (result.winner === 'B') {
        winnerText = 'CPUの勝利！';
      } else {
        winnerText = '引き分け！';
      }

      content.innerHTML = `
        <div>${winnerText}</div>
        <div style="margin-top: 20px;">
          <div>あなた: ${result.playerAScore}点</div>
          <div>CPU: ${result.playerBScore}点</div>
        </div>
      `;

      modal.classList.remove('hidden');
    }
  }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
  const gameUI = new GameUI();
  
  // シミュレーターをグローバルに公開（開発者用）
  if (typeof window !== 'undefined') {
    (window as any).runSimulator = async () => {
      const { SimulatorRunner } = await import('./simulator/index.js');
      const runner = new SimulatorRunner();
      await runner.runAll();
    };
    
    (window as any).testCard = async (cardId: string) => {
      const { SimulatorRunner } = await import('./simulator/index.js');
      const runner = new SimulatorRunner();
      await runner.testSpecificCard(cardId);
    };
    
    console.log('開発者モード: ブラウザコンソールで以下を実行できます:');
    console.log('  - runSimulator() : すべてのカード効果を検証');
    console.log('  - testCard("S05") : 特定のカードを検証');
  }
});
