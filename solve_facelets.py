import argparse, sys, kociemba
def main():
    p = argparse.ArgumentParser(description="Solve 54-char facelets (URFDLB order)")
    p.add_argument("--state", required=True, help="54 chars of URFDLB")
    args = p.parse_args()
    s = args.state.strip().upper()
    if len(s) != 54 or any(c not in "URFDLB" for c in s):
        print("error: state must be 54 chars only of URFDLB"); sys.exit(1)
    print(kociemba.solve(s))
if __name__ == "__main__":
    main()
