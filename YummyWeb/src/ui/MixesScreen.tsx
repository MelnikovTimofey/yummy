import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  addFavorite,
  createMix,
  createMixRating,
  createSession,
  getFavoriteMixIds,
  getMixById,
  getMixes,
  getMixRatings,
  getMixRatingSummaries,
  getTobaccos,
  removeFavorite,
} from '../shared/apiClient';
import {
  AuthState,
  FlavorProfile,
  Mix,
  MixRating,
  MixRatingSummary,
  Tobacco,
} from '../shared/types';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { AppButton, AppInput, AppSelect, AppTextarea } from '@/ui-kit';
import { AddToSessionModal } from '@/ui/components/AddToSessionModal';
import { MixInfoModal } from '@/ui/components/MixInfoModal';
import { MixPreviewCard } from '@/ui/components/MixPreviewCard';
import { useMediaQuery } from '@/ui/hooks/useMediaQuery';

type MixesScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
  openMixRequest?: {
    mode: 'detail' | 'create' | 'list';
    mixId?: string;
    nonce: number;
  } | null;
};

type MixesView = 'list' | 'detail' | 'create';
type DraftComponent = {
  id: number;
  tobaccoId: string;
  proportion: string;
};

const PROFILE_OPTIONS: Array<{ value: FlavorProfile; label: string }> = [
  { value: 'sweet', label: 'Сладкий' },
  { value: 'sour', label: 'Кислый' },
  { value: 'spicy', label: 'Пряный' },
  { value: 'fresh', label: 'Свежий' },
  { value: 'dessert', label: 'Десертный' },
  { value: 'tobacco', label: 'Табачный' },
  { value: 'minty', label: 'Мятный' },
  { value: 'fruity', label: 'Фруктовый' },
  { value: 'floral_herbal', label: 'Цветочно-травяной' },
  { value: 'citrus', label: 'Цитрусовый' },
  { value: 'berry', label: 'Ягодный' },
  { value: 'perfume', label: 'Парфюм' },
];

const PROFILE_COLORS: Record<FlavorProfile, string> = {
  sweet: '#ff8a4a',
  sour: '#e3c64c',
  spicy: '#db5a54',
  fresh: '#53c0d8',
  dessert: '#d78bf5',
  tobacco: '#9c6f4f',
  minty: '#34bfa3',
  fruity: '#ff9f43',
  floral_herbal: '#79a96b',
  citrus: '#f3d250',
  berry: '#d65780',
  perfume: '#b58acb',
};

const PROFILE_VALUES = new Set<FlavorProfile>(Object.keys(PROFILE_COLORS) as FlavorProfile[]);
const SORT_OPTIONS = [
  { value: 'popularity', label: 'По популярности' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'newest', label: 'По дате' },
] as const;

const sanitizeProfiles = (profiles: unknown[]) =>
  profiles
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value): value is FlavorProfile => PROFILE_VALUES.has(value as FlavorProfile));

const dedupe = <T,>(items: T[]) => Array.from(new Set(items));

const normalizeValues = (items: string[]) =>
  dedupe(
    items
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0),
  );

const getFlavorLabels = (items: string[]) =>
  dedupe(
    items
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );

const formatPercentValue = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '0.0%';
  }
  return `${numeric.toFixed(1)}%`;
};

const chartTooltipContentStyle = { borderColor: '#3a2f28', background: '#141210' };
const chartTooltipLabelStyle = { color: '#cbb9a4' };
const chartTooltipItemStyle = { color: '#efe2d4' };

export const MixesScreen = ({ authState, onAuthUpdate, openMixRequest }: MixesScreenProps) => {
  const isCompactFilters = useMediaQuery('(max-width: 768px)');
  const [items, setItems] = useState<Mix[]>([]);
  const [favoriteMixIds, setFavoriteMixIds] = useState<Record<string, true>>({});
  const [ratings, setRatings] = useState<Record<string, MixRating>>({});
  const [summaries, setSummaries] = useState<Record<string, MixRatingSummary>>({});
  const [createTobaccos, setCreateTobaccos] = useState<Tobacco[]>([]);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<FlavorProfile[]>([]);
  const [profileSearchDraft, setProfileSearchDraft] = useState('');
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [flavorSearchDraft, setFlavorSearchDraft] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearchDraft, setTagSearchDraft] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'popularity'>('newest');
  const [appliedProfiles, setAppliedProfiles] = useState<FlavorProfile[]>([]);
  const [appliedFlavors, setAppliedFlavors] = useState<string[]>([]);
  const [appliedTags, setAppliedTags] = useState<string[]>([]);
  const [appliedSortBy, setAppliedSortBy] = useState<'newest' | 'rating' | 'popularity'>('newest');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [view, setView] = useState<MixesView>('list');
  const [reloadSignal, setReloadSignal] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return !window.matchMedia('(max-width: 768px)').matches;
  });

  const [activeMixId, setActiveMixId] = useState<string | null>(null);
  const [activeMix, setActiveMix] = useState<Mix | null>(null);
  const [activeMixStatus, setActiveMixStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createTobaccoSearch, setCreateTobaccoSearch] = useState('');
  const [createComponents, setCreateComponents] = useState<DraftComponent[]>([
    { id: 1, tobaccoId: '', proportion: '100' },
  ]);
  const [createStatus, setCreateStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);
  const [detailFeedback, setDetailFeedback] = useState<string | null>(null);
  const [detailActionPending, setDetailActionPending] = useState(false);
  const [infoMixId, setInfoMixId] = useState<string | null>(null);
  const [sessionTargetMix, setSessionTargetMix] = useState<Mix | null>(null);
  const [sessionSubmitting, setSessionSubmitting] = useState(false);
  const nextDraftComponentId = useRef(2);

  useEffect(() => {
    getTobaccos({ limit: 200 })
      .then((response) => setCreateTobaccos(response.items))
      .catch(() => setCreateTobaccos([]));
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!authState.tokens) {
        return;
      }

      try {
        const response = await getFavoriteMixIds(authState.tokens, onAuthUpdate);
        setFavoriteMixIds(
          response.items.reduce<Record<string, true>>((acc, mixId) => {
            acc[mixId] = true;
            return acc;
          }, {}),
        );
      } catch {
        setFavoriteMixIds({});
      }
    };

    void loadFavorites();
  }, [authState.tokens, onAuthUpdate, reloadSignal]);

  useEffect(() => {
    const loadRatings = async () => {
      if (!authState.tokens) {
        return;
      }

      try {
        const [ratingsRes, summariesRes] = await Promise.all([
          getMixRatings(authState.tokens, onAuthUpdate),
          getMixRatingSummaries(authState.tokens, onAuthUpdate),
        ]);

        setRatings(
          ratingsRes.items.reduce<Record<string, MixRating>>((acc, item) => {
            acc[item.mixId] = item;
            return acc;
          }, {}),
        );
        setSummaries(
          summariesRes.items.reduce<Record<string, MixRatingSummary>>((acc, item) => {
            acc[item.mixId] = item;
            return acc;
          }, {}),
        );
      } catch {
        setRatings({});
        setSummaries({});
      }
    };

    void loadRatings();
  }, [authState.tokens, onAuthUpdate]);

  useEffect(() => {
    if (!isCompactFilters) {
      setFiltersOpen(true);
    }
  }, [isCompactFilters]);

  useEffect(() => {
    if (isCompactFilters) {
      return;
    }

    setAppliedProfiles(selectedProfiles);
    setAppliedFlavors(selectedFlavors);
    setAppliedTags(selectedTags);
    setAppliedSortBy(sortBy);
  }, [isCompactFilters, selectedFlavors, selectedProfiles, selectedTags, sortBy]);

  useEffect(() => {
    const load = async () => {
      if (!authState.tokens) {
        return;
      }

      setStatus('loading');
      try {
        const mixesRes = await getMixes(authState.tokens, onAuthUpdate, {
          authorId: authState.user?.id,
          search: search || undefined,
          profiles: appliedProfiles.length ? appliedProfiles : undefined,
          flavors: appliedFlavors.length ? appliedFlavors : undefined,
          tags: appliedTags.length ? appliedTags : undefined,
          sort: appliedSortBy,
        });

        setItems(mixesRes.items);
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    };

    void load();
  }, [
    appliedFlavors,
    appliedProfiles,
    appliedSortBy,
    appliedTags,
    authState.tokens,
    authState.user?.id,
    onAuthUpdate,
    reloadSignal,
    search,
  ]);

  useEffect(() => {
    const loadActiveMix = async () => {
      if (view !== 'detail' || !activeMixId || !authState.tokens) {
        return;
      }

      setActiveMixStatus('loading');
      try {
        const mix = await getMixById(authState.tokens, onAuthUpdate, activeMixId);
        setActiveMix(mix);
        setActiveMixStatus('idle');
      } catch {
        setActiveMix(null);
        setActiveMixStatus('error');
      }
    };

    void loadActiveMix();
  }, [activeMixId, authState.tokens, onAuthUpdate, view]);

  useEffect(() => {
    if (!openMixRequest) {
      return;
    }

    if (openMixRequest.mode === 'detail' && openMixRequest.mixId) {
      setActiveMixId(openMixRequest.mixId);
      setView('detail');
      return;
    }

    if (openMixRequest.mode === 'create') {
      onOpenCreateScreen();
      return;
    }

    if (openMixRequest.mode === 'list') {
      setView('list');
    }
  }, [openMixRequest?.mode, openMixRequest?.mixId, openMixRequest?.nonce]);

  const sortedItems = useMemo(() => items, [items]);
  const infoMix = useMemo(
    () => sortedItems.find((item) => item.id === infoMixId) ?? null,
    [infoMixId, sortedItems],
  );
  const sortedCreateTobaccos = useMemo(
    () =>
      [...createTobaccos].sort((a, b) => {
        const byManufacturer = a.manufacturer.name.localeCompare(b.manufacturer.name, 'ru', {
          sensitivity: 'base',
        });
        if (byManufacturer !== 0) {
          return byManufacturer;
        }
        return a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' });
      }),
    [createTobaccos],
  );
  const filteredCreateTobaccos = useMemo(() => {
    const query = createTobaccoSearch.trim().toLowerCase();
    if (!query) {
      return sortedCreateTobaccos.slice(0, 80);
    }

    return sortedCreateTobaccos
      .filter((item) => `${item.manufacturer.name} ${item.name}`.toLowerCase().includes(query))
      .slice(0, 80);
  }, [createTobaccoSearch, sortedCreateTobaccos]);
  const flavorOptions = useMemo(() => {
    const unique = new Set<string>();
    createTobaccos.forEach((item) => {
      normalizeValues(item.flavors ?? []).forEach((flavor) => unique.add(flavor));
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [createTobaccos]);
  const tagOptions = useMemo(() => {
    const unique = new Set<string>();
    createTobaccos.forEach((item) => {
      normalizeValues(item.flavorTags ?? []).forEach((tag) => unique.add(tag));
    });
    sortedItems.forEach((mix) => {
      normalizeValues(mix.tags ?? []).forEach((tag) => unique.add(tag));
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [createTobaccos, sortedItems]);
  const filteredProfileOptions = useMemo(() => {
    const query = profileSearchDraft.trim().toLowerCase();
    return PROFILE_OPTIONS.filter((option) =>
      query ? option.label.toLowerCase().includes(query) : true,
    );
  }, [profileSearchDraft]);
  const filteredFlavorOptions = useMemo(() => {
    const query = flavorSearchDraft.trim().toLowerCase();
    return flavorOptions.filter((flavor) => (query ? flavor.includes(query) : true));
  }, [flavorOptions, flavorSearchDraft]);
  const filteredTagOptions = useMemo(() => {
    const query = tagSearchDraft.trim().toLowerCase();
    return tagOptions.filter((tag) => (query ? tag.includes(query) : true));
  }, [tagOptions, tagSearchDraft]);
  const hasFilters = Boolean(
    search ||
      appliedProfiles.length ||
      appliedFlavors.length ||
      appliedTags.length ||
      appliedSortBy !== 'newest',
  );
  const totalProportion = useMemo(
    () =>
      createComponents.reduce((sum, item) => {
        const value = Number.parseInt(item.proportion, 10);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [createComponents],
  );

  const hasInvalidComponentRows = createComponents.some((item) => {
    const value = Number.parseInt(item.proportion, 10);
    return !item.tobaccoId || !Number.isFinite(value) || value < 1 || value > 100;
  });

  const hasDuplicateTobaccos = useMemo(() => {
    const ids = createComponents.map((item) => item.tobaccoId).filter(Boolean);
    return new Set(ids).size !== ids.length;
  }, [createComponents]);

  const canSubmitCreateMix =
    Boolean(authState.tokens) &&
    createName.trim().length > 0 &&
    createComponents.length > 0 &&
    !hasInvalidComponentRows &&
    !hasDuplicateTobaccos &&
    totalProportion === 100 &&
    createStatus !== 'saving';

  const openMixDetail = (mixId: string) => {
    setActiveMixId(mixId);
    setView('detail');
  };

  const resetCreateForm = () => {
    setCreateName('');
    setCreateDescription('');
    setCreateTobaccoSearch('');
    setCreateComponents([{ id: 1, tobaccoId: '', proportion: '100' }]);
    nextDraftComponentId.current = 2;
  };

  const onOpenCreateScreen = () => {
    setCreateFeedback(null);
    setCreateStatus('idle');
    resetCreateForm();
    setView('create');
  };

  const onAddComponentRow = () => {
    setCreateComponents((current) => [
      ...current,
      { id: nextDraftComponentId.current++, tobaccoId: '', proportion: '0' },
    ]);
  };

  const onQuickAddTobacco = (tobaccoId: string) => {
    setCreateComponents((current) => {
      if (current.some((item) => item.tobaccoId === tobaccoId)) {
        return current;
      }

      return [
        ...current,
        { id: nextDraftComponentId.current++, tobaccoId, proportion: '0' },
      ];
    });
  };

  const onRemoveComponentRow = (id: number) => {
    setCreateComponents((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  };

  const onChangeComponentRow = (id: number, patch: Partial<DraftComponent>) => {
    setCreateComponents((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  };

  const onSubmitCreateMix = async () => {
    if (!authState.tokens || !canSubmitCreateMix) {
      return;
    }

    setCreateStatus('saving');
    setCreateFeedback(null);
    try {
      const response = await createMix(authState.tokens, onAuthUpdate, {
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        components: createComponents.map((item) => ({
          tobaccoId: item.tobaccoId,
          proportion: Number.parseInt(item.proportion, 10),
        })),
      });

      setCreateStatus('idle');
      setCreateFeedback('Микс создан.');
      setReloadSignal((current) => current + 1);
      setActiveMixId(response.id);
      setView('detail');
    } catch {
      setCreateStatus('error');
      setCreateFeedback('Не удалось создать микс.');
    }
  };

  const toggleFavorite = async (mixId: string) => {
    if (!authState.tokens) {
      return;
    }

    const isFavorite = Boolean(favoriteMixIds[mixId]);
    try {
      if (isFavorite) {
        await removeFavorite(authState.tokens, onAuthUpdate, mixId);
        setFavoriteMixIds((current) => {
          const next = { ...current };
          delete next[mixId];
          return next;
        });
      } else {
        await addFavorite(authState.tokens, onAuthUpdate, mixId);
        setFavoriteMixIds((current) => ({
          ...current,
          [mixId]: true,
        }));
      }
    } catch {
      // Ignore toggle errors and keep current state.
    }
  };

  const getMixTone = (mix: Mix) => {
    const palette = ['#d36f2a', '#2888d9', '#24a77c', '#8e56db', '#b74d8e', '#2fa7b2'];
    const source = `${mix.id}:${mix.name}`;
    const hash = source.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };

  const onSubmitFilters = (event: FormEvent) => {
    event.preventDefault();
    setAppliedProfiles(selectedProfiles);
    setAppliedFlavors(selectedFlavors);
    setAppliedTags(selectedTags);
    setAppliedSortBy(sortBy);
    setSearch(searchDraft.trim());
    if (isCompactFilters) {
      setFiltersOpen(false);
    }
  };

  const toggleProfile = (profile: FlavorProfile) => {
    setSelectedProfiles((current) =>
      current.includes(profile) ? current.filter((item) => item !== profile) : [...current, profile],
    );
  };

  const toggleFlavor = (flavor: string) => {
    setSelectedFlavors((current) =>
      current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor],
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  };

  const resetFilters = () => {
    setSearchDraft('');
    setSearch('');
    setSelectedProfiles([]);
    setProfileSearchDraft('');
    setSelectedFlavors([]);
    setFlavorSearchDraft('');
    setSelectedTags([]);
    setTagSearchDraft('');
    setSortBy('newest');
    setAppliedProfiles([]);
    setAppliedFlavors([]);
    setAppliedTags([]);
    setAppliedSortBy('newest');
    if (isCompactFilters) {
      setFiltersOpen(false);
    }
  };

  const getTobaccoPieData = (mix: Mix) =>
    mix.components.map((component, index) => ({
      name: `${component.tobacco.manufacturer.name} ${component.tobacco.name}`,
      value: component.proportion,
      fill: ['#3b80f5', '#26c281', '#d8873f', '#b96af0', '#e25f7c', '#79c251'][index % 6],
    }));

  const getFlavorPieData = (mix: Mix) => {
    const map = new Map<FlavorProfile, number>();
    for (const component of mix.components) {
      const profiles = sanitizeProfiles(component.tobacco.flavorProfiles ?? []);
      if (!profiles.length) {
        continue;
      }
      const share = component.proportion / profiles.length;
      for (const profile of profiles) {
        map.set(profile, (map.get(profile) ?? 0) + share);
      }
    }

    return Array.from(map.entries())
      .map(([profile, value]) => ({
        name: PROFILE_OPTIONS.find((item) => item.value === profile)?.label ?? profile,
        value: Number(value.toFixed(2)),
        fill: PROFILE_COLORS[profile],
      }))
      .sort((a, b) => b.value - a.value);
  };

  const getFlavorDistributionData = (mix: Mix) => {
    const weighted = new Map<string, { name: string; value: number }>();

    for (const component of mix.components) {
      const flavors = getFlavorLabels(component.tobacco.flavors ?? []);
      if (!flavors.length) {
        continue;
      }
      const share = component.proportion / flavors.length;
      for (const flavor of flavors) {
        const key = flavor.toLowerCase();
        const current = weighted.get(key);
        if (current) {
          current.value += share;
        } else {
          weighted.set(key, { name: flavor, value: share });
        }
      }
    }

    if (!weighted.size) {
      const fallback = getFlavorLabels(mix.flavors ?? []);
      const fallbackShare = fallback.length ? 100 / fallback.length : 0;
      fallback.forEach((flavor) => {
        weighted.set(flavor.toLowerCase(), { name: flavor, value: fallbackShare });
      });
    }

    return Array.from(weighted.values())
      .map((item, index) => ({
        ...item,
        value: Number(item.value.toFixed(2)),
        fill: ['#4dd0e1', '#ffb74d', '#f06292', '#81c784', '#ba68c8', '#ff8a65'][index % 6],
      }))
      .sort((a, b) => b.value - a.value);
  };

  const onConfirmAddToSession = async (payload: {
    locationType: 'home' | 'lounge';
    locationName?: string;
  }) => {
    if (!authState.tokens) {
      return;
    }
    if (!sessionTargetMix) {
      return;
    }
    setDetailActionPending(true);
    setDetailFeedback(null);
    setSessionSubmitting(true);
    try {
      await createSession(authState.tokens, onAuthUpdate, {
        mixId: sessionTargetMix.id,
        date: new Date().toISOString(),
        locationType: payload.locationType,
        locationName: payload.locationName,
      });
      setDetailFeedback('Микс добавлен в сессию курения.');
      setSessionTargetMix(null);
    } catch {
      setDetailFeedback('Не удалось добавить микс в сессию.');
    } finally {
      setDetailActionPending(false);
      setSessionSubmitting(false);
    }
  };

  const onRateFromDetail = async (mixId: string, rating: number) => {
    if (!authState.tokens) {
      return;
    }
    setDetailActionPending(true);
    setDetailFeedback(null);
    try {
      const result = await createMixRating(authState.tokens, onAuthUpdate, { mixId, rating });
      setRatings((current) => ({
        ...current,
        [mixId]: result,
      }));
      setDetailFeedback('Оценка сохранена.');
      setReloadSignal((current) => current + 1);
    } catch {
      setDetailFeedback('Не удалось сохранить оценку.');
    } finally {
      setDetailActionPending(false);
    }
  };

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (search) {
      labels.push(`Поиск: ${search}`);
    }
    if (appliedProfiles.length) {
      labels.push(`Профили: ${appliedProfiles.length}`);
    }
    if (appliedFlavors.length) {
      labels.push(`Вкусы: ${appliedFlavors.length}`);
    }
    if (appliedTags.length) {
      labels.push(`Теги: ${appliedTags.length}`);
    }
    if (appliedSortBy !== 'newest') {
      labels.push(appliedSortBy === 'rating' ? 'Сортировка: рейтинг' : 'Сортировка: популярность');
    }
    return labels;
  }, [appliedFlavors, appliedProfiles, appliedSortBy, appliedTags, search]);
  const showAdvancedFilters = !isCompactFilters || filtersOpen;
  const compactFilterButtonLabel = filtersOpen
    ? 'Скрыть фильтры'
    : hasFilters
      ? `Фильтры: ${activeFilterLabels.length || 1}`
      : 'Показать фильтры';

  if (view === 'detail') {
    return (
      <section className="sessions-layout">
        {activeMixStatus === 'loading' ? <p className="screen-status">Загрузка карточки микса...</p> : null}
        {activeMixStatus === 'error' ? (
          <p className="screen-status error">Не удалось загрузить карточку микса.</p>
        ) : null}

        {activeMix ? (
          <article className="mix-detail-wrap">
            {(() => {
              const tobaccoPieData = getTobaccoPieData(activeMix);
              const profileChartData = getFlavorPieData(activeMix);
              const flavorDistributionData = getFlavorDistributionData(activeMix);
              const tobaccoChartConfig = tobaccoPieData.reduce<ChartConfig>((acc, item, index) => {
                acc[`tobacco-${index}`] = {
                  label: item.name,
                  color: item.fill,
                };
                return acc;
              }, {});
              const flavorChartConfig = profileChartData.reduce<ChartConfig>((acc, item, index) => {
                acc[`profile-${index}`] = {
                  label: item.name,
                  color: item.fill,
                };
                return acc;
              }, {});
              const flavorDistributionChartConfig = flavorDistributionData.reduce<ChartConfig>((acc, item, index) => {
                acc[`flavor-${index}`] = {
                  label: item.name,
                  color: item.fill,
                };
                return acc;
              }, {});
              const dominantProfile = profileChartData[0]?.name ?? 'нет данных';
              const dominantTobacco = tobaccoPieData[0]?.name ?? 'нет данных';
              const dominantFlavor = flavorDistributionData[0]?.name ?? 'нет данных';
              return (
                <>
            <section
              className="mix-detail-hero"
              style={{
                background: `linear-gradient(120deg, ${getMixTone(activeMix)}99 0%, #131313 60%, #090909 100%)`,
              }}
            >
              <h3>{activeMix.name}</h3>
              <div className="home-hero-meta">
                <span>
                  {activeMix.components
                    .slice(0, 3)
                    .map((component) => component.tobacco.name)
                    .join(' · ')}
                </span>
              </div>
              <div className="home-hero-actions">
                <AppButton
                  variant="ghost"
                  className="mix-detail-session-btn"
                  disabled={detailActionPending}
                  onClick={() => setSessionTargetMix(activeMix)}
                >
                  Добавить в сессию
                </AppButton>
                <AppButton
                  variant="icon"
                  className={`mix-action-btn mix-fav-btn mix-detail-fav ${favoriteMixIds[activeMix.id] ? 'active' : ''}`}
                  disabled={detailActionPending}
                  onClick={() => toggleFavorite(activeMix.id)}
                  aria-label={favoriteMixIds[activeMix.id] ? 'Убрать из избранного' : 'Добавить в избранное'}
                >
                  <Heart className="mix-action-icon" aria-hidden="true" />
                </AppButton>
              </div>
            </section>

            <section className="card mix-card">
              <p className="mix-description">{activeMix.description?.trim() || 'Описание пока не добавлено.'}</p>
              <div className="mix-components">
                {activeMix.components.map((component) => (
                  <div key={`${activeMix.id}:${component.tobacco.id}`} className="mix-component-row">
                    <span>
                      {component.tobacco.manufacturer.name} {component.tobacco.name}
                    </span>
                    <b>{component.proportion}%</b>
                  </div>
                ))}
              </div>
              <p className="mix-ratings">
                Моя оценка: <b>{ratings[activeMix.id]?.rating ?? 'нет'}</b>
                {' · '}
                Средняя: <b>{summaries[activeMix.id]?.avgRating?.toFixed(1) ?? 'нет'}</b>
              </p>
              <section className="mix-insight-stats">
                <article className="mix-insight-card">
                  <p className="card-title">Доминирующий профиль</p>
                  <p className="mix-insight-value">{dominantProfile}</p>
                </article>
                <article className="mix-insight-card">
                  <p className="card-title">База микса</p>
                  <p className="mix-insight-value">{dominantTobacco}</p>
                </article>
                <article className="mix-insight-card">
                  <p className="card-title">Доминирующий вкус</p>
                  <p className="mix-insight-value">{dominantFlavor}</p>
                </article>
              </section>
              {(activeMix.tags ?? []).length ? (
                <section className="mix-detail-tags">
                  {(activeMix.tags ?? []).slice(0, 8).map((tag) => (
                    <span key={`${activeMix.id}:tag:${tag}`} className="profile-tag mix-detail-tag">
                      {tag}
                    </span>
                  ))}
                </section>
              ) : null}
              <div className="session-rating-row">
                {[1, 2, 3, 4, 5].map((score) => (
                  <AppButton
                    key={`${activeMix.id}:${score}`}
                    variant="ghost"
                    className={`score-btn ${ratings[activeMix.id]?.rating === score ? 'active' : ''}`}
                    disabled={detailActionPending}
                    onClick={() => onRateFromDetail(activeMix.id, score)}
                  >
                    {score}
                  </AppButton>
                ))}
              </div>
              <section className="mix-charts">
                <article className="mix-chart-card">
                  <p className="card-title">Состав по табакам</p>
                  <ChartContainer config={tobaccoChartConfig} className="mix-chart-shell">
                    <PieChart>
                      <Tooltip
                        formatter={(value, _name, item) => [
                          formatPercentValue(value),
                          String(item?.payload?.name ?? 'Табак'),
                        ]}
                        contentStyle={chartTooltipContentStyle}
                        labelStyle={chartTooltipLabelStyle}
                        itemStyle={chartTooltipItemStyle}
                      />
                      <Pie
                        data={tobaccoPieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={54}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {tobaccoPieData.map((item) => (
                          <Cell key={`${activeMix.id}:tob:${item.name}`} fill={item.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="mix-chart-legend">
                    {tobaccoPieData.map((item) => (
                      <div key={`${activeMix.id}:tob:${item.name}`} className="mix-chart-item">
                        <span className="mix-chart-dot" style={{ background: item.fill }} />
                        <span>{item.name}</span>
                        <b>{item.value}%</b>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="mix-chart-card">
                  <p className="card-title">Профили вкуса</p>
                  <ChartContainer config={flavorChartConfig} className="mix-chart-shell">
                    <BarChart
                      data={profileChartData}
                      layout="vertical"
                      margin={{ left: 4, right: 14, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#2f2a27" />
                      <XAxis type="number" tick={{ fill: '#9f9185', fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fill: '#cbc0b5', fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value) => [formatPercentValue(value), 'Доля']}
                        contentStyle={chartTooltipContentStyle}
                        labelStyle={chartTooltipLabelStyle}
                        itemStyle={chartTooltipItemStyle}
                      />
                      <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                        {profileChartData.map((item) => (
                          <Cell key={`${activeMix.id}:flv:${item.name}`} fill={item.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <div className="mix-chart-legend">
                    {profileChartData.length ? (
                      profileChartData.map((item) => (
                        <div key={`${activeMix.id}:flv:${item.name}`} className="mix-chart-item">
                          <span className="mix-chart-dot" style={{ background: item.fill }} />
                          <span>{item.name}</span>
                          <b>{item.value.toFixed(1)}%</b>
                        </div>
                      ))
                    ) : (
                      <p className="hint">Недостаточно данных профилей для построения диаграммы.</p>
                    )}
                  </div>
                </article>
                <article className="mix-chart-card">
                  <p className="card-title">Вкусы микса</p>
                  {flavorDistributionData.length ? (
                    <>
                      <ChartContainer config={flavorDistributionChartConfig} className="mix-chart-shell">
                        <BarChart
                          data={flavorDistributionData}
                          layout="vertical"
                          margin={{ left: 4, right: 14, top: 8, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#2f2a27" />
                          <XAxis type="number" tick={{ fill: '#9f9185', fontSize: 11 }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={120}
                            tick={{ fill: '#cbc0b5', fontSize: 11 }}
                          />
                          <Tooltip
                            formatter={(value) => [formatPercentValue(value), 'Доля']}
                            contentStyle={chartTooltipContentStyle}
                            labelStyle={chartTooltipLabelStyle}
                            itemStyle={chartTooltipItemStyle}
                          />
                          <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                            {flavorDistributionData.map((item) => (
                              <Cell key={`${activeMix.id}:flavor:${item.name}`} fill={item.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                      <div className="mix-chart-legend">
                        {flavorDistributionData.map((item) => (
                          <div key={`${activeMix.id}:flavor:${item.name}`} className="mix-chart-item">
                            <span className="mix-chart-dot" style={{ background: item.fill }} />
                            <span>{item.name}</span>
                            <b>{item.value.toFixed(1)}%</b>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="hint">Недостаточно данных вкусов для построения диаграммы.</p>
                  )}
                </article>
              </section>
              {detailFeedback ? <p className="hint">{detailFeedback}</p> : null}
              <p className="hint">
                Автор: {activeMix.author?.email ?? 'неизвестно'}
                {' · '}
                Создан: {activeMix.createdAt ? new Date(activeMix.createdAt).toLocaleDateString('ru-RU') : 'нет данных'}
              </p>
            </section>
                </>
              );
            })()}
          </article>
        ) : null}
        <AddToSessionModal
          open={Boolean(sessionTargetMix)}
          mixName={sessionTargetMix?.name}
          submitting={sessionSubmitting}
          onOpenChange={(open) => {
            if (!open) {
              setSessionTargetMix(null);
            }
          }}
          onSubmit={onConfirmAddToSession}
        />
      </section>
    );
  }

  if (view === 'create') {
    return (
      <section className="sessions-layout mixes-create-layout">
        <AppButton variant="ghost" className="ghost-button screen-back-btn" onClick={() => setView('list')}>
          Назад к моим миксам
        </AppButton>
        <section className="card session-create-card mix-create-card">
          <p className="card-title">Создать микс</p>
          <div className="mix-create-grid">
            <div className="mix-create-main">
              <div className="filter-field">
                <span>Название</span>
                <AppInput
                  className="search-input"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Например, Яблочный вечер"
                />
              </div>

              <div className="filter-field">
                <span>Описание</span>
                <AppTextarea
                  className="search-input form-textarea"
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value)}
                  placeholder="Кратко про вкус и крепость"
                />
              </div>

              <div className="mix-draft-list">
                {createComponents.map((item) => (
                  <div key={item.id} className="mix-draft-row">
                    <AppSelect
                      value={item.tobaccoId}
                      onChange={(next) => onChangeComponentRow(item.id, { tobaccoId: next })}
                      options={sortedCreateTobaccos.map((tobacco) => ({
                        value: tobacco.id,
                        label: `${tobacco.manufacturer.name} · ${tobacco.name}`,
                      }))}
                      emptyLabel="Выберите табак"
                    />
                    <AppInput
                      type="number"
                      min={1}
                      max={100}
                      value={item.proportion}
                      onChange={(event) => onChangeComponentRow(item.id, { proportion: event.target.value })}
                      placeholder="%"
                    />
                    <AppButton
                      variant="ghost"
                      className="score-btn"
                      onClick={() => onRemoveComponentRow(item.id)}
                      disabled={createComponents.length === 1}
                    >
                      ×
                    </AppButton>
                  </div>
                ))}
              </div>

              <div className="mix-create-actions">
                <AppButton variant="ghost" className="ghost-button mix-draft-add" onClick={onAddComponentRow}>
                  Добавить компонент
                </AppButton>
                <p className="hint">
                  Сумма пропорций: <b>{totalProportion}%</b>
                  {hasDuplicateTobaccos ? ' · есть повторяющиеся табаки' : ''}
                </p>
              </div>
            </div>

            <aside className="mix-create-side">
              <div className="filter-field">
                <span>Быстрый поиск табака</span>
                <AppInput
                  className="search-input"
                  type="search"
                  value={createTobaccoSearch}
                  onChange={(event) => setCreateTobaccoSearch(event.target.value)}
                  placeholder="Введите бренд или вкус"
                />
                <div className="filter-scrollbox mix-create-search-results">
                  {filteredCreateTobaccos.map((tobacco) => (
                    <AppButton
                      key={`quick:${tobacco.id}`}
                      variant="ghost"
                      className={`filter-option ${createComponents.some((item) => item.tobaccoId === tobacco.id) ? 'active' : ''}`}
                      onClick={() => onQuickAddTobacco(tobacco.id)}
                    >
                      {tobacco.manufacturer.name} · {tobacco.name}
                    </AppButton>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          <AppButton
            className="search-button session-submit"
            onClick={onSubmitCreateMix}
            disabled={!canSubmitCreateMix}
          >
            {createStatus === 'saving' ? 'Сохраняем...' : 'Сохранить микс'}
          </AppButton>

          {createFeedback ? (
            <p className={`hint ${createStatus === 'error' ? 'screen-status error' : ''}`}>{createFeedback}</p>
          ) : null}
        </section>
      </section>
    );
  }

  return (
    <section className="catalog-layout">
      <section className="catalog-body">
        <form className="catalog-controls cinema-controls" onSubmit={onSubmitFilters}>
          <div className="search-row">
            <AppInput
              className="search-input"
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Поиск по названию и описанию"
            />
            {!isCompactFilters ? (
              <AppButton type="submit" className="search-button catalog-find-btn">Найти</AppButton>
            ) : null}
          </div>

          {isCompactFilters ? (
            <div className="catalog-mobile-tools">
              <AppButton
                variant="outline"
                className="catalog-mobile-filters-toggle"
                onClick={() => setFiltersOpen((current) => !current)}
                aria-expanded={filtersOpen}
                data-testid="mixes-filters-toggle"
              >
                {compactFilterButtonLabel}
              </AppButton>
            </div>
          ) : null}

          <div className="catalog-tools-row">
            <div className="catalog-active-filters" aria-live="polite">
              {activeFilterLabels.length ? activeFilterLabels.map((label) => (
                <span key={label} className="filter-pill">{label}</span>
              )) : <span className="filter-pill muted">Фильтры не заданы</span>}
            </div>
            <AppButton
              variant="ghost"
              className="ghost-button catalog-reset-btn"
              onClick={resetFilters}
              disabled={!hasFilters}
            >
              Сбросить фильтры
            </AppButton>
          </div>

          {showAdvancedFilters ? (
            <div className="catalog-advanced-filters" data-testid="mixes-advanced-filters">
              <label className="filter-field">
                <span>Сортировка</span>
                <AppSelect
                  value={sortBy}
                  onChange={(next) => setSortBy(next as 'newest' | 'rating' | 'popularity')}
                  options={SORT_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
                />
              </label>

              <div className="filter-field">
                <span>Теги (можно несколько)</span>
                <AppInput
                  className="search-input"
                  type="search"
                  value={tagSearchDraft}
                  onChange={(event) => setTagSearchDraft(event.target.value)}
                  placeholder="Поиск по тегам"
                />
                <div className="filter-scrollbox">
                  <AppButton
                    variant="ghost"
                    className={`filter-option ${selectedTags.length === 0 ? 'active' : ''}`}
                    onClick={() => setSelectedTags([])}
                  >
                    Любые теги
                  </AppButton>
                  {filteredTagOptions.map((tag) => (
                    <AppButton
                      key={tag}
                      variant="ghost"
                      className={`filter-option ${selectedTags.includes(tag) ? 'active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </AppButton>
                  ))}
                </div>
              </div>

              <div className="filter-field">
                <span>Профили вкуса (можно несколько)</span>
                <AppInput
                  className="search-input"
                  type="search"
                  value={profileSearchDraft}
                  onChange={(event) => setProfileSearchDraft(event.target.value)}
                  placeholder="Поиск профиля"
                />
                <div className="filter-scrollbox">
                  <AppButton
                    variant="ghost"
                    className={`filter-option ${selectedProfiles.length === 0 ? 'active' : ''}`}
                    onClick={() => setSelectedProfiles([])}
                  >
                    Любой профиль
                  </AppButton>
                  {filteredProfileOptions.map((option) => (
                    <AppButton
                      key={option.value}
                      variant="ghost"
                      className={`filter-option ${selectedProfiles.includes(option.value) ? 'active' : ''}`}
                      onClick={() => toggleProfile(option.value)}
                    >
                      {option.label}
                    </AppButton>
                  ))}
                </div>
              </div>

              <div className="filter-field">
                <span>Вкусы (можно несколько)</span>
                <AppInput
                  className="search-input"
                  type="search"
                  value={flavorSearchDraft}
                  onChange={(event) => setFlavorSearchDraft(event.target.value)}
                  placeholder="Поиск вкуса"
                />
                <div className="filter-scrollbox">
                  <AppButton
                    variant="ghost"
                    className={`filter-option ${selectedFlavors.length === 0 ? 'active' : ''}`}
                    onClick={() => setSelectedFlavors([])}
                  >
                    Любой вкус
                  </AppButton>
                  {filteredFlavorOptions.map((flavor) => (
                    <AppButton
                      key={flavor}
                      variant="ghost"
                      className={`filter-option ${selectedFlavors.includes(flavor) ? 'active' : ''}`}
                      onClick={() => toggleFlavor(flavor)}
                    >
                      {flavor}
                    </AppButton>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {isCompactFilters ? (
            <div className="catalog-mobile-submit-bar">
              <AppButton type="submit" className="search-button catalog-mobile-submit-btn" data-testid="mixes-submit-sticky">
                Найти
              </AppButton>
            </div>
          ) : null}
        </form>

        <section className="catalog-results">
          <section className="card catalog-summary mixes-summary-card">
            <div className="mixes-summary-head">
              <div>
                <p className="card-title">Мои миксы</p>
                <p className="card-text">
                  {status === 'loading' ? 'Обновляем список...' : `${sortedItems.length} миксов`}
                  {hasFilters ? ' · фильтры активны' : ''}
                </p>
              </div>
              <AppButton className="search-button mixes-create-btn" onClick={onOpenCreateScreen}>
                Создать микс
              </AppButton>
            </div>
          </section>

          {status === 'error' ? <p className="screen-status error">Не удалось загрузить миксы.</p> : null}

          {status !== 'error' && status !== 'loading' && !sortedItems.length ? (
            <p className="screen-status">По выбранным фильтрам миксы не найдены.</p>
          ) : null}

          <section className="list-grid cinema-grid">
            {sortedItems.map((mix) => (
              <MixPreviewCard
                key={mix.id}
                mix={mix}
                currentUserId={authState.user?.id}
                size="grid"
                onOpen={(currentMix) => openMixDetail(currentMix.id)}
                onOpenInfo={(currentMix) => setInfoMixId(currentMix.id)}
                onToggleFavorite={(currentMix) => {
                  void toggleFavorite(currentMix.id);
                }}
                isFavorite={Boolean(favoriteMixIds[mix.id])}
                favoriteGuest={!authState.tokens}
                favoriteTitle={!authState.tokens ? 'Войдите, чтобы управлять избранным' : undefined}
                ratingTagText={`★ ${summaries[mix.id]?.avgRating?.toFixed(1).replace('.', ',') ?? '—'}`}
                footerText={`Моя: ${ratings[mix.id]?.rating ?? 'нет'}`}
              />
            ))}
          </section>
        </section>
      </section>
      <MixInfoModal
        mix={infoMix}
        summary={infoMix ? summaries[infoMix.id] : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setInfoMixId(null);
          }
        }}
        action={
          infoMix ? (
            <AppButton
              className="search-button session-info-action"
              onClick={() => {
                setSessionTargetMix(infoMix);
                setInfoMixId(null);
              }}
            >
              Добавить в сессию
            </AppButton>
          ) : undefined
        }
      />
      <AddToSessionModal
        open={Boolean(sessionTargetMix)}
        mixName={sessionTargetMix?.name}
        submitting={sessionSubmitting}
        onOpenChange={(open) => {
          if (!open) {
            setSessionTargetMix(null);
          }
        }}
        onSubmit={onConfirmAddToSession}
      />
    </section>
  );
};
