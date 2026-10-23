A mix's flavour fingerprint — equal-width profile colour segments, always directly under the mix name.

```jsx
<SignatureBar profiles={mix.flavorProfiles} height={6} />
```

Where: recommendation hero (6), mix sheet (4), card for the master (3), Витрина poster bottom edge (2). Not in list rows — there the glyph carries the colour. Renders nothing when `profiles` is empty — never show an empty track.
