import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReelSceneSpec, SceneMotif } from '@/lib/reel-scene';
import { SCENE_FRAMES, SceneSvg } from './SceneSvg';

const MOTIFS: SceneMotif[] = ['frost', 'bloom', 'juicy', 'berry', 'warm', 'smoke'];
const spec = (primary: SceneMotif): ReelSceneSpec => ({ primary, secondary: 'smoke', c1: 'minty', c2: 'tobacco' });
const render = (primary: SceneMotif, frame: number, seed = 'mix-catalog-hit-03') =>
  renderToStaticMarkup(<SceneSvg spec={spec(primary)} seed={seed} frame={frame} />);

for (const motif of MOTIFS) {
  test(`SceneSvg ${motif}: цикл бесшовный — кадр ${SCENE_FRAMES} совпадает с кадром 0`, () => {
    assert.equal(render(motif, SCENE_FRAMES), render(motif, 0));
  });

  test(`SceneSvg ${motif}: кадр зависит только от frame и seed`, () => {
    assert.equal(render(motif, 45), render(motif, 45));
    assert.notEqual(render(motif, 45), render(motif, 46));
    assert.notEqual(render(motif, 45), render(motif, 45, 'mix-catalog-hit-11'));
  });
}

test('SceneSvg: цвет сцены — из профиля, неизвестный профиль — запасной цвет', () => {
  const known = renderToStaticMarkup(<SceneSvg spec={{ primary: 'berry', secondary: null, c1: 'berry', c2: 'fruity' }} seed="m" frame={0} />);
  const unknown = renderToStaticMarkup(<SceneSvg spec={{ primary: 'berry', secondary: null, c1: 'umami', c2: 'umami' }} seed="m" frame={0} />);
  assert.match(known, /#a23048/);
  assert.match(unknown, /#7a5236/);
});

test('SceneSvg: без текста — сцена только фон', () => {
  for (const motif of MOTIFS) assert.doesNotMatch(render(motif, 90), /<text|<foreignObject/);
});
