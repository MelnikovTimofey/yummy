/* global React */
// Access screen — Daily code, Telegram operators, Staff accounts, Audit log

const { useState, useMemo, useEffect, useRef } = React;
const { DAILY_CODE, TG_BOT, OPERATORS, STAFF_USERS, AUDIT_EVENTS } = window.NomadData;
const { Button, IconButton, Lucide, Tag, Chip, Toggle, SearchInput, Drawer } = window.NomadUI;

// -------- Helpers --------
function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function relativeFromNow(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date("2026-05-24T21:45:00");
  const ms = now - d;
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  return `${days} д назад`;
}

function useCountdown(endsAt) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  // Use a "demo now" tied to the data, not real time
  const fakeNow = new Date("2026-05-24T21:45:00").getTime();
  const end = new Date(endsAt).getTime();
  const diff = Math.max(0, end - fakeNow);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const totalSpan = 24 * 3600 * 1000;
  const progress = Math.min(100, 100 - (diff / totalSpan) * 100);
  return { hours, minutes, progress };
}

// ============================================================
// Daily Code section
// ============================================================
function DailyCodeBlock({ dailyCode, bot, onRotate, onChangeRotation }) {
  const cd = useCountdown(dailyCode.endsAt);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(dailyCode.current);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(360px, 1.1fr) 1fr",
        gap: 0,
      }}>
        {/* LEFT — current code */}
        <div style={{ padding: "20px 24px", borderRight: "1px solid var(--border-subtle)" }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <div className="eyebrow" style={{ margin: 0 }}>Текущий daily code</div>
            <div className="row gap-2">
              <span className="status-pill__dot" style={{ background: "var(--success)", boxShadow: "0 0 0 3px var(--success-soft)" }} />
              <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>Активен</span>
            </div>
          </div>

          <div
            className="mono"
            style={{
              fontSize: 44,
              fontWeight: 500,
              letterSpacing: "0.02em",
              color: "var(--text-primary)",
              lineHeight: 1.1,
              padding: "4px 0",
            }}
          >
            {dailyCode.current}
          </div>

          <div className="row gap-2" style={{ marginTop: 14 }}>
            <Button icon={copied ? "check" : "copy"} onClick={copy} variant={copied ? "primary" : undefined}>
              {copied ? "Скопировано" : "Скопировать"}
            </Button>
            <Button variant="ghost" icon="refresh" onClick={onRotate}>Ротировать сейчас</Button>
            <div style={{ flex: 1 }} />
            <span className="kbd">⌘C</span>
          </div>

          {/* Countdown */}
          <div style={{ marginTop: 20 }}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
                Истекает {formatDateTime(dailyCode.endsAt)}
              </span>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                осталось {cd.hours}ч {cd.minutes}м
              </span>
            </div>
            <div style={{
              height: 4,
              background: "var(--bg-elevated)",
              borderRadius: 999,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${cd.progress}%`,
                background: "linear-gradient(90deg, var(--accent), var(--accent-hover))",
              }} />
            </div>
          </div>

          {/* Rotation policy */}
          <div className="row" style={{ marginTop: 18, gap: 12, padding: "10px 12px", background: "var(--bg-base)", borderRadius: "var(--r-md)", border: "1px solid var(--border-subtle)" }}>
            <Lucide name="history" size={14} />
            <div style={{ flex: 1, fontSize: "var(--fs-sm)" }}>
              <div style={{ color: "var(--text-primary)" }}>
                {dailyCode.rotationMode === "auto" ? "Автоматическая ротация" : "Ручная ротация"}
              </div>
              <div style={{ color: "var(--text-muted)", marginTop: 2 }}>
                {dailyCode.rotationMode === "auto"
                  ? `Каждый день в ${dailyCode.rotationTime}`
                  : "Без расписания — только вручную"}
              </div>
            </div>
            <div className="row gap-2">
              <Chip active={dailyCode.rotationMode === "auto"} onClick={() => onChangeRotation("auto")}>Авто</Chip>
              <Chip active={dailyCode.rotationMode === "manual"} onClick={() => onChangeRotation("manual")}>Вручную</Chip>
            </div>
          </div>
        </div>

        {/* RIGHT — bot + last activity + history */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Bot health */}
          <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "var(--success-soft)",
              display: "grid", placeItems: "center",
              color: "var(--success)",
              border: "1px solid oklch(0.75 0.13 155 / 0.4)",
            }}>
              <Lucide name="shield" size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Telegram-бот</div>
                  <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
                    Heartbeat {formatTime(bot.heartbeat)} · {relativeFromNow(bot.heartbeat)}
                  </div>
                </div>
                <Tag tone={bot.status === "healthy" ? "success" : "warning"}>
                  {bot.status === "healthy" ? "норма" : bot.status}
                </Tag>
              </div>
            </div>
          </div>

          {/* Last request */}
          <div style={{
            padding: "12px 14px",
            background: "var(--bg-base)",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--border-subtle)",
          }}>
            <div className="eyebrow" style={{ margin: 0, marginBottom: 6 }}>Последний запрос кода</div>
            {bot.lastCodeRequest ? (
              <div className="row" style={{ alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 999,
                  background: "var(--accent-soft)",
                  display: "grid", placeItems: "center",
                  color: "var(--accent)",
                  fontWeight: 600,
                  fontSize: 11,
                }}>
                  {bot.lastCodeRequest.operator[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{bot.lastCodeRequest.operator}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {bot.lastCodeRequest.chat} · {formatTime(bot.lastCodeRequest.at)}
                  </div>
                </div>
                <Tag tone="info">/code</Tag>
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>Запросов ещё не было</div>
            )}
          </div>

          {/* History */}
          <div>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <div className="eyebrow" style={{ margin: 0 }}>История окон</div>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {dailyCode.history.length} последних
              </span>
            </div>
            <div className="col" style={{ gap: 4 }}>
              {dailyCode.history.slice(0, 4).map((h) => (
                <div key={h.code} className="row" style={{ gap: 12, padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <span className="mono" style={{ fontSize: 12, color: "var(--text-secondary)", minWidth: 110 }}>{h.code}</span>
                  <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", flex: 1 }}>{h.day}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {h.verified}/{h.requests} <span style={{ color: "var(--text-faint)" }}>подтв.</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Operators block — Telegram allowlist
// ============================================================
function OperatorsBlock({ operators, onAdd, onEdit, onResend, onToggle, onDelete }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | pending | inactive

  const filtered = useMemo(() => {
    let list = operators.slice();
    if (filter === "active") list = list.filter((o) => o.active && o.chatBound);
    if (filter === "pending") list = list.filter((o) => o.active && !o.chatBound);
    if (filter === "inactive") list = list.filter((o) => !o.active);
    if (q.trim()) {
      const Q = q.toLowerCase();
      list = list.filter((o) =>
        o.name.toLowerCase().includes(Q) ||
        o.phone.includes(Q) ||
        (o.chatHandle || "").toLowerCase().includes(Q)
      );
    }
    return list;
  }, [operators, filter, q]);

  const counts = {
    all: operators.length,
    active: operators.filter((o) => o.active && o.chatBound).length,
    pending: operators.filter((o) => o.active && !o.chatBound).length,
    inactive: operators.filter((o) => !o.active).length,
  };

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="row" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)", justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow" style={{ margin: 0 }}>Telegram-операторы</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500, marginTop: 2 }}>
            Allowlist для daily code
          </div>
        </div>
        <Button variant="primary" icon="plus" onClick={onAdd}>Добавить оператора</Button>
      </div>

      <div className="toolbar" style={{ borderRadius: 0, background: "var(--bg-raised)" }}>
        <div className="toolbar__search">
          <SearchInput value={q} onChange={setQ} placeholder="Имя, телефон или @username" />
        </div>
        <Chip active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>Все</Chip>
        <Chip active={filter === "active"} onClick={() => setFilter("active")} count={counts.active}>Активны</Chip>
        <Chip active={filter === "pending"} onClick={() => setFilter("pending")} count={counts.pending}>Ждут привязки</Chip>
        <Chip active={filter === "inactive"} onClick={() => setFilter("inactive")} count={counts.inactive}>Выключены</Chip>
      </div>

      <div className="list__head" style={{ gridTemplateColumns: "32px minmax(180px, 1.2fr) 160px minmax(180px, 1fr) 120px 56px 110px", borderRadius: 0 }}>
        <div></div>
        <div>Оператор</div>
        <div>Телефон</div>
        <div>Telegram</div>
        <div>Последний код</div>
        <div style={{ textAlign: "center" }}>Вкл.</div>
        <div style={{ textAlign: "right" }}>Действия</div>
      </div>

      {filtered.map((op) => (
        <div
          key={op.id}
          className="list__row"
          data-pinned-actions
          style={{ gridTemplateColumns: "32px minmax(180px, 1.2fr) 160px minmax(180px, 1fr) 120px 56px 110px" }}
        >
          <div>
            <div style={{
              width: 26, height: 26, borderRadius: 999,
              background: op.chatBound ? "var(--accent-soft)" : "var(--bg-elevated)",
              color: op.chatBound ? "var(--accent)" : "var(--text-muted)",
              display: "grid", placeItems: "center",
              fontWeight: 600,
              fontSize: 11,
              border: "1px solid var(--border-subtle)",
            }}>
              {op.name[0]}
            </div>
          </div>
          <div className="cell-primary">
            <div>
              <div>{op.name}</div>
              <div className="cell-primary__sub" style={{ marginTop: 2 }}>{op.role}</div>
            </div>
          </div>
          <div className="cell-meta mono" style={{ fontSize: 12 }}>
            {op.phone}
          </div>
          <div>
            {op.chatBound ? (
              <div className="row gap-2">
                <Tag tone="success">привязан</Tag>
                <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{op.chatHandle}</span>
              </div>
            ) : (
              <div className="row gap-2">
                <Tag tone="warning">ждёт /start</Tag>
                <button
                  className="chip"
                  onClick={() => onResend(op)}
                  style={{ fontSize: "var(--fs-sm)" }}
                >
                  <Lucide name="link" size={11} /> Ссылка на бота
                </button>
              </div>
            )}
          </div>
          <div className="cell-meta" style={{ fontSize: "var(--fs-sm)" }}>
            {op.lastCodeAt ? relativeFromNow(op.lastCodeAt) : <span style={{ color: "var(--text-faint)" }}>—</span>}
          </div>
          <div style={{ textAlign: "center" }}>
            <Toggle on={op.active} onChange={() => onToggle(op.id)} title="Активен" />
          </div>
          <div className="row-actions">
            <IconButton name="edit" title="Редактировать" onClick={() => onEdit(op)} />
            <IconButton name="trash" title="Удалить" onClick={() => onDelete(op.id)} />
            <IconButton name="more" title="Ещё" />
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="empty">
          <div className="empty__title">Никого не нашли</div>
          <div>Измените фильтр или добавьте нового оператора.</div>
        </div>
      )}

      {/* How it works strip — collapsed into one line */}
      <div className="row" style={{
        padding: "10px 18px",
        background: "var(--bg-base)",
        borderTop: "1px solid var(--border-subtle)",
        gap: 16,
        color: "var(--text-muted)",
        fontSize: "var(--fs-sm)",
      }}>
        <Lucide name="link" size={12} />
        <span><strong style={{ color: "var(--text-secondary)" }}>1.</strong> Добавь оператора</span>
        <span style={{ color: "var(--text-faint)" }}>→</span>
        <span><strong style={{ color: "var(--text-secondary)" }}>2.</strong> Оператор пишет боту и шлёт контакт</span>
        <span style={{ color: "var(--text-faint)" }}>→</span>
        <span><strong style={{ color: "var(--text-secondary)" }}>3.</strong> Бот привязывает chat по номеру</span>
        <span style={{ color: "var(--text-faint)" }}>→</span>
        <span><strong style={{ color: "var(--text-secondary)" }}>4.</strong> Команда /code выдаёт актуальный код</span>
      </div>
    </div>
  );
}

// ============================================================
// Staff accounts block
// ============================================================
function StaffBlock({ staff, onAdd, onEdit, onToggle, onDelete }) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="row" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)", justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow" style={{ margin: 0 }}>Master-учётки</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500, marginTop: 2 }}>
            Доступ к Nomad Master
          </div>
        </div>
        <Button variant="primary" icon="plus" onClick={onAdd}>Создать сотрудника</Button>
      </div>

      <div className="list__head" style={{ gridTemplateColumns: "32px minmax(160px, 1fr) minmax(120px, 0.8fr) 110px 140px 56px 80px", borderRadius: 0 }}>
        <div></div>
        <div>Имя</div>
        <div>Логин</div>
        <div>Роль</div>
        <div>Последний вход</div>
        <div style={{ textAlign: "center" }}>Вкл.</div>
        <div style={{ textAlign: "right" }}>Действия</div>
      </div>

      {staff.map((u) => (
        <div
          key={u.id}
          className="list__row"
          data-pinned-actions
          style={{ gridTemplateColumns: "32px minmax(160px, 1fr) minmax(120px, 0.8fr) 110px 140px 56px 80px" }}
        >
          <div>
            <div style={{
              width: 26, height: 26, borderRadius: 8,
              background: u.role === "admin"
                ? "linear-gradient(135deg, var(--accent), oklch(0.5 0.12 30))"
                : "var(--bg-elevated)",
              color: u.role === "admin" ? "var(--accent-fg)" : "var(--text-secondary)",
              display: "grid", placeItems: "center",
              fontWeight: 600,
              fontSize: 11,
              border: u.role === "admin" ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
            }}>
              {u.name[0]}
            </div>
          </div>
          <div className="cell-primary">{u.name}</div>
          <div className="cell-meta mono" style={{ fontSize: 12 }}>{u.login}</div>
          <div>
            <Tag tone={u.role === "admin" ? "accent" : undefined}>
              {u.role === "admin" ? "admin" : "staff"}
            </Tag>
          </div>
          <div className="cell-meta" style={{ fontSize: "var(--fs-sm)" }}>
            {relativeFromNow(u.lastLoginAt)}
          </div>
          <div style={{ textAlign: "center" }}>
            <Toggle on={u.active} onChange={() => onToggle(u.id)} title="Активен" />
          </div>
          <div className="row-actions">
            <IconButton name="edit" title="Редактировать" onClick={() => onEdit(u)} />
            <IconButton name="trash" title="Удалить" onClick={() => onDelete(u.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Audit log block
// ============================================================
function AuditBlock({ events }) {
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    if (filter === "system") return events.filter((e) => e.actor === "система");
    if (filter === "people") return events.filter((e) => e.actor !== "система");
    return events;
  }, [events, filter]);

  const iconByKind = {
    code_issued: "shield",
    code_rotated: "refresh",
    login: "enter",
    operator_added: "plus",
    tobacco_added: "boxes",
    mix_visibility: "eye",
    stock: "package",
    rail_edit: "rail",
  };

  // Group by day
  const groups = useMemo(() => {
    const out = {};
    filtered.forEach((e) => {
      const d = new Date(e.at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
      (out[d] = out[d] || []).push(e);
    });
    return out;
  }, [filtered]);

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="row" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)", justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow" style={{ margin: 0 }}>Журнал изменений</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500, marginTop: 2 }}>
            Что происходило в системе
          </div>
        </div>
        <div className="row gap-2">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>Все</Chip>
          <Chip active={filter === "system"} onClick={() => setFilter("system")}>Система</Chip>
          <Chip active={filter === "people"} onClick={() => setFilter("people")}>Люди</Chip>
          <Button variant="ghost" size="sm" icon="filter">/staff/audit/events</Button>
        </div>
      </div>

      <div style={{ maxHeight: 420, overflow: "auto" }}>
        {Object.entries(groups).map(([day, items]) => (
          <div key={day}>
            <div style={{
              padding: "8px 18px",
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
              background: "var(--bg-base)",
              borderBottom: "1px solid var(--border-subtle)",
              borderTop: "1px solid var(--border-subtle)",
            }}>
              {day}
            </div>
            {items.map((e, idx) => (
              <div
                key={idx}
                className="row"
                style={{
                  padding: "10px 18px",
                  gap: 12,
                  borderBottom: idx < items.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  alignItems: "flex-start",
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 8,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  display: "grid", placeItems: "center",
                  color: e.actor === "система" ? "var(--text-muted)" : "var(--accent)",
                  flexShrink: 0,
                }}>
                  <Lucide name={iconByKind[e.kind] || "history"} size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fs-md)", color: "var(--text-primary)" }}>
                    {e.text}
                  </div>
                  <div className="row gap-2" style={{ marginTop: 2, fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
                    <span className="mono">{formatTime(e.at)}</span>
                    <span style={{ color: "var(--text-faint)" }}>·</span>
                    <span>{e.actor}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Operator editor (drawer)
// ============================================================
function OperatorEditor({ open, operator, onClose, onSave }) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (open) {
      setDraft({
        id: operator?.id || null,
        name: operator?.name || "",
        phone: operator?.phone || "+7",
        role: operator?.role || "Кальянный мастер",
        active: operator?.active ?? true,
      });
    }
  }, [open, operator]);

  if (!draft) return null;
  const isCreate = !draft.id;
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={isCreate ? "Новый оператор" : "Редактирование"}
      title={isCreate ? "Добавить оператора" : draft.name}
      footer={
        <React.Fragment>
          <div style={{ flex: 1 }}>
            {!isCreate && <Button variant="danger" icon="trash">Удалить</Button>}
          </div>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button variant="primary" icon="check" onClick={() => onSave(draft)}>
            {isCreate ? "Добавить" : "Сохранить"}
          </Button>
        </React.Fragment>
      }
    >
      <div className="col gap-4">
        <div className="row" style={{
          gap: 12,
          padding: "12px 14px",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-raised)",
        }}>
          <div style={{ flex: 1 }}>
            <div className="section-h">Активен</div>
            <div className="row gap-2">
              <Toggle on={draft.active} onChange={(v) => set("active", v)} title="Активен" />
              <span style={{ color: draft.active ? "var(--success)" : "var(--text-muted)" }}>
                {draft.active ? "Получит код по запросу" : "Не получит код"}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="field-label">Имя</label>
          <div className="input input--lg">
            <input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Анна" />
          </div>
        </div>

        <div className="row gap-3">
          <div style={{ flex: 1 }}>
            <label className="field-label">Телефон (с кодом страны)</label>
            <div className="input">
              <input
                value={draft.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+79991234567"
                inputMode="tel"
              />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label">Роль</label>
            <div className="input">
              <select value={draft.role} onChange={(e) => set("role", e.target.value)}>
                <option>Кальянный мастер</option>
                <option>Администратор зала</option>
                <option>Бариста</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{
          padding: "12px 14px",
          background: "var(--info-soft)",
          borderRadius: "var(--r-md)",
          border: "1px solid oklch(0.72 0.1 230 / 0.4)",
          fontSize: "var(--fs-sm)",
          color: "var(--text-secondary)",
        }}>
          <div className="row gap-2" style={{ marginBottom: 4 }}>
            <Lucide name="link" size={12} />
            <strong>Как привязать чат</strong>
          </div>
          Отправь оператору ссылку <span className="mono" style={{ color: "var(--text-primary)" }}>t.me/nomad_master_bot?start={draft.phone.replace(/\D/g, "") || "phone"}</span>.
          После /start и команды «Поделиться контактом» бот сам свяжет chat с этим номером.
        </div>
      </div>
    </Drawer>
  );
}

// ============================================================
// Staff editor (drawer)
// ============================================================
function StaffEditor({ open, user, onClose, onSave }) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (open) {
      setDraft({
        id: user?.id || null,
        name: user?.name || "",
        login: user?.login || "",
        role: user?.role || "nomad",
        active: user?.active ?? true,
        password: "",
      });
    }
  }, [open, user]);

  if (!draft) return null;
  const isCreate = !draft.id;
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={isCreate ? "Новый сотрудник" : "Редактирование"}
      title={isCreate ? "Создать сотрудника" : draft.name}
      footer={
        <React.Fragment>
          <div style={{ flex: 1 }}>
            {!isCreate && <Button variant="danger" icon="trash">Удалить</Button>}
          </div>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button variant="primary" icon="check" onClick={() => onSave(draft)}>
            {isCreate ? "Создать" : "Сохранить"}
          </Button>
        </React.Fragment>
      }
    >
      <div className="col gap-4">
        <div className="row" style={{
          gap: 12,
          padding: "12px 14px",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-raised)",
        }}>
          <div style={{ flex: 1 }}>
            <div className="section-h">Активен</div>
            <div className="row gap-2">
              <Toggle on={draft.active} onChange={(v) => set("active", v)} title="Активен" />
              <span style={{ color: draft.active ? "var(--success)" : "var(--text-muted)" }}>
                {draft.active ? "Сможет войти в Master" : "Доступ закрыт"}
              </span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="section-h">Роль</div>
            <div className="row gap-2">
              <Chip active={draft.role === "admin"} onClick={() => set("role", "admin")}>Admin</Chip>
              <Chip active={draft.role === "nomad"} onClick={() => set("role", "nomad")}>Staff</Chip>
            </div>
          </div>
        </div>

        <div className="row gap-3">
          <div style={{ flex: 1 }}>
            <label className="field-label">Имя</label>
            <div className="input">
              <input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Кальянный мастер" />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label">Логин</label>
            <div className="input">
              <input
                value={draft.login}
                onChange={(e) => set("login", e.target.value.toLowerCase())}
                placeholder="nomad"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="field-label">Пароль · {isCreate ? "обязательно" : "оставь пустым, если не меняешь"}</label>
          <div className="input">
            <input
              type="password"
              value={draft.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder={isCreate ? "Придумай надёжный пароль" : "Без изменений"}
            />
          </div>
        </div>

        {draft.role === "admin" && (
          <div style={{
            padding: "10px 14px",
            background: "var(--warning-soft)",
            borderRadius: "var(--r-md)",
            border: "1px solid oklch(0.82 0.13 75 / 0.4)",
            fontSize: "var(--fs-sm)",
            color: "var(--text-secondary)",
          }}>
            <div className="row gap-2">
              <Lucide name="warning" size={12} />
              <span>
                <strong style={{ color: "var(--warning)" }}>Admin</strong> может управлять всем — каталогом, staff-учётками, daily code и журналом.
              </span>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

// ============================================================
// Main AccessView
// ============================================================
function AccessView() {
  const [dailyCode, setDailyCode] = useState(DAILY_CODE);
  const [bot] = useState(TG_BOT);
  const [operators, setOperators] = useState(OPERATORS);
  const [staff, setStaff] = useState(STAFF_USERS);
  const [events, setEvents] = useState(AUDIT_EVENTS);

  const [opEdit, setOpEdit] = useState({ open: false, data: null });
  const [staffEdit, setStaffEdit] = useState({ open: false, data: null });

  const rotateCode = () => {
    const newCode = `NOMAD-${Math.floor(1000 + Math.random() * 9000)}`;
    setDailyCode((c) => ({ ...c, current: newCode }));
    setEvents((curr) => [
      { at: new Date().toISOString(), actor: "admin", kind: "code_rotated", text: `Daily code обновлён вручную: ${newCode}` },
      ...curr,
    ]);
  };

  const changeRotation = (mode) => setDailyCode((c) => ({ ...c, rotationMode: mode }));

  const saveOperator = (draft) => {
    setOperators((curr) => {
      if (draft.id) return curr.map((o) => (o.id === draft.id ? { ...o, ...draft } : o));
      return [...curr, {
        id: `op-${Date.now()}`,
        ...draft,
        chatBound: false,
        chatHandle: null,
        lastCodeAt: null,
        addedAt: new Date().toISOString().slice(0, 10),
      }];
    });
    setEvents((curr) => [
      { at: new Date().toISOString(), actor: "admin", kind: "operator_added", text: `${draft.id ? "Обновлён" : "Добавлен"} оператор ${draft.name}` },
      ...curr,
    ]);
    setOpEdit({ open: false, data: null });
  };

  const toggleOp = (id) => setOperators((curr) => curr.map((o) => (o.id === id ? { ...o, active: !o.active } : o)));
  const deleteOp = (id) => setOperators((curr) => curr.filter((o) => o.id !== id));
  const resendInvite = (op) => {
    // pretend to send
    alert(`Ссылка отправлена ${op.name} (${op.phone})`);
  };

  const saveStaff = (draft) => {
    setStaff((curr) => {
      if (draft.id) return curr.map((u) => (u.id === draft.id ? { ...u, ...draft } : u));
      return [...curr, {
        id: `u-${Date.now()}`,
        ...draft,
        lastLoginAt: null,
      }];
    });
    setStaffEdit({ open: false, data: null });
  };
  const toggleStaffActive = (id) => setStaff((curr) => curr.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
  const deleteStaff = (id) => setStaff((curr) => curr.filter((u) => u.id !== id));

  // Page-level metrics
  const m = useMemo(() => ({
    activeOps: operators.filter((o) => o.active && o.chatBound).length,
    pendingOps: operators.filter((o) => o.active && !o.chatBound).length,
    staffCount: staff.length,
    events24h: events.filter((e) => Date.now() - new Date(e.at).getTime() < 86400000).length,
  }), [operators, staff, events]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Доступ</div>
          <h1 className="page-title">Daily code и staff</h1>
          <div className="page-subtitle">Управление гостевым кодом, операторами Telegram-бота и учётками Master.</div>
        </div>
        <div className="row gap-2">
          <Button variant="ghost" icon="history">/staff/audit/events</Button>
        </div>
      </div>

      <div className="stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="stat">
          <div className="stat__label">Активный код</div>
          <div className="stat__value mono" style={{ fontSize: 22 }}>{dailyCode.current}</div>
          <div className="stat__sub">до {formatDateTime(dailyCode.endsAt)}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Операторы</div>
          <div className="stat__value" style={{ color: "var(--success)" }}>{m.activeOps}</div>
          <div className="stat__sub">{m.pendingOps > 0 ? `+${m.pendingOps} ждут привязки` : "все привязаны"}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Master-учётки</div>
          <div className="stat__value">{m.staffCount}</div>
          <div className="stat__sub">с доступом в систему</div>
        </div>
        <div className="stat">
          <div className="stat__label">События за сутки</div>
          <div className="stat__value">{m.events24h}</div>
          <div className="stat__sub">в журнале</div>
        </div>
      </div>

      <div className="col gap-4" style={{ gap: 16 }}>
        <DailyCodeBlock
          dailyCode={dailyCode}
          bot={bot}
          onRotate={rotateCode}
          onChangeRotation={changeRotation}
        />

        <OperatorsBlock
          operators={operators}
          onAdd={() => setOpEdit({ open: true, data: null })}
          onEdit={(o) => setOpEdit({ open: true, data: o })}
          onResend={resendInvite}
          onToggle={toggleOp}
          onDelete={deleteOp}
        />

        <StaffBlock
          staff={staff}
          onAdd={() => setStaffEdit({ open: true, data: null })}
          onEdit={(u) => setStaffEdit({ open: true, data: u })}
          onToggle={toggleStaffActive}
          onDelete={deleteStaff}
        />

        <AuditBlock events={events} />
      </div>

      <OperatorEditor
        open={opEdit.open}
        operator={opEdit.data}
        onClose={() => setOpEdit({ open: false, data: null })}
        onSave={saveOperator}
      />

      <StaffEditor
        open={staffEdit.open}
        user={staffEdit.data}
        onClose={() => setStaffEdit({ open: false, data: null })}
        onSave={saveStaff}
      />
    </div>
  );
}

window.NomadAccessView = AccessView;
