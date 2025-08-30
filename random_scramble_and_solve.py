import argparse, random
import pycuber as pc
import kociemba

MOVES = ["U","D","L","R","F","B"]
AXIS  = {"U":"U","D":"U","L":"L","R":"L","F":"F","B":"F"}
SUF   = ["", "'", "2"]

def random_scramble(length=25, seed=None):
    rng = random.Random(seed)
    seq, last_axis = [], None
    for _ in range(length):
        while True:
            base = rng.choice(MOVES)
            if AXIS[base] == last_axis:
                continue
            move = base + rng.choice(SUF)
            seq.append(move)
            last_axis = AXIS[base]
            break
    return " ".join(seq)

def to_facelets_URFDLB(c: pc.Cube) -> str:
    map_color_to_face = {}
    for face in "URFDLB":
        f = getattr(c, face)
        center_color = f[1][1].colour
        map_color_to_face[center_color] = face
    out = []
    for face in "URFDLB":
        f = getattr(c, face)
        for r in range(3):
            for col in range(3):
                out.append(map_color_to_face[f[r][col].colour])
    return "".join(out)

def main():
    ap = argparse.ArgumentParser(description="Generate scramble then solve with Kociemba")
    ap.add_argument("--len", type=int, default=25)
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    scramble = random_scramble(args.len, args.seed)
    cube = pc.Cube()
    cube(pc.Formula(scramble))
    facelets = to_facelets_URFDLB(cube)
    solution = kociemba.solve(facelets)

    print("=== Scramble (apply to solved) ===")
    print(scramble)
    print("\n=== Kociemba Solution (apply to scrambled) ===")
    print(solution)
    print(f"\nLength: {len(solution.split())} moves")

if __name__ == "__main__":
    main()
