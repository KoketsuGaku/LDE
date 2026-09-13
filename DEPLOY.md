# デプロイ手順 — GitHub Pages

## 初回セットアップ

### 1. GitHubにリポジトリを作成

1. [github.com/new](https://github.com/new) を開く
2. Repository name: `conlang-dev`（任意）
3. **Private** を選択（他人に見せたくない場合）
4. 「Create repository」をクリック

### 2. ローカルからpush

プロジェクトフォルダで以下を実行：

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/conlang-dev.git
git push -u origin main
```

### 3. GitHub Pagesを有効化

1. リポジトリの **Settings** → **Pages** を開く
2. Source: **GitHub Actions** を選択
3. 保存

pushした瞬間に自動でビルド&デプロイが始まります。
数分後に `https://あなたのユーザー名.github.io/conlang-dev/` で公開されます。

---

## 更新方法（以降）

```bash
git add .
git commit -m "更新内容のメモ"
git push
```

pushするたびに自動でデプロイされます。

---

## データの同期について

現状はブラウザのLocalStorageにデータが保存されます。
**PCとスマホは別々のデータ**になるため、以下の方法で手動同期してください。

- PCで編集 → ヘッダーの「**書出**」ボタンでJSONをダウンロード
- スマホで「**読込**」ボタンからそのJSONを読み込む

> **将来的なデータ同期（Supabase等）はフェーズ3で対応予定**

---

## スマホからのアクセス

公開URLをスマホのブラウザで開くだけで使えます。
ホーム画面に追加（PWA的な使い方）も可能です：

- **iOS Safari**: 共有ボタン → 「ホーム画面に追加」
- **Android Chrome**: メニュー → 「ホーム画面に追加」
