# Nomad Accessibility Review Reference

## Aroma

Check at least:

1. access code flow is keyboard reachable from input to `18+` checkbox to CTA;
2. intro and onboarding buttons have clear labels and visible focus;
3. mobile text remains readable without overly dense cards or tiny controls;
4. catalog filters and modal actions remain usable in narrow viewports.

## Master

Check at least:

1. login form fields are clearly labeled;
2. workspace tabs and CRUD actions are keyboard reachable;
3. admin-only restrictions remain understandable for `nomad` role;
4. forbidden panels do not expose admin data through confusing or misleading UI.

## Shared Nomad Checks

1. primary actions are distinguishable from secondary actions;
2. contrast supports readable Russian UI copy;
3. error and helper text are understandable without extra context;
4. focus does not disappear on modal open, tab switch, or form submit;
5. review output states what was checked and what remained unverified.
