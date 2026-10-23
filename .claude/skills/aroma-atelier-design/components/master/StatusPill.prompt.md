Topbar pill — either a runtime status readout or the ⌘K command trigger.

```jsx
<StatusPill onClick={openPalette} kbd="⌘K">Найти или сделать</StatusPill>
<StatusPill dot tone="success">Актуально</StatusPill>
```

The kbd chip hides below 768px upstream; keep the label short enough to survive that. `⌘K` here is the only kbd chip on screen — no rows of key hints under tables.
