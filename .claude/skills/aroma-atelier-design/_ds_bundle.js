/* @ds-bundle: {"format":4,"namespace":"DesignSystem_1aef33","components":[{"name":"AccessCodeInput","sourcePath":"components/guest/AccessCodeInput.jsx"},{"name":"AromaCTA","sourcePath":"components/guest/AromaCTA.jsx"},{"name":"AromaChip","sourcePath":"components/guest/AromaChip.jsx"},{"name":"CompositionStack","sourcePath":"components/guest/CompositionStack.jsx"},{"name":"GuestCard","sourcePath":"components/guest/GuestCard.jsx"},{"name":"GuestTab","sourcePath":"components/guest/GuestTab.jsx"},{"name":"MixRow","sourcePath":"components/guest/MixRow.jsx"},{"name":"OnboardingProgress","sourcePath":"components/guest/OnboardingProgress.jsx"},{"name":"ProfileCard","sourcePath":"components/guest/ProfileCard.jsx"},{"name":"ProfileGlyph","sourcePath":"components/guest/ProfileGlyph.jsx"},{"name":"RatingPill","sourcePath":"components/guest/RatingPill.jsx"},{"name":"SegmentNav","sourcePath":"components/guest/SegmentNav.jsx"},{"name":"ShowcaseCard","sourcePath":"components/guest/ShowcaseCard.jsx"},{"name":"SignatureBar","sourcePath":"components/guest/SignatureBar.jsx"},{"name":"EmptyState","sourcePath":"components/master/EmptyState.jsx"},{"name":"FilterChip","sourcePath":"components/master/FilterChip.jsx"},{"name":"MasterButton","sourcePath":"components/master/MasterButton.jsx"},{"name":"MasterCard","sourcePath":"components/master/MasterCard.jsx"},{"name":"MasterIconButton","sourcePath":"components/master/MasterIconButton.jsx"},{"name":"MasterInput","sourcePath":"components/master/MasterInput.jsx"},{"name":"MasterList","sourcePath":"components/master/MasterList.jsx"},{"name":"MasterPageHeader","sourcePath":"components/master/MasterPageHeader.jsx"},{"name":"MasterSortPill","sourcePath":"components/master/MasterSortPill.jsx"},{"name":"MasterStatsRow","sourcePath":"components/master/MasterStatsRow.jsx"},{"name":"MasterTag","sourcePath":"components/master/MasterTag.jsx"},{"name":"MasterToggle","sourcePath":"components/master/MasterToggle.jsx"},{"name":"MasterTopBar","sourcePath":"components/master/MasterTopBar.jsx"},{"name":"StatusPill","sourcePath":"components/master/StatusPill.jsx"}],"sourceHashes":{"components/guest/AccessCodeInput.jsx":"3c28e8a1a0a7","components/guest/AromaCTA.jsx":"74fa9fb65a2d","components/guest/AromaChip.jsx":"f5cacf379c55","components/guest/CompositionStack.jsx":"014fbbecfbe9","components/guest/GuestCard.jsx":"bc7a355b7168","components/guest/GuestTab.jsx":"324ea1ace990","components/guest/MixRow.jsx":"9076eab731a8","components/guest/OnboardingProgress.jsx":"19b5b3545830","components/guest/ProfileCard.jsx":"5a6af41d8307","components/guest/ProfileGlyph.jsx":"870d1cf28c07","components/guest/RatingPill.jsx":"7a98b5018446","components/guest/SegmentNav.jsx":"66a42206d513","components/guest/ShowcaseCard.jsx":"1ecc7593de3d","components/guest/SignatureBar.jsx":"d565a356e122","components/master/EmptyState.jsx":"62c565135c7f","components/master/FilterChip.jsx":"1c8aea0a3a37","components/master/MasterButton.jsx":"68fc0867cbb9","components/master/MasterCard.jsx":"e86c412054ea","components/master/MasterIconButton.jsx":"acfa08a55647","components/master/MasterInput.jsx":"0735f8fbfc8b","components/master/MasterList.jsx":"85f6989a3f7d","components/master/MasterPageHeader.jsx":"c795b42dc299","components/master/MasterSortPill.jsx":"e3cd2defb423","components/master/MasterStatsRow.jsx":"fb6ca7ea16d6","components/master/MasterTag.jsx":"ce360a2c206a","components/master/MasterToggle.jsx":"916a13724f1a","components/master/MasterTopBar.jsx":"40d20e0177fa","components/master/StatusPill.jsx":"4965e9b5d117","ui_kits/aroma-guest/GuestApp.jsx":"b88c06efbcdb","ui_kits/aroma-guest/GuestScreens.jsx":"55d43d0d9c15","ui_kits/aroma-guest/mock-data.js":"137a193badbc","ui_kits/master/MasterApp.jsx":"bc84ff3c8365","ui_kits/master/MasterScreens.jsx":"030daa61aecc","ui_kits/master/mock-data.js":"7bbed34b2303"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DesignSystem_1aef33 = window.DesignSystem_1aef33 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/guest/AccessCodeInput.jsx
try { (() => {
// Daily-code field: no box, one hairline underline, huge tracked serif digits.
function AccessCodeInput({
  value,
  onChange,
  label = 'Код мастера',
  hint = 'Код скажет мастер зала. Он действует до 06:00.',
  maxLength = 4,
  id = 'guest-access-code'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      textAlign: 'left',
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    id: id,
    type: "text",
    inputMode: "numeric",
    pattern: "[0-9]*",
    autoComplete: "one-time-code",
    spellCheck: false,
    maxLength: maxLength,
    value: value,
    onChange: e => onChange && onChange(e.target.value.replace(/\D/g, '').slice(0, maxLength)),
    style: {
      width: '100%',
      marginTop: 8,
      background: 'transparent',
      border: 0,
      borderBottom: '1px solid var(--border-subtle)',
      padding: '12px 0',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-display)',
      fontSize: 40,
      letterSpacing: '0.32em',
      textAlign: 'center',
      textTransform: 'uppercase',
      outline: 'none',
      caretColor: 'var(--accent-hover)'
    }
  }), hint ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '10px 0 0',
      color: 'var(--text-muted)',
      fontSize: 11.5,
      lineHeight: 1.4,
      textAlign: 'center'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { AccessCodeInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/AccessCodeInput.jsx", error: String((e && e.message) || e) }); }

// components/guest/AromaCTA.jsx
try { (() => {
// Guest primary action — solid bordeaux CTA, full width, uppercase tracking, optional ember pulse.
function AromaCTA({
  children,
  onClick,
  disabled = false,
  pulse = false,
  type = 'button',
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    onClick: onClick,
    disabled: disabled,
    className: pulse && !disabled ? 'cta-pulse' : undefined,
    style: {
      width: '100%',
      border: '1px solid var(--cta-solid-border)',
      background: disabled ? 'var(--cta-solid-disabled-bg)' : 'var(--cta-solid)',
      color: disabled ? 'var(--text-muted)' : 'var(--cta-solid-ink)',
      borderRadius: 'var(--r-guest-cta)',
      minHeight: 52,
      padding: '0 18px',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      fontWeight: 600,
      cursor: disabled ? 'default' : 'pointer',
      boxShadow: disabled ? 'none' : 'var(--cta-solid-shadow)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { AromaCTA });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/AromaCTA.jsx", error: String((e && e.message) || e) }); }

// components/guest/AromaChip.jsx
try { (() => {
// Guest chip / filter pill. Optional profile dot. Two tiers: sm (filters), lg (card tags).
const PROFILE_COLORS = {
  citrus: 'var(--profile-citrus)',
  berry: 'var(--profile-berry)',
  floral_herbal: 'var(--profile-floral-herbal)',
  fresh: 'var(--profile-fresh)',
  sweet: 'var(--profile-sweet)',
  spicy: 'var(--profile-spicy)',
  dessert: 'var(--profile-dessert)',
  tobacco: 'var(--profile-tobacco)',
  minty: 'var(--profile-minty)',
  fruity: 'var(--profile-fruity)',
  perfume: 'var(--profile-perfume)',
  sour: 'var(--profile-sour)'
};
const profileColor = id => PROFILE_COLORS[id] || 'var(--profile-fallback)';
function AromaChip({
  children,
  tier = 'sm',
  active = false,
  profile,
  color,
  onClick,
  disabled,
  type = 'button',
  style
}) {
  const isLg = tier === 'lg';
  const dotSize = isLg ? 8 : 6;
  const baseDot = color || (profile ? profileColor(profile) : null);
  // На активной винной заливке тёмные профили (ягодный, пряный) тонут и мутнеют:
  // подмешиваем кремовый и ставим чёткое кольцо в 1px вместо размытого гало.
  const dotColor = baseDot && active ? 'color-mix(in srgb, ' + baseDot + ' 62%, #F7EFEC)' : baseDot;
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    onClick: onClick,
    disabled: disabled,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      border: '1px solid ' + (active ? 'var(--guest-chip-border-on)' : 'var(--border-subtle)'),
      background: active ? 'var(--guest-chip-bg-on)' : 'var(--guest-chip-bg)',
      color: active ? 'var(--guest-chip-ink-on)' : 'var(--text-secondary)',
      borderRadius: 'var(--r-guest-chip)',
      padding: isLg ? '10px 14px' : '7px 12px',
      fontFamily: 'var(--font-body)',
      fontSize: isLg ? 13 : 12,
      fontWeight: active ? 600 : 400,
      lineHeight: 1.1,
      cursor: onClick && !disabled ? 'pointer' : 'default',
      opacity: disabled ? 0.5 : 1,
      boxShadow: active ? 'inset 0 1px 0 rgba(255,244,240,0.18)' : 'none',
      transition: 'var(--transition-state)',
      ...style
    }
  }, dotColor ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      width: dotSize,
      height: dotSize,
      borderRadius: 'var(--r-pill)',
      background: dotColor,
      flex: '0 0 auto',
      boxShadow: active ? 'inset 0 0 0 1px rgba(23,10,10,0.28)' : 'none'
    }
  }) : null, /*#__PURE__*/React.createElement("span", null, children));
}
Object.assign(__ds_scope, { AromaChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/AromaChip.jsx", error: String((e && e.message) || e) }); }

// components/guest/CompositionStack.jsx
try { (() => {
// Mix composition: proportional stacked bar + manufacturer / name / share rows.
const PALETTE = ['var(--composition-1)', 'var(--composition-2)', 'var(--composition-3)', 'var(--composition-4)', 'var(--composition-5)'];
const formatPercent = v => String(Number(v.toFixed(1))).replace('.', ',') + '%';
function CompositionStack({
  components = [],
  showBar = true,
  style
}) {
  const sorted = [...components].sort((a, b) => b.proportion - a.proportion);
  const total = sorted.reduce((sum, c) => sum + c.proportion, 0) || 1;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 10,
      ...style
    }
  }, showBar ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      width: '100%',
      height: 10,
      borderRadius: 'var(--r-pill)',
      overflow: 'hidden',
      background: 'rgba(255,255,255,0.06)'
    }
  }, sorted.map((c, i) => /*#__PURE__*/React.createElement("span", {
    key: c.id || c.name,
    "aria-hidden": true,
    style: {
      display: 'block',
      height: '100%',
      minWidth: 4,
      flexGrow: c.proportion / total,
      background: PALETTE[i % PALETTE.length]
    }
  }))) : null, /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'grid',
      gap: 6
    }
  }, sorted.map((c, i) => /*#__PURE__*/React.createElement("li", {
    key: (c.id || c.name) + i,
    style: {
      display: 'grid',
      gridTemplateColumns: '10px auto minmax(0,1fr) auto',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      width: 10,
      height: 10,
      borderRadius: 'var(--r-pill)',
      alignSelf: 'center',
      background: PALETTE[i % PALETTE.length]
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)',
      whiteSpace: 'nowrap'
    }
  }, c.manufacturer), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-primary)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, c.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-primary)',
      fontVariantNumeric: 'tabular-nums',
      fontWeight: 500
    }
  }, formatPercent(c.proportion))))));
}
Object.assign(__ds_scope, { CompositionStack });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/CompositionStack.jsx", error: String((e && e.message) || e) }); }

// components/guest/GuestCard.jsx
try { (() => {
// Generic guest surface card (.card upstream): warm gradient, hairline border, lit top edge.
function GuestCard({
  children,
  compact = false,
  title,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--guest-card-bg)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--r-guest-card)',
      padding: compact ? 12 : 16,
      boxShadow: 'var(--shadow-guest-card)',
      display: 'grid',
      gap: 8,
      ...style
    }
  }, title ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, title) : null, children);
}
Object.assign(__ds_scope, { GuestCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/GuestCard.jsx", error: String((e && e.message) || e) }); }

// components/guest/GuestTab.jsx
try { (() => {
// Tab used in the guest topbar nav rows (.tab / .tab.active upstream). Active is quiet:
// graphite fill, cream ink and a 2px bordeaux mark — solid accent belongs to the CTA only.
function GuestTab({
  children,
  active = false,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      border: '1px solid ' + (active ? 'var(--segment-active-border)' : 'var(--border-subtle)'),
      borderRadius: 'var(--r-guest-control)',
      background: active ? 'var(--segment-active-bg)' : 'var(--guest-control-bg-soft)',
      color: active ? 'var(--segment-active-ink)' : 'var(--text-secondary)',
      boxShadow: active ? 'inset 0 -2px 0 var(--segment-active-mark)' : 'none',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      lineHeight: 1.2,
      padding: '10px 12px',
      minHeight: 44,
      fontWeight: active ? 600 : 400,
      cursor: 'pointer',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { GuestTab });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/GuestTab.jsx", error: String((e && e.message) || e) }); }

// components/guest/OnboardingProgress.jsx
try { (() => {
// Back arrow + bordeaux progress bar + "1 из 2" counter, pinned in the guest topbar.
function OnboardingProgress({
  step = 1,
  total = 2,
  onBack,
  style
}) {
  const percent = Math.round(step / total * 100);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      alignItems: 'center',
      gap: 12,
      paddingTop: 4,
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onBack,
    "aria-label": "\u041D\u0430\u0437\u0430\u0434",
    style: {
      width: 36,
      height: 36,
      borderRadius: 'var(--r-pill)',
      border: '1px solid var(--border-subtle)',
      background: 'var(--guest-control-bg-soft)',
      color: 'var(--text-primary)',
      fontSize: 16,
      lineHeight: 1,
      cursor: 'pointer'
    }
  }, "\u2190"), /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-valuemin": 0,
    "aria-valuemax": total,
    "aria-valuenow": step,
    style: {
      height: 4,
      borderRadius: 'var(--r-pill)',
      background: 'rgba(150,148,142,0.16)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      height: '100%',
      borderRadius: 'inherit',
      width: percent + '%',
      background: 'var(--accent)',
      transition: 'width var(--dur-slow) var(--ease-out)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, step + ' из ' + total));
}
Object.assign(__ds_scope, { OnboardingProgress });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/OnboardingProgress.jsx", error: String((e && e.message) || e) }); }

// components/guest/ProfileCard.jsx
try { (() => {
// Onboarding step 1: two-up grid of selectable flavour profiles.
const PROFILE_COLORS = {
  citrus: 'var(--profile-citrus)',
  berry: 'var(--profile-berry)',
  floral_herbal: 'var(--profile-floral-herbal)',
  fresh: 'var(--profile-fresh)',
  sweet: 'var(--profile-sweet)',
  spicy: 'var(--profile-spicy)',
  dessert: 'var(--profile-dessert)',
  tobacco: 'var(--profile-tobacco)',
  minty: 'var(--profile-minty)',
  fruity: 'var(--profile-fruity)',
  perfume: 'var(--profile-perfume)',
  sour: 'var(--profile-sour)'
};
function ProfileCard({
  label,
  profile,
  active = false,
  onClick,
  style
}) {
  const base = PROFILE_COLORS[profile] || 'var(--profile-fallback)';
  const color = active ? 'color-mix(in srgb, ' + base + ' 62%, #F7EFEC)' : base;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": active,
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minHeight: 52,
      padding: '8px 12px',
      borderRadius: 14,
      border: '1px solid ' + (active ? 'var(--guest-chip-border-on)' : 'var(--border-subtle)'),
      background: active ? 'var(--guest-chip-bg-on)' : 'rgba(40,40,48,0.60)',
      color: active ? 'var(--guest-chip-ink-on)' : 'var(--text-secondary)',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: active ? 600 : 400,
      textAlign: 'left',
      cursor: 'pointer',
      transition: 'var(--transition-state)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      width: 10,
      height: 10,
      borderRadius: 'var(--r-pill)',
      background: color,
      flex: '0 0 auto',
      boxShadow: active ? 'inset 0 0 0 1px rgba(23,10,10,0.28)' : undefined
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, label));
}
Object.assign(__ds_scope, { ProfileCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/ProfileCard.jsx", error: String((e && e.message) || e) }); }

// components/guest/ProfileGlyph.jsx
try { (() => {
// Abstract "smoke" mark for a mix: up to 3 blurred profile-coloured orbs, screen-blended.
const PROFILE_COLORS = {
  citrus: 'var(--profile-citrus)',
  berry: 'var(--profile-berry)',
  floral_herbal: 'var(--profile-floral-herbal)',
  fresh: 'var(--profile-fresh)',
  sweet: 'var(--profile-sweet)',
  spicy: 'var(--profile-spicy)',
  dessert: 'var(--profile-dessert)',
  tobacco: 'var(--profile-tobacco)',
  minty: 'var(--profile-minty)',
  fruity: 'var(--profile-fruity)',
  perfume: 'var(--profile-perfume)',
  sour: 'var(--profile-sour)'
};
const profileColor = id => PROFILE_COLORS[id] || 'var(--profile-fallback)';
const POSITIONS = [{
  left: 8,
  top: 8,
  s: 26,
  o: 0.92
}, {
  left: 22,
  top: 22,
  s: 24,
  o: 0.78
}, {
  left: 14,
  top: 28,
  s: 18,
  o: 0.62
}];
function ProfileGlyph({
  profiles = [],
  size = 56
}) {
  const list = profiles.slice(0, 3);
  const scale = size / 56;
  return /*#__PURE__*/React.createElement("div", {
    "aria-hidden": true,
    style: {
      width: size,
      height: size,
      borderRadius: 'var(--r-guest-glyph)',
      background: 'radial-gradient(circle at 30% 30%, rgba(255,244,236,0.04), transparent 70%), rgba(20,10,10,0.5)',
      border: '1px solid var(--line-soft)',
      position: 'relative',
      flex: '0 0 auto',
      overflow: 'hidden'
    }
  }, list.map((id, i) => {
    const pos = POSITIONS[i] || POSITIONS[0];
    const c = profileColor(id);
    return /*#__PURE__*/React.createElement("span", {
      key: id + '-' + i,
      style: {
        position: 'absolute',
        left: pos.left * scale,
        top: pos.top * scale,
        width: pos.s * scale,
        height: pos.s * scale,
        borderRadius: 'var(--r-pill)',
        background: 'radial-gradient(circle at 30% 30%, ' + c + ' 0%, color-mix(in srgb, ' + c + ' 40%, transparent) 70%, transparent 100%)',
        opacity: pos.o,
        mixBlendMode: 'screen',
        filter: 'blur(2px)'
      }
    });
  }));
}
Object.assign(__ds_scope, { ProfileGlyph });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/ProfileGlyph.jsx", error: String((e && e.message) || e) }); }

// components/guest/RatingPill.jsx
try { (() => {
// Guest rating pill: single star, comma decimal, optional vote count.
const formatRating = r => r.toFixed(1).replace('.', ',');
function RatingPill({
  rating,
  count,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: 'var(--rating-bg)',
      border: '1px solid var(--rating-border)',
      color: 'var(--rating-ink)',
      borderRadius: 'var(--r-guest-badge)',
      padding: '3px 9px',
      fontFamily: 'var(--font-body)',
      fontSize: 11,
      lineHeight: 1.2,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      color: 'var(--rating-ink)',
      fontSize: 10
    }
  }, "\u2605"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontVariantNumeric: 'tabular-nums'
    }
  }, formatRating(rating)), count != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      fontSize: 10
    }
  }, "(", count, ")") : null);
}
Object.assign(__ds_scope, { RatingPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/RatingPill.jsx", error: String((e && e.message) || e) }); }

// components/guest/SegmentNav.jsx
try { (() => {
// Equal-width segmented control (guest journey / app tabs). Active segment is quiet:
// graphite, cream ink, 2px bordeaux mark.
function SegmentNav({
  items,
  value,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(' + items.length + ', minmax(0,1fr))',
      gap: 6,
      ...style
    }
  }, items.map(it => {
    const isActive = value === it.id;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      type: "button",
      role: "tab",
      "aria-selected": isActive,
      onClick: () => onChange && onChange(it.id),
      style: {
        border: '1px solid ' + (isActive ? 'var(--segment-active-border)' : 'var(--border-subtle)'),
        borderRadius: 'var(--r-guest-control)',
        padding: '10px 8px',
        minHeight: 40,
        background: isActive ? 'var(--segment-active-bg)' : 'var(--segment-idle-bg)',
        color: isActive ? 'var(--segment-active-ink)' : 'var(--text-secondary)',
        boxShadow: isActive ? 'inset 0 -2px 0 var(--segment-active-mark)' : 'none',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: isActive ? 600 : 500,
        cursor: 'pointer'
      }
    }, it.label);
  }));
}
Object.assign(__ds_scope, { SegmentNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/SegmentNav.jsx", error: String((e && e.message) || e) }); }

// components/guest/SignatureBar.jsx
try { (() => {
// Thin flavour "signature": equal segments of the mix's profile colours.
const PROFILE_COLORS = {
  citrus: 'var(--profile-citrus)',
  berry: 'var(--profile-berry)',
  floral_herbal: 'var(--profile-floral-herbal)',
  fresh: 'var(--profile-fresh)',
  sweet: 'var(--profile-sweet)',
  spicy: 'var(--profile-spicy)',
  dessert: 'var(--profile-dessert)',
  tobacco: 'var(--profile-tobacco)',
  minty: 'var(--profile-minty)',
  fruity: 'var(--profile-fruity)',
  perfume: 'var(--profile-perfume)',
  sour: 'var(--profile-sour)'
};
const profileColor = id => PROFILE_COLORS[id] || 'var(--profile-fallback)';
function SignatureBar({
  profiles = [],
  height = 4,
  radius = 999
}) {
  if (!profiles.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    "aria-hidden": true,
    style: {
      display: 'flex',
      width: '100%',
      height,
      borderRadius: radius,
      overflow: 'hidden',
      boxShadow: 'inset 0 0 0 1px rgba(255,244,236,0.04)'
    }
  }, profiles.map((id, i) => {
    const c = profileColor(id);
    return /*#__PURE__*/React.createElement("span", {
      key: id + '-' + i,
      style: {
        flex: 1,
        background: 'linear-gradient(90deg, ' + c + ' 0%, color-mix(in srgb, ' + c + ' 67%, transparent) 100%)'
      }
    });
  }));
}
Object.assign(__ds_scope, { SignatureBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/SignatureBar.jsx", error: String((e && e.message) || e) }); }

// components/guest/MixRow.jsx
try { (() => {
// Mix list row: optional glyph, name + flavour line, rating on the right.

function MixRow({
  name,
  flavors = [],
  profiles = [],
  rating,
  glyphSize = 44,
  showGlyph = true,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      display: 'grid',
      gridTemplateColumns: (showGlyph ? glyphSize + 'px ' : '') + 'minmax(0,1fr) auto',
      alignItems: 'center',
      gap: 10,
      padding: showGlyph ? '8px 12px' : '10px 12px',
      borderRadius: 'var(--r-guest-row)',
      border: '1px solid var(--border-subtle)',
      background: 'var(--guest-row-bg)',
      color: 'var(--text-primary)',
      textAlign: 'left',
      cursor: 'pointer',
      transition: 'border-color var(--dur-fast), background var(--dur-fast)',
      ...style
    }
  }, showGlyph ? /*#__PURE__*/React.createElement(__ds_scope.ProfileGlyph, {
    profiles: profiles,
    size: glyphSize
  }) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      display: 'grid',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 14.5,
      lineHeight: 1.2,
      color: 'var(--text-primary)'
    }
  }, name), flavors.length ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-secondary)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, flavors.slice(0, 3).join(', ')) : null), rating != null ? /*#__PURE__*/React.createElement(__ds_scope.RatingPill, {
    rating: rating
  }) : null);
}
Object.assign(__ds_scope, { MixRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/MixRow.jsx", error: String((e && e.message) || e) }); }

// components/guest/ShowcaseCard.jsx
try { (() => {
// Poster in a Витрина shelf (#175): glyph + rating on top, serif name below, signature along the bottom edge.

const PROFILE_COLORS = {
  citrus: 'var(--profile-citrus)',
  berry: 'var(--profile-berry)',
  floral_herbal: 'var(--profile-floral-herbal)',
  fresh: 'var(--profile-fresh)',
  sweet: 'var(--profile-sweet)',
  spicy: 'var(--profile-spicy)',
  dessert: 'var(--profile-dessert)',
  tobacco: 'var(--profile-tobacco)',
  minty: 'var(--profile-minty)',
  fruity: 'var(--profile-fruity)',
  perfume: 'var(--profile-perfume)',
  sour: 'var(--profile-sour)'
};
const tint = (profile, share) => 'color-mix(in srgb, ' + (PROFILE_COLORS[profile] || 'var(--profile-fallback)') + ' ' + share + '%, transparent)';
function ShowcaseCard({
  name,
  profiles = [],
  rating,
  onClick,
  style
}) {
  const [first, second = first] = profiles;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      position: 'relative',
      flex: '0 0 auto',
      width: 156,
      height: 92,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '9px 10px 10px',
      borderRadius: 'var(--r-guest-card)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-guest-scroll-card)',
      color: 'var(--text-primary)',
      textAlign: 'left',
      cursor: 'pointer',
      overflow: 'hidden',
      scrollSnapAlign: 'start',
      // Darkening to the bottom keeps the name readable over the profile tints.
      background: 'linear-gradient(180deg, transparent 35%, rgba(15,15,18,0.55) 100%), radial-gradient(circle at 88% 0%, ' + tint(first, 55) + ' 0%, transparent 62%), radial-gradient(circle at 0% 100%, ' + tint(second, 30) + ' 0%, transparent 58%), var(--guest-card-bg)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.ProfileGlyph, {
    profiles: profiles,
    size: 28
  }), rating != null ? /*#__PURE__*/React.createElement(__ds_scope.RatingPill, {
    rating: rating,
    style: {
      padding: '2px 7px',
      fontSize: 10.5
    }
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 14.5,
      lineHeight: 1.15,
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden'
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SignatureBar, {
    profiles: profiles,
    height: 2
  })));
}
Object.assign(__ds_scope, { ShowcaseCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/ShowcaseCard.jsx", error: String((e && e.message) || e) }); }

// components/master/EmptyState.jsx
try { (() => {
// Empty state (.empty) — plain muted text in the flow, for zero-result tables and unfilled panels.
function EmptyState({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("p", {
    style: {
      padding: '12px 0',
      margin: 0,
      color: 'var(--text-muted)',
      fontSize: 'var(--fs-sm)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/master/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/master/FilterChip.jsx
try { (() => {
// Toolbar filter chip (.filter-chip) with optional count badge.
function FilterChip({
  children,
  active = false,
  count,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    "aria-pressed": active,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 26,
      padding: '0 10px',
      borderRadius: 'var(--r-sm)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-sm)',
      background: active ? 'var(--accent-soft)' : 'var(--bg-raised)',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      border: '1px solid ' + (active ? 'var(--accent-border)' : 'var(--border-subtle)'),
      cursor: 'pointer',
      transition: 'var(--transition-state)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", null, children), count != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 16,
      height: 16,
      padding: '0 4px',
      borderRadius: 'var(--r-pill)',
      background: active ? 'var(--accent)' : 'var(--bg-elevated)',
      color: active ? 'var(--accent-fg)' : 'var(--text-muted)',
      fontFamily: 'var(--font-meta)',
      fontSize: 10,
      fontWeight: 600,
      fontVariantNumeric: 'tabular-nums'
    }
  }, count) : null);
}
Object.assign(__ds_scope, { FilterChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/master/FilterChip.jsx", error: String((e && e.message) || e) }); }

// components/master/MasterButton.jsx
try { (() => {
// Console button (.btn upstream): 32px tall, 6px radius, 4 variants, 3 sizes.
const VARIANTS = {
  default: {
    background: 'var(--bg-raised)',
    borderColor: 'var(--border-default)',
    color: 'var(--text-primary)'
  },
  primary: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: 'var(--accent-fg)'
  },
  ghost: {
    background: 'transparent',
    borderColor: 'transparent',
    color: 'var(--text-secondary)'
  },
  danger: {
    background: 'transparent',
    borderColor: 'var(--danger-border)',
    color: 'var(--danger)'
  }
};
const SIZES = {
  sm: {
    height: 26,
    padding: '0 8px',
    fontSize: 'var(--fs-sm)',
    borderRadius: 'var(--r-xs)'
  },
  md: {
    height: 32,
    padding: '0 12px',
    fontSize: 'var(--fs-md)',
    borderRadius: 'var(--r-sm)'
  },
  lg: {
    height: 38,
    padding: '0 16px',
    fontSize: 'var(--fs-md)',
    borderRadius: 'var(--r-sm)'
  }
};
function MasterButton({
  children,
  variant = 'default',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  icon,
  style
}) {
  const v = VARIANTS[variant] || VARIANTS.default;
  const s = SIZES[size] || SIZES.md;
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    onClick: onClick,
    disabled: disabled,
    "data-variant": variant,
    "data-size": size,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      border: '1px solid ' + v.borderColor,
      background: v.background,
      color: v.color,
      whiteSpace: 'nowrap',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'var(--transition-state)',
      ...s,
      ...style
    }
  }, icon, children);
}
Object.assign(__ds_scope, { MasterButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/master/MasterButton.jsx", error: String((e && e.message) || e) }); }

// components/master/MasterCard.jsx
try { (() => {
// Ops surface panel: raised gradient, hairline border, optional heading.
function MasterCard({
  children,
  heading,
  actions,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      display: 'grid',
      gap: 12,
      padding: 16,
      borderRadius: 'var(--r-lg)',
      border: '1px solid var(--border-subtle)',
      background: 'linear-gradient(180deg, var(--bg-raised), var(--bg-base))',
      boxShadow: 'var(--shadow-md)',
      ...style
    }
  }, heading || actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12
    }
  }, heading ? /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      minWidth: 0,
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 'var(--fs-xl)',
      lineHeight: 1.15,
      color: 'var(--text-primary)'
    }
  }, heading) : /*#__PURE__*/React.createElement("span", null), actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      gap: 8,
      flexShrink: 0
    }
  }, actions) : null) : null, children);
}
Object.assign(__ds_scope, { MasterCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/master/MasterCard.jsx", error: String((e && e.message) || e) }); }

// components/master/MasterIconButton.jsx
try { (() => {
// 28px (or 24px) square icon action for table rows and drawer headers.
function MasterIconButton({
  children,
  label,
  small = false,
  disabled = false,
  onClick,
  style
}) {
  const size = small ? 24 : 28;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": label,
    title: label,
    onClick: onClick,
    disabled: disabled,
    style: {
      width: size,
      height: size,
      display: 'grid',
      placeItems: 'center',
      borderRadius: small ? 'var(--r-xs)' : 'var(--r-sm)',
      background: 'transparent',
      border: 0,
      color: 'var(--text-muted)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { MasterIconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/master/MasterIconButton.jsx", error: String((e && e.message) || e) }); }

// components/master/MasterInput.jsx
try { (() => {
// Input shell (.input): icon + field, 32/38/44px, focus ring in accent-soft.
function MasterInput({
  value,
  onChange,
  placeholder,
  icon,
  size = 'md',
  type = 'text',
  disabled = false,
  id,
  style
}) {
  const [focused, setFocused] = React.useState(false);
  const heights = {
    md: 32,
    lg: 38,
    xl: 44
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: heights[size] || heights.md,
      padding: '0 10px',
      background: 'var(--bg-base)',
      border: '1px solid ' + (focused ? 'var(--accent-border)' : 'var(--border-default)'),
      borderRadius: 'var(--r-sm)',
      color: 'var(--text-primary)',
      fontSize: size === 'xl' ? 'var(--fs-lg)' : 'var(--fs-md)',
      boxShadow: focused ? 'var(--focus-ring)' : 'none',
      transition: 'border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)',
      opacity: disabled ? 0.6 : 1,
      ...style
    }
  }, icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      display: 'inline-flex',
      flexShrink: 0
    }
  }, icon) : null, /*#__PURE__*/React.createElement("input", {
    id: id,
    type: type,
    value: value,
    disabled: disabled,
    placeholder: placeholder,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      minWidth: 0,
      height: '100%',
      background: 'transparent',
      border: 0,
      outline: 0,
      color: 'inherit',
      font: 'inherit'
    }
  }));
}
Object.assign(__ds_scope, { MasterInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/master/MasterInput.jsx", error: String((e && e.message) || e) }); }

// components/master/MasterList.jsx
try { (() => {
// Dense Linear-style table (.list): tracked caps head, 44px min rows, hairline dividers.
function MasterList({
  columns = [],
  rows = [],
  onRowClick,
  selectedIds = [],
  style
}) {
  const template = columns.map(c => c.width || 'minmax(0,1fr)').join(' ');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--r-lg)',
      background: 'var(--bg-raised)',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: template,
      alignItems: 'center',
      gap: 12,
      padding: '0 12px',
      height: 32,
      borderBottom: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-meta)',
      fontSize: 10.5,
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--text-muted)'
    }
  }, columns.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: c.key || i,
    style: {
      textAlign: c.align || 'left'
    }
  }, c.label))), rows.map((row, r) => {
    const selected = selectedIds.includes(row.id);
    return /*#__PURE__*/React.createElement("div", {
      key: row.id || r,
      "data-selected": selected ? 'true' : 'false',
      onClick: onRowClick ? () => onRowClick(row) : undefined,
      style: {
        display: 'grid',
        gridTemplateColumns: template,
        alignItems: 'center',
        gap: 12,
        padding: '6px 12px',
        minHeight: 44,
        borderBottom: r === rows.length - 1 ? 0 : '1px solid var(--border-subtle)',
        fontSize: 'var(--fs-md)',
        background: selected ? 'var(--accent-soft)' : 'transparent',
        cursor: onRowClick ? 'pointer' : 'default',
        transition: 'background var(--dur-instant) var(--ease-standard)'
      }
    }, columns.map((c, i) => /*#__PURE__*/React.createElement("div", {
      key: c.key || i,
      style: {
        minWidth: 0,
        textAlign: c.align || 'left',
        color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: i === 0 ? 500 : 400,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: c.wrap ? 'normal' : 'nowrap'
      }
    }, typeof c.render === 'function' ? c.render(row) : row[c.key])));
  }));
}
Object.assign(__ds_scope, { MasterList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/master/MasterList.jsx", error: String((e && e.message) || e) }); }

// components/master/MasterPageHeader.jsx
try { (() => {
// Module header: big serif h1, optional lead, right-aligned actions / meta. No eyebrow above the title.
function MasterPageHeader({
  title,
  subtitle,
  actions,
  meta,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 24,
      padding: '4px 0 18px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 'var(--fs-3xl)',
      lineHeight: 1.05,
      letterSpacing: '-0.01em',
      color: 'var(--text-primary)'
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--fs-md)',
      lineHeight: 1.4,
      color: 'var(--text-muted)',
      maxWidth: 720
    }
  }, subtitle) : null), actions || meta ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 10,
      flexShrink: 0
    }
  }, meta ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-meta)',
      fontSize: 12,
      color: 'var(--text-muted)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, meta) : null, actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
      justifyContent: 'flex-end'
    }
  }, actions) : null) : null);
}
Object.assign(__ds_scope, { MasterPageHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/master/MasterPageHeader.jsx", error: String((e && e.message) || e) }); }

// components/master/MasterSortPill.jsx
try { (() => {
// Sort trigger + listbox popover (.master-sort-pill).
function MasterSortPill({
  value,
  options = [],
  onChange,
  label = 'Сортировка',
  style
}) {
  const [open, setOpen] = React.useState(false);
  const current = options.find(o => o.key === value);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-haspopup": "listbox",
    "aria-expanded": open,
    "aria-label": label,
    onClick: () => setOpen(!open),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 28,
      padding: '0 10px',
      borderRadius: 'var(--r-md)',
      background: 'var(--bg-raised)',
      border: '1px solid var(--border-subtle)',
      color: 'var(--text-secondary)',
      fontSize: 'var(--fs-sm)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", null, current ? current.label : label), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      fontSize: 9,
      color: 'var(--text-muted)',
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform var(--dur-fast)'
    }
  }, "\u25BE")), open ? /*#__PURE__*/React.createElement("ul", {
    role: "listbox",
    "aria-label": label,
    style: {
      position: 'absolute',
      top: 32,
      right: 0,
      zIndex: 20,
      minWidth: 180,
      listStyle: 'none',
      margin: 0,
      padding: 4,
      borderRadius: 'var(--r-md)',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      boxShadow: 'var(--shadow-md)'
    }
  }, options.map(o => {
    const selected = o.key === value;
    return /*#__PURE__*/React.createElement("li", {
      key: o.key,
      role: "option",
      "aria-selected": selected,
      onClick: () => {
        onChange && onChange(o.key);
        setOpen(false);
      },
      style: {
        padding: '6px 8px',
        borderRadius: 'var(--r-xs)',
        fontSize: 'var(--fs-md)',
        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: selected ? 'var(--accent-soft)' : 'transparent',
        cursor: 'pointer'
      }
    }, o.label);
  })) : null);
}
Object.assign(__ds_scope, { MasterSortPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/master/MasterSortPill.jsx", error: String((e && e.message) || e) }); }

// components/master/MasterStatsRow.jsx
try { (() => {
// KPI strip (.stats): hairline-divided cells, serif tabular values, tracked caps labels.
function MasterStatsRow({
  tiles = [],
  style
}) {
  const toneColor = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger: 'var(--danger)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 1,
      background: 'var(--border-subtle)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
      ...style
    }
  }, tiles.map((tile, i) => /*#__PURE__*/React.createElement("div", {
    key: (tile.label || '') + i,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '14px 16px',
      background: 'var(--bg-raised)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-meta)',
      fontSize: 'var(--fs-xs)',
      fontWeight: 500,
      color: 'var(--text-muted)'
    }
  }, tile.label), /*#__PURE__*/React.createElement("div", {
    "data-tone": tile.tone || 'default',
    style: {
      fontFamily: tile.tone === 'code' ? 'var(--font-meta)' : 'var(--font-serif)',
      fontSize: tile.tone === 'code' ? 24 : 28,
      letterSpacing: tile.tone === 'code' ? '0.14em' : undefined,
      fontWeight: 500,
      lineHeight: 1,
      color: toneColor[tile.tone] || 'var(--text-primary)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, tile.value), tile.hint ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-sm)',
      color: 'var(--text-muted)'
    }
  }, tile.hint) : null)));
}
Object.assign(__ds_scope, { MasterStatsRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/master/MasterStatsRow.jsx", error: String((e && e.message) || e) }); }

// components/master/MasterTag.jsx
try { (() => {
// Small semantic tag (.tag): 22px tall, 4px radius, tonal background.
const TONES = {
  neutral: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border-subtle)',
    color: 'var(--text-secondary)'
  },
  info: {
    background: 'var(--info-soft)',
    borderColor: 'var(--info-soft)',
    color: 'var(--info)'
  },
  success: {
    background: 'var(--success-soft)',
    borderColor: 'var(--success-soft)',
    color: 'var(--success)'
  },
  warning: {
    background: 'var(--warning-soft)',
    borderColor: 'var(--warning-soft)',
    color: 'var(--warning)'
  },
  accent: {
    background: 'var(--accent-soft)',
    borderColor: 'var(--accent-border)',
    color: 'var(--text-primary)'
  },
  danger: {
    background: 'var(--danger-soft)',
    borderColor: 'var(--danger-soft)',
    color: 'var(--danger)'
  },
  ghost: {
    background: 'transparent',
    borderColor: 'var(--border-subtle)',
    color: 'var(--text-muted)'
  }
};
function MasterTag({
  children,
  tone = 'neutral',
  dot = false,
  style
}) {
  const t = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("span", {
    "data-tone": tone,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 22,
      padding: '0 8px',
      borderRadius: 'var(--r-xs)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-xs)',
      fontWeight: 500,
      border: '1px solid ' + t.borderColor,
      background: t.background,
      color: t.color,
      ...style
    }
  }, dot ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      width: 6,
      height: 6,
      borderRadius: 'var(--r-pill)',
      background: 'currentColor',
      flexShrink: 0
    }
  }) : null, children);
}
Object.assign(__ds_scope, { MasterTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/master/MasterTag.jsx", error: String((e && e.message) || e) }); }

// components/master/MasterToggle.jsx
try { (() => {
// 30x18 switch (.toggle) — inventory in-stock, rail active, operator active.
function MasterToggle({
  checked = false,
  onChange,
  label,
  disabled = false,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": checked,
    "aria-label": label,
    disabled: disabled,
    onClick: () => onChange && onChange(!checked),
    style: {
      position: 'relative',
      width: 30,
      height: 18,
      borderRadius: 'var(--r-pill)',
      background: checked ? 'var(--accent)' : 'var(--bg-elevated)',
      border: '1px solid ' + (checked ? 'var(--accent)' : 'var(--border-default)'),
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      padding: 0,
      flexShrink: 0,
      transition: 'background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      position: 'absolute',
      top: 2,
      left: 2,
      width: 12,
      height: 12,
      borderRadius: 'var(--r-pill)',
      background: checked ? 'var(--accent-fg)' : 'var(--text-secondary)',
      transform: checked ? 'translateX(12px)' : 'none',
      transition: 'transform var(--dur-base) var(--ease-out), background var(--dur-fast)'
    }
  }));
}
Object.assign(__ds_scope, { MasterToggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/master/MasterToggle.jsx", error: String((e && e.message) || e) }); }

// components/master/MasterTopBar.jsx
try { (() => {
// Sticky glass topbar: brand mark, horizontal module nav, command pill, user chip, logout.
function MasterTopBar({
  items = [],
  active,
  onChange,
  userName = 'admin',
  userRole = 'admin',
  onSignOut,
  onOpenCommandPalette,
  markSrc,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    "aria-label": "\u0420\u0430\u0431\u043E\u0447\u0438\u0435 \u0440\u0430\u0437\u0434\u0435\u043B\u044B \u041C\u0430\u0441\u0442\u0435\u0440\u0430",
    style: {
      position: 'sticky',
      top: 8,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      padding: '10px 16px',
      borderRadius: 'var(--r-lg)',
      border: '1px solid var(--border-subtle)',
      background: 'var(--glass)',
      backdropFilter: 'blur(14px)',
      boxShadow: 'var(--shadow-sm)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      paddingRight: 'var(--space-3)',
      borderRight: '1px solid var(--border-subtle)'
    }
  }, markSrc ? /*#__PURE__*/React.createElement("img", {
    "aria-hidden": true,
    alt: "",
    src: markSrc,
    style: {
      width: 28,
      height: 28,
      display: 'block',
      flexShrink: 0
    }
  }) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 15,
      letterSpacing: '0.02em',
      color: 'var(--text-primary)'
    }
  }, "\u0410\u0442\u0435\u043B\u044C\u0435 ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      color: 'var(--text-muted)'
    }
  }, "\u041C\u0430\u0441\u0442\u0435\u0440"))), /*#__PURE__*/React.createElement("nav", {
    role: "tablist",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      minWidth: 0
    }
  }, items.map(item => {
    const isActive = active === item.id;
    return /*#__PURE__*/React.createElement("button", {
      key: item.id,
      type: "button",
      role: "tab",
      "aria-selected": isActive,
      "data-active": isActive ? 'true' : 'false',
      onClick: () => onChange && onChange(item.id),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 12px',
        borderRadius: 'var(--r-sm)',
        border: '1px solid ' + (isActive ? 'var(--border-default)' : 'transparent'),
        background: isActive ? 'var(--bg-elevated)' : 'transparent',
        boxShadow: isActive ? 'inset 0 -2px 0 var(--accent-hover)' : 'none',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--fs-md)',
        lineHeight: 1,
        cursor: 'pointer',
        transition: 'var(--transition-state)'
      }
    }, item.icon ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        opacity: isActive ? 1 : 0.7
      }
    }, item.icon) : null, /*#__PURE__*/React.createElement("span", null, item.label));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    }
  }, onOpenCommandPalette ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onOpenCommandPalette,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px 4px 8px',
      borderRadius: 'var(--r-md)',
      fontSize: 'var(--fs-sm)',
      color: 'var(--text-secondary)',
      background: 'var(--bg-raised)',
      border: '1px solid var(--border-subtle)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u041D\u0430\u0439\u0442\u0438 \u0438\u043B\u0438 \u0441\u0434\u0435\u043B\u0430\u0442\u044C"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      borderRadius: 'var(--r-xs)',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderBottomWidth: 2,
      fontFamily: 'var(--font-meta)',
      fontSize: 10.5,
      fontWeight: 500,
      color: 'var(--text-muted)'
    }
  }, "\u2318K")) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 10px',
      borderRadius: 'var(--r-sm)',
      border: '1px solid var(--border-subtle)',
      background: 'var(--bg-raised)',
      lineHeight: 1.15
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-sm)',
      letterSpacing: '-0.01em',
      color: 'var(--text-secondary)'
    }
  }, userName), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-faint)'
    }
  }, userRole)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onSignOut,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      minHeight: 32,
      padding: '6px 12px',
      borderRadius: 'var(--r-sm)',
      border: '1px solid var(--border-subtle)',
      background: 'var(--bg-raised)',
      color: 'var(--text-primary)',
      fontSize: 'var(--fs-sm)',
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "\u0412\u044B\u0439\u0442\u0438")));
}
Object.assign(__ds_scope, { MasterTopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/master/MasterTopBar.jsx", error: String((e && e.message) || e) }); }

// components/master/StatusPill.jsx
try { (() => {
// Topbar status / command pill (.status-pill) with optional live dot and kbd hint.
function StatusPill({
  children,
  dot = false,
  tone = 'success',
  kbd,
  onClick,
  style
}) {
  const dotColor = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger: 'var(--danger)'
  }[tone] || 'var(--success)';
  const Tag = onClick ? 'button' : 'span';
  return /*#__PURE__*/React.createElement(Tag, {
    type: onClick ? 'button' : undefined,
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px 4px 8px',
      borderRadius: 'var(--r-sm)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-sm)',
      color: 'var(--text-secondary)',
      background: 'var(--bg-raised)',
      border: '1px solid var(--border-subtle)',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  }, dot ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      width: 6,
      height: 6,
      borderRadius: 'var(--r-pill)',
      background: dotColor
    }
  }) : null, /*#__PURE__*/React.createElement("span", null, children), kbd ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      borderRadius: 'var(--r-xs)',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderBottomWidth: 2,
      fontFamily: 'var(--font-meta)',
      fontSize: 10.5,
      fontWeight: 500,
      color: 'var(--text-muted)'
    }
  }, kbd) : null);
}
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/master/StatusPill.jsx", error: String((e && e.message) || e) }); }

// ui_kits/aroma-guest/GuestApp.jsx
try { (() => {
// Guest flow: access → intro → onboarding → (подбор / витрина / рилсы / каталог / рейл / миксер / кабинет) → карточка → подтверждение.
const {
  GuestTab,
  OnboardingProgress,
  MixRow
} = window.DesignSystem_1aef33;
const {
  AccessScreen,
  IntroScreen,
  OnboardingScreen,
  RecommendationsScreen,
  ShowcaseScreen,
  CatalogScreen,
  CatalogFiltersSheet,
  RailScreen,
  MixSheet,
  ReelStrip,
  ReelsScreen,
  ConfirmationScreen,
  Icon
} = window;
const MOCK = window.AROMA_MOCK;

// Нижняя панель (#168): только значки, название — в aria-label, активный пункт кремовый с чертой акцента.
// «Рилсы» (#153) — третьим, ближе к центру, как Reels в Instagram.
const NAV_ITEMS = [{
  id: 'recommendations',
  label: 'Подбор',
  icon: 'Sparkles'
}, {
  id: 'showcase',
  label: 'Витрина',
  icon: 'GalleryHorizontalEnd'
}, {
  id: 'reels',
  label: 'Рилсы',
  icon: 'Clapperboard'
}, {
  id: 'catalog',
  label: 'Каталог',
  icon: 'Search'
}, {
  id: 'mixer',
  label: 'Миксер',
  icon: 'Blend'
}, {
  id: 'cabinet',
  label: 'Кабинет',
  icon: 'CircleUserRound'
}];
function BottomNav({
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: "bottom-nav",
    "aria-label": "\u0413\u043E\u0441\u0442\u0435\u0432\u0430\u044F \u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F"
  }, NAV_ITEMS.map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    type: "button",
    className: "bottom-nav-item",
    "aria-label": item.label,
    "aria-current": value === item.id ? 'page' : undefined,
    onClick: () => onChange(item.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: item.icon,
    stroke: value === item.id ? 2.1 : 1.8
  }))));
}

// Экрана «Намиксуй» в ките нет — заглушка показывает только полноэкранный режим без панели и возврат.
function MixerStub({
  onBack
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "kit-mixer"
  }, /*#__PURE__*/React.createElement("header", {
    className: "kit-mixer-top"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-rail-back",
    onClick: onBack,
    "aria-label": "\u041D\u0430\u0437\u0430\u0434"
  }, "\u2190"), /*#__PURE__*/React.createElement("h1", {
    className: "kit-mixer-title"
  }, "\u041D\u0430\u043C\u0438\u043A\u0441\u0443\u0439")), /*#__PURE__*/React.createElement("p", {
    className: "guest-status"
  }, "\u0421\u0431\u043E\u0440\u043A\u0443 \u043C\u0438\u043A\u0441\u0430 \u0437\u0430 \u0442\u0440\u0438 \u0445\u043E\u0434\u0430 \u0441\u043C\u043E\u0442\u0440\u0438\u0442\u0435 \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438: \u044D\u043A\u0440\u0430\u043D MixerScreen \u0432 apps/aroma-web."));
}

// Кабинета в ките нет: вход через Telegram, история и «Для вас» — в design/design_handoff_guest_cabinet/.
// Заглушка показывает только избранное, которое гость отметил сердечком в карточке микса.
function CabinetStub({
  favorites,
  onOpen
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "kit-cabinet"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "kit-cabinet-title"
  }, "\u041A\u0430\u0431\u0438\u043D\u0435\u0442"), /*#__PURE__*/React.createElement("h2", {
    className: "aroma-section-title"
  }, "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435"), favorites.length ? favorites.map(mix => /*#__PURE__*/React.createElement(MixRow, {
    key: mix.id,
    name: mix.name,
    profiles: mix.flavorProfiles,
    flavors: mix.flavors,
    onClick: () => onOpen(mix, 'catalog')
  })) : /*#__PURE__*/React.createElement("p", {
    className: "guest-status"
  }, "\u0417\u0434\u0435\u0441\u044C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043C\u0438\u043A\u0441\u044B, \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043D\u044B\u0435 \u0441\u0435\u0440\u0434\u0435\u0447\u043A\u043E\u043C."));
}
function GuestApp() {
  const [view, setView] = React.useState('access');
  const [code, setCode] = React.useState('');
  const [ageOk, setAgeOk] = React.useState(false);
  const [accessError, setAccessError] = React.useState('');
  const [introIndex, setIntroIndex] = React.useState(0);
  const [step, setStep] = React.useState(1);
  const [likedProfiles, setLikedProfiles] = React.useState([]);
  const [likedFlavors, setLikedFlavors] = React.useState([]);
  const [query, setQuery] = React.useState('');
  const [catalogFilters, setCatalogFilters] = React.useState([]);
  const [catalogFiltersOpen, setCatalogFiltersOpen] = React.useState(false);
  const [rail, setRail] = React.useState(null);
  const [railFilters, setRailFilters] = React.useState([]);
  const [sheet, setSheet] = React.useState(null);
  const [rating, setRating] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  const [mixerReturn, setMixerReturn] = React.useState('recommendations');
  const [favoriteIds, setFavoriteIds] = React.useState([]);
  const [reelsStart, setReelsStart] = React.useState(0);
  const toggle = setter => value => setter(cur => cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]);
  const recommendations = React.useMemo(() => {
    const scored = MOCK.mixes.map(mix => {
      const p = mix.flavorProfiles.filter(x => likedProfiles.includes(x)).length;
      const f = mix.flavors.filter(x => likedFlavors.includes(x)).length;
      return {
        mix,
        score: p * 3 + f * 2 + mix.popularity / 500
      };
    }).filter(x => likedProfiles.length || likedFlavors.length ? x.score > 0.4 : true).sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map(x => x.mix);
  }, [likedProfiles, likedFlavors]);

  // Лента рилсов: подбор по онбордингу, затем остальные миксы каталога без повторов.
  const reelsFeed = React.useMemo(() => [...recommendations, ...MOCK.mixes.filter(mix => !recommendations.includes(mix))], [recommendations]);

  // Внутри характеров и внутри вкусов — «или», между ними и с текстом — «и». Сортировки нет (#181): по алфавиту.
  const catalogResults = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const of = kind => catalogFilters.filter(t => t.kind === kind).map(t => t.value);
    const profiles = of('profile');
    const flavors = of('flavor');
    return MOCK.mixes.filter(m => !q || [m.name, m.description, ...m.flavors, ...m.components.flatMap(c => [c.name, c.manufacturer])].join(' ').toLowerCase().includes(q)).filter(m => !profiles.length || m.flavorProfiles.some(p => profiles.includes(p))).filter(m => !flavors.length || m.flavors.some(f => flavors.includes(f))).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [query, catalogFilters]);
  const sameFilter = (a, b) => a.kind === b.kind && a.value === b.value;
  const removeCatalogFilter = tag => setCatalogFilters(cur => cur.filter(t => !sameFilter(t, tag)));
  const toggleCatalogFilter = tag => setCatalogFilters(cur => cur.some(t => sameFilter(t, tag)) ? cur.filter(t => !sameFilter(t, tag)) : [...cur, tag]);
  const openMix = (mix, source) => {
    setSheet({
      mix,
      source
    });
    setRating(0);
  };
  const chooseMix = (mix, source) => {
    if (source === 'reels') setReelsStart(reelsFeed.indexOf(mix));
    setSelected({
      mix,
      source
    });
    setSheet(null);
    setView('confirmation');
  };
  const openReels = index => {
    setReelsStart(index);
    setView('reels');
  };
  const submitAccess = () => {
    if (code.length < 4 || !ageOk) {
      setAccessError('Введите код мастера и подтвердите, что вам есть 18.');
      return;
    }
    setAccessError('');
    setView('intro');
  };
  const toggleFavorite = mix => setFavoriteIds(cur => cur.includes(mix.id) ? cur.filter(id => id !== mix.id) : [...cur, mix.id]);
  const navView = ['recommendations', 'showcase', 'catalog', 'rail', 'cabinet'].includes(view) ? view : null;
  const goNav = tab => {
    if (tab === 'mixer') setMixerReturn(view);
    // Рилсы в панели всегда открывают ленту с начала.
    if (tab === 'reels') {
      openReels(0);
      return;
    }
    setView(tab);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "app-bg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "phone-shell"
  }, view === 'access' ? /*#__PURE__*/React.createElement(AccessScreen, {
    code: code,
    setCode: setCode,
    ageOk: ageOk,
    setAgeOk: setAgeOk,
    error: accessError,
    onSubmit: submitAccess
  }) : view === 'confirmation' ? /*#__PURE__*/React.createElement(ConfirmationScreen, {
    mix: selected.mix,
    onDone: () => setView(selected.source === 'reels' ? 'reels' : 'recommendations')
  }) : view === 'mixer' ? /*#__PURE__*/React.createElement(MixerStub, {
    onBack: () => setView(mixerReturn)
  }) : view === 'reels' ?
  /*#__PURE__*/
  // Шапки нет, лента на всю высоту над панелью; «Готово» после «Покурить» возвращает на тот же рилс.
  React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ReelsScreen, {
    key: reelsStart,
    mixes: reelsFeed,
    start: reelsStart,
    favoriteIds: favoriteIds,
    onFavorite: toggleFavorite,
    onOpen: openMix,
    onChoose: chooseMix
  }), /*#__PURE__*/React.createElement(BottomNav, {
    value: "reels",
    onChange: goNav
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, view !== 'rail' ? /*#__PURE__*/React.createElement("header", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "topbar-main-row"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "brand-home-btn",
    onClick: () => setView('recommendations')
  }, /*#__PURE__*/React.createElement("img", {
    className: "brand-mark",
    src: "../../assets/logo-mark-oxblood.svg",
    alt: "",
    "aria-hidden": true
  }), /*#__PURE__*/React.createElement("span", {
    className: "brand"
  }, "\u0410\u0440\u043E\u043C\u0430 \u0410\u0442\u0435\u043B\u044C\u0435")), selected ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "topbar-icon-btn topbar-master-card",
    "aria-label": 'Карточка для мастера: ' + selected.mix.name,
    title: "\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0434\u043B\u044F \u043C\u0430\u0441\u0442\u0435\u0440\u0430",
    onClick: () => openMix(selected.mix, selected.source)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ClipboardList",
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    className: "topbar-master-card-dot",
    "aria-hidden": true
  })) : null), view === 'intro' ? /*#__PURE__*/React.createElement("nav", {
    className: "guest-stage-nav",
    "aria-label": "\u041C\u0430\u0440\u0448\u0440\u0443\u0442 \u0437\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u0430"
  }, /*#__PURE__*/React.createElement(GuestTab, {
    active: true
  }, "\u0417\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u043E"), /*#__PURE__*/React.createElement(GuestTab, {
    onClick: () => setView('onboarding')
  }, "\u041F\u0440\u0435\u0434\u043F\u043E\u0447\u0442\u0435\u043D\u0438\u044F")) : null, view === 'onboarding' ? /*#__PURE__*/React.createElement(OnboardingProgress, {
    step: step,
    total: 2,
    onBack: () => step === 2 ? setStep(1) : setView('intro')
  }) : null) : null, /*#__PURE__*/React.createElement("main", {
    className: view === 'intro' ? 'content content-intro' : 'content'
  }, view === 'intro' ? /*#__PURE__*/React.createElement(IntroScreen, {
    index: introIndex,
    onNext: () => introIndex === MOCK.introCards.length - 1 ? setView('onboarding') : setIntroIndex(introIndex + 1),
    onSkip: () => setView('onboarding')
  }) : null, view === 'onboarding' ? /*#__PURE__*/React.createElement(OnboardingScreen, {
    step: step,
    profiles: likedProfiles,
    flavors: likedFlavors,
    toggleProfile: toggle(setLikedProfiles),
    toggleFlavor: toggle(setLikedFlavors),
    onNext: () => {
      if (step === 1) {
        setStep(2);
        return;
      }
      setView('recommendations');
    },
    onSkip: () => setView('catalog')
  }) : null, view === 'recommendations' ? /*#__PURE__*/React.createElement(ReelStrip, {
    mixes: reelsFeed,
    onOpen: openReels
  }) : null, view === 'recommendations' ? /*#__PURE__*/React.createElement(RecommendationsScreen, {
    mixes: recommendations,
    onOpen: openMix,
    onChoose: chooseMix,
    onOpenOnboarding: () => {
      setStep(1);
      setView('onboarding');
    },
    onOpenCatalog: () => setView('catalog'),
    onOpenMixer: () => goNav('mixer')
  }) : null, view === 'showcase' ? /*#__PURE__*/React.createElement(ShowcaseScreen, {
    onOpen: openMix,
    onOpenRail: r => {
      setRail(r);
      setRailFilters([]);
      setView('rail');
    },
    onOpenMixer: () => goNav('mixer')
  }) : null, view === 'catalog' ? /*#__PURE__*/React.createElement(CatalogScreen, {
    query: query,
    setQuery: setQuery,
    filters: catalogFilters,
    onRemoveFilter: removeCatalogFilter,
    onOpenFilters: () => setCatalogFiltersOpen(true),
    results: catalogResults,
    onOpen: openMix,
    onReset: () => {
      setQuery('');
      setCatalogFilters([]);
    }
  }) : null, view === 'cabinet' ? /*#__PURE__*/React.createElement(CabinetStub, {
    favorites: MOCK.mixes.filter(mix => favoriteIds.includes(mix.id)),
    onOpen: openMix
  }) : null, view === 'rail' && rail ? /*#__PURE__*/React.createElement(RailScreen, {
    rail: rail,
    filters: railFilters,
    toggleFilter: p => p === null ? setRailFilters([]) : toggle(setRailFilters)(p),
    onBack: () => setView('showcase'),
    onOpen: openMix
  }) : null), navView ? /*#__PURE__*/React.createElement(BottomNav, {
    value: navView === 'rail' ? 'showcase' : navView,
    onChange: goNav
  }) : null)), catalogFiltersOpen ? /*#__PURE__*/React.createElement(CatalogFiltersSheet, {
    filters: catalogFilters,
    onToggle: toggleCatalogFilter,
    onReset: () => setCatalogFilters([]),
    resultCount: catalogResults.length,
    onClose: () => setCatalogFiltersOpen(false)
  }) : null, /*#__PURE__*/React.createElement(MixSheet, {
    state: sheet,
    rating: rating,
    onRate: setRating,
    onClose: () => setSheet(null),
    onChoose: chooseMix,
    favorite: Boolean(sheet && favoriteIds.includes(sheet.mix.id)),
    onFavorite: toggleFavorite
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(GuestApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/aroma-guest/GuestApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/aroma-guest/GuestScreens.jsx
try { (() => {
// Арома Ателье · guest screens. Recreation of apps/aroma-web/src/App.tsx views.
const {
  AromaCTA,
  AromaChip,
  SegmentNav,
  ProfileGlyph,
  SignatureBar,
  RatingPill,
  ProfileCard,
  MixRow,
  ShowcaseCard,
  GuestCard,
  CompositionStack,
  AccessCodeInput,
  OnboardingProgress,
  GuestTab
} = window.DesignSystem_1aef33;
const M = window.AROMA_MOCK;
const label = p => M.profileLabels[p] || p;
// Без оценок гостей «★» нет: avgRating такого микса — базовый из Мастера, не мнение гостей (#185).
const guestRating = mix => mix.ratingsCount ? mix.avgRating : null;
const railKind = {
  statistical: 'Выбор гостей',
  prepared: 'Редакция',
  curated: 'Мастера'
};
// На Витрине тип полки виден значком, словами — в aria-label заголовка (railKindIcon в apps/aroma-web).
// Полка «Оценки гостей» в приложении получает Star; в мок-данных кита её нет.
const railKindIcon = {
  statistical: 'Users',
  prepared: 'Feather',
  curated: 'Flame'
};
const plural = n => {
  const a = n % 10,
    b = n % 100;
  if (a === 1 && b !== 11) return 'микс';
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'микса';
  return 'миксов';
};

// Иконка Lucide из UMD-сборки как React-элемент (в приложении — lucide-react).
function Icon({
  name,
  size = 24,
  stroke = 1.8,
  fill = 'none'
}) {
  const node = window.lucide.icons[name];
  const children = node[0] === 'svg' ? node[2] : node;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: fill,
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true
  }, children.map(([tag, attrs], i) => React.createElement(tag, {
    key: i,
    ...attrs
  })));
}

// markSrc — путь к знаку от страницы, которая подключает кит (мокапы в design/ лежат глубже).
function AccessScreen({
  code,
  setCode,
  ageOk,
  setAgeOk,
  error,
  onSubmit,
  markSrc = '../../assets/logo-mark-oxblood.svg'
}) {
  const ready = code.length >= 4 && ageOk;
  return /*#__PURE__*/React.createElement("section", {
    className: "aroma-access"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-access-body"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    className: "aroma-access-mark",
    src: markSrc,
    width: "64",
    height: "64",
    alt: "",
    "aria-hidden": true
  }), /*#__PURE__*/React.createElement("span", {
    className: "aroma-access-brand"
  }, "\u0410\u0440\u043E\u043C\u0430", /*#__PURE__*/React.createElement("br", null), "\u0410\u0442\u0435\u043B\u044C\u0435"), /*#__PURE__*/React.createElement("p", {
    className: "aroma-access-tagline"
  }, "\u041F\u043E\u0434\u0431\u043E\u0440 \u043A\u0430\u043B\u044C\u044F\u043D\u043D\u044B\u0445 \u043C\u0438\u043A\u0441\u043E\u0432")), /*#__PURE__*/React.createElement("form", {
    className: "aroma-access-form",
    onSubmit: e => {
      e.preventDefault();
      onSubmit();
    }
  }, /*#__PURE__*/React.createElement(AccessCodeInput, {
    value: code,
    onChange: setCode,
    hint: "\u041A\u043E\u0434 \u0441\u043A\u0430\u0436\u0435\u0442 \u043C\u0430\u0441\u0442\u0435\u0440 \u0437\u0430\u043B\u0430. \u041E\u043D \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0434\u043E \u043A\u043E\u043D\u0446\u0430 \u0441\u0443\u0442\u043E\u043A."
  }), /*#__PURE__*/React.createElement("label", {
    className: "aroma-access-age"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "checkbox",
    "aria-checked": ageOk,
    className: 'aroma-access-age-dot' + (ageOk ? ' on' : ''),
    onClick: () => setAgeOk(!ageOk)
  }, ageOk ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true
  }, "\u2713") : null), /*#__PURE__*/React.createElement("span", {
    className: "aroma-access-age-text"
  }, "\u041C\u043D\u0435 \u0435\u0441\u0442\u044C 18. \u041F\u043E\u043D\u0438\u043C\u0430\u044E, \u0447\u0442\u043E \u043A\u0443\u0440\u0435\u043D\u0438\u0435 \u0432\u0440\u0435\u0434\u0438\u0442 \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044E.")), /*#__PURE__*/React.createElement(AromaCTA, {
    type: "submit",
    disabled: !ready
  }, "\u0412\u043E\u0439\u0442\u0438 \u0432 \u0410\u0442\u0435\u043B\u044C\u0435"), error ? /*#__PURE__*/React.createElement("p", {
    className: "guest-error"
  }, error) : null), /*#__PURE__*/React.createElement("p", {
    className: "aroma-access-footer"
  }, "18+ \xB7 \u041A\u0443\u0440\u0435\u043D\u0438\u0435 \u0432\u0440\u0435\u0434\u0438\u0442 \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044E")));
}
function IntroScreen({
  index,
  onNext,
  onSkip
}) {
  const cards = M.introCards;
  const card = cards[index];
  const isLast = index === cards.length - 1;
  return /*#__PURE__*/React.createElement("div", {
    className: "aroma-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-intro-body"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "aroma-intro-title"
  }, card.title), /*#__PURE__*/React.createElement("p", {
    className: "aroma-intro-text"
  }, card.description)), /*#__PURE__*/React.createElement("div", {
    className: "aroma-intro-dock"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-intro-pips",
    "aria-label": 'Шаг ' + (index + 1) + ' из ' + cards.length
  }, cards.map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: 'aroma-intro-pip' + (i === index ? ' on' : ''),
    "aria-hidden": true
  }))), /*#__PURE__*/React.createElement(AromaCTA, {
    onClick: onNext
  }, isLast ? 'Перейти к подбору' : 'Дальше'), !isLast ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-skip",
    onClick: onSkip
  }, "\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0437\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u043E") : null));
}

// Как в приложении: внутри профилей и внутри вкусов — «или», между ними — «и».
const matchingMixes = (profiles, flavors) => M.mixes.filter(m => !profiles.length || m.flavorProfiles.some(p => profiles.includes(p))).filter(m => !flavors.length || m.flavors.some(f => flavors.includes(f)));
function OnboardingScreen({
  step,
  profiles,
  flavors,
  toggleProfile,
  toggleFlavor,
  onNext,
  onSkip
}) {
  // Вкус бледный, если его нет ни в одном миксе с выбранными профилями.
  const reachable = new Set(matchingMixes(profiles, []).flatMap(m => m.flavors));
  const count = matchingMixes(profiles, step === 2 ? flavors : []).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "aroma-onboarding"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-onboarding-body"
  }, step === 1 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h1", {
    className: "aroma-onboarding-title"
  }, "\u0421 \u0447\u0435\u0433\u043E \u043D\u0430\u0447\u043D\u0451\u043C?"), /*#__PURE__*/React.createElement("p", {
    className: "aroma-onboarding-hint"
  }, "\u041C\u043E\u0436\u043D\u043E \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E."), /*#__PURE__*/React.createElement("div", {
    className: "aroma-profile-grid"
  }, Object.keys(M.profileLabels).map(id => /*#__PURE__*/React.createElement(ProfileCard, {
    key: id,
    profile: id,
    label: label(id),
    active: profiles.includes(id),
    onClick: () => toggleProfile(id)
  })))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h1", {
    className: "aroma-onboarding-title"
  }, "\u041B\u044E\u0431\u0438\u043C\u044B\u0435 \u043D\u043E\u0442\u044B"), /*#__PURE__*/React.createElement("p", {
    className: "aroma-onboarding-hint"
  }, "\u041C\u043E\u0436\u043D\u043E \u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C. \u0411\u043B\u0435\u0434\u043D\u044B\u0435 \u0432\u043A\u0443\u0441\u044B \u043D\u0435 \u0432\u0441\u0442\u0440\u0435\u0447\u0430\u044E\u0442\u0441\u044F \u0432 \u043C\u0438\u043A\u0441\u0430\u0445 \u0441 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u043C\u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u044F\u043C\u0438."), /*#__PURE__*/React.createElement("div", {
    className: "aroma-flavor-wrap"
  }, M.flavors.map(f => /*#__PURE__*/React.createElement(AromaChip, {
    key: f,
    active: flavors.includes(f),
    disabled: !reachable.has(f) && !flavors.includes(f),
    onClick: () => toggleFlavor(f)
  }, f))))), /*#__PURE__*/React.createElement("div", {
    className: "aroma-onboarding-dock"
  }, /*#__PURE__*/React.createElement("p", {
    className: "aroma-onboarding-count"
  }, count ? count === 1 ? 'Подходит 1 микс' : 'Подходят ' + count + ' ' + plural(count) : 'Под такой набор миксов нет. Снимите один из вкусов.'), /*#__PURE__*/React.createElement(AromaCTA, {
    disabled: !count,
    onClick: onNext
  }, step === 1 ? 'Далее' : 'Показать подбор'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-skip",
    onClick: onSkip
  }, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0441\u0440\u0430\u0437\u0443")));
}

// Приглашение в «Намиксуй»: полосой на Витрине, строкой с пояснением в конце Подбора. Без глифа: профилей у него нет.
function MixerInvite({
  onOpen,
  note
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-mixer-invite",
    onClick: onOpen
  }, /*#__PURE__*/React.createElement("span", {
    className: "aroma-mixer-invite-text"
  }, /*#__PURE__*/React.createElement("span", {
    className: "aroma-mixer-invite-title"
  }, "\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u0441\u0432\u043E\u0439 \u043C\u0438\u043A\u0441"), note ? /*#__PURE__*/React.createElement("span", {
    className: "aroma-mixer-invite-note"
  }, "\u0418\u0437 \u0442\u0430\u0431\u0430\u043A\u043E\u0432, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u0435\u0441\u0442\u044C \u043D\u0430 \u043F\u043E\u043B\u043A\u0430\u0445.") : null), /*#__PURE__*/React.createElement(Icon, {
    name: "ChevronRight",
    size: 20
  }));
}
const choices = n => {
  const a = n % 10,
    b = n % 100;
  if (a === 1 && b !== 11) return 'выбор';
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'выбора';
  return 'выборов';
};
function RecommendationsScreen({
  mixes,
  onOpen,
  onChoose,
  onOpenOnboarding,
  onOpenCatalog,
  onOpenMixer
}) {
  if (!mixes.length) {
    return /*#__PURE__*/React.createElement("section", {
      className: "aroma-recs-empty"
    }, /*#__PURE__*/React.createElement("h1", {
      className: "aroma-empty-title"
    }, "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E"), /*#__PURE__*/React.createElement("div", {
      className: "aroma-empty-actions"
    }, /*#__PURE__*/React.createElement(AromaCTA, {
      onClick: onOpenOnboarding
    }, "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0432\u043A\u0443\u0441\u044B"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "aroma-skip",
      onClick: onOpenCatalog
    }, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u0442\u0430\u043B\u043E\u0433")));
  }
  const [hero, ...rest] = mixes;
  return /*#__PURE__*/React.createElement("section", {
    className: "aroma-recs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-recs-head"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-ghost-sm",
    onClick: onOpenOnboarding
  }, "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0432\u043A\u0443\u0441\u044B")), /*#__PURE__*/React.createElement("article", {
    className: "aroma-recs-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-recs-hero-head"
  }, /*#__PURE__*/React.createElement(ProfileGlyph, {
    profiles: hero.flavorProfiles,
    size: 64
  }), /*#__PURE__*/React.createElement("div", {
    className: "aroma-recs-hero-text"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "aroma-recs-hero-title"
  }, hero.name), /*#__PURE__*/React.createElement("p", {
    className: "aroma-recs-hero-desc"
  }, hero.description))), /*#__PURE__*/React.createElement(SignatureBar, {
    profiles: hero.flavorProfiles,
    height: 6
  }), /*#__PURE__*/React.createElement(CompositionStack, {
    components: hero.components,
    showBar: false
  }), /*#__PURE__*/React.createElement("div", {
    className: "aroma-recs-hero-meta"
  }, hero.ratingsCount ? /*#__PURE__*/React.createElement(RatingPill, {
    rating: hero.avgRating
  }) : null, /*#__PURE__*/React.createElement("span", {
    className: "aroma-recs-hero-count"
  }, hero.popularity + ' ' + choices(hero.popularity))), /*#__PURE__*/React.createElement(AromaCTA, {
    onClick: () => onChoose(hero, 'recommendations')
  }, "\u041F\u043E\u043A\u0443\u0440\u0438\u0442\u044C")), rest.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h2", {
    className: "aroma-section-title"
  }, "\u0422\u043E\u0436\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0442"), /*#__PURE__*/React.createElement("div", {
    className: "aroma-list"
  }, rest.slice(0, 4).map(mix => /*#__PURE__*/React.createElement(MixRow, {
    key: mix.id,
    name: mix.name,
    profiles: mix.flavorProfiles,
    flavors: mix.flavors,
    rating: guestRating(mix),
    showGlyph: false,
    onClick: () => onOpen(mix, 'recommendations')
  })))) : null, onOpenMixer ? /*#__PURE__*/React.createElement(MixerInvite, {
    onOpen: onOpenMixer,
    note: true
  }) : null);
}

// Полки по образцу Okko (#175): заголовок с шевроном открывает подборку, под ним лента постеров.
function ShowcaseScreen({
  onOpen,
  onOpenRail,
  onOpenMixer
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "aroma-showcase"
  }, onOpenMixer ? /*#__PURE__*/React.createElement("div", {
    className: "aroma-showcase-invite"
  }, /*#__PURE__*/React.createElement(MixerInvite, {
    onOpen: onOpenMixer
  })) : null, M.rails.map(rail => /*#__PURE__*/React.createElement("section", {
    key: rail.id,
    className: "aroma-showcase-rail"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "aroma-showcase-rail-head"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-showcase-rail-open",
    onClick: () => onOpenRail(rail),
    "aria-label": 'Открыть подборку «' + rail.name + '», ' + railKind[rail.type].toLowerCase()
  }, /*#__PURE__*/React.createElement("span", {
    className: "aroma-showcase-rail-icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: railKindIcon[rail.type],
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    className: "aroma-showcase-rail-title"
  }, rail.name), /*#__PURE__*/React.createElement("span", {
    className: "aroma-showcase-rail-chevron"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ChevronRight",
    size: 22
  })))), /*#__PURE__*/React.createElement("div", {
    className: "aroma-showcase-scroller"
  }, rail.mixIds.map(id => {
    const mix = M.mixes.find(m => m.id === id);
    return /*#__PURE__*/React.createElement(ShowcaseCard, {
      key: id,
      name: mix.name,
      profiles: mix.flavorProfiles,
      rating: guestRating(mix),
      onClick: () => onOpen(mix, 'showcase')
    });
  })))));
}

// Каталог по варианту B (#181): фильтр — метка { kind: 'profile' | 'flavor', value }, как CatalogFilterTag в приложении.
const filterLabel = tag => tag.kind === 'profile' ? label(tag.value) : tag.value;
const sameFilter = (a, b) => a.kind === b.kind && a.value === b.value;
// Счётчики нужны только для порядка чипов: частые первыми. На самих чипах чисел нет.
const countBy = pick => M.mixes.reduce((acc, mix) => {
  pick(mix).forEach(v => {
    acc[v] = (acc[v] || 0) + 1;
  });
  return acc;
}, {});
const byCountDesc = (values, counts, toLabel = v => v) => [...values].sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || toLabel(a).localeCompare(toLabel(b), 'ru'));
// Сразу видны самые частые вкусы, остальные — по «Все N вкусов» или поиску.
const SHEET_FLAVOR_LIMIT = 18;
function FiltersIcon() {
  return /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    fill: "none",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 4h12M5 8h6M7 12h2",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round"
  }));
}

// Совпавшие с меткой или текстом вкусы — первыми, чтобы было видно, почему микс в выдаче.
function flavorsMatchedFirst(flavors, query, filters) {
  const q = query.trim().toLowerCase();
  const hit = f => filters.some(t => t.kind === 'flavor' && t.value === f) || q !== '' && f.includes(q);
  return [...flavors.filter(hit), ...flavors.filter(f => !hit(f))];
}
function CatalogScreen({
  query,
  setQuery,
  filters,
  onRemoveFilter,
  onOpenFilters,
  results,
  onOpen,
  onReset
}) {
  const last = filters[filters.length - 1];
  const dirty = Boolean(query.trim()) || filters.length > 0;
  return /*#__PURE__*/React.createElement("section", {
    className: "aroma-catalog"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-catalog-rail"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-catalog-search-row"
  }, /*#__PURE__*/React.createElement("input", {
    type: "search",
    className: "aroma-catalog-search",
    value: query,
    onChange: e => setQuery(e.target.value),
    placeholder: "\u041C\u0438\u043A\u0441, \u0432\u043A\u0443\u0441, \u0442\u0430\u0431\u0430\u043A",
    "aria-label": "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443",
    enterKeyHint: "search",
    autoComplete: "off"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: 'aroma-catalog-filter-btn' + (filters.length ? ' aroma-catalog-filter-btn-on' : ''),
    onClick: onOpenFilters,
    "aria-label": filters.length ? 'Фильтры, выбрано ' + filters.length : 'Фильтры'
  }, /*#__PURE__*/React.createElement(FiltersIcon, null), /*#__PURE__*/React.createElement("span", null, "\u0424\u0438\u043B\u044C\u0442\u0440\u044B"), filters.length ? /*#__PURE__*/React.createElement("span", {
    className: "aroma-catalog-filter-count"
  }, filters.length) : null)), filters.length ? /*#__PURE__*/React.createElement("div", {
    className: "aroma-catalog-tags",
    role: "group",
    "aria-label": "\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0444\u0438\u043B\u044C\u0442\u0440\u044B"
  }, filters.map(tag => /*#__PURE__*/React.createElement(AromaChip, {
    key: tag.kind + '-' + tag.value,
    active: true,
    profile: tag.kind === 'profile' ? tag.value : undefined,
    onClick: () => onRemoveFilter(tag)
  }, filterLabel(tag), /*#__PURE__*/React.createElement("span", {
    className: "aroma-catalog-tag-x",
    "aria-hidden": true
  }, "\xD7")))) : null), results.length ? /*#__PURE__*/React.createElement("div", {
    className: "aroma-catalog-meta"
  }, /*#__PURE__*/React.createElement("p", {
    className: "aroma-catalog-count"
  }, results.length + ' ' + plural(results.length)), dirty ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-skip",
    onClick: onReset
  }, "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C") : null) : null, !results.length ? /*#__PURE__*/React.createElement("div", {
    className: "aroma-catalog-empty"
  }, /*#__PURE__*/React.createElement("p", {
    className: "guest-status"
  }, last ? 'Ничего не найдено. Уберите один из фильтров.' : 'Ничего не найдено. Измените запрос.'), /*#__PURE__*/React.createElement("div", {
    className: "aroma-catalog-empty-actions"
  }, last ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-ghost-sm",
    onClick: () => onRemoveFilter(last)
  }, 'Убрать: ' + filterLabel(last)) : null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: last ? 'aroma-skip' : 'aroma-ghost-sm',
    onClick: onReset
  }, last ? 'Сбросить всё' : 'Очистить поиск'))) : null, /*#__PURE__*/React.createElement("div", {
    className: "aroma-catalog-list"
  }, results.map(mix => /*#__PURE__*/React.createElement(MixRow, {
    key: mix.id,
    name: mix.name,
    profiles: mix.flavorProfiles,
    flavors: flavorsMatchedFirst(mix.flavors, query, filters),
    rating: guestRating(mix),
    glyphSize: 36,
    style: {
      padding: '7px 12px'
    },
    onClick: () => onOpen(mix, 'catalog')
  }))));
}

// Шторка «Фильтры» — разметка карточки микса; выбор применяется сразу, CTA только закрывает.
function CatalogFiltersSheet({
  filters,
  onToggle,
  onReset,
  resultCount,
  onClose
}) {
  const [find, setFind] = React.useState('');
  const [showAll, setShowAll] = React.useState(false);
  // Как availableProfileOptions в приложении: только характеры, которые есть в каталоге.
  // Считаются при рендере: в _ds_bundle.js этот файл исполняется раньше mock-data.js.
  const profileCounts = countBy(mix => mix.flavorProfiles);
  const flavorCounts = countBy(mix => mix.flavors);
  const profiles = byCountDesc(Object.keys(M.profileLabels).filter(p => profileCounts[p]), profileCounts, label);
  const flavors = byCountDesc(M.flavors, flavorCounts);
  const f = find.trim().toLowerCase();
  const visibleFlavors = f ? flavors.filter(x => x.includes(f)) : showAll ? flavors : flavors.slice(0, SHEET_FLAVOR_LIMIT);
  const isOn = tag => filters.some(t => sameFilter(t, tag));
  const chip = tag => /*#__PURE__*/React.createElement(AromaChip, {
    key: tag.value,
    active: isOn(tag),
    profile: tag.kind === 'profile' ? tag.value : undefined,
    onClick: () => onToggle(tag)
  }, filterLabel(tag));
  return /*#__PURE__*/React.createElement("div", {
    className: "aroma-sheet-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("section", {
    className: "aroma-sheet",
    role: "dialog",
    "aria-label": "\u0424\u0438\u043B\u044C\u0442\u0440\u044B",
    onClick: e => e.stopPropagation(),
    style: {
      background: 'var(--guest-sheet-bg)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aroma-sheet-handle",
    "aria-hidden": true
  }), /*#__PURE__*/React.createElement("div", {
    className: "aroma-catalog-sheet-head"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "aroma-sheet-title"
  }, "\u0424\u0438\u043B\u044C\u0442\u0440\u044B"), filters.length ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-skip",
    onClick: onReset
  }, "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C") : null), /*#__PURE__*/React.createElement("section", {
    className: "aroma-sheet-block"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "aroma-label"
  }, "\u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440"), /*#__PURE__*/React.createElement("div", {
    className: "aroma-catalog-sheet-chips",
    role: "group",
    "aria-label": "\u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440"
  }, profiles.map(p => chip({
    kind: 'profile',
    value: p
  })))), /*#__PURE__*/React.createElement("section", {
    className: "aroma-sheet-block"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "aroma-label"
  }, "\u0412\u043A\u0443\u0441\u044B"), /*#__PURE__*/React.createElement("input", {
    type: "search",
    className: "aroma-catalog-sheet-search",
    value: find,
    onChange: e => setFind(e.target.value),
    placeholder: "\u041D\u0430\u0439\u0442\u0438 \u0432\u043A\u0443\u0441",
    "aria-label": "\u041D\u0430\u0439\u0442\u0438 \u0432\u043A\u0443\u0441",
    enterKeyHint: "search",
    autoComplete: "off"
  }), /*#__PURE__*/React.createElement("div", {
    className: "aroma-catalog-sheet-chips",
    role: "group",
    "aria-label": "\u0412\u043A\u0443\u0441\u044B"
  }, visibleFlavors.map(v => chip({
    kind: 'flavor',
    value: v
  }))), f && !visibleFlavors.length ? /*#__PURE__*/React.createElement("p", {
    className: "aroma-catalog-sheet-hint"
  }, "\u0422\u0430\u043A\u043E\u0433\u043E \u0432\u043A\u0443\u0441\u0430 \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u043D\u0435\u0442.") : null, !f && !showAll && flavors.length > SHEET_FLAVOR_LIMIT ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-skip aroma-catalog-sheet-more",
    onClick: () => setShowAll(true)
  }, 'Все ' + flavors.length + ' вкусов') : null), /*#__PURE__*/React.createElement(AromaCTA, {
    disabled: !resultCount,
    onClick: onClose
  }, resultCount ? 'Показать ' + resultCount + ' ' + plural(resultCount) : 'Ничего не найдено')));
}
function RailScreen({
  rail,
  filters,
  toggleFilter,
  onBack,
  onOpen
}) {
  const mixes = rail.mixIds.map(id => M.mixes.find(m => m.id === id));
  const options = Array.from(new Set(mixes.flatMap(m => m.flavorProfiles)));
  const visible = filters.length ? mixes.filter(m => m.flavorProfiles.some(p => filters.includes(p))) : mixes;
  return /*#__PURE__*/React.createElement("section", {
    className: "aroma-rail"
  }, /*#__PURE__*/React.createElement("header", {
    className: "aroma-rail-topbar"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-rail-back",
    onClick: onBack,
    "aria-label": "\u041D\u0430\u0437\u0430\u0434 \u043A \u0432\u0438\u0442\u0440\u0438\u043D\u0435"
  }, "\u2190")), /*#__PURE__*/React.createElement("div", {
    className: "aroma-rail-intro"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "aroma-rail-title"
  }, rail.name), /*#__PURE__*/React.createElement("p", {
    className: "aroma-rail-desc"
  }, rail.description)), /*#__PURE__*/React.createElement("div", {
    className: "aroma-chip-scroll"
  }, /*#__PURE__*/React.createElement(AromaChip, {
    tier: "lg",
    active: !filters.length,
    onClick: () => toggleFilter(null)
  }, "\u0412\u0441\u0435"), options.map(p => /*#__PURE__*/React.createElement(AromaChip, {
    key: p,
    tier: "lg",
    profile: p,
    active: filters.includes(p),
    onClick: () => toggleFilter(p)
  }, label(p)))), !visible.length ? /*#__PURE__*/React.createElement("p", {
    className: "guest-status"
  }, "\u041F\u043E \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u043C \u043F\u0440\u043E\u0444\u0438\u043B\u044F\u043C \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.") : null, /*#__PURE__*/React.createElement("div", {
    className: "aroma-list"
  }, visible.map(mix => /*#__PURE__*/React.createElement(MixRow, {
    key: mix.id,
    name: mix.name,
    profiles: mix.flavorProfiles,
    flavors: mix.flavors,
    rating: guestRating(mix),
    glyphSize: 60,
    onClick: () => onOpen(mix, 'rail')
  }))));
}

// Сердечко (#151): не акцентное — выключено --text-muted, включено кремовое с заливкой.
function HeartButton({
  on,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "heart-btn",
    "aria-pressed": on,
    "aria-label": on ? 'Убрать из избранного' : 'В избранное',
    onClick: onClick
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Heart",
    size: 22,
    fill: on ? 'currentColor' : 'none'
  }));
}
function MixSheet({
  state,
  rating,
  onRate,
  onClose,
  onChoose,
  favorite = false,
  onFavorite
}) {
  if (!state) return null;
  const {
    mix,
    source
  } = state;
  return /*#__PURE__*/React.createElement("div", {
    className: "aroma-sheet-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("section", {
    className: "aroma-sheet",
    role: "dialog",
    "aria-label": mix.name,
    onClick: e => e.stopPropagation(),
    style: {
      background: 'var(--guest-sheet-bg)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aroma-sheet-handle",
    "aria-hidden": true
  }), /*#__PURE__*/React.createElement("div", {
    className: "aroma-sheet-head"
  }, /*#__PURE__*/React.createElement(ProfileGlyph, {
    profiles: mix.flavorProfiles,
    size: 72
  }), /*#__PURE__*/React.createElement("div", {
    className: "aroma-sheet-head-text"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "aroma-sheet-title"
  }, mix.name), /*#__PURE__*/React.createElement(SignatureBar, {
    profiles: mix.flavorProfiles,
    height: 4
  })), onFavorite ? /*#__PURE__*/React.createElement(HeartButton, {
    on: favorite,
    onClick: () => onFavorite(mix)
  }) : null), /*#__PURE__*/React.createElement("p", {
    className: "aroma-sheet-desc"
  }, mix.description), /*#__PURE__*/React.createElement("div", {
    className: "aroma-sheet-tags"
  }, mix.flavorProfiles.map(p => /*#__PURE__*/React.createElement(AromaChip, {
    key: p,
    tier: "lg",
    active: true,
    profile: p
  }, label(p))), mix.flavors.map(f => /*#__PURE__*/React.createElement(AromaChip, {
    key: f
  }, f))), /*#__PURE__*/React.createElement("section", {
    className: "aroma-sheet-block"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "aroma-label"
  }, "\u0421\u043E\u0441\u0442\u0430\u0432"), /*#__PURE__*/React.createElement(CompositionStack, {
    components: mix.components
  })), /*#__PURE__*/React.createElement("section", {
    className: "aroma-sheet-block"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "aroma-label"
  }, "\u0412\u0430\u0448\u0430 \u043E\u0446\u0435\u043D\u043A\u0430"), /*#__PURE__*/React.createElement("div", {
    className: "aroma-stars",
    role: "group",
    "aria-label": "\u041E\u0446\u0435\u043D\u043A\u0430 \u043C\u0438\u043A\u0441\u0430"
  }, [1, 2, 3, 4, 5].map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    type: "button",
    className: 'aroma-star' + (rating >= v ? ' on' : ''),
    onClick: () => onRate(v),
    "aria-label": 'Оценить на ' + v
  }, "\u2605"))), rating ? /*#__PURE__*/React.createElement("p", {
    className: "guest-ok"
  }, 'Оценка ' + rating + ' сохранена.') : null), /*#__PURE__*/React.createElement("div", {
    className: "aroma-sheet-actions"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-ghost",
    onClick: onClose
  }, source === 'reels' ? 'К рилсам' : 'Закрыть'), /*#__PURE__*/React.createElement(AromaCTA, {
    pulse: true,
    onClick: () => onChoose(mix, source)
  }, "\u041F\u043E\u043A\u0443\u0440\u0438\u0442\u044C"))));
}

// ── Рилсы (#153) ──
// Сознательное исключение из VISUAL FOUNDATIONS: линейные мотивы и анимированный фон — только в разделе «Рилсы»
// и в кружках полосы над Подбором. Сцены здесь — CSS-приближение мокапа design/design_handoff_reels/,
// в приложении это композиции Remotion в @remotion/player.

// Правило выбора сцены: профили у миксов раздуты и не упорядочены по силе, поэтому сцена берётся из flavors.
const MOTIFS = {
  frost: {
    profile: 'minty',
    alt: 'fresh',
    words: ['холодок', 'мята', 'ментол', 'лёд', 'лед', 'ледян']
  },
  bloom: {
    profile: 'floral_herbal',
    alt: 'perfume',
    words: ['цветочн', 'лаванда', 'ромашка', 'роза', 'бузина', 'жасмин', 'хвойн', 'базилик', 'тархун', 'травян', 'можжевельник', 'чай']
  },
  juicy: {
    profile: 'citrus',
    alt: 'fruity',
    words: ['лимон', 'лайм', 'грейпфрут', 'апельсин', 'мандарин', 'бергамот', 'ананас', 'манго', 'банан', 'киви', 'персик', 'яблоко', 'груша', 'арбуз', 'дыня', 'кокос', 'марула', 'кола', 'энергетик', 'огурец']
  },
  berry: {
    profile: 'berry',
    alt: 'fruity',
    words: ['малина', 'клубника', 'черника', 'вишня', 'ежевика', 'голубика', 'клюква', 'смородина', 'барбарис', 'виноград', 'ягод', 'ревень']
  },
  warm: {
    profile: 'dessert',
    alt: 'spicy',
    words: ['ваниль', 'шоколад', 'какао', 'печенье', 'пирог', 'чизкейк', 'тирамису', 'молоко', 'булочка', 'корица', 'кардамон', 'перец', 'кашмир', 'мед', 'мёд', 'орех', 'орчата', 'ром', 'жвачка']
  },
  smoke: {
    profile: 'tobacco',
    alt: 'spicy',
    words: ['табачн', 'сигар', 'бекон', 'томат', 'копчен']
  }
};
const CITRUS = ['лимон', 'лайм', 'грейпфрут', 'апельсин', 'мандарин', 'бергамот'];
const SPICE = ['корица', 'кардамон', 'перец', 'кашмир'];
const PROFILE_TO_MOTIF = {
  minty: 'frost',
  fresh: 'frost',
  floral_herbal: 'bloom',
  perfume: 'bloom',
  citrus: 'juicy',
  fruity: 'juicy',
  sour: 'juicy',
  berry: 'berry',
  dessert: 'warm',
  sweet: 'warm',
  spicy: 'warm',
  tobacco: 'smoke'
};
const profileVar = profile => 'var(--profile-' + profile.replace('_', '-') + ')';
const hits = (flavors, words) => flavors.filter(f => words.some(w => f.toLowerCase().includes(w)));
function pickScene(mix) {
  const scored = Object.entries(MOTIFS).map(([id, motif]) => {
    const found = hits(mix.flavors, motif.words);
    return {
      id,
      count: found.length,
      first: found.length ? mix.flavors.indexOf(found[0]) : 99
    };
  }).filter(m => m.count)
  // Холод перебивает всё: самое яркое ощущение.
  .sort((a, b) => (b.id === 'frost') - (a.id === 'frost') || b.count - a.count || a.first - b.first);
  const primary = scored[0] ? scored[0].id : PROFILE_TO_MOTIF[mix.flavorProfiles[0]] || 'smoke';
  const secondary = scored[1] ? scored[1].id : null;
  const colorOf = id => {
    if (id === 'juicy') return hits(mix.flavors, CITRUS).length ? 'citrus' : 'fruity';
    if (id === 'warm') return hits(mix.flavors, SPICE).length >= hits(mix.flavors, MOTIFS.warm.words).length / 2 ? 'spicy' : 'dessert';
    return MOTIFS[id].profile;
  };
  return {
    primary,
    secondary,
    c1: colorOf(primary),
    c2: secondary ? colorOf(secondary) : MOTIFS[primary].alt
  };
}

// Детерминированный шум: один и тот же микс всегда выглядит одинаково (в Remotion — random(seed) с seed = mix.id).
function seeded(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ h >>> 15, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Мотивы стиля B: штрих 1,2–1,4 в цвете профиля, без заливки, как у знака «Дым».
const SHAPES = {
  frost: /*#__PURE__*/React.createElement("svg", {
    viewBox: "-12 -12 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.2",
    strokeLinecap: "round"
  }, [0, 60, 120].map(r => /*#__PURE__*/React.createElement("g", {
    key: r,
    transform: 'rotate(' + r + ')'
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0 -11V11"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M-3 -8L0 -5L3 -8M-3 8L0 5L3 8"
  })))),
  bloom: /*#__PURE__*/React.createElement("svg", {
    viewBox: "-12 -12 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.2"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0 -11C6 -5 6 5 0 11C-6 5 -6 -5 0 -11Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M0 -8V8",
    strokeLinecap: "round"
  })),
  juicy: /*#__PURE__*/React.createElement("svg", {
    viewBox: "-12 -12 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.2"
  }, /*#__PURE__*/React.createElement("circle", {
    r: "10"
  }), /*#__PURE__*/React.createElement("circle", {
    r: "7.5"
  }), [0, 60, 120].map(r => /*#__PURE__*/React.createElement("path", {
    key: r,
    d: "M0 -7.5V7.5",
    transform: 'rotate(' + r + ')'
  }))),
  berry: /*#__PURE__*/React.createElement("svg", {
    viewBox: "-12 -12 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.2"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "-4",
    cy: "2",
    r: "5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "4",
    cy: "3",
    r: "5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "0",
    cy: "-4",
    r: "5"
  })),
  warm: /*#__PURE__*/React.createElement("svg", {
    viewBox: "-12 -12 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.4",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0 8V-8"
  })),
  smoke: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 40 120",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.4",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 118C4 96 36 78 20 58C6 40 32 22 22 2"
  }))
};
const PARTICLES = {
  frost: {
    n: 26,
    size: [10, 18],
    y: [-8, 10]
  },
  bloom: {
    n: 12,
    size: [14, 22],
    y: [70, 100]
  },
  juicy: {
    n: 16,
    size: [16, 26],
    y: [80, 105]
  },
  berry: {
    n: 16,
    size: [16, 24],
    y: [10, 60]
  },
  warm: {
    n: 26,
    size: [12, 18],
    y: [85, 105]
  },
  smoke: {
    n: 7,
    size: [30, 44],
    y: [70, 100]
  }
};
// Бесшовный цикл около 6 с; струи дыма прорисовываются вдвое медленнее.
const CYCLE = 6;
function particles(motif, rand, color, count) {
  const cfg = PARTICLES[motif];
  const [lo, hi] = cfg.size;
  return Array.from({
    length: count || cfg.n
  }, (_, i) => {
    const s = lo + rand() * (hi - lo);
    const style = {
      '--x': (rand() * 100).toFixed(1) + '%',
      '--y': (cfg.y[0] + rand() * (cfg.y[1] - cfg.y[0])).toFixed(1) + '%',
      '--s': Math.round(motif === 'smoke' ? s * 3 : s) + 'px',
      '--dl': (-rand() * CYCLE).toFixed(2) + 's',
      '--d': CYCLE * (motif === 'smoke' ? 2 : 1) + 's',
      '--dx': Math.round((rand() - 0.5) * 80) + 'px',
      '--pc': profileVar(color)
    };
    if (motif === 'smoke') style.width = Math.round(s) + 'px';
    return /*#__PURE__*/React.createElement("span", {
      key: motif + i,
      className: 'p m-' + motif,
      style: style
    }, SHAPES[motif]);
  });
}
function Scene({
  mix,
  playing = true
}) {
  const {
    primary,
    secondary,
    c1,
    c2
  } = pickScene(mix);
  const rand = seeded(mix.id);
  return /*#__PURE__*/React.createElement("div", {
    className: 'scene' + (playing ? '' : ' scene-paused'),
    style: {
      '--c1': profileVar(c1),
      '--c2': profileVar(c2)
    },
    "aria-hidden": true
  }, primary === 'frost' ? /*#__PURE__*/React.createElement("span", {
    className: "frost-rim"
  }) : null, primary === 'bloom' ? /*#__PURE__*/React.createElement("span", {
    className: "bloom-core"
  }, [0, 72, 144, 216, 288].map((r, i) => /*#__PURE__*/React.createElement("span", {
    key: r,
    className: "bloom-petal",
    style: {
      rotate: r + 'deg',
      animationDelay: -i * 0.4 + 's'
    }
  }))) : null, primary === 'juicy' ? /*#__PURE__*/React.createElement("span", {
    className: "juicy-ring"
  }) : null, primary === 'warm' ? /*#__PURE__*/React.createElement("span", {
    className: "warm-glow"
  }) : null, particles(primary, rand, c1), secondary ? particles(secondary, rand, c2, Math.ceil(PARTICLES[secondary].n / 3)) : null);
}

// Полоса превью над Подбором: первые восемь миксов ленты, статичный кадр сцены в кружке 60px.
function ReelStrip({
  mixes,
  onOpen
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "reel-strip",
    role: "list",
    "aria-label": "\u0420\u0438\u043B\u0441\u044B"
  }, mixes.slice(0, 8).map((mix, i) => /*#__PURE__*/React.createElement("button", {
    key: mix.id,
    type: "button",
    role: "listitem",
    className: "reel-strip-item",
    onClick: () => onOpen(i)
  }, /*#__PURE__*/React.createElement("span", {
    className: "reel-strip-thumb"
  }, /*#__PURE__*/React.createElement(Scene, {
    mix: mix,
    playing: false
  })), /*#__PURE__*/React.createElement("span", {
    className: "reel-strip-name"
  }, mix.name))));
}
function Reel({
  mix,
  index,
  total,
  active,
  paused,
  hint,
  favorite,
  onFavorite,
  onTogglePause,
  onOpen,
  onChoose
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "reel",
    "aria-label": mix.name
  }, /*#__PURE__*/React.createElement(Scene, {
    mix: mix,
    playing: active && !paused
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "reel-tap",
    "aria-label": paused ? 'Продолжить' : 'Пауза',
    onClick: onTogglePause
  }), paused ? /*#__PURE__*/React.createElement("span", {
    className: "reel-paused"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Play",
    size: 22
  })) : null, /*#__PURE__*/React.createElement("div", {
    className: 'reel-dock' + (active ? ' reel-reveal' : ''),
    key: active ? 'on' : 'off'
  }, hint ? /*#__PURE__*/React.createElement("span", {
    className: "reel-hint"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ChevronUp",
    size: 18
  }), "\u041B\u0438\u0441\u0442\u0430\u0439\u0442\u0435 \u0432\u0432\u0435\u0440\u0445") : null, /*#__PURE__*/React.createElement("div", {
    className: "reel-name-row"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "reel-name"
  }, mix.name), /*#__PURE__*/React.createElement(HeartButton, {
    on: favorite,
    onClick: () => onFavorite(mix)
  })), /*#__PURE__*/React.createElement("p", {
    className: "reel-flavors"
  }, mix.flavors.join(', ')), mix.ratingsCount ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(RatingPill, {
    rating: mix.avgRating
  })) : null, /*#__PURE__*/React.createElement(CompositionStack, {
    components: mix.components,
    showBar: false
  }), /*#__PURE__*/React.createElement("div", {
    className: "reel-actions"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-ghost",
    onClick: () => onOpen(mix, 'reels')
  }, "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435"), /*#__PURE__*/React.createElement(AromaCTA, {
    onClick: () => onChoose(mix, 'reels')
  }, "\u041F\u043E\u043A\u0443\u0440\u0438\u0442\u044C"))));
}

// Лента: вертикальный свайп со снапом, один жест — один рилс. Играет только активный рилс,
// соседи — статичный кадр, дальше — пустые слоты той же высоты.
function ReelsScreen({
  mixes,
  start = 0,
  favoriteIds,
  onFavorite,
  onOpen,
  onChoose
}) {
  const ref = React.useRef(null);
  const [active, setActive] = React.useState(start);
  const [paused, setPaused] = React.useState(false);
  const [swiped, setSwiped] = React.useState(false);
  React.useEffect(() => {
    const root = ref.current;
    root.scrollTop = start * root.clientHeight;
    // Первый вызов observer — стартовый рилс, это ещё не свайп.
    let initial = true;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting || initial) return;
        setActive(Number(e.target.dataset.i));
        setPaused(false);
        setSwiped(true);
      });
      initial = false;
    }, {
      root,
      threshold: 0.6
    });
    root.querySelectorAll('[data-i]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "reels",
    ref: ref
  }, mixes.map((mix, i) => /*#__PURE__*/React.createElement("div", {
    key: mix.id,
    "data-i": i,
    className: "reel-slot"
  }, Math.abs(i - active) <= 1 ? /*#__PURE__*/React.createElement(Reel, {
    mix: mix,
    index: i,
    total: mixes.length,
    active: i === active,
    paused: i === active && paused,
    hint: i === start && !swiped,
    favorite: favoriteIds.includes(mix.id),
    onFavorite: onFavorite,
    onTogglePause: () => setPaused(!paused),
    onOpen: onOpen,
    onChoose: onChoose
  }) : null)));
}
function ConfirmationScreen({
  mix,
  onDone
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "aroma-confirm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-confirm-topbar"
  }, /*#__PURE__*/React.createElement("p", {
    className: "aroma-confirm-note"
  }, "\u041F\u043E\u043A\u0430\u0436\u0438\u0442\u0435 \u043C\u0430\u0441\u0442\u0435\u0440\u0443"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-confirm-done",
    onClick: onDone
  }, "\u0413\u043E\u0442\u043E\u0432\u043E")), /*#__PURE__*/React.createElement("div", {
    className: "aroma-confirm-stack"
  }, /*#__PURE__*/React.createElement(ProfileGlyph, {
    profiles: mix.flavorProfiles,
    size: 96
  }), /*#__PURE__*/React.createElement("h1", {
    className: "aroma-confirm-title"
  }, mix.name), /*#__PURE__*/React.createElement("p", {
    className: "aroma-confirm-profiles"
  }, mix.flavorProfiles.map((p, i) => i ? label(p).toLowerCase() : label(p)).join(', ')), /*#__PURE__*/React.createElement(SignatureBar, {
    profiles: mix.flavorProfiles,
    height: 3
  })), /*#__PURE__*/React.createElement("section", {
    className: "aroma-confirm-composition",
    "aria-label": "\u0421\u043E\u0441\u0442\u0430\u0432"
  }, /*#__PURE__*/React.createElement(CompositionStack, {
    components: mix.components,
    showBar: false
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-ghost aroma-confirm-rate",
    onClick: onDone
  }, "\u041E\u0446\u0435\u043D\u0438\u0442\u044C, \u043A\u043E\u0433\u0434\u0430 \u0441\u043E\u0431\u0435\u0440\u0443\u0442"));
}
Object.assign(window, {
  Icon,
  MixerInvite,
  AccessScreen,
  IntroScreen,
  OnboardingScreen,
  RecommendationsScreen,
  ShowcaseScreen,
  CatalogScreen,
  CatalogFiltersSheet,
  RailScreen,
  MixSheet,
  ReelStrip,
  ReelsScreen,
  ConfirmationScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/aroma-guest/GuestScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/aroma-guest/mock-data.js
try { (() => {
// Mock catalogue for the Арома Ателье guest kit — real mixes from docs/data/top-20-mixes.md.
// ratingsCount: 0 — микс без оценок гостей: avgRating у него базовый из Мастера, «★» не показывается (#185).
window.AROMA_MOCK = {
  profileLabels: {
    sweet: 'Сладкий',
    sour: 'Кислый',
    spicy: 'Пряный',
    fresh: 'Свежий',
    dessert: 'Десертный',
    tobacco: 'Табачный',
    minty: 'Мятный',
    fruity: 'Фруктовый',
    floral_herbal: 'Цветочно-травяной',
    citrus: 'Цитрусовый',
    berry: 'Ягодный',
    perfume: 'Парфюмный'
  },
  flavors: ['земляника', 'лесные ягоды', 'чёрный чай', 'кола', 'банан', 'манго', 'мороженое', 'клубника', 'лимон', 'ананас', 'апельсин', 'корица', 'дыня', 'мята', 'мандарин', 'молоко', 'черника', 'печенье', 'чизкейк', 'виноград'],
  introCards: [{
    id: 'i1',
    title: 'Подберём микс под ваши вкусы',
    description: 'Выберите профили и вкусы. Подбор соберём из табаков, которые сегодня есть в зале.'
  }, {
    id: 'i2',
    title: 'Подборки на витрине',
    description: 'Миксы мастеров зала и то, что чаще выбирают гости.'
  }, {
    id: 'i3',
    title: 'Каталог для тех, кто знает, что ищет',
    description: 'Поиск по названию, вкусу и табаку. Миксов, которых сейчас нет, в каталоге нет.'
  }, {
    id: 'i4',
    title: 'Покажите карточку мастеру',
    description: 'Когда выберете микс, на экране останется карточка с составом.'
  }],
  mixes: [{
    id: 'm1',
    name: 'Морозная ягода',
    description: 'Земляника и лесные ягоды на чёрном чае, с холодком.',
    flavorProfiles: ['berry', 'fresh'],
    flavors: ['земляника', 'лесные ягоды', 'чёрный чай'],
    avgRating: 4.7,
    ratingsCount: 38,
    popularity: 214,
    components: [{
      id: 'c1',
      name: 'Red Tea',
      manufacturer: 'Darkside',
      proportion: 50
    }, {
      id: 'c2',
      name: 'Wildberry',
      manufacturer: 'Darkside',
      proportion: 40
    }, {
      id: 'c3',
      name: 'Supernova',
      manufacturer: 'Darkside',
      proportion: 10
    }]
  }, {
    id: 'm2',
    name: 'Космокола',
    description: 'Газировка с цветочной нотой и ледяным финалом.',
    flavorProfiles: ['sweet', 'floral_herbal'],
    flavors: ['кола', 'цветочный'],
    avgRating: 4.4,
    ratingsCount: 21,
    popularity: 168,
    components: [{
      id: 'c4',
      name: 'Cosmo Flower',
      manufacturer: 'Darkside',
      proportion: 45
    }, {
      id: 'c5',
      name: 'Cola',
      manufacturer: 'Darkside',
      proportion: 30
    }, {
      id: 'c6',
      name: 'Supernova',
      manufacturer: 'Darkside',
      proportion: 25
    }]
  }, {
    id: 'm3',
    name: 'Тропики',
    description: 'Банан и манго-ласси. Плотный и сладкий, без холодка.',
    flavorProfiles: ['fruity', 'dessert'],
    flavors: ['банан', 'манго', 'йогурт'],
    avgRating: 4.5,
    ratingsCount: 0,
    popularity: 151,
    components: [{
      id: 'c7',
      name: 'Bananapapa',
      manufacturer: 'Darkside',
      proportion: 60
    }, {
      id: 'c8',
      name: 'Mango Lassi',
      manufacturer: 'Darkside',
      proportion: 40
    }]
  }, {
    id: 'm4',
    name: 'Клубничный лёд',
    description: 'Клубника с мороженым. Спокойный микс для первого раза.',
    flavorProfiles: ['berry', 'dessert'],
    flavors: ['клубника', 'мороженое'],
    avgRating: 4.3,
    ratingsCount: 12,
    popularity: 139,
    components: [{
      id: 'c9',
      name: 'Strawberry Light',
      manufacturer: 'Darkside',
      proportion: 70
    }, {
      id: 'c10',
      name: 'Dark Icecream',
      manufacturer: 'Darkside',
      proportion: 30
    }]
  }, {
    id: 'm5',
    name: 'Lemon Pineapple',
    description: 'Кислинка лимона на ананасовой базе.',
    flavorProfiles: ['citrus', 'fruity'],
    flavors: ['лимон', 'ананас'],
    avgRating: 4.2,
    ratingsCount: 7,
    popularity: 121,
    components: [{
      id: 'c11',
      name: 'Lemonblast',
      manufacturer: 'Darkside',
      proportion: 65
    }, {
      id: 'c12',
      name: 'Pineapple',
      manufacturer: 'Serbetli',
      proportion: 35
    }]
  }, {
    id: 'm6',
    name: 'Pirate Citrus',
    description: 'Апельсин и мандарин с ром-пуншем, лёгкий холодок.',
    flavorProfiles: ['citrus', 'sweet'],
    flavors: ['апельсин', 'мандарин', 'ром-пунш'],
    avgRating: 4.6,
    ratingsCount: 16,
    popularity: 118,
    components: [{
      id: 'c13',
      name: 'Orange Team',
      manufacturer: 'MustHave',
      proportion: 50
    }, {
      id: 'c14',
      name: 'Pirates Cave',
      manufacturer: 'Starbuzz',
      proportion: 40
    }, {
      id: 'c15',
      name: 'Ice Mint',
      manufacturer: 'MustHave',
      proportion: 10
    }]
  }, {
    id: 'm7',
    name: 'Cinnamon Red Tea',
    description: 'Корица на чёрном чае.',
    flavorProfiles: ['spicy', 'tobacco'],
    flavors: ['корица', 'чёрный чай'],
    avgRating: 4.1,
    ratingsCount: 5,
    popularity: 96,
    components: [{
      id: 'c16',
      name: 'Cinnamon Roll',
      manufacturer: 'MustHave',
      proportion: 50
    }, {
      id: 'c17',
      name: 'Red Tea',
      manufacturer: 'Darkside',
      proportion: 50
    }]
  }, {
    id: 'm8',
    name: 'Pineapple Mint',
    description: 'Ананас с мятой.',
    flavorProfiles: ['fruity', 'minty'],
    flavors: ['ананас', 'мята'],
    avgRating: 4.4,
    ratingsCount: 9,
    popularity: 108,
    components: [{
      id: 'c18',
      name: 'Pineapple Rings',
      manufacturer: 'MustHave',
      proportion: 70
    }, {
      id: 'c19',
      name: 'Мята',
      manufacturer: 'BlackBurn',
      proportion: 30
    }]
  }, {
    id: 'm9',
    name: 'Лимонный пирог',
    description: 'Гастро-десертка: лимонный пирог на молоке.',
    flavorProfiles: ['dessert', 'citrus'],
    flavors: ['лимонный пирог', 'молоко'],
    avgRating: 4.5,
    ratingsCount: 0,
    popularity: 87,
    components: [{
      id: 'c20',
      name: 'Lemon Pie',
      manufacturer: 'Adalya',
      proportion: 70
    }, {
      id: 'c21',
      name: 'Молоко',
      manufacturer: 'Adalya',
      proportion: 30
    }]
  }, {
    id: 'm10',
    name: 'Cheesecake Wild Forest',
    description: 'Чизкейк, лесные ягоды и виноградный холодок.',
    flavorProfiles: ['dessert', 'berry'],
    flavors: ['чизкейк', 'лесные ягоды', 'виноград'],
    avgRating: 4.8,
    ratingsCount: 27,
    popularity: 176,
    components: [{
      id: 'c22',
      name: 'Cheesecake',
      manufacturer: 'Spectrum',
      proportion: 40
    }, {
      id: 'c23',
      name: 'Wild Forest',
      manufacturer: 'Spectrum',
      proportion: 30
    }, {
      id: 'c24',
      name: 'Ice Granny',
      manufacturer: 'BlackBurn',
      proportion: 30
    }]
  }, {
    id: 'm11',
    name: 'Молоко-Черника',
    description: 'Черника с молоком.',
    flavorProfiles: ['berry', 'dessert'],
    flavors: ['молоко', 'черника'],
    avgRating: 4.0,
    ratingsCount: 4,
    popularity: 74,
    components: [{
      id: 'c25',
      name: 'Черника',
      manufacturer: 'Adalya',
      proportion: 70
    }, {
      id: 'c26',
      name: 'Молоко',
      manufacturer: 'Adalya',
      proportion: 30
    }]
  }, {
    id: 'm12',
    name: 'Bodrum Tangerine',
    description: 'Мандарин, мята и жвачка.',
    flavorProfiles: ['citrus', 'minty'],
    flavors: ['мандарин', 'мята', 'жвачка'],
    avgRating: 4.2,
    ratingsCount: 0,
    popularity: 92,
    components: [{
      id: 'c27',
      name: 'Bodrum Tangerine',
      manufacturer: 'Serbetli',
      proportion: 50
    }, {
      id: 'c28',
      name: 'Fresh Mist',
      manufacturer: 'AlFakher',
      proportion: 30
    }, {
      id: 'c29',
      name: 'Жвачка',
      manufacturer: 'AlFakher',
      proportion: 20
    }]
  }],
  rails: [{
    id: 'r1',
    name: 'Больше всего выбирают',
    type: 'statistical',
    description: 'Миксы, к которым гости возвращаются чаще всего.',
    mixIds: ['m1', 'm10', 'm2', 'm3', 'm4']
  }, {
    id: 'r2',
    name: 'Бабушкин буфет',
    type: 'prepared',
    description: 'Молоко, пирог и сладкое. Тёплые десертные миксы без льда.',
    mixIds: ['m11', 'm9', 'm3', 'm7']
  }, {
    id: 'r3',
    name: 'Советуют мастера',
    type: 'curated',
    description: 'Миксы, которые советуют мастера зала.',
    mixIds: ['m6', 'm5', 'm8', 'm12']
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/aroma-guest/mock-data.js", error: String((e && e.message) || e) }); }

// ui_kits/master/MasterApp.jsx
try { (() => {
// Мастер shell: login, then workspace with 5 module tabs and a ⌘K command palette.
const {
  MasterTopBar
} = window.DesignSystem_1aef33;
const {
  LoginScreen,
  DashboardScreen,
  InventoryScreen,
  MixesScreen,
  RailsScreen,
  MasterAccessScreen
} = window;
const TABS = [{
  id: 'dashboard',
  label: 'Дашборд'
}, {
  id: 'inventory',
  label: 'Табаки'
}, {
  id: 'mixes',
  label: 'Миксы'
}, {
  id: 'rails',
  label: 'Рейлы'
}, {
  id: 'access',
  label: 'Доступ'
}];
function CommandPalette({
  open,
  onClose,
  onNavigate
}) {
  const [q, setQ] = React.useState('');
  if (!open) return null;
  const items = TABS.map(t => ({
    id: t.id,
    label: 'Перейти: ' + t.label,
    group: 'Навигация'
  })).concat([{
    id: 'new-mix',
    label: 'Новый микс',
    group: 'Действия'
  }, {
    id: 'sign-out',
    label: 'Выйти',
    group: 'Действия'
  }]).filter(i => !q || i.label.toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    className: "cmdk-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "cmdk",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("input", {
    autoFocus: true,
    className: "cmdk-input",
    placeholder: "\u041D\u0430\u0439\u0442\u0438 \u0438\u043B\u0438 \u0441\u0434\u0435\u043B\u0430\u0442\u044C",
    value: q,
    onChange: e => setQ(e.target.value)
  }), /*#__PURE__*/React.createElement("ul", {
    className: "cmdk-list"
  }, items.map(i => /*#__PURE__*/React.createElement("li", {
    key: i.id,
    className: "cmdk-item",
    onClick: () => {
      if (TABS.some(t => t.id === i.id)) onNavigate(i.id);
      onClose();
    }
  }, /*#__PURE__*/React.createElement("span", null, i.label), /*#__PURE__*/React.createElement("span", {
    className: "cmdk-group"
  }, i.group))), !items.length ? /*#__PURE__*/React.createElement("li", {
    className: "cmdk-empty"
  }, "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.") : null)));
}
function MasterApp() {
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons({
      attrs: {
        width: 15,
        height: 15,
        'stroke-width': 1.9
      }
    });
  });
  const [user, setUser] = React.useState(null);
  const [login, setLogin] = React.useState('admin');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [tab, setTab] = React.useState('dashboard');
  const [palette, setPalette] = React.useState(false);
  React.useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(p => !p);
      }
      if (e.key === 'Escape') setPalette(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const submit = () => {
    if (!login.trim() || !password) {
      setError('Введите логин и пароль');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setUser({
        name: login,
        role: login === 'admin' ? 'admin' : 'master'
      });
    }, 350);
  };
  if (!user) {
    return /*#__PURE__*/React.createElement(LoginScreen, {
      login: login,
      setLogin: setLogin,
      password: password,
      setPassword: setPassword,
      error: error,
      loading: loading,
      onSubmit: submit
    });
  }
  return /*#__PURE__*/React.createElement("main", {
    className: "shell"
  }, /*#__PURE__*/React.createElement(MasterTopBar, {
    markSrc: "../../assets/logo-mark-oxblood.svg",
    items: TABS,
    active: tab,
    onChange: setTab,
    userName: user.name,
    userRole: user.role,
    onOpenCommandPalette: () => setPalette(true),
    onSignOut: () => {
      setUser(null);
      setPassword('');
      setTab('dashboard');
    }
  }), /*#__PURE__*/React.createElement("section", {
    className: "stage"
  }, tab === 'dashboard' ? /*#__PURE__*/React.createElement(DashboardScreen, {
    onNavigate: setTab
  }) : null, tab === 'inventory' ? /*#__PURE__*/React.createElement(InventoryScreen, null) : null, tab === 'mixes' ? /*#__PURE__*/React.createElement(MixesScreen, null) : null, tab === 'rails' ? /*#__PURE__*/React.createElement(RailsScreen, null) : null, tab === 'access' ? /*#__PURE__*/React.createElement(MasterAccessScreen, null) : null), /*#__PURE__*/React.createElement(CommandPalette, {
    open: palette,
    onClose: () => setPalette(false),
    onNavigate: setTab
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(MasterApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/master/MasterApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/master/MasterScreens.jsx
try { (() => {
// Мастер, экраны персонала. Recreation of apps/master-web views (login, dashboard, inventory, mixes, rails, access).
const {
  MasterButton,
  MasterIconButton,
  MasterTag,
  MasterToggle,
  MasterInput,
  StatusPill,
  MasterStatsRow,
  MasterPageHeader,
  FilterChip,
  MasterList,
  EmptyState,
  MasterSortPill,
  MasterCard
} = window.DesignSystem_1aef33;
const D = window.MASTER_MOCK;
function LoginScreen({
  login,
  setLogin,
  password,
  setPassword,
  error,
  loading,
  onSubmit
}) {
  const [reveal, setReveal] = React.useState(false);
  return /*#__PURE__*/React.createElement("main", {
    className: "auth-screen"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-brand"
  }, /*#__PURE__*/React.createElement("img", {
    className: "auth-mark",
    src: "../../assets/logo-mark-oxblood.svg",
    width: "30",
    height: "30",
    alt: "",
    "aria-hidden": true
  }), /*#__PURE__*/React.createElement("span", {
    className: "auth-brand-name"
  }, "\u0410\u0442\u0435\u043B\u044C\u0435 ", /*#__PURE__*/React.createElement("em", null, "\u041C\u0430\u0441\u0442\u0435\u0440"))), /*#__PURE__*/React.createElement("section", {
    className: "auth-card"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "auth-title"
  }, "\u0412\u043E\u0439\u0442\u0438 \u0432 \u0441\u043C\u0435\u043D\u0443"), /*#__PURE__*/React.createElement("form", {
    className: "auth-form",
    onSubmit: e => {
      e.preventDefault();
      onSubmit();
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "auth-label",
    htmlFor: "auth-login"
  }, "\u041B\u043E\u0433\u0438\u043D"), /*#__PURE__*/React.createElement(MasterInput, {
    id: "auth-login",
    size: "lg",
    value: login,
    onChange: setLogin,
    placeholder: "admin"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "auth-label",
    htmlFor: "auth-password"
  }, "\u041F\u0430\u0440\u043E\u043B\u044C"), /*#__PURE__*/React.createElement("div", {
    className: "auth-password"
  }, /*#__PURE__*/React.createElement(MasterInput, {
    id: "auth-password",
    size: "lg",
    type: reveal ? 'text' : 'password',
    value: password,
    onChange: setPassword,
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(MasterIconButton, {
    label: reveal ? 'Скрыть пароль' : 'Показать пароль',
    onClick: () => setReveal(!reveal)
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": reveal ? 'eye-off' : 'eye'
  })))), error ? /*#__PURE__*/React.createElement("p", {
    className: "auth-error",
    role: "alert"
  }, error) : null, /*#__PURE__*/React.createElement(MasterButton, {
    type: "submit",
    variant: "primary",
    size: "lg",
    disabled: loading,
    style: {
      width: '100%'
    }
  }, loading ? 'Проверяем…' : 'Войти'))), /*#__PURE__*/React.createElement("div", {
    className: "auth-foot"
  }, "\u0414\u0435\u043C\u043E: \u043B\u044E\u0431\u043E\u0439 \u043B\u043E\u0433\u0438\u043D \u0438 \u043F\u0430\u0440\u043E\u043B\u044C")));
}
function DashboardScreen({
  onNavigate
}) {
  const [win, setWin] = React.useState('14d');
  return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement(MasterPageHeader, {
    title: "\u0414\u0430\u0448\u0431\u043E\u0440\u0434 \u0441\u043C\u0435\u043D\u044B",
    meta: "1\u201314 \u0430\u0432\u0433\u0443\u0441\u0442\u0430",
    actions: /*#__PURE__*/React.createElement("div", {
      className: "win-row"
    }, [['7d', '7 дней'], ['14d', '14 дней'], ['30d', '30 дней']].map(([k, l]) => /*#__PURE__*/React.createElement(FilterChip, {
      key: k,
      active: win === k,
      onClick: () => setWin(k)
    }, l)))
  }), /*#__PURE__*/React.createElement("div", {
    className: "kpi"
  }, /*#__PURE__*/React.createElement(MasterStatsRow, {
    tiles: [{
      label: 'В наличии',
      value: '1 204',
      hint: 'из 11 505 табаков'
    }, {
      label: 'Видно гостю',
      value: 15,
      hint: 'миксов',
      tone: 'success'
    }, {
      label: 'Заблокировано',
      value: 1,
      tone: 'warning'
    }, {
      label: 'Код смены',
      value: '4821',
      tone: 'code'
    }]
  })), /*#__PURE__*/React.createElement("div", {
    className: "cols"
  }, /*#__PURE__*/React.createElement(MasterCard, {
    heading: "\u0422\u043E\u043F \u043C\u0438\u043A\u0441\u043E\u0432 \u043D\u0435\u0434\u0435\u043B\u0438"
  }, /*#__PURE__*/React.createElement("ol", {
    className: "rank-list"
  }, D.mixes.slice().sort((a, b) => b.chosen - a.chosen).map((mix, i) => /*#__PURE__*/React.createElement("li", {
    key: mix.id,
    className: "rank-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rank-num"
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    className: "rank-copy"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rank-name"
  }, mix.name), /*#__PURE__*/React.createElement("span", {
    className: "rank-meta"
  }, 'Оценок ' + Math.round(mix.chosen / 2))), /*#__PURE__*/React.createElement("span", {
    className: "rank-metrics"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rank-metric"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "flame"
  }), " ", mix.chosen), /*#__PURE__*/React.createElement("span", {
    className: "rank-metric"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "star"
  }), " ", String(mix.rating).replace('.', ','))))))), /*#__PURE__*/React.createElement(MasterCard, {
    heading: "\u0421\u0438\u0433\u043D\u0430\u043B\u044B \u0434\u043B\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u044B"
  }, /*#__PURE__*/React.createElement("ul", {
    className: "signal-list"
  }, /*#__PURE__*/React.createElement("li", {
    className: "signal-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "signal-copy"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rank-name"
  }, "\u041A\u043E\u0441\u043C\u043E\u043A\u043E\u043B\u0430"), /*#__PURE__*/React.createElement("span", {
    className: "rank-meta"
  }, "\u041D\u0435\u0442 \u043D\u0430\u043B\u0438\u0447\u0438\u044F: Cosmo Flower")), /*#__PURE__*/React.createElement(MasterButton, {
    size: "sm",
    onClick: () => onNavigate('mixes')
  }, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C"))), /*#__PURE__*/React.createElement(EmptyState, null, "\u041F\u0443\u0441\u0442\u044B\u0445 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0440\u0435\u0439\u043B\u043E\u0432 \u043D\u0435\u0442."))));
}
function InventoryScreen() {
  const [items, setItems] = React.useState(D.tobaccos);
  const [q, setQ] = React.useState('');
  const [stock, setStock] = React.useState('all');
  const [sort, setSort] = React.useState('updated');
  const [selected, setSelected] = React.useState([]);
  const rows = items.filter(t => !q || (t.name + ' ' + t.manufacturer).toLowerCase().includes(q.toLowerCase())).filter(t => stock === 'all' || (stock === 'in' ? t.inStock : !t.inStock));
  const toggleStock = row => setItems(cur => cur.map(t => t.id === row.id ? {
    ...t,
    inStock: !t.inStock
  } : t));
  return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement(MasterPageHeader, {
    title: "\u0422\u0430\u0431\u0430\u043A\u0438",
    meta: rows.length + ' из ' + items.length,
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MasterButton, {
      variant: "ghost"
    }, "\u0418\u043C\u043F\u043E\u0440\u0442 htreviews"), /*#__PURE__*/React.createElement(MasterButton, {
      variant: "primary"
    }, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0442\u0430\u0431\u0430\u043A"))
  }), /*#__PURE__*/React.createElement("div", {
    className: "toolbar"
  }, /*#__PURE__*/React.createElement(MasterInput, {
    icon: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "search"
    }),
    placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E \u0438\u043B\u0438 \u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044E",
    value: q,
    onChange: setQ,
    style: {
      minWidth: 280
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "toolbar-filters"
  }, /*#__PURE__*/React.createElement(FilterChip, {
    active: stock === 'all',
    onClick: () => setStock('all')
  }, "\u0412\u0441\u0435"), /*#__PURE__*/React.createElement(FilterChip, {
    active: stock === 'in',
    onClick: () => setStock('in')
  }, "\u0412 \u043D\u0430\u043B\u0438\u0447\u0438\u0438"), /*#__PURE__*/React.createElement(FilterChip, {
    active: stock === 'out',
    onClick: () => setStock('out')
  }, "\u041D\u0435\u0442 \u0432 \u043D\u0430\u043B\u0438\u0447\u0438\u0438"), /*#__PURE__*/React.createElement(FilterChip, null, "\u041F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C"), /*#__PURE__*/React.createElement(FilterChip, null, "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438")), /*#__PURE__*/React.createElement(MasterSortPill, {
    value: sort,
    onChange: setSort,
    options: [{
      key: 'updated',
      label: 'По изменению'
    }, {
      key: 'name',
      label: 'По названию'
    }, {
      key: 'mixes',
      label: 'По числу миксов'
    }]
  })), selected.length ? /*#__PURE__*/React.createElement("div", {
    className: "batch-bar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "batch-text"
  }, 'Выбрано ' + selected.length), /*#__PURE__*/React.createElement(MasterButton, {
    size: "sm",
    onClick: () => {
      setItems(cur => cur.map(t => selected.includes(t.id) ? {
        ...t,
        inStock: true
      } : t));
      setSelected([]);
    }
  }, "\u0412\u0435\u0440\u043D\u0443\u0442\u044C \u0432 \u043D\u0430\u043B\u0438\u0447\u0438\u0435"), /*#__PURE__*/React.createElement(MasterButton, {
    size: "sm",
    onClick: () => {
      setItems(cur => cur.map(t => selected.includes(t.id) ? {
        ...t,
        inStock: false
      } : t));
      setSelected([]);
    }
  }, "\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u043D\u0430\u043B\u0438\u0447\u0438\u044F"), /*#__PURE__*/React.createElement(MasterButton, {
    size: "sm",
    variant: "ghost",
    onClick: () => setSelected([])
  }, "\u0421\u043D\u044F\u0442\u044C \u0432\u044B\u0431\u043E\u0440")) : null, /*#__PURE__*/React.createElement(MasterList, {
    selectedIds: selected,
    onRowClick: row => setSelected(cur => cur.includes(row.id) ? cur.filter(id => id !== row.id) : [...cur, row.id]),
    columns: [{
      key: 'name',
      label: 'ТАБАК',
      width: 'minmax(0,1.6fr)'
    }, {
      key: 'manufacturer',
      label: 'ПРОИЗВОДИТЕЛЬ'
    }, {
      key: 'profiles',
      label: 'КАТЕГОРИИ'
    }, {
      key: 'mixes',
      label: 'МИКСЫ',
      width: '80px',
      align: 'right'
    }, {
      key: 'updated',
      label: 'ИЗМЕНЁН',
      width: '130px'
    }, {
      key: 'stock',
      label: 'НАЛИЧИЕ',
      width: '150px',
      render: row => /*#__PURE__*/React.createElement("span", {
        className: "cell-actions",
        onClick: e => e.stopPropagation()
      }, /*#__PURE__*/React.createElement(MasterToggle, {
        checked: row.inStock,
        onChange: () => toggleStock(row),
        label: "\u0412 \u043D\u0430\u043B\u0438\u0447\u0438\u0438"
      }), /*#__PURE__*/React.createElement(MasterTag, {
        tone: row.inStock ? 'success' : 'danger',
        dot: true
      }, row.inStock ? 'в наличии' : 'нет'))
    }],
    rows: rows
  }), !rows.length ? /*#__PURE__*/React.createElement(EmptyState, null, "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E. \u0423\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0434\u0438\u043D \u0438\u0437 \u0444\u0438\u043B\u044C\u0442\u0440\u043E\u0432.") : null);
}
function MixesScreen() {
  const [editing, setEditing] = React.useState(null);
  const statusTag = {
    visible: ['success', 'виден гостю'],
    hidden: ['ghost', 'скрыт'],
    blocked: ['warning', 'блокирует наличие']
  };
  if (editing) {
    const total = 100;
    return /*#__PURE__*/React.createElement("section", {
      className: "page"
    }, /*#__PURE__*/React.createElement(MasterPageHeader, {
      title: editing.name,
      actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MasterButton, {
        variant: "ghost",
        onClick: () => setEditing(null)
      }, "\u041E\u0442\u043C\u0435\u043D\u0430"), /*#__PURE__*/React.createElement(MasterButton, {
        variant: "primary",
        onClick: () => setEditing(null)
      }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"))
    }), /*#__PURE__*/React.createElement("div", {
      className: "cols"
    }, /*#__PURE__*/React.createElement(MasterCard, {
      heading: "\u0421\u043E\u0441\u0442\u0430\u0432"
    }, /*#__PURE__*/React.createElement(MasterList, {
      columns: [{
        key: 'name',
        label: 'ТАБАК',
        width: 'minmax(0,1.6fr)'
      }, {
        key: 'manufacturer',
        label: 'ПРОИЗВОДИТЕЛЬ'
      }, {
        key: 'share',
        label: 'ДОЛЯ',
        width: '90px',
        align: 'right'
      }],
      rows: [{
        id: '1',
        name: 'Red Tea',
        manufacturer: 'Darkside',
        share: '50%'
      }, {
        id: '2',
        name: 'Wildberry',
        manufacturer: 'Darkside',
        share: '40%'
      }, {
        id: '3',
        name: 'Supernova',
        manufacturer: 'Darkside',
        share: '10%'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      className: "editor-actions"
    }, /*#__PURE__*/React.createElement(MasterButton, {
      size: "sm"
    }, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0442\u0430\u0431\u0430\u043A"), /*#__PURE__*/React.createElement(MasterButton, {
      size: "sm",
      variant: "ghost"
    }, "\u0420\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u043E\u0440\u043E\u0432\u043D\u0443"), /*#__PURE__*/React.createElement("span", {
      className: "hint"
    }, 'Сумма: ' + total + '%'))), /*#__PURE__*/React.createElement(MasterCard, {
      heading: "\u0412\u0438\u0434\u0438\u043C\u043E\u0441\u0442\u044C"
    }, /*#__PURE__*/React.createElement("div", {
      className: "field-row"
    }, /*#__PURE__*/React.createElement(MasterToggle, {
      checked: true,
      label: "\u0412\u0438\u0434\u0435\u043D \u0433\u043E\u0441\u0442\u044E"
    }), /*#__PURE__*/React.createElement("span", {
      className: "hint"
    }, "\u0412\u0438\u0434\u0435\u043D \u0433\u043E\u0441\u0442\u044E")), /*#__PURE__*/React.createElement("div", {
      className: "field-row"
    }, /*#__PURE__*/React.createElement(MasterTag, {
      tone: "accent"
    }, "\u0411\u043E\u043B\u044C\u0448\u0435 \u0432\u0441\u0435\u0433\u043E \u0432\u044B\u0431\u0438\u0440\u0430\u044E\u0442"), /*#__PURE__*/React.createElement(MasterTag, {
      tone: "ghost"
    }, "\u0430\u0432\u0442\u043E-\u0440\u0435\u0439\u043B")), /*#__PURE__*/React.createElement("p", {
      className: "hint"
    }, "\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u043E\u0441\u0442\u044C \u0438 \u0440\u0435\u0439\u0442\u0438\u043D\u0433 \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043F\u043E \u0432\u044B\u0431\u043E\u0440\u0430\u043C \u0438 \u043E\u0446\u0435\u043D\u043A\u0430\u043C \u0433\u043E\u0441\u0442\u0435\u0439, \u0432\u0440\u0443\u0447\u043D\u0443\u044E \u043D\u0435 \u0437\u0430\u0434\u0430\u044E\u0442\u0441\u044F."))));
  }
  return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement(MasterPageHeader, {
    title: "\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u043C\u0438\u043A\u0441\u043E\u0432",
    meta: "15 \u043C\u0438\u043A\u0441\u043E\u0432",
    actions: /*#__PURE__*/React.createElement(MasterButton, {
      variant: "primary",
      onClick: () => setEditing({
        name: 'Новый микс'
      })
    }, "\u041D\u043E\u0432\u044B\u0439 \u043C\u0438\u043A\u0441")
  }), /*#__PURE__*/React.createElement("div", {
    className: "toolbar"
  }, /*#__PURE__*/React.createElement(MasterInput, {
    icon: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "search"
    }),
    placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E \u043C\u0438\u043A\u0441\u0430",
    style: {
      minWidth: 280
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "toolbar-filters"
  }, /*#__PURE__*/React.createElement(FilterChip, {
    active: true
  }, "\u0412\u0441\u0435"), /*#__PURE__*/React.createElement(FilterChip, null, "\u0412\u0438\u0434\u0435\u043D \u0433\u043E\u0441\u0442\u044E"), /*#__PURE__*/React.createElement(FilterChip, null, "\u0421\u043A\u0440\u044B\u0442"), /*#__PURE__*/React.createElement(FilterChip, null, "\u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D"), /*#__PURE__*/React.createElement(FilterChip, null, "\u0420\u0435\u0439\u043B"))), /*#__PURE__*/React.createElement(MasterList, {
    onRowClick: row => setEditing(row),
    columns: [{
      key: 'name',
      label: 'МИКС',
      width: 'minmax(0,1.5fr)'
    }, {
      key: 'components',
      label: 'КОМПОНЕНТОВ',
      width: '130px',
      align: 'right'
    }, {
      key: 'rails',
      label: 'РЕЙЛЫ',
      width: 'minmax(0,1.4fr)'
    }, {
      key: 'chosen',
      label: 'ВЫБОРОВ',
      width: '100px',
      align: 'right'
    }, {
      key: 'rating',
      label: 'ОЦЕНКА',
      width: '90px',
      align: 'right',
      render: r => String(r.rating).replace('.', ',')
    }, {
      key: 'status',
      label: 'СТАТУС',
      width: '170px',
      render: r => /*#__PURE__*/React.createElement(MasterTag, {
        tone: statusTag[r.status][0],
        dot: true
      }, statusTag[r.status][1])
    }],
    rows: D.mixes
  }));
}
function RailsScreen() {
  const kind = {
    statistical: 'статистический',
    prepared: 'подготовленный',
    curated: 'от мастеров'
  };
  return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement(MasterPageHeader, {
    title: "\u0420\u0435\u0439\u043B\u044B \u0432\u0438\u0442\u0440\u0438\u043D\u044B",
    meta: "4 \u0440\u0435\u0439\u043B\u0430",
    actions: /*#__PURE__*/React.createElement(MasterButton, {
      variant: "primary"
    }, "\u041D\u043E\u0432\u044B\u0439 \u0440\u0435\u0439\u043B")
  }), /*#__PURE__*/React.createElement(MasterList, {
    onRowClick: () => {},
    columns: [{
      key: 'name',
      label: 'РЕЙЛ',
      width: 'minmax(0,1.6fr)'
    }, {
      key: 'type',
      label: 'ТИП',
      render: r => kind[r.type]
    }, {
      key: 'mixes',
      label: 'МИКСОВ',
      width: '100px',
      align: 'right'
    }, {
      key: 'editable',
      label: 'РЕЖИМ',
      width: '260px',
      render: r => r.editable ? /*#__PURE__*/React.createElement(MasterTag, {
        tone: "success",
        dot: true
      }, "\u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u0443\u0435\u0442\u0441\u044F") : /*#__PURE__*/React.createElement("span", {
        className: "cell-actions"
      }, /*#__PURE__*/React.createElement(MasterTag, {
        tone: "accent"
      }, "\u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0442\u0435\u043D\u0438\u0435"), /*#__PURE__*/React.createElement("span", {
        className: "hint"
      }, r.reason))
    }],
    rows: D.rails
  }), /*#__PURE__*/React.createElement(MasterCard, {
    heading: "\u0412\u0435\u0447\u0435\u0440 \u0432 \u0430\u0442\u0435\u043B\u044C\u0435",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MasterButton, {
      size: "sm"
    }, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043C\u0438\u043A\u0441"), /*#__PURE__*/React.createElement(MasterButton, {
      size: "sm",
      variant: "ghost"
    }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u043E\u0440\u044F\u0434\u043E\u043A"))
  }, /*#__PURE__*/React.createElement(MasterList, {
    columns: [{
      key: 'pos',
      label: '#',
      width: '40px'
    }, {
      key: 'name',
      label: 'МИКС',
      width: 'minmax(0,1fr)'
    }, {
      key: 'actions',
      label: '',
      width: '90px',
      align: 'right',
      render: () => /*#__PURE__*/React.createElement("span", {
        className: "cell-actions",
        style: {
          justifyContent: 'flex-end'
        }
      }, /*#__PURE__*/React.createElement(MasterIconButton, {
        small: true,
        label: "\u0412\u044B\u0448\u0435"
      }, /*#__PURE__*/React.createElement("i", {
        "data-lucide": "arrow-up"
      })), /*#__PURE__*/React.createElement(MasterIconButton, {
        small: true,
        label: "\u041D\u0438\u0436\u0435"
      }, /*#__PURE__*/React.createElement("i", {
        "data-lucide": "arrow-down"
      })), /*#__PURE__*/React.createElement(MasterIconButton, {
        small: true,
        label: "\u0423\u0431\u0440\u0430\u0442\u044C"
      }, /*#__PURE__*/React.createElement("i", {
        "data-lucide": "x"
      })))
    }],
    rows: [{
      id: '1',
      pos: 1,
      name: 'Лимонный пирог'
    }, {
      id: '2',
      pos: 2,
      name: 'Cinnamon Red Tea'
    }, {
      id: '3',
      pos: 3,
      name: 'Cheesecake Wild Forest'
    }, {
      id: '4',
      pos: 4,
      name: 'Молоко-Черника'
    }]
  })));
}
function AccessScreen() {
  const [ops, setOps] = React.useState(D.operators);
  return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement(MasterPageHeader, {
    title: "\u041A\u043E\u0434 \u0441\u043C\u0435\u043D\u044B \u0438 \u0440\u043E\u043B\u0438",
    actions: /*#__PURE__*/React.createElement(MasterButton, {
      variant: "primary"
    }, "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043A\u043E\u0434")
  }), /*#__PURE__*/React.createElement(MasterCard, {
    heading: "\u041A\u043E\u0434 \u0441\u043C\u0435\u043D\u044B"
  }, /*#__PURE__*/React.createElement("div", {
    className: "code-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "code-value"
  }, "4821"), /*#__PURE__*/React.createElement("span", {
    className: "code-meta"
  }, /*#__PURE__*/React.createElement("span", null, "\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0434\u043E 06:00"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(MasterTag, {
    tone: "success",
    dot: true
  }, "\u0431\u043E\u0442 \u043D\u0430 \u0441\u0432\u044F\u0437\u0438"), " 30 \u0441\u0435\u043A \u043D\u0430\u0437\u0430\u0434")))), /*#__PURE__*/React.createElement("div", {
    className: "cols"
  }, /*#__PURE__*/React.createElement(MasterCard, {
    heading: "Allowlist \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u0432",
    actions: /*#__PURE__*/React.createElement(MasterButton, {
      size: "sm"
    }, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0430")
  }, /*#__PURE__*/React.createElement(MasterList, {
    columns: [{
      key: 'name',
      label: 'ОПЕРАТОР',
      width: 'minmax(0,1fr)'
    }, {
      key: 'phone',
      label: 'ТЕЛЕФОН',
      width: '170px'
    }, {
      key: 'linked',
      label: 'CHAT',
      width: '150px',
      render: r => /*#__PURE__*/React.createElement(MasterTag, {
        tone: r.linked ? 'success' : 'warning',
        dot: true
      }, r.linked ? 'привязан' : 'ожидает контакт')
    }, {
      key: 'active',
      label: 'АКТИВЕН',
      width: '90px',
      align: 'right',
      render: r => /*#__PURE__*/React.createElement(MasterToggle, {
        checked: r.active,
        label: "\u0410\u043A\u0442\u0438\u0432\u0435\u043D",
        onChange: () => setOps(cur => cur.map(o => o.id === r.id ? {
          ...o,
          active: !o.active
        } : o))
      })
    }],
    rows: ops
  }), /*#__PURE__*/React.createElement("p", {
    className: "hint"
  }, "\u041C\u0430\u0441\u0442\u0435\u0440 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442 \u043A\u043E\u0434 \u0438\u0437 \u043A\u043E\u043D\u0441\u043E\u043B\u0438. \u041E\u043F\u0435\u0440\u0430\u0442\u043E\u0440 \u0437\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0435\u0442 \u0435\u0433\u043E \u0432 \u0431\u043E\u0442\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439 /code.")), /*#__PURE__*/React.createElement(MasterCard, {
    heading: "Staff-\u0430\u043A\u043A\u0430\u0443\u043D\u0442\u044B",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MasterTag, {
      tone: "ghost"
    }, "\u0442\u043E\u043B\u044C\u043A\u043E admin"), /*#__PURE__*/React.createElement(MasterButton, {
      size: "sm"
    }, "\u041D\u043E\u0432\u044B\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442"))
  }, /*#__PURE__*/React.createElement(MasterList, {
    columns: [{
      key: 'login',
      label: 'ЛОГИН',
      width: 'minmax(0,1fr)'
    }, {
      key: 'role',
      label: 'РОЛЬ',
      render: r => /*#__PURE__*/React.createElement(MasterTag, {
        tone: r.role === 'admin' ? 'accent' : 'neutral'
      }, r.role)
    }, {
      key: 'active',
      label: 'СТАТУС',
      width: '110px',
      align: 'right',
      render: r => /*#__PURE__*/React.createElement(MasterTag, {
        tone: r.active ? 'success' : 'ghost',
        dot: true
      }, r.active ? 'активен' : 'выключен')
    }],
    rows: D.staff
  }))), /*#__PURE__*/React.createElement(MasterCard, {
    heading: "\u0416\u0443\u0440\u043D\u0430\u043B staff-\u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0439"
  }, /*#__PURE__*/React.createElement(MasterList, {
    columns: [{
      key: 'at',
      label: 'КОГДА',
      width: '150px'
    }, {
      key: 'action',
      label: 'ДЕЙСТВИЕ',
      width: '180px'
    }, {
      key: 'entity',
      label: 'ОБЪЕКТ',
      width: 'minmax(0,1fr)'
    }, {
      key: 'who',
      label: 'КТО',
      width: '110px',
      align: 'right'
    }],
    rows: D.audit
  })));
}
Object.assign(window, {
  LoginScreen,
  DashboardScreen,
  InventoryScreen,
  MixesScreen,
  RailsScreen,
  MasterAccessScreen: AccessScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/master/MasterScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/master/mock-data.js
try { (() => {
// Mock staff data for the Мастер kit.
window.MASTER_MOCK = {
  tobaccos: [{
    id: 't1',
    name: 'Wildberry',
    manufacturer: 'Darkside',
    line: 'Core',
    profiles: 'Ягоды',
    mixes: 4,
    inStock: true,
    updated: '14 авг, 18:20'
  }, {
    id: 't2',
    name: 'Red Tea',
    manufacturer: 'Darkside',
    line: 'Core',
    profiles: 'Напитки',
    mixes: 6,
    inStock: true,
    updated: '14 авг, 18:20'
  }, {
    id: 't3',
    name: 'Cosmo Flower',
    manufacturer: 'Darkside',
    line: 'Base',
    profiles: 'Цветы',
    mixes: 2,
    inStock: false,
    updated: '14 авг, 12:04'
  }, {
    id: 't4',
    name: 'Orange Team',
    manufacturer: 'MustHave',
    line: '—',
    profiles: 'Цитрусы',
    mixes: 3,
    inStock: true,
    updated: '13 авг, 22:41'
  }, {
    id: 't5',
    name: 'Cheesecake',
    manufacturer: 'Spectrum',
    line: 'Classic',
    profiles: 'Десертка',
    mixes: 5,
    inStock: true,
    updated: '13 авг, 19:15'
  }, {
    id: 't6',
    name: 'Ice Granny',
    manufacturer: 'BlackBurn',
    line: '—',
    profiles: 'Прочие',
    mixes: 2,
    inStock: false,
    updated: '12 авг, 09:58'
  }],
  mixes: [{
    id: 'x1',
    name: 'Морозная ягода',
    components: 3,
    rails: 'Больше всего выбирают',
    status: 'visible',
    rating: 4.7,
    chosen: 214
  }, {
    id: 'x2',
    name: 'Cheesecake Wild Forest',
    components: 3,
    rails: 'Больше всего выбирают, Вечер в ателье',
    status: 'visible',
    rating: 4.8,
    chosen: 176
  }, {
    id: 'x3',
    name: 'Космокола',
    components: 3,
    rails: 'Больше всего выбирают',
    status: 'blocked',
    rating: 4.4,
    chosen: 168
  }, {
    id: 'x4',
    name: 'Pirate Citrus',
    components: 3,
    rails: 'Советуют мастера',
    status: 'visible',
    rating: 4.6,
    chosen: 118
  }, {
    id: 'x5',
    name: 'Лимонный пирог',
    components: 2,
    rails: 'Вечер в ателье',
    status: 'hidden',
    rating: 4.5,
    chosen: 87
  }],
  rails: [{
    id: 'r1',
    name: 'Больше всего выбирают',
    type: 'statistical',
    mixes: 5,
    editable: false,
    reason: 'Пересчитывается по выборам гостей'
  }, {
    id: 'r2',
    name: 'Лучшие оценки',
    type: 'statistical',
    mixes: 5,
    editable: false,
    reason: 'Пересчитывается по оценкам гостей'
  }, {
    id: 'r3',
    name: 'Вечер в ателье',
    type: 'prepared',
    mixes: 4,
    editable: true,
    reason: ''
  }, {
    id: 'r4',
    name: 'Советуют мастера',
    type: 'curated',
    mixes: 4,
    editable: true,
    reason: ''
  }],
  operators: [{
    id: 'o1',
    name: 'Ирина К.',
    phone: '+7 903 555-14-02',
    linked: true,
    active: true
  }, {
    id: 'o2',
    name: 'Пётр С.',
    phone: '+7 926 118-77-30',
    linked: false,
    active: true
  }, {
    id: 'o3',
    name: 'Артём Л.',
    phone: '+7 916 402-09-55',
    linked: true,
    active: false
  }],
  staff: [{
    id: 's1',
    login: 'admin',
    role: 'admin',
    active: true
  }, {
    id: 's2',
    login: 'atelier',
    role: 'master',
    active: true
  }],
  audit: [{
    id: 'a1',
    at: '14 авг, 18:22',
    action: 'inventory.toggle',
    entity: 'Cosmo Flower, нет в наличии',
    who: 'atelier'
  }, {
    id: 'a2',
    at: '14 авг, 17:05',
    action: 'mix.update',
    entity: 'Морозная ягода, состав',
    who: 'admin'
  }, {
    id: 'a3',
    at: '14 авг, 09:00',
    action: 'code.rotate',
    entity: 'Код смены 4821',
    who: 'system'
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/master/mock-data.js", error: String((e && e.message) || e) }); }

__ds_ns.AccessCodeInput = __ds_scope.AccessCodeInput;

__ds_ns.AromaCTA = __ds_scope.AromaCTA;

__ds_ns.AromaChip = __ds_scope.AromaChip;

__ds_ns.CompositionStack = __ds_scope.CompositionStack;

__ds_ns.GuestCard = __ds_scope.GuestCard;

__ds_ns.GuestTab = __ds_scope.GuestTab;

__ds_ns.MixRow = __ds_scope.MixRow;

__ds_ns.OnboardingProgress = __ds_scope.OnboardingProgress;

__ds_ns.ProfileCard = __ds_scope.ProfileCard;

__ds_ns.ProfileGlyph = __ds_scope.ProfileGlyph;

__ds_ns.RatingPill = __ds_scope.RatingPill;

__ds_ns.SegmentNav = __ds_scope.SegmentNav;

__ds_ns.ShowcaseCard = __ds_scope.ShowcaseCard;

__ds_ns.SignatureBar = __ds_scope.SignatureBar;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.FilterChip = __ds_scope.FilterChip;

__ds_ns.MasterButton = __ds_scope.MasterButton;

__ds_ns.MasterCard = __ds_scope.MasterCard;

__ds_ns.MasterIconButton = __ds_scope.MasterIconButton;

__ds_ns.MasterInput = __ds_scope.MasterInput;

__ds_ns.MasterList = __ds_scope.MasterList;

__ds_ns.MasterPageHeader = __ds_scope.MasterPageHeader;

__ds_ns.MasterSortPill = __ds_scope.MasterSortPill;

__ds_ns.MasterStatsRow = __ds_scope.MasterStatsRow;

__ds_ns.MasterTag = __ds_scope.MasterTag;

__ds_ns.MasterToggle = __ds_scope.MasterToggle;

__ds_ns.MasterTopBar = __ds_scope.MasterTopBar;

__ds_ns.StatusPill = __ds_scope.StatusPill;

})();
