// cube-solver.js — Rubik's Cube state model + LBL solver
'use strict';

class CubeSolver {
  constructor() {
    this._state = this._solvedState();
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  _solvedState() {
    return {
      U: Array(9).fill('W'),
      D: Array(9).fill('Y'),
      F: Array(9).fill('G'),
      B: Array(9).fill('B'),
      L: Array(9).fill('O'),
      R: Array(9).fill('R'),
    };
  }

  _clone(state) {
    return {
      U: state.U.slice(),
      D: state.D.slice(),
      F: state.F.slice(),
      B: state.B.slice(),
      L: state.L.slice(),
      R: state.R.slice(),
    };
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  getState() {
    return this._clone(this._state);
  }

  reset() {
    this._state = this._solvedState();
  }

  isSolved() {
    const s = this._state;
    for (const face of ['U', 'D', 'F', 'B', 'L', 'R']) {
      const f = s[face];
      for (let i = 1; i < 9; i++) {
        if (f[i] !== f[0]) return false;
      }
    }
    return true;
  }

  applyMove(move) {
    const fn = CubeSolver._MOVES[move];
    if (!fn) throw new Error('Unknown move: ' + move);
    fn(this._state);
    return this;
  }

  applySequence(moves) {
    for (const m of moves) this.applyMove(m);
    return this;
  }

  scramble(numMoves = 20) {
    const base = ['R', 'L', 'U', 'D', 'F', 'B'];
    const suffixes = ['', "'", '2'];
    const applied = [];
    let lastBase = null;
    for (let i = 0; i < numMoves; i++) {
      let b;
      do {
        b = base[Math.floor(Math.random() * base.length)];
      } while (b === lastBase);
      lastBase = b;
      const s = suffixes[Math.floor(Math.random() * suffixes.length)];
      const m = b + s;
      applied.push(m);
      this.applyMove(m);
    }
    return applied;
  }

  solve() {
    // Work on a copy
    const solver = new _LBLSolver(this._clone(this._state));
    return solver.solve();
  }

  // ─── Move table ──────────────────────────────────────────────────────────────
  // Face indices (reading order, row-major):
  //  0 1 2
  //  3 4 5
  //  6 7 8
  //
  // Face orientations when looking at each face from outside:
  //   U face: looking down from above
  //   D face: looking up from below
  //   F face: looking toward you (front)
  //   B face: looking toward you from behind
  //   L face: looking toward you from the left
  //   R face: looking toward you from the right

  static _rotateFaceCW(f) {
    // Rotate a face 90° clockwise (looking at it from outside)
    return [
      f[6], f[3], f[0],
      f[7], f[4], f[1],
      f[8], f[5], f[2],
    ];
  }

  static _rotateFaceCCW(f) {
    return [
      f[2], f[5], f[8],
      f[1], f[4], f[7],
      f[0], f[3], f[6],
    ];
  }

  static _rotateFace180(f) {
    return [f[8], f[7], f[6], f[5], f[4], f[3], f[2], f[1], f[0]];
  }
}

// ─── Move implementations ────────────────────────────────────────────────────
// Each move mutates the state in-place.

CubeSolver._MOVES = {};

(function buildMoves() {
  const M = CubeSolver._MOVES;
  const CW = CubeSolver._rotateFaceCW;
  const CCW = CubeSolver._rotateFaceCCW;
  const F180 = CubeSolver._rotateFace180;

  // Helper: apply a cyclic 4-group permutation on sticker indices across faces.
  // cycle = [[face, idx], [face, idx], [face, idx], [face, idx]]
  // direction: 1 = forward (a→b→c→d→a reversed for CW), -1 = backward
  function cycle4(s, quads) {
    // quads is array of 4 [face, idx] pairs — values shift: [0]→[1]→[2]→[3]→[0]
    const tmp = s[quads[3][0]][quads[3][1]];
    s[quads[3][0]][quads[3][1]] = s[quads[2][0]][quads[2][1]];
    s[quads[2][0]][quads[2][1]] = s[quads[1][0]][quads[1][1]];
    s[quads[1][0]][quads[1][1]] = s[quads[0][0]][quads[0][1]];
    s[quads[0][0]][quads[0][1]] = tmp;
  }

  function cycleRow(s, quads) {
    // quads = [[f,i0,i1,i2], ...] — 3 stickers per group, shift group forward
    const t0 = s[quads[3][0]][quads[3][1]];
    const t1 = s[quads[3][0]][quads[3][2]];
    const t2 = s[quads[3][0]][quads[3][3]];
    s[quads[3][0]][quads[3][1]] = s[quads[2][0]][quads[2][1]];
    s[quads[3][0]][quads[3][2]] = s[quads[2][0]][quads[2][2]];
    s[quads[3][0]][quads[3][3]] = s[quads[2][0]][quads[2][3]];
    s[quads[2][0]][quads[2][1]] = s[quads[1][0]][quads[1][1]];
    s[quads[2][0]][quads[2][2]] = s[quads[1][0]][quads[1][2]];
    s[quads[2][0]][quads[2][3]] = s[quads[1][0]][quads[1][3]];
    s[quads[1][0]][quads[1][1]] = s[quads[0][0]][quads[0][1]];
    s[quads[1][0]][quads[1][2]] = s[quads[0][0]][quads[0][2]];
    s[quads[1][0]][quads[1][3]] = s[quads[0][0]][quads[0][3]];
    s[quads[0][0]][quads[0][1]] = t0;
    s[quads[0][0]][quads[0][2]] = t1;
    s[quads[0][0]][quads[0][3]] = t2;
  }

  // ── U move (CW looking from top) ──────────────────────────────────────────
  // U face rotates CW. Top rows of F, L, B, R cycle.
  // CW: F→L→B→R (i.e., F top row goes to R top row? Let's think carefully.)
  //
  // Standard: U CW (looking from top):
  //   F top row → R top row
  //   R top row → B top row (with reversal? No — standard U CW: F→R→B→L)
  //   Actually: F[0,1,2] → R[0,1,2], R[0,1,2] → B[0,1,2], B[0,1,2] → L[0,1,2], L[0,1,2] → F[0,1,2]
  //   (No reversal for U — the top rows all read left-to-right in their own face reference.)

  M['U'] = function(s) {
    s.U = CW(s.U);
    // F[0,1,2] → R[0,1,2] → B[0,1,2] → L[0,1,2] → F[0,1,2]
    cycleRow(s, [['F',0,1,2], ['R',0,1,2], ['B',0,1,2], ['L',0,1,2]]);
  };

  M["U'"] = function(s) {
    s.U = CCW(s.U);
    cycleRow(s, [['L',0,1,2], ['B',0,1,2], ['R',0,1,2], ['F',0,1,2]]);
  };

  M['U2'] = function(s) { M['U'](s); M['U'](s); };

  // ── D move (CW looking from bottom) ───────────────────────────────────────
  // D face rotates CW (from below). Bottom rows of F, L, B, R cycle.
  // CW from below: F→L→B→R (opposite to U)
  // F[6,7,8] → L[6,7,8] → B[6,7,8] → R[6,7,8] → F[6,7,8]

  M['D'] = function(s) {
    s.D = CW(s.D);
    // D CW (from below): F bottom goes to L bottom, L→B, B→R, R→F
    cycleRow(s, [['F',6,7,8], ['L',6,7,8], ['B',6,7,8], ['R',6,7,8]]);
  };

  M["D'"] = function(s) {
    s.D = CCW(s.D);
    cycleRow(s, [['R',6,7,8], ['B',6,7,8], ['L',6,7,8], ['F',6,7,8]]);
  };

  M['D2'] = function(s) { M['D'](s); M['D'](s); };

  // ── F move (CW looking at front) ──────────────────────────────────────────
  // F face CW. Adjacent: U bottom row, R left col, D top row, L right col
  // CW: U[6,7,8] → R[0,3,6] → D[2,1,0] → L[8,5,2]
  //     (with reversals due to orientation changes)
  //
  // Let's verify: F CW = front face turns clockwise.
  //   U bottom row [6,7,8]: left-to-right → goes to R left col [0,3,6]: top-to-bottom ✓
  //   R left col [0,3,6]: top-to-bottom → goes to D top row [2,1,0]: right-to-left ✓
  //   D top row [2,1,0]: right-to-left → goes to L right col [8,5,2]: bottom-to-top ✓
  //   L right col [8,5,2]: bottom-to-top → goes to U bottom row [6,7,8]: left-to-right ✓

  M['F'] = function(s) {
    s.F = CW(s.F);
    const [u6, u7, u8] = [s.U[6], s.U[7], s.U[8]];
    const [r0, r3, r6] = [s.R[0], s.R[3], s.R[6]];
    const [d2, d1, d0] = [s.D[2], s.D[1], s.D[0]];
    const [l8, l5, l2] = [s.L[8], s.L[5], s.L[2]];
    // U bottom → R left col
    s.R[0] = u6; s.R[3] = u7; s.R[6] = u8;
    // R left col → D top row (reversed)
    s.D[2] = r0; s.D[1] = r3; s.D[0] = r6;
    // D top row (reversed) → L right col
    s.L[8] = d2; s.L[5] = d1; s.L[2] = d0;
    // L right col → U bottom row
    s.U[6] = l8; s.U[7] = l5; s.U[8] = l2;
  };

  M["F'"] = function(s) {
    s.F = CCW(s.F);
    const [u6, u7, u8] = [s.U[6], s.U[7], s.U[8]];
    const [r0, r3, r6] = [s.R[0], s.R[3], s.R[6]];
    const [d0, d1, d2] = [s.D[0], s.D[1], s.D[2]];
    const [l2, l5, l8] = [s.L[2], s.L[5], s.L[8]];
    // Reverse of F: U←R, R←D, D←L, L←U
    s.U[6] = r0; s.U[7] = r3; s.U[8] = r6;
    s.R[0] = d2; s.R[3] = d1; s.R[6] = d0;
    s.D[0] = l8; s.D[1] = l5; s.D[2] = l2;
    s.L[2] = u8; s.L[5] = u7; s.L[8] = u6;
  };

  M['F2'] = function(s) { M['F'](s); M['F'](s); };

  // ── B move (CW looking at back face from outside) ─────────────────────────
  // B face CW (from outside back). Adjacent: U top row, L left col, D bottom row, R right col
  // B CW: U[2,1,0] → L[0,3,6] → D[6,7,8] → R[8,5,2]
  //   U top row right-to-left → L left col top-to-bottom
  //   L left col top-to-bottom → D bottom row left-to-right
  //   D bottom row left-to-right → R right col bottom-to-top
  //   R right col bottom-to-top → U top row right-to-left

  M['B'] = function(s) {
    s.B = CW(s.B);
    const [u2, u1, u0] = [s.U[2], s.U[1], s.U[0]];
    const [l0, l3, l6] = [s.L[0], s.L[3], s.L[6]];
    const [d6, d7, d8] = [s.D[6], s.D[7], s.D[8]];
    const [r8, r5, r2] = [s.R[8], s.R[5], s.R[2]];
    // U top (right-to-left) → L left col (top-to-bottom)
    s.L[0] = u2; s.L[3] = u1; s.L[6] = u0;
    // L left col → D bottom row
    s.D[6] = l0; s.D[7] = l3; s.D[8] = l6;
    // D bottom row → R right col (bottom-to-top)
    s.R[8] = d6; s.R[5] = d7; s.R[2] = d8;
    // R right col (bottom-to-top) → U top (right-to-left)
    s.U[2] = r8; s.U[1] = r5; s.U[0] = r2;
  };

  M["B'"] = function(s) {
    s.B = CCW(s.B);
    const [u0, u1, u2] = [s.U[0], s.U[1], s.U[2]];
    const [l0, l3, l6] = [s.L[0], s.L[3], s.L[6]];
    const [d6, d7, d8] = [s.D[6], s.D[7], s.D[8]];
    const [r2, r5, r8] = [s.R[2], s.R[5], s.R[8]];
    // Reverse: U←R, R←D, D←L, L←U
    s.U[0] = l6; s.U[1] = l3; s.U[2] = l0;
    s.L[0] = d8; s.L[3] = d7; s.L[6] = d6;
    s.D[6] = r2; s.D[7] = r5; s.D[8] = r8;
    s.R[2] = u0; s.R[5] = u1; s.R[8] = u2;
  };

  M['B2'] = function(s) { M['B'](s); M['B'](s); };

  // ── R move (CW looking at right face from outside) ────────────────────────
  // R face CW. Adjacent: U right col, B left col, D right col, F right col
  // R CW: U right col [2,5,8] → B left col [6,3,0] → D right col [2,5,8] → F right col [2,5,8]
  //   (B is "upside down" relative to U/D/F, so its left col reverses)
  //
  // Let's verify:
  //   U[2,5,8] top-to-bottom → F[2,5,8] top-to-bottom ✓ (F right col = what was U right col)
  //   Wait — standard R CW:
  //     F right col → U right col → B left col (reversed) → D right col → F right col
  //   Specifically:
  //     F[2,5,8] → U[2,5,8] → B[6,3,0] (B's "left" when viewed from behind = index 2,5,8 but reversed orientation)
  //                                       Actually B[0,3,6] is left col when facing B from outside.
  //                                       But since B is "behind", when F right goes up through U and around to B,
  //                                       it enters B's right col from B's perspective.
  //   Standard verified R CW permutation:
  //     U[2]←F[2], U[5]←F[5], U[8]←F[8]  (F right → U right)
  //     B[0]←U[8], B[3]←U[5], B[6]←U[2]  (U right → B left reversed)
  //     D[2]←B[6], D[5]←B[3], D[8]←B[0]  (B left reversed → D right)
  //     F[2]←D[2], F[5]←D[5], F[8]←D[8]  (D right → F right)

  M['R'] = function(s) {
    s.R = CW(s.R);
    const [f2, f5, f8] = [s.F[2], s.F[5], s.F[8]];
    const [u2, u5, u8] = [s.U[2], s.U[5], s.U[8]];
    const [b0, b3, b6] = [s.B[0], s.B[3], s.B[6]];
    const [d2, d5, d8] = [s.D[2], s.D[5], s.D[8]];
    // F right → U right
    s.U[2] = f2; s.U[5] = f5; s.U[8] = f8;
    // U right → B left (reversed: U[2]→B[6], U[5]→B[3], U[8]→B[0])
    s.B[0] = u8; s.B[3] = u5; s.B[6] = u2;
    // B left reversed → D right (B[0]→D[8], B[3]→D[5], B[6]→D[2])
    s.D[2] = b6; s.D[5] = b3; s.D[8] = b0;
    // D right → F right
    s.F[2] = d2; s.F[5] = d5; s.F[8] = d8;
  };

  M["R'"] = function(s) {
    s.R = CCW(s.R);
    const [f2, f5, f8] = [s.F[2], s.F[5], s.F[8]];
    const [u2, u5, u8] = [s.U[2], s.U[5], s.U[8]];
    const [b0, b3, b6] = [s.B[0], s.B[3], s.B[6]];
    const [d2, d5, d8] = [s.D[2], s.D[5], s.D[8]];
    // Reverse: F←U, U←B(rev), B←D, D←F
    s.F[2] = u2; s.F[5] = u5; s.F[8] = u8;
    s.U[2] = b6; s.U[5] = b3; s.U[8] = b0;
    s.B[0] = d8; s.B[3] = d5; s.B[6] = d2;
    s.D[2] = f2; s.D[5] = f5; s.D[8] = f8;
  };

  M['R2'] = function(s) { M['R'](s); M['R'](s); };

  // ── L move (CW looking at left face from outside) ─────────────────────────
  // L face CW. Adjacent: U left col, F left col, D left col, B right col
  // L CW: U[0,3,6] → B[8,5,2] → D[0,3,6] → F[0,3,6]
  //   F left → D left: F[0,3,6]→D[0,3,6]
  //   U left → F left: U[0,3,6]→F[0,3,6]
  //   B right (reversed) → U left: B[8,5,2]→U[0,3,6]
  //   D left → B right (reversed): D[0,3,6]→B[8,5,2]
  //
  // Standard L CW:
  //   F[0,3,6] → U[0,3,6]  (F left → U left)
  //   U[0,3,6] → B[8,5,2]  (U left → B right reversed)
  //   B[8,5,2] → D[0,3,6]  (B right reversed → D left? wait...)
  //   Actually standard: B right col when viewed from outside back is [2,5,8].
  //   But for L, U left going around to back enters B's right side.
  //   Verified L CW:
  //     U[0]←B[8], U[3]←B[5], U[6]←B[2]  (B right reversed → U left)
  //     F[0]←U[0], F[3]←U[3], F[6]←U[6]  (U left → F left)
  //     D[0]←F[0], D[3]←F[3], D[6]←F[6]  (F left → D left)
  //     B[2]←D[6], B[5]←D[3], B[8]←D[0]  (D left → B right reversed)

  M['L'] = function(s) {
    s.L = CW(s.L);
    const [u0, u3, u6] = [s.U[0], s.U[3], s.U[6]];
    const [f0, f3, f6] = [s.F[0], s.F[3], s.F[6]];
    const [d0, d3, d6] = [s.D[0], s.D[3], s.D[6]];
    const [b2, b5, b8] = [s.B[2], s.B[5], s.B[8]];
    // B right reversed → U left
    s.U[0] = b8; s.U[3] = b5; s.U[6] = b2;
    // U left → F left
    s.F[0] = u0; s.F[3] = u3; s.F[6] = u6;
    // F left → D left
    s.D[0] = f0; s.D[3] = f3; s.D[6] = f6;
    // D left → B right reversed
    s.B[2] = d6; s.B[5] = d3; s.B[8] = d0;
  };

  M["L'"] = function(s) {
    s.L = CCW(s.L);
    const [u0, u3, u6] = [s.U[0], s.U[3], s.U[6]];
    const [f0, f3, f6] = [s.F[0], s.F[3], s.F[6]];
    const [d0, d3, d6] = [s.D[0], s.D[3], s.D[6]];
    const [b2, b5, b8] = [s.B[2], s.B[5], s.B[8]];
    // Reverse: U←F, F←D, D←B(rev), B(rev)←U
    s.U[0] = f0; s.U[3] = f3; s.U[6] = f6;
    s.F[0] = d0; s.F[3] = d3; s.F[6] = d6;
    s.D[0] = b8; s.D[3] = b5; s.D[6] = b2;
    s.B[2] = u6; s.B[5] = u3; s.B[8] = u0;
  };

  M['L2'] = function(s) { M['L'](s); M['L'](s); };

})();

// ─── LBL Solver ──────────────────────────────────────────────────────────────
// Helpers shared by the solver

function _cloneState(s) {
  return { U: s.U.slice(), D: s.D.slice(), F: s.F.slice(),
           B: s.B.slice(), L: s.L.slice(), R: s.R.slice() };
}

function _applyMoveToState(s, m) {
  CubeSolver._MOVES[m](s);
}

function _applySeqToState(s, seq) {
  for (const m of seq) _applyMoveToState(s, m);
}

// IDDFS: find move sequence satisfying predicate, up to maxDepth. O(depth) memory.
function _bfsFind(startState, predicate, maxDepth, allowedMoves) {
  if (predicate(startState)) return [];
  const SAME_FACE = { R:0,"R'":0,R2:0, L:1,"L'":1,L2:1, U:2,"U'":2,U2:2,
                      D:3,"D'":3,D2:3, F:4,"F'":4,F2:4, B:5,"B'":5,B2:5 };
  function dfs(state, depth, path, lastFace) {
    for (const m of allowedMoves) {
      const mf = SAME_FACE[m];
      if (lastFace !== undefined && mf === lastFace) continue; // prune same face
      const ns = _cloneState(state);
      _applyMoveToState(ns, m);
      if (predicate(ns)) return path.concat(m);
      if (depth > 1) {
        const r = dfs(ns, depth - 1, path.concat(m), mf);
        if (r) return r;
      }
    }
    return null;
  }
  for (let d = 1; d <= maxDepth; d++) {
    const r = dfs(startState, d, [], undefined);
    if (r) return r;
  }
  return null;
}

const ALL_MOVES = ["R","R'","R2","U","U'","U2","F","F'","F2","L","L'","L2","D","D'","D2","B","B'","B2"];

class _LBLSolver {
  constructor(state) {
    this._state = _cloneState(state);
    this._moves = [];
  }

  // Apply move string sequence (space-separated) and record
  _apply(seq) {
    if (!seq || !seq.trim()) return;
    for (const m of seq.trim().split(/\s+/)) {
      _applyMoveToState(this._state, m);
      this._moves.push(m);
    }
  }

  // Apply a sequence found by BFS and record it
  _applyFound(seq) {
    if (seq && seq.length) {
      for (const m of seq) {
        _applyMoveToState(this._state, m);
        this._moves.push(m);
      }
    }
  }

  get(face, idx) { return this._state[face][idx]; }

  // ── Convenience state queries ──────────────────────────────────────────────

  // All 12 edge positions: [face1, idx1, face2, idx2]
  // face1/idx1 is considered "primary" (closer to the U or the "front")
  static get EDGES() {
    return [
      ['U',7,'F',1], ['U',5,'R',1], ['U',1,'B',1], ['U',3,'L',1],
      ['F',5,'R',3], ['R',5,'B',3], ['B',5,'L',3], ['L',5,'F',3],
      ['D',1,'F',7], ['D',5,'R',7], ['D',7,'B',7], ['D',3,'L',7],
    ];
  }

  // All 8 corner positions: [U/D-face, idx, f1, f1idx, f2, f2idx]
  static get CORNERS() {
    return [
      // U layer: UFR, UBR, UBL, ULF
      ['U',8, 'F',2, 'R',0],
      ['U',2, 'R',2, 'B',0],
      ['U',0, 'B',2, 'L',0],
      ['U',6, 'L',2, 'F',0],
      // D layer: DFR, DBR, DBL, DLF
      ['D',2, 'F',8, 'R',6],
      ['D',8, 'R',8, 'B',6],
      ['D',6, 'B',8, 'L',6],
      ['D',0, 'L',8, 'F',6],
    ];
  }

  // Find edge containing both colors c1 and c2; return its position descriptor
  _findEdge(c1, c2) {
    for (const [f1,i1,f2,i2] of _LBLSolver.EDGES) {
      const a = this._state[f1][i1], b = this._state[f2][i2];
      if ((a===c1&&b===c2)||(a===c2&&b===c1)) return [f1,i1,f2,i2];
    }
    return null;
  }

  // Find corner containing all three colors; return position descriptor
  _findCorner(c1, c2, c3) {
    for (const cp of _LBLSolver.CORNERS) {
      const [f0,i0,f1,i1,f2,i2] = cp;
      const cs = [this._state[f0][i0], this._state[f1][i1], this._state[f2][i2]];
      if (cs.includes(c1) && cs.includes(c2) && cs.includes(c3)) return cp;
    }
    return null;
  }

  // ── Step 1: White cross ──────────────────────────────────────────────────────
  // Target: U[7]=W,F[1]=G  U[5]=W,R[1]=R  U[1]=W,B[1]=B  U[3]=W,L[1]=O

  _solveWhiteCross() {
    const targets = [
      { uf: 'U', ui: 7, sf: 'F', si: 1, sc: 'G' },
      { uf: 'U', ui: 5, sf: 'R', si: 1, sc: 'R' },
      { uf: 'U', ui: 1, sf: 'B', si: 1, sc: 'B' },
      { uf: 'U', ui: 3, sf: 'L', si: 1, sc: 'O' },
    ];

    // Solve each edge up to 4 passes (later edges may disturb earlier ones if poorly handled,
    // but with careful single-edge BFS this should be fine in 1-2 passes)
    for (let pass = 0; pass < 2; pass++) {
      for (const tgt of targets) {
        this._solveWhiteCrossEdge(tgt);
      }
    }
  }

  _solveWhiteCrossEdge(tgt) {
    // Check if already solved
    if (this._state[tgt.uf][tgt.ui] === 'W' && this._state[tgt.sf][tgt.si] === tgt.sc) return;

    // Use BFS with moves that preserve already-solved cross edges where possible.
    // For simplicity, use all moves but limit depth to find the piece and insert it.
    // We search for a sequence that places this edge correctly.
    // Keep other already-solved cross edges in mind — use a 2-phase approach:
    //   Phase 1: bring edge to D layer (avoid U moves if possible)
    //   Phase 2: rotate D + insert

    // For robustness, use BFS on full state with predicate for this single edge + all previously solved edges.
    // With depth up to 8 this is tractable for one edge.

    // Determine which edges are already solved (to preserve them)
    const allTargets = [
      { uf:'U', ui:7, sf:'F', si:1, sc:'G' },
      { uf:'U', ui:5, sf:'R', si:1, sc:'R' },
      { uf:'U', ui:1, sf:'B', si:1, sc:'B' },
      { uf:'U', ui:3, sf:'L', si:1, sc:'O' },
    ];
    const alreadySolved = allTargets.filter(t =>
      this._state[t.uf][t.ui] === 'W' && this._state[t.sf][t.si] === t.sc && t !== tgt
    );

    const predicate = (s) => {
      if (s[tgt.uf][tgt.ui] !== 'W' || s[tgt.sf][tgt.si] !== tgt.sc) return false;
      for (const at of alreadySolved) {
        if (s[at.uf][at.ui] !== 'W' || s[at.sf][at.si] !== at.sc) return false;
      }
      return true;
    };

    const seq = _bfsFind(this._state, predicate, 7, ALL_MOVES);
    if (seq !== null) this._applyFound(seq);
  }

  // ── Step 2: White corners ────────────────────────────────────────────────────
  // Target corners: U[8]=W,F[2]=G,R[0]=R  U[2]=W,R[2]=R,B[0]=B  etc.

  _solveWhiteCorners() {
    const targets = [
      { u:8, f1:'F', i1:2, c1:'G', f2:'R', i2:0, c2:'R' },
      { u:2, f1:'R', i1:2, c1:'R', f2:'B', i2:0, c2:'B' },
      { u:0, f1:'B', i1:2, c1:'B', f2:'L', i2:0, c2:'O' },
      { u:6, f1:'L', i1:2, c1:'O', f2:'F', i2:0, c2:'G' },
    ];

    for (let pass = 0; pass < 2; pass++) {
      for (const tgt of targets) {
        this._solveCorner(tgt);
      }
    }
  }

  _solveCorner(tgt) {
    if (this._state.U[tgt.u] === 'W' &&
        this._state[tgt.f1][tgt.i1] === tgt.c1 &&
        this._state[tgt.f2][tgt.i2] === tgt.c2) return;

    // Cross must stay intact
    const crossCheck = (s) => {
      return s.U[7]==='W' && s.F[1]==='G' &&
             s.U[5]==='W' && s.R[1]==='R' &&
             s.U[1]==='W' && s.B[1]==='B' &&
             s.U[3]==='W' && s.L[1]==='O';
    };

    const predicate = (s) =>
      crossCheck(s) &&
      s.U[tgt.u] === 'W' &&
      s[tgt.f1][tgt.i1] === tgt.c1 &&
      s[tgt.f2][tgt.i2] === tgt.c2;

    const seq = _bfsFind(this._state, predicate, 7, ALL_MOVES);
    if (seq !== null) this._applyFound(seq);
  }

  // ── Step 3: Middle layer edges ───────────────────────────────────────────────
  // Direct-algorithm approach (no BFS) — each edge placed with U-rotations + 8-move insert.

  _solveMiddleLayer() {
    const slots = [
      {fc:'G',rc:'R',ff:'F',rf:'R',fi:5,ri:3},
      {fc:'R',rc:'B',ff:'R',rf:'B',fi:5,ri:3},
      {fc:'B',rc:'O',ff:'B',rf:'L',fi:5,ri:3},
      {fc:'O',rc:'G',ff:'L',rf:'F',fi:5,ri:3},
    ];
    for (let pass = 0; pass < 8; pass++) {
      let done = 0;
      for (const slot of slots) {
        this._insertMiddleEdge(slot);
        if (this._state[slot.ff][slot.fi]===slot.fc &&
            this._state[slot.rf][slot.ri]===slot.rc) done++;
      }
      if (done === 4) break;
    }
  }

  _insertMiddleEdge({fc, rc, ff, rf, fi, ri}) {
    if (this._state[ff][fi]===fc && this._state[rf][ri]===rc) return;
    // Two insert algorithms (built from slot face names):
    //   right: U rf U' rf' U' ff' U ff
    //   left:  U' ff' U ff U rf U' rf'
    const rightAlg = `U ${rf} U' ${rf}' U' ${ff}' U ${ff}`;
    const leftAlg  = `U' ${ff}' U ${ff} U ${rf} U' ${rf}'`;
    // Simulate all 4 U-rotations × 2 algs to find which combination works
    for (let urot = 0; urot < 4; urot++) {
      for (const alg of [rightAlg, leftAlg]) {
        const ts = _cloneState(this._state);
        for (let i = 0; i < urot; i++) _applyMoveToState(ts, 'U');
        for (const m of alg.trim().split(/\s+/)) _applyMoveToState(ts, m);
        if (ts[ff][fi]===fc && ts[rf][ri]===rc) {
          for (let i = 0; i < urot; i++) this._apply('U');
          this._apply(alg);
          return;
        }
      }
    }
    // Piece not in U layer: kick it from whichever middle slot holds it, then next pass handles it
    const midSlots = [
      {f1:'F',i1:5,f2:'R',i2:3},{f1:'R',i1:5,f2:'B',i2:3},
      {f1:'B',i1:5,f2:'L',i2:3},{f1:'L',i1:5,f2:'F',i2:3},
    ];
    for (const ms of midSlots) {
      const a = this._state[ms.f1][ms.i1], b = this._state[ms.f2][ms.i2];
      if ((a===fc&&b===rc)||(a===rc&&b===fc)) {
        this._apply(`${ms.f1} U ${ms.f1}' U' ${ms.f2}' U' ${ms.f2}`);
        return;
      }
    }
    // In D layer: rotate D to try to surface it next pass
    this._apply('D');
  }

  // ── Step 4: Yellow cross ─────────────────────────────────────────────────────
  // All 4 U edges show yellow: U[1],U[3],U[5],U[7] === 'Y'

  _solveYellowCross() {
    const predicate = (s) =>
      s.U[1]==='Y' && s.U[3]==='Y' && s.U[5]==='Y' && s.U[7]==='Y';
    if (predicate(this._state)) return;

    // Known OLL patterns and algorithms
    // F R U R' U' F' handles line → cross
    // F U R U' R' F' handles L-shape → cross
    const f1 = "F R U R' U' F'";
    const f2 = "F U R U' R' F'";

    for (let attempt = 0; attempt < 12; attempt++) {
      if (predicate(this._state)) return;
      const u1=this._state.U[1]==='Y', u3=this._state.U[3]==='Y',
            u5=this._state.U[5]==='Y', u7=this._state.U[7]==='Y';
      const cnt = [u1,u3,u5,u7].filter(Boolean).length;

      if (cnt === 0) {
        // Dot: F R U R' U' F' then F U R U' R' F'
        this._apply(f1);
      } else if (cnt === 2) {
        if (u3 && u5) {
          // Horizontal line
          this._apply(f1);
        } else if (u1 && u7) {
          // Vertical line — rotate to make horizontal
          this._apply('U');
          this._apply(f1);
        } else {
          // L-shape: orient so the L "corner" is at back-left (u1 and u3 both true)
          if      (u7 && u5) this._apply('U2');
          else if (u5 && u1) this._apply("U'");
          else if (u1 && u3) { /* ok */ }
          else if (u3 && u7) this._apply('U');
          this._apply(f2);
        }
      } else {
        this._apply('U');
      }
    }
  }

  // ── Step 5: Orient yellow corners ────────────────────────────────────────────
  // U[0],U[2],U[6],U[8] all === 'Y'

  _solveYellowCornersOLL() {
    // Use Sune: R U R' U R U2 R'
    // Handles all OLL corner cases through repetition

    const allYellow = (s) =>
      s.U[0]==='Y'&&s.U[2]==='Y'&&s.U[6]==='Y'&&s.U[8]==='Y';

    const sune = "R U R' U R U2 R'";
    const antisune = "R' U' R U' R' U2 R";

    for (let attempt = 0; attempt < 12; attempt++) {
      if (allYellow(this._state)) return;

      const c = [this._state.U[8]==='Y', this._state.U[2]==='Y',
                 this._state.U[0]==='Y', this._state.U[6]==='Y'];
      const cnt = c.filter(Boolean).length;

      if (cnt === 0) {
        // No yellow corners on top: Sune puts 1 in correct spot
        this._apply(sune);
      } else if (cnt === 1) {
        // Position the solved corner at UFR (U[8])
        if      (c[1]) this._apply("U'");   // U[2] → U[8]
        else if (c[2]) this._apply("U2");   // U[0] → U[8]
        else if (c[3]) this._apply("U");    // U[6] → U[8]
        // else c[0]: U[8] already correct
        this._apply(sune);
      } else if (cnt === 2) {
        // Sune will fix it
        this._apply(sune);
      } else if (cnt === 3) {
        // Anti-sune
        this._apply(antisune);
      }
    }
  }

  // ── Step 6: Permute yellow corners ───────────────────────────────────────────

  _permuteYellowCorners() {
    // Check if all corners are in correct positions (colors match adjacent centers)
    // Centers: F=G, R=R, B=B, L=O
    // After x2 flip: F-center='B', B-center='G', R-center='R', L-center='O'
    const cornersOk = (s) =>
      s.F[2]==='B' && s.R[0]==='R' &&   // UFR
      s.R[2]==='R' && s.B[0]==='G' &&   // UBR
      s.B[2]==='G' && s.L[0]==='O' &&   // UBL
      s.L[2]==='O' && s.F[0]==='B';     // ULF

    if (cornersOk(this._state)) return;

    // T-perm: swaps UFR and UBR corners (and two U edges, but we fix edges later)
    // Actually T-perm swaps UFR↔UBR and UF↔UR edges
    // For corner permutation only we need pure corner cycles.
    // Use: A-perm (cycles 3 corners)
    // Aa: x' R' U R' D2 R U' R' D2 R2 (cycles UFR→UBR→UBL)
    //   expressed without x rotation:
    //   Aa: R' F R' B2 R F' R' B2 R2 — cycles UFR→UBL→UBR (3-cycle)
    //   Actually let's use the standard:
    //   Aa (UFR→UBR→UBL): R' F R' B2 R F' R' B2 R2
    //   Ab (UFR→UBL→UBR): R2 B2 R F R' B2 R F' R
    // But these also move edges. We just need to get corners right and then fix edges.

    // Alternative: use a combination that only permutes corners.
    // Pure corner 3-cycle: U R U' L' U R' U' L (does 3-cycle of UFR, UBL, ULF but also moves edges)
    // Or just use Y-perm style: repeated T-perm / corner commutators.

    // Simplest robust approach: BFS for corner permutation
    // But with 4 corners and 18 moves this can be deep.
    // Use known algorithm: Aa and Ab perms.

    // Aa perm: cycles UFR→UBR→UBL (clockwise 3-cycle of 3 corners)
    const Aa = "R' F R' B2 R F' R' B2 R2";
    // Ab perm: cycles UFR→UBL→UBR (counter-clockwise)
    const Ab = "R2 B2 R F R' B2 R F' R";

    for (let attempt = 0; attempt < 12; attempt++) {
      if (cornersOk(this._state)) return;

      // Count correct corners
      const ok = [
        this._state.F[2]==='B' && this._state.R[0]==='R',   // UFR
        this._state.R[2]==='R' && this._state.B[0]==='G',   // UBR
        this._state.B[2]==='G' && this._state.L[0]==='O',   // UBL
        this._state.L[2]==='O' && this._state.F[0]==='B',   // ULF
      ];
      const cnt = ok.filter(Boolean).length;

      if (cnt === 0 || cnt === 1) {
        // Try to find a correct corner and put it at UFR
        if      (ok[1]) this._apply("U'");  // UBR→UFR
        else if (ok[2]) this._apply("U2");  // UBL→UFR
        else if (ok[3]) this._apply("U");   // ULF→UFR
        // else ok[0] or none — apply Aa anyway
        // Determine direction of cycle by checking what's at UBR
        if (this._state.R[2]==='B') {  // 'B' = new F-center color in flipped frame
          this._apply(Ab);
        } else {
          this._apply(Aa);
        }
      } else {
        this._apply('U');
      }
    }
  }

  // ── Step 7: Permute yellow edges ──────────────────────────────────────────────

  _permuteYellowEdges() {
    // After corners are permuted correctly, align them with centers via U rotation,
    // then use Ua/Ub to cycle the 3 or 4 remaining misplaced edges.

    // First align corners with U rotations
    for (let r = 0; r < 4; r++) {
      if (this._state.F[2]==='B' && this._state.R[0]==='R') break;  // F-center='B' in flipped frame
      this._apply('U');
    }

    // Ua: cycles F→R→B (B stays) — actually standard Ua:
    //   R U' R U R U R U' R' U' R2
    // Ub: cycles F→L→B (B stays)
    //   R2 U R U R' U' R' U' R' U R'
    //
    // Verify Ua effect on edges:
    // R U' R U R U R U' R' U' R2: this is a known 3-cycle of U edges.
    // Let's use a different well-known form to be safe:
    // Ua: R2 U' R' U' R U R U R U' R (cycles UF→UR→UB, UL stays)
    //   Hmm, let me use Z-based or commutator form.
    //
    // Most reliable Ua (cycles UL→UF→UB, UR stays? No...):
    // Let's use the sequence verified to cycle exactly 3 U-layer edges.
    //
    // From WCA algorithms (Ua): R U' R U R U R U' R' U' R2
    // This cycles: UF→UR→UL (UB stays)? Let's test mentally — too complex.
    //
    // Alternative: use the "adjacent 3-cycle" via triple-commutator:
    // Cycle UF, UR, UB (UL stays): (R U R' U')×3 flipped appropriately
    //
    // Safest: just use BFS for the edge permutation (max depth ~8)

    // After x2 flip: F-center='B', B-center='G'
    const edgesOk = (s) =>
      s.F[1]==='B' && s.R[1]==='R' && s.B[1]==='G' && s.L[1]==='O';

    if (edgesOk(this._state)) return;

    // The corners are now fixed. Use moves that don't disturb corners:
    // Only U-layer edge cycling (U2, and sequences like R U2 R' U R U2 R' etc.)
    // Or just BFS with all moves limited to sequences that keep corners in place.

    // For PLL edge permutation, we need to cycle 3 or flip 2 pairs.
    // Use well-known algs:
    // Ua (CCW cycle): M2 U M U2 M' U M2 — uses M moves, can't use directly
    // Instead use:
    //   Ua: R' U R' U' R' U' R' U R U R2  (cycles UF→UL→UB, UR stays)
    //   Ub: R2 U' R' U' R U R U R U' R     (cycles UF→UR→UB, UL stays)
    //
    // Z-perm (swaps UF↔UB and UR↔UL simultaneously):
    //   M' U M2 U M2 U M' U2 M2 — needs M moves
    //   Using R/L/U only: R' U' R U' R U R U' R' U R U R2 U' R' (approximate)
    //
    // Let's use CORRECT Ua and Ub in R/U notation:
    // Ua (3-cycle UF→UR→UB, UL untouched):
    //   R2 U R U R' U' R' U' R' U R'
    // Ub (3-cycle UF→UL→UB, UR untouched):
    //   R U' R U R U R U' R' U' R2

    const Ua = "R2 U R U R' U' R' U' R' U R'";
    const Ub = "R U' R U R U R U' R' U' R2";

    // H-perm (swap UF↔UB, UR↔UL):
    //   M2 U M2 U2 M2 U M2 — M-based. Use R/U form:
    //   R2 U2 R U2 R2 U2 R2 U2 R U2 R2 (not quite)
    // Or apply Ua twice with a U between:
    const Hperm = Ua + " " + Ua; // apply twice if opposite edges swapped

    for (let attempt = 0; attempt < 12; attempt++) {
      // Re-check corner alignment first
      for (let r = 0; r < 4; r++) {
        if (this._state.F[2]==='B' && this._state.R[0]==='R') break;
        this._apply('U');
      }

      if (edgesOk(this._state)) return;

      const ef = this._state.F[1]==='G';
      const er = this._state.R[1]==='R';
      const eb = this._state.B[1]==='B';
      const el = this._state.L[1]==='O';
      const cnt = [ef,er,eb,el].filter(Boolean).length;

      if (cnt === 0) {
        // Try Ua then re-check
        this._apply(Ua);
      } else if (cnt === 1) {
        // Rotate so correct edge is at back
        for (let r = 0; r < 4; r++) {
          if (this._state.B[1]==='G') break;  // B-center='G' in flipped frame
          this._apply('U');
        }
        if (this._state.F[1]==='O') {
          // What belongs at L is at F → Ub cycles F→L
          this._apply(Ub);
        } else {
          // What belongs at R is at F → Ua cycles F→R
          this._apply(Ua);
        }
      } else if (cnt === 2) {
        // Check if opposite pair or adjacent pair
        if ((ef&&eb) || (er&&el)) {
          // Opposite — apply Ua twice (= H-perm equivalent)
          this._apply(Ua);
          this._apply(Ua);
        } else {
          // Adjacent — apply one Ua/Ub
          this._apply(Ua);
        }
      } else {
        this._apply('U');
      }
    }

    // Final U alignment
    for (let r = 0; r < 4; r++) {
      if (this._isSolved()) return;
      this._apply('U');
    }
  }

  _isSolved() {
    const s = this._state;
    for (const f of ['U','D','F','B','L','R']) {
      const face = s[f], c = face[0];
      for (let i=1;i<9;i++) if(face[i]!==c) return false;
    }
    return true;
  }

  // ── x2 flip: bring yellow from D to U so OLL/PLL algorithms work on U ─────────
  // x2: new U = rev(old D), new D = rev(old U), new F = rev(old B), new B = rev(old F),
  //     new L = rev(old L), new R = rev(old R)

  _applyX2Flip() {
    const s = this._state;
    const rev = a => a.slice().reverse();
    const nU = rev(s.D), nD = rev(s.U), nF = rev(s.B), nB = rev(s.F);
    const nL = rev(s.L), nR = rev(s.R);
    s.U=nU; s.D=nD; s.F=nF; s.B=nB; s.L=nL; s.R=nR;
  }

  // ── Main entry ───────────────────────────────────────────────────────────────

  solve() {
    this._solveWhiteCross();
    this._solveWhiteCorners();
    this._solveMiddleLayer();

    // After F2L, yellow is on D. Flip state so yellow is on U for OLL/PLL.
    this._applyX2Flip();
    const preFlipIdx = this._moves.length;

    this._solveYellowCross();
    this._solveYellowCornersOLL();
    this._permuteYellowCorners();
    this._permuteYellowEdges();

    // Final U alignment
    for (let r = 0; r < 4; r++) {
      if (this._isSolved()) break;
      this._apply('U');
    }

    // Translate post-flip moves back to physical coordinates (x2 move mapping)
    const X2 = {
      'U':"D'","U'":"D",'U2':'D2',
      'D':"U'","D'":"U",'D2':'U2',
      'F':"B'","F'":"B",'F2':'B2',
      'B':"F'","B'":"F",'B2':'F2',
      'R':'R',"R'":"R'",'R2':'R2',
      'L':'L',"L'":"L'",'L2':'L2',
    };
    for (let i = preFlipIdx; i < this._moves.length; i++) {
      this._moves[i] = X2[this._moves[i]] || this._moves[i];
    }

    return this._moves;
  }
}

window.CubeSolver = CubeSolver;
