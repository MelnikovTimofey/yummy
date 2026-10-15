/* global React */
// MIX BUILDER — the key screen of the refactor
// Two-panel layout:  Library (left) ←→ Composition canvas (right)

const { useState, useMemo, useRef, useEffect, useCallback } = React;
const { TOBACCOS, MIXES, colorForTobacco } = window.NomadData;
const { Button, IconButton, Lucide, Tag, Chip, Toggle, SearchInput, BrandPill } = window.NomadUI;

// --------- Helpers ---------
const STRENGTH_LABEL = { light: "Лёгкий", medium: "Средний", strong: "Крепкий" };

function uniq(arr) {
  return Array.from(new Set(arr));
}

function rebalanceTo100(components) {
  if (!components.length) return components;
  const eq = Math.floor(100 / components.length);
  const rem = 100 - eq * components.length;
  return components.map((c, i) => ({ ...c, proportion: eq + (i < rem ? 1 : 0) }));
}

// Suggest tobaccos based on existing components' flavor profiles
function getCoOccurrenceSuggestions(currentIds, allMixes, allTobaccos) {
  if (!currentIds.length) return [];
  const scoreById = new Map();
  const reasonById = new Map();
  allMixes.forEach((m) => {
    const cmpIds = m.components.map((c) => c.tobaccoId);
    const overlap = cmpIds.filter((id) => currentIds.includes(id));
    if (overlap.length === 0) return;
    cmpIds.forEach((id) => {
      if (currentIds.includes(id)) return;
      const sc = (scoreById.get(id) || 0) + overlap.length;
      scoreById.set(id, sc);
      if (!reasonById.has(id)) reasonById.set(id, m.name);
    });
  });
  return Array.from(scoreById.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id]) => {
      const t = allTobaccos.find((x) => x.id === id);
      if (!t) return null;
      return { tobacco: t, reason: `Часто берут с ${reasonById.get(id)}` };
    })
    .filter(Boolean);
}

// --------- Proportion bar with interactive handles ---------
function ProportionBar({ components, onResize }) {
  const barRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const total = components.reduce((s, c) => s + c.proportion, 0) || 1;

  const handlePointerDown = (idx) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(idx);
  };

  useEffect(() => {
    if (dragging == null) return;
    const move = (e) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const pct = Math.round((x / rect.width) * 100);
      // Compute cumulative position before this handle
      const before = components.slice(0, dragging).reduce((s, c) => s + c.proportion, 0);
      const next = pct - before;
      const after = components.slice(dragging + 1).reduce((s, c) => s + c.proportion, 0);
      if (next < 1 || after < components.length - dragging - 1) return;
      const taken = next;
      const remaining = 100 - before - taken;
      // Distribute remaining among rest proportionally
      const rest = components.slice(dragging + 1);
      const restTotal = rest.reduce((s, c) => s + c.proportion, 0) || 1;
      const newComponents = components.map((c, i) => {
        if (i < dragging) return c;
        if (i === dragging) return { ...c, proportion: taken };
        const share = c.proportion / restTotal;
        return { ...c, proportion: Math.max(1, Math.round(remaining * share)) };
      });
      // Normalize to 100
      const sum = newComponents.reduce((s, c) => s + c.proportion, 0);
      const diff = 100 - sum;
      if (diff !== 0) newComponents[newComponents.length - 1].proportion += diff;
      onResize(newComponents);
    };
    const up = () => setDragging(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, components, onResize]);

  if (!components.length) {
    return (
      <div className="proportion-bar" style={{ opacity: 0.4 }}>
        <div style={{ flex: 1, background: "var(--bg-elevated)" }} />
      </div>
    );
  }

  return (
    <div ref={barRef} className="proportion-bar">
      {components.map((c, i) => {
        const color = colorForTobacco(c.tobaccoId);
        const isLast = i === components.length - 1;
        return (
          <div
            key={c.tobaccoId}
            className="proportion-bar__seg"
            style={{
              flex: `${c.proportion} 0 0`,
              background: color.fill,
            }}
            title={`${c.proportion}%`}
          >
            {!isLast && (
              <div
                className="proportion-bar__handle"
                data-dragging={dragging === i}
                onPointerDown={handlePointerDown(i)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// --------- Library item ---------
function LibraryItem({ t, inMix, disabled, onAdd, onSelect }) {
  return (
    <div
      className="lib-item"
      data-in-mix={inMix}
      data-out-of-stock={!t.inStock}
      onClick={() => (inMix ? null : onAdd(t.id))}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onAdd(t.id); }}
    >
      <div className="lib-item__avatar" title={t.manufacturer}>
        {t.brandShort}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="lib-item__name">
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t.name}
          </span>
          {!t.inStock && <Tag tone="danger" ghost>нет</Tag>}
        </div>
        <div className="lib-item__meta">
          <span>{t.manufacturer}{t.lineName ? ` · ${t.lineName}` : ""}</span>
          <span style={{ color: "var(--text-faint)" }}>·</span>
          <span>{(t.flavors || []).slice(0, 3).join(", ")}</span>
        </div>
      </div>
      <button className="lib-item__action" title={inMix ? "В составе" : "Добавить"} onClick={(e) => { e.stopPropagation(); onAdd(t.id); }}>
        <Lucide name={inMix ? "check" : "plus"} size={14} />
      </button>
    </div>
  );
}

// --------- Component card in canvas ---------
function ComponentCard({ component, tobacco, onChange, onRemove, onMove, propsUI, onlyMode }) {
  const color = colorForTobacco(tobacco.id);
  const stepPct = (delta) => {
    const next = Math.max(1, Math.min(99, component.proportion + delta));
    onChange({ proportion: next });
  };
  return (
    <div className="mc" style={{ borderLeftColor: color.fill }} data-color-band>
      <button className="mc__handle" title="Перетащить">
        <Lucide name="drag" size={14} />
      </button>
      <div className="mc__main">
        <div className="mc__name">
          {tobacco.name}
          {!tobacco.inStock && <Tag tone="danger" ghost>нет в наличии</Tag>}
        </div>
        <div className="mc__sub">
          <BrandPill short={tobacco.brandShort} name={tobacco.manufacturer} lineName={tobacco.lineName} />
          <span style={{ marginLeft: 8 }}>{(tobacco.flavors || []).slice(0, 4).join(" · ")}</span>
        </div>
      </div>
      <div className="mc__prop">
        {propsUI === "slider" && (
          <input
            type="range"
            min={1}
            max={99}
            value={component.proportion}
            onChange={(e) => onChange({ proportion: parseInt(e.target.value, 10) })}
            style={{ width: 140 }}
          />
        )}
        <div className="prop-input">
          <button className="prop-input__step" onClick={() => stepPct(-5)} title="-5%">−</button>
          <input
            type="number"
            min={1}
            max={99}
            value={component.proportion}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) onChange({ proportion: Math.max(1, Math.min(99, v)) });
            }}
          />
          <span className="prop-input__suffix">%</span>
          <button className="prop-input__step" onClick={() => stepPct(5)} title="+5%">+</button>
        </div>
        <IconButton name="trash" title="Убрать" onClick={onRemove} />
      </div>
    </div>
  );
}

// --------- The builder itself ---------
function MixBuilder({ mix, allMixes, onSave, onCancel, tweaks }) {
  const initial = useMemo(() => {
    if (mix) return {
      id: mix.id, name: mix.name, description: mix.description,
      components: mix.components.map((c) => ({ ...c })),
      guestVisible: mix.guestVisible !== false,
    };
    return { id: null, name: "", description: "", components: [], guestVisible: true };
  }, [mix]);

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [components, setComponents] = useState(initial.components);
  const [guestVisible, setGuestVisible] = useState(initial.guestVisible);

  // Library state
  const [libSearch, setLibSearch] = useState("");
  const [libInStockOnly, setLibInStockOnly] = useState(true);
  const [libProfileFilter, setLibProfileFilter] = useState(null); // 'used' (matches profile of any component) or specific
  const [libBrandFilter, setLibBrandFilter] = useState(null);
  const [libSort, setLibSort] = useState("usage"); // usage | name | newest

  const currentIds = components.map((c) => c.tobaccoId);

  const tobaccoMap = useMemo(() => {
    const map = new Map();
    TOBACCOS.forEach((t) => map.set(t.id, t));
    return map;
  }, []);

  // Aggregate flavor profiles + flavors from components
  const aggregatedProfiles = useMemo(() => {
    const all = [];
    components.forEach((c) => {
      const t = tobaccoMap.get(c.tobaccoId);
      if (t) all.push(...(t.flavorProfiles || []));
    });
    return uniq(all);
  }, [components, tobaccoMap]);

  const aggregatedFlavors = useMemo(() => {
    const all = [];
    components.forEach((c) => {
      const t = tobaccoMap.get(c.tobaccoId);
      if (t) all.push(...(t.flavors || []));
    });
    return uniq(all);
  }, [components, tobaccoMap]);

  // --- Library filtering ---
  const filteredLibrary = useMemo(() => {
    let list = TOBACCOS.slice();
    if (libInStockOnly) list = list.filter((t) => t.inStock);
    if (libSearch.trim()) {
      const q = libSearch.toLowerCase();
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.manufacturer.toLowerCase().includes(q) ||
        (t.flavors || []).some((f) => f.toLowerCase().includes(q)) ||
        (t.flavorProfiles || []).some((p) => p.toLowerCase().includes(q))
      );
    }
    if (libBrandFilter) list = list.filter((t) => t.manufacturer === libBrandFilter);
    if (libProfileFilter === "matching" && aggregatedProfiles.length) {
      list = list.filter((t) =>
        (t.flavorProfiles || []).some((p) => aggregatedProfiles.includes(p))
      );
    } else if (libProfileFilter && libProfileFilter !== "matching") {
      list = list.filter((t) => (t.flavorProfiles || []).includes(libProfileFilter));
    }
    if (libSort === "usage") list.sort((a, b) => b.usageCount - a.usageCount);
    else if (libSort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return list;
  }, [libSearch, libInStockOnly, libBrandFilter, libProfileFilter, libSort, aggregatedProfiles]);

  const brandsInLib = useMemo(() => uniq(TOBACCOS.map((t) => t.manufacturer)).slice(0, 6), []);

  // --- Actions ---
  const addComponent = useCallback((tobaccoId) => {
    setComponents((curr) => {
      if (curr.find((c) => c.tobaccoId === tobaccoId)) return curr;
      const next = [...curr, { tobaccoId, proportion: 0 }];
      return rebalanceTo100(next);
    });
  }, []);

  const removeComponent = (tobaccoId) => {
    setComponents((curr) => rebalanceTo100(curr.filter((c) => c.tobaccoId !== tobaccoId)));
  };

  const updateComponent = (tobaccoId, patch) => {
    setComponents((curr) => {
      const idx = curr.findIndex((c) => c.tobaccoId === tobaccoId);
      if (idx === -1) return curr;
      const updated = curr.map((c, i) => (i === idx ? { ...c, ...patch } : c));
      if (patch.proportion != null) {
        // Auto-adjust the others to keep total = 100
        const taken = updated[idx].proportion;
        const others = updated.filter((_, i) => i !== idx);
        const remaining = Math.max(0, 100 - taken);
        const othersTotal = others.reduce((s, c) => s + c.proportion, 0) || 1;
        const balanced = updated.map((c, i) => {
          if (i === idx) return c;
          const share = c.proportion / othersTotal;
          return { ...c, proportion: Math.max(1, Math.round(remaining * share)) };
        });
        // Normalize
        const sum = balanced.reduce((s, c) => s + c.proportion, 0);
        const diff = 100 - sum;
        if (diff !== 0) {
          const lastNonChange = balanced.findIndex((_, i) => i !== idx);
          if (lastNonChange !== -1) balanced[lastNonChange].proportion += diff;
        }
        return balanced;
      }
      return updated;
    });
  };

  const equalize = () => setComponents((c) => rebalanceTo100(c));
  const applyPreset = (preset) => {
    if (preset.length !== components.length) {
      // Pad or trim
      if (preset.length < components.length) {
        setComponents((c) => rebalanceTo100(c.slice(0, preset.length).map((cc, i) => ({ ...cc, proportion: preset[i] }))));
      }
      return;
    }
    setComponents((c) => c.map((cc, i) => ({ ...cc, proportion: preset[i] })));
  };

  const totalPct = components.reduce((s, c) => s + c.proportion, 0);
  const isValid = name.trim().length > 0 && components.length >= 1 && totalPct === 100;

  const blockedByStock = components.some((c) => !(tobaccoMap.get(c.tobaccoId)?.inStock));

  const suggestions = useMemo(
    () => getCoOccurrenceSuggestions(currentIds, allMixes, TOBACCOS),
    [currentIds, allMixes]
  );

  // Presets by component count
  const presetsByCount = {
    2: [[50, 50], [60, 40], [70, 30], [80, 20]],
    3: [[40, 30, 30], [50, 30, 20], [60, 20, 20], [34, 33, 33]],
    4: [[40, 30, 20, 10], [25, 25, 25, 25]],
  };
  const currentPresets = presetsByCount[components.length] || [];

  return (
    <div className="modal-page">
      {/* Header */}
      <div className="builder__head">
        <IconButton name="arrowLeft" title="Назад" onClick={onCancel} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div className="eyebrow" style={{ margin: 0 }}>
            {mix ? "Редактирование микса" : "Новый микс"}
          </div>
          <span style={{ color: "var(--text-faint)" }}>·</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {components.length} {components.length === 1 ? "табак" : "табака"} · {totalPct}%
          </span>
          {totalPct === 100 ? (
            <Tag tone="success">сумма = 100%</Tag>
          ) : (
            <Tag tone="warning">{totalPct > 100 ? "переполнено" : `осталось ${100 - totalPct}%`}</Tag>
          )}
          {blockedByStock && <Tag tone="danger">блокируется наличием</Tag>}
        </div>
        <div className="row gap-3">
          <label className="row" style={{ gap: 6 }}>
            <Toggle on={guestVisible} onChange={setGuestVisible} title="Виден гостю" />
            <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>Виден гостю</span>
          </label>
          <Button variant="ghost" onClick={onCancel}>Отмена</Button>
          <Button variant="primary" icon="check" disabled={!isValid} onClick={() => onSave({ id: initial.id, name, description, components, guestVisible })}>
            Сохранить
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="builder" data-layout={tweaks.builder_layout || "split"} style={{ flex: 1 }}>
        {/* LIBRARY */}
        <div className="builder__library">
          <div className="builder__lib-head">
            <div className="row gap-2">
              <div style={{ flex: 1 }}>
                <SearchInput
                  value={libSearch}
                  onChange={setLibSearch}
                  placeholder="Найти табак, бренд, вкус…"
                  hotkey="⌘F"
                />
              </div>
              <Toggle on={libInStockOnly} onChange={setLibInStockOnly} title="Только в наличии" />
              <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>В наличии</span>
            </div>
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              {components.length > 0 && (
                <Chip
                  active={libProfileFilter === "matching"}
                  onClick={() => setLibProfileFilter(libProfileFilter === "matching" ? null : "matching")}
                >
                  <Lucide name="sparkle" size={11} /> Подходит к составу
                </Chip>
              )}
              {brandsInLib.map((b) => (
                <Chip
                  key={b}
                  active={libBrandFilter === b}
                  onClick={() => setLibBrandFilter(libBrandFilter === b ? null : b)}
                >
                  {b}
                </Chip>
              ))}
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {filteredLibrary.length} из {TOBACCOS.length} табаков
              </span>
              <div className="row gap-2" style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
                <Lucide name="sort" size={12} />
                <select
                  value={libSort}
                  onChange={(e) => setLibSort(e.target.value)}
                  style={{ background: "transparent", border: 0, color: "var(--text-secondary)", outline: 0, cursor: "pointer" }}
                >
                  <option value="usage">По использованию</option>
                  <option value="name">По алфавиту</option>
                  <option value="newest">Новые</option>
                </select>
              </div>
            </div>
          </div>
          <div className="builder__lib-list">
            {filteredLibrary.map((t) => (
              <LibraryItem
                key={t.id}
                t={t}
                inMix={currentIds.includes(t.id)}
                onAdd={addComponent}
              />
            ))}
            {filteredLibrary.length === 0 && (
              <div className="empty">
                <div className="empty__title">Ничего не найдено</div>
                <div>Сбросьте фильтры или измените поиск.</div>
              </div>
            )}
          </div>
        </div>

        {/* CANVAS */}
        <div className="builder__canvas">
          <div className="builder__form">
            <input
              type="text"
              className="mix-name-input"
              placeholder="Название микса"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <textarea
              className="mix-desc-input"
              placeholder="Описание для гостя (1–2 строки)"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="spacer-4" />

            {/* Proportion overview */}
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div className="section-h">Пропорции</div>
                <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  потяни границы или используй пресеты
                </span>
              </div>
              {components.length >= 2 && (
                <Button variant="ghost" size="sm" icon="scales" onClick={equalize}>
                  Распределить поровну
                </Button>
              )}
            </div>
            <ProportionBar components={components} onResize={setComponents} />

            {currentPresets.length > 0 && (
              <div className="presets">
                {currentPresets.map((p) => (
                  <button key={p.join("-")} className="preset" onClick={() => applyPreset(p)}>
                    {p.join("/")}
                  </button>
                ))}
              </div>
            )}

            {/* Components list */}
            <div className="section-h" style={{ marginTop: 16 }}>Состав ({components.length})</div>
            {components.length === 0 && (
              <div className="empty" style={{ border: "1px dashed var(--border-default)", borderRadius: "var(--r-lg)" }}>
                <div className="empty__title">Состав пуст</div>
                <div>Добавьте табаки из библиотеки слева ←</div>
              </div>
            )}
            {components.map((c) => {
              const t = tobaccoMap.get(c.tobaccoId);
              if (!t) return null;
              return (
                <ComponentCard
                  key={c.tobaccoId}
                  component={c}
                  tobacco={t}
                  onChange={(patch) => updateComponent(c.tobaccoId, patch)}
                  onRemove={() => removeComponent(c.tobaccoId)}
                  propsUI={tweaks.proportions_ui || "numeric"}
                />
              );
            })}

            {/* Aggregated profile */}
            {components.length > 0 && (
              <React.Fragment>
                <div className="section-h" style={{ marginTop: 24 }}>Вкусовой профиль микса</div>
                <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                  {aggregatedProfiles.map((p) => <Tag key={p} tone="accent">{p}</Tag>)}
                </div>
                <div className="spacer-2" />
                <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>
                  {aggregatedFlavors.map((f) => <Tag key={f} ghost>{f}</Tag>)}
                </div>
              </React.Fragment>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <React.Fragment>
                <div className="section-h" style={{ marginTop: 24 }}>
                  <Lucide name="sparkle" size={11} /> Часто берут с этим составом
                </div>
                <div className="suggestions">
                  {suggestions.map((s) => (
                    <div key={s.tobacco.id} className="suggestion" onClick={() => addComponent(s.tobacco.id)}>
                      <div className="suggestion__name">{s.tobacco.name}</div>
                      <div className="suggestion__reason">{s.tobacco.manufacturer} · {s.reason}</div>
                    </div>
                  ))}
                </div>
              </React.Fragment>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

window.NomadMixBuilder = MixBuilder;
