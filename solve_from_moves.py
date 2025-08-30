import argparse

def invert_moves(seq: str) -> str:
    inv = []
    for m in reversed(seq.split()):
        m = m.strip()
        if not m: 
            continue
        if m.endswith("2"):
            inv.append(m)        # 180度は自己逆
        elif m.endswith("'"):
            inv.append(m[:-1])   # R' -> R
        else:
            inv.append(m + "'")  # R  -> R'
    return " ".join(inv)

def main():
    ap = argparse.ArgumentParser(description="Return exact inverse solution of a scramble sequence")
    ap.add_argument("--scramble", required=True, help="e.g. \"R U R' U' F2 L D2 ...\"")
    args = ap.parse_args()

    scramble = " ".join(args.scramble.split())  # 正規化（余分な空白を削る）
    solution = invert_moves(scramble)

    print("=== Scramble (apply to solved) ===")
    print(scramble)
    print("\n=== Solution (apply to scrambled) ===")
    print(solution)
    print("\n※Scramble を完成キューブに打つ→続けて Solution を打てば必ず完成します。")

if __name__ == "__main__":
    main()
