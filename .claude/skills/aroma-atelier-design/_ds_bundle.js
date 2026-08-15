/* @ds-bundle: {"format":4,"namespace":"DesignSystem_1aef33","components":[{"name":"AccessCodeInput","sourcePath":"components/guest/AccessCodeInput.jsx"},{"name":"AromaCTA","sourcePath":"components/guest/AromaCTA.jsx"},{"name":"AromaChip","sourcePath":"components/guest/AromaChip.jsx"},{"name":"CompositionStack","sourcePath":"components/guest/CompositionStack.jsx"},{"name":"GuestCard","sourcePath":"components/guest/GuestCard.jsx"},{"name":"GuestTab","sourcePath":"components/guest/GuestTab.jsx"},{"name":"MixRow","sourcePath":"components/guest/MixRow.jsx"},{"name":"OnboardingProgress","sourcePath":"components/guest/OnboardingProgress.jsx"},{"name":"ProfileCard","sourcePath":"components/guest/ProfileCard.jsx"},{"name":"ProfileGlyph","sourcePath":"components/guest/ProfileGlyph.jsx"},{"name":"RatingPill","sourcePath":"components/guest/RatingPill.jsx"},{"name":"SegmentNav","sourcePath":"components/guest/SegmentNav.jsx"},{"name":"ShowcaseCard","sourcePath":"components/guest/ShowcaseCard.jsx"},{"name":"SignatureBar","sourcePath":"components/guest/SignatureBar.jsx"},{"name":"EmptyState","sourcePath":"components/master/EmptyState.jsx"},{"name":"FilterChip","sourcePath":"components/master/FilterChip.jsx"},{"name":"MasterButton","sourcePath":"components/master/MasterButton.jsx"},{"name":"MasterCard","sourcePath":"components/master/MasterCard.jsx"},{"name":"MasterIconButton","sourcePath":"components/master/MasterIconButton.jsx"},{"name":"MasterInput","sourcePath":"components/master/MasterInput.jsx"},{"name":"MasterList","sourcePath":"components/master/MasterList.jsx"},{"name":"MasterPageHeader","sourcePath":"components/master/MasterPageHeader.jsx"},{"name":"MasterSortPill","sourcePath":"components/master/MasterSortPill.jsx"},{"name":"MasterStatsRow","sourcePath":"components/master/MasterStatsRow.jsx"},{"name":"MasterTag","sourcePath":"components/master/MasterTag.jsx"},{"name":"MasterToggle","sourcePath":"components/master/MasterToggle.jsx"},{"name":"MasterTopBar","sourcePath":"components/master/MasterTopBar.jsx"},{"name":"StatusPill","sourcePath":"components/master/StatusPill.jsx"}],"sourceHashes":{"components/guest/AccessCodeInput.jsx":"078dcd1c6f80","components/guest/AromaCTA.jsx":"d0ef7a831e2c","components/guest/AromaChip.jsx":"d48f28e16469","components/guest/CompositionStack.jsx":"b4e221bf4fa9","components/guest/GuestCard.jsx":"c94b74225d19","components/guest/GuestTab.jsx":"c3e9cd0a93af","components/guest/MixRow.jsx":"0cfeadb642ec","components/guest/OnboardingProgress.jsx":"49fe4556566b","components/guest/ProfileCard.jsx":"5a6af41d8307","components/guest/ProfileGlyph.jsx":"870d1cf28c07","components/guest/RatingPill.jsx":"6cddf458a9b4","components/guest/SegmentNav.jsx":"1a81a15b6898","components/guest/ShowcaseCard.jsx":"3ed43574c80a","components/guest/SignatureBar.jsx":"d565a356e122","components/master/EmptyState.jsx":"ee94201468f4","components/master/FilterChip.jsx":"908eb54e1fd6","components/master/MasterButton.jsx":"d451b95219c4","components/master/MasterCard.jsx":"42ee828a3369","components/master/MasterIconButton.jsx":"acfa08a55647","components/master/MasterInput.jsx":"0735f8fbfc8b","components/master/MasterList.jsx":"85f6989a3f7d","components/master/MasterPageHeader.jsx":"936f7e156b21","components/master/MasterSortPill.jsx":"3e49247805ec","components/master/MasterStatsRow.jsx":"7b2d3cca3f8c","components/master/MasterTag.jsx":"4302936b03fb","components/master/MasterToggle.jsx":"916a13724f1a","components/master/MasterTopBar.jsx":"21d08e47c68d","components/master/StatusPill.jsx":"0c904524b5ce","ui_kits/aroma-guest/GuestApp.jsx":"ce9153d8081d","ui_kits/aroma-guest/GuestScreens.jsx":"12d4d7db931a","ui_kits/aroma-guest/mock-data.js":"0299600a2abd","ui_kits/master/MasterApp.jsx":"88327fe27578","ui_kits/master/MasterScreens.jsx":"85682e225ad2","ui_kits/master/mock-data.js":"5ddb0b6756d1"},"inlinedExternals":[],"unexposedExports":[]} */

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
  hint = 'Спросите у мастера зала — действует до 06:00.',
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
    className: "aroma-caps",
    style: {
      textAlign: 'left'
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
// Guest primary action — solid oxblood CTA, full width, uppercase tracking, optional ember pulse.
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
      borderRadius: 'var(--r-pill)',
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
    className: "aroma-caps",
    style: {
      fontSize: 10,
      letterSpacing: '0.18em',
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
      color: 'var(--accent-hover)',
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
      fontSize: 12,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-secondary)'
    }
  }, title) : null, children);
}
Object.assign(__ds_scope, { GuestCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/GuestCard.jsx", error: String((e && e.message) || e) }); }

// components/guest/GuestTab.jsx
try { (() => {
// Pill tab used in the guest topbar nav rows (.tab / .tab.active upstream).
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
      border: '1px solid ' + (active ? 'rgba(176,74,62,0.4)' : 'var(--border-subtle)'),
      borderRadius: 'var(--r-pill)',
      background: active ? 'linear-gradient(180deg, var(--accent-hover) 0%, var(--accent) 100%)' : 'var(--guest-control-bg-soft)',
      color: active ? 'var(--primary-foreground)' : 'var(--text-secondary)',
      fontFamily: 'var(--font-body)',
      fontSize: 11,
      lineHeight: 1.2,
      padding: '10px 12px',
      minHeight: 44,
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
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
// Back arrow + oxblood progress bar + "1/2" counter, pinned in the guest topbar.
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
      background: 'linear-gradient(90deg, var(--accent-deep) 0%, var(--accent) 100%)',
      transition: 'width var(--dur-slow) var(--ease-out)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "aroma-caps",
    style: {
      fontSize: 10.5,
      letterSpacing: '0.18em',
      color: 'var(--text-secondary)'
    }
  }, step + '/' + total));
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
      borderRadius: 'var(--r-pill)',
      padding: '3px 9px',
      fontFamily: 'var(--font-body)',
      fontSize: 11,
      lineHeight: 1.2,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      color: 'var(--ember)',
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
  }, "\xB7 ", count) : null);
}
Object.assign(__ds_scope, { RatingPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/RatingPill.jsx", error: String((e && e.message) || e) }); }

// components/guest/SegmentNav.jsx
try { (() => {
// Equal-width segmented control (guest journey / app tabs). Active segment is oxblood.
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
        borderRadius: 'var(--r-pill)',
        padding: '10px 8px',
        minHeight: 40,
        background: isActive ? 'var(--segment-active-bg)' : 'var(--segment-idle-bg)',
        color: isActive ? 'var(--segment-active-ink)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        fontSize: 11,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
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
// Mix list row: optional glyph, name + signature + flavour line, rating on the right.

function MixRow({
  name,
  flavors = [],
  profiles = [],
  rating,
  glyphSize = 44,
  showGlyph = true,
  showSignature = false,
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
  }, name), showSignature ? /*#__PURE__*/React.createElement(__ds_scope.SignatureBar, {
    profiles: profiles,
    height: 3
  }) : null, flavors.length ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-secondary)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, flavors.slice(0, 3).join(' · ')) : null), rating != null ? /*#__PURE__*/React.createElement(__ds_scope.RatingPill, {
    rating: rating
  }) : null);
}
Object.assign(__ds_scope, { MixRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/MixRow.jsx", error: String((e && e.message) || e) }); }

// components/guest/ShowcaseCard.jsx
try { (() => {
// Horizontal-rail card (Витрина): glyph + rating head, serif name, signature, flavours.

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
function ShowcaseCard({
  name,
  flavors = [],
  profiles = [],
  rating,
  onClick,
  style
}) {
  const halo = PROFILE_COLORS[profiles[0]] || 'var(--profile-fallback)';
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      flex: '0 0 auto',
      width: 196,
      display: 'grid',
      gap: 10,
      padding: 12,
      borderRadius: 'var(--r-xl)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-guest-scroll-card)',
      color: 'var(--text-primary)',
      textAlign: 'left',
      cursor: 'pointer',
      background: 'radial-gradient(circle at 86% 0%, color-mix(in srgb, ' + halo + ' 28%, transparent) 0%, transparent 60%), linear-gradient(180deg, rgba(40,17,17,0.96) 0%, rgba(22,11,12,0.96) 100%)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.ProfileGlyph, {
    profiles: profiles,
    size: 44
  }), rating != null ? /*#__PURE__*/React.createElement(__ds_scope.RatingPill, {
    rating: rating,
    style: {
      marginLeft: 'auto'
    }
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 15.5,
      lineHeight: 1.1,
      minHeight: '2.2em',
      display: 'block'
    }
  }, name), /*#__PURE__*/React.createElement(__ds_scope.SignatureBar, {
    profiles: profiles,
    height: 3
  }), flavors.length ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      lineHeight: 1.25,
      color: 'var(--text-secondary)',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden'
    }
  }, flavors.join(' · ')) : null);
}
Object.assign(__ds_scope, { ShowcaseCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guest/ShowcaseCard.jsx", error: String((e && e.message) || e) }); }

// components/master/EmptyState.jsx
try { (() => {
// Dashed empty placeholder (.empty) — for zero-result tables and unfilled panels.
function EmptyState({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("p", {
    style: {
      border: '1px dashed var(--border-default)',
      borderRadius: 'var(--r-md)',
      padding: 20,
      margin: 0,
      textAlign: 'center',
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
      borderRadius: 'var(--r-pill)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-sm)',
      background: active ? 'var(--accent-soft)' : 'var(--bg-raised)',
      color: active ? 'var(--accent)' : 'var(--text-secondary)',
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
    borderColor: 'var(--accent-border)',
    color: 'var(--accent)'
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
// Ops surface panel: raised gradient, hairline border, optional eyebrow + heading.
function MasterCard({
  children,
  eyebrow,
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
  }, eyebrow || heading || actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 4,
      minWidth: 0
    }
  }, eyebrow ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-meta)',
      fontSize: 'var(--fs-xs)',
      fontWeight: 500,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--accent-hover)'
    }
  }, eyebrow) : null, heading ? /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 'var(--fs-xl)',
      lineHeight: 1.15,
      color: 'var(--text-primary)'
    }
  }, heading) : null), actions ? /*#__PURE__*/React.createElement("div", {
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
// Module header: mono eyebrow, big serif h1, lead, right-aligned actions / meta.
function MasterPageHeader({
  eyebrow,
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
  }, eyebrow ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-meta)',
      fontSize: 'var(--fs-xs)',
      fontWeight: 500,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--accent)'
    }
  }, eyebrow) : null, /*#__PURE__*/React.createElement("h1", {
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
      letterSpacing: '0.06em',
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
      borderRadius: 'var(--r-pill)',
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
        color: selected ? 'var(--accent)' : 'var(--text-secondary)',
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
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
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
    color: 'var(--accent)'
  },
  danger: {
    background: 'var(--danger-soft)',
    borderColor: 'var(--danger-soft)',
    color: 'var(--accent-hover)'
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
  }, "\u0410\u0442\u0435\u043B\u044C\u0435 \xB7 \u041C\u0430\u0441\u0442\u0435\u0440")), /*#__PURE__*/React.createElement("nav", {
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
        opacity: isActive ? 1 : 0.7,
        color: isActive ? 'var(--accent)' : undefined
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
      borderRadius: 'var(--r-pill)',
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
      borderRadius: 'var(--r-pill)',
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
      fontSize: 10,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
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
  const dotSoft = {
    success: 'var(--success-soft)',
    warning: 'var(--warning-soft)',
    danger: 'var(--danger-soft)'
  }[tone] || 'var(--success-soft)';
  const Tag = onClick ? 'button' : 'span';
  return /*#__PURE__*/React.createElement(Tag, {
    type: onClick ? 'button' : undefined,
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px 4px 8px',
      borderRadius: 'var(--r-pill)',
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
      background: dotColor,
      boxShadow: '0 0 0 3px ' + dotSoft
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
// Guest flow: access → intro → onboarding → (подбор / витрина / каталог / рейл) → карточка → подтверждение.
const {
  SegmentNav,
  GuestTab,
  OnboardingProgress
} = window.DesignSystem_1aef33;
const {
  AccessScreen,
  IntroScreen,
  OnboardingScreen,
  RecommendationsScreen,
  ShowcaseScreen,
  CatalogScreen,
  RailScreen,
  MixSheet,
  ConfirmationScreen,
  GuestSelectedBar
} = window;
const MOCK = window.AROMA_MOCK;
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
  const [catalogProfiles, setCatalogProfiles] = React.useState([]);
  const [catalogFlavors, setCatalogFlavors] = React.useState([]);
  const [sort, setSort] = React.useState('popularity');
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [rail, setRail] = React.useState(null);
  const [railFilters, setRailFilters] = React.useState([]);
  const [sheet, setSheet] = React.useState(null);
  const [rating, setRating] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
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
  const catalogResults = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK.mixes.filter(m => !q || (m.name + ' ' + m.description + ' ' + m.flavors.join(' ') + ' ' + m.components.map(c => c.name + ' ' + c.manufacturer).join(' ')).toLowerCase().includes(q)).filter(m => !catalogProfiles.length || m.flavorProfiles.some(p => catalogProfiles.includes(p))).filter(m => !catalogFlavors.length || m.flavors.some(f => catalogFlavors.includes(f))).sort((a, b) => sort === 'rating' ? b.avgRating - a.avgRating : sort === 'newest' ? b.id.localeCompare(a.id) : b.popularity - a.popularity);
  }, [query, catalogProfiles, catalogFlavors, sort]);
  const openMix = (mix, source) => {
    setSheet({
      mix,
      source
    });
    setRating(0);
  };
  const chooseMix = (mix, source) => {
    setSelected({
      mix,
      source
    });
    setSheet(null);
    setView('confirmation');
  };
  const submitAccess = () => {
    if (code.length < 4 || !ageOk) {
      setAccessError('Введите код доступа и подтвердите 18+.');
      return;
    }
    setAccessError('');
    setView('intro');
  };
  const appTab = ['recommendations', 'showcase', 'catalog'].includes(view) ? view : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "app-bg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "halo-top"
  }), /*#__PURE__*/React.createElement("div", {
    className: "halo-bottom"
  }), /*#__PURE__*/React.createElement("div", {
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
    onDone: () => setView('recommendations')
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, view !== 'rail' ? /*#__PURE__*/React.createElement("header", {
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
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("p", {
    className: "brand"
  }, "\u0410\u0440\u043E\u043C\u0430 \u0410\u0442\u0435\u043B\u044C\u0435"), /*#__PURE__*/React.createElement("p", {
    className: "tagline"
  }, "\u043F\u043E\u0434\u0431\u043E\u0440 \u043C\u0438\u043A\u0441\u043E\u0432"))), /*#__PURE__*/React.createElement("div", {
    className: "topbar-right"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "header-auth-btn",
    onClick: () => {
      setView('access');
      setCode('');
      setAgeOk(false);
      setSelected(null);
    }
  }, "\u041D\u043E\u0432\u044B\u0439 \u043A\u043E\u0434"))), view === 'intro' ? /*#__PURE__*/React.createElement("nav", {
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
  }) : null, appTab ? /*#__PURE__*/React.createElement(SegmentNav, {
    value: appTab,
    onChange: setView,
    items: [{
      id: 'recommendations',
      label: 'Подбор'
    }, {
      id: 'showcase',
      label: 'Витрина'
    }, {
      id: 'catalog',
      label: 'Каталог'
    }]
  }) : null) : null, selected && view !== 'intro' && view !== 'rail' ? /*#__PURE__*/React.createElement(GuestSelectedBar, {
    mix: selected.mix,
    source: selected.source,
    onOpen: () => openMix(selected.mix, selected.source)
  }) : null, /*#__PURE__*/React.createElement("main", {
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
      setCatalogProfiles(likedProfiles);
      setCatalogFlavors(likedFlavors);
      setView('recommendations');
    },
    onSkip: () => setView('catalog')
  }) : null, view === 'recommendations' ? /*#__PURE__*/React.createElement(RecommendationsScreen, {
    mixes: recommendations,
    onOpen: openMix,
    onChoose: chooseMix,
    onOpenOnboarding: () => {
      setStep(1);
      setView('onboarding');
    },
    onOpenCatalog: () => setView('catalog')
  }) : null, view === 'showcase' ? /*#__PURE__*/React.createElement(ShowcaseScreen, {
    onOpen: openMix,
    onOpenRail: r => {
      setRail(r);
      setRailFilters([]);
      setView('rail');
    }
  }) : null, view === 'catalog' ? /*#__PURE__*/React.createElement(CatalogScreen, {
    query: query,
    setQuery: setQuery,
    profiles: catalogProfiles,
    toggleProfile: toggle(setCatalogProfiles),
    flavors: catalogFlavors,
    toggleFlavor: toggle(setCatalogFlavors),
    sort: sort,
    setSort: setSort,
    popoverOpen: popoverOpen,
    setPopoverOpen: setPopoverOpen,
    results: catalogResults,
    onOpen: openMix,
    onReset: () => {
      setQuery('');
      setCatalogProfiles([]);
      setCatalogFlavors([]);
      setSort('popularity');
    }
  }) : null, view === 'rail' && rail ? /*#__PURE__*/React.createElement(RailScreen, {
    rail: rail,
    filters: railFilters,
    toggleFilter: p => p === null ? setRailFilters([]) : toggle(setRailFilters)(p),
    onBack: () => setView('showcase'),
    onOpen: openMix
  }) : null))), /*#__PURE__*/React.createElement(MixSheet, {
    state: sheet,
    rating: rating,
    onRate: setRating,
    onClose: () => setSheet(null),
    onChoose: chooseMix
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
const railKind = {
  statistical: 'Выбор гостей',
  prepared: 'Редакция',
  curated: 'Мастера'
};
const sourceLabel = {
  recommendations: 'Подбор для вас',
  showcase: 'Из витрины',
  catalog: 'Из каталога',
  rail: 'Из подборки'
};
const plural = n => {
  const a = n % 10,
    b = n % 100;
  if (a === 1 && b !== 11) return 'микс';
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'микса';
  return 'миксов';
};
function AccessScreen({
  code,
  setCode,
  ageOk,
  setAgeOk,
  error,
  onSubmit
}) {
  const ready = code.length >= 4 && ageOk;
  return /*#__PURE__*/React.createElement("section", {
    className: "aroma-access"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-access-halo",
    "aria-hidden": true
  }), /*#__PURE__*/React.createElement("div", {
    className: "aroma-access-body"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    className: "aroma-access-mark",
    src: "../../assets/logo-mark-oxblood.svg",
    width: "64",
    height: "64",
    alt: "",
    "aria-hidden": true
  }), /*#__PURE__*/React.createElement("span", {
    className: "aroma-access-brand"
  }, "\u0410\u0440\u043E\u043C\u0430", /*#__PURE__*/React.createElement("br", null), "\u0410\u0442\u0435\u043B\u044C\u0435"), /*#__PURE__*/React.createElement("p", {
    className: "aroma-access-tagline"
  }, "\u043F\u043E\u0434\u0431\u043E\u0440 \u043A\u0430\u043B\u044C\u044F\u043D\u043D\u044B\u0445 \u043C\u0438\u043A\u0441\u043E\u0432")), /*#__PURE__*/React.createElement("form", {
    className: "aroma-access-form",
    onSubmit: e => {
      e.preventDefault();
      onSubmit();
    }
  }, /*#__PURE__*/React.createElement(AccessCodeInput, {
    value: code,
    onChange: setCode
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
    pulse: ready,
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
  const step = String(index + 1).padStart(2, '0');
  return /*#__PURE__*/React.createElement("div", {
    className: "aroma-intro"
  }, /*#__PURE__*/React.createElement("span", {
    className: "aroma-intro-watermark",
    "aria-hidden": true
  }, step), /*#__PURE__*/React.createElement("div", {
    className: "aroma-intro-body"
  }, /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
  }, 'Шаг ' + step + ' · из ' + String(cards.length).padStart(2, '0')), /*#__PURE__*/React.createElement("div", {
    className: "aroma-intro-content"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "aroma-intro-title"
  }, card.title), /*#__PURE__*/React.createElement("p", {
    className: "aroma-intro-text"
  }, card.description))), /*#__PURE__*/React.createElement("div", {
    className: "aroma-intro-dock"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-intro-pips"
  }, cards.map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: 'aroma-intro-pip' + (i === index ? ' on' : ''),
    "aria-hidden": true
  }))), /*#__PURE__*/React.createElement(AromaCTA, {
    pulse: isLast,
    onClick: onNext
  }, isLast ? 'Перейти к подбору' : 'Дальше'), !isLast ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-skip",
    onClick: onSkip
  }, "\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0437\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u043E") : null));
}
function OnboardingScreen({
  step,
  profiles,
  flavors,
  toggleProfile,
  toggleFlavor,
  onNext,
  onSkip
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "aroma-onboarding"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-onboarding-body"
  }, step === 1 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
  }, "\u0428\u0430\u0433 1 \xB7 \u041F\u0440\u043E\u0444\u0438\u043B\u0438"), /*#__PURE__*/React.createElement("h1", {
    className: "aroma-onboarding-title"
  }, "\u0421 \u0447\u0435\u0433\u043E \u043D\u0430\u0447\u043D\u0451\u043C?"), /*#__PURE__*/React.createElement("p", {
    className: "aroma-onboarding-hint"
  }, "\u041D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043A\u0430\u0441\u0430\u043D\u0438\u0439 \u043F\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F\u043C, \u0438 \u043C\u044B \u043F\u043E\u0439\u043C\u0451\u043C, \u0432 \u043A\u0430\u043A\u0443\u044E \u0441\u0442\u043E\u0440\u043E\u043D\u0443 \u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C."), /*#__PURE__*/React.createElement("div", {
    className: "aroma-profile-grid"
  }, Object.keys(M.profileLabels).map(id => /*#__PURE__*/React.createElement(ProfileCard, {
    key: id,
    profile: id,
    label: label(id),
    active: profiles.includes(id),
    onClick: () => toggleProfile(id)
  })))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
  }, "\u0428\u0430\u0433 2 \xB7 \u0412\u043A\u0443\u0441\u044B"), /*#__PURE__*/React.createElement("h1", {
    className: "aroma-onboarding-title"
  }, "\u041B\u044E\u0431\u0438\u043C\u044B\u0435 \u043D\u043E\u0442\u044B"), /*#__PURE__*/React.createElement("p", {
    className: "aroma-onboarding-hint"
  }, "\u041E\u043F\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E \u2014 \u043D\u043E \u0442\u0430\u043A \u043F\u043E\u0434\u0431\u043E\u0440 \u0441\u0442\u0430\u043D\u0435\u0442 \u0442\u043E\u0447\u043D\u0435\u0435."), /*#__PURE__*/React.createElement("div", {
    className: "aroma-flavor-wrap"
  }, M.flavors.map(f => /*#__PURE__*/React.createElement(AromaChip, {
    key: f,
    active: flavors.includes(f),
    onClick: () => toggleFlavor(f)
  }, f))), profiles.length ? /*#__PURE__*/React.createElement("div", {
    className: "aroma-selected"
  }, /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
  }, "\u0421\u0435\u0439\u0447\u0430\u0441 \u0432\u044B\u0431\u0440\u0430\u043D\u043E"), /*#__PURE__*/React.createElement("div", {
    className: "aroma-selected-row"
  }, profiles.map(p => /*#__PURE__*/React.createElement("span", {
    key: p,
    className: "aroma-selected-tag"
  }, /*#__PURE__*/React.createElement("span", {
    className: "aroma-selected-dot",
    style: {
      background: 'var(--profile-' + p.replace('_', '-') + ')'
    },
    "aria-hidden": true
  }), label(p))))) : null)), /*#__PURE__*/React.createElement("div", {
    className: "aroma-onboarding-dock"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-onboarding-pips",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("span", {
    className: 'aroma-onboarding-pip' + (step >= 1 ? ' on' : '')
  }), /*#__PURE__*/React.createElement("span", {
    className: 'aroma-onboarding-pip' + (step >= 2 ? ' on' : '')
  })), /*#__PURE__*/React.createElement(AromaCTA, {
    pulse: step === 2,
    onClick: onNext
  }, step === 1 ? 'Далее' : 'Показать подбор'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-skip",
    onClick: onSkip
  }, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0441\u0440\u0430\u0437\u0443")));
}
function RecommendationsScreen({
  mixes,
  onOpen,
  onChoose,
  onOpenOnboarding,
  onOpenCatalog
}) {
  if (!mixes.length) {
    return /*#__PURE__*/React.createElement("section", {
      className: "aroma-recs-empty"
    }, /*#__PURE__*/React.createElement("p", {
      className: "aroma-caps"
    }, "\u041F\u043E\u0434\u0431\u043E\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D"), /*#__PURE__*/React.createElement("h1", {
      className: "aroma-empty-title"
    }, "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E"), /*#__PURE__*/React.createElement("p", {
      className: "aroma-empty-text"
    }, "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0440\u043E\u0444\u0438\u043B\u0438 \u0438 \u0432\u043A\u0443\u0441\u044B \u0438\u043B\u0438 \u0441\u0440\u0430\u0437\u0443 \u043F\u0435\u0440\u0435\u0439\u0442\u0438 \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433."), /*#__PURE__*/React.createElement("div", {
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
  const halo = 'var(--profile-' + (hero.flavorProfiles[0] || 'tobacco').replace('_', '-') + ')';
  return /*#__PURE__*/React.createElement("section", {
    className: "aroma-recs"
  }, /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
  }, "\u041B\u0443\u0447\u0448\u0435\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435"), /*#__PURE__*/React.createElement("article", {
    className: "aroma-recs-hero",
    style: {
      background: 'radial-gradient(circle at 80% 0%, color-mix(in srgb, ' + halo + ' 33%, transparent) 0%, transparent 55%), linear-gradient(180deg, rgba(34,15,16,0.96) 0%, rgba(22,11,12,0.88) 100%)'
    }
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
  }, /*#__PURE__*/React.createElement(RatingPill, {
    rating: hero.avgRating
  }), /*#__PURE__*/React.createElement("span", {
    className: "aroma-caps"
  }, hero.popularity + ' выборов')), /*#__PURE__*/React.createElement(AromaCTA, {
    pulse: true,
    onClick: () => onChoose(hero, 'recommendations')
  }, "\u041F\u043E\u043A\u0443\u0440\u0438\u0442\u044C")), rest.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
  }, "\u0422\u043E\u0436\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0442"), /*#__PURE__*/React.createElement("div", {
    className: "aroma-list"
  }, rest.slice(0, 4).map(mix => /*#__PURE__*/React.createElement(MixRow, {
    key: mix.id,
    name: mix.name,
    profiles: mix.flavorProfiles,
    flavors: mix.flavors,
    rating: mix.avgRating,
    showGlyph: false,
    showSignature: true,
    onClick: () => onOpen(mix, 'recommendations')
  })))) : null);
}
function ShowcaseScreen({
  onOpen,
  onOpenRail
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "aroma-showcase"
  }, M.rails.map(rail => /*#__PURE__*/React.createElement("section", {
    key: rail.id,
    className: "aroma-showcase-rail"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-showcase-head"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "aroma-showcase-title"
  }, rail.name), /*#__PURE__*/React.createElement("span", {
    className: "aroma-caps aroma-showcase-kind"
  }, railKind[rail.type])), /*#__PURE__*/React.createElement("div", {
    className: "aroma-scroller"
  }, rail.mixIds.map(id => {
    const mix = M.mixes.find(m => m.id === id);
    return /*#__PURE__*/React.createElement(ShowcaseCard, {
      key: id,
      name: mix.name,
      profiles: mix.flavorProfiles,
      flavors: mix.flavors,
      rating: mix.avgRating,
      onClick: () => onOpen(mix, 'showcase')
    });
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-showcase-all",
    onClick: () => onOpenRail(rail),
    "aria-label": 'Открыть весь рейл «' + rail.name + '»'
  }, "\u0412\u0441\u0435")))));
}
function CatalogScreen({
  query,
  setQuery,
  profiles,
  toggleProfile,
  flavors,
  toggleFlavor,
  sort,
  setSort,
  popoverOpen,
  setPopoverOpen,
  results,
  onOpen,
  onReset
}) {
  const dirty = Boolean(query) || profiles.length || flavors.length || sort !== 'popularity';
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
    placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E \u0438 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044E",
    autoComplete: "off"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-catalog-icon-btn",
    onClick: () => setPopoverOpen(!popoverOpen),
    "aria-label": "\u0424\u0438\u043B\u044C\u0442\u0440\u044B \u0438 \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0430",
    "aria-expanded": popoverOpen
  }, /*#__PURE__*/React.createElement("svg", {
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
  })), flavors.length || sort !== 'popularity' ? /*#__PURE__*/React.createElement("span", {
    className: "aroma-catalog-icon-dot",
    "aria-hidden": true
  }) : null)), /*#__PURE__*/React.createElement("div", {
    className: "aroma-chip-scroll"
  }, Object.keys(M.profileLabels).map(id => /*#__PURE__*/React.createElement(AromaChip, {
    key: id,
    profile: id,
    active: profiles.includes(id),
    onClick: () => toggleProfile(id)
  }, label(id))))), popoverOpen ? /*#__PURE__*/React.createElement("div", {
    className: "aroma-catalog-popover",
    role: "dialog",
    "aria-label": "\u0424\u0438\u043B\u044C\u0442\u0440\u044B \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430"
  }, /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
  }, "\u0421\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0430"), /*#__PURE__*/React.createElement("div", {
    className: "aroma-catalog-sort"
  }, [['popularity', 'По популярности'], ['rating', 'По рейтингу'], ['newest', 'Сначала новое']].map(([v, l]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    type: "button",
    className: 'aroma-sort-btn' + (sort === v ? ' on' : ''),
    onClick: () => setSort(v)
  }, l))), /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
  }, "\u0412\u043A\u0443\u0441\u044B"), /*#__PURE__*/React.createElement("div", {
    className: "aroma-flavor-scroll"
  }, M.flavors.map(f => /*#__PURE__*/React.createElement(AromaChip, {
    key: f,
    active: flavors.includes(f),
    onClick: () => toggleFlavor(f)
  }, f))), /*#__PURE__*/React.createElement(AromaCTA, {
    onClick: () => setPopoverOpen(false)
  }, "\u0413\u043E\u0442\u043E\u0432\u043E")) : null, /*#__PURE__*/React.createElement("div", {
    className: "aroma-catalog-meta"
  }, /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
  }, 'Найдено · ' + results.length), dirty ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-skip",
    onClick: onReset
  }, "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C") : null), !results.length ? /*#__PURE__*/React.createElement("p", {
    className: "guest-status"
  }, "\u041F\u043E \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u043C \u0444\u0438\u043B\u044C\u0442\u0440\u0430\u043C \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.") : null, /*#__PURE__*/React.createElement("div", {
    className: "aroma-list"
  }, results.map(mix => /*#__PURE__*/React.createElement(MixRow, {
    key: mix.id,
    name: mix.name,
    profiles: mix.flavorProfiles,
    flavors: mix.flavors,
    rating: mix.avgRating,
    onClick: () => onOpen(mix, 'catalog')
  }))));
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
  }, "\u2190"), /*#__PURE__*/React.createElement("div", {
    className: "aroma-rail-topbar-text"
  }, /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
  }, 'Витрина · ' + railKind[rail.type]), /*#__PURE__*/React.createElement("p", {
    className: "aroma-rail-meta"
  }, mixes.length + ' ' + plural(mixes.length))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-rail-code"
  }, "\u041D\u043E\u0432\u044B\u0439 \u043A\u043E\u0434")), /*#__PURE__*/React.createElement("div", {
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
    rating: mix.avgRating,
    glyphSize: 60,
    onClick: () => onOpen(mix, 'rail')
  }))));
}
function MixSheet({
  state,
  rating,
  onRate,
  onClose,
  onChoose
}) {
  if (!state) return null;
  const {
    mix,
    source
  } = state;
  const halo = 'var(--profile-' + (mix.flavorProfiles[0] || 'tobacco').replace('_', '-') + ')';
  return /*#__PURE__*/React.createElement("div", {
    className: "aroma-sheet-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("section", {
    className: "aroma-sheet",
    onClick: e => e.stopPropagation(),
    style: {
      background: 'radial-gradient(circle at 88% 0%, color-mix(in srgb, ' + halo + ' 31%, transparent) 0%, transparent 50%), var(--guest-sheet-bg)'
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
  }, /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
  }, sourceLabel[source]), /*#__PURE__*/React.createElement("h2", {
    className: "aroma-sheet-title"
  }, mix.name), /*#__PURE__*/React.createElement(SignatureBar, {
    profiles: mix.flavorProfiles,
    height: 4
  }))), /*#__PURE__*/React.createElement("p", {
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
  }, /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
  }, "\u0421\u043E\u0441\u0442\u0430\u0432 \u043C\u0438\u043A\u0441\u0430"), /*#__PURE__*/React.createElement(CompositionStack, {
    components: mix.components
  })), /*#__PURE__*/React.createElement("section", {
    className: "aroma-sheet-block"
  }, /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
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
  }, "\u0417\u0430\u043A\u0440\u044B\u0442\u044C"), /*#__PURE__*/React.createElement(AromaCTA, {
    pulse: true,
    onClick: () => onChoose(mix, source)
  }, "\u041F\u043E\u043A\u0443\u0440\u0438\u0442\u044C"))));
}
function ConfirmationScreen({
  mix,
  onDone
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "aroma-confirm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aroma-confirm-topbar"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-confirm-done",
    onClick: onDone
  }, "\u0413\u043E\u0442\u043E\u0432\u043E")), /*#__PURE__*/React.createElement("div", {
    className: "aroma-confirm-stack"
  }, /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps aroma-confirm-kicker"
  }, "\u041F\u043E\u043A\u0430\u0436\u0438\u0442\u0435 \u043C\u0430\u0441\u0442\u0435\u0440\u0443"), /*#__PURE__*/React.createElement(ProfileGlyph, {
    profiles: mix.flavorProfiles,
    size: 96
  }), /*#__PURE__*/React.createElement("h1", {
    className: "aroma-confirm-title"
  }, mix.name), /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
  }, mix.flavorProfiles.map(label).join(' · ')), /*#__PURE__*/React.createElement(SignatureBar, {
    profiles: mix.flavorProfiles,
    height: 3
  })), /*#__PURE__*/React.createElement("section", {
    className: "aroma-confirm-composition"
  }, /*#__PURE__*/React.createElement("p", {
    className: "aroma-caps"
  }, "\u0421\u043E\u0441\u0442\u0430\u0432"), /*#__PURE__*/React.createElement(CompositionStack, {
    components: mix.components,
    showBar: false
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "aroma-ghost aroma-confirm-rate",
    onClick: onDone
  }, "\u041E\u0446\u0435\u043D\u0438\u0442\u044C, \u043A\u043E\u0433\u0434\u0430 \u0441\u043E\u0431\u0435\u0440\u0443\u0442"));
}
Object.assign(window, {
  AccessScreen,
  IntroScreen,
  OnboardingScreen,
  RecommendationsScreen,
  ShowcaseScreen,
  CatalogScreen,
  RailScreen,
  MixSheet,
  ConfirmationScreen,
  GuestSelectedBar: function ({
    mix,
    source,
    onOpen
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "aroma-selected-shell"
    }, /*#__PURE__*/React.createElement(GuestCard, {
      compact: true,
      title: "\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0434\u043B\u044F \u043C\u0430\u0441\u0442\u0435\u0440\u0430",
      style: {
        display: 'grid',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("p", {
      className: "aroma-selected-text"
    }, mix.name + ' · ' + sourceLabel[source]), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "aroma-ghost-sm",
      onClick: onOpen
    }, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443")));
  }
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/aroma-guest/GuestScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/aroma-guest/mock-data.js
try { (() => {
// Mock catalogue for the Арома Ателье guest kit — real mixes from docs/data/top-20-mixes.md.
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
    title: 'Мы подберём микс под ваше настроение',
    description: 'Пара вопросов о вкусах — и подбор соберётся из того, что реально есть на кухне сегодня.'
  }, {
    id: 'i2',
    title: 'Витрина — если хочется выбрать глазами',
    description: 'Подборки редакции, миксы мастеров зала и то, что чаще всего выбирают гости.'
  }, {
    id: 'i3',
    title: 'Каталог — если точно знаете, что ищете',
    description: 'Поиск и фильтры по категориям и вкусам. Недоступные позиции не показываем.'
  }, {
    id: 'i4',
    title: 'Готово — покажите карточку мастеру',
    description: 'Нажмите «Покурить», и на экране останется чистая карточка с составом.'
  }],
  mixes: [{
    id: 'm1',
    name: 'Морозная ягода',
    description: 'Земляника и лесные ягоды на чёрном чае, с холодком.',
    flavorProfiles: ['berry', 'fresh'],
    flavors: ['земляника', 'лесные ягоды', 'чёрный чай'],
    avgRating: 4.7,
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
    description: 'Банан и манго-ласси — плотно и сладко, без холодка.',
    flavorProfiles: ['fruity', 'dessert'],
    flavors: ['банан', 'манго', 'йогурт'],
    avgRating: 4.5,
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
    description: 'Клубника с мороженым — самый спокойный вход для новичка.',
    flavorProfiles: ['berry', 'dessert'],
    flavors: ['клубника', 'мороженое'],
    avgRating: 4.3,
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
    description: 'Корица и чёрный чай — согревающий осенний микс.',
    flavorProfiles: ['spicy', 'tobacco'],
    flavors: ['корица', 'чёрный чай'],
    avgRating: 4.1,
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
    description: 'Ананас с мятой — свежо и легко.',
    flavorProfiles: ['fruity', 'minty'],
    flavors: ['ананас', 'мята'],
    avgRating: 4.4,
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
    description: 'Черника с молоком — сладко и просто.',
    flavorProfiles: ['berry', 'dessert'],
    flavors: ['молоко', 'черника'],
    avgRating: 4.0,
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
    description: 'Мандарин, мята и жвачка — освежающая классика.',
    flavorProfiles: ['citrus', 'minty'],
    flavors: ['мандарин', 'мята', 'жвачка'],
    avgRating: 4.2,
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
    name: 'Вечер в ателье',
    type: 'prepared',
    description: 'Подборка для быстрого старта в фирменной стилистике ателье.',
    mixIds: ['m9', 'm7', 'm10', 'm11']
  }, {
    id: 'r3',
    name: 'Советуют мастера',
    type: 'curated',
    description: 'Выразительные сочетания, которые чаще советуют мастера зала.',
    mixIds: ['m6', 'm5', 'm8', 'm12']
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/aroma-guest/mock-data.js", error: String((e && e.message) || e) }); }

// ui_kits/master/MasterApp.jsx
try { (() => {
// Мастер shell: login → workspace with 5 module tabs and a ⌘K command palette.
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
    placeholder: "\u041D\u0430\u0439\u0442\u0438 \u0438\u043B\u0438 \u0441\u0434\u0435\u043B\u0430\u0442\u044C\u2026",
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
  }, "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E") : null)));
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
// Мастер · staff screens. Recreation of apps/master-web views (login, dashboard, inventory, mixes, rails, access).
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
  }, "\u0412\u043E\u0439\u0442\u0438 \u0432 \u0441\u043C\u0435\u043D\u0443"), /*#__PURE__*/React.createElement("p", {
    className: "auth-subtitle"
  }, "\u041E\u043F\u0435\u0440\u0430\u0446\u0438\u043E\u043D\u043D\u0430\u044F \u043A\u043E\u043D\u0441\u043E\u043B\u044C \u0434\u043B\u044F \u043A\u0430\u043B\u044C\u044F\u043D\u043D\u044B\u0445 \u043C\u0430\u0441\u0442\u0435\u0440\u043E\u0432 \u0438 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u043E\u0432."), /*#__PURE__*/React.createElement("form", {
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
  }, "v1.4.0 \xB7 demo: admin / admin")));
}
function DashboardScreen({
  onNavigate
}) {
  const [win, setWin] = React.useState('14d');
  return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement(MasterPageHeader, {
    eyebrow: "\u041E\u043A\u043D\u043E: 01 \u2014 14 \u0430\u0432\u0433\u0443\u0441\u0442\u0430",
    title: "\u0414\u0430\u0448\u0431\u043E\u0440\u0434 \u0441\u043C\u0435\u043D\u044B",
    subtitle: "\u0427\u0442\u043E \u0432\u0430\u0436\u043D\u043E \u0437\u043D\u0430\u0442\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u0435 \u0434\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F \u0437\u0430\u043B\u0430.",
    meta: "\u0410\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E",
    actions: /*#__PURE__*/React.createElement("div", {
      className: "win-row"
    }, [['7d', '7 дней'], ['14d', '14 дней'], ['30d', '30 дней']].map(([k, l]) => /*#__PURE__*/React.createElement(FilterChip, {
      key: k,
      active: win === k,
      onClick: () => setWin(k)
    }, l)))
  }), /*#__PURE__*/React.createElement(MasterStatsRow, {
    tiles: [{
      label: 'В НАЛИЧИИ',
      value: '1 204',
      hint: 'из 11 505 табаков'
    }, {
      label: 'ВИДЕН ГОСТЮ',
      value: 15,
      hint: 'миксов на витрине',
      tone: 'success'
    }, {
      label: 'ЗАБЛОКИРОВАНО',
      value: 1,
      hint: 'режет наличие',
      tone: 'warning'
    }, {
      label: 'КОД СМЕНЫ',
      value: '4821',
      tone: 'code'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    className: "cols"
  }, /*#__PURE__*/React.createElement(MasterCard, {
    eyebrow: "\u0421\u043F\u0440\u043E\u0441 \u0433\u043E\u0441\u0442\u0435\u0439",
    heading: "\u0422\u043E\u043F \u043C\u0438\u043A\u0441\u043E\u0432 \u043D\u0435\u0434\u0435\u043B\u0438"
  }, /*#__PURE__*/React.createElement("ol", {
    className: "rank-list"
  }, D.mixes.slice().sort((a, b) => b.chosen - a.chosen).map((mix, i) => /*#__PURE__*/React.createElement("li", {
    key: mix.id,
    className: "rank-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rank-num"
  }, String(i + 1).padStart(2, '0')), /*#__PURE__*/React.createElement("span", {
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
    eyebrow: "\u0412\u043D\u0438\u043C\u0430\u043D\u0438\u0435",
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
  const inStockCount = items.filter(t => t.inStock).length;
  return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement(MasterPageHeader, {
    eyebrow: "\u0418\u041D\u0412\u0415\u041D\u0422\u0410\u0420\u0418\u0417\u0410\u0426\u0418\u042F",
    title: "\u0422\u0430\u0431\u0430\u043A\u0438",
    subtitle: "\u041D\u0430\u043B\u0438\u0447\u0438\u0435, \u0441\u0442\u043E\u043F-\u043B\u0438\u0441\u0442 \u0438 \u0437\u0430\u0432\u0438\u0441\u0438\u043C\u044B\u0435 \u043C\u0438\u043A\u0441\u044B.",
    meta: rows.length + ' из ' + items.length,
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MasterButton, {
      variant: "ghost"
    }, "\u0418\u043C\u043F\u043E\u0440\u0442 htreviews"), /*#__PURE__*/React.createElement(MasterButton, {
      variant: "primary"
    }, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0442\u0430\u0431\u0430\u043A"))
  }), /*#__PURE__*/React.createElement(MasterStatsRow, {
    tiles: [{
      label: 'В КАТАЛОГЕ',
      value: items.length
    }, {
      label: 'В НАЛИЧИИ',
      value: inStockCount,
      tone: 'success'
    }, {
      label: 'СТОП-ЛИСТ',
      value: items.length - inStockCount,
      tone: 'warning'
    }, {
      label: 'ВЫБРАНО',
      value: selected.length,
      hint: 'для batch-действия'
    }]
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
  }, "\u041D\u0435\u0442 \u0432 \u043D\u0430\u043B\u0438\u0447\u0438\u0438"), /*#__PURE__*/React.createElement(FilterChip, {
    count: 2
  }, "\u041F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C"), /*#__PURE__*/React.createElement(FilterChip, null, "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438")), /*#__PURE__*/React.createElement(MasterSortPill, {
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
  }), !rows.length ? /*#__PURE__*/React.createElement(EmptyState, null, "\u041F\u043E \u0444\u0438\u043B\u044C\u0442\u0440\u0430\u043C \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.") : null, /*#__PURE__*/React.createElement("p", {
    className: "hint"
  }, "\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u044B 6 \u043F\u043E\u0437\u0438\u0446\u0438\u0439 \u0438\u0437 11 505 \u2014 \u0442\u0430\u0431\u043B\u0438\u0446\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u043F\u043E\u0441\u0442\u0440\u0430\u043D\u0438\u0447\u043D\u043E, \u043F\u043E\u0438\u0441\u043A \u0438\u0434\u0451\u0442 \u0441 debounce."));
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
      eyebrow: "\u0420\u0415\u0414\u0410\u041A\u0422\u041E\u0420 \u041C\u0418\u041A\u0421\u0410",
      title: editing.name,
      subtitle: "\u0421\u043E\u0441\u0442\u0430\u0432, \u0434\u043E\u043B\u0438 \u0438 \u0432\u0438\u0434\u0438\u043C\u043E\u0441\u0442\u044C \u043D\u0430 \u0432\u0438\u0442\u0440\u0438\u043D\u0435. \u0421\u0443\u043C\u043C\u0430 \u0434\u043E\u043B\u0435\u0439 \u2014 \u0441\u0442\u0440\u043E\u0433\u043E 100%.",
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
      eyebrow: "\u0421\u043E\u0441\u0442\u0430\u0432",
      heading: "\u041A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442\u044B"
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
      eyebrow: "\u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F",
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
    }, "\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u043E\u0441\u0442\u044C \u0438 \u0431\u0430\u0437\u043E\u0432\u044B\u0439 \u0440\u0435\u0439\u0442\u0438\u043D\u0433 \u2014 \u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u043D\u044B\u0435 \u043E\u0442 \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0438, \u0432\u0440\u0443\u0447\u043D\u0443\u044E \u043D\u0435 \u0437\u0430\u0434\u0430\u044E\u0442\u0441\u044F."))));
  }
  return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement(MasterPageHeader, {
    eyebrow: "\u041C\u0415\u041D\u0415\u0414\u0416\u0415\u0420 \u041C\u0418\u041A\u0421\u041E\u0412",
    title: "\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u043C\u0438\u043A\u0441\u043E\u0432",
    subtitle: "\u0421\u043E\u0441\u0442\u0430\u0432, \u043D\u0430\u043B\u0438\u0447\u0438\u0435 \u0438 \u0432\u0438\u0434\u0438\u043C\u043E\u0441\u0442\u044C \u043D\u0430 \u0432\u0438\u0442\u0440\u0438\u043D\u0435.",
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
  }, "\u0412\u0441\u0435"), /*#__PURE__*/React.createElement(FilterChip, null, "\u0412\u0438\u0434\u0435\u043D \u0433\u043E\u0441\u0442\u044E"), /*#__PURE__*/React.createElement(FilterChip, null, "\u0421\u043A\u0440\u044B\u0442"), /*#__PURE__*/React.createElement(FilterChip, null, "\u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D"), /*#__PURE__*/React.createElement(FilterChip, {
    count: 1
  }, "\u0420\u0435\u0439\u043B"))), /*#__PURE__*/React.createElement(MasterList, {
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
    eyebrow: "\u041C\u0415\u041D\u0415\u0414\u0416\u0415\u0420 \u0420\u0415\u0419\u041B\u041E\u0412",
    title: "\u0420\u0435\u0439\u043B\u044B \u0432\u0438\u0442\u0440\u0438\u043D\u044B",
    subtitle: "\u041F\u043E\u0440\u044F\u0434\u043E\u043A \u0438 \u0441\u043E\u0441\u0442\u0430\u0432 \u043F\u043E\u0434\u0431\u043E\u0440\u043E\u043A, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0432\u0438\u0434\u0438\u0442 \u0433\u043E\u0441\u0442\u044C.",
    meta: "4 \u0440\u0435\u0439\u043B\u0430",
    actions: /*#__PURE__*/React.createElement(MasterButton, {
      variant: "primary"
    }, "\u041D\u043E\u0432\u044B\u0439 \u0440\u0435\u0439\u043B")
  }), /*#__PURE__*/React.createElement(MasterStatsRow, {
    tiles: [{
      label: 'ВСЕГО',
      value: 4
    }, {
      label: 'РЕДАКТИРУЕМЫХ',
      value: 2,
      tone: 'success'
    }, {
      label: 'АВТО',
      value: 2,
      tone: 'warning'
    }, {
      label: 'ПУСТЫХ',
      value: 0
    }]
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
    eyebrow: "\u0421\u043E\u0441\u0442\u0430\u0432 \u0440\u0435\u0439\u043B\u0430",
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
      pos: '01',
      name: 'Лимонный пирог'
    }, {
      id: '2',
      pos: '02',
      name: 'Cinnamon Red Tea'
    }, {
      id: '3',
      pos: '03',
      name: 'Cheesecake Wild Forest'
    }, {
      id: '4',
      pos: '04',
      name: 'Молоко-Черника'
    }]
  })));
}
function AccessScreen() {
  const [ops, setOps] = React.useState(D.operators);
  return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement(MasterPageHeader, {
    eyebrow: "\u0414\u041E\u0421\u0422\u0423\u041F",
    title: "\u041A\u043E\u0434 \u0441\u043C\u0435\u043D\u044B \u0438 \u0440\u043E\u043B\u0438",
    subtitle: "\u0415\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u044B\u0439 \u043A\u043E\u0434, Telegram-allowlist \u0438 staff-\u0430\u043A\u043A\u0430\u0443\u043D\u0442\u044B.",
    meta: "/staff/audit/events",
    actions: /*#__PURE__*/React.createElement(MasterButton, {
      variant: "primary"
    }, "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043A\u043E\u0434")
  }), /*#__PURE__*/React.createElement(MasterStatsRow, {
    tiles: [{
      label: 'КОД СМЕНЫ',
      value: '4821',
      tone: 'code',
      hint: 'действует до 06:00'
    }, {
      label: 'ОПЕРАТОРОВ',
      value: ops.length,
      hint: 'в allowlist'
    }, {
      label: 'ПРИВЯЗАНО',
      value: ops.filter(o => o.linked).length,
      tone: 'success'
    }, {
      label: 'БОТ',
      value: 'online',
      tone: 'success',
      hint: 'heartbeat 30 сек назад'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    className: "cols"
  }, /*#__PURE__*/React.createElement(MasterCard, {
    eyebrow: "Telegram",
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
  }, "\u041C\u0430\u0441\u0442\u0435\u0440 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442 \u043A\u043E\u0434 \u0438\u0437 \u043A\u043E\u043D\u0441\u043E\u043B\u0438 \u2014 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440 \u0437\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0435\u0442 \u0435\u0433\u043E \u0432 \u0431\u043E\u0442\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439 /code.")), /*#__PURE__*/React.createElement(MasterCard, {
    eyebrow: "\u0422\u043E\u043B\u044C\u043A\u043E admin",
    heading: "Staff-\u0430\u043A\u043A\u0430\u0443\u043D\u0442\u044B",
    actions: /*#__PURE__*/React.createElement(MasterButton, {
      size: "sm"
    }, "\u041D\u043E\u0432\u044B\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442")
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
    eyebrow: "\u0416\u0443\u0440\u043D\u0430\u043B",
    heading: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 staff-\u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0438"
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
    reason: 'Пересчитывается по событиям «Покурить»'
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
    entity: 'Cosmo Flower → нет в наличии',
    who: 'atelier'
  }, {
    id: 'a2',
    at: '14 авг, 17:05',
    action: 'mix.update',
    entity: 'Морозная ягода · состав',
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
