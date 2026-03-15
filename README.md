# rubik-cli-tools

Rubik のスクランブル/解法を **全部 CLI** で回すツール。

> **注意**: PowerShell スクリプト（`rubik.ps1`）は **Windows 限定**です。Python スクリプトは各 OS で直接実行できます。

---

## 初回セットアップ

```powershell
# Windows PowerShell（最新版の kociemba / pycuber をインストール）
.\rubik.ps1 init
```

---

## ランダムスクランブル → 自動解法

```powershell
.\rubik.ps1 random
.\rubik.ps1 random -len 25 -seed 123
```

---

## 任意スクランブルを解く

```powershell
.\rubik.ps1 solve -scramble "R U R' U' F2 L D2"
```

---

## 54文字フェイス(URFDLB)から解く

```powershell
.\rubik.ps1 facelets -state UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
```

---

## Python スクリプト一覧

| スクリプト | 説明 |
|---|---|
| `solve_facelets.py` | 54文字フェイス文字列から20手以内の解を求める（kociemba） |
| `validate_facelets.py` | 54文字フェイス文字列の妥当性を検証し、解ける場合は解を表示 |
| `solve_from_moves.py` | スクランブル手順の逆手順（復元手順）を生成 |
| `solve_with_kociemba_from_scramble.py` | スクランブル手順から20手以内の解を求める（kociemba） |
| `overlay_solve.py` | Webカメラ映像にステップを重ねて表示するオーバーレイ解法 |
| `random_scramble_and_solve.py` | ランダムスクランブルを生成し自動で解く |

> **注**: kociemba は最短手順を**保証しません**。God's Number（20手）以内の解を返します。

---

## 各スクリプトの使用例

### solve_facelets.py

```bash
python solve_facelets.py --state UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
```

### validate_facelets.py

```bash
python validate_facelets.py --state UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
```

### solve_from_moves.py（逆手順生成）

```bash
python solve_from_moves.py --scramble "R U R' U' F2 L D2"
```

### solve_with_kociemba_from_scramble.py

```bash
python solve_with_kociemba_from_scramble.py --scramble "R U R' U' F2 L D2"
```

### overlay_solve.py

```bash
python overlay_solve.py -scramble "R U R' U' F2 L D2" -cam 0 -autoplay 1500
# または
python overlay_solve.py -state UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
```

### random_scramble_and_solve.py

```bash
python random_scramble_and_solve.py --len 25 --seed 123
```
