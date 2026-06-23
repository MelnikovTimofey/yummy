export type HtReviewsBrandRef = {
  name: string;
  slug: string;
  url: string;
};

export type HtReviewsLineRef = {
  name: string;
  slug: string | null;
  url: string | null;
};

export type HtReviewsTobaccoSummary = {
  sourceNumericId: string | null;
  name: string;
  alias: string | null;
  url: string;
  imageUrl: string | null;
  brand: HtReviewsBrandRef;
  line: HtReviewsLineRef;
  rating: number | null;
  ratingsCount: number | null;
  reviewsCount: number | null;
  viewsCount: number | null;
};

export type HtReviewsTobaccoDetail = {
  name: string;
  alias: string | null;
  url: string;
  brand: HtReviewsBrandRef;
  line: HtReviewsLineRef;
  country: string | null;
  officialStrength: string | null;
  communityStrength: string | null;
  status: string | null;
  htreviewsId: string | null;
  addedAt: string | null;
  description: string | null;
  imageUrl: string | null;
  sourceNumericId: string | null;
  rawTags: string[];
  rating: number | null;
  reviewCount: number | null;
};

export type NomadTaxonomyCandidate = {
  flavorProfiles: string[];
  flavors: string[];
  flavorTags: string[];
  unmappedSourceTags: string[];
};

export type HtReviewsImportedTobacco = {
  manufacturer: string;
  lineName: string | null;
  name: string;
  alias: string | null;
  sourceUrl: string;
  sourceNumericId: string | null;
  sourceExternalId: string | null;
  country: string | null;
  officialStrength: string | null;
  communityStrength: string | null;
  status: string | null;
  addedAt: string | null;
  description: string | null;
  imageUrl: string | null;
  rating: number | null;
  ratingsCount: number | null;
  reviewsCount: number | null;
  viewsCount: number | null;
  rawTags: string[];
  nomadCandidate: NomadTaxonomyCandidate;
};

export type HtReviewsCatalogSnapshot = {
  source: 'htreviews';
  fetchedAt: string;
  baseUrl: string;
  robotsNotes: string[];
  brandCount: number;
  tobaccoCount: number;
  items: HtReviewsImportedTobacco[];
};

export type HtReviewsImportOptions = {
  baseUrl?: string;
  userAgent?: string;
  requestTimeoutMs?: number;
  delayMs?: number;
  brandLimit?: number;
  tobaccoLimit?: number;
  fetchDetails?: boolean;
  brandUrls?: string[];
};
