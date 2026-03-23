# ForCard UI強化手順書（Figma + Photopea）

この手順書では、**無料で**FigmaとPhotopeaを使ってForCardのUIを強化する方法を説明します。

---

## 📋 目次

1. [準備](#準備)
2. [Figmaでデザイン作成](#figmaでデザイン作成)
3. [Photopeaで画像編集・エクスポート](#photopeaで画像編集エクスポート)
4. [コードへの統合](#コードへの統合)

---

## 🛠️ 準備

### 必要なツール（すべて無料）

1. **Figma** - [https://www.figma.com/](https://www.figma.com/)
   - ブラウザで使用可能（アカウント登録が必要）
   - デザイン作成・UIデザインに最適

2. **Photopea** - [https://www.photopea.com/](https://www.photopea.com/)
   - ブラウザで使用可能（アカウント不要）
   - Photoshopライクな画像編集ツール

### 現在の画面サイズ確認

- ゲーム画面の最大幅: `1400px`
- 推奨デザインサイズ: `1920×1080px`（フルHD）または `1440×900px`

---

## 🎨 Figmaでデザイン作成

---

## 🖼️ 背景画像の自作方法

### 背景画像を作る理由

現在の背景はCSSのグラデーション（`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`）ですが、自作の背景画像を使うことで：
- より複雑なデザイン（テクスチャ、パターン、イラストなど）が可能
- ゲームの世界観をより強く表現できる
- 視覚的な深みや雰囲気を追加できる

### ステップ1: Figmaで背景デザインを作成

#### 1-1. 背景レイヤーの作成

1. **新規フレームを作成**
   - サイズ: `1920×1080px`（フルHD）または `3840×2160px`（4K、高解像度用）
   - 背景は繰り返しパターンにする場合は `512×512px` など小さめでもOK

2. **基本のグラデーション背景**
   - 長方形ツールで画面全体を覆う
   - 塗りつぶし: グラデーション（`#667eea` → `#764ba2`）
   - レイヤー名: `Base Gradient`

#### 1-2. 装飾要素の追加（オプション）

背景に深みを持たせるための装飾：

**パターン1: 幾何学模様**
- 円形や多角形を配置
- 透明度を調整（20-40%）
- ぼかし効果を追加

**パターン2: テクスチャ**
- ノイズやグリッドパターンを追加
- オーバーレイモード: `Overlay` や `Soft Light`

**パターン3: カードのシルエット**
- カードの形を薄く配置
- 回転や拡大縮小でバリエーション
- 透明度: 10-20%

**パターン4: 光の効果**
- グラデーションの円形を追加
- ぼかし（Blur）を強めに設定
- オーバーレイモード: `Screen` や `Add`

#### 1-3. レイヤー構造の例

```
Background Design
├── Base Gradient (背景のグラデーション)
├── Decorative Pattern 1 (装飾パターン1)
├── Decorative Pattern 2 (装飾パターン2)
├── Card Silhouettes (カードのシルエット)
├── Light Effects (光の効果)
└── Noise/Texture (ノイズ/テクスチャ)
```

#### 1-4. 背景の種類別デザイン例

**タイトル画面用背景:**
- 大胆なグラデーション
- カードのシルエットを大きく配置
- 光の効果でドラマチックに

**メニュー画面用背景:**
- タイトル画面より控えめ
- グリッドパターンで整理感を
- 透明度を高めに設定

**ゲーム画面用背景:**
- シンプルで視認性重視
- 盤面が目立つように控えめに
- 微細なテクスチャのみ

### ステップ2: Photopeaで背景画像を編集・最適化

#### 2-1. Figmaから背景をエクスポート

1. Figmaで背景レイヤーを選択
2. 右クリック → 「Export」または「Copy as PNG」
3. 解像度: `2x` または `3x`（高解像度用）
4. ファイル名: `background-title.png` など

#### 2-2. Photopeaで開いて編集

1. Photopeaを開く
2. 「File」→「Open」でエクスポートした画像を開く

#### 2-3. 背景画像の最適化

**サイズの調整:**
- 「Image」→「Image Size」
- Web用なら `1920×1080px` 程度で十分
- ファイルサイズを小さくするため、必要以上に大きくしない

**品質の調整:**
- 「Filter」→「Sharpen」でシャープ化（必要に応じて）
- 「Filter」→「Noise」→「Reduce Noise」でノイズ除去（必要に応じて）

**繰り返しパターン用の調整:**
- 背景をタイル状に繰り返したい場合:
  1. 「Image」→「Canvas Size」でサイズを調整
  2. 「Edit」→「Define Pattern」でパターンとして保存
  3. 新しいファイルで「Edit」→「Fill」→「Pattern」で使用

#### 2-4. エクスポート設定

1. 「File」→「Export As」→「PNG」または「WebP」
2. **PNGの場合:**
   - 品質: `90-100%`
   - 圧縮: 中程度（ファイルサイズと品質のバランス）
3. **WebPの場合（推奨）:**
   - 品質: `85-95%`（PNGより小さくできる）
   - ファイルサイズが約30-50%削減可能

**ファイル名の例:**
- `background-title.png` / `background-title.webp`
- `background-menu.png` / `background-menu.webp`
- `background-game.png` / `background-game.webp`
- `background-pattern.png`（繰り返し用）

### ステップ3: CSSで背景画像を適用

#### 3-1. 画像ファイルの配置

プロジェクト構造:
```
ForCard/
├── assets/
│   ├── images/
│   │   ├── backgrounds/
│   │   │   ├── background-title.webp
│   │   │   ├── background-title-mobile.webp
│   │   │   ├── background-menu.webp
│   │   │   ├── background-game.webp
│   │   │   └── background-pattern.webp (繰り返し用)
```

#### 3-2. CSSでの適用方法

**方法1: 背景画像として適用（推奨）**

```css
/* タイトル画面の背景 */
#title-screen {
    background-image: url('../assets/images/backgrounds/background-title.webp');
    background-size: cover; /* 画面全体を覆う */
    background-position: center; /* 中央に配置 */
    background-repeat: no-repeat; /* 繰り返さない */
    position: relative;
}

/* メニュー画面の背景 */
#menu-screen {
    background-image: url('../assets/images/backgrounds/background-menu.webp');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
}

/* ゲーム画面の背景 */
#game-screen {
    background-image: url('../assets/images/backgrounds/background-game.webp');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
}
```

**方法2: 繰り返しパターンとして適用**

```css
#title-screen {
    background-image: url('../assets/images/backgrounds/background-pattern.webp');
    background-size: 512px 512px; /* パターンのサイズ */
    background-repeat: repeat; /* 繰り返す */
    background-position: 0 0;
}
```

**方法3: グラデーションと組み合わせる**

```css
#title-screen {
    /* グラデーションをフォールバックとして */
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    /* 背景画像を上に重ねる */
    background-image: url('../assets/images/backgrounds/background-title.webp');
    background-size: cover;
    background-position: center;
    background-blend-mode: overlay; /* ブレンドモードで合成 */
}
```

#### 3-3. レスポンシブ対応

異なる画面サイズに対応する場合:

```css
#title-screen {
    background-image: url('../assets/images/backgrounds/background-title.webp');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    
    /* モバイル用の最適化 */
    @media (max-width: 768px) {
        background-image: url('../assets/images/backgrounds/background-title-mobile.webp');
        /* または同じ画像でサイズ調整 */
        background-size: contain; /* または cover */
    }
}
```

#### 3-4. パフォーマンス最適化

**遅延読み込み（Lazy Loading）:**

```html
<!-- HTMLで遅延読み込み -->
<div id="title-screen" class="screen" 
     style="background-image: url('../assets/images/backgrounds/background-title.webp');"
     loading="lazy">
</div>
```

**またはJavaScriptで制御:**

```typescript
// 画面が表示されるタイミングで背景を読み込む
function loadBackground(screenId: string, imagePath: string): void {
    const screen = document.getElementById(screenId);
    if (screen) {
        const img = new Image();
        img.onload = () => {
            screen.style.backgroundImage = `url('${imagePath}')`;
        };
        img.src = imagePath;
    }
}

// 使用例
loadBackground('title-screen', 'assets/images/backgrounds/background-title.webp');
```

### ステップ4: 背景画像のバリエーション作成

#### 4-1. 異なる解像度用の画像

- **デスクトップ用**: `1920×1080px`
- **タブレット用**: `1440×900px`
- **モバイル用**: `768×1024px`（縦向き）または `1024×768px`（横向き）

#### 4-2. ダークモード対応

- 明るい背景と暗い背景の両方を用意
- CSSで切り替え:

```css
@media (prefers-color-scheme: dark) {
    #title-screen {
        background-image: url('../assets/images/backgrounds/background-title-dark.webp');
    }
}
```

### ステップ5: 背景アニメーション（オプション）

CSSアニメーションで背景を動かす:

```css
/* 背景がゆっくり動くアニメーション */
@keyframes backgroundMove {
    0% {
        background-position: 0% 0%;
    }
    100% {
        background-position: 100% 100%;
    }
}

#title-screen {
    background-image: url('../assets/images/backgrounds/background-title.webp');
    background-size: 120% 120%; /* 少し大きくして動きを出す */
    animation: backgroundMove 30s ease-in-out infinite;
}
```

---

## 🎨 Figmaでデザイン作成

### ステップ1: タイトル画面のデザイン

#### 1-1. Figmaで新規ファイルを作成

1. Figmaにログイン
2. 「New design file」をクリック
3. フレームサイズ: `1920×1080px` を選択

#### 1-2. タイトル画面の要素

以下の要素を含めます：

```
┌─────────────────────────────────┐
│        背景（グラデーション）      │
│                                 │
│      🎮 ForCard                │
│      （大きなタイトルロゴ）       │
│                                 │
│      [ゲームを始める]            │
│      [設定]                     │
│      [ルール説明]                │
│                                 │
│      （装飾的なカードイラスト）   │
└─────────────────────────────────┘
```

**デザインのポイント：**
- 背景: 現在のグラデーション（`#667eea` → `#764ba2`）をベースに
- タイトル: 大きなフォント（72px以上）、太字、影付き
- ボタン: 角丸、ホバー効果を考慮したデザイン
- カードのイラスト: ゲームの雰囲気を伝える装飾

#### 1-3. 具体的なデザイン手順

1. **背景レイヤー**
   - 長方形ツールで画面全体を覆う
   - 塗りつぶし: グラデーション（`#667eea` → `#764ba2`）
   - レイヤー名: `Background`

2. **タイトルテキスト**
   - テキストツールで「ForCard」を入力
   - フォントサイズ: `96px`
   - フォント: 太字（Bold）
   - 色: `#FFFFFF`（白）
   - エフェクト: ドロップシャドウ（X: 0, Y: 4, Blur: 8, Color: rgba(0,0,0,0.3)）
   - レイヤー名: `Title`

3. **ボタンデザイン**
   - 長方形ツールでボタンを作成（幅: `300px`, 高さ: `60px`）
   - 角丸: `12px`
   - 背景: `#4caf50`（緑）
   - テキスト: 「ゲームを始める」（中央揃え、白、24px）
   - エフェクト: ドロップシャドウ（X: 0, Y: 2, Blur: 4）
   - レイヤー名: `StartButton`

4. **装飾要素**
   - カードのシルエットやパターンを追加
   - 透明度を調整して背景に馴染ませる

#### 1-4. レイヤー構造

```
Title Screen
├── Background
├── Decorative Elements
├── Title
├── StartButton
├── SettingsButton
└── RulesButton
```

---

### ステップ2: メニュー画面のデザイン

#### 2-1. メニュー画面の要素

```
┌─────────────────────────────────┐
│      [← 戻る]                   │
│                                 │
│      ゲーム設定                  │
│                                 │
│      盤面サイズ: [5×5 ▼]        │
│      総ターン数: [15 ▼]         │
│      難易度: [普通 ▼]           │
│                                 │
│      [ゲームを開始]              │
│                                 │
│      カード一覧                  │
│      （カードのプレビュー）      │
└─────────────────────────────────┘
```

#### 2-2. デザイン手順

1. **背景**: タイトル画面と同じグラデーション
2. **設定パネル**: 白背景（`rgba(255, 255, 255, 0.95)`）、角丸10px、影付き
3. **入力フィールド**: ドロップダウン、数値入力
4. **ボタン**: タイトル画面と同じスタイル

---

### ステップ3: ゲーム画面のデザイン強化

#### 3-1. 現在のゲーム画面の改善点

- ヘッダーのデザイン強化
- カードのビジュアル改善
- 盤面のセルのデザイン改善
- ボタンのスタイル統一

#### 3-2. デザイン手順

1. **ヘッダー**
   - 背景: 白（透明度95%）
   - ロゴ/タイトル: 左側に配置
   - ゲーム情報: 右側に配置（ターン数、状態）

2. **カードデザイン**
   - カードの背景: 白
   - カードタイプに応じた色分け
     - 色カード: 緑系（`#4caf50`）
     - 強化カード: 赤系（`#f44336`）
     - 特殊カード: オレンジ系（`#ff9800`）
   - 角丸: `8px`
   - 影: 軽めのドロップシャドウ

3. **盤面セル**
   - セルサイズ: `60×60px`
   - 角丸: `3px`
   - プレイヤーA: グラデーション（`#667eea` → `#764ba2`）
   - プレイヤーB: グラデーション（`#f093fb` → `#f5576c`）

---

## 🖼️ Photopeaで画像編集・エクスポート

### ステップ1: Figmaから画像をエクスポート

1. Figmaでデザインを選択
2. 右クリック → 「Copy as PNG」または「Export」
3. 解像度: `2x`（高解像度用）を選択

### ステップ2: Photopeaで画像を開く

1. Photopeaを開く（[https://www.photopea.com/](https://www.photopea.com/)）
2. 「File」→「Open」でエクスポートした画像を開く

### ステップ3: 画像の最適化

#### 3-1. サイズ調整

- 「Image」→「Image Size」
- 必要に応じてサイズを調整（Web用は適度なサイズに）

#### 3-2. 背景の透明化（必要に応じて）

1. 背景レイヤーを選択
2. 「Magic Wand Tool」で背景を選択
3. 「Delete」キーで削除
4. 「File」→「Export As」→「PNG」で保存（透明背景が保持される）

#### 3-3. 画像のエクスポート

1. 「File」→「Export As」→「PNG」または「WebP」
2. 品質: `90-100%`
3. ファイル名: `title-screen.png`, `menu-screen.png` など

---

## 💻 コードへの統合

### ステップ1: 画像ファイルの配置

1. プロジェクトルートに `assets` フォルダを作成
2. エクスポートした画像を配置:
   ```
   ForCard/
   ├── assets/
   │   ├── images/
   │   │   ├── title-screen.png
   │   │   ├── menu-screen.png
   │   │   ├── card-background.png
   │   │   └── ...
   │   └── ...
   ```

### ステップ2: HTMLの更新

`index.html` にタイトル画面とメニュー画面を追加します。

#### 2-1. タイトル画面のHTML

```html
<div id="title-screen" class="screen">
    <div class="title-content">
        <h1 class="title-logo">ForCard</h1>
        <div class="title-buttons">
            <button id="start-game-btn" class="title-button">ゲームを始める</button>
            <button id="settings-btn" class="title-button">設定</button>
            <button id="rules-btn" class="title-button">ルール説明</button>
        </div>
    </div>
</div>
```

#### 2-2. メニュー画面のHTML

```html
<div id="menu-screen" class="screen hidden">
    <div class="menu-content">
        <button id="back-btn" class="back-button">← 戻る</button>
        <h2>ゲーム設定</h2>
        <!-- 設定項目 -->
        <button id="start-from-menu-btn" class="menu-button">ゲームを開始</button>
    </div>
</div>
```

#### 2-3. ゲーム画面のHTML

既存の `#app` を `game-screen` クラスでラップ:

```html
<div id="game-screen" class="screen hidden">
    <!-- 既存のゲーム画面のHTML -->
</div>
```

### ステップ3: CSSの追加

`styles.css` に以下を追加:

```css
/* 画面管理 */
.screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    width: 100%;
}

.screen.hidden {
    display: none;
}

/* タイトル画面 */
#title-screen {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    position: relative;
}

.title-content {
    text-align: center;
    z-index: 1;
}

.title-logo {
    font-size: 96px;
    font-weight: bold;
    color: #ffffff;
    text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    margin-bottom: 60px;
}

.title-buttons {
    display: flex;
    flex-direction: column;
    gap: 20px;
    align-items: center;
}

.title-button {
    width: 300px;
    height: 60px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 24px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.3s;
}

.title-button:hover {
    background: #45a049;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

/* メニュー画面 */
#menu-screen {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.menu-content {
    background: rgba(255, 255, 255, 0.95);
    padding: 40px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    max-width: 600px;
    width: 90%;
}

.back-button {
    background: #6c757d;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    margin-bottom: 20px;
}

.menu-button {
    width: 100%;
    padding: 15px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    margin-top: 20px;
}
```

### ステップ4: JavaScriptの更新

`main.ts` に画面遷移のロジックを追加:

```typescript
// 画面管理クラス
class ScreenManager {
    private currentScreen: string = 'title';

    showScreen(screenId: string): void {
        // すべての画面を非表示
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // 指定された画面を表示
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            this.currentScreen = screenId;
        }
    }

    getCurrentScreen(): string {
        return this.currentScreen;
    }
}

// 使用例
const screenManager = new ScreenManager();

// タイトル画面のボタンイベント
document.getElementById('start-game-btn')?.addEventListener('click', () => {
    screenManager.showScreen('menu-screen');
});

document.getElementById('back-btn')?.addEventListener('click', () => {
    screenManager.showScreen('title-screen');
});

document.getElementById('start-from-menu-btn')?.addEventListener('click', () => {
    screenManager.showScreen('game-screen');
    // ゲームを初期化
    // gameUI.init();
});
```

---

## 📝 チェックリスト

### 背景画像作成
- [ ] Figmaで背景デザイン作成
- [ ] 装飾要素の追加（パターン、テクスチャ、光の効果など）
- [ ] Photopeaで画像編集・最適化
- [ ] 複数解像度用の画像作成（デスクトップ/タブレット/モバイル）
- [ ] WebP形式でエクスポート（ファイルサイズ最適化）
- [ ] CSSでの背景画像適用
- [ ] レスポンシブ対応の確認

### Figmaデザイン
- [ ] タイトル画面のデザイン完成
- [ ] メニュー画面のデザイン完成
- [ ] ゲーム画面のデザイン改善
- [ ] すべての画面で一貫したデザイン言語

### Photopea編集
- [ ] 画像のエクスポート（PNG/WebP）
- [ ] サイズの最適化
- [ ] 透明背景の設定（必要に応じて）
- [ ] 背景画像の最適化

### コード統合
- [ ] HTMLの更新
- [ ] CSSの追加
- [ ] JavaScriptの画面遷移ロジック
- [ ] 画像ファイルの配置
- [ ] 動作確認

---

## 🎯 次のステップ

1. **アニメーション追加**: CSS transitionsやkeyframesで画面遷移を滑らかに
2. **レスポンシブ対応**: モバイルデバイスでの表示を最適化
3. **音效追加**: ボタンクリック音など（オプション）
4. **パフォーマンス最適化**: 画像の遅延読み込みなど

---

## 💡 ヒント

### デザイン全般
- **Figmaのコンポーネント機能**: ボタンやカードをコンポーネント化すると再利用しやすい
- **Photopeaのレイヤー**: レイヤー構造を保持すると後で編集しやすい
- **画像の最適化**: WebP形式を使うとファイルサイズを小さくできる
- **デザインシステム**: 色、フォント、スペーシングを統一すると見た目が整う

### 背景画像作成のコツ
- **ファイルサイズ**: WebP形式で200KB以下を目指す（読み込み速度のため）
- **解像度**: 1920×1080pxで十分（4Kは不要、ファイルサイズが大きくなる）
- **繰り返しパターン**: タイル状に繰り返す場合は、端が自然につながるようにデザイン
- **グラデーションとの併用**: 背景画像の上に半透明のグラデーションを重ねると統一感が出る
- **テクスチャの追加**: 微細なノイズやテクスチャを追加すると質感が向上
- **カラーパレット**: ゲームのテーマカラー（紫系）と調和する色を選ぶ

### パフォーマンス最適化
- **画像の遅延読み込み**: 最初に表示される画面の背景だけ先に読み込む
- **複数解像度**: `srcset`属性やメディアクエリで画面サイズに応じて最適な画像を読み込む
- **キャッシュ**: ブラウザキャッシュを活用（ファイル名にバージョン番号を付ける）

### トラブルシューティング

**問題1: 背景画像が表示されない**
- パスが正しいか確認（相対パス vs 絶対パス）
- ファイル名の大文字小文字を確認
- ブラウザの開発者ツールでネットワークタブを確認

**問題2: 背景画像がぼやける**
- 解像度を上げる（2x、3x）
- `background-size: cover` の代わりに `background-size: 100% 100%` を試す
- 画像自体の品質を確認

**問題3: ファイルサイズが大きすぎる**
- WebP形式に変換
- 品質を85-90%に下げる
- 不要な装飾を削減
- 画像圧縮ツールを使用（TinyPNGなど）

**問題4: 背景が繰り返されてしまう**
- `background-repeat: no-repeat;` を追加
- `background-size: cover;` で画面全体を覆う

**問題5: モバイルで背景が切れる**
- `background-size: cover;` を使用
- または `background-size: contain;` で全体を表示
- モバイル用の別画像を用意

---

## 📚 参考リソース

- [Figma公式チュートリアル](https://help.figma.com/)
- [Photopea公式チュートリアル](https://www.photopea.com/learn/)
- [CSS Gradients](https://cssgradient.io/)
- [WebP画像形式](https://developers.google.com/speed/webp)

---

この手順書に従って、段階的にUIを強化していきましょう！質問があればお気軽にどうぞ。

