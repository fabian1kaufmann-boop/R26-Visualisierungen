(function (global) {
  "use strict";

  const ALL_MODULES = [...global.Blatt05Integrals, ...global.Blatt05Fields];
  let activeMod = ALL_MODULES[0];
  let activeParams = {};
  let activeState = {};
  let activeCanvases = {};

  const navEl = document.getElementById("problem-nav");
  const badgeEl = document.getElementById("problem-badge");
  const titleEl = document.getElementById("problem-title");
  const subtitleEl = document.getElementById("problem-subtitle");
  const presetsEl = document.getElementById("preset-buttons");
  const stageEl = document.getElementById("canvas-stage");
  const controlsEl = document.getElementById("controls-container");
  const readoutEl = document.getElementById("readout-container");
  const insightEl = document.getElementById("insight-container");

  function buildNav() {
    navEl.innerHTML = "";
    const groups = new Map();
    for (const mod of ALL_MODULES) {
      if (!groups.has(mod.navGroup)) groups.set(mod.navGroup, []);
      groups.get(mod.navGroup).push(mod);
    }
    for (const [grp, mods] of groups.entries()) {
      const lbl = document.createElement("div");
      lbl.className = "nav-section-label";
      lbl.textContent = grp;
      navEl.appendChild(lbl);

      for (const mod of mods) {
        const btn = document.createElement("button");
        btn.className = "nav-btn" + (mod.id === activeMod.id ? " active" : "");
        btn.dataset.modId = mod.id;
        btn.innerHTML = `<span class="nav-code">${mod.code}</span><span>${mod.title}</span>`;
        btn.addEventListener("click", () => selectModule(mod.id));
        navEl.appendChild(btn);
      }
    }
  }

  function buildStage() {
    stageEl.innerHTML = "";
    stageEl.className = "canvas-stage" + (activeMod.layout === "split" ? " split" : "");
    activeCanvases = {};

    for (const p of activeMod.panels) {
      const card = document.createElement("div");
      card.className = "panel-card";

      const head = document.createElement("div");
      head.className = "panel-title-row";
      const t = document.createElement("div");
      t.className = "panel-title";
      t.textContent = p.title;
      head.appendChild(t);

      if (p.type === "3d") {
        const pills = document.createElement("div");
        pills.className = "view-pills";
        const views = [
          { label: "3D", yaw: 0.72, pitch: 0.44 },
          { label: "Oben", yaw: 0.0, pitch: 1.46 },
          { label: "Seite", yaw: 0.0, pitch: 0.05 }
        ];
        for (const v of views) {
          const b = document.createElement("button");
          b.className = "view-pill";
          b.textContent = v.label;
          b.addEventListener("click", () => {
            const sc = activeState.sc3d;
            if (sc) sc.setView(v.yaw, v.pitch);
          });
          pills.appendChild(b);
        }
        head.appendChild(pills);
      }

      const canvas = document.createElement("canvas");
      canvas.className = "viz-canvas";
      canvas.id = `canvas-${p.id}`;
      activeCanvases[p.id] = canvas;

      const cap = document.createElement("div");
      cap.className = "panel-caption";
      cap.textContent = p.caption;

      card.appendChild(head);
      card.appendChild(canvas);
      card.appendChild(cap);
      stageEl.appendChild(card);
    }
  }

  function buildPresets() {
    presetsEl.innerHTML = "";
    for (const pr of activeMod.presets || []) {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = pr.label;
      btn.addEventListener("click", () => {
        Object.assign(activeParams, pr.patch);
        buildControls();
        renderActive();
      });
      presetsEl.appendChild(btn);
    }
  }

  function buildControls() {
    controlsEl.innerHTML = "";
    const defs = activeMod.controls(activeParams);
    for (const d of defs) {
      const key = d.alias || d.key;
      const wrap = document.createElement("div");
      wrap.className = "control-item";

      if (d.type === "range") {
        const head = document.createElement("div");
        head.className = "control-head";
        const lbl = document.createElement("span");
        lbl.textContent = d.label;
        const val = document.createElement("span");
        val.className = "control-val";
        val.id = `val-${key}`;
        val.textContent = Number(activeParams[key]).toFixed(2);
        head.appendChild(lbl);
        head.appendChild(val);

        const inp = document.createElement("input");
        inp.type = "range";
        inp.min = d.min;
        inp.max = d.max;
        inp.step = d.step;
        inp.value = activeParams[key];
        inp.id = `ctrl-${key}`;
        inp.addEventListener("input", () => {
          activeParams[key] = parseFloat(inp.value);
          val.textContent = Number(activeParams[key]).toFixed(2);
          renderActive();
          syncControlsFromParams();
        });
        wrap.appendChild(head);
        wrap.appendChild(inp);
      } else if (d.type === "seg") {
        const head = document.createElement("div");
        head.className = "control-head";
        head.textContent = d.label;
        const grp = document.createElement("div");
        grp.className = "seg-group";
        for (const opt of d.options) {
          const b = document.createElement("button");
          b.className = "seg-btn" + (activeParams[key] === opt.v ? " active" : "");
          b.textContent = opt.t;
          b.addEventListener("click", () => {
            activeParams[key] = opt.v;
            buildControls();
            renderActive();
          });
          grp.appendChild(b);
        }
        wrap.appendChild(head);
        wrap.appendChild(grp);
      } else if (d.type === "check") {
        const lbl = document.createElement("label");
        lbl.className = "check-row";
        const inp = document.createElement("input");
        inp.type = "checkbox";
        inp.checked = Boolean(activeParams[key]);
        inp.addEventListener("change", () => {
          activeParams[key] = inp.checked;
          buildControls();
          renderActive();
        });
        const span = document.createElement("span");
        span.textContent = d.label;
        lbl.appendChild(inp);
        lbl.appendChild(span);
        wrap.appendChild(lbl);
      }
      controlsEl.appendChild(wrap);
    }
  }

  function syncControlsFromParams() {
    const defs = activeMod.controls(activeParams);
    for (const d of defs) {
      if (d.type !== "range") continue;
      const key = d.alias || d.key;
      const inp = document.getElementById(`ctrl-${key}`);
      const val = document.getElementById(`val-${key}`);
      if (inp) {
        inp.min = d.min;
        inp.max = d.max;
        inp.value = activeParams[key];
      }
      if (val) val.textContent = Number(activeParams[key]).toFixed(2);
    }
  }

  function renderActive() {
    activeMod.render(activeCanvases, activeParams, activeState, () => {
      syncControlsFromParams();
      renderActive();
    });
    readoutEl.innerHTML = activeMod.readout(activeParams);
  }

  function selectModule(id) {
    const found = ALL_MODULES.find((m) => m.id === id);
    if (!found) return;
    activeMod = found;
    activeParams = { ...found.defaults };
    activeState = {};

    for (const btn of navEl.querySelectorAll(".nav-btn")) {
      btn.classList.toggle("active", btn.dataset.modId === id);
    }

    badgeEl.textContent = activeMod.badge;
    badgeEl.className = "badge" + (activeMod.badgeClass ? " " + activeMod.badgeClass : "");
    titleEl.textContent = activeMod.title;
    subtitleEl.textContent = activeMod.subtitle;
    insightEl.innerHTML = activeMod.insight;

    buildPresets();
    buildStage();
    buildControls();
    renderActive();
  }

  window.addEventListener("resize", () => {
    renderActive();
  });

  buildNav();
  selectModule(ALL_MODULES[0].id);
})(window);
