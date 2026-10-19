import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvaluation, normalizePalette } from './normalize';

test('normalizePalette принимает контракт #125 как есть', () => {
  const palette = normalizePalette({
    tobaccos: [
      {
        id: 't1',
        manufacturer: 'Darkside',
        name: 'Supernova',
        flavorProfiles: ['minty'],
        flavors: ['ледяная мята'],
        flavorTags: ['охлаждающий'],
        cooling: true,
        twist: true,
        mixCount: 3,
      },
    ],
    affinity: { 'berry|minty': 0.8 },
  });

  assert.equal(palette.tobaccos.length, 1);
  assert.equal(palette.tobaccos[0].cooling, true);
  assert.equal(palette.tobaccos[0].mixCount, 3);
  assert.deepEqual(palette.affinity, { 'berry|minty': 0.8 });
});

test('normalizePalette не падает на неполном ответе', () => {
  const palette = normalizePalette({ tobaccos: [{ id: 't1' }, { name: 'без id' }] });
  assert.equal(palette.tobaccos.length, 1);
  assert.deepEqual(palette.tobaccos[0].flavorProfiles, []);
  assert.equal(palette.tobaccos[0].twist, false);
  assert.deepEqual(palette.affinity, {});
  assert.deepEqual(normalizePalette(null), { tobaccos: [], affinity: {} });
});

test('normalizeEvaluation держит границы шкал', () => {
  const evaluation = normalizeEvaluation({
    harmony: 104,
    verdict: 'classic',
    hints: [{ kind: 'too-cold', value: 25 }, { kind: 'unknown' }],
    character: { sweet: 0.4, sour: 2, fresh: -1 },
    name: 'Земляника и чёрный чай',
    similarMix: { id: 'm1', name: 'Морозная ягода', avgRating: 4.7, similarity: 62 },
  });

  assert.equal(evaluation.harmony, 100);
  assert.deepEqual(evaluation.hints, [{ kind: 'too-cold', value: 25 }]);
  assert.deepEqual(evaluation.character, { sweet: 0.4, sour: 1, fresh: 0, dense: 0 });
  assert.equal(evaluation.similarMix?.name, 'Морозная ягода');
  assert.equal(evaluation.similarMix?.ratingsCount, 0);
  assert.equal(
    normalizeEvaluation({ similarMix: { id: 'm2', name: 'Тропики', avgRating: 4.9, ratingsCount: 7, similarity: 40 } })
      .similarMix?.ratingsCount,
    7,
  );
  assert.equal(normalizeEvaluation({ verdict: 'strange' }).verdict, 'ask-master');
  assert.equal(normalizeEvaluation({}).similarMix, null);
});
