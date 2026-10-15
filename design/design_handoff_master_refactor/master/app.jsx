/* global React, ReactDOM */
// Main app for Nomad Master refactor

const { useState, useEffect, useMemo, useCallback } = React;
const { TOBACCOS, MIXES, RAILS } = window.NomadData;
const { Button, IconButton, Lucide, Tag, Toggle, SearchInput } = window.NomadUI;
const { MixesList, TobaccosList, TobaccoEditor, RailsList, RailEditor } = window.NomadScreens;
const AccessView = window.NomadAccessView;
const MixBuilder = window.NomadMixBuilder;
const CommandPalette = window.NomadCmdK;
// tweaks-panel.jsx puts these directly on window
const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle } = window;

const NAV = [
  { id: "dashboard", label: "Дашборд", icon: "gauge" },
  { id: "tobaccos", label: "Табаки", icon: "boxes" },
  { id: "mixes", label: "Миксы", icon: "layers" },
  { id: "rails", label: "Рейлы", icon: "rail" },
  { id: "access", label: "Доступ", icon: "shield" },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "cozy",
  "builder_layout": "split",
  "proportions_ui": "numeric"
}/*EDITMODE-END*/;

function TopBar({ current, onNav, onOpenCmd }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand__mark">N</div>
        <div className="brand__name">Nomad <em>Master</em></div>
      </div>
      <nav className="nav">
        {NAV.map((n) => (
          <button
            key={n.id}
            className="nav__item"
            data-active={current === n.id}
            onClick={() => onNav(n.id)}
          >
            <Lucide name={n.icon} size={14} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="topbar__spacer" />
      <div className="topbar__right">
        <button className="status-pill" onClick={onOpenCmd}>
          <Lucide name="search" size={12} />
          <span>Найти или сделать</span>
          <span className="kbd">⌘K</span>
        </button>
        <div className="status-pill">
          <span className="status-pill__dot" />
          <span>Данные актуальны</span>
        </div>
        <div className="user-chip">
          <span className="user-chip__name">Admin</span>
          <div className="user-chip__avatar">A</div>
        </div>
      </div>
    </header>
  );
}

// ====== Lightweight dashboard placeholder (not the focus of this refactor) ======
function DashboardPlaceholder({ tobaccos, mixes, rails }) {
  const stats = useMemo(() => ({
    tobaccos: tobaccos.length,
    inStock: tobaccos.filter((t) => t.inStock).length,
    mixes: mixes.length,
    visibleMixes: mixes.filter((m) => m.guestVisible && m.available).length,
    blocked: mixes.filter((m) => !m.available).length,
    activeRails: rails.filter((r) => r.active).length,
  }), [tobaccos, mixes, rails]);

  const topMixes = useMemo(() => [...mixes].sort((a, b) => b.popularity - a.popularity).slice(0, 6), [mixes]);
  const blockedMixes = useMemo(() => mixes.filter((m) => !m.available), [mixes]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Окно: 18 мая – 24 мая</div>
          <h1 className="page-title">Дашборд смены</h1>
          <div className="page-subtitle">Что важно знать команде до открытия зала.</div>
        </div>
      </div>

      {/* Hero stats */}
      <div className="stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="stat">
          <div className="stat__label">В наличии</div>
          <div className="stat__value">{stats.inStock}</div>
          <div className="stat__sub">из {stats.tobaccos} табаков</div>
        </div>
        <div className="stat">
          <div className="stat__label">Виден гостю</div>
          <div className="stat__value" style={{ color: "var(--success)" }}>{stats.visibleMixes}</div>
          <div className="stat__sub">миксов на витрине</div>
        </div>
        <div className="stat">
          <div className="stat__label">Заблокировано</div>
          <div className="stat__value" style={{ color: "var(--warning)" }}>{stats.blocked}</div>
          <div className="stat__sub">режет наличие</div>
        </div>
        <div className="stat">
          <div className="stat__label">Активных рейлов</div>
          <div className="stat__value">{stats.activeRails}</div>
          <div className="stat__sub">в гостевой витрине</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="eyebrow">Спрос гостей</div>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 22, margin: "2px 0 12px" }}>Топ миксов недели</h3>
          <div className="col gap-2">
            {topMixes.map((m, i) => (
              <div key={m.id} className="row" style={{ padding: "8px 0", borderBottom: i < topMixes.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                <span className="mono" style={{ width: 28, color: "var(--text-faint)", fontSize: 11 }}>0{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{m.name}</div>
                  <div className="cell-meta cell-truncate">{m.description}</div>
                </div>
                <div className="row gap-3 mono" style={{ fontSize: 12 }}>
                  <span><Lucide name="flame" size={11} /> {m.popularity}</span>
                  <span><Lucide name="star" size={11} /> {m.avgRating.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div className="eyebrow">Внимание</div>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 22, margin: "2px 0 12px" }}>Сигналы для команды</h3>
          {blockedMixes.length === 0 ? (
            <div className="empty">Нет блокировок. Витрина чистая.</div>
          ) : (
            <div className="col gap-2">
              {blockedMixes.map((m) => (
                <div key={m.id} className="row" style={{ padding: "10px 12px", borderRadius: "var(--r-md)", background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
                  <Lucide name="warning" size={14} className="lucide" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{m.name}</div>
                    <div className="cell-meta cell-truncate">блокирован отсутствием табака в наличии</div>
                  </div>
                  <Button size="sm">Открыть</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ====== Access placeholder ======
function AccessPlaceholder() {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Доступ</div>
          <h1 className="page-title">Daily code и сотрудники</h1>
          <div className="page-subtitle">Управление кодом гостя, операторами и staff-учётками.</div>
        </div>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <div className="empty">
          <div className="empty__title">Раздел вне текущего рефакторинга</div>
          <div>Структура остаётся прежней — см. экран «Доступ» в исходном продукте.</div>
        </div>
      </div>
    </div>
  );
}

// ====== App root ======
function App() {
  // tweaks (using TweaksPanel hook if available)
  const tweakState = useTweaks ? useTweaks(TWEAK_DEFAULTS) : [TWEAK_DEFAULTS, () => {}];
  const t = tweakState[0];
  const setTweak = tweakState[1];

  // Apply density to root via data attribute
  useEffect(() => {
    document.documentElement.dataset.density = t.density === "default" ? "" : t.density;
  }, [t.density]);

  const [route, setRoute] = useState("mixes"); // default to mixes since it's the most relevant for the refactor

  // Domain state (mutable copies)
  const [tobaccos, setTobaccos] = useState(TOBACCOS);
  const [mixes, setMixes] = useState(MIXES);
  const [rails, setRails] = useState(RAILS);

  // Lookup maps
  const tobaccoMap = useMemo(() => {
    const map = new Map();
    tobaccos.forEach((t) => map.set(t.id, t));
    return map;
  }, [tobaccos]);
  const mixesMap = useMemo(() => {
    const map = new Map();
    mixes.forEach((m) => map.set(m.id, m));
    return map;
  }, [mixes]);
  const railsMap = useMemo(() => {
    const map = new Map();
    rails.forEach((r) => map.set(r.id, r));
    return map;
  }, [rails]);

  // Editor states
  const [tobaccoEdit, setTobaccoEdit] = useState({ open: false, data: null });
  const [railEdit, setRailEdit] = useState({ open: false, data: null });
  const [mixBuilder, setMixBuilder] = useState({ open: false, mix: null });

  // Cmd palette
  const [cmdOpen, setCmdOpen] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCmdOpen((v) => !v);
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Mix actions
  const startCreateMix = () => setMixBuilder({ open: true, mix: null });
  const openMixForEdit = (m) => setMixBuilder({ open: true, mix: m });
  const saveMix = (draft) => {
    setMixes((curr) => {
      // Compute available based on stock
      const available = draft.components.every((c) => tobaccoMap.get(c.tobaccoId)?.inStock);
      // Aggregate profiles + flavors from chosen tobaccos
      const profilesSet = new Set();
      const flavorsSet = new Set();
      draft.components.forEach((c) => {
        const t = tobaccoMap.get(c.tobaccoId);
        if (t) {
          (t.flavorProfiles || []).forEach((p) => profilesSet.add(p));
          (t.flavors || []).forEach((f) => flavorsSet.add(f));
        }
      });
      const payload = {
        ...((draft.id && curr.find((x) => x.id === draft.id)) || {
          id: `m-${Date.now()}`,
          railIds: [], avgRating: 0, ratingsCount: 0, popularity: 0,
        }),
        name: draft.name,
        description: draft.description,
        components: draft.components.map((c) => ({ tobaccoId: c.tobaccoId, proportion: c.proportion })),
        flavorProfiles: Array.from(profilesSet),
        flavors: Array.from(flavorsSet),
        guestVisible: draft.guestVisible,
        available,
      };
      if (draft.id) {
        return curr.map((m) => (m.id === draft.id ? { ...m, ...payload } : m));
      }
      return [...curr, payload];
    });
    setMixBuilder({ open: false, mix: null });
  };
  const toggleMixVisible = (id) => {
    setMixes((curr) => curr.map((m) => (m.id === id ? { ...m, guestVisible: !m.guestVisible } : m)));
  };
  const duplicateMix = (m) => {
    setMixBuilder({
      open: true,
      mix: { ...m, id: null, name: `${m.name} · копия`, components: m.components.map((c) => ({ ...c })) },
    });
  };

  // Tobacco actions
  const startCreateTobacco = () => setTobaccoEdit({ open: true, data: null });
  const openTobaccoForEdit = (t) => setTobaccoEdit({ open: true, data: t });
  const saveTobacco = (draft) => {
    setTobaccos((curr) => {
      const payload = {
        ...((draft.id && curr.find((x) => x.id === draft.id)) || {
          id: `t-${Date.now()}`,
          brandShort: (draft.manufacturer || "??").slice(0, 2).toUpperCase(),
          usageCount: 0,
          updatedAt: new Date().toISOString(),
        }),
        name: draft.name,
        manufacturer: draft.manufacturer,
        lineName: draft.lineName,
        flavorProfiles: draft.flavorProfiles,
        flavors: draft.flavors.split(",").map((s) => s.trim()).filter(Boolean),
        strength: draft.strength,
        inStock: draft.inStock,
        description: draft.description,
      };
      if (draft.id) {
        return curr.map((t) => (t.id === draft.id ? { ...t, ...payload } : t));
      }
      return [...curr, payload];
    });
    setTobaccoEdit({ open: false, data: null });
  };
  const toggleStock = (id) => {
    setTobaccos((curr) => curr.map((t) => (t.id === id ? { ...t, inStock: !t.inStock } : t)));
    // Recompute mix availability
    setMixes((curr) => curr.map((m) => {
      const allInStock = m.components.every((c) => {
        const t = tobaccos.find((x) => x.id === c.tobaccoId);
        return t && (t.id === id ? !t.inStock : t.inStock);
      });
      return { ...m, available: allInStock };
    }));
  };

  // Rail actions
  const openRailForEdit = (r) => setRailEdit({ open: true, data: r });
  const saveRail = (draft) => {
    setRails((curr) => {
      if (draft.id) return curr.map((r) => (r.id === draft.id ? { ...r, ...draft } : r));
      return [...curr, { ...draft, id: `r-${Date.now()}`, editable: true, type: "prepared" }];
    });
    setRailEdit({ open: false, data: null });
  };
  const startCreateRail = () => setRailEdit({ open: true, data: null });

  return (
    <div className="app">
      <TopBar current={route} onNav={setRoute} onOpenCmd={() => setCmdOpen(true)} />
      <main className="page">
        {route === "dashboard" && (
          <DashboardPlaceholder tobaccos={tobaccos} mixes={mixes} rails={rails} />
        )}
        {route === "tobaccos" && (
          <TobaccosList
            tobaccos={tobaccos}
            onCreate={startCreateTobacco}
            onEdit={openTobaccoForEdit}
            onToggleStock={toggleStock}
          />
        )}
        {route === "mixes" && (
          <MixesList
            mixes={mixes}
            tobaccoMap={tobaccoMap}
            railsMap={railsMap}
            onOpenMix={openMixForEdit}
            onCreateMix={startCreateMix}
            onToggleVisible={toggleMixVisible}
            onDuplicate={duplicateMix}
          />
        )}
        {route === "rails" && (
          <RailsList
            rails={rails}
            mixesMap={mixesMap}
            onEdit={openRailForEdit}
            onCreate={startCreateRail}
          />
        )}
        {route === "access" && <AccessView />}
      </main>

      {/* Editors */}
      <TobaccoEditor
        open={tobaccoEdit.open}
        tobacco={tobaccoEdit.data}
        onClose={() => setTobaccoEdit({ open: false, data: null })}
        onSave={saveTobacco}
      />

      <RailEditor
        open={railEdit.open}
        rail={railEdit.data}
        allMixes={mixes}
        mixesMap={mixesMap}
        onClose={() => setRailEdit({ open: false, data: null })}
        onSave={saveRail}
      />

      {/* Mix builder (full-page) */}
      {mixBuilder.open && (
        <MixBuilder
          mix={mixBuilder.mix}
          allMixes={mixes}
          tweaks={t}
          onCancel={() => setMixBuilder({ open: false, mix: null })}
          onSave={saveMix}
        />
      )}

      {/* Command palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        mixes={mixes}
        tobaccos={tobaccos}
        rails={rails}
        onGoto={(id) => setRoute(id)}
        onOpenMix={openMixForEdit}
        onCreateMix={startCreateMix}
        onCreateTobacco={startCreateTobacco}
        onOpenRail={openRailForEdit}
      />

      {/* Tweaks Panel */}
      {TweaksPanel && (
        <TweaksPanel title="Tweaks">
          <TweakSection label="Плотность">
            <TweakRadio
              label="Плотность списков"
              value={t.density}
              onChange={(v) => setTweak("density", v)}
              options={[
                { value: "compact", label: "Compact" },
                { value: "default", label: "Default" },
                { value: "cozy", label: "Cozy" },
              ]}
            />
          </TweakSection>
          <TweakSection label="Mix builder">
            <TweakRadio
              label="Раскладка"
              value={t.builder_layout}
              onChange={(v) => setTweak("builder_layout", v)}
              options={[
                { value: "split", label: "Двух-панельный" },
                { value: "single", label: "Одно-панельный" },
              ]}
            />
            <TweakRadio
              label="Пропорции"
              value={t.proportions_ui}
              onChange={(v) => setTweak("proportions_ui", v)}
              options={[
                { value: "numeric", label: "Только цифры" },
                { value: "slider", label: "Цифры + слайдер" },
              ]}
            />
          </TweakSection>
        </TweaksPanel>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
