# rubik-cli-tools

Rubik のスクランブル/解法を **全部 CLI** で回すツール。
PowerShell スクリプト (`rubik.ps1`) から Python バックエンドを呼び出し、ランダムスクランブル生成・最適解法・フェイス状態からの復元など、ルービックキューブ操作をすべてターミナルで完結させます。

---

## 特徴

| 機能 | 説明 |
|------|------|
| ランダムスクランブル | 指定手数・シードでスクランブルを生成し自動解法まで実行 |
| 任意スクランブル解法 | 手順文字列（例: `R U R' U'`）から最短解を求める |
| フェイス文字列解法 | 54 文字の URFDLB 表現から現在の状態を復元して解く |
| kociemba アルゴリズム | `kociemba` ライブラリによる 2 フェーズ最適解法 |
| pycuber シミュレーション | `pycuber` でキューブ状態をシミュレート・検証 |

---

## セットアップ

### 必要環境

- Python 3.8 以上
- PowerShell 5.1 以上（Windows）または pwsh（macOS / Linux）

### 初回セットアップ

```powershell
.\rubik.ps1 init
```

このコマンドが仮想環境の作成と依存パッケージのインストールを行います。
手動でセットアップする場合:

```bash
python -m venv .venv
# Windows:
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### requirements.txt

```
kociemba==1.2.1
pycuber==0.2.2
```

---

## 使い方

### ランダムスクランブル → 自動解法

```powershell
.\rubik.ps1 random
.\rubik.ps1 random -len 25 -seed 123
```

### 任意スクランブルを解く

```powershell
.\rubik.ps1 solve -scramble "R U R' U' F2 L D2"
```

### 54文字フェイス（URFDLB）から解く

```powershell
.\rubik.ps1 facelets -state UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
```

### Python スクリプトを直接実行する場合

```bash
# ランダムスクランブルと解法
python random_scramble_and_solve.py

# 任意スクランブルから解く
python solve_from_moves.py "R U R' U' F2 L D2"

# フェイス文字列から解く
python solve_facelets.py UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB

# フェイス文字列を検証する
python validate_facelets.py UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB

# オーバーレイ付き解法（ビジュアル表示）
python overlay_solve.py

# kociemba でスクランブルから直接解く
python solve_with_kociemba_from_scramble.py "R U R' U'"
```

---

## ファイル構成

```
rubik-cli-tools/
├── rubik.ps1                          # メインエントリーポイント（PowerShell）
├── random_scramble_and_solve.py       # ランダムスクランブル + 解法
├── solve_from_moves.py                # 手順文字列から解く
├── solve_facelets.py                  # フェイス文字列から解く
├── solve_with_kociemba_from_scramble.py  # kociemba で直接解法
├── validate_facelets.py               # フェイス文字列の検証
├── overlay_solve.py                   # オーバーレイ表示付き解法
└── requirements.txt                   # Python 依存ライブラリ
```

---

## フェイス文字列の表現形式

54 文字の文字列で、各面（U/R/F/D/L/B）の 9 マスを左上から右下へ順に並べます。

```
UUUUUUUUU  = U面（上）の 9 マス
RRRRRRRRR  = R面（右）の 9 マス
FFFFFFFFF  = F面（前）の 9 マス
DDDDDDDDD  = D面（下）の 9 マス
LLLLLLLLL  = L面（左）の 9 マス
BBBBBBBBB  = B面（後）の 9 マス
```

解いた状態（初期状態）は `UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB` です。

---

## ライセンス

個人・学習目的で公開しています。
`kociemba` および `pycuber` ライブラリのライセンスはそれぞれのパッケージに準じます。
