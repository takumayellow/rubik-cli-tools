# rubik-solver

ルービックキューブのスクランブル・解法ツール。**ブラウザで動く Web アプリ** と **CLI** の両方を提供します。

## Web アプリ

GitHub Pages で公開中: **https://takumayellow.github.io/rubik-solver/**

| 機能 | 内容 |
|------|------|
| インタラクティブキューブ | 2D ネット表示 + CSS 3D プレビュー |
| スクランブル | ランダム 20 手スクランブル |
| 手動操作 | R/U/F/L/D/B + プライム・2 回転 (18 手全対応) |
| 自動解法 | LBL (Layer-by-Layer) ソルバー、アニメーション付き |
| ダークテーマ | レスポンシブ対応 |

```
web/
├── index.html       # エントリーポイント
├── cube-solver.js   # キューブモデル + LBL ソルバー
├── cube-renderer.js # 2D ネット描画 + アニメーション
├── app.js           # UI コントローラー
└── style.css        # ダークテーマ CSS
```

## CLI ツール (Python / PowerShell)

ターミナルでスクランブル生成・最適解法・フェイス状態から復元を行うツール群。

> PowerShell スクリプト (`rubik.ps1`) は **Windows 限定**。Python スクリプトは各 OS で実行可能。

### セットアップ

```powershell
.\rubik.ps1 init
```

手動セットアップ:

```bash
python -m venv .venv && source .venv/bin/activate  # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 使い方

```powershell
# ランダムスクランブル → 自動解法
.\rubik.ps1 random
.\rubik.ps1 random -len 25 -seed 123

# 任意スクランブルを解く
.\rubik.ps1 solve -scramble "R U R' U' F2 L D2"

# 54 文字フェイス文字列から解く
.\rubik.ps1 facelets -state UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
```

```bash
# Python スクリプトを直接実行
python random_scramble_and_solve.py
python solve_from_moves.py "R U R' U' F2 L D2"
python solve_facelets.py UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
python overlay_solve.py   # Webカメラ + オーバーレイ表示
```

### Python スクリプト一覧

| スクリプト | 説明 |
|-----------|------|
| `random_scramble_and_solve.py` | ランダムスクランブルを生成し自動で解く |
| `solve_from_moves.py` | スクランブル手順の逆手順を生成 |
| `solve_facelets.py` | 54 文字フェイス文字列から 20 手以内の解を求める |
| `solve_with_kociemba_from_scramble.py` | スクランブル手順から kociemba で解く |
| `validate_facelets.py` | フェイス文字列の妥当性を検証 |
| `overlay_solve.py` | Webカメラ映像にステップを重ねて表示 |

> kociemba は最短手順を保証しません。God's Number (20 手) 以内の解を返します。

## ファイル構成

```
rubik-solver/
├── web/                               # Web アプリ (GitHub Pages)
│   ├── index.html
│   ├── cube-solver.js
│   ├── cube-renderer.js
│   ├── app.js
│   └── style.css
├── rubik.ps1                          # CLI エントリーポイント (PowerShell)
├── random_scramble_and_solve.py
├── solve_from_moves.py
├── solve_facelets.py
├── solve_with_kociemba_from_scramble.py
├── validate_facelets.py
├── overlay_solve.py
└── requirements.txt
```

## ライセンス

個人・学習目的で公開しています。`kociemba` および `pycuber` ライブラリのライセンスはそれぞれのパッケージに準じます。
