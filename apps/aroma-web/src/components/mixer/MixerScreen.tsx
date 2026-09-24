import { useEffect, useMemo, useRef, useState } from 'react';

import { evaluateBowl, fetchMixerPalette, MixerApiError, sendCustomMixSmoke } from '@/lib/mixer/api';
import {
  defaultShares,
  draftMixName,
  harmonyOf,
  initialShelves,
  matchScore,
  poolForTurn,
  shelvesOf,
  splitWarning,
  trustMaster,
  underShelves,
  verdictForScore,
} from '@/lib/mixer/bowl';
import { mixCountCaption } from '@/lib/mixer/copy';
import { createDeck, rewindCard, skipCard, type Deck } from '@/lib/mixer/deck';
import type { Evaluation, Palette, PaletteTobacco, SwipeRecord, Turn } from '@/lib/mixer/types';
import { getProfileColor } from '@/lib/profile-color';
import { profileOptions } from '@/lib/profile-labels';
import { BowlRing, ringArcs } from './BowlRing';
import { MasterLine } from './MasterLine';
import { pickMasterLine, skipLineKey, takeLineKey, type MasterLineKey } from './master-lines';
import { MixerMasterCard } from './MixerMasterCard';
import { MixerReveal, MixerRevealDock } from './MixerReveal';
import { PourLayer, type PourLayerHandle } from './PourLayer';
import { ShelfFilter } from './ShelfFilter';
import { SwipeDeck, type SwipeDeckHandle } from './SwipeDeck';

import './mixer.css';

type Phase = 'loading' | 'error' | 'swipe' | 'reveal' | 'master';

const TURNS = [
  { key: 'base', label: 'Основа', range: '40–70%', line: 'turn.base' },
  { key: 'accent', label: 'Акцент', range: '20–40%', line: 'turn.accent' },
  { key: 'twist', label: 'Штрих', range: '5–15%', line: 'turn.twist' },
] as const satisfies ReadonlyArray<{ key: SwipeRecord['turn']; label: string; range: string; line: MasterLineKey }>;

const PROFILE_ORDER = profileOptions.map((option) => option.value);
const SOLD_OUT = 'Этот табак только что закончился.';
const EVALUATE_DEBOUNCE_MS = 150;
// Сначала звучит реплика на «беру», следом — приглашение к следующему ходу.
const FOLLOW_UP_LINE_MS = 1600;
// Тайминги полёта карты и засыпки — как в согласованном прототипе.
const BOWL_UPDATE_MS = 380;
const NEXT_TURN_MS = 720;
const SKIP_MS = 240;
const LUCK_STAGGER_MS = 280;

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function MixerScreen({
  likedProfiles,
  onExit,
  canOpenMix,
  onOpenMix,
}: {
  likedProfiles: string[];
  onExit: () => void;
  canOpenMix: (mixId: string) => boolean;
  onOpenMix: (mixId: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [palette, setPalette] = useState<Palette>({ tobaccos: [], affinity: {} });
  const [turn, setTurn] = useState<Turn>(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const [shares, setShares] = useState<number[]>([]);
  const [shelves, setShelves] = useState<string[]>([]);
  const [deck, setDeck] = useState<Deck>(() => createDeck([]));
  const [deckView, setDeckView] = useState<{ version: number; entrance: 'enter' | 'rewind' }>({
    version: 0,
    entrance: 'enter',
  });
  const [line, setLine] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dimDeck, setDimDeck] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [evaluationFailed, setEvaluationFailed] = useState(false);
  const [customName, setCustomName] = useState<string | null>(null);
  const [smoking, setSmoking] = useState(false);
  const [master, setMaster] = useState<{ name: string; harmony: number | null; footnote: string | null } | null>(
    null,
  );

  const deckRef = useRef<SwipeDeckHandle>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pourRef = useRef<PourLayerHandle>(null);
  const busyRef = useRef(false);
  const timers = useRef<number[]>([]);
  const lineTimer = useRef(0);
  const skipStreak = useRef(0);
  const swipes = useRef<SwipeRecord[]>([]);
  const evaluationRequest = useRef(0);
  const revealLine = useRef({ pending: false, delay: 0 });

  const byId = useMemo(() => new Map(palette.tobaccos.map((tobacco) => [tobacco.id, tobacco])), [palette]);
  const tobaccosOf = (ids: string[]) =>
    ids.map((id) => byId.get(id)).filter((item): item is PaletteTobacco => Boolean(item));
  const chosenTobaccos = tobaccosOf(chosen);

  const later = (callback: () => void, delay: number) => {
    timers.current.push(window.setTimeout(callback, delay));
  };

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(lineTimer.current);
    },
    [],
  );

  const setBusyState = (value: boolean) => {
    busyRef.current = value;
    setBusy(value);
  };

  // Пустой ключ — мастер молчит, прошлая реплика остаётся на месте.
  const say = (key: MasterLineKey, vars: Record<string, string> = {}, delay = 0) => {
    const text = pickMasterLine(key, vars);
    if (!text) return false;
    window.clearTimeout(lineTimer.current);
    if (delay) {
      lineTimer.current = window.setTimeout(() => setLine(text), delay);
    } else {
      setLine(text);
    }
    return true;
  };

  const showDeck = (next: Deck, entrance: 'enter' | 'rewind' = 'enter') => {
    setDeck(next);
    setDeckView((current) => ({ version: current.version + 1, entrance }));
  };

  const buildDeck = (forTurn: Turn, forChosen: string[], forShelves: string[], tobaccos = palette.tobaccos) =>
    createDeck(underShelves(poolForTurn(tobaccos, forTurn, forChosen), forShelves).map((item) => item.id));

  const startTurn = (nextTurn: Turn, nextChosen: string[], tobaccos = palette.tobaccos) => {
    const nextShelves = nextTurn === 0 ? initialShelves(tobaccos, likedProfiles) : [];
    setTurn(nextTurn);
    setChosen(nextChosen);
    setShares(defaultShares(nextChosen.length));
    setShelves(nextShelves);
    setEvaluation(null);
    setCustomName(null);
    showDeck(buildDeck(nextTurn, nextChosen, nextShelves, tobaccos));
    skipStreak.current = 0;
    setPhase('swipe');
  };

  const begin = (tobaccos: PaletteTobacco[]) => {
    swipes.current = [];
    setNotice(null);
    setMaster(null);
    startTurn(0, [], tobaccos);
    say('turn.base');
  };

  const load = async () => {
    setPhase('loading');
    try {
      const next = await fetchMixerPalette();
      setPalette(next);
      begin(next.tobaccos);
    } catch {
      setPhase('error');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toReveal = (ids: string[], lineDelay: number) => {
    setChosen(ids);
    setShares(defaultShares(ids.length));
    setEvaluation(null);
    setEvaluationFailed(false);
    setCustomName(null);
    setNotice(null);
    revealLine.current = { pending: true, delay: lineDelay };
    setPhase('reveal');
  };

  // 409: табак закончился между палитрой и «Покурить» — убираем его из колоды и
  // возвращаем гостя к ходу, на котором он был взят.
  const soldOut = async (tobaccoId: string | null, bowl: string[]) => {
    let tobaccos = palette.tobaccos;
    let missing = tobaccoId;
    if (missing) {
      tobaccos = tobaccos.filter((item) => item.id !== missing);
      setPalette((current) => ({ ...current, tobaccos }));
    } else {
      try {
        const fresh = await fetchMixerPalette();
        tobaccos = fresh.tobaccos;
        setPalette(fresh);
        missing = bowl.find((id) => !fresh.tobaccos.some((item) => item.id === id)) ?? null;
      } catch {
        // Палитру не обновили — оставляем гостя на раскрытии с пометкой.
      }
    }
    const index = missing ? bowl.indexOf(missing) : -1;
    if (index >= 0) {
      startTurn(index as Turn, bowl.slice(0, index), tobaccos);
    } else {
      setEvaluationFailed(true);
    }
    setNotice(SOLD_OUT);
  };

  useEffect(() => {
    if (phase !== 'reveal' || !chosen.length) return;
    const request = evaluationRequest.current + 1;
    evaluationRequest.current = request;
    const bowl = chosen;
    const timer = window.setTimeout(async () => {
      try {
        const result = await evaluateBowl(bowl.map((tobaccoId, index) => ({ tobaccoId, proportion: shares[index] })));
        if (request !== evaluationRequest.current) return;
        setEvaluation(result);
        setEvaluationFailed(false);
        if (revealLine.current.pending) {
          revealLine.current.pending = false;
          if (result.similarMix) {
            say('reveal.similar', { name: result.similarMix.name }, revealLine.current.delay);
          } else {
            say('reveal.unique', {}, revealLine.current.delay);
          }
        }
      } catch (cause) {
        if (request !== evaluationRequest.current) return;
        if (cause instanceof MixerApiError && cause.status === 409) {
          void soldOut(cause.tobaccoId, bowl);
          return;
        }
        setEvaluation(null);
        setEvaluationFailed(true);
      }
    }, EVALUATE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      evaluationRequest.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, chosen, shares]);

  const take = () => {
    const id = deck.queue[0];
    const tobacco = id ? byId.get(id) : undefined;
    if (busyRef.current || phase !== 'swipe' || !tobacco) return;
    setBusyState(true);
    setNotice(null);
    swipes.current.push({ turn: TURNS[turn].key, tobaccoId: tobacco.id, direction: 'right' });

    const nextChosen = [...chosen.slice(0, turn), tobacco.id];
    const nextTobaccos = tobaccosOf(nextChosen);
    const nextShares = defaultShares(nextChosen.length);
    const verdict = verdictForScore(matchScore(nextTobaccos, palette.affinity));
    const lineKey = takeLineKey(turn, tobacco, verdict);
    const spoke = lineKey ? say(lineKey) : false;
    const followUp = spoke ? FOLLOW_UP_LINE_MS : 0;

    const commitBowl = () => {
      setChosen(nextChosen);
      setShares(nextShares);
    };
    const finish = () => {
      setBusyState(false);
      if (turn === 2) {
        toReveal(nextChosen, followUp);
        return;
      }
      const nextTurn = (turn + 1) as Turn;
      startTurn(nextTurn, nextChosen);
      say(TURNS[nextTurn].line, {}, followUp);
    };

    const ring = ringRef.current?.getBoundingClientRect();
    const from = deckRef.current?.topRect();
    if (reducedMotion() || !ring || !from) {
      commitBowl();
      finish();
      return;
    }
    deckRef.current?.flyToBowl(ring);
    pourRef.current?.pour({ from, ring, arc: ringArcs(nextTobaccos, nextShares)[turn] });
    later(commitBowl, BOWL_UPDATE_MS);
    later(finish, NEXT_TURN_MS);
  };

  const skip = () => {
    const id = deck.queue[0];
    if (busyRef.current || phase !== 'swipe' || !id) return;
    setBusyState(true);
    setNotice(null);
    const done = () => {
      swipes.current.push({ turn: TURNS[turn].key, tobaccoId: id, direction: 'left' });
      const result = skipCard(deck);
      showDeck(result.deck);
      skipStreak.current += 1;
      setBusyState(false);
      if (result.looped && say('deck.loop')) return;
      const key = skipLineKey(skipStreak.current);
      if (key) say(key);
    };
    if (reducedMotion()) {
      done();
      return;
    }
    deckRef.current?.flyLeft();
    later(done, SKIP_MS);
  };

  const rewind = () => {
    if (busyRef.current || !deck.history.length) return;
    setNotice(null);
    showDeck(rewindCard(deck), 'rewind');
    say('rewind');
  };

  const changeShelves = (next: string[]) => {
    if (busyRef.current) return;
    setShelves(next);
    const nextDeck = buildDeck(turn, chosen, next);
    showDeck(nextDeck);
    if (!nextDeck.queue.length) say('deck.empty');
  };

  const skipTwist = () => {
    if (busyRef.current) return;
    const spoke = say('twist.skipped');
    toReveal(chosen.slice(0, 2), spoke ? FOLLOW_UP_LINE_MS : 0);
  };

  const trustTheMaster = () => {
    if (busyRef.current) return;
    const ids = trustMaster(palette.tobaccos, palette.affinity, chosen.slice(0, turn));
    if (!ids.length) return;
    setBusyState(true);
    setNotice(null);
    const spoke = say('luck');
    const followUp = spoke ? FOLLOW_UP_LINE_MS : 0;
    const added = ids.length - turn;
    const done = () => {
      setBusyState(false);
      setDimDeck(false);
      toReveal(ids, followUp);
    };

    const ring = ringRef.current?.getBoundingClientRect();
    const from = deckRef.current?.deckRect();
    if (reducedMotion() || !ring || !from) {
      done();
      return;
    }
    setDimDeck(true);
    const arcs = ringArcs(tobaccosOf(ids), defaultShares(ids.length));
    for (let k = 0; k < added; k += 1) {
      later(() => pourRef.current?.pour({ from, ring, arc: arcs[turn + k] }), k * LUCK_STAGGER_MS);
    }
    later(() => {
      setChosen(ids);
      setShares(defaultShares(ids.length));
    }, BOWL_UPDATE_MS);
    later(done, 900 + added * LUCK_STAGGER_MS);
  };

  const back = () => {
    if (busyRef.current) return;
    setNotice(null);
    if (phase === 'reveal') {
      const target = (chosen.length === 3 ? 2 : chosen.length) as Turn;
      startTurn(target, chosen.slice(0, target));
      say(TURNS[target].line);
      return;
    }
    if (phase === 'swipe' && turn > 0) {
      const target = (turn - 1) as Turn;
      startTurn(target, chosen.slice(0, target));
      say(TURNS[target].line);
      return;
    }
    onExit();
  };

  const mixName = customName ?? (evaluation?.name || draftMixName(chosenTobaccos));

  // «Покурить» — аналитическое событие: его сбой не должен задерживать гостя,
  // карточка для мастера открывается всё равно. Кроме 409 — табак закончился.
  const smoke = async () => {
    if (smoking) return;
    setSmoking(true);
    const bowl = chosen;
    const name = mixName.trim() || draftMixName(chosenTobaccos);
    let harmony = evaluation?.harmony ?? null;
    try {
      const result = await sendCustomMixSmoke({
        components: bowl.map((tobaccoId, index) => ({ tobaccoId, proportion: shares[index] })),
        name,
        swipes: swipes.current,
      });
      harmony = result.harmony ?? harmony;
    } catch (cause) {
      if (cause instanceof MixerApiError && cause.status === 409) {
        setSmoking(false);
        await soldOut(cause.tobaccoId, bowl);
        return;
      }
    }
    setSmoking(false);
    setMaster({ name, harmony, footnote: pickMasterLine('master-card') });
    setPhase('master');
  };

  const onSharesCommit = (next: number[]) => {
    const warning = splitWarning(chosenTobaccos, next);
    if (warning) say(warning);
  };

  const takeRef = useRef(take);
  const skipRef = useRef(skip);
  takeRef.current = take;
  skipRef.current = skip;

  useEffect(() => {
    if (phase !== 'swipe') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, [role="slider"], [role="dialog"]')) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        skipRef.current();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        takeRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase]);

  const pool = poolForTurn(palette.tobaccos, turn, chosen);
  const underFilter = underShelves(pool, shelves);
  const onboardingShelves = initialShelves(palette.tobaccos, likedProfiles);
  const fromOnboarding =
    turn === 0 && shelves.length > 0 && shelves.every((shelf) => onboardingShelves.includes(shelf));
  const cards = tobaccosOf(deck.queue);

  const matchFor = (tobacco: PaletteTobacco) => {
    if (turn === 0) return mixCountCaption(tobacco.mixCount);
    return {
      value: `${matchScore([...chosenTobaccos.slice(0, turn), tobacco], palette.affinity)}%`,
      caption: 'совпадение с чашей',
    };
  };

  const emptyDeck = !palette.tobaccos.length ? (
    <>Сегодня табаков в наличии нет.</>
  ) : !pool.length ? (
    turn === 2 ? (
      <>
        Штриха сегодня в наличии нет.
        <br />
        Можно обойтись без него.
      </>
    ) : (
      <>Других табаков в наличии нет.</>
    )
  ) : (
    <>
      На выбранных полках пусто.
      <br />
      Снимите фильтр или нажмите «Все».
    </>
  );

  const progress =
    phase === 'reveal' ? (
      <div className="mixer-progress">
        <div className="mixer-progress-row">
          <span className="aroma-caps">Раскрытие</span>
          <span className="aroma-caps">Ваш микс</span>
        </div>
        <div className="mixer-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={3}>
          <span style={{ width: '100%' }} />
        </div>
      </div>
    ) : phase === 'swipe' ? (
      <div className="mixer-progress">
        <div className="mixer-progress-row">
          <span className="aroma-caps">{`Ход 0${turn + 1} · из 03`}</span>
          <span className="mixer-progress-role">
            {TURNS[turn].label} · <span>{TURNS[turn].range}</span>
          </span>
        </div>
        <div className="mixer-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={turn}>
          <span style={{ width: `${(turn / 3) * 100}%` }} />
        </div>
      </div>
    ) : null;

  if (phase === 'master' && master) {
    return (
      <section className="mixer">
        <MixerMasterCard
          name={master.name}
          tobaccos={chosenTobaccos}
          shares={shares}
          harmony={master.harmony}
          footnote={master.footnote}
          onDone={onExit}
        />
      </section>
    );
  }

  return (
    <section className="mixer" aria-labelledby="mixer-title">
      <header className="mixer-topbar">
        <button type="button" className="mixer-icon-btn" onClick={back} aria-label="Назад">
          ←
        </button>
        <h1 id="mixer-title" className="mixer-title">
          Намиксуй
        </h1>
        <span aria-hidden />
      </header>
      {progress}

      {phase === 'loading' ? <p className="screen-status">Раскладываем табаки…</p> : null}

      {phase === 'error' ? (
        <div className="mixer-status">
          <p className="screen-status error">Не получилось загрузить табаки. Попробуйте ещё раз.</p>
          <button type="button" className="aroma-mix-sheet-ghost" onClick={() => void load()}>
            Повторить
          </button>
        </div>
      ) : null}

      {phase === 'swipe' ? (
        <div className="mixer-swipe">
          <MasterLine line={line} />
          {notice ? (
            <p className="mixer-notice" role="alert">
              {notice}
            </p>
          ) : null}

          <div className="mixer-bowl-row">
            <BowlRing
              ringRef={ringRef}
              tobaccos={chosenTobaccos}
              shares={shares}
              center={
                chosenTobaccos.length ? (
                  <span className="mixer-ring-score">{harmonyOf(chosenTobaccos, shares, palette.affinity)}</span>
                ) : (
                  <span className="mixer-ring-caption">
                    Пустая
                    <br />
                    чаша
                  </span>
                )
              }
            />
            <div className="mixer-bowl-info">
              <p className="mixer-bowl-name" data-empty={chosenTobaccos.length ? undefined : 'true'}>
                {chosenTobaccos.length ? mixName : 'Имя придумаем сами'}
              </p>
              {chosenTobaccos.length ? (
                <ul className="mixer-bowl-comps">
                  {chosenTobaccos.map((tobacco) => (
                    <li key={tobacco.id}>
                      <span
                        className="mixer-dot"
                        style={{ background: getProfileColor(tobacco.flavorProfiles[0]) }}
                        aria-hidden
                      />
                      {tobacco.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mixer-bowl-hint">Гармония появится после основы</p>
              )}
            </div>
          </div>

          {pool.length ? (
            <ShelfFilter
              shelves={shelvesOf(pool, PROFILE_ORDER)}
              selected={shelves}
              count={underFilter.length}
              fromOnboarding={fromOnboarding}
              onToggle={(shelf) =>
                changeShelves(shelves.includes(shelf) ? shelves.filter((item) => item !== shelf) : [...shelves, shelf])
              }
              onAll={() => changeShelves([])}
            />
          ) : null}

          <div className="mixer-deck-slot" data-dim={dimDeck ? 'true' : undefined}>
            <SwipeDeck
              ref={deckRef}
              cards={cards}
              version={deckView.version}
              entrance={deckView.entrance}
              matchFor={matchFor}
              busy={busy}
              empty={emptyDeck}
              onSwipeRight={take}
              onSwipeLeft={skip}
            />
          </div>

          <div className="mixer-actions">
            <button
              type="button"
              className="mixer-round"
              aria-label="Дальше"
              disabled={!cards.length || busy}
              onClick={skip}
            >
              ×
            </button>
            <button
              type="button"
              className="mixer-round mixer-round-take"
              aria-label="Беру"
              disabled={!cards.length || busy}
              onClick={take}
            >
              ✓
            </button>
          </div>

          <div className="mixer-links">
            <button
              type="button"
              className="mixer-link"
              disabled={!deck.history.length || busy}
              onClick={rewind}
            >
              Вернуть прошлую
            </button>
            {turn === 2 ? (
              <button type="button" className="mixer-link" disabled={busy} onClick={skipTwist}>
                Без штриха
              </button>
            ) : null}
            <button
              type="button"
              className="mixer-link"
              disabled={busy || !palette.tobaccos.length}
              onClick={trustTheMaster}
            >
              Доверюсь мастеру
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'reveal' ? (
        <>
          <div className="mixer-reveal">
            <MasterLine line={line} />
            {notice ? (
              <p className="mixer-notice" role="alert">
                {notice}
              </p>
            ) : null}
            <MixerReveal
              tobaccos={chosenTobaccos}
              shares={shares}
              evaluation={evaluation}
              evaluationFailed={evaluationFailed}
              name={mixName}
              canOpenMix={canOpenMix}
              onRename={setCustomName}
              onSharesChange={setShares}
              onSharesCommit={onSharesCommit}
              onOpenMix={onOpenMix}
            />
          </div>
          <MixerRevealDock smoking={smoking} onSmoke={() => void smoke()} onRestart={() => begin(palette.tobaccos)} />
        </>
      ) : null}

      <PourLayer ref={pourRef} />
    </section>
  );
}
