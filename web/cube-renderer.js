// cube-renderer.js — 2D net display + CSS 3D preview + move animation

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Color palette
  // ---------------------------------------------------------------------------
  const COLORS = {
    W: '#f0f0f0',
    Y: '#ffd500',
    G: '#009b48',
    B: '#0046ad',
    O: '#ff5800',
    R: '#b90000',
  };

  const FACE_LABEL_COLOR = {
    U: '#f0f0f0',
    D: '#ffd500',
    F: '#009b48',
    B: '#0046ad',
    L: '#ff5800',
    R: '#b90000',
  };

  // Face names in display order
  const FACES = ['U', 'D', 'F', 'B', 'L', 'R'];

  // ---------------------------------------------------------------------------
  // Move → slice description
  //   axis:      'x' | 'y' | 'z'
  //   layer:     0 = left/bottom/back, 1 = middle, 2 = right/top/front
  //   direction: 1 = positive (CW when looking from +axis), -1 = negative
  // ---------------------------------------------------------------------------
  const MOVE_DEFS = {
    U:  { axis: 'y', layer: 2, dir:  1 },
    D:  { axis: 'y', layer: 0, dir: -1 },
    F:  { axis: 'z', layer: 2, dir:  1 },
    B:  { axis: 'z', layer: 0, dir: -1 },
    R:  { axis: 'x', layer: 2, dir:  1 },
    L:  { axis: 'x', layer: 0, dir: -1 },
    M:  { axis: 'x', layer: 1, dir: -1 },
    E:  { axis: 'y', layer: 1, dir: -1 },
    S:  { axis: 'z', layer: 1, dir:  1 },
  };

  // CSS rotation axis/angle for each axis+dir combo (positive rotation)
  const AXIS_ROTATE = {
    x: 'rotateX',
    y: 'rotateY',
    z: 'rotateZ',
  };

  // ---------------------------------------------------------------------------
  // Inject shared CSS once
  // ---------------------------------------------------------------------------
  let cssInjected = false;

  function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      .cr-root {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        font-family: sans-serif;
        user-select: none;
      }

      /* ── 2D net ──────────────────────────────────────────────────── */
      .cr-net {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        grid-template-rows: repeat(9, 1fr);
        gap: 0;
      }

      .cr-net-face {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(3, 1fr);
        gap: 2px;
        background: #1a1a1a;
        padding: 2px;
        border-radius: 4px;
      }

      .cr-sticker {
        border-radius: 4px;
        transition: background-color 300ms ease;
        aspect-ratio: 1;
      }

      /* flash overlay for move animation */
      .cr-net-face.cr-flash {
        animation: cr-flash-anim 300ms ease forwards;
      }

      @keyframes cr-flash-anim {
        0%   { opacity: 1; }
        30%  { opacity: 0.35; }
        100% { opacity: 1; }
      }

      /* ── 3D preview ──────────────────────────────────────────────── */
      .cr-preview-wrap {
        position: relative;
      }

      .cr-scene {
        perspective: 600px;
      }

      .cr-cube {
        position: relative;
        transform-style: preserve-3d;
        transform: rotateX(-25deg) rotateY(35deg);
      }

      .cr-cube-face {
        position: absolute;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(3, 1fr);
        gap: 2px;
        background: #1a1a1a;
        padding: 2px;
        box-sizing: border-box;
        backface-visibility: hidden;
      }

      .cr-preview-label {
        text-align: center;
        font-size: 11px;
        color: #888;
        margin-top: 4px;
      }

      /* animating state — disable pointer events */
      .cr-root.cr-animating {
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Utility helpers
  // ---------------------------------------------------------------------------
  function el(tag, cls, style) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (style) Object.assign(e.style, style);
    return e;
  }

  /**
   * Parse a move string like "R", "R'", "R2" into
   * { base: 'R', count: 1|2, prime: false|true }
   */
  function parseMove(move) {
    const m = move.trim().match(/^([UDFBLRMES])('?)(\d?)$/i);
    if (!m) throw new Error('Invalid move: ' + move);
    const base = m[1].toUpperCase();
    const prime = m[2] === "'";
    const count = m[3] === '2' ? 2 : 1;
    return { base, prime, count };
  }

  // ---------------------------------------------------------------------------
  // CubeRenderer class
  // ---------------------------------------------------------------------------
  class CubeRenderer {
    /**
     * @param {HTMLElement} container
     * @param {{ size?: number }} options
     */
    constructor(container, options = {}) {
      if (!(container instanceof HTMLElement)) {
        throw new Error('CubeRenderer: container must be an HTMLElement');
      }

      injectCSS();

      this._container = container;
      this._size = (options.size != null ? options.size : 240);
      this._animating = false;
      this._state = null;

      // sticker element refs for fast updates
      // _netStickers[face][index] = <div>
      this._netStickers = {};
      // _previewStickers[face][index] = <div>
      this._previewStickers = {};
      // face wrapper refs for flash animation
      this._netFaceEls = {};

      this._build();
    }

    // ── DOM construction ─────────────────────────────────────────────────────

    _build() {
      const container = this._container;
      container.innerHTML = '';

      const root = el('div', 'cr-root');
      this._root = root;

      // 2D net
      const net = this._buildNet();
      root.appendChild(net);

      // 3D preview
      const preview = this._buildPreview();
      root.appendChild(preview);

      container.appendChild(root);
    }

    _buildNet() {
      const stickerPx = Math.round(this._size / 12); // approx cell size
      const gapPx = 2;
      const facePx = stickerPx * 3 + gapPx * 4; // 3 cells + gaps + padding

      /*
       * Net layout (using CSS grid):
       *
       *  Col offsets (in face units):  0  1  2  3
       *  Row 0          [U]               col 1
       *  Row 1  [L][F][R][B]  cols 0-3
       *  Row 2          [D]               col 1
       *
       * We use a 12-column × 9-row grid where each face occupies 3×3 cells.
       */

      const netWrap = el('div', 'cr-net');
      netWrap.style.width = facePx * 4 + 'px';
      netWrap.style.height = facePx * 3 + 'px';
      netWrap.style.gridTemplateColumns = `repeat(4, ${facePx}px)`;
      netWrap.style.gridTemplateRows = `repeat(3, ${facePx}px)`;
      netWrap.style.gap = '4px';
      netWrap.style.background = 'transparent';

      // face → [grid-row, grid-col] (1-indexed)
      const NET_POSITIONS = {
        U: [1, 2],
        L: [2, 1],
        F: [2, 2],
        R: [2, 3],
        B: [2, 4],
        D: [3, 2],
      };

      for (const face of FACES) {
        const [row, col] = NET_POSITIONS[face];
        const faceEl = el('div', 'cr-net-face');
        faceEl.style.gridRow = String(row);
        faceEl.style.gridColumn = String(col);
        faceEl.style.width = facePx + 'px';
        faceEl.style.height = facePx + 'px';
        // sticker size
        const cellPx = stickerPx - 2;

        this._netStickers[face] = [];
        this._netFaceEls[face] = faceEl;

        for (let i = 0; i < 9; i++) {
          const sticker = el('div', 'cr-sticker');
          sticker.style.width = cellPx + 'px';
          sticker.style.height = cellPx + 'px';
          sticker.style.background = '#333';
          faceEl.appendChild(sticker);
          this._netStickers[face].push(sticker);
        }

        netWrap.appendChild(faceEl);
      }

      return netWrap;
    }

    _buildPreview() {
      const size = Math.round(this._size * 0.5); // smaller preview
      const stickerPx = Math.floor(size / 3) - 2;
      const facePx = size;

      const wrap = el('div', 'cr-preview-wrap');

      const scene = el('div', 'cr-scene');
      scene.style.width = facePx + 'px';
      scene.style.height = facePx + 'px';

      const cube = el('div', 'cr-cube');
      cube.style.width = facePx + 'px';
      cube.style.height = facePx + 'px';
      this._cube3d = cube;

      // half-size of cube for translateZ
      const half = facePx / 2;

      // face transform definitions
      const FACE_TRANSFORMS = {
        F: `rotateY(0deg)   translateZ(${half}px)`,
        B: `rotateY(180deg) translateZ(${half}px)`,
        L: `rotateY(-90deg) translateZ(${half}px)`,
        R: `rotateY(90deg)  translateZ(${half}px)`,
        U: `rotateX(90deg)  translateZ(${half}px)`,
        D: `rotateX(-90deg) translateZ(${half}px)`,
      };

      for (const face of FACES) {
        const faceEl = el('div', 'cr-cube-face');
        faceEl.style.width = facePx + 'px';
        faceEl.style.height = facePx + 'px';
        faceEl.style.transform = FACE_TRANSFORMS[face];
        faceEl.style.top = '0';
        faceEl.style.left = '0';

        this._previewStickers[face] = [];

        for (let i = 0; i < 9; i++) {
          const sticker = el('div', 'cr-sticker');
          sticker.style.width = stickerPx + 'px';
          sticker.style.height = stickerPx + 'px';
          sticker.style.background = '#333';
          // no transition on 3D preview — pure snap
          sticker.style.transition = 'none';
          faceEl.appendChild(sticker);
          this._previewStickers[face].push(sticker);
        }

        cube.appendChild(faceEl);
      }

      scene.appendChild(cube);
      wrap.appendChild(scene);

      const label = el('div', 'cr-preview-label');
      label.textContent = '3D preview';
      wrap.appendChild(label);

      return wrap;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Immediately re-draws all stickers to match state.
     * @param {{ U, D, F, B, L, R }} state
     */
    render(state) {
      if (!state) return;
      this._state = state;
      this._applyState(state, false);
    }

    /**
     * Animate a move, then snap to the new state.
     * @param {string} move  e.g. 'R', "R'", 'R2'
     * @param {{ U, D, F, B, L, R }} state  the NEW state after the move
     * @param {number} [duration=350]  milliseconds
     * @returns {Promise<void>}
     */
    animateMove(move, state, duration = 350) {
      return new Promise((resolve) => {
        this.setAnimating(true);

        let parsed;
        try {
          parsed = parseMove(move);
        } catch (_) {
          // Unknown move — just snap
          this.render(state);
          this.setAnimating(false);
          resolve();
          return;
        }

        const def = MOVE_DEFS[parsed.base];
        if (!def) {
          // Unsupported move — just snap
          this.render(state);
          this.setAnimating(false);
          resolve();
          return;
        }

        // Determine rotation degrees
        let deg = 90 * parsed.count;
        if (parsed.prime) deg = -deg;
        // Adjust for face direction
        deg *= def.dir;

        // Flash the affected net faces, animate the 3D preview cube
        this._animateFlash(parsed.base, duration).then(() => {
          // After flash, snap to new state
          this.render(state);
          this.setAnimating(false);
          resolve();
        });

        // Also tilt the 3D cube briefly
        this._animate3DSlice(def.axis, deg, duration);
      });
    }

    /**
     * Disables/re-enables click interactions during animation.
     * @param {boolean} bool
     */
    setAnimating(bool) {
      this._animating = bool;
      if (bool) {
        this._root.classList.add('cr-animating');
      } else {
        this._root.classList.remove('cr-animating');
      }
    }

    // ── Internal rendering ────────────────────────────────────────────────────

    _applyState(state, transition = true) {
      for (const face of FACES) {
        const colors = state[face];
        if (!colors) continue;

        const netStickers = this._netStickers[face];
        const previewStickers = this._previewStickers[face];

        for (let i = 0; i < 9; i++) {
          const colorKey = colors[i];
          const hex = COLORS[colorKey] || '#555';

          if (netStickers[i]) {
            netStickers[i].style.background = hex;
          }
          if (previewStickers[i]) {
            previewStickers[i].style.background = hex;
          }
        }
      }
    }

    /**
     * Determine which faces are affected by a base move letter, then
     * flash those net face elements.
     */
    _animateFlash(base, duration) {
      // Map move → affected faces (the faces that actually change stickers)
      const MOVE_FACES = {
        U: ['U', 'F', 'R', 'B', 'L'],
        D: ['D', 'F', 'R', 'B', 'L'],
        F: ['F', 'U', 'R', 'D', 'L'],
        B: ['B', 'U', 'L', 'D', 'R'],
        R: ['R', 'U', 'F', 'D', 'B'],
        L: ['L', 'U', 'B', 'D', 'F'],
        M: ['L', 'U', 'F', 'D', 'B'],
        E: ['D', 'F', 'R', 'B', 'L'],
        S: ['F', 'U', 'R', 'D', 'L'],
      };

      const affected = MOVE_FACES[base] || FACES;

      // Trigger CSS flash animation on each affected face element
      for (const face of affected) {
        const faceEl = this._netFaceEls[face];
        if (!faceEl) continue;

        // Re-trigger animation by removing/adding class
        faceEl.classList.remove('cr-flash');
        // Force reflow
        void faceEl.offsetWidth; // eslint-disable-line no-unused-expressions
        faceEl.style.animationDuration = duration + 'ms';
        faceEl.classList.add('cr-flash');
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          for (const face of affected) {
            const faceEl = this._netFaceEls[face];
            if (faceEl) faceEl.classList.remove('cr-flash');
          }
          resolve();
        }, duration);
      });
    }

    /**
     * Apply a quick wobble on the 3D preview cube to hint at the rotation axis.
     */
    _animate3DSlice(axis, deg, duration) {
      const cube = this._cube3d;
      if (!cube) return;

      const baseTransform = 'rotateX(-25deg) rotateY(35deg)';
      const rotFn = AXIS_ROTATE[axis];

      // small tilt in the direction of rotation, then return
      const tiltDeg = Math.sign(deg) * 15;
      const tiltTransform = `${baseTransform} ${rotFn}(${tiltDeg}deg)`;

      const half = duration / 2;
      cube.style.transition = `transform ${half}ms ease-out`;
      cube.style.transform = tiltTransform;

      setTimeout(() => {
        cube.style.transition = `transform ${half}ms ease-in`;
        cube.style.transform = baseTransform;
      }, half);
    }
  }

  // ---------------------------------------------------------------------------
  // Expose globally
  // ---------------------------------------------------------------------------
  window.CubeRenderer = CubeRenderer;
})();
