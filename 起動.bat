@echo off
chcp 65001 >nul
echo ========================================
echo ForCard ゲーム起動
echo ========================================
echo.

REM Node.jsがインストールされているか確認
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [エラー] Node.jsがインストールされていません。
    echo Node.jsをインストールしてください: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.jsが見つかりました。
echo.

REM 依存関係がインストールされているか確認
if not exist "node_modules" (
    echo 依存関係をインストールしています...
    call npm install
    if %errorlevel% neq 0 (
        echo [エラー] 依存関係のインストールに失敗しました。
        pause
        exit /b 1
    )
    echo.
)

REM ビルドとサーバー起動
echo ゲームをビルドしています...
call npm run build
if %errorlevel% neq 0 (
    echo [エラー] ビルドに失敗しました。
    pause
    exit /b 1
)

echo.
echo ========================================
echo ビルド完了！サーバーを起動しています...
echo ========================================
echo.
echo ブラウザで以下のURLにアクセスしてください:
echo http://localhost:8080
echo.
echo サーバーを停止するには、このウィンドウで Ctrl+C を押してください。
echo.

REM サーバー起動（ブラウザを自動で開く）
start http://localhost:8080
call npm run serve

pause

