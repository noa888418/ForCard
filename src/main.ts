import { GameManager } from './GameManager.js';
import { Player } from './Player.js';
import { CardFactory } from './CardFactory.js';
import { CardSelection, PlayerId, Position } from './types.js';
import { Board } from './Board.js';
import { CPUPlayer } from './CPUPlayer.js';

class GameUI {
  private gameManager: GameManager | null = null;
  private cpuPlayer: CPUPlayer | null = null;
  private currentPlayer: PlayerId = 'A';
  private selectedCardId: string | null = null;
  private selectedPosition: { x: number; y: number } | null = null;
  private hoveredPosition: { x: number; y: number } | null = null;
  private playerADecided: boolean = false; // プレイヤーAが決定したか
  private playerBDecided: boolean = false; // プレイヤーB（CPU）が決定したか
  private showingReveal: boolean = false; // 公開フェーズ表示中か

  constructor() {
    this.initializeGame();
    this.setupEventListeners();
  }

  private initializeGame(): void {
    const deck = CardFactory.createDefaultDeck();
    const playerA = new Player('A', [...deck]);
    const playerB = new Player('B', [...deck]);

    this.gameManager = new GameManager(playerA, playerB, 5, 15);
    this.cpuPlayer = new CPUPlayer(playerB, 'B');
    this.currentPlayer = 'A';
    this.playerADecided = false;
    this.playerBDecided = false;
    this.showingReveal = false;
    this.selectedCardId = null;
    this.selectedPosition = null;
    this.hoveredPosition = null;

    // CPUも同時に選択を開始（秘密選択）
    this.startCPUSelection();

    this.updateUI();
  }

  // CPUの秘密選択を開始
  private startCPUSelection(): void {
    if (!this.gameManager || !this.cpuPlayer || this.playerBDecided) return;

    // 少し遅延を入れて自然に見せる
    setTimeout(() => {
      if (!this.gameManager || !this.cpuPlayer || this.playerBDecided) return;
      
      const selection = this.cpuPlayer.selectCard(this.gameManager.getBoard());
      if (selection) {
        // CPUの選択を記録（まだ決定していない）
        this.gameManager.selectCard('B', selection);
        // CPUは自動で決定する（プレイヤーが決定するまで待たない）
        this.cpuDecide();
      }
    }, 1000 + Math.random() * 2000); // 1-3秒のランダム遅延
  }

  // CPUが決定
  private cpuDecide(): void {
    if (this.playerBDecided) return;
    this.playerBDecided = true;
    this.updateUI();
    this.checkBothDecided();
  }

  private setupEventListeners(): void {
    const resolveBtn = document.getElementById('resolve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const closeResultBtn = document.getElementById('close-result-btn');

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
  }

  private updateUI(): void {
    if (!this.gameManager) return;

    this.updateBoard();
    this.updateHands();
    this.updateGameInfo();
    this.updateScores();
    this.updateControls();
    
    // CPUの決定状態を表示
    this.updateCPUStatus();
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
    if (!boardElement) return;

    const board = this.gameManager.getBoard();
    const size = board.getSize();

    boardElement.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    boardElement.innerHTML = '';

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
        cellElement.title = `(${x}, ${y}) 安定度: ${cell.stability}`;

        // クリックイベント（常に設定、条件はselectPosition内でチェック）
        cellElement.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.selectedCardId && this.currentPlayer === 'A') {
            this.selectPosition(x, y);
          }
        });

        // ホバーイベント（カード選択中のみ）
        if (this.selectedCardId && this.currentPlayer === 'A') {
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
          cellElement.style.cursor = 'default';
        }

        boardElement.appendChild(cellElement);
      }
    }

    // 初期の適用範囲表示を更新
    this.updateCardTargets();
  }

  // カードの適用範囲表示を更新（ホバー時はupdateBoardを呼ばずにこれだけ呼ぶ）
  private updateCardTargets(): void {
    if (!this.gameManager || !this.selectedCardId || this.currentPlayer !== 'A') {
      // 全てのcard-targetクラスを削除
      const boardElement = document.getElementById('board');
      if (boardElement) {
        boardElement.querySelectorAll('.card-target').forEach(el => {
          el.classList.remove('card-target');
        });
      }
      return;
    }

    const board = this.gameManager.getBoard();
    const player = this.gameManager.getPlayer('A');
    const card = player.getHand().find(c => c.getId() === this.selectedCardId);
    
    if (!card || !this.hoveredPosition) {
      // 全てのcard-targetクラスを削除
      const boardElement = document.getElementById('board');
      if (boardElement) {
        boardElement.querySelectorAll('.card-target').forEach(el => {
          el.classList.remove('card-target');
        });
      }
      return;
    }

    // 適用範囲を計算
    let targetPositions: Position[] = [];
    try {
      targetPositions = card.getTargetPositions(board, this.hoveredPosition, 'A');
    } catch (e) {
      // エラーは無視
    }

    // 全てのcard-targetクラスを削除
    const boardElement = document.getElementById('board');
    if (!boardElement) return;

    boardElement.querySelectorAll('.card-target').forEach(el => {
      el.classList.remove('card-target');
    });

    // 適用範囲のマスにcard-targetクラスを追加
    targetPositions.forEach(pos => {
      const cellElement = boardElement.querySelector(`[data-x="${pos.x}"][data-y="${pos.y}"]`);
      if (cellElement) {
        cellElement.classList.add('card-target');
      }
    });
  }

  private updateHands(): void {
    if (!this.gameManager) return;

    const handA = document.getElementById('hand-a');
    const handB = document.getElementById('hand-b');

    if (handA) {
      this.renderHand(handA, 'A');
    }
    if (handB) {
      this.renderHand(handB, 'B', true); // CPUなので非表示
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
    const hand = player.getHand();
    const usedCards = player.getUsedCards();

    hand.forEach(card => {
      const cardElement = document.createElement('div');
      cardElement.className = 'card';
      if (usedCards.has(card.getId())) {
        cardElement.classList.add('used');
      }
      if (this.selectedCardId === card.getId() && this.currentPlayer === playerId) {
        cardElement.classList.add('selected');
      }

      const header = document.createElement('div');
      header.className = 'card-header';

      const idSpan = document.createElement('span');
      idSpan.className = 'card-id';
      idSpan.textContent = card.getId();

      const typeSpan = document.createElement('span');
      typeSpan.className = `card-type ${card.getType()}`;
      typeSpan.textContent = card.getType() === 'color' ? '色' : '特殊';

      header.appendChild(idSpan);
      header.appendChild(typeSpan);

      const nameDiv = document.createElement('div');
      nameDiv.className = 'card-name';
      nameDiv.textContent = card.getName();

      const descDiv = document.createElement('div');
      descDiv.className = 'card-description';
      descDiv.textContent = card.getDescription();

      cardElement.appendChild(header);
      cardElement.appendChild(nameDiv);
      cardElement.appendChild(descDiv);

      if (this.currentPlayer === playerId && !usedCards.has(card.getId())) {
        cardElement.addEventListener('click', () => this.selectCard(card.getId(), playerId));
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
        } else if (this.playerADecided) {
          stateText = 'あなたは決定済み - CPUの決定を待っています...';
        } else if (this.playerBDecided) {
          stateText = 'CPUは決定済み - あなたの決定を待っています...';
        } else {
          stateText = 'カード選択フェーズ - カードと位置を選択してください';
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
      // プレイヤーAが選択済みで、CPUが選択済みなら自動で解決されるのでボタンは無効
      const playerAReady = this.selectedCardId !== null && this.selectedPosition !== null;
      const bothReady = this.gameManager.areBothPlayersReady();
      const state = this.gameManager.getState();
      
      resolveBtn.disabled = !playerAReady || 
                           state !== 'selecting' ||
                           this.currentPlayer === 'B' ||
                           bothReady; // 両方選択済みなら自動解決されるので無効
    }
  }

  private selectCard(cardId: string, playerId: PlayerId): void {
    if (this.currentPlayer !== playerId) return;
    if (!this.gameManager) return;

    this.selectedCardId = cardId;
    this.selectedPosition = null;
    this.hoveredPosition = null;

    const cardInfo = document.getElementById('selected-card-info');
    if (cardInfo) {
      const player = this.gameManager.getPlayer(playerId);
      const card = player.getHand().find(c => c.getId() === cardId);
      if (card) {
        cardInfo.textContent = `選択中: ${card.getName()} (${card.getId()}) - マスにカーソルを合わせて適用範囲を確認`;
      }
    }

    this.updateUI();
  }

  private selectPosition(x: number, y: number): void {
    if (!this.selectedCardId || !this.gameManager) {
      return;
    }

    if (this.currentPlayer !== 'A') {
      return;
    }

    this.selectedPosition = { x, y };

    const selection: CardSelection = {
      cardId: this.selectedCardId as any,
      targetPosition: { x, y }
    };

    // 選択を記録（まだ決定していない）
    // 実際のGameManagerへの記録は「決定」ボタンを押した時に行う
    const cardInfo = document.getElementById('selected-card-info');
    if (cardInfo) {
      cardInfo.textContent = `選択済み: マス (${x}, ${y}) - 「決定」ボタンをクリック`;
    }

    // ホバー状態をクリア
    this.hoveredPosition = null;

    this.updateUI();
  }

  // プレイヤーAが決定
  private playerADecide(): void {
    if (!this.gameManager || this.playerADecided) return;
    if (!this.selectedCardId || !this.selectedPosition) return;

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
    
    const cardInfo = document.getElementById('selected-card-info');
    if (cardInfo) {
      cardInfo.textContent = `決定済み - ${this.playerBDecided ? '公開フェーズへ...' : 'CPUの決定を待っています...'}`;
    }
    
    this.updateUI();
    this.checkBothDecided();
  }

  // 両方が決定したかチェック
  private checkBothDecided(): void {
    if (this.playerADecided && this.playerBDecided && !this.showingReveal) {
      // 公開フェーズ
      this.showRevealPhase();
    }
  }

  // 公開フェーズ
  private showRevealPhase(): void {
    this.showingReveal = true;
    
    // 両方の選択を表示
    const cardInfo = document.getElementById('selected-card-info');
    if (cardInfo && this.gameManager) {
      const selectionA = this.gameManager.getSelection('A');
      const selectionB = this.gameManager.getSelection('B');
      
      if (selectionA && selectionB) {
        const playerA = this.gameManager.getPlayer('A');
        const playerB = this.gameManager.getPlayer('B');
        const cardA = playerA.getHand().find(c => c.getId() === selectionA.cardId);
        const cardB = playerB.getHand().find(c => c.getId() === selectionB.cardId);
        
        cardInfo.innerHTML = `
          <div style="margin-bottom: 10px; font-weight: bold; color: #667eea;">📢 公開フェーズ</div>
          <div style="margin-bottom: 5px;">あなた: <strong>${cardA?.getName()}</strong> (${selectionA.cardId}) → マス (${selectionA.targetPosition.x}, ${selectionA.targetPosition.y})</div>
          <div>CPU: <strong>${cardB?.getName()}</strong> (${selectionB.cardId}) → マス (${selectionB.targetPosition.x}, ${selectionB.targetPosition.y})</div>
        `;
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

    this.gameManager.resolveTurn();
    
    // 次のターンに進む
    this.currentPlayer = 'A';
    this.selectedCardId = null;
    this.selectedPosition = null;
    this.hoveredPosition = null;
    this.playerADecided = false;
    this.playerBDecided = false;
    this.showingReveal = false;

    // CPUの次の選択を開始
    this.startCPUSelection();
    
    this.updateUI();

    // ゲーム終了チェック
    if (this.gameManager.getState() === 'finished') {
      this.showResult();
    }
  }

  // 決定ボタンの処理（プレイヤーAが決定）
  private onDecideButtonClick(): void {
    this.playerADecide();
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
  new GameUI();
});
