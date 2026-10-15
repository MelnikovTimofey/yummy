/* global React */
// Command Palette (⌘K) — fast navigation + quick actions

const { useState, useEffect, useMemo, useRef } = React;
const { Lucide } = window.NomadUI;

function CommandPalette({ open, onClose, mixes, tobaccos, onGoto, onOpenMix, onCreateMix, onCreateTobacco, onOpenRail, rails }) {
  const [q, setQ] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const items = useMemo(() => {
    const out = [];
    const Q = q.toLowerCase();

    // Quick actions
    const actions = [
      { id: "new-mix", icon: "plus", label: "Новый микс", hint: "⌘N", group: "Действия", run: () => onCreateMix() },
      { id: "new-tobacco", icon: "package", label: "Новый табак", hint: "⌘⇧N", group: "Действия", run: () => onCreateTobacco() },
      { id: "goto-dashboard", icon: "gauge", label: "Перейти: Дашборд", group: "Навигация", run: () => onGoto("dashboard") },
      { id: "goto-mixes", icon: "layers", label: "Перейти: Миксы", group: "Навигация", run: () => onGoto("mixes") },
      { id: "goto-tobaccos", icon: "boxes", label: "Перейти: Табаки", group: "Навигация", run: () => onGoto("tobaccos") },
      { id: "goto-rails", icon: "rail", label: "Перейти: Рейлы", group: "Навигация", run: () => onGoto("rails") },
      { id: "goto-access", icon: "shield", label: "Перейти: Доступ", group: "Навигация", run: () => onGoto("access") },
    ];
    actions.forEach((a) => {
      if (!Q || a.label.toLowerCase().includes(Q)) out.push(a);
    });

    if (Q) {
      mixes.forEach((m) => {
        if (m.name.toLowerCase().includes(Q) || m.description.toLowerCase().includes(Q)) {
          out.push({ id: `m:${m.id}`, icon: "layers", label: m.name, hint: "микс", group: "Миксы", run: () => onOpenMix(m) });
        }
      });
      tobaccos.forEach((t) => {
        if (t.name.toLowerCase().includes(Q) || t.manufacturer.toLowerCase().includes(Q)) {
          out.push({ id: `t:${t.id}`, icon: "boxes", label: t.name, hint: t.manufacturer, group: "Табаки", run: () => onGoto("tobaccos") });
        }
      });
      rails.forEach((r) => {
        if (r.name.toLowerCase().includes(Q)) {
          out.push({ id: `r:${r.id}`, icon: "rail", label: r.name, hint: "рейл", group: "Рейлы", run: () => onOpenRail(r) });
        }
      });
    }
    return out;
  }, [q, mixes, tobaccos, rails, onCreateMix, onCreateTobacco, onGoto, onOpenMix, onOpenRail]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = items[activeIndex];
        if (item) {
          item.run();
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, items, activeIndex, onClose]);

  if (!open) return null;

  // group items
  const grouped = items.reduce((acc, it) => {
    (acc[it.group] = acc[it.group] || []).push(it);
    return acc;
  }, {});

  let runningIdx = -1;

  return (
    <div className="cmdk-scrim" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk__input">
          <Lucide name="command" size={16} />
          <input
            ref={inputRef}
            placeholder="Что нужно сделать? — миксы, табаки, рейлы, действия"
            value={q}
            onChange={(e) => { setQ(e.target.value); setActiveIndex(0); }}
          />
          <span className="kbd">esc</span>
        </div>
        <div className="cmdk__list">
          {Object.keys(grouped).map((g) => (
            <div key={g}>
              <div className="cmdk__group-label">{g}</div>
              {grouped[g].map((it) => {
                runningIdx++;
                const idx = runningIdx;
                return (
                  <div
                    key={it.id}
                    className="cmdk__item"
                    data-active={idx === activeIndex}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => { it.run(); onClose(); }}
                  >
                    <Lucide name={it.icon} size={14} />
                    <span>{it.label}</span>
                    {it.hint && <span className="cmdk__item__hint">{it.hint}</span>}
                  </div>
                );
              })}
            </div>
          ))}
          {items.length === 0 && (
            <div className="empty" style={{ padding: "32px 16px" }}>
              <div className="empty__title">Ничего не нашёл</div>
              <div>Попробуй другой запрос.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.NomadCmdK = CommandPalette;
