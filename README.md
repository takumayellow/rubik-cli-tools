# rubik-cli-tools

Rubik のスクランブル/解法を **全部 CLI** で回すツール。

## 初回セットアップ
.\rubik.ps1 init

## ランダムスクランブル → 自動解法
.\rubik.ps1 random
.\rubik.ps1 random -len 25 -seed 123

## 任意スクランブルを解く
.\rubik.ps1 solve -scramble "R U R' U' F2 L D2"

## 54文字フェイス(URFDLB)から解く
.\rubik.ps1 facelets -state UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
