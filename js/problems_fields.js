(function (global) {
  "use strict";

  const { Scene3D, scalarColor } = global.Eng3D;
  const { Plot2D } = global.Eng2D;

  function fmt(v, d = 3) {
    if (!Number.isFinite(v)) return "∞";
    return Number(v.toFixed(d)).toString();
  }

  // =========================================================================
  // 10. B6 & H6: Radiale Skalarfelder & Gradienten
  // =========================================================================
  const ModRadialGrad = {
    id: "grad_radial",
    navGroup: "Skalarfelder & Gradienten",
    code: "B6 / H6",
    badge: "Beispielaufgabe 6 & Hausaufgabe 6",
    badgeClass: "",
    title: "Radiale Skalarfelder φ(r) und ihr Gradient",
    subtitle: "∇φ(r) = φ'(r) e_r — speziell φ(r) = ln(1/r) mit ‖∇φ‖ = 1 auf dem Einheitskreis r = 1.",
    layout: "split",
    defaults: { field: "lninv", px: 0.8, py: 0.6 },
    presets: [
      { label: "B6: r = 1 → ‖∇φ‖ = 1", patch: { field: "lninv", px: 0.8, py: 0.6 } },
      { label: "H6(a): φ(r) = r", patch: { field: "r1", px: 1.0, py: 0.8 } },
      { label: "H6(a): φ(r) = r²", patch: { field: "r2", px: 0.9, py: 0.7 } }
    ],
    panels: [
      { id: "c3d", type: "3d", title: "3D-Potentialfläche z = φ(√(x²+y²))", caption: "Ziehen zum Drehen. Zeigt die radiale Symmetrie der Niveauflächen." },
      { id: "c2d", type: "2d", title: "xy-Schnitt: Konturlinien & Gradientenfeld ∇φ (Klicken)", caption: "Grün gestrichelt: r = 1 (auf diesem Kreis gilt bei B6: ‖∇φ‖ = 1)." }
    ],
    controls() {
      return [
        {
          type: "seg",
          key: "field",
          label: "Skalarfeld φ(r)",
          options: [
            { v: "lninv", t: "B6: ln(1/r)" },
            { v: "r1", t: "H6: r" },
            { v: "r2", t: "H6: r²" }
          ]
        },
        { type: "range", key: "px", label: "Sonden-x", min: -2.0, max: 2.0, step: 0.05 },
        { type: "range", key: "py", label: "Sonden-y", min: -2.0, max: 2.0, step: 0.05 }
      ];
    },
    evalField(field, r) {
      const rr = Math.max(0.18, r);
      if (field === "lninv") return { val: -Math.log(rr), deriv: -1 / rr };
      if (field === "r1") return { val: rr, deriv: 1 };
      return { val: rr * rr, deriv: 2 * rr };
    },
    render(canvases, s, state, syncUI) {
      if (!state.sc3d) {
        state.sc3d = new Scene3D(canvases.c3d, { yaw: 0.72, pitch: 0.48, baseScale: 68, target: [0, 0, 0.5] });
        state.sc3d.onRender = () => this.render3D(state.sc3d, s);
      }
      if (!state.p2d) {
        state.p2d = new Plot2D(canvases.c2d, { xMin: -2.4, xMax: 2.4, yMin: -2.4, yMax: 2.4 });
        state.p2d.attachProbe((wx, wy) => {
          s.px = Number(Math.max(-2.1, Math.min(2.1, wx)).toFixed(2));
          s.py = Number(Math.max(-2.1, Math.min(2.1, wy)).toFixed(2));
          syncUI();
        });
      }
      this.render3D(state.sc3d, s);
      this.render2D(state.p2d, s);
    },
    render3D(sc, s) {
      sc.clear();
      sc.target = s.field === "lninv" ? [0, 0, 0.3] : [0, 0, 1.1];
      sc.addAxes(2.4, ["x", "y", "z"]);
      sc.addParametricSurface(-2.1, 2.1, 28, -2.1, 2.1, 28, (x, y) => {
        const r = Math.hypot(x, y);
        if (s.field === "lninv" && r < 0.22) return { p: [x, y, 1.5], skip: true };
        const ev = this.evalField(s.field, r);
        const z = s.field === "r2" ? ev.val * 0.45 : ev.val;
        const normT = s.field === "lninv" ? (ev.val + 0.8) / 2.3 : s.field === "r1" ? ev.val / 3.0 : ev.val / 6.0;
        return { p: [x, y, z], color: scalarColor(normT) };
      }, { alpha: 0.85 });

      const r0 = Math.max(0.22, Math.hypot(s.px, s.py));
      const ev0 = this.evalField(s.field, r0);
      const z0 = s.field === "r2" ? ev0.val * 0.45 : ev0.val;
      sc.addPoint([s.px, s.py, z0], { color: "#dc2626", label: `r=${fmt(r0, 2)}` });
      sc.render();
    },
    render2D(p2d, s) {
      const m = p2d.begin();
      const fn = (x, y) => this.evalField(s.field, Math.hypot(x, y)).val;
      if (s.field === "lninv") {
        p2d.drawScalarField(m, fn, -0.8, 1.4, 70, 70);
        p2d.drawContours(m, fn, [-0.6, -0.3, 0, 0.3, 0.6, 1.0, 1.3], 70, 70);
      } else if (s.field === "r1") {
        p2d.drawScalarField(m, fn, 0, 3.0, 70, 70);
        p2d.drawContours(m, fn, [0.5, 1.0, 1.5, 2.0, 2.5], 70, 70);
      } else {
        p2d.drawScalarField(m, fn, 0, 7.0, 70, 70);
        p2d.drawContours(m, fn, [0.5, 1.0, 2.0, 3.5, 5.0], 70, 70);
      }
      p2d.drawGridAndAxes(m, { xStep: 1, yStep: 1, xLabel: "x", yLabel: "y" });

      // Unit circle r = 1
      const { ctx } = m;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const t = (i / 80) * Math.PI * 2;
        const [px, py] = p2d.toPx(Math.cos(t), Math.sin(t), m);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      p2d.drawVectorField(m, (x, y) => {
        const r = Math.hypot(x, y);
        if (r < 0.25) return null;
        const d = this.evalField(s.field, r).deriv;
        return [(d * x) / r, (d * y) / r];
      }, 11, 11, { scale: 0.17, maxArrow: 0.28 });

      const r0 = Math.max(0.2, Math.hypot(s.px, s.py));
      const d0 = this.evalField(s.field, r0).deriv;
      const g = [(d0 * s.px) / r0, (d0 * s.py) / r0];
      p2d.drawArrow(m, [s.px, s.py], [s.px + g[0] * 0.45, s.py + g[1] * 0.45], { color: "#dc2626", lineWidth: 2.6, label: "∇φ" });
      p2d.drawPoint(m, [s.px, s.py], { color: "#0f172a" });
    },
    readout(s) {
      const r = Math.max(0.18, Math.hypot(s.px, s.py));
      const ev = this.evalField(s.field, r);
      const formulas = {
        lninv: "∇ ln(1/r) = −r / r² = −(1/r) e_r,  ‖∇φ‖ = 1/r",
        r1: "∇r = r / r = e_r,  ‖∇r‖ = 1  (für r ≠ 0)",
        r2: "∇r² = 2r,  ‖∇r²‖ = 2r"
      };
      return `
        <div class="formula-line">${formulas[s.field]}</div>
        <div class="metric-row"><span class="metric-label">Abstand r = ‖r‖</span><span class="metric-value">${fmt(r, 3)}</span></div>
        <div class="metric-row"><span class="metric-label">Funktionswert φ(r)</span><span class="metric-value">${fmt(ev.val, 3)}</span></div>
        <div class="metric-row"><span class="metric-label">Betrag ‖∇φ(r)‖</span><span class="metric-value">${fmt(Math.abs(ev.deriv), 3)}</span></div>
      `;
    },
    insight: `
      <p><strong>B6:</strong> Für <code>φ(r) = ln(r⁻¹) = −ln r</code> zeigt der Gradient radial nach innen mit Betrag <code>1/r</code>. Daher gilt <code>‖∇φ‖ = 1</code> genau auf der Einheitssphäre <code>r = 1</code> (grün gestrichelt)!</p>
      <p><strong>H6:</strong> Jede rein radiale Funktion <code>φ(r)</code> hat den Gradienten <code>φ'(r) r/r</code> — senkrecht zu den Kugelschalen.</p>
    `
  };

  // =========================================================================
  // 11. B7: Gradient einer Bergflanke h(x,y) = x/r + 1
  // =========================================================================
  const ModBergB7 = {
    id: "berg_b7",
    navGroup: "Skalarfelder & Gradienten",
    code: "B7",
    badge: "Beispielaufgabe 7",
    badgeClass: "",
    title: "Topografie einer Bergflanke: h(r) = x/r + 1",
    subtitle: "Konturlinien als Ursprungsstrahlen, Gradientenfeld ∇h_r = (y/r³)(y, −x)ᵀ und steilster Anstieg.",
    layout: "split",
    defaults: { wx: 1.0, wy: 1.0, showDir: false, alphaDeg: 30 },
    presets: [
      { label: "Punkt r₁ = (−1, 1)ᵀ", patch: { wx: -1.0, wy: 1.0 } },
      { label: "Punkt r₂ = (0, √2)ᵀ", patch: { wx: 0.0, wy: Math.SQRT2 } },
      { label: "Punkt r₃ = (1, 1)ᵀ (x=y)", patch: { wx: 1.0, wy: 1.0 } },
      { label: "Flachster Kamm (y=0, x>0)", patch: { wx: 1.3, wy: 0.0 } }
    ],
    panels: [
      { id: "c3d", type: "3d", title: "3D-Bergflanke h(x, y) = x/r + 1", caption: "Ziehen zum Drehen. Gelbe Punkte markieren r₁, r₂, r₃; Rot ist der Wanderer r." },
      { id: "c2d", type: "2d", title: "Konturplot & Gradientenfeld (Klicken/Ziehen für Wanderer r)", caption: "Rot: ∇h_r (steilster Anstieg) | Grün gestrichelt: Konturlinie durch r | Orange: r₁, r₂, r₃." }
    ],
    controls(s) {
      const list = [
        { type: "range", key: "wx", label: "Wanderer x", min: -2.0, max: 2.0, step: 0.05 },
        { type: "range", key: "wy", label: "Wanderer y", min: -2.0, max: 2.0, step: 0.05 },
        { type: "check", key: "showDir", label: "Richtungsvektor n (für dh_r(n)) anzeigen" }
      ];
      if (s.showDir) {
        list.push({ type: "range", key: "alphaDeg", label: "Richtungswinkel von n (°)", min: 0, max: 360, step: 5 });
      }
      return list;
    },
    hVal(x, y) {
      const r = Math.hypot(x, y);
      return r < 1e-4 ? 1 : x / r + 1;
    },
    gradH(x, y) {
      const r2 = x * x + y * y;
      const r = Math.sqrt(r2);
      if (r < 0.14) return [0, 0];
      const f = y / (r2 * r);
      return [f * y, -f * x];
    },
    render(canvases, s, state, syncUI) {
      if (!state.sc3d) {
        state.sc3d = new Scene3D(canvases.c3d, { yaw: 0.72, pitch: 0.48, baseScale: 68, target: [0, 0, 1.0] });
        state.sc3d.onRender = () => this.render3D(state.sc3d, s);
      }
      if (!state.p2d) {
        state.p2d = new Plot2D(canvases.c2d, { xMin: -2.2, xMax: 2.2, yMin: -2.2, yMax: 2.2 });
        state.p2d.attachProbe((wx, wy) => {
          s.wx = Number(Math.max(-2.0, Math.min(2.0, wx)).toFixed(2));
          s.wy = Number(Math.max(-2.0, Math.min(2.0, wy)).toFixed(2));
          syncUI();
        });
      }
      this.render3D(state.sc3d, s);
      this.render2D(state.p2d, s);
    },
    render3D(sc, s) {
      sc.clear();
      sc.addAxes(2.3, ["x", "y", "h"]);
      sc.addParametricSurface(-2.0, 2.0, 32, -2.0, 2.0, 32, (x, y) => {
        const r = Math.hypot(x, y);
        if (r < 0.14) return { p: [x, y, 1], skip: true };
        const h = x / r + 1;
        return { p: [x, y, h], color: scalarColor(h / 2) };
      }, { alpha: 0.86 });

      const sheetPts = [
        [-1, 1, "r₁"],
        [0, Math.SQRT2, "r₂"],
        [1, 1, "r₃"]
      ];
      for (const [px, py, lbl] of sheetPts) {
        sc.addPoint([px, py, this.hVal(px, py) + 0.03], { color: "#f59e0b", label: lbl });
      }
      sc.addPoint([s.wx, s.wy, this.hVal(s.wx, s.wy) + 0.04], { color: "#dc2626", radius: 5.5, label: "r" });
      sc.render();
    },
    render2D(p2d, s) {
      const m = p2d.begin();
      p2d.drawScalarField(m, (x, y) => (Math.hypot(x, y) < 0.08 ? NaN : x / Math.hypot(x, y) + 1), 0, 2, 84, 84);
      p2d.drawGridAndAxes(m, { xStep: 1, yStep: 1, xLabel: "x", yLabel: "y" });

      // Exact contour rays through origin
      const { ctx } = m;
      ctx.save();
      const [ox, oy] = p2d.toPx(0, 0, m);
      for (let k = 0; k < 16; k++) {
        const phi = (k / 16) * Math.PI * 2;
        const [ex, ey] = p2d.toPx(2.8 * Math.cos(phi), 2.8 * Math.sin(phi), m);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = k === 2 ? "rgba(5, 150, 105, 0.7)" : "rgba(51, 65, 85, 0.36)";
        ctx.lineWidth = k === 2 ? 1.8 : 1.0;
        ctx.stroke();
      }
      ctx.restore();

      p2d.drawVectorField(m, (x, y) => this.gradH(x, y), 11, 11, { scale: 0.25, maxArrow: 0.26 });

      // Sheet points r1, r2, r3 with exact gradient arrows
      const sheetPts = [
        [-1, 1, "r₁"],
        [0, Math.SQRT2, "r₂"],
        [1, 1, "r₃"]
      ];
      for (const [px, py, lbl] of sheetPts) {
        const g = this.gradH(px, py);
        p2d.drawArrow(m, [px, py], [px + g[0] * 0.75, py + g[1] * 0.75], { color: "#d97706", lineWidth: 2.3 });
        p2d.drawPoint(m, [px, py], { color: "#d97706", radius: 4.5, label: lbl });
      }

      // Walker r
      const r = Math.hypot(s.wx, s.wy);
      if (r > 0.14) {
        // Contour line ray through r
        const ux = s.wx / r, uy = s.wy / r;
        const [rx0, ry0] = p2d.toPx(0, 0, m);
        const [rx1, ry1] = p2d.toPx(ux * 2.8, uy * 2.8, m);
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.moveTo(rx0, ry0);
        ctx.lineTo(rx1, ry1);
        ctx.strokeStyle = "#059669";
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();

        const g = this.gradH(s.wx, s.wy);
        p2d.drawArrow(m, [s.wx, s.wy], [s.wx + g[0] * 0.75, s.wy + g[1] * 0.75], { color: "#dc2626", lineWidth: 2.8, label: "∇h" });

        if (s.showDir) {
          const al = (s.alphaDeg * Math.PI) / 180;
          const nx = Math.cos(al), ny = Math.sin(al);
          p2d.drawArrow(m, [s.wx, s.wy], [s.wx + nx * 0.55, s.wy + ny * 0.55], { color: "#7c3aed", lineWidth: 2.3, label: "n" });
        }
      }
      p2d.drawPoint(m, [s.wx, s.wy], { color: "#dc2626", radius: 5.5, label: "r" });
    },
    readout(s) {
      const r = Math.hypot(s.wx, s.wy);
      const h = this.hVal(s.wx, s.wy);
      const g = this.gradH(s.wx, s.wy);
      const gNorm = Math.hypot(g[0], g[1]);
      const al = (s.alphaDeg * Math.PI) / 180;
      const dh = g[0] * Math.cos(al) + g[1] * Math.sin(al);
      return `
        <div class="formula-line">∇h_r = (y / r³)(y, −x)ᵀ,  ‖∇h_r‖ = |y| / r²</div>
        <div class="metric-row"><span class="metric-label">Höhe h(r) = x/r + 1</span><span class="metric-value">${fmt(h, 4)}</span></div>
        <div class="metric-row"><span class="metric-label">Gradient ∇h_r</span><span class="metric-value">(${fmt(g[0], 3)}, ${fmt(g[1], 3)})ᵀ</span></div>
        <div class="metric-row"><span class="metric-label">Steilheit ‖∇h_r‖</span><span class="metric-value">${fmt(gNorm, 4)}</span></div>
        ${s.showDir ? `<div class="metric-row"><span class="metric-label">dh_r(n) = ∇h_r · n</span><span class="metric-value">${fmt(dh, 4)}</span></div>` : ""}
      `;
    },
    insight: `
      <p><strong>Konturlinien (c, e, f):</strong> Da <code>h = cos φ + 1</code> nur vom Winkel φ abhängt, sind alle Konturlinien Geraden durch den Ursprung! Entlang <code>x = y</code> (im 1. Quadranten) liegt die konstante Höhe <code>1 + 1/√2 ≈ 1.707</code>.</p>
      <p><strong>Am wenigsten / am steilsten (g, h):</strong> Auf der x-Achse (<code>y = 0, x ≠ 0</code>) ist <code>∇h = 0</code> (Kamm bei <code>x>0, h=2</code> und Talsohle bei <code>x<0, h=0</code>). Bei Annäherung an den Ursprung <code>r → 0</code> divergiert <code>‖∇h‖ = |y|/r² → ∞</code>!</p>
    `
  };

  // =========================================================================
  // 12. H7: Gradient eines Tals h(x,y) = exp(xy)
  // =========================================================================
  const ModTalH7 = {
    id: "tal_h7",
    navGroup: "Skalarfelder & Gradienten",
    code: "H7",
    badge: "Hausaufgabe 7",
    badgeClass: "hw",
    title: "Topografie eines Tals: h(r) = exp(x·y)",
    subtitle: "Hyperbolische Konturlinien xy = ln H, Sattelpunkt im Ursprung und Maximum von ‖∇h‖ auf Kreis r.",
    layout: "split",
    defaults: { wx: 1 / Math.SQRT2, wy: 1 / Math.SQRT2, showCircle: true, rCircle: 1.0 },
    presets: [
      { label: "r₁ = (−1, 1)ᵀ/√2", patch: { wx: -1 / Math.SQRT2, wy: 1 / Math.SQRT2, rCircle: 1.0 } },
      { label: "r₂ = (0, 1)ᵀ", patch: { wx: 0.0, wy: 1.0, rCircle: 1.0 } },
      { label: "r₃ = (1, 1)ᵀ/√2 (steilste)", patch: { wx: 1 / Math.SQRT2, wy: 1 / Math.SQRT2, rCircle: 1.0 } },
      { label: "Sattelpunkt (0, 0)", patch: { wx: 0.0, wy: 0.0 } }
    ],
    panels: [
      { id: "c3d", type: "3d", title: "3D-Talfläche h(x, y) = exp(x·y)", caption: "Ziehen zum Drehen. Typische Sattelfläche mit H = 1 auf den Achsen." },
      { id: "c2d", type: "2d", title: "Hyperbel-Konturen & Gradientenfeld (Klicken/Ziehen)", caption: "Grün gestrichelt: Kreis ‖r‖ = r (H7g); Diamanten zeigen die steilsten Punkte (x = y)." }
    ],
    controls(s) {
      const ctrls = [
        { type: "range", key: "wx", label: "Position x", min: -1.4, max: 1.4, step: 0.04 },
        { type: "range", key: "wy", label: "Position y", min: -1.4, max: 1.4, step: 0.04 },
        { type: "check", key: "showCircle", label: "Kreis ‖r‖ = r für Teil (g) anzeigen" }
      ];
      if (s.showCircle) {
        ctrls.push({ type: "range", key: "rCircle", label: "Kreisradius r", min: 0.3, max: 1.35, step: 0.05 });
      }
      return ctrls;
    },
    hVal(x, y) {
      return Math.exp(x * y);
    },
    gradH(x, y) {
      const e = Math.exp(x * y);
      return [e * y, e * x];
    },
    render(canvases, s, state, syncUI) {
      if (!state.sc3d) {
        state.sc3d = new Scene3D(canvases.c3d, { yaw: 0.72, pitch: 0.45, baseScale: 84, target: [0, 0, 1.4] });
        state.sc3d.onRender = () => this.render3D(state.sc3d, s);
      }
      if (!state.p2d) {
        state.p2d = new Plot2D(canvases.c2d, { xMin: -1.55, xMax: 1.55, yMin: -1.55, yMax: 1.55 });
        state.p2d.attachProbe((wx, wy) => {
          s.wx = Number(Math.max(-1.4, Math.min(1.4, wx)).toFixed(2));
          s.wy = Number(Math.max(-1.4, Math.min(1.4, wy)).toFixed(2));
          syncUI();
        });
      }
      this.render3D(state.sc3d, s);
      this.render2D(state.p2d, s);
    },
    render3D(sc, s) {
      sc.clear();
      sc.addAxes(1.6, ["x", "y", "h"]);
      sc.addParametricSurface(-1.25, 1.25, 28, -1.25, 1.25, 28, (x, y) => {
        const h = Math.exp(x * y);
        return { p: [x, y, h * 0.65], color: scalarColor((h - 0.2) / 4.2) };
      }, { alpha: 0.86 });

      const sq = 1 / Math.SQRT2;
      const pts = [
        [-sq, sq, "r₁"],
        [0, 1, "r₂"],
        [sq, sq, "r₃"]
      ];
      for (const [px, py, lbl] of pts) {
        sc.addPoint([px, py, this.hVal(px, py) * 0.65 + 0.03], { color: "#f59e0b", label: lbl });
      }
      sc.addPoint([s.wx, s.wy, this.hVal(s.wx, s.wy) * 0.65 + 0.04], { color: "#dc2626", radius: 5.5, label: "r" });
      sc.render();
    },
    render2D(p2d, s) {
      const m = p2d.begin();
      p2d.drawScalarField(m, (x, y) => Math.exp(x * y), 0.25, 5.0, 80, 80);
      p2d.drawContours(m, (x, y) => Math.exp(x * y), [0.35, 0.6, 1.0, 1.5, 2.2, 3.3, 4.5], 80, 80);
      p2d.drawGridAndAxes(m, { xStep: 0.5, yStep: 0.5, xLabel: "x", yLabel: "y" });

      p2d.drawVectorField(m, (x, y) => this.gradH(x, y), 11, 11, { scale: 0.14, maxArrow: 0.22 });

      if (s.showCircle) {
        const { ctx } = m;
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i <= 80; i++) {
          const t = (i / 80) * Math.PI * 2;
          const [px, py] = p2d.toPx(s.rCircle * Math.cos(t), s.rCircle * Math.sin(t), m);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = "#059669";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        const d = s.rCircle / Math.SQRT2;
        p2d.drawPoint(m, [d, d], { color: "#059669", radius: 5, label: "max ‖∇h‖" });
        p2d.drawPoint(m, [-d, -d], { color: "#059669", radius: 5, label: "max ‖∇h‖" });
      }

      const sq = 1 / Math.SQRT2;
      const sheetPts = [
        [-sq, sq, "r₁"],
        [0, 1, "r₂"],
        [sq, sq, "r₃"]
      ];
      for (const [px, py, lbl] of sheetPts) {
        const g = this.gradH(px, py);
        p2d.drawArrow(m, [px, py], [px + g[0] * 0.35, py + g[1] * 0.35], { color: "#d97706", lineWidth: 2.3 });
        p2d.drawPoint(m, [px, py], { color: "#d97706", radius: 4.5, label: lbl });
      }

      const g = this.gradH(s.wx, s.wy);
      p2d.drawArrow(m, [s.wx, s.wy], [s.wx + g[0] * 0.35, s.wy + g[1] * 0.35], { color: "#dc2626", lineWidth: 2.8, label: "∇h" });
      p2d.drawPoint(m, [s.wx, s.wy], { color: "#dc2626", radius: 5.5, label: "r" });
    },
    readout(s) {
      const h = this.hVal(s.wx, s.wy);
      const g = this.gradH(s.wx, s.wy);
      const r = Math.hypot(s.wx, s.wy);
      const gNorm = r * h;
      const maxOnCircle = s.rCircle * Math.exp(0.5 * s.rCircle * s.rCircle);
      return `
        <div class="formula-line">∇h_r = exp(xy)·(y, x)ᵀ,  ‖∇h_r‖ = r·exp(xy)</div>
        <div class="formula-line">Konturlinien: xy = ln H  (Hyperbeln bzw. Achsen)</div>
        <div class="metric-row"><span class="metric-label">Höhe h(r) = exp(xy)</span><span class="metric-value">${fmt(h, 4)}</span></div>
        <div class="metric-row"><span class="metric-label">Gradient ∇h_r</span><span class="metric-value">(${fmt(g[0], 3)}, ${fmt(g[1], 3)})ᵀ</span></div>
        <div class="metric-row"><span class="metric-label">Steilheit ‖∇h_r‖</span><span class="metric-value">${fmt(gNorm, 4)}</span></div>
        ${s.showCircle ? `<div class="metric-row"><span class="metric-label">Max. auf Kreis r=${fmt(s.rCircle, 2)}</span><span class="metric-value">${fmt(maxOnCircle, 4)}</span></div>` : ""}
      `;
    },
    insight: `
      <p><strong>Flachste Stelle (f):</strong> Nur im Ursprung <code>(0, 0)</code> gilt <code>∇h = (0, 0)ᵀ</code>. Dort ist ein Sattelpunkt mit Höhe <code>h(0, 0) = 1</code>.</p>
      <p><strong>Steilste Stelle auf Kreis r (g):</strong> Da <code>‖∇h‖ = r·exp(½ r² sin(2φ))</code>, wird die Steilheit bei festem <code>r</code> maximal, wenn <code>sin(2φ) = 1</code>, also für <code>x = y = ±r/√2</code> (1. und 3. Quadrant).</p>
    `
  };

  global.Blatt05Fields = [ModRadialGrad, ModBergB7, ModTalH7];
})(window);
