import argparse
import pycuber as pc
import kociemba

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
    ap = argparse.ArgumentParser(description="Solve a scramble with Kociemba")
    ap.add_argument("--scramble", required=True, help='e.g. "R U R\' U\' F2 L D2"')
    args = ap.parse_args()

    cube = pc.Cube()
    cube(pc.Formula(args.scramble))
    facelets = to_facelets_URFDLB(cube)
    solution = kociemba.solve(facelets)

    print("=== Scramble (apply to solved) ===")
    print(args.scramble)
    print("\n=== Facelets (URFDLB) ===")
    print(facelets)
    print("\n=== Kociemba Solution (apply to scrambled) ===")
    print(solution)
    print(f"\nLength: {len(solution.split())} moves")

if __name__ == "__main__":
    main()
