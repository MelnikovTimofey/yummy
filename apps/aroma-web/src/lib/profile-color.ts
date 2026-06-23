export const profileColor: Record<string, string> = {
  citrus: "#e8b948",
  berry: "#a23048",
  floral_herbal: "#7a9560",
  fresh: "#7fb5a3",
  sweet: "#d98c5a",
  spicy: "#c0492c",
  dessert: "#b07747",
  tobacco: "#7a5236",
  minty: "#6ba88a",
  fruity: "#dd8a4a",
  perfume: "#c787a8",
  sour: "#bcb04a",
};

const FALLBACK = "#7a5236";

export const getProfileColor = (profileId: string | null | undefined): string =>
  (profileId && profileColor[profileId]) || FALLBACK;
