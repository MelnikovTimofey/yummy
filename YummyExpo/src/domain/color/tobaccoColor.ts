import { FlavorProfile } from '../models';

// Base hues for flavor profiles in degrees (0..360) to create deterministic colors.
// The mapping is chosen to keep warm/cool associations intuitive for users.
const FLAVOR_PROFILE_HUES: Record<FlavorProfile, number> = {
  sweet: 20, // warm orange
  sour: 55, // yellow-green
  spicy: 10, // red-orange
  fresh: 180, // cyan
  dessert: 330, // pink-magenta
  tobacco: 30, // brownish-orange
  minty: 165, // mint green
  fruity: 78, // ripe fruit yellow-green
  floral_herbal: 138, // herbal green
  citrus: 48, // citrus yellow
  berry: 320, // berry magenta
  perfume: 286, // perfume violet
};

// Saturation and lightness tuning to avoid overly vivid colors with many profiles.
const BASE_SATURATION = 62;
const BASE_LIGHTNESS = 46;
const SATURATION_DROP_PER_PROFILE = 6;
const LIGHTNESS_BOOST_SINGLE = 6;

const MIN_SATURATION = 35;
const MAX_SATURATION = 70;
const MIN_LIGHTNESS = 35;
const MAX_LIGHTNESS = 60;

const DEFAULT_HUE = FLAVOR_PROFILE_HUES.tobacco;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const degreesToRadians = (deg: number) => (deg * Math.PI) / 180;

const radiansToDegrees = (rad: number) => (rad * 180) / Math.PI;

const hueFromProfiles = (profiles: FlavorProfile[]) => {
  if (profiles.length === 0) {
    return DEFAULT_HUE;
  }

  let x = 0;
  let y = 0;

  for (const profile of profiles) {
    const angle = degreesToRadians(FLAVOR_PROFILE_HUES[profile]);
    x += Math.cos(angle);
    y += Math.sin(angle);
  }

  if (x === 0 && y === 0) {
    return DEFAULT_HUE;
  }

  const raw = radiansToDegrees(Math.atan2(y, x));
  return (raw + 360) % 360;
};

const hslToHex = (hue: number, saturation: number, lightness: number) => {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = hue / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;

  if (hPrime >= 0 && hPrime < 1) {
    r = c;
    g = x;
  } else if (hPrime >= 1 && hPrime < 2) {
    r = x;
    g = c;
  } else if (hPrime >= 2 && hPrime < 3) {
    g = c;
    b = x;
  } else if (hPrime >= 3 && hPrime < 4) {
    g = x;
    b = c;
  } else if (hPrime >= 4 && hPrime < 5) {
    r = x;
    b = c;
  } else if (hPrime >= 5 && hPrime < 6) {
    r = c;
    b = x;
  }

  const m = l - c / 2;
  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const tobaccoColorHex = (profiles: FlavorProfile[]) => {
  const hue = hueFromProfiles(profiles);
  const count = Math.max(1, profiles.length);

  const saturation = clamp(
    BASE_SATURATION - (count - 1) * SATURATION_DROP_PER_PROFILE,
    MIN_SATURATION,
    MAX_SATURATION,
  );

  const lightness = clamp(
    BASE_LIGHTNESS + (count === 1 ? LIGHTNESS_BOOST_SINGLE : 0),
    MIN_LIGHTNESS,
    MAX_LIGHTNESS,
  );

  return hslToHex(hue, saturation, lightness);
};
