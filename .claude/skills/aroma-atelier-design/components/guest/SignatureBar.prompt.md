A mix's flavour fingerprint — equal-width profile colour segments, always directly under the mix name.

```jsx
<SignatureBar profiles={mix.flavorProfiles} height={6} />
```

Heights upstream: 3 (list rows, confirmation), 4 (mix sheet), 6 (recommendation hero). Renders nothing when `profiles` is empty — never show an empty track.
