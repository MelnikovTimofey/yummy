export type TobaccoSeed = {
  manufacturer: string;
  website?: string | null;
  name: string;
  strength: number;
  line?: string | null;
  description?: string | null;
  flavorTags: string[];
  sources?: string[];
};

export type MixComponentSeed = {
  manufacturer: string;
  tobacco: string;
  proportion: number;
};

export type MixSeed = {
  name: string;
  authorEmail: string;
  description?: string | null;
  tags?: string[];
  isUserMix?: boolean;
  components: MixComponentSeed[];
  sources?: string[];
};

export type CatalogSourcePayload = {
  source: string;
  tobaccos: TobaccoSeed[];
  mixes: MixSeed[];
  fetchedAt: string;
};

export type RefreshParams = {
  includeLocalSeeds: boolean;
  includeMustHaveMixes: boolean;
  mustHaveFromId?: number;
  mustHaveToId?: number;
  delayMs?: number;
};

export type RefreshStats = {
  sourceNames: string[];
  input: {
    tobaccos: number;
    mixes: number;
  };
  manufacturersCreated: number;
  manufacturersUpdated: number;
  tobaccosCreated: number;
  tobaccosUpdated: number;
  mixesCreated: number;
  mixesUpdated: number;
  mixesSkipped: number;
  issues: string[];
};

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export type RefreshJob = {
  id: string;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  params: RefreshParams;
  stats?: RefreshStats;
  error?: string;
};
