(function (global) {
  "use strict";

  function vecSub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  function vecAdd(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }

  function vecScale(a, s) {
    return [a[0] * s, a[1] * s, a[2] * s];
  }

  function vecDot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function vecCross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  function vecLen(a) {
    return Math.hypot(a[0], a[1], a[2]);
  }

  function vecNorm(a) {
    const l = vecLen(a);
    return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 1];
  }

  function setupHiDPICanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(300, Math.round(rect.width || canvas.clientWidth || 640));
    const h = Math.max(260, Math.round(rect.height || canvas.clientHeight || 430));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function colorLerp(c1, c2, t) {
    const u = Math.max(0, Math.min(1, t));
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * u),
      Math.round(c1[1] + (c2[1] - c1[1]) * u),
      Math.round(c1[2] + (c2[2] - c1[2]) * u)
    ];
  }

  // Viridis-like / pleasant scientific palette
  function scalarColor(t) {
    const stops = [
      [37, 99, 235],   // blue
      [16, 185, 129],  // emerald
      [245, 158, 11],  // amber
      [220, 38, 38]    // red
    ];
    const u = Math.max(0, Math.min(1, t)) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(u));
    return colorLerp(stops[i], stops[i + 1], u - i);
  }

  class Scene3D {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.yaw = opts.yaw !== undefined ? opts.yaw : 0.72;
      this.pitch = opts.pitch !== undefined ? opts.pitch : 0.48;
      this.zoom = opts.zoom !== undefined ? opts.zoom : 1.0;
      this.target = opts.target ? [...opts.target] : [0, 0, 0];
      this.baseScale = opts.baseScale || 82;
      this.camDist = opts.camDist || 14;
      this.lightDir = vecNorm([0.55, 0.38, 0.85]);
      this.primitives = [];
      this.onRender = null;
      this._attachInteraction();
    }

    setView(yaw, pitch, zoom) {
      this.yaw = yaw;
      this.pitch = pitch;
      if (zoom !== undefined) this.zoom = zoom;
      if (this.onRender) this.onRender();
    }

    _attachInteraction() {
      let dragging = false;
      let lastX = 0;
      let lastY = 0;

      this.canvas.addEventListener("pointerdown", (e) => {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        this.canvas.setPointerCapture(e.pointerId);
      });

      this.canvas.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        this.yaw -= dx * 0.0085;
        this.pitch = Math.max(-1.48, Math.min(1.48, this.pitch + dy * 0.0085));
        if (this.onRender) this.onRender();
      });

      const endDrag = () => {
        dragging = false;
      };
      this.canvas.addEventListener("pointerup", endDrag);
      this.canvas.addEventListener("pointercancel", endDrag);

      this.canvas.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          const factor = e.deltaY > 0 ? 0.92 : 1.087;
          this.zoom = Math.max(0.35, Math.min(3.5, this.zoom * factor));
          if (this.onRender) this.onRender();
        },
        { passive: false }
      );
    }

    clear() {
      this.primitives = [];
    }

    _basis() {
      const cy = Math.cos(this.yaw);
      const sy = Math.sin(this.yaw);
      const cp = Math.cos(this.pitch);
      const sp = Math.sin(this.pitch);
      return {
        R: [-sy, cy, 0],
        U: [-sp * cy, -sp * sy, cp],
        F: [cp * cy, cp * sy, sp]
      };
    }

    project(p, w, h, basis) {
      const d = vecSub(p, this.target);
      const rx = vecDot(d, basis.R);
      const ry = vecDot(d, basis.U);
      const rz = vecDot(d, basis.F);
      const denom = Math.max(1.2, this.camDist - rz);
      const persp = this.camDist / denom;
      const sc = this.baseScale * this.zoom * persp;
      return {
        x: w * 0.5 + rx * sc,
        y: h * 0.54 - ry * sc,
        z: rz,
        persp
      };
    }

    addPolygon(pts, opts = {}) {
      if (pts.length < 3) return;
      const e1 = vecSub(pts[1], pts[0]);
      const e2 = vecSub(pts[2], pts[0]);
      const n = vecNorm(vecCross(e1, e2));
      const base = opts.color || [74, 144, 226];
      let shade = 1;
      if (!opts.unlit) {
        const ndotl = opts.signedLight
          ? Math.max(0, vecDot(n, this.lightDir))
          : Math.abs(vecDot(n, this.lightDir));
        shade = 0.42 + 0.58 * ndotl;
      }
      const r = Math.min(255, Math.round(base[0] * shade));
      const g = Math.min(255, Math.round(base[1] * shade));
      const b = Math.min(255, Math.round(base[2] * shade));
      const alpha = opts.alpha !== undefined ? opts.alpha : 0.92;
      this.primitives.push({
        type: "poly",
        pts,
        fill: `rgba(${r},${g},${b},${alpha})`,
        stroke: opts.stroke || (alpha > 0.6 ? `rgba(${Math.max(0, r - 28)},${Math.max(0, g - 28)},${Math.max(0, b - 28)},${Math.min(0.55, alpha)})` : null),
        lineWidth: opts.lineWidth || 0.7,
        zBias: opts.zBias || 0
      });
    }

    addLine(p1, p2, opts = {}) {
      this.primitives.push({
        type: "line",
        p1,
        p2,
        color: opts.color || "#334155",
        lineWidth: opts.lineWidth || 1.6,
        dash: opts.dash || null,
        zBias: opts.zBias || 0.02
      });
    }

    addArrow(p1, p2, opts = {}) {
      this.primitives.push({
        type: "arrow",
        p1,
        p2,
        color: opts.color || "#dc2626",
        lineWidth: opts.lineWidth || 2.3,
        headSize: opts.headSize || 9,
        label: opts.label || null,
        zBias: opts.zBias || 0.08
      });
    }

    addPoint(p, opts = {}) {
      this.primitives.push({
        type: "point",
        p,
        color: opts.color || "#111827",
        radius: opts.radius || 4.2,
        label: opts.label || null,
        labelOffset: opts.labelOffset || [8, -6],
        zBias: opts.zBias || 0.12
      });
    }

    addText(p, text, opts = {}) {
      this.primitives.push({
        type: "text",
        p,
        text,
        color: opts.color || "#1e293b",
        font: opts.font || "600 12px Segoe UI, sans-serif",
        zBias: opts.zBias || 0.14
      });
    }

    addAxes(len = 2.2, labels = ["x", "y", "z"], origin = [0, 0, 0]) {
      const cols = ["#dc2626", "#059669", "#2563eb"];
      const dirs = [
        [len, 0, 0],
        [0, len, 0],
        [0, 0, len]
      ];
      for (let i = 0; i < 3; i++) {
        this.addLine(vecSub(origin, vecScale(dirs[i], 0.2)), origin, {
          color: "rgba(100,116,139,0.35)",
          lineWidth: 1,
          dash: [3, 3],
          zBias: -0.05
        });
        this.addArrow(origin, vecAdd(origin, dirs[i]), {
          color: cols[i],
          lineWidth: 2,
          headSize: 8,
          label: labels[i],
          zBias: 0.04
        });
      }
    }

    addParametricSurface(uMin, uMax, nu, vMin, vMax, nv, evalFn, opts = {}) {
      const grid = [];
      for (let i = 0; i <= nu; i++) {
        const u = uMin + ((uMax - uMin) * i) / nu;
        const row = [];
        for (let j = 0; j <= nv; j++) {
          const v = vMin + ((vMax - vMin) * j) / nv;
          row.push(evalFn(u, v));
        }
        grid.push(row);
      }
      for (let i = 0; i < nu; i++) {
        for (let j = 0; j < nv; j++) {
          const a = grid[i][j];
          const b = grid[i + 1][j];
          const c = grid[i + 1][j + 1];
          const d = grid[i][j + 1];
          if (!a || !b || !c || !d || a.skip || b.skip || c.skip || d.skip) continue;
          const color = a.color || opts.color || [59, 130, 246];
          this.addPolygon([a.p, b.p, c.p, d.p], {
            color,
            alpha: opts.alpha !== undefined ? opts.alpha : 0.9,
            stroke: opts.stroke,
            lineWidth: opts.lineWidth,
            unlit: opts.unlit,
            zBias: opts.zBias || 0
          });
        }
      }
    }

    render() {
      const { ctx, w, h } = setupHiDPICanvas(this.canvas);
      ctx.clearRect(0, 0, w, h);

      // Soft subtle background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#fbfcfe");
      bg.addColorStop(1, "#f2f5fa");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const basis = this._basis();
      const sorted = [];

      for (const item of this.primitives) {
        if (item.type === "poly") {
          const proj = item.pts.map((p) => this.project(p, w, h, basis));
          let zSum = 0;
          for (const q of proj) zSum += q.z;
          sorted.push({
            depth: zSum / proj.length + item.zBias,
            item,
            proj
          });
        } else if (item.type === "line" || item.type === "arrow") {
          const q1 = this.project(item.p1, w, h, basis);
          const q2 = this.project(item.p2, w, h, basis);
          sorted.push({
            depth: 0.5 * (q1.z + q2.z) + item.zBias,
            item,
            q1,
            q2
          });
        } else if (item.type === "point" || item.type === "text") {
          const q = this.project(item.p, w, h, basis);
          sorted.push({
            depth: q.z + item.zBias,
            item,
            q
          });
        }
      }

      sorted.sort((a, b) => a.depth - b.depth);

      for (const entry of sorted) {
        const { item } = entry;
        if (item.type === "poly") {
          const proj = entry.proj;
          ctx.beginPath();
          ctx.moveTo(proj[0].x, proj[0].y);
          for (let i = 1; i < proj.length; i++) ctx.lineTo(proj[i].x, proj[i].y);
          ctx.closePath();
          ctx.fillStyle = item.fill;
          ctx.fill();
          if (item.stroke) {
            ctx.strokeStyle = item.stroke;
            ctx.lineWidth = item.lineWidth;
            ctx.stroke();
          }
        } else if (item.type === "line") {
          const { q1, q2 } = entry;
          ctx.save();
          ctx.beginPath();
          if (item.dash) ctx.setLineDash(item.dash);
          ctx.moveTo(q1.x, q1.y);
          ctx.lineTo(q2.x, q2.y);
          ctx.strokeStyle = item.color;
          ctx.lineWidth = item.lineWidth;
          ctx.stroke();
          ctx.restore();
        } else if (item.type === "arrow") {
          const { q1, q2 } = entry;
          const dx = q2.x - q1.x;
          const dy = q2.y - q1.y;
          const dist = Math.hypot(dx, dy);
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(q1.x, q1.y);
          ctx.lineTo(q2.x, q2.y);
          ctx.strokeStyle = item.color;
          ctx.lineWidth = item.lineWidth;
          ctx.lineCap = "round";
          ctx.stroke();
          if (dist > 4) {
            const ang = Math.atan2(dy, dx);
            const hs = Math.min(item.headSize, dist * 0.45);
            ctx.beginPath();
            ctx.moveTo(q2.x, q2.y);
            ctx.lineTo(q2.x - hs * Math.cos(ang - 0.42), q2.y - hs * Math.sin(ang - 0.42));
            ctx.lineTo(q2.x - hs * Math.cos(ang + 0.42), q2.y - hs * Math.sin(ang + 0.42));
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();
          }
          if (item.label) {
            ctx.font = "700 12.5px Segoe UI, sans-serif";
            ctx.fillStyle = item.color;
            ctx.fillText(item.label, q2.x + 6, q2.y - 4);
          }
          ctx.restore();
        } else if (item.type === "point") {
          const { q } = entry;
          ctx.save();
          ctx.beginPath();
          ctx.arc(q.x, q.y, item.radius, 0, Math.PI * 2);
          ctx.fillStyle = item.color;
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
          if (item.label) {
            ctx.font = "700 12px Segoe UI, sans-serif";
            ctx.fillStyle = "#0f172a";
            ctx.fillText(item.label, q.x + item.labelOffset[0], q.y + item.labelOffset[1]);
          }
          ctx.restore();
        } else if (item.type === "text") {
          const { q } = entry;
          ctx.save();
          ctx.font = item.font;
          ctx.fillStyle = item.color;
          ctx.fillText(item.text, q.x, q.y);
          ctx.restore();
        }
      }
    }
  }

  global.Eng3D = {
    Scene3D,
    setupHiDPICanvas,
    scalarColor,
    colorLerp,
    vecAdd,
    vecSub,
    vecScale,
    vecDot,
    vecCross,
    vecLen,
    vecNorm
  };
})(window);
