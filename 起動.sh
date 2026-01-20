#!/bin/bash

echo "========================================"
echo "ForCard ゲーム起動"
echo "========================================"
echo ""

# Node.jsがインストールされているか確認
if ! command -v node &> /dev/null; then
    echo "[エラー] Node.jsがインストールされていません。"
    echo "Node.jsをインストールしてください: https://nodejs.org/"
    exit 1
fi

echo "Node.jsが見つかりました。"
echo ""

# 依存関係がインストールされているか確認
if [ ! -d "node_modules" ]; then
    echo "依存関係をインストールしています..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[エラー] 依存関係のインストールに失敗しました。"
        exit 1
    fi
    echo ""
fi

# ビルドとサーバー起動
echo "ゲームをビルドしています..."
npm run build
if [ $? -ne 0 ]; then
    echo "[エラー] ビルドに失敗しました。"
    exit 1
fi

echo ""
echo "========================================"
echo "ビルド完了！サーバーを起動しています..."
echo "========================================"
echo ""
echo "ブラウザで以下のURLにアクセスしてください:"
echo "http://localhost:8080"
echo ""
echo "サーバーを停止するには、Ctrl+C を押してください。"
echo ""

# サーバー起動（ブラウザを自動で開く）
if command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:8080 &
elif command -v open &> /dev/null; then
    # macOS
    open http://localhost:8080 &
fi

npm run serve

