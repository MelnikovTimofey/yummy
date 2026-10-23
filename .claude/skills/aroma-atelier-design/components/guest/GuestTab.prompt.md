Quiet tab (`.tab` upstream) for the pre-onboarding journey nav: graphite when active, with a bordeaux mark. Sentence case.

```jsx
<GuestTab active>Знакомство</GuestTab>
<GuestTab onClick={go}>Предпочтения</GuestTab>
```

Use `GuestTab` on the intro/onboarding route, where tabs sit in a two-up row. The main app sections live in the bottom icon bar (#168), not in tabs.
