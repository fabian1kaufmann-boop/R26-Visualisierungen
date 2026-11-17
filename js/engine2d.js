(function (global) {
  "use strict";

  class Plot2D {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.xMin = opts.xMin !== undefined ? opts.xMin : -2.2;
      this.xMax = opts.xMax !== undefined ? opts.xMax : 2.2;
      this.yMin = opts.yMin !== undefined ? opts.yMin : -2.2;
      this.yMax = opts.yMax !== undefined ? opts.yMax : 2.2;
      this.pad = opts.pad || { left: 46, right: 18, top: 20, bottom: 36 };
      this.keepAspect = opts.keepAspect !== undefined ? opts.keepAspect : true;
    }

    setBounds(xMin, xMax, yMin, yMax) {
      this.xMin = xMin;
      this.xMax = xMax;
      this.yMin = yMin;
      this.yMax = yMax;
    }

    _metrics() {
      const { ctx, w, h } = global.Eng3D.setupHiDPICanvas(this.canvas);
      const pw = w - this.pad.left - this.pad.right;
      const ph = h - this.pad.top - this.pad.bottom;
      let sx = pw / (this.xMax - this.xMin);
      let sy = ph / (this.yMax - this.yMin);
      let ox = this.pad.left;
      let oy = this.pad.top;
      let plotW = pw;
      let plotH = ph;
      if (this.keepAspect) {
        const s = Math.min(sx, sy);
        sx = s;
        sy = s;
        plotW = s * (this.xMax - this.xMin);
        plotH = s * (this.yMax - this.yMin);
        ox += (pw - plotW) * 0.5;
        oy += (ph - plotH) * 0.5;
      }
      return { ctx, w, h, ox, oy, plotW, plotH, sx, sy };
    }

    toPx(x, y, m) {
      return [
        m.ox + (x - this.xMin) * m.sx,
        m.oy + (this.yMax - y) * m.sy
      ];
    }

    toWorld(px, py) {
      const m = this._metrics();
      return [
        this.xMin + (px - m.ox) / m.sx,
        this.yMax - (py - m.oy) / m.sy
      ];
    }

    attachProbe(onMove) {
      let down = false;
      const handle = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const [wx, wy] = this.toWorld(e.clientX - rect.left, e.clientY - rect.top);
        onMove(wx, wy);
      };
      this.canvas.classList.add("probe");
      this.canvas.addEventListener("pointerdown", (e) => {
        down = true;
        this.canvas.setPointerCapture(e.pointerId);
        handle(e);
      });
      this.canvas.addEventListener("pointermove", (e) => {
        if (down) handle(e);
      });
      this.canvas.addEventListener("pointerup", () => {
        down = false;
      });
      this.canvas.addEventListener("pointercancel", () => {
        down = false;
      });
    }

    begin() {
      const m = this._metrics();
      const { ctx, w, h } = m;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#fbfcfe";
      ctx.fillRect(0, 0, w, h);
      return m;
    }

    drawGridAndAxes(m, opts = {}) {
      const { ctx, ox, oy, plotW, plotH } = m;
      const xStep = opts.xStep || 1;
      const yStep = opts.yStep || 1;
      const xLabel = opts.xLabel || "x";
      const yLabel = opts.yLabel || "y";

      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, plotW, plotH);
      ctx.clip();

      ctx.strokeStyle = "#e8edf5";
      ctx.lineWidth = 1;
      for (let x = Math.ceil(this.xMin / xStep) * xStep; x <= this.xMax + 1e-9; x += xStep) {
        const [px] = this.toPx(x, 0, m);
        ctx.beginPath();
        ctx.moveTo(px, oy);
        ctx.lineTo(px, oy + plotH);
        ctx.stroke();
      }
      for (let y = Math.ceil(this.yMin / yStep) * yStep; y <= this.yMax + 1e-9; y += yStep) {
        const [, py] = this.toPx(0, y, m);
        ctx.beginPath();
        ctx.moveTo(ox, py);
        ctx.lineTo(ox + plotW, py);
        ctx.stroke();
      }

      // Main axes if inside
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1.4;
      if (this.xMin <= 0 && this.xMax >= 0) {
        const [px0] = this.toPx(0, 0, m);
        ctx.beginPath();
        ctx.moveTo(px0, oy);
        ctx.lineTo(px0, oy + plotH);
        ctx.stroke();
      }
      if (this.yMin <= 0 && this.yMax >= 0) {
        const [, py0] = this.toPx(0, 0, m);
        ctx.beginPath();
        ctx.moveTo(ox, py0);
        ctx.lineTo(ox + plotW, py0);
        ctx.stroke();
      }
      ctx.restore();

      // Frame border
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(ox, oy, plotW, plotH);

      // Tick labels
      ctx.fillStyle = "#475569";
      ctx.font = "11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let x = Math.ceil(this.xMin / xStep) * xStep; x <= this.xMax + 1e-9; x += xStep) {
        const [px] = this.toPx(x, 0, m);
        const txt = Math.abs(x) < 1e-9 ? "0" : Number(x.toFixed(2)).toString();
        ctx.fillText(txt, px, oy + plotH + 5);
      }

      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let y = Math.ceil(this.yMin / yStep) * yStep; y <= this.yMax + 1e-9; y += yStep) {
        const [, py] = this.toPx(0, y, m);
        const txt = Math.abs(y) < 1e-9 ? "0" : Number(y.toFixed(2)).toString();
        ctx.fillText(txt, ox - 6, py);
      }

      ctx.font = "700 12px Segoe UI, sans-serif";
      ctx.fillStyle = "#1e293b";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(xLabel, ox + plotW - 4, oy + plotH - 5);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(yLabel, ox + 6, oy + 5);
    }

    drawScalarField(m, fn, vMin, vMax, nx = 90, ny = 90) {
      const { ctx, ox, oy, plotW, plotH } = m;
      const cw = plotW / nx;
      const ch = plotH / ny;
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, plotW, plotH);
      ctx.clip();
      for (let i = 0; i < nx; i++) {
        const x = this.xMin + ((i + 0.5) / nx) * (this.xMax - this.xMin);
        for (let j = 0; j < ny; j++) {
          const y = this.yMax - ((j + 0.5) / ny) * (this.yMax - this.yMin);
          const v = fn(x, y);
          if (!Number.isFinite(v)) continue;
          const t = (v - vMin) / Math.max(1e-9, vMax - vMin);
          const [r, g, b] = global.Eng3D.scalarColor(t);
          ctx.fillStyle = `rgba(${r},${g},${b},0.30)`;
          ctx.fillRect(ox + i * cw, oy + j * ch, cw + 0.8, ch + 0.8);
        }
      }
      ctx.restore();
    }

    drawContours(m, fn, levels, nx = 90, ny = 90, color = "#334155") {
      const { ctx, ox, oy, plotW, plotH } = m;
      const vals = [];
      for (let i = 0; i <= nx; i++) {
        const x = this.xMin + (i / nx) * (this.xMax - this.xMin);
        const col = [];
        for (let j = 0; j <= ny; j++) {
          const y = this.yMin + (j / ny) * (this.yMax - this.yMin);
          col.push(fn(x, y));
        }
        vals.push(col);
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, plotW, plotH);
      ctx.clip();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;

      for (const lvl of levels) {
        ctx.beginPath();
        for (let i = 0; i < nx; i++) {
          const x0 = this.xMin + (i / nx) * (this.xMax - this.xMin);
          const x1 = this.xMin + ((i + 1) / nx) * (this.xMax - this.xMin);
          for (let j = 0; j < ny; j++) {
            const y0 = this.yMin + (j / ny) * (this.yMax - this.yMin);
            const y1 = this.yMin + ((j + 1) / ny) * (this.yMax - this.yMin);
            const v00 = vals[i][j];
            const v10 = vals[i + 1][j];
            const v11 = vals[i + 1][j + 1];
            const v01 = vals[i][j + 1];
            if (![v00, v10, v11, v01].every(Number.isFinite)) continue;
            // Skip discontinuities where jump is huge
            const vmax = Math.max(v00, v10, v11, v01);
            const vmin = Math.min(v00, v10, v11, v01);
            if (vmax - vmin > 4.0) continue;

            const pts = [];
            const edges = [
              [v00, v10, x0, y0, x1, y0],
              [v10, v11, x1, y0, x1, y1],
              [v11, v01, x1, y1, x0, y1],
              [v01, v00, x0, y1, x0, y0]
            ];
            for (const [va, vb, xa, ya, xb, yb] of edges) {
              if ((va < lvl && vb >= lvl) || (vb < lvl && va >= lvl)) {
                const t = (lvl - va) / (vb - va);
                pts.push([xa + t * (xb - xa), ya + t * (yb - ya)]);
              }
            }
            if (pts.length === 2) {
              const pA = this.toPx(pts[0][0], pts[0][1], m);
              const pB = this.toPx(pts[1][0], pts[1][1], m);
              ctx.moveTo(pA[0], pA[1]);
              ctx.lineTo(pB[0], pB[1]);
            }
          }
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    drawVectorField(m, gradFn, cols = 13, rows = 13, opts = {}) {
      const { ctx, ox, oy, plotW, plotH } = m;
      const maxArrow = opts.maxArrow || 0.24;
      const scale = opts.scale || 0.18;
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, plotW, plotH);
      ctx.clip();
      for (let i = 0; i < cols; i++) {
        const x = this.xMin + ((i + 0.5) / cols) * (this.xMax - this.xMin);
        for (let j = 0; j < rows; j++) {
          const y = this.yMin + ((j + 0.5) / rows) * (this.yMax - this.yMin);
          const g = gradFn(x, y);
          if (!g || !Number.isFinite(g[0]) || !Number.isFinite(g[1])) continue;
          const mag = Math.hypot(g[0], g[1]);
          if (mag < 1e-6) continue;
          const len = Math.min(maxArrow, mag * scale);
          const dx = (g[0] / mag) * len;
          const dy = (g[1] / mag) * len;
          this.drawArrow(m, [x, y], [x + dx, y + dy], {
            color: opts.color || "rgba(30, 64, 175, 0.52)",
            lineWidth: 1.25,
            headSize: 5.5
          });
        }
      }
      ctx.restore();
    }

    drawArrow(m, p1, p2, opts = {}) {
      const { ctx } = m;
      const [x1, y1] = this.toPx(p1[0], p1[1], m);
      const [x2, y2] = this.toPx(p2[0], p2[1], m);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.hypot(dx, dy);
      ctx.save();
      ctx.beginPath();
      if (opts.dash) ctx.setLineDash(opts.dash);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = opts.color || "#dc2626";
      ctx.lineWidth = opts.lineWidth || 2;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.setLineDash([]);
      if (dist > 3) {
        const ang = Math.atan2(dy, dx);
        const hs = Math.min(opts.headSize || 8, dist * 0.45);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - hs * Math.cos(ang - 0.42), y2 - hs * Math.sin(ang - 0.42));
        ctx.lineTo(x2 - hs * Math.cos(ang + 0.42), y2 - hs * Math.sin(ang + 0.42));
        ctx.closePath();
        ctx.fillStyle = opts.color || "#dc2626";
        ctx.fill();
      }
      if (opts.label) {
        ctx.font = "700 12px Segoe UI, sans-serif";
        ctx.fillStyle = opts.color || "#dc2626";
        const off = opts.labelOffset || [6, -4];
        const anchorX = opts.labelPos === "mid" ? 0.5 * (x1 + x2) : x2;
        const anchorY = opts.labelPos === "mid" ? 0.5 * (y1 + y2) : y2;
        if (opts.labelPos === "mid") ctx.textAlign = "center";
        const tw = ctx.measureText(opts.label).width;
        let lx = anchorX + off[0];
        if (opts.labelPos !== "mid" && lx + tw > m.w - 6) {
          lx = Math.max(6, x2 - tw - 8);
        }
        ctx.fillText(opts.label, lx, anchorY + off[1]);
      }
      ctx.restore();
    }

    drawPoint(m, p, opts = {}) {
      const { ctx } = m;
      const [px, py] = this.toPx(p[0], p[1], m);
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, opts.radius || 5, 0, Math.PI * 2);
      ctx.fillStyle = opts.color || "#111827";
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      if (opts.label) {
        ctx.font = "700 12px Segoe UI, sans-serif";
        ctx.fillStyle = opts.textColor || "#0f172a";
        const off = opts.offset || [8, -7];
        const tw = ctx.measureText(opts.label).width;
        let lx = px + off[0];
        if (lx + tw > m.w - 6) lx = Math.max(6, px - tw - 8);
        ctx.fillText(opts.label, lx, py + off[1]);
      }
      ctx.restore();
    }
  }

  global.Eng2D = { Plot2D };
})(window);
