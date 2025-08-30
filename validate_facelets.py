import argparse, sys, kociemba

def validate(s: str):
    s = s.strip().upper()
    if len(s) != 54:
        return False, "length must be 54"
    if any(c not in "URFDLB" for c in s):
        return False, "letters must be only URFDLB"
    try:
        sol = kociemba.solve(s)  # 解けるか実際に試す
        return True, sol
    except Exception as e:
        return False, str(e)

def main():
    ap = argparse.ArgumentParser(description="Validate 54-char URFDLB facelets and (if valid) show a solution")
    ap.add_argument("--state", required=True, help="54 chars of URFDLB order (U R F D L B, 9 each)")
    args = ap.parse_args()

    ok, info = validate(args.state)
    if ok:
        print("[OK] valid & solvable")
        print("Solution:", info)
        sys.exit(0)
    else:
        print("[NG]", info)
        sys.exit(1)

if __name__ == "__main__":
    main()
