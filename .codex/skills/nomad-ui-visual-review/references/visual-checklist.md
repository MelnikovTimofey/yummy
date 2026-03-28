# Nomad UI Visual Review Reference

## Product Tone Map

### Aroma Atelier

Target impression:

1. guest-facing;
2. mobile-first;
3. atmospheric `Nomad Lounge`;
4. burgundy / amber palette;
5. serif-led brand moments with warm surfaces.

Common failure modes:

1. generic dark-template look;
2. too many equally loud accents;
3. actions that overpower content rhythm;
4. catalog or modal controls that become hard to use on mobile.

### Master

Target impression:

1. operational console;
2. clearer hierarchy for staff/admin tasks;
3. more functional than lounge-like;
4. same Nomad family, but in a more structured and utilitarian rhythm.

Common failure modes:

1. looking like a marketing UI instead of a control surface;
2. admin-only surfaces not visually distinguished enough;
3. overly decorative treatment that reduces operational clarity.

## Review Checklist

### Layout and rhythm

1. Are major sections aligned and evenly spaced?
2. Do sticky panels, action rows, and modal headers sit in the right visual order?
3. Does the mobile viewport preserve CTA visibility and reading flow?

### Typography

1. Are heading levels visually distinct?
2. Are chips, tags, helper text, and section labels consistent?
3. In Aroma, is serif/display usage deliberate rather than random?

### Components

1. Do buttons of the same role look related?
2. Are cards, filters, tabs, and modals using a shared visual grammar?
3. Are icon, label, and badge alignments visually stable?

### Palette and contrast

1. Does the changed surface match the established app palette?
2. Is CTA emphasis appropriate, not louder than everything else?
3. Are text and controls readable against their backgrounds?

### State quality

1. Do selected, active, disabled, and error states look intentional?
2. Are empty/loading/error panels integrated into the same visual language?
3. Does the screen avoid unfinished or default-looking elements?

## Verification Inputs

Use any combination that is available:

1. screenshots;
2. Playwright artifacts;
3. manual browser smoke in the target viewport;
4. direct code review of changed UI files.

If visual evidence is incomplete, say which states or viewports were not checked.
