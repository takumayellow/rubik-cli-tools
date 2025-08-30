import argparse, time
import cv2, numpy as np
import kociemba
import pycuber as pc

# ---------- util: pycuber → facelets(URFDLB) ----------
def to_facelets_URFDLB(cube: pc.Cube) -> str:
    # センターの色 → U/R/F/D/L/B の対応を作る
    map_color_to_face = {}
    for f in "URFDLB":
        face = cube.get_face(f)
        c = face[1][1].colour
        map_color_to_face[c] = f
    # 各面の 3x3 を URFDLB 順で文字化
    out = []
    for f in "URFDLB":
        face = cube.get_face(f)
        for i in range(3):
            for j in range(3):
                out.append(map_color_to_face[face[i][j].colour])
    return "".join(out)

# ---------- util: 手順トークン分割 ----------
def parse_moves(sol: str):
    sol = sol.strip()
    if not sol:
        return []
    return sol.split()

# ---------- HUD 描画 ----------
COL = {
    "U": (240,240,240),  # 白
    "R": (60,60,220),    # 赤
    "F": (60,180,75),    # 緑
    "D": (0,215,255),    # 黄
    "L": (0,140,255),    # 橙
    "B": (180,120,0),    # 青 (BGR)
}
def draw_cube_net(img, origin=(20,20), cell=18, thick=2, highlight=None, suffix=""):
    x0,y0 = origin
    def draw_face(face_letter, fx, fy):
        x = x0 + fx*3*cell
        y = y0 + fy*3*cell
        color = COL[face_letter]
        # 3x3
        for i in range(3):
            for j in range(3):
                p1=(x+j*cell, y+i*cell)
                p2=(x+(j+1)*cell, y+(i+1)*cell)
                cv2.rectangle(img,p1,p2,color,thickness=-1)
                cv2.rectangle(img,p1,p2,(30,30,30),1)
        # 枠
        cv2.rectangle(img,(x,y),(x+3*cell,y+3*cell),(0,0,0),thick)
        # ハイライト・注記
        if highlight==face_letter:
            cv2.rectangle(img,(x-2,y-2),(x+3*cell+2,y+3*cell+2),(0,255,255),3)
            if suffix:
                cv2.putText(img, suffix, (x, y-6), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,255), 1, cv2.LINE_AA)
    # 配置:    U
    #      L F R B
    #        D
    draw_face("U", 1, 0)
    draw_face("L", 0, 1)
    draw_face("F", 1, 1)
    draw_face("R", 2, 1)
    draw_face("B", 3, 1)
    draw_face("D", 1, 2)

def move_face_and_suffix(tok: str):
    face = tok[0]  # U/R/F/D/L/B
    suf = tok[1:] if len(tok)>1 else ""
    # 表示用
    if suf == "2":
        note = "×2"
    elif suf == "'":
        note = "CCW"
    else:
        note = "CW"
    return face, note

def overlay_panel(frame, moves, idx):
    h, w = frame.shape[:2]
    # 半透明パネル
    panel_h = 120
    overlay = frame.copy()
    cv2.rectangle(overlay, (0,0), (w, panel_h), (0,0,0), -1)
    frame[:] = cv2.addWeighted(overlay, 0.35, frame, 0.65, 0)

    # テキスト
    curr = moves[idx] if 0<=idx<len(moves) else "(done)"
    nxt1 = moves[idx+1] if idx+1 < len(moves) else "-"
    nxt2 = moves[idx+2] if idx+2 < len(moves) else "-"
    info = f"Step {idx+1}/{len(moves)}   now: {curr}   next: {nxt1} {nxt2}"
    cv2.putText(frame, info, (16, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2, cv2.LINE_AA)
    cv2.putText(frame, "SPACE/RIGHT: next,  LEFT: back,  A: autoplay,  Q: quit", (16, 56),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (230,255,230), 1, cv2.LINE_AA)

    # ネット + ハイライト
    hl, note = (None,"")
    if 0<=idx<len(moves):
        hl, note = move_face_and_suffix(moves[idx])
    draw_cube_net(frame, origin=(16, 70), cell=18, highlight=hl, suffix=note)

# ---------- main ----------
def main():
    ap = argparse.ArgumentParser(description="Webcam overlay for Rubik's steps")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("-scramble", type=str, help="e.g. \"R U R' U' F2 L D2\"")
    g.add_argument("-state", type=str, help="54 chars in URFDLB")
    ap.add_argument("-cam", type=int, default=0)
    ap.add_argument("-mirror", action="store_true")
    ap.add_argument("-autoplay", type=int, default=0, help="ms per step (0=manual)")
    args = ap.parse_args()

    # 1) 解法作成
    if args.state:
        facelets = args.state.strip().upper()
        if len(facelets)!=54 or any(c not in "URFDLB" for c in facelets):
            raise SystemExit("state は URFDLB の 54 文字にしてください")
    else:
        cube = pc.Cube()
        for mv in pc.Formula(args.scramble): cube(mv)
        facelets = to_facelets_URFDLB(cube)
    solution = kociemba.solve(facelets)
    moves = parse_moves(solution)

    # 2) カメラ開始
    cap = cv2.VideoCapture(args.cam)
    if not cap.isOpened():
        raise SystemExit(f"camera {args.cam} が開けません")
    idx = 0
    last = time.time()
    autoplay = args.autoplay

    while True:
        ok, frame = cap.read()
        if not ok: break
        if args.mirror:
            frame = cv2.flip(frame, 1)

        overlay_panel(frame, moves, idx)
        cv2.imshow("Rubik overlay", frame)

        # 自動送り
        if autoplay>0 and idx < len(moves):
            if (time.time()-last)*1000 >= autoplay:
                idx += 1
                last = time.time()

        k = cv2.waitKey(16) & 0xFF
        if k in (ord('q'), 27):
            break
        elif k in (32, ord('\r'), ord('\n'), 83):  # SPACE/ENTER/RIGHT
            if idx < len(moves):
                idx += 1
                last = time.time()
        elif k == 81:  # LEFT
            idx = max(0, idx-1)
            last = time.time()
        elif k in (ord('a'), ord('A')):
            if autoplay>0:
                autoplay = 0
            else:
                autoplay = 1000  # 1秒/手
                last = time.time()

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()



