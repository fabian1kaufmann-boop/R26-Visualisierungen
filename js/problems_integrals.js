(function (global) {
  "use strict";

  const { Scene3D, scalarColor, vecAdd, vecScale, vecCross, vecLen } = global.Eng3D;
  const { Plot2D } = global.Eng2D;

  function fmt(v, d = 3) {
    if (!Number.isFinite(v)) return "∞";
    return Number(v.toFixed(d)).toString();
  }

  // =========================================================================
  // 1. B1 & H1: Gauß-Integrale (2D Polar-Trick & 1D Quadratische Ergänzung)
  // =========================================================================
  const ModGauss = {
    id: "gauss",
    navGroup: "Beispiel- & Hausaufgaben",
    code: "B1 / H1",
    badge: "Beispielaufgabe 1 & Hausaufgabe 1",
    badgeClass: "",
    title: "Gauß-Integrale & Quadratische Ergänzung",
    subtitle: "2D-Trick I = [I₀(1)]² in Polarkoordinaten und 1D-Verschiebung per quadratischer Ergänzung.",
    layout: "split",
    defaults: {
      mode3d: "polar",
      rShell: 0.85,
      ySlice: 0.4,
      expr: "b1c",
      a: 1.0,
      b: 2.0,
      c: 2.0
    },
    presets: [
      { label: "B1(b): I₀(π) = 1", patch: { expr: "b1b", a: Math.PI } },
      { label: "B1(c): a=1, b=2", patch: { expr: "b1c", a: 1, b: 2 } },
      { label: "H1(a): c=2", patch: { expr: "h1a", c: 2 } },
      { label: "H1(b): c=1", patch: { expr: "h1b", c: 1 } },
      { label: "H1(c): c=-3", patch: { expr: "h1c", c: -3 } }
    ],
    panels: [
      { id: "c3d", type: "3d", title: "3D-Trick: z = exp(-(x²+y²)) (B1a–b)", caption: "Ziehen zum Drehen. Wähle Polarringe 2πr·e^(-r²) oder kartesische Scheiben." },
      { id: "c2d", type: "2d", title: "1D Quadratische Ergänzung (B1c & H1)", caption: "Gestrichelt: verschobene Basis-Gaußkurve exp(-α(x-C)²). Gefüllt: voller Integrand." }
    ],
    controls(s) {
      const list = [
        { type: "seg", key: "mode3d", label: "3D-Zerlegung (B1a)", options: [{ v: "polar", t: "Polarring r" }, { v: "cart", t: "Scheibe y₀" }] }
      ];
      if (s.mode3d === "polar") {
        list.push({ type: "range", key: "rShell", label: "Radius r", min: 0.15, max: 1.9, step: 0.05 });
      } else {
        list.push({ type: "range", key: "ySlice", label: "Schnitt y₀", min: -1.5, max: 1.5, step: 0.05 });
      }
      list.push({
        type: "seg",
        key: "expr",
        label: "1D-Integral",
        options: [
          { v: "b1b", t: "B1(b)" },
          { v: "b1c", t: "B1(c)" },
          { v: "h1a", t: "H1(a)" },
          { v: "h1b", t: "H1(b)" },
          { v: "h1c", t: "H1(c)" }
        ]
      });
      if (s.expr === "b1b" || s.expr === "b1c") {
        list.push({ type: "range", key: "a", label: "Parameter a > 0", min: 0.3, max: 4.0, step: 0.05 });
      }
      if (s.expr === "b1c") {
        list.push({ type: "range", key: "b", label: "Parameter b", min: -3.0, max: 3.0, step: 0.1 });
      }
      if (s.expr.startsWith("h1")) {
        list.push({ type: "range", key: "c", label: "Parameter c", min: -4.0, max: 4.0, step: 0.1 });
      }
      return list;
    },
    eval1D(s) {
      if (s.expr === "b1b") {
        return { alpha: s.a, C: 0, D: 0, tex: `exp(-${fmt(s.a, 2)} x²)`, val: Math.sqrt(Math.PI / s.a) };
      }
      if (s.expr === "b1c") {
        const C = s.b / (2 * s.a);
        const D = (s.b * s.b) / (4 * s.a);
        return { alpha: s.a, C, D, tex: `exp(-${fmt(s.a, 2)}(x - ${fmt(C, 2)})² + ${fmt(D, 2)})`, val: Math.sqrt(Math.PI / s.a) * Math.exp(D) };
      }
      if (s.expr === "h1a") {
        const C = -s.c / 2;
        const D = 0.75 * s.c * s.c;
        return { alpha: 3, C, D, tex: `exp(-3(x - (${fmt(C, 2)}))² + ${fmt(D, 2)})`, val: Math.sqrt(Math.PI / 3) * Math.exp(D) };
      }
      if (s.expr === "h1b") {
        const C = -1.5;
        const D = (9 - s.c) / 8;
        return { alpha: 0.5, C, D, tex: `exp(-½(x + 1.5)² + ${fmt(D, 2)})`, val: Math.sqrt(2 * Math.PI) * Math.exp(D) };
      }
      const C = (s.c - 3) / 2;
      const D = 0.5 * (s.c + 3) * (s.c + 3);
      return { alpha: 2, C, D, tex: `exp(-2(x - (${fmt(C, 2)}))² + ${fmt(D, 2)})`, val: Math.sqrt(Math.PI / 2) * Math.exp(D) };
    },
    render(canvases, s, state) {
      if (!state.sc3d) {
        state.sc3d = new Scene3D(canvases.c3d, { yaw: 0.72, pitch: 0.52, baseScale: 78, target: [0, 0, 0.35] });
        state.sc3d.onRender = () => this.render3D(state.sc3d, s);
      }
      this.render3D(state.sc3d, s);

      if (!state.p2d) {
        state.p2d = new Plot2D(canvases.c2d, { keepAspect: false });
      }
      this.render2D(state.p2d, s);
    },
    render3D(sc, s) {
      sc.clear();
      sc.addAxes(2.1, ["x", "y", "z"]);

      sc.addParametricSurface(-2.0, 2.0, 26, -2.0, 2.0, 26, (x, y) => {
        const r2 = x * x + y * y;
        const z = Math.exp(-r2);
        return { p: [x, y, z * 1.4], color: scalarColor(z) };
      }, { alpha: 0.78 });

      if (s.mode3d === "polar") {
        const r = s.rShell;
        const dr = 0.1;
        const nPhi = 40;
        const h = Math.exp(-r * r) * 1.4;
        for (let i = 0; i < nPhi; i++) {
          const a0 = (i / nPhi) * Math.PI * 2;
          const a1 = ((i + 1) / nPhi) * Math.PI * 2;
          const p1 = [(r - dr / 2) * Math.cos(a0), (r - dr / 2) * Math.sin(a0), 0];
          const p2 = [(r + dr / 2) * Math.cos(a0), (r + dr / 2) * Math.sin(a0), 0];
          const p3 = [(r + dr / 2) * Math.cos(a1), (r + dr / 2) * Math.sin(a1), 0];
          const p4 = [(r - dr / 2) * Math.cos(a1), (r - dr / 2) * Math.sin(a1), 0];
          const q1 = [p1[0], p1[1], h];
          const q2 = [p2[0], p2[1], h];
          const q3 = [p3[0], p3[1], h];
          const q4 = [p4[0], p4[1], h];
          sc.addPolygon([p2, p3, q3, q2], { color: [245, 158, 11], alpha: 0.92, zBias: 0.04 });
          sc.addPolygon([q1, q2, q3, q4], { color: [251, 191, 36], alpha: 0.95, zBias: 0.05 });
        }
      } else {
        const y0 = s.ySlice;
        const nX = 36;
        for (let i = 0; i < nX; i++) {
          const x0 = -2.0 + (4.0 * i) / nX;
          const x1 = -2.0 + (4.0 * (i + 1)) / nX;
          const xm = 0.5 * (x0 + x1);
          const h = Math.exp(-(xm * xm + y0 * y0)) * 1.4;
          sc.addPolygon([[x0, y0, 0], [x1, y0, 0], [x1, y0, h], [x0, y0, h]], {
            color: [220, 38, 38],
            alpha: 0.85,
            zBias: 0.06
          });
        }
      }
      sc.render();
    },
    render2D(p2d, s) {
      const info = this.eval1D(s);
      const isHW = s.expr.startsWith("h1");
      const peak = Math.exp(info.D);
      const yTop = Math.min(25, Math.max(1.35, peak * 1.15));
      const xHalf = Math.max(3.6, Math.abs(info.C) + 2.8);
      p2d.setBounds(info.C - xHalf, info.C + xHalf, -0.05 * yTop, yTop);
      const m = p2d.begin();
      const yStep = yTop > 8 ? 2 : yTop > 3 ? 1 : 0.5;
      p2d.drawGridAndAxes(m, { xStep: 1, yStep, xLabel: "x", yLabel: "f(x)" });

      const { ctx, ox, oy, plotW, plotH } = m;
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, plotW, plotH);
      ctx.clip();

      const N = 220;
      const x0 = p2d.xMin;
      const x1 = p2d.xMax;

      // Filled full integrand
      ctx.beginPath();
      const [sx0, sy0] = p2d.toPx(x0, 0, m);
      ctx.moveTo(sx0, sy0);
      for (let i = 0; i <= N; i++) {
        const x = x0 + ((x1 - x0) * i) / N;
        const y = Math.exp(-info.alpha * (x - info.C) * (x - info.C) + info.D);
        const [px, py] = p2d.toPx(x, y, m);
        ctx.lineTo(px, py);
      }
      const [sx1, sy1] = p2d.toPx(x1, 0, m);
      ctx.lineTo(sx1, sy1);
      ctx.closePath();
      ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
      ctx.fill();

      // Curve stroke
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const x = x0 + ((x1 - x0) * i) / N;
        const y = Math.exp(-info.alpha * (x - info.C) * (x - info.C) + info.D);
        const [px, py] = p2d.toPx(x, y, m);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "#047857";
      ctx.lineWidth = 2.4;
      ctx.stroke();

      if (!isHW) {
        // Shifted base Gaussian exp(-alpha*(x-C)^2)
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        for (let i = 0; i <= N; i++) {
          const x = x0 + ((x1 - x0) * i) / N;
          const y = Math.exp(-info.alpha * (x - info.C) * (x - info.C));
          const [px, py] = p2d.toPx(x, y, m);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 1.7;
        ctx.stroke();
        ctx.setLineDash([]);

        // Symmetry line x = C
        const [cxPx, cyTop] = p2d.toPx(info.C, peak, m);
        const [, cyBot] = p2d.toPx(info.C, 0, m);
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(cxPx, cyBot);
        ctx.lineTo(cxPx, cyTop);
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();

      if (!isHW) {
        p2d.drawPoint(m, [info.C, peak], { color: "#dc2626", label: `C=${fmt(info.C, 2)}, e^D=${fmt(peak, 2)}` });
      }
    },
    readout(s) {
      const info = this.eval1D(s);
      const r = s.rShell;
      if (s.expr.startsWith("h1")) {
        const given = {
          h1a: "I₁(c) = ∫ dx exp(−3(x + c)x)",
          h1b: "I₂(c) = ∫ dx exp(−½(x² + 3x + c/4))",
          h1c: "I₃(c) = ∫ dx exp(−2(x + 3)(x − c))"
        };
        const ctrl = {
          h1a: "Kontrolle: I₁(2) = √(π/3)·e³",
          h1b: "Kontrolle: I₂(1) = √(2π)·e",
          h1c: "Kontrolle: I₃(−3) = √(π/2)"
        };
        return `
          <div class="formula-line">I₀(a) = ∫ dx e^(-ax²) = √(π/a)  (aus B1)</div>
          <div class="formula-line">${given[s.expr]}</div>
          <div class="metric-row"><span class="metric-label">Parameter c</span><span class="metric-value">${fmt(s.c, 2)}</span></div>
          <div class="metric-row"><span class="metric-label">${ctrl[s.expr]}</span><span class="metric-value">(Hausaufgabe)</span></div>
        `;
      }
      return `
        <div class="formula-line">I = [I₀(1)]² = ∫₀^∞ 2πr e^(-r²) dr = π</div>
        <div class="formula-line">${info.tex}</div>
        <div class="metric-row"><span class="metric-label">Scheitel C</span><span class="metric-value">${fmt(info.C, 3)}</span></div>
        <div class="metric-row"><span class="metric-label">Exponent-Shift D</span><span class="metric-value">${fmt(info.D, 3)}</span></div>
        <div class="metric-row"><span class="metric-label">Integralwert (Fläche)</span><span class="metric-value">${fmt(info.val, 4)}</span></div>
        <div class="metric-row"><span class="metric-label">3D Schalenbeitrag bei r=${fmt(r, 2)}</span><span class="metric-value">2πr e^(-r²) = ${fmt(2 * Math.PI * r * Math.exp(-r * r), 3)}</span></div>
      `;
    },
    insight: `
      <p><strong>2D-Trick (B1a–b):</strong> Das Produkt [I₀(1)]² entspricht dem Volumen unter der rotationssymmetrischen Glocke <code>e^{-(x²+y²)}</code>. In Polarkoordinaten zerfällt es in konzentrische Zylinderschalen der Höhe <code>e^{-r²}</code> und des Umfangs <code>2πr</code>.</p>
      <p><strong>Quadratische Ergänzung (B1c, H1):</strong> Ein linearer Term verschiebt nur das Zentrum auf <code>x = C</code> (was das Integral von −∞ bis ∞ nicht ändert!) und skaliert die Amplitude um den Faktor <code>e^D</code>.</p>
    `
  };

  // =========================================================================
  // 2. B2: Verallgemeinerte Polarkoordinaten (Ellipse & Nicht-Orthogonalität)
  // =========================================================================
  const ModGenPolar2D = {
    id: "gen_polar_2d",
    navGroup: "Beispiel- & Hausaufgaben",
    code: "B2",
    badge: "Beispielaufgabe 2",
    badgeClass: "",
    title: "Verallgemeinerte Polarkoordinaten & Fläche einer Ellipse",
    subtitle: "x = μa cos φ, y = μb sin φ — Jacobi-Determinante abμ und nicht-orthogonale lokale Basis.",
    layout: "single",
    defaults: { a: 2.2, b: 1.1, mu: 0.72, phiDeg: 40 },
    presets: [
      { label: "Ellipse (a=2.2, b=1.1)", patch: { a: 2.2, b: 1.1, mu: 0.72, phiDeg: 40 } },
      { label: "Kreis (a=b=1.5 → orthogonal!)", patch: { a: 1.5, b: 1.5, mu: 0.75, phiDeg: 40 } },
      { label: "Auf Achse (φ=0° → orthogonal)", patch: { a: 2.2, b: 1.1, mu: 0.8, phiDeg: 0 } }
    ],
    panels: [
      { id: "c2d", type: "2d", title: "Elliptisches Koordinatennetz & lokale Basisvektoren (Klicken/Ziehen im Plot)", caption: "Rot: ∂_μ r | Blau: ∂_φ r | Gelbes Parallelogramm: Flächenelement |∂_μ r × ∂_φ r| = abμ." }
    ],
    controls() {
      return [
        { type: "range", key: "a", label: "Halbachse a", min: 0.6, max: 3.0, step: 0.05 },
        { type: "range", key: "b", label: "Halbachse b", min: 0.6, max: 3.0, step: 0.05 },
        { type: "range", key: "mu", label: "Radialkoordinate μ", min: 0.15, max: 1.2, step: 0.02 },
        { type: "range", key: "phiDeg", label: "Winkel φ (°)", min: 0, max: 360, step: 1 }
      ];
    },
    render(canvases, s, state, syncUI) {
      if (!state.p2d) {
        state.p2d = new Plot2D(canvases.c2d, { xMin: -3.4, xMax: 3.4, yMin: -3.2, yMax: 3.2 });
        state.p2d.attachProbe((wx, wy) => {
          const nx = wx / s.a;
          const ny = wy / s.b;
          const mu = Math.max(0.15, Math.min(1.2, Math.hypot(nx, ny)));
          let phi = Math.atan2(ny, nx);
          if (phi < 0) phi += Math.PI * 2;
          s.mu = Number(mu.toFixed(2));
          s.phiDeg = Math.round((phi * 180) / Math.PI);
          syncUI();
        });
      }
      const p2d = state.p2d;
      const lim = Math.max(s.a, s.b) * 1.38;
      p2d.setBounds(-lim, lim, -lim * 0.85, lim * 0.85);
      const m = p2d.begin();
      p2d.drawGridAndAxes(m, { xStep: 1, yStep: 1, xLabel: "x", yLabel: "y" });

      const { ctx } = m;
      // Fill ellipse mu <= 1
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const t = (i / 120) * Math.PI * 2;
        const [px, py] = p2d.toPx(s.a * Math.cos(t), s.b * Math.sin(t), m);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
      ctx.fill();
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Concentric mu ellipses
      for (const mu of [0.25, 0.5, 0.75, 1.2]) {
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
          const t = (i / 100) * Math.PI * 2;
          const [px, py] = p2d.toPx(mu * s.a * Math.cos(t), mu * s.b * Math.sin(t), m);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = mu === 1 ? "#059669" : "rgba(100,116,139,0.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Radial phi rays
      for (let k = 0; k < 12; k++) {
        const ang = (k / 12) * Math.PI * 2;
        const [p0x, p0y] = p2d.toPx(0, 0, m);
        const [p1x, p1y] = p2d.toPx(1.25 * s.a * Math.cos(ang), 1.25 * s.b * Math.sin(ang), m);
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.lineTo(p1x, p1y);
        ctx.strokeStyle = "rgba(100,116,139,0.28)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const phi = (s.phiDeg * Math.PI) / 180;
      const pt = [s.mu * s.a * Math.cos(phi), s.mu * s.b * Math.sin(phi)];
      const eMu = [s.a * Math.cos(phi), s.b * Math.sin(phi)];
      const ePhi = [-s.mu * s.a * Math.sin(phi), s.mu * s.b * Math.cos(phi)];
      const scVec = 0.45; // Visual scaling so basis arrows fit cleanly
      const vMu = [eMu[0] * scVec, eMu[1] * scVec];
      const vPhi = [ePhi[0] * scVec, ePhi[1] * scVec];

      // Spanned parallelogram
      const pA = p2d.toPx(pt[0], pt[1], m);
      const pB = p2d.toPx(pt[0] + vMu[0], pt[1] + vMu[1], m);
      const pC = p2d.toPx(pt[0] + vMu[0] + vPhi[0], pt[1] + vMu[1] + vPhi[1], m);
      const pD = p2d.toPx(pt[0] + vPhi[0], pt[1] + vPhi[1], m);
      ctx.beginPath();
      ctx.moveTo(pA[0], pA[1]);
      ctx.lineTo(pB[0], pB[1]);
      ctx.lineTo(pC[0], pC[1]);
      ctx.lineTo(pD[0], pD[1]);
      ctx.closePath();
      ctx.fillStyle = "rgba(245, 158, 11, 0.28)";
      ctx.fill();
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.restore();

      p2d.drawArrow(m, pt, [pt[0] + vMu[0], pt[1] + vMu[1]], { color: "#dc2626", lineWidth: 2.3, label: "∂_μ r" });
      p2d.drawArrow(m, pt, [pt[0] + vPhi[0], pt[1] + vPhi[1]], { color: "#2563eb", lineWidth: 2.3, label: "∂_φ r" });
      p2d.drawPoint(m, pt, { color: "#0f172a", label: `(${fmt(pt[0], 2)}, ${fmt(pt[1], 2)})` });
    },
    readout(s) {
      const phi = (s.phiDeg * Math.PI) / 180;
      const eMu = [s.a * Math.cos(phi), s.b * Math.sin(phi)];
      const ePhi = [-s.mu * s.a * Math.sin(phi), s.mu * s.b * Math.cos(phi)];
      const dot = eMu[0] * ePhi[0] + eMu[1] * ePhi[1];
      const n1 = Math.hypot(eMu[0], eMu[1]);
      const n2 = Math.hypot(ePhi[0], ePhi[1]);
      const angleDeg = (Math.acos(Math.max(-1, Math.min(1, dot / (n1 * n2)))) * 180) / Math.PI;
      const jac = s.a * s.b * s.mu;
      const area = Math.PI * s.a * s.b;
      return `
        <div class="formula-line">dx dy = |det J| dμ dφ = a·b·μ dμ dφ</div>
        <div class="formula-line">A_Ellipse = 2πab ∫₀¹ μ dμ = π·a·b</div>
        <div class="metric-row"><span class="metric-label">Jacobi-Det abμ</span><span class="metric-value">${fmt(jac, 3)}</span></div>
        <div class="metric-row"><span class="metric-label">Winkel ∠(∂_μ r, ∂_φ r)</span><span class="metric-value">${fmt(angleDeg, 1)}°</span></div>
        <div class="metric-row"><span class="metric-label">Skalarprodukt ∂_μ r · ∂_φ r</span><span class="metric-value">${fmt(dot, 3)}</span></div>
        <div class="metric-row"><span class="metric-label">Fläche Ellipse (μ ≤ 1)</span><span class="metric-value">${fmt(area, 3)}</span></div>
      `;
    },
    insight: `
      <p><strong>Warum nicht orthogonal?</strong> Für <code>a ≠ b</code> gilt <code>∂_μ r · ∂_φ r = μ(b² − a²) sin φ cos φ ≠ 0</code> (außer auf den Hauptachsen). Dennoch bleibt das Parallelogramm-Flächenelement exakt <code>abμ dμ dφ</code>!</p>
      <p>Stelle <code>a = b</code> ein, um zu sehen, wie die beiden Basisvektoren sofort wieder im rechten Winkel stehen.</p>
    `
  };

  // =========================================================================
  // 3. H2: Volumen in verallgemeinerten Polarkoordinaten (Z, E, K)
  // =========================================================================
  const ModGenPolar3D = {
    id: "gen_polar_3d",
    navGroup: "Beispiel- & Hausaufgaben",
    code: "H2",
    badge: "Hausaufgabe 2",
    badgeClass: "hw",
    title: "Volumina Z, E und K (verallg. Polarkoordinaten)",
    subtitle: "Zelt Z, Ellipsoid E und elliptischer Kegel K mit Halbachsen a, b und Höhe c.",
    layout: "single",
    defaults: { body: "Z", a: 1.5, b: 1.0, c: 2.0, muSlice: 0.6 },
    presets: [
      { label: "Kontrollergebnis (a=1/π, b=2, c=3)", patch: { a: 1 / Math.PI, b: 2, c: 3 } },
      { label: "Standard (a=1.5, b=1, c=2)", patch: { a: 1.5, b: 1.0, c: 2.0 } }
    ],
    panels: [
      { id: "c3d", type: "3d", title: "3D-Körper & elliptische Zylinderschale bei μ", caption: "Ziehen zum Drehen. Hervorgehoben: elliptischer Querschnitt / Schale zur Koordinate μ." }
    ],
    controls() {
      return [
        { type: "seg", key: "body", label: "Körper", options: [{ v: "Z", t: "(a) Zelt Z" }, { v: "E", t: "(b) Ellipsoid E" }, { v: "K", t: "(c) Kegel K" }] },
        { type: "range", key: "a", label: "Halbachse a", min: 0.25, max: 2.5, step: 0.02 },
        { type: "range", key: "b", label: "Halbachse b", min: 0.4, max: 2.5, step: 0.05 },
        { type: "range", key: "c", label: "Höhe / Halbachse c", min: 0.5, max: 3.2, step: 0.05 },
        { type: "range", key: "muSlice", label: "Schalenradius μ", min: 0.1, max: 0.98, step: 0.02 }
      ];
    },
    render(canvases, s, state) {
      if (!state.sc3d) {
        state.sc3d = new Scene3D(canvases.c3d, { yaw: 0.78, pitch: 0.44, baseScale: 62, target: [0, 0, 0.7] });
        state.sc3d.onRender = () => this.render3D(state.sc3d, s);
      }
      this.render3D(state.sc3d, s);
    },
    render3D(sc, s) {
      sc.clear();
      const { a, b, c, body, muSlice } = s;
      sc.target = body === "E" ? [0, 0, 0] : [0, 0, c * 0.4];
      sc.addAxes(Math.max(a, b, c) * 1.15, ["x", "y", "z"]);

      const hAt = (mu) => {
        if (body === "Z") return c * (1 - mu * mu);
        if (body === "K") return c * (1 - mu);
        return c * Math.sqrt(Math.max(0, 1 - mu * mu));
      };

      if (body === "E") {
        sc.addParametricSurface(0, Math.PI, 20, 0, Math.PI * 2, 30, (th, ph) => ({
          p: [a * Math.sin(th) * Math.cos(ph), b * Math.sin(th) * Math.sin(ph), c * Math.cos(th)],
          color: [59, 130, 246]
        }), { alpha: 0.42 });
      } else {
        sc.addParametricSurface(0, 1, 18, 0, Math.PI * 2, 32, (mu, ph) => ({
          p: [mu * a * Math.cos(ph), mu * b * Math.sin(ph), hAt(mu)],
          color: body === "Z" ? [16, 185, 129] : [217, 119, 6]
        }), { alpha: 0.48 });
      }

      // Highlighted shell at mu = muSlice
      const zH = hAt(muSlice);
      const zMin = body === "E" ? -zH : 0;
      const nP = 36;
      for (let i = 0; i < nP; i++) {
        const p0 = (i / nP) * Math.PI * 2;
        const p1 = ((i + 1) / nP) * Math.PI * 2;
        const x0 = muSlice * a * Math.cos(p0), y0 = muSlice * b * Math.sin(p0);
        const x1 = muSlice * a * Math.cos(p1), y1 = muSlice * b * Math.sin(p1);
        sc.addPolygon([[x0, y0, zMin], [x1, y1, zMin], [x1, y1, zH], [x0, y0, zH]], {
          color: [220, 38, 38],
          alpha: 0.72,
          zBias: 0.05
        });
      }
      sc.render();
    },
    readout(s) {
      const { a, b, c, body } = s;
      const givenMap = {
        Z: "h_Z(x, y) = c [1 − (x/a)² − (y/b)²]",
        E: "(x/a)² + (y/b)² + (z/c)² ≤ 1",
        K: "Kegel: Höhe c, elliptische Basis (a, b)"
      };
      return `
        <div class="formula-line">x = μa cos φ,  y = μb sin φ,  dx dy = ab μ dμ dφ</div>
        <div class="formula-line">${givenMap[body]}</div>
        <div class="metric-row"><span class="metric-label">Parameter (a, b, c)</span><span class="metric-value">(${fmt(a, 2)}, ${fmt(b, 2)}, ${fmt(c, 2)})</span></div>
        <div class="metric-row"><span class="metric-label">Kontrolle (a=1/π, b=2, c=3)</span><span class="metric-value">V_Z=3, V_E=8, V_K=2</span></div>
      `;
    },
    insight: `
      <p>Drehe die Körper <code>Z</code>, <code>E</code> und <code>K</code> in 3D und verschiebe <code>μ</code>: Die rote Zylinderschale zeigt den Beitrag bei festem <code>μ</code>, dessen Höhe über den jeweiligen Querschnitt von <code>μ</code> abhängt.</p>
      <p>Überlege dir für (c), wie der Radius der horizontalen Ellipsen linear mit der Höhe <code>z</code> abnimmt.</p>
    `
  };

  // =========================================================================
  // 4. B3: Kegelstumpf (Zylinderkoordinaten)
  // =========================================================================
  const ModCylB3 = {
    id: "cyl_b3",
    navGroup: "Beispiel- & Hausaufgaben",
    code: "B3",
    badge: "Beispielaufgabe 3",
    badgeClass: "",
    title: "Kegelstumpf: Volumen & Trägheitsmoment",
    subtitle: "K = {H ≤ z ≤ 2H, ρ ≤ az} — Zylinderkoordinaten und Abstand d⊥(r) = ρ zur z-Achse.",
    layout: "split",
    defaults: { a: 1.0, H: 1.0, zSlice: 1.5 },
    presets: [
      { label: "Kontrolle V_K(3) = 21πH³", patch: { a: 3.0, H: 1.0, zSlice: 1.5 } },
      { label: "Kontrolle I_K(1) = 93/70 MH²", patch: { a: 1.0, H: 1.0, zSlice: 1.5 } }
    ],
    panels: [
      { id: "c3d", type: "3d", title: "3D-Kegelstumpf & Scheibe bei z", caption: "Ziehen zum Drehen. Grüne Scheibe zeigt die radiale Integration ρ ∈ [0, a·z]." },
      { id: "c2d", type: "2d", title: "(ρ, z)-Querschnitt & Integrationsgrenzen", caption: "Die schräge Wand ist ρ = a·z zwischen z = H und z = 2H." }
    ],
    controls(s) {
      s.zSlice = Math.max(s.H, Math.min(2 * s.H, s.zSlice));
      return [
        { type: "range", key: "a", label: "Steigungsfaktor a", min: 0.4, max: 3.2, step: 0.1 },
        { type: "range", key: "H", label: "Höhenparameter H", min: 0.5, max: 1.8, step: 0.1 },
        { type: "range", key: "zSlice", label: "Integrationshöhe z", min: s.H, max: 2 * s.H, step: 0.02 }
      ];
    },
    render(canvases, s, state) {
      s.zSlice = Math.max(s.H, Math.min(2 * s.H, s.zSlice));
      if (!state.sc3d) {
        state.sc3d = new Scene3D(canvases.c3d, { yaw: 0.72, pitch: 0.36, baseScale: 52, target: [0, 0, 1.3] });
        state.sc3d.onRender = () => this.render3D(state.sc3d, s);
      }
      this.render3D(state.sc3d, s);
      if (!state.p2d) {
        state.p2d = new Plot2D(canvases.c2d, { keepAspect: true });
      }
      this.render2D(state.p2d, s);
    },
    render3D(sc, s) {
      sc.clear();
      const { a, H, zSlice } = s;
      const rMax = 2 * a * H;
      sc.target = [0, 0, 1.45 * H];
      sc.baseScale = Math.min(62, 140 / Math.max(2 * H, rMax));
      sc.addAxes(Math.max(2.3 * H, rMax * 1.15), ["x", "y", "z"]);

      // Dashed cone tip down to origin
      for (let k = 0; k < 4; k++) {
        const ph = (k * Math.PI) / 2;
        sc.addLine([0, 0, 0], [a * H * Math.cos(ph), a * H * Math.sin(ph), H], {
          color: "rgba(100,116,139,0.5)",
          dash: [4, 4]
        });
      }

      // Outer lateral wall
      sc.addParametricSurface(H, 2 * H, 14, 0, Math.PI * 2, 34, (z, ph) => ({
        p: [a * z * Math.cos(ph), a * z * Math.sin(ph), z],
        color: [59, 130, 246]
      }), { alpha: 0.42 });

      // Highlighted slice disk at z = zSlice
      const rSlice = a * zSlice;
      sc.addParametricSurface(0, rSlice, 8, 0, Math.PI * 2, 32, (r, ph) => ({
        p: [r * Math.cos(ph), r * Math.sin(ph), zSlice],
        color: [16, 185, 129]
      }), { alpha: 0.88, zBias: 0.05 });

      sc.addArrow([0, 0, zSlice], [rSlice, 0, zSlice], { color: "#dc2626", label: "d⊥ = ρ_max" });
      sc.render();
    },
    render2D(p2d, s) {
      const { a, H, zSlice } = s;
      const rMax = 2 * a * H;
      const limX = Math.max(2.6, rMax * 1.28);
      const limY = 2.35 * H;
      p2d.setBounds(-0.3, limX, -0.2, limY);
      const m = p2d.begin();
      p2d.drawGridAndAxes(m, { xStep: 1, yStep: 0.5, xLabel: "ρ", yLabel: "z" });

      const { ctx } = m;
      const pts = [
        p2d.toPx(0, H, m),
        p2d.toPx(a * H, H, m),
        p2d.toPx(2 * a * H, 2 * H, m),
        p2d.toPx(0, 2 * H, m)
      ];
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = "rgba(59, 130, 246, 0.16)";
      ctx.fill();
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tip extension dashed
      const [oX, oY] = p2d.toPx(0, 0, m);
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(oX, oY);
      ctx.lineTo(pts[1][0], pts[1][1]);
      ctx.strokeStyle = "#64748b";
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      p2d.drawArrow(m, [0, zSlice], [a * zSlice, zSlice], {
        color: "#059669",
        lineWidth: 3,
        label: `ρ ≤ ${fmt(a * zSlice, 2)}`,
        labelPos: "mid",
        labelOffset: [0, -10]
      });
      p2d.drawPoint(m, [a * zSlice, zSlice], { color: "#dc2626", label: `(a·z, z)`, offset: [8, 4] });
    },
    readout(s) {
      const { a, H } = s;
      const V = (7 / 3) * Math.PI * a * a * H * H * H;
      const IoverMH2 = (93 / 70) * a * a;
      return `
        <div class="formula-line">V_K(a) = (7/3) π a² H³</div>
        <div class="formula-line">I_K(a) = (93/70) a² M H²</div>
        <div class="metric-row"><span class="metric-label">V_K / H³</span><span class="metric-value">${fmt(V / (H * H * H), 3)} (= ${fmt((7 / 3) * a * a, 3)}π)</span></div>
        <div class="metric-row"><span class="metric-label">I_K / (M H²)</span><span class="metric-value">${fmt(IoverMH2, 4)}</span></div>
        <div class="metric-row"><span class="metric-label">Radius bei z=${fmt(s.zSlice, 2)}</span><span class="metric-value">ρ_max = ${fmt(a * s.zSlice, 3)}</span></div>
      `;
    },
    insight: `
      <p>In Zylinderkoordinaten ist der senkrechte Abstand zur Drehachse (z-Achse) einfach <code>d⊥(r) = ρ</code>. Der Kegelstumpf reicht von <code>z = H</code> bis <code>2H</code>, wobei der maximale Radius linear als <code>ρ_max(z) = a·z</code> wächst.</p>
    `
  };

  // =========================================================================
  // 5. H3: Zylinderkoordinaten — Hohlzylinder Z, Paraboloid P & Schüssel S
  // =========================================================================
  const ModCylH3 = {
    id: "cyl_h3",
    navGroup: "Beispiel- & Hausaufgaben",
    code: "H3",
    badge: "Hausaufgabe 3",
    badgeClass: "hw",
    title: "Hohlzylinder Z, Paraboloid P & Schüssel S",
    subtitle: "3D-Aufschnitt und (ρ, z)-Querschnitt zum Ablesen der Integrationsgrenzen ρ₁(z) ≤ ρ ≤ ρ₂(z).",
    layout: "split",
    defaults: { body: "S", a: 4 / 3, R: 1.0, zFrac: 0.45, cutaway: true, showRemoved: true },
    presets: [
      { label: "H3(c) Kontrolle a=4/3", patch: { body: "S", a: 4 / 3, zFrac: 0.45 } },
      { label: "H3(c) Grenzfall a=1!", patch: { body: "S", a: 1.0, zFrac: 0.45 } },
      { label: "H3(b) Paraboloid a=2", patch: { body: "P", a: 2.0, zFrac: 0.5 } },
      { label: "H3(a) Hohlzylinder a=2", patch: { body: "Z", a: 2.0, zFrac: 0.5 } }
    ],
    panels: [
      { id: "c3d", type: "3d", title: "3D-Körper (optional aufgeschnitten)", caption: "Ziehen zum Drehen. In (c) zeigt Grau/Rot die Kugel K₁ und den ausgestanzten Kegel K₂." },
      { id: "c2d", type: "2d", title: "(ρ, z)-Meridianschnitt mit radialem Intervall", caption: "Grüne Linie zeigt das Integrationsintervall ρ₁(z) ≤ ρ ≤ ρ₂(z) auf der gewählten Höhe z." }
    ],
    controls(s) {
      if (s.body === "S" && s.a < 1) s.a = 1;
      if (s.body === "Z" && s.a < 1.15) s.a = 1.15;
      const ctrls = [
        { type: "seg", key: "body", label: "Körper", options: [{ v: "Z", t: "(a) Hohlzylinder" }, { v: "P", t: "(b) Paraboloid" }, { v: "S", t: "(c) Schüssel S" }] },
        { type: "range", key: "a", label: s.body === "S" ? "Parameter a ≥ 1" : "Parameter a > 1", min: s.body === "S" ? 1.0 : (s.body === "Z" ? 1.15 : 0.6), max: 2.8, step: 0.01 },
        { type: "range", key: "zFrac", label: "Höhen-Schieber z / z_max", min: 0.05, max: 0.96, step: 0.01 },
        { type: "check", key: "cutaway", label: "3D-Körper aufschneiden (φ ≤ 270°)" }
      ];
      if (s.body === "S") {
        ctrls.push({ type: "check", key: "showRemoved", label: "Kugel K₁ & ausgestanzten Kegel K₂ zeigen" });
      }
      return ctrls;
    },
    boundsForZ(s, z) {
      const { body, a, R } = s;
      if (body === "Z") return [R, a * R];
      if (body === "P") return [0, Math.sqrt(Math.max(0, R * z))];
      // S: sphere center (0,0,aR), radius aR -> rho^2 <= z(2aR - z); cone: rho^2 <= (a-1)z^2
      const r1 = Math.sqrt(Math.max(0, (a - 1) * z * z));
      const r2 = Math.sqrt(Math.max(0, z * (2 * a * R - z)));
      return [r1, r2];
    },
    zMax(s) {
      if (s.body === "Z") return 2 * s.R;
      if (s.body === "P") return s.a * s.R;
      return 2 * s.R; // zm = 2R independent of a >= 1!
    },
    render(canvases, s, state) {
      if (s.body === "S" && s.a < 1) s.a = 1;
      if (s.body === "Z" && s.a < 1.1) s.a = 1.1;
      if (!state.sc3d) {
        state.sc3d = new Scene3D(canvases.c3d, { yaw: 0.78, pitch: 0.34, baseScale: 66, target: [0, 0, 1.0] });
        state.sc3d.onRender = () => this.render3D(state.sc3d, s);
      }
      this.render3D(state.sc3d, s);
      if (!state.p2d) {
        state.p2d = new Plot2D(canvases.c2d, { keepAspect: true });
      }
      this.render2D(state.p2d, s);
    },
    render3D(sc, s) {
      sc.clear();
      const { body, a, R, zFrac, cutaway, showRemoved } = s;
      const zm = this.zMax(s);
      const zSlice = zFrac * zm;
      const phiMax = cutaway ? 1.5 * Math.PI : 2 * Math.PI;
      const maxExtent = body === "S" ? Math.max(2 * a * R, 2 * R) : Math.max(zm, a * R);
      sc.target = [0, 0, body === "S" ? a * R * 0.65 : zm * 0.5];
      sc.baseScale = Math.min(72, 165 / Math.max(1.8, maxExtent));
      sc.addAxes(maxExtent * 0.95, ["x", "y", "z"]);

      const [r1S, r2S] = this.boundsForZ(s, zSlice);

      // Outer and inner surfaces of the body
      const nz = 18;
      const np = cutaway ? 26 : 34;
      sc.addParametricSurface(0, zm, nz, 0, phiMax, np, (z, ph) => {
        const [, r2] = this.boundsForZ(s, z);
        return { p: [r2 * Math.cos(ph), r2 * Math.sin(ph), z], color: [37, 99, 235] };
      }, { alpha: 0.78 });

      if (body === "Z" || (body === "S" && a > 1.001)) {
        sc.addParametricSurface(0, zm, nz, 0, phiMax, np, (z, ph) => {
          const [r1] = this.boundsForZ(s, z);
          return { p: [r1 * Math.cos(ph), r1 * Math.sin(ph), z], color: [217, 119, 6] };
        }, { alpha: 0.82 });
      }

      // Top lid if flat (Z, P)
      if (body === "Z" || body === "P") {
        const [rt1, rt2] = this.boundsForZ(s, zm);
        sc.addParametricSurface(rt1, rt2, 6, 0, phiMax, np, (r, ph) => ({
          p: [r * Math.cos(ph), r * Math.sin(ph), zm],
          color: [96, 165, 250]
        }), { alpha: 0.78 });
      }

      // Cutaway vertical cross-section walls at phi=0 and phi=phiMax
      if (cutaway) {
        for (const ph of [0, phiMax]) {
          sc.addParametricSurface(0, zm, 18, 0, 1, 4, (z, t) => {
            const [r1, r2] = this.boundsForZ(s, z);
            const r = r1 + t * (r2 - r1);
            return { p: [r * Math.cos(ph), r * Math.sin(ph), z], color: [147, 197, 253] };
          }, { alpha: 0.9 });
        }
      }

      // Ghosted removed top cap & cone for S
      if (body === "S" && showRemoved) {
        if (2 * a * R > zm + 0.02) {
          sc.addParametricSurface(zm, 2 * a * R, 10, 0, Math.PI * 2, 26, (z, ph) => {
            const r = Math.sqrt(Math.max(0, z * (2 * a * R - z)));
            return { p: [r * Math.cos(ph), r * Math.sin(ph), z], color: [148, 163, 184] };
          }, { alpha: 0.22 });
        }
        if (a > 1.001) {
          sc.addParametricSurface(0, zm * 1.15, 10, 0, Math.PI * 2, 24, (z, ph) => {
            const r = Math.sqrt(a - 1) * z;
            return { p: [r * Math.cos(ph), r * Math.sin(ph), z], color: [239, 68, 68] };
          }, { alpha: 0.18 });
        }
      }

      // Highlighted slice at zSlice
      if (r2S > r1S + 1e-4) {
        sc.addParametricSurface(r1S, r2S, 4, 0, phiMax, np, (r, ph) => ({
          p: [r * Math.cos(ph), r * Math.sin(ph), zSlice],
          color: [16, 185, 129]
        }), { alpha: 0.9, zBias: 0.06 });
      }
      sc.render();
    },
    render2D(p2d, s) {
      const { body, a, R, zFrac } = s;
      const zm = this.zMax(s);
      const zSlice = zFrac * zm;
      const topZ = body === "S" ? Math.max(2.35 * R, 2.15 * a * R) : zm * 1.22;
      const maxR = body === "S"
        ? Math.max(1.45 * a * R, Math.sqrt(Math.max(0, a - 1)) * zm * 1.38)
        : Math.max(a * R, Math.sqrt(R * zm)) * 1.38;
      p2d.setBounds(-0.2, maxR, -0.15, topZ);
      const m = p2d.begin();
      p2d.drawGridAndAxes(m, { xStep: 0.5, yStep: 0.5, xLabel: "ρ", yLabel: "z" });

      const { ctx } = m;
      ctx.save();
      // Shaded body region in (rho, z)
      const N = 80;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const z = (i / N) * zm;
        const [, r2] = this.boundsForZ(s, z);
        const [px, py] = p2d.toPx(r2, z, m);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      for (let i = N; i >= 0; i--) {
        const z = (i / N) * zm;
        const [r1] = this.boundsForZ(s, z);
        const [px, py] = p2d.toPx(r1, z, m);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(37, 99, 235, 0.22)";
      ctx.fill();
      ctx.strokeStyle = "#1d4ed8";
      ctx.lineWidth = 2;
      ctx.stroke();

      // For S, draw full sphere K1 and full cone K2 dashed
      if (body === "S") {
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
          const th = (i / 100) * Math.PI;
          const r = a * R * Math.sin(th);
          const z = a * R * (1 - Math.cos(th));
          const [px, py] = p2d.toPx(r, z, m);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1.4;
        ctx.stroke();

        const [x0, y0] = p2d.toPx(0, 0, m);
        const [xc, yc] = p2d.toPx(Math.sqrt(a - 1) * zm * 1.15, zm * 1.15, m);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(xc, yc);
        ctx.strokeStyle = "#dc2626";
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      const [r1, r2] = this.boundsForZ(s, zSlice);
      p2d.drawArrow(m, [r1, zSlice], [r2, zSlice], {
        color: "#059669",
        lineWidth: 3,
        label: "ρ₁(z) ≤ ρ ≤ ρ₂(z)",
        labelPos: "mid",
        labelOffset: [0, -10]
      });
      if (body === "S") {
        const rm = Math.sqrt(Math.max(0, a - 1)) * zm;
        p2d.drawPoint(m, [rm, zm], { color: "#dc2626", label: "Schnittpunkt z_m", offset: [8, -10] });
      }
    },
    readout(s) {
      const { body, a } = s;
      if (body === "Z") {
        return `
          <div class="formula-line">I = ρ₀ ∫_V dV d⊥²  (d⊥ = ρ in Zylinderkoord.)</div>
          <div class="formula-line">Z: R ≤ ρ ≤ aR,  0 ≤ z ≤ 2R</div>
          <div class="metric-row"><span class="metric-label">Skalenfaktor a</span><span class="metric-value">${fmt(a, 2)}</span></div>
          <div class="metric-row"><span class="metric-label">Kontrolle a=2</span><span class="metric-value">V_Z=6πR³, I_Z=15/6 MR²</span></div>
        `;
      }
      if (body === "P") {
        return `
          <div class="formula-line">I = ρ₀ ∫_V dV d⊥²</div>
          <div class="formula-line">P: 0 ≤ z ≤ aR,  (x² + y²)/R ≤ z</div>
          <div class="metric-row"><span class="metric-label">Skalenfaktor a</span><span class="metric-value">${fmt(a, 2)}</span></div>
          <div class="metric-row"><span class="metric-label">Kontrolle a=2</span><span class="metric-value">V_P=2πR³, I_P=2/3 MR²</span></div>
        `;
      }
      return `
        <div class="formula-line">K₁: x² + y² + (z − aR)² ≤ a²R²</div>
        <div class="formula-line">K₂: x² + y² ≤ (a − 1)z²  (a ≥ 1)</div>
        <div class="metric-row"><span class="metric-label">Skalenfaktor a</span><span class="metric-value">${fmt(a, 2)}</span></div>
        <div class="metric-row"><span class="metric-label">Kontrolle a=4/3</span><span class="metric-value">V_S=16/9 πR³, I_S=14/15 MR²</span></div>
      `;
    },
    insight: `
      <p>Nutze den 3D-Aufschnitt und den (ρ, z)-Querschnitt, um die Integrationsgrenzen selbst abzulesen: Wo schneiden sich Kugelwand <code>K₁</code> und Kegelwand <code>K₂</code> für die maximale Höhe <code>z_m</code>?</p>
      <p>Beobachte mit dem Schieber <code>a</code>, was geometrisch mit dem ausgestanzten Kegel passiert, wenn du dich dem Grenzfall <code>a = 1</code> näherst!</p>
    `
  };

  // =========================================================================
  // 6. B4: Volumen einer Boje (Kugelkoordinaten)
  // =========================================================================
  const ModSphB4 = {
    id: "sph_b4",
    navGroup: "Beispiel- & Hausaufgaben",
    code: "B4",
    badge: "Beispielaufgabe 4",
    badgeClass: "",
    title: "Volumen einer Boje (Kugelkoordinaten)",
    subtitle: "Begrenzt durch Kugel r ≤ R und Kegel z ≥ a√(x²+y²) mit halbem Öffnungswinkel θ̃ = arctan(1/a).",
    layout: "split",
    defaults: { R: 2.0, a: Math.sqrt(3) },
    presets: [
      { label: "Kontrollergebnis: R=2, a=√3", patch: { R: 2.0, a: Math.sqrt(3) } },
      { label: "45°-Kegel: R=2, a=1", patch: { R: 2.0, a: 1.0 } },
      { label: "Halbkugel: a=0", patch: { R: 2.0, a: 0.0 } }
    ],
    panels: [
      { id: "c3d", type: "3d", title: "3D-Boje (Kugelsektor)", caption: "Ziehen zum Drehen. Spitze am Ursprung, Kappe auf r = R." },
      { id: "c2d", type: "2d", title: "(ρ, z)-Schnitt & Öffnungswinkel θ̃", caption: "Rechtwinkliges Dreieck zeigt tan(θ̃) = ρ/z = 1/a." }
    ],
    controls() {
      return [
        { type: "range", key: "R", label: "Kugelradius R", min: 0.8, max: 3.0, step: 0.1 },
        { type: "range", key: "a", label: "Kegelsteigung a", min: 0.0, max: 3.0, step: 0.05 }
      ];
    },
    render(canvases, s, state) {
      if (!state.sc3d) {
        state.sc3d = new Scene3D(canvases.c3d, { yaw: 0.72, pitch: 0.35, baseScale: 68, target: [0, 0, 1.0] });
        state.sc3d.onRender = () => this.render3D(state.sc3d, s);
      }
      this.render3D(state.sc3d, s);
      if (!state.p2d) {
        state.p2d = new Plot2D(canvases.c2d, { keepAspect: true });
      }
      this.render2D(state.p2d, s);
    },
    render3D(sc, s) {
      sc.clear();
      const { R, a } = s;
      const thMax = a < 1e-4 ? Math.PI / 2 : Math.atan(1 / a);
      sc.target = [0, 0, R * 0.55];
      sc.baseScale = Math.min(82, 165 / R);
      sc.addAxes(R * 1.2, ["x", "y", "z"]);

      // Spherical cap
      sc.addParametricSurface(0, thMax, 14, 0, Math.PI * 2, 34, (th, ph) => ({
        p: [R * Math.sin(th) * Math.cos(ph), R * Math.sin(th) * Math.sin(ph), R * Math.cos(th)],
        color: [59, 130, 246]
      }), { alpha: 0.85 });

      // Conical side wall
      sc.addParametricSurface(0, R, 12, 0, Math.PI * 2, 34, (r, ph) => ({
        p: [r * Math.sin(thMax) * Math.cos(ph), r * Math.sin(thMax) * Math.sin(ph), r * Math.cos(thMax)],
        color: [245, 158, 11]
      }), { alpha: 0.75 });

      sc.render();
    },
    render2D(p2d, s) {
      const { R, a } = s;
      const thMax = a < 1e-4 ? Math.PI / 2 : Math.atan(1 / a);
      p2d.setBounds(-0.3, R * 1.2, -0.2, R * 1.2);
      const m = p2d.begin();
      p2d.drawGridAndAxes(m, { xStep: 0.5, yStep: 0.5, xLabel: "ρ", yLabel: "z" });

      const { ctx } = m;
      ctx.save();
      ctx.beginPath();
      const [ox, oy] = p2d.toPx(0, 0, m);
      ctx.moveTo(ox, oy);
      for (let i = 0; i <= 50; i++) {
        const th = (i / 50) * thMax;
        const [px, py] = p2d.toPx(R * Math.sin(th), R * Math.cos(th), m);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(59, 130, 246, 0.22)";
      ctx.fill();
      ctx.strokeStyle = "#1d4ed8";
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Angle arc
      const rArc = R * 0.35;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const th = (i / 30) * thMax;
        const [px, py] = p2d.toPx(rArc * Math.sin(th), rArc * Math.cos(th), m);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      const rimR = R * Math.sin(thMax);
      const rimZ = R * Math.cos(thMax);
      p2d.drawPoint(m, [rimR, rimZ], { color: "#d97706", label: `θ̃ = ${fmt((thMax * 180) / Math.PI, 1)}°` });
    },
    readout(s) {
      const { R, a } = s;
      const thMax = a < 1e-4 ? Math.PI / 2 : Math.atan(1 / a);
      const cosTh = Math.cos(thMax);
      const V = ((2 * Math.PI) / 3) * R * R * R * (1 - cosTh);
      return `
        <div class="formula-line">θ̃ = arctan(1/a),  cos(θ̃) = a / √(1 + a²)</div>
        <div class="formula-line">V(R, a) = (2π/3) R³ (1 − cos θ̃)</div>
        <div class="metric-row"><span class="metric-label">θ̃ in Grad / rad</span><span class="metric-value">${fmt((thMax * 180) / Math.PI, 2)}° / ${fmt(thMax, 3)}</span></div>
        <div class="metric-row"><span class="metric-label">cos(θ̃)</span><span class="metric-value">${fmt(cosTh, 4)}</span></div>
        <div class="metric-row"><span class="metric-label">Volumen V(R, a)</span><span class="metric-value">${fmt(V, 4)}</span></div>
      `;
    },
    insight: `
      <p>Am Kegelmantel gilt <code>z = a √(x²+y²) = a ρ</code>. Da <code>tan θ = ρ / z</code> ist, folgt sofort <code>tan θ̃ = 1/a</code> und damit <code>cos θ̃ = a / √(1+a²)</code>.</p>
      <p>Für <code>a = √3</code> erhält man <code>θ̃ = 30° = π/6</code> und <code>cos θ̃ = √3/2</code>.</p>
    `
  };

  // =========================================================================
  // 7. H4: Volumenintegral über Viertelkugel K
  // =========================================================================
  const ModSphH4 = {
    id: "sph_h4",
    navGroup: "Beispiel- & Hausaufgaben",
    code: "H4",
    badge: "Hausaufgabe 4",
    badgeClass: "hw",
    title: "Volumenintegral über Viertelkugel K",
    subtitle: "Skizze von K = {x²+y²+z² ≤ R², x ≥ 0, y ≥ 0} eingefärbt nach f(r) = xy.",
    layout: "single",
    defaults: { R: 2.0, shellFrac: 0.95 },
    presets: [
      { label: "Kontrollergebnis: R = 2 → F(2) = 64/15", patch: { R: 2.0 } },
      { label: "Einheitskugel: R = 1", patch: { R: 1.0 } }
    ],
    panels: [
      { id: "c3d", type: "3d", title: "3D-Viertelkugel K (x ≥ 0, y ≥ 0)", caption: "Ziehen zum Drehen. Farbe zeigt qualitativ die Größe von f(r) = x·y." }
    ],
    controls() {
      return [
        { type: "range", key: "R", label: "Radius R", min: 0.8, max: 3.0, step: 0.1 },
        { type: "range", key: "shellFrac", label: "Äußere Schale r / R", min: 0.3, max: 1.0, step: 0.05 }
      ];
    },
    render(canvases, s, state) {
      if (!state.sc3d) {
        state.sc3d = new Scene3D(canvases.c3d, { yaw: 0.76, pitch: 0.35, baseScale: 68, target: [0.3, 0.3, 0] });
        state.sc3d.onRender = () => this.render3D(state.sc3d, s);
      }
      this.render3D(state.sc3d, s);
    },
    render3D(sc, s) {
      sc.clear();
      const R = s.R * s.shellFrac;
      sc.baseScale = Math.min(78, 130 / s.R);
      sc.addAxes(s.R * 1.25, ["x", "y", "z"]);

      const maxF = Math.max(1e-4, 0.5 * R * R);

      // Curved quarter-sphere surface: theta in [0, pi], phi in [0, pi/2]
      sc.addParametricSurface(0, Math.PI, 20, 0, Math.PI / 2, 16, (th, ph) => {
        const x = R * Math.sin(th) * Math.cos(ph);
        const y = R * Math.sin(th) * Math.sin(ph);
        const z = R * Math.cos(th);
        return { p: [x, y, z], color: scalarColor((x * y) / maxF) };
      }, { alpha: 0.88 });

      // Two flat semicircular walls: phi=0 (y=0, x>=0) and phi=pi/2 (x=0, y>=0)
      sc.addParametricSurface(0, R, 10, 0, Math.PI, 18, (r, th) => ({
        p: [r * Math.sin(th), 0, r * Math.cos(th)],
        color: [148, 163, 184]
      }), { alpha: 0.72 });

      sc.addParametricSurface(0, R, 10, 0, Math.PI, 18, (r, th) => ({
        p: [0, r * Math.sin(th), r * Math.cos(th)],
        color: [148, 163, 184]
      }), { alpha: 0.72 });

      sc.render();
    },
    readout(s) {
      return `
        <div class="formula-line">K = {r ∈ ℝ³ | x² + y² + z² ≤ R²,  x, y ≥ 0}</div>
        <div class="formula-line">F(R) = ∫_K dV f(r),   f(r) = x·y</div>
        <div class="metric-row"><span class="metric-label">Radius R</span><span class="metric-value">${fmt(s.R, 2)}</span></div>
        <div class="metric-row"><span class="metric-label">Kontrolle R=2</span><span class="metric-value">F(2) = 64/15</span></div>
      `;
    },
    insight: `
      <p>Achte beim Skizzieren und bei den Kugelkoordinaten-Grenzen darauf, welche Vorzeichen für <code>x</code>, <code>y</code> und <code>z</code> erlaubt sind! Drehe die Viertelkugel, um ihre beiden ebenen Schnittwände (<code>x=0</code> und <code>y=0</code>) zu sehen.</p>
    `
  };

  // =========================================================================
  // 8. B5: Fläche einer Sphäre (Kartesisch vs. Kugelkoordinaten)
  // =========================================================================
  const ModSurfB5 = {
    id: "surf_b5",
    navGroup: "Beispiel- & Hausaufgaben",
    code: "B5",
    badge: "Beispielaufgabe 5",
    badgeClass: "",
    title: "Flächenintegral: Parametrisierung einer Sphäre",
    subtitle: "Vergleich zwischen (a) kartesischer Monge-Karte über D und (b) Kugelkoordinaten über U.",
    layout: "split",
    defaults: { param: "cart", u: 0.6, v: 0.5, R: 1.5 },
    presets: [
      { label: "Kartesisch nah am Äquator", patch: { param: "cart", u: 1.25, v: 0.45 } },
      { label: "Kugelkoordinaten am Pol", patch: { param: "sph", u: 0.25, v: 0.9 } },
      { label: "Kugelkoordinaten am Äquator", patch: { param: "sph", u: Math.PI / 2, v: 0.9 } }
    ],
    panels: [
      { id: "c2d", type: "2d", title: "Parameterbereich D / U (Klicken/Ziehen)", caption: "Gelbes Rechteck/Quadrat im Parameterraum wird auf das Flächenstück auf S abgebildet." },
      { id: "c3d", type: "3d", title: "3D-Sphäre S: Tangential- & Normalvektoren", caption: "Rot: ∂₁r | Blau: ∂₂r | Grün: ∂₁r × ∂₂r (Länge = Flächenverzerrung!)." }
    ],
    controls(s) {
      if (s.param === "cart") {
        const lim = s.R * 0.92;
        if (Math.hypot(s.u, s.v) > lim) {
          s.u = 0.4 * s.R;
          s.v = 0.3 * s.R;
        }
        return [
          { type: "seg", key: "param", label: "Parametrisierung", options: [{ v: "cart", t: "(a) Kartesisch" }, { v: "sph", t: "(b) Kugelkoord." }] },
          { type: "range", key: "x", alias: "u", label: "x ∈ (−R, R)", min: -lim, max: lim, step: 0.04 },
          { type: "range", key: "y", alias: "v", label: "y ∈ (−R, R)", min: -lim, max: lim, step: 0.04 }
        ];
      }
      if (s.u < 0.08 || s.u > Math.PI - 0.08) s.u = 1.0;
      if (s.v < 0 || s.v > 2 * Math.PI) s.v = 0.9;
      return [
        { type: "seg", key: "param", label: "Parametrisierung", options: [{ v: "cart", t: "(a) Kartesisch" }, { v: "sph", t: "(b) Kugelkoord." }] },
        { type: "range", key: "theta", alias: "u", label: "θ ∈ (0, π)", min: 0.1, max: Math.PI - 0.1, step: 0.04 },
        { type: "range", key: "phi", alias: "v", label: "φ ∈ (0, 2π)", min: 0.05, max: 2 * Math.PI - 0.05, step: 0.05 }
      ];
    },
    evalSurf(s, u, v) {
      const R = s.R;
      if (s.param === "cart") {
        const r2 = u * u + v * v;
        const z = Math.sqrt(Math.max(1e-4, R * R - r2));
        const du = [1, 0, -u / z];
        const dv = [0, 1, -v / z];
        return { p: [u, v, z], du, dv, cross: vecCross(du, dv) };
      }
      const p = [R * Math.sin(u) * Math.cos(v), R * Math.sin(u) * Math.sin(v), R * Math.cos(u)];
      const du = [R * Math.cos(u) * Math.cos(v), R * Math.cos(u) * Math.sin(v), -R * Math.sin(u)];
      const dv = [-R * Math.sin(u) * Math.sin(v), R * Math.sin(u) * Math.cos(v), 0];
      return { p, du, dv, cross: vecCross(du, dv) };
    },
    render(canvases, s, state, syncUI) {
      if (!state.p2d) {
        state.p2d = new Plot2D(canvases.c2d, { keepAspect: true });
        state.p2d.attachProbe((wx, wy) => {
          if (s.param === "cart") {
            const r = Math.hypot(wx, wy);
            const maxR = s.R * 0.92;
            if (r > maxR) {
              wx = (wx / r) * maxR;
              wy = (wy / r) * maxR;
            }
            s.u = Number(wx.toFixed(2));
            s.v = Number(wy.toFixed(2));
          } else {
            s.u = Number(Math.max(0.1, Math.min(Math.PI - 0.1, wx)).toFixed(2));
            s.v = Number(Math.max(0.05, Math.min(2 * Math.PI - 0.05, wy)).toFixed(2));
          }
          syncUI();
        });
      }
      if (!state.sc3d) {
        state.sc3d = new Scene3D(canvases.c3d, { yaw: 0.72, pitch: 0.42, baseScale: 84, target: [0, 0, 0.3] });
        state.sc3d.onRender = () => this.render3D(state.sc3d, s);
      }
      this.render2D(state.p2d, s);
      this.render3D(state.sc3d, s);
    },
    render2D(p2d, s) {
      if (s.param === "cart") {
        const lim = s.R * 1.25;
        p2d.keepAspect = true;
        p2d.setBounds(-lim, lim, -lim, lim);
        const m = p2d.begin();
        p2d.drawGridAndAxes(m, { xStep: 0.5, yStep: 0.5, xLabel: "x", yLabel: "y" });
        const { ctx } = m;
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
          const t = (i / 100) * Math.PI * 2;
          const [px, py] = p2d.toPx(s.R * Math.cos(t), s.R * Math.sin(t), m);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(59, 130, 246, 0.14)";
        ctx.fill();
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Small patch
        const d = 0.14;
        const p0 = p2d.toPx(s.u - d, s.v + d, m);
        const p1 = p2d.toPx(s.u + d, s.v - d, m);
        ctx.fillStyle = "rgba(245, 158, 11, 0.45)";
        ctx.fillRect(p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]);
        ctx.strokeStyle = "#d97706";
        ctx.strokeRect(p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]);
        ctx.restore();
        p2d.drawPoint(m, [s.u, s.v], { color: "#0f172a", label: `(${fmt(s.u, 2)}, ${fmt(s.v, 2)})` });
      } else {
        p2d.keepAspect = false;
        p2d.setBounds(-0.2, Math.PI + 0.25, -0.3, 2 * Math.PI + 0.35);
        const m = p2d.begin();
        p2d.drawGridAndAxes(m, { xStep: 1, yStep: 1, xLabel: "θ", yLabel: "φ" });
        const { ctx } = m;
        const a = p2d.toPx(0, 2 * Math.PI, m);
        const b = p2d.toPx(Math.PI, 0, m);
        ctx.save();
        ctx.fillStyle = "rgba(59, 130, 246, 0.14)";
        ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);

        const du = 0.16, dv = 0.24;
        const p0 = p2d.toPx(s.u - du, s.v + dv, m);
        const p1 = p2d.toPx(s.u + du, s.v - dv, m);
        ctx.fillStyle = "rgba(245, 158, 11, 0.45)";
        ctx.fillRect(p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]);
        ctx.strokeStyle = "#d97706";
        ctx.strokeRect(p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]);
        ctx.restore();
        p2d.drawPoint(m, [s.u, s.v], { color: "#0f172a", label: `(θ=${fmt(s.u, 2)}, φ=${fmt(s.v, 2)})` });
      }
    },
    render3D(sc, s) {
      sc.clear();
      const R = s.R;
      sc.target = s.param === "cart" ? [0, 0, R * 0.4] : [0, 0, 0];
      sc.addAxes(R * 1.25, ["x", "y", "z"]);

      const thMax = s.param === "cart" ? Math.PI / 2 : Math.PI;
      sc.addParametricSurface(0, thMax, 18, 0, Math.PI * 2, 32, (th, ph) => ({
        p: [R * Math.sin(th) * Math.cos(ph), R * Math.sin(th) * Math.sin(ph), R * Math.cos(th)],
        color: [96, 165, 250]
      }), { alpha: 0.45 });

      const ev = this.evalSurf(s, s.u, s.v);
      // Mapped patch
      const du = s.param === "cart" ? 0.14 : 0.16;
      const dv = s.param === "cart" ? 0.14 : 0.24;
      const corners = [
        this.evalSurf(s, s.u - du, s.v - dv).p,
        this.evalSurf(s, s.u + du, s.v - dv).p,
        this.evalSurf(s, s.u + du, s.v + dv).p,
        this.evalSurf(s, s.u - du, s.v + dv).p
      ];
      sc.addPolygon(corners, { color: [245, 158, 11], alpha: 0.9, zBias: 0.05 });

      const vScale = 0.45;
      sc.addArrow(ev.p, vecAdd(ev.p, vecScale(ev.du, vScale)), { color: "#dc2626", label: s.param === "cart" ? "∂_x r" : "∂_θ r" });
      sc.addArrow(ev.p, vecAdd(ev.p, vecScale(ev.dv, vScale)), { color: "#2563eb", label: s.param === "cart" ? "∂_y r" : "∂_φ r" });
      sc.addArrow(ev.p, vecAdd(ev.p, vecScale(ev.cross, vScale * 0.6)), { color: "#059669", label: "∂₁r × ∂₂r" });
      sc.addPoint(ev.p, { color: "#0f172a" });
      sc.render();
    },
    readout(s) {
      const ev = this.evalSurf(s, s.u, s.v);
      const norm = vecLen(ev.cross);
      const A = 4 * Math.PI * s.R * s.R;
      if (s.param === "cart") {
        return `
          <div class="formula-line">‖∂_x r × ∂_y r‖ = R / √(R² − x² − y²)</div>
          <div class="metric-row"><span class="metric-label">Aktueller Faktor ‖∂_x r × ∂_y r‖</span><span class="metric-value">${fmt(norm, 3)}</span></div>
          <div class="metric-row"><span class="metric-label">Gesamtfläche A_S = 4πR²</span><span class="metric-value">${fmt(A, 3)}</span></div>
        `;
      }
      return `
        <div class="formula-line">‖∂_θ r × ∂_φ r‖ = R² sin θ</div>
        <div class="metric-row"><span class="metric-label">Aktueller Faktor R² sin θ</span><span class="metric-value">${fmt(norm, 3)}</span></div>
        <div class="metric-row"><span class="metric-label">Gesamtfläche A_S = 4πR²</span><span class="metric-value">${fmt(A, 3)}</span></div>
      `;
    },
    insight: `
      <p><strong>Kartesisch (a):</strong> Nähert sich der Punkt dem Äquator <code>x² + y² → R²</code>, werden die Tangentialvektoren extrem steil und das Flächenelement <code>R / √(R² − x² − y²)</code> divergiert (integrable Singularität)!</p>
      <p><strong>Kugelkoordinaten (b):</strong> Am Nord-/Südpol (<code>θ → 0, π</code>) schrumpft <code>∂_φ r</code> auf Null, daher geht <code>‖∂_θ r × ∂_φ r‖ = R² sin θ → 0</code>.</p>
    `
  };

  // =========================================================================
  // 9. H5: Fläche der schrägen Seite einer rechteckigen Pyramide
  // =========================================================================
  const ModSurfH5 = {
    id: "surf_h5",
    navGroup: "Beispiel- & Hausaufgaben",
    code: "H5",
    badge: "Hausaufgabe 5",
    badgeClass: "hw",
    title: "Schräge Seite einer rechteckigen Pyramide",
    subtitle: "Geometrie der schrägen Seitenfläche F_Schräge und ihrer Projektion U in der xy-Ebene.",
    layout: "split",
    defaults: { a: 2.0, x0: 0.16, y0: 0.11 },
    presets: [
      { label: "Kontrollwert: a = 2", patch: { a: 2.0, x0: 0.16, y0: 0.11 } },
      { label: "Flach: a = 0.5", patch: { a: 0.5, x0: 0.16, y0: 0.11 } }
    ],
    panels: [
      { id: "c2d", type: "2d", title: "Projektion U in der xy-Ebene (Klicken)", caption: "Grundfläche unter der schrägen Seitenfläche mit Achsenabschnitten x = 1/2 und y = 1/3." },
      { id: "c3d", type: "3d", title: "3D-Pyramide & schräge Fläche F", caption: "Ziehen zum Drehen. Gestrichelte Linie verbindet (x₀, y₀, 0) ∈ U mit dem Punkt auf F_Schräge." }
    ],
    controls() {
      return [
        { type: "range", key: "a", label: "Höhe a", min: 0.3, max: 3.0, step: 0.05 },
        { type: "range", key: "x0", label: "Punkt x₀", min: 0.02, max: 0.46, step: 0.01 },
        { type: "range", key: "y0", label: "Punkt y₀", min: 0.02, max: 0.31, step: 0.01 }
      ];
    },
    clampInU(s) {
      s.x0 = Math.max(0.01, Math.min(0.48, s.x0));
      const maxY = (1 - 2 * s.x0) / 3;
      if (s.y0 > maxY) s.y0 = Math.max(0.01, maxY - 0.01);
      s.y0 = Math.max(0.01, s.y0);
    },
    render(canvases, s, state, syncUI) {
      this.clampInU(s);
      if (!state.p2d) {
        state.p2d = new Plot2D(canvases.c2d, { xMin: -0.06, xMax: 0.62, yMin: -0.05, yMax: 0.45 });
        state.p2d.attachProbe((wx, wy) => {
          s.x0 = Number(wx.toFixed(2));
          s.y0 = Number(wy.toFixed(2));
          this.clampInU(s);
          syncUI();
        });
      }
      if (!state.sc3d) {
        state.sc3d = new Scene3D(canvases.c3d, { yaw: 0.85, pitch: 0.38, baseScale: 135, target: [0.15, 0.12, 0.7] });
        state.sc3d.onRender = () => this.render3D(state.sc3d, s);
      }
      this.render2D(state.p2d, s);
      this.render3D(state.sc3d, s);
    },
    render2D(p2d, s) {
      const m = p2d.begin();
      p2d.drawGridAndAxes(m, { xStep: 0.1, yStep: 0.1, xLabel: "x", yLabel: "y" });
      const { ctx } = m;
      const p0 = p2d.toPx(0, 0, m);
      const px = p2d.toPx(0.5, 0, m);
      const py = p2d.toPx(0, 1 / 3, m);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(px[0], px[1]);
      ctx.lineTo(py[0], py[1]);
      ctx.closePath();
      ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
      ctx.fill();
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
      p2d.drawPoint(m, [s.x0, s.y0], { color: "#dc2626", label: `(${fmt(s.x0, 2)}, ${fmt(s.y0, 2)})` });
    },
    render3D(sc, s) {
      sc.clear();
      const a = s.a;
      sc.target = [0.16, 0.11, a * 0.42];
      sc.baseScale = Math.min(200, 240 / Math.max(1.2, a));
      sc.addAxes(Math.max(0.75, a * 1.15), ["x", "y", "z"]);

      const O = [0, 0, 0];
      const A = [0.5, 0, 0];
      const B = [0, 1 / 3, 0];
      const C = [0, 0, a];

      // Base and two vertical walls
      sc.addPolygon([O, A, B], { color: [16, 185, 129], alpha: 0.25 });
      sc.addPolygon([O, A, C], { color: [148, 163, 184], alpha: 0.4 });
      sc.addPolygon([O, B, C], { color: [148, 163, 184], alpha: 0.4 });
      // Slanted face
      sc.addPolygon([A, B, C], { color: [59, 130, 246], alpha: 0.72, zBias: 0.02 });

      const z0 = a * (1 - 2 * s.x0 - 3 * s.y0);
      const P = [s.x0, s.y0, z0];

      sc.addLine([s.x0, s.y0, 0], P, { color: "#dc2626", dash: [3, 3], lineWidth: 2 });
      sc.addPoint([s.x0, s.y0, 0], { color: "#059669", label: "U" });
      sc.addPoint(P, { color: "#dc2626", label: "r(x,y)" });
      sc.render();
    },
    readout(s) {
      return `
        <div class="formula-line">A_Schräge = ∫_U dx dy ‖∂_x r × ∂_y r‖</div>
        <div class="metric-row"><span class="metric-label">Achsenabschnitte</span><span class="metric-value">x=1/2, y=1/3, z=${fmt(s.a, 2)}</span></div>
        <div class="metric-row"><span class="metric-label">Punkt in U: (x₀, y₀)</span><span class="metric-value">(${fmt(s.x0, 2)}, ${fmt(s.y0, 2)})</span></div>
        <div class="metric-row"><span class="metric-label">Kontrolle a=2</span><span class="metric-value">A_Schräge = √53 / 12</span></div>
      `;
    },
    insight: `
      <p>Die schräge Dreiecksfläche verbindet die Achsenabschnitte <code>(1/2, 0, 0)</code>, <code>(0, 1/3, 0)</code> und <code>(0, 0, a)</code>.</p>
      <p>Klicke links in die Grundfläche <code>U</code>, um zu sehen, wie jeder Punkt <code>(x, y) ∈ U</code> eindeutig einem Punkt auf der schrägen Fläche zugeordnet wird.</p>
    `
  };

  global.Blatt05Integrals = [
    ModGauss,
    ModGenPolar2D,
    ModGenPolar3D,
    ModCylB3,
    ModCylH3,
    ModSphB4,
    ModSphH4,
    ModSurfB5,
    ModSurfH5
  ];
})(window);
