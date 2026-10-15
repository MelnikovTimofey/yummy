/* global React */
// Mixes list, tobaccos list, rails list, rail editor, tobacco editor

const { useState, useMemo, useEffect, useCallback, useRef } = React;
const { TOBACCOS, MIXES, RAILS, FLAVOR_PROFILES, colorForTobacco } = window.NomadData;
const { Button, IconButton, Lucide, Tag, Chip, Toggle, SearchInput, BrandPill, Drawer } = window.NomadUI;

// =====================================================================
//   MIXES LIST  — improved compact list, Linear-style
// =====================================================================
function MixesList({ mixes, tobaccoMap, railsMap, onOpenMix, onCreateMix, onToggleVisible, onDuplicate }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all"); // all | visible | hidden | blocked
  const [sort, setSort] = useState("popularity"); // popularity | rating | name | updated
  const [profileFilter, setProfileFilter] = useState(null);

  const filtered = useMemo(() => {
    let list = mixes.slice();
    if (status === "visible") list = list.filter((m) => m.guestVisible && m.available);
    if (status === "hidden") list = list.filter((m) => !m.guestVisible || !m.available);
    if (status === "blocked") list = list.filter((m) => !m.available);
    if (q.trim()) {
      const Q = q.toLowerCase();
      list = list.filter((m) =>
        m.name.toLowerCase().includes(Q) ||
        m.description.toLowerCase().includes(Q) ||
        m.flavors.some((f) => f.toLowerCase().includes(Q)) ||
        m.components.some((c) => {
          const t = tobaccoMap.get(c.tobaccoId);
          return t && (t.name.toLowerCase().includes(Q) || t.manufacturer.toLowerCase().includes(Q));
        })
      );
    }
    if (profileFilter) list = list.filter((m) => m.flavorProfiles.includes(profileFilter));
    if (sort === "popularity") list.sort((a, b) => b.popularity - a.popularity);
    else if (sort === "rating") list.sort((a, b) => b.avgRating - a.avgRating);
    else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return list;
  }, [mixes, status, q, sort, profileFilter, tobaccoMap]);

  const stats = useMemo(() => ({
    total: mixes.length,
    visible: mixes.filter((m) => m.guestVisible && m.available).length,
    inRails: mixes.filter((m) => m.railIds.length > 0).length,
    blocked: mixes.filter((m) => !m.available).length,
  }), [mixes]);

  const profileCounts = useMemo(() => {
    const map = new Map();
    mixes.forEach((m) => m.flavorProfiles.forEach((p) => map.set(p, (map.get(p) || 0) + 1)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [mixes]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Менеджер миксов</div>
          <h1 className="page-title">Каталог миксов</h1>
          <div className="page-subtitle">Подборки для гостевой витрины — поиск, фильтры, быстрые действия.</div>
        </div>
        <div className="row gap-2">
          <Button variant="ghost" icon="filter">Сохранённые виды</Button>
          <Button variant="primary" icon="plus" onClick={onCreateMix}>Новый микс</Button>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat__label">Всего</div>
          <div className="stat__value">{stats.total}</div>
          <div className="stat__sub">в каталоге</div>
        </div>
        <div className="stat">
          <div className="stat__label">Видно гостю</div>
          <div className="stat__value">{stats.visible}</div>
          <div className="stat__sub" style={{ color: "var(--success)" }}>сейчас на витрине</div>
        </div>
        <div className="stat">
          <div className="stat__label">В рейлах</div>
          <div className="stat__value">{stats.inRails}</div>
          <div className="stat__sub">опубликованы в подборках</div>
        </div>
        <div className="stat">
          <div className="stat__label">Заблокировано</div>
          <div className="stat__value" style={{ color: "var(--warning)" }}>{stats.blocked}</div>
          <div className="stat__sub">режет наличие табака</div>
        </div>
      </div>

      <div className="list">
        <div className="toolbar">
          <div className="toolbar__search">
            <SearchInput value={q} onChange={setQ} placeholder="Микс, табак, вкус…" hotkey="/" />
          </div>
          <Chip active={status === "all"} onClick={() => setStatus("all")}>Все<span className="chip__count">{stats.total}</span></Chip>
          <Chip active={status === "visible"} onClick={() => setStatus("visible")}>Виден гостю<span className="chip__count">{stats.visible}</span></Chip>
          <Chip active={status === "hidden"} onClick={() => setStatus("hidden")}>Скрыт<span className="chip__count">{stats.total - stats.visible}</span></Chip>
          <Chip active={status === "blocked"} onClick={() => setStatus("blocked")}>Блокирован<span className="chip__count">{stats.blocked}</span></Chip>
          <div className="toolbar__separator" />
          <div className="row gap-2" style={{ color: "var(--text-muted)" }}>
            <Lucide name="sort" size={12} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{ background: "transparent", border: 0, color: "var(--text-secondary)", outline: 0, cursor: "pointer", fontSize: "var(--fs-sm)" }}
            >
              <option value="popularity">Популярность</option>
              <option value="rating">Оценки</option>
              <option value="name">Название</option>
              <option value="updated">Обновлено</option>
            </select>
          </div>
        </div>

        {/* Profile chips row */}
        <div className="row" style={{ padding: "8px 12px", gap: 6, borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Профиль</span>
          {profileCounts.map(([p, n]) => (
            <Chip key={p} active={profileFilter === p} onClick={() => setProfileFilter(profileFilter === p ? null : p)} count={n}>
              {p}
            </Chip>
          ))}
          {profileFilter && (
            <button className="chip" onClick={() => setProfileFilter(null)} style={{ color: "var(--text-muted)" }}>
              <Lucide name="x" size={11} /> сбросить
            </button>
          )}
        </div>

        {/* Header */}
        <div className="list__head" style={{ gridTemplateColumns: "minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(160px, 1fr) 92px 110px 92px" }}>
          <div>Микс</div>
          <div>Состав</div>
          <div>Профиль</div>
          <div>Статус</div>
          <div>Метрики</div>
          <div style={{ textAlign: "right" }}>Действия</div>
        </div>

        {filtered.map((m) => {
          const isBlocked = !m.available;
          return (
            <div
              key={m.id}
              className="list__row"
              style={{ gridTemplateColumns: "minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(160px, 1fr) 92px 110px 92px" }}
              onClick={() => onOpenMix(m)}
            >
              {/* Mix name */}
              <div className="cell-primary" style={{ minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{m.name}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--text-faint)" }}>
                      {m.components.map((c) => `${c.proportion}`).join("/")}
                    </span>
                  </div>
                  <div className="cell-primary__sub cell-truncate" style={{ marginTop: 2 }}>
                    {m.description}
                  </div>
                </div>
              </div>

              {/* Components stack */}
              <div className="cmpstack">
                {m.components.slice(0, 3).map((c) => {
                  const t = tobaccoMap.get(c.tobaccoId);
                  const color = colorForTobacco(c.tobaccoId);
                  return (
                    <span
                      key={c.tobaccoId}
                      className="cmpstack__avatar"
                      title={t ? `${t.name} · ${t.manufacturer} · ${c.proportion}%` : ""}
                      style={{ background: color.soft, borderColor: color.border, color: color.text }}
                    >
                      {t ? t.brandShort : "?"}
                    </span>
                  );
                })}
                <span className="cell-meta cell-truncate" style={{ marginLeft: 8, minWidth: 0 }}>
                  {m.components.map((c) => tobaccoMap.get(c.tobaccoId)?.name).filter(Boolean).join(" + ")}
                </span>
              </div>

              {/* Profile */}
              <div className="cell-meta cell-truncate">
                {m.flavorProfiles.slice(0, 3).join(" · ")}
              </div>

              {/* Status */}
              <div>
                {isBlocked ? (
                  <Tag tone="danger">Блокирован</Tag>
                ) : m.guestVisible ? (
                  <Tag tone="success">Виден</Tag>
                ) : (
                  <Tag>Скрыт</Tag>
                )}
              </div>

              {/* Metrics */}
              <div className="cell-meta mono" style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
                <span><Lucide name="flame" size={11} /> {m.popularity}</span>
                <span><Lucide name="star" size={11} /> {m.avgRating.toFixed(1)} <span style={{ color: "var(--text-faint)" }}>({m.ratingsCount})</span></span>
              </div>

              {/* Actions */}
              <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                <IconButton name={m.guestVisible ? "eye" : "eyeOff"} title={m.guestVisible ? "Скрыть от гостя" : "Показать гостю"} onClick={() => onToggleVisible(m.id)} />
                <IconButton name="copy" title="Дублировать" onClick={() => onDuplicate(m)} />
                <IconButton name="edit" title="Редактировать" onClick={() => onOpenMix(m)} />
                <IconButton name="more" title="Ещё" />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty">
            <div className="empty__title">Ничего не найдено</div>
            <div>Сбросьте фильтры или измените поиск.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
//   TOBACCOS LIST
// =====================================================================
function TobaccosList({ tobaccos, onCreate, onEdit, onToggleStock, mixesByTobacco }) {
  const [q, setQ] = useState("");
  const [stock, setStock] = useState("all"); // all | in | out
  const [brand, setBrand] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sort, setSort] = useState("usage");

  const filtered = useMemo(() => {
    let list = tobaccos.slice();
    if (stock === "in") list = list.filter((t) => t.inStock);
    if (stock === "out") list = list.filter((t) => !t.inStock);
    if (brand) list = list.filter((t) => t.manufacturer === brand);
    if (profile) list = list.filter((t) => (t.flavorProfiles || []).includes(profile));
    if (q.trim()) {
      const Q = q.toLowerCase();
      list = list.filter((t) =>
        t.name.toLowerCase().includes(Q) ||
        t.manufacturer.toLowerCase().includes(Q) ||
        (t.flavors || []).some((f) => f.toLowerCase().includes(Q)) ||
        (t.flavorProfiles || []).some((p) => p.toLowerCase().includes(Q))
      );
    }
    if (sort === "usage") list.sort((a, b) => b.usageCount - a.usageCount);
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    if (sort === "stock") list.sort((a, b) => Number(b.inStock) - Number(a.inStock));
    return list;
  }, [tobaccos, stock, brand, profile, q, sort]);

  const stats = useMemo(() => ({
    total: tobaccos.length,
    inStock: tobaccos.filter((t) => t.inStock).length,
    outOfStock: tobaccos.filter((t) => !t.inStock).length,
    inMixes: tobaccos.filter((t) => t.usageCount > 0).length,
  }), [tobaccos]);

  const brandsTop = useMemo(() => {
    const m = new Map();
    tobaccos.forEach((t) => m.set(t.manufacturer, (m.get(t.manufacturer) || 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [tobaccos]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Инвентаризация</div>
          <h1 className="page-title">Табаки</h1>
          <div className="page-subtitle">Наличие, компоненты миксов и связанные позиции витрины.</div>
        </div>
        <div className="row gap-2">
          <Button variant="ghost" icon="scan">Поставка</Button>
          <Button variant="primary" icon="plus" onClick={() => onCreate()}>Новый табак</Button>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat__label">В каталоге</div>
          <div className="stat__value">{stats.total.toLocaleString("ru-RU")}</div>
          <div className="stat__sub">всего позиций</div>
        </div>
        <div className="stat">
          <div className="stat__label">В наличии</div>
          <div className="stat__value" style={{ color: "var(--success)" }}>{stats.inStock}</div>
          <div className="stat__sub">сейчас на кухне</div>
        </div>
        <div className="stat">
          <div className="stat__label">Нет в наличии</div>
          <div className="stat__value" style={{ color: "var(--warning)" }}>{stats.outOfStock}</div>
          <div className="stat__sub">требуют пополнения</div>
        </div>
        <div className="stat">
          <div className="stat__label">В составе миксов</div>
          <div className="stat__value">{stats.inMixes}</div>
          <div className="stat__sub">активно используется</div>
        </div>
      </div>

      <div className="list">
        <div className="toolbar">
          <div className="toolbar__search">
            <SearchInput value={q} onChange={setQ} placeholder="Название, бренд, вкус…" hotkey="/" />
          </div>
          <Chip active={stock === "all"} onClick={() => setStock("all")}>Все<span className="chip__count">{stats.total}</span></Chip>
          <Chip active={stock === "in"} onClick={() => setStock("in")}>В наличии<span className="chip__count">{stats.inStock}</span></Chip>
          <Chip active={stock === "out"} onClick={() => setStock("out")}>Нет<span className="chip__count">{stats.outOfStock}</span></Chip>
          <div className="toolbar__separator" />
          <div className="row gap-2" style={{ color: "var(--text-muted)" }}>
            <Lucide name="sort" size={12} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{ background: "transparent", border: 0, color: "var(--text-secondary)", outline: 0, cursor: "pointer", fontSize: "var(--fs-sm)" }}
            >
              <option value="usage">По использованию</option>
              <option value="stock">По наличию</option>
              <option value="name">По алфавиту</option>
            </select>
          </div>
        </div>

        {/* Brand filter chips */}
        <div className="row" style={{ padding: "8px 12px", gap: 6, borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Бренд</span>
          {brandsTop.map(([b, n]) => (
            <Chip key={b} active={brand === b} onClick={() => setBrand(brand === b ? null : b)} count={n}>{b}</Chip>
          ))}
        </div>

        <div className="list__head" style={{ gridTemplateColumns: "32px minmax(220px, 1.3fr) minmax(160px, 1fr) minmax(180px, 1.3fr) 92px 60px 92px" }}>
          <div></div>
          <div>Табак</div>
          <div>Бренд</div>
          <div>Вкус / профиль</div>
          <div>В наличии</div>
          <div style={{ textAlign: "center" }}>Миксов</div>
          <div style={{ textAlign: "right" }}>Действия</div>
        </div>

        {filtered.map((t) => (
          <div
            key={t.id}
            className="list__row"
            data-pinned-actions
            style={{ gridTemplateColumns: "32px minmax(220px, 1.3fr) minmax(160px, 1fr) minmax(180px, 1.3fr) 92px 60px 92px" }}
            onClick={() => onEdit(t)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <div style={{
                width: 22, height: 22, borderRadius: 4,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                display: "grid", placeItems: "center",
                fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 600,
                color: "var(--text-secondary)",
              }}>{t.brandShort}</div>
            </div>
            <div className="cell-primary">
              <div>
                <div>{t.name}</div>
                <div className="cell-primary__sub" style={{ marginTop: 2 }}>
                  {STRENGTH_LABEL_BY_ID[t.strength] || "—"} · {(t.flavors || []).slice(0, 3).join(", ")}
                </div>
              </div>
            </div>
            <div className="cell-meta">
              {t.manufacturer}
              {t.lineName && <span style={{ color: "var(--text-faint)" }}>· {t.lineName}</span>}
            </div>
            <div className="cell-meta" style={{ flexWrap: "wrap" }}>
              {(t.flavorProfiles || []).slice(0, 3).map((p) => <Tag key={p} ghost>{p}</Tag>)}
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Toggle on={t.inStock} onChange={() => onToggleStock(t.id)} title="Наличие" />
            </div>
            <div className="cell-meta mono" style={{ textAlign: "center", display: "block" }}>
              {t.usageCount > 0 ? t.usageCount : <span style={{ color: "var(--text-faint)" }}>—</span>}
            </div>
            <div className="row-actions" onClick={(e) => e.stopPropagation()}>
              <IconButton name="edit" title="Редактировать" onClick={() => onEdit(t)} />
              <IconButton name="more" title="Ещё" />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty">
            <div className="empty__title">Ничего не найдено</div>
            <div>Сбросьте фильтры или измените поиск.</div>
          </div>
        )}
      </div>
    </div>
  );
}

const STRENGTH_LABEL_BY_ID = { light: "Лёгкий", medium: "Средний", strong: "Крепкий" };

// =====================================================================
//   TOBACCO EDITOR  (drawer)
// =====================================================================
function TobaccoEditor({ open, tobacco, onClose, onSave }) {
  const isCreate = !tobacco?.id;
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (open) {
      setDraft({
        id: tobacco?.id || null,
        name: tobacco?.name || "",
        manufacturer: tobacco?.manufacturer || "",
        lineName: tobacco?.lineName || "",
        flavorProfiles: tobacco?.flavorProfiles || [],
        flavors: (tobacco?.flavors || []).join(", "),
        strength: tobacco?.strength || "medium",
        inStock: tobacco?.inStock ?? true,
        description: tobacco?.description || "",
      });
    }
  }, [open, tobacco]);

  if (!draft) return null;

  const toggleProfile = (p) => setDraft((d) => ({
    ...d,
    flavorProfiles: d.flavorProfiles.includes(p)
      ? d.flavorProfiles.filter((x) => x !== p)
      : [...d.flavorProfiles, p],
  }));

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={isCreate ? "Новый табак" : "Редактирование"}
      title={isCreate ? "Добавить табак" : draft.name || "Без названия"}
      footer={
        <React.Fragment>
          <div style={{ flex: 1 }}>
            {!isCreate && (
              <Button variant="danger" icon="trash">Удалить</Button>
            )}
          </div>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button variant="primary" icon="check" onClick={() => onSave(draft)}>
            {isCreate ? "Создать" : "Сохранить"}
          </Button>
        </React.Fragment>
      }
    >
      {/* Identity row */}
      <div className="row" style={{ gap: 12, marginBottom: 18, padding: "12px 14px", border: "1px solid var(--border-subtle)", borderRadius: "var(--r-md)", background: "var(--bg-raised)" }}>
        <div style={{ flex: 1 }}>
          <div className="section-h">Наличие</div>
          <div className="row gap-2">
            <Toggle on={draft.inStock} onChange={(v) => set("inStock", v)} title="В наличии" />
            <span style={{ color: draft.inStock ? "var(--success)" : "var(--text-muted)" }}>
              {draft.inStock ? "В наличии" : "Нет на кухне"}
            </span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="section-h">Крепость</div>
          <div className="row gap-2">
            {["light", "medium", "strong"].map((s) => (
              <Chip key={s} active={draft.strength === s} onClick={() => set("strength", s)}>
                {STRENGTH_LABEL_BY_ID[s]}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="col gap-4">
        <div>
          <label className="field-label">Название</label>
          <div className="input input--lg">
            <input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Например, Citrus Breeze" />
          </div>
        </div>
        <div className="row gap-3">
          <div style={{ flex: 1 }}>
            <label className="field-label">Производитель</label>
            <div className="input">
              <input value={draft.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} placeholder="Nomad Reserve" />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label">Линейка</label>
            <div className="input">
              <input value={draft.lineName} onChange={(e) => set("lineName", e.target.value)} placeholder="Signature" />
            </div>
          </div>
        </div>

        <div>
          <label className="field-label">Категория вкуса · можно несколько</label>
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {FLAVOR_PROFILES.map((p) => (
              <Chip key={p} active={draft.flavorProfiles.includes(p)} onClick={() => toggleProfile(p)}>{p}</Chip>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label">Вкусы · через запятую</label>
          <div className="input">
            <input value={draft.flavors} onChange={(e) => set("flavors", e.target.value)} placeholder="лимон, мята, лайм" />
          </div>
        </div>

        <div>
          <label className="field-label">Описание для команды</label>
          <textarea className="textarea" value={draft.description} onChange={(e) => set("description", e.target.value)}
            placeholder="Например: подходит к цитрусовым миксам, не миксуй с табачными" />
        </div>
      </div>
    </Drawer>
  );
}

// =====================================================================
//   RAILS LIST
// =====================================================================
function RailsList({ rails, mixesMap, onEdit, onCreate }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Менеджер рейлов</div>
          <h1 className="page-title">Рейлы Nomad</h1>
          <div className="page-subtitle">Состав и порядок подборок для гостевой витрины.</div>
        </div>
        <div className="row gap-2">
          <Button variant="ghost" icon="eye">Витрина гостя</Button>
          <Button variant="primary" icon="plus" onClick={onCreate}>Новый рейл</Button>
        </div>
      </div>

      <div className="col gap-3">
        {rails.map((rail) => (
          <div key={rail.id} className="card" style={{ padding: "16px 20px" }}>
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row gap-2" style={{ marginBottom: 4 }}>
                  <div className="eyebrow" style={{ margin: 0 }}>Рейл</div>
                  <Tag tone={rail.type === "statistical" ? "info" : rail.type === "prepared" ? "warning" : "accent"}>
                    {rail.type === "statistical" ? "Статистический" : rail.type === "prepared" ? "Предзаготовленный" : "Собранный мастером"}
                  </Tag>
                  {!rail.editable && <Tag ghost>только просмотр</Tag>}
                  {rail.active && <Tag tone="success">активен</Tag>}
                </div>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500, margin: "2px 0 4px" }}>{rail.name}</h3>
                <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-md)", marginBottom: 10 }}>{rail.description}</div>
                <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                  {rail.mixIds.map((mid) => {
                    const m = mixesMap.get(mid);
                    if (!m) return null;
                    return (
                      <div key={mid} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        height: 26, padding: "0 10px", borderRadius: "var(--r-sm)",
                        background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                        fontSize: "var(--fs-sm)", color: "var(--text-secondary)",
                      }}>
                        <span className="dot" style={{ background: m.guestVisible && m.available ? "var(--success)" : "var(--warning)" }} />
                        {m.name}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="col gap-2" style={{ alignItems: "flex-end" }}>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {rail.mixIds.length} {rail.mixIds.length === 1 ? "микс" : "миксов"}
                </div>
                <div className="row gap-2">
                  {rail.editable ? (
                    <Button icon="edit" onClick={() => onEdit(rail)}>Редактировать</Button>
                  ) : (
                    <Button icon="eye">Просмотр</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
//   RAIL EDITOR — drawer with mix picker + guest preview
// =====================================================================
function RailEditor({ open, rail, allMixes, mixesMap, onClose, onSave }) {
  const [draft, setDraft] = useState(null);
  const [pickerQ, setPickerQ] = useState("");
  const [dragSrc, setDragSrc] = useState(null);

  useEffect(() => {
    if (open) {
      setDraft({
        id: rail?.id || null,
        name: rail?.name || "",
        description: rail?.description || "",
        type: rail?.type || "prepared",
        mixIds: rail?.mixIds ? [...rail.mixIds] : [],
        active: rail?.active ?? true,
      });
    }
  }, [open, rail]);

  const available = useMemo(() => {
    if (!draft) return [];
    const have = new Set(draft.mixIds);
    const Q = pickerQ.toLowerCase();
    return allMixes.filter((m) => !have.has(m.id) && (
      !Q || m.name.toLowerCase().includes(Q) || m.description.toLowerCase().includes(Q)
    ));
  }, [allMixes, draft, pickerQ]);

  if (!draft) return null;

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const includedMixes = draft.mixIds.map((id) => mixesMap.get(id)).filter(Boolean);

  const add = (id) => set("mixIds", [...draft.mixIds, id]);
  const remove = (id) => set("mixIds", draft.mixIds.filter((x) => x !== id));
  const move = (id, dir) => {
    const i = draft.mixIds.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= draft.mixIds.length) return;
    const next = [...draft.mixIds];
    [next[i], next[j]] = [next[j], next[i]];
    set("mixIds", next);
  };
  const onDragStart = (id) => setDragSrc(id);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (overId) => {
    if (!dragSrc || dragSrc === overId) return;
    const next = draft.mixIds.filter((x) => x !== dragSrc);
    const idx = next.indexOf(overId);
    next.splice(idx, 0, dragSrc);
    set("mixIds", next);
    setDragSrc(null);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={rail ? "Редактирование рейла" : "Новый рейл"}
      title={draft.name || "Без названия"}
      size="xl"
      footer={
        <React.Fragment>
          <div style={{ flex: 1 }}>
            <div className="row gap-2">
              <Toggle on={draft.active} onChange={(v) => set("active", v)} title="Активен" />
              <span style={{ fontSize: "var(--fs-sm)" }}>{draft.active ? "Активен — гость видит на витрине" : "Скрыт"}</span>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button variant="primary" icon="check" onClick={() => onSave(draft)}>Сохранить</Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 320px", gap: 18 }}>
        {/* LEFT: settings + composition */}
        <div className="col gap-4">
          <div>
            <label className="field-label">Название рейла</label>
            <div className="input input--lg">
              <input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Быстрый старт" />
            </div>
          </div>
          <div>
            <label className="field-label">Подзаголовок для гостя</label>
            <div className="input">
              <input value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="Лёгкие и понятные миксы для первого выбора." />
            </div>
          </div>

          <div>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <div className="section-h" style={{ margin: 0 }}>Состав рейла · {draft.mixIds.length}</div>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>тяни ↕ для порядка</span>
            </div>
            <div className="col gap-2">
              {includedMixes.length === 0 && (
                <div className="empty" style={{ border: "1px dashed var(--border-default)", borderRadius: "var(--r-md)", padding: 24 }}>
                  Добавь миксы из списка справа →
                </div>
              )}
              {includedMixes.map((m, i) => (
                <div
                  key={m.id}
                  draggable
                  onDragStart={() => onDragStart(m.id)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(m.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 22px 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--r-md)",
                    cursor: "move",
                    opacity: dragSrc === m.id ? 0.5 : 1,
                  }}
                >
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>{i + 1}</span>
                  <span style={{ color: "var(--text-faint)" }}>
                    <Lucide name="drag" size={14} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{m.name}</div>
                    <div className="cell-meta cell-truncate">{m.description}</div>
                  </div>
                  <div className="row gap-2">
                    {!m.available && <Tag tone="danger">блокирован</Tag>}
                    {!m.guestVisible && m.available && <Tag>скрыт</Tag>}
                    <IconButton name="chevronUp" title="Выше" onClick={() => move(m.id, -1)} />
                    <IconButton name="chevronDown" title="Ниже" onClick={() => move(m.id, 1)} />
                    <IconButton name="x" title="Убрать" onClick={() => remove(m.id)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MIDDLE: mix picker */}
        <div>
          <div className="section-h">Добавить миксы</div>
          <div style={{ marginBottom: 8 }}>
            <SearchInput value={pickerQ} onChange={setPickerQ} placeholder="Поиск микса…" />
          </div>
          <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--r-md)", maxHeight: 460, overflow: "auto" }}>
            {available.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 28px",
                  gap: 10,
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                }}
                onClick={() => add(m.id)}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: "var(--fs-md)" }}>{m.name}</div>
                  <div className="cell-meta cell-truncate">{m.description}</div>
                </div>
                <div className="lib-item__action"><Lucide name="plus" size={14} /></div>
              </div>
            ))}
            {available.length === 0 && (
              <div className="empty" style={{ padding: 20 }}>Все миксы уже в рейле.</div>
            )}
          </div>
        </div>

        {/* RIGHT: guest preview */}
        <div>
          <div className="section-h">Как увидит гость</div>
          <div className="guest-preview">
            <div className="guest-preview__phone">
              <div className="guest-rail">
                <h4 className="guest-rail__title">{draft.name || "Название рейла"}</h4>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{draft.description}</div>
                <div className="guest-rail__strip">
                  {includedMixes.slice(0, 6).map((m) => (
                    <div key={m.id} className="guest-card">
                      <div className="guest-card__art" />
                      <div className="guest-card__name">{m.name}</div>
                      <div className="guest-card__desc">{m.description}</div>
                    </div>
                  ))}
                  {includedMixes.length === 0 && (
                    <div style={{ fontSize: 11, color: "var(--text-faint)", padding: "20px 0" }}>
                      Пока пусто. Добавь миксы — гость увидит здесь.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

window.NomadScreens = { MixesList, TobaccosList, TobaccoEditor, RailsList, RailEditor };
