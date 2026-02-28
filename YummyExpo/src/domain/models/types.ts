export type EntityId = string;

export type ISODateString = string;

export type FlavorProfile =
  | 'sweet'
  | 'sour'
  | 'spicy'
  | 'fresh'
  | 'dessert'
  | 'tobacco'
  | 'minty'
  | 'fruity'
  | 'floral_herbal'
  | 'citrus'
  | 'berry'
  | 'perfume';

export type LocationType = 'home' | 'lounge';

export type RatingValue = 1 | 2 | 3 | 4 | 5;

export interface User {
  id: EntityId;
  email: string;
  displayName?: string;
  createdAt: ISODateString;
}

export interface PreferenceProfile {
  id: EntityId;
  userId: EntityId;
  likedProfiles: FlavorProfile[];
  dislikedProfiles: FlavorProfile[];
  favoriteManufacturerIds: EntityId[];
  createdAt: ISODateString;
}

export interface Manufacturer {
  id: EntityId;
  name: string;
  website?: string;
}

export interface Tobacco {
  id: EntityId;
  manufacturerId: EntityId;
  name: string;
  flavorProfiles: FlavorProfile[];
  flavorTags: string[];
  flavors: string[];
  strength: number; // 0..10 scale from PRD
}

export interface MixComponent {
  tobaccoId: EntityId;
  proportion: number; // percentage 0..100
}

export interface Mix {
  id: EntityId;
  name: string;
  components: MixComponent[];
  authorId: EntityId;
  createdAt: ISODateString;
}

export interface SmokingSessionLocation {
  type: LocationType;
  name?: string; // required when type === 'lounge'
}

export interface SmokingSession {
  id: EntityId;
  userId: EntityId;
  mixId: EntityId;
  date: ISODateString;
  location: SmokingSessionLocation;
}

export interface SessionRating {
  id: EntityId;
  sessionId: EntityId;
  userId: EntityId;
  rating: RatingValue;
  createdAt: ISODateString;
}

export type MixRatingSource = 'direct' | 'derived';

export interface MixRating {
  id: EntityId;
  mixId: EntityId;
  userId: EntityId;
  rating: RatingValue;
  source: MixRatingSource;
  createdAt: ISODateString;
}
