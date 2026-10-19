import assert from 'node:assert/strict';
import test from 'node:test';
import { describeLine } from './brands';

test('describeLine takes the flavor from parentheses after a Cyrillic line name', () => {
  assert.deepEqual(describeLine('"Дарк Сайд" Кор (Блэккерент), 250 г'), {
    brand: 'DARKSIDE',
    line: 'Кор',
    grams: 250,
    flavor: 'Блэккерент',
    isTobacco: true,
  });
  assert.deepEqual(describeLine('"Дарк Сайд" Саботаж (Вольтэйдж) 250гр'), {
    brand: 'DARKSIDE',
    line: 'Саботаж',
    grams: 250,
    flavor: 'Вольтэйдж',
    isTobacco: true,
  });
});

test('describeLine treats parentheses without a line name as the flavor', () => {
  assert.deepEqual(describeLine('"Старлайн" (Клубничный мильфей), 250 г'), {
    brand: 'Starline',
    grams: 250,
    flavor: 'Клубничный мильфей',
    isTobacco: true,
  });
});

test('describeLine keeps a Russian translation of a Latin flavor as an alternative', () => {
  assert.deepEqual(describeLine('Табак для кальяна Black Burn 200г Raspberries (Спелая лесная малина)'), {
    brand: 'Black Burn',
    grams: 200,
    flavor: 'Raspberries',
    flavorAlt: 'Спелая лесная малина',
    isTobacco: true,
  });
  assert.deepEqual(describeLine('Табак для кальяна Хулиган 200г Panama (Фруктовый салатик)'), {
    brand: 'Хулиган',
    grams: 200,
    flavor: 'Panama',
    flavorAlt: 'Фруктовый салатик',
    isTobacco: true,
  });
});

test('describeLine splits line and flavor around the pack weight', () => {
  assert.deepEqual(describeLine('Табак для кальяна SEBERO Блэк БЧК 200гр Барбарисовая Шипучка'), {
    brand: 'Sebero',
    line: 'Блэк БЧК',
    grams: 200,
    flavor: 'Барбарисовая Шипучка',
    isTobacco: true,
  });
  assert.deepEqual(describeLine('Табак для кальяна Сарма 360 Крепкая 200гр Маракуйя'), {
    brand: 'Сарма',
    line: '360 Крепкая',
    grams: 200,
    flavor: 'Маракуйя',
    isTobacco: true,
  });
  assert.deepEqual(describeLine('Табак для кальяна Сарма 25г Бабл Гам'), {
    brand: 'Сарма',
    grams: 25,
    flavor: 'Бабл Гам',
    isTobacco: true,
  });
});

test('describeLine recognizes brand spellings regardless of case, quotes and script', () => {
  const cases: Array<[string, string]> = [
    ['Дарк Сайд Pear 250 г', 'DARKSIDE'],
    ['«ДАРК САЙД» Pear 250 г', 'DARKSIDE'],
    ['Darkside Pear 250 г', 'DARKSIDE'],
    ['DARKSIDE Pear', 'DARKSIDE'],
    ['Старлайн Груша', 'Starline'],
    ['STARLINE Груша', 'Starline'],
    ['BLACK BURN Red Orange', 'Black Burn'],
    ['Себеро Манго', 'Sebero'],
    ['sebero Манго', 'Sebero'],
    ['Sarma Маракуйя', 'Сарма'],
    ['ХЛГН Panama', 'Хулиган'],
    ['Hooligan Panama', 'Хулиган'],
    ['хулиган Panama', 'Хулиган'],
    ['Табак для кальяна BLANSH 200 гр Грейпфрутовый Сок', 'Blansh'],
  ];
  for (const [name, brand] of cases) {
    assert.equal(describeLine(name).brand, brand, name);
  }
});

test('describeLine does not take a brand from inside another word', () => {
  assert.equal(describeLine('Сармат 100г Вишня').brand, undefined);
});

test('describeLine reads pack weight in different spellings', () => {
  const cases: Array<[string, number]> = [
    ['Груша 250 г', 250],
    ['Груша 250гр', 250],
    ['Груша 200 гр', 200],
    ['Груша 25г', 25],
    ['Груша 100 g', 100],
  ];
  for (const [name, grams] of cases) {
    const described = describeLine(name);
    assert.equal(described.grams, grams, name);
    assert.equal(described.flavor, 'Груша', name);
    assert.equal(described.isTobacco, true, name);
  }
});

test('describeLine marks a line without brand and weight as not tobacco', () => {
  assert.deepEqual(describeLine('ОБЛАКО Египетская'), { flavor: 'ОБЛАКО Египетская', isTobacco: false });
  assert.equal(describeLine('Сарма 360 Крепкая Маракуйя').isTobacco, true);
});
