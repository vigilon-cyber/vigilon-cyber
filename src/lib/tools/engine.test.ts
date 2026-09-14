import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeResult,
  evaluate,
  isComplete,
  isValidAnswer,
  nextStep,
  previousStep,
  pruneAnswers,
  resolveStep,
  stepPath,
} from './engine.ts';
import { QUESTIONS } from './questions.ts';
import { TOOLS, TOOLS_BY_ID, toolMode } from './registry.ts';
import { loadSession, saveSession, SESSION_KEY, SESSION_TTL_MS } from './session.ts';
import type { KeyValueStore } from './session.ts';
import type { Answers } from './types.ts';

const red = TOOLS_BY_ID['red-scope'];
const cra = TOOLS_BY_ID['cra-scope'];
const roadmap = TOOLS_BY_ID['cra-roadmap'];

describe('predicates', () => {
  const answers: Answers = { a: 'x', m: ['p', 'q'] };

  it('evaluates single, multi and combinators', () => {
    assert.equal(evaluate({ q: 'a', is: ['x', 'y'] }, answers), true);
    assert.equal(evaluate({ q: 'm', is: 'p' }, answers), false, 'is only matches single answers');
    assert.equal(evaluate({ q: 'm', includes: ['q'] }, answers), true);
    assert.equal(evaluate({ q: 'b', answered: false }, answers), true);
    assert.equal(evaluate({ all: [{ q: 'a', is: 'x' }, { not: { q: 'm', includes: 'z' } }] }, answers), true);
    assert.equal(evaluate({ any: [{ q: 'a', is: 'nope' }, { q: 'b', answered: true }] }, answers), false);
  });

  it('only matches outcome predicates when an outcome is known', () => {
    assert.equal(evaluate({ outcome: 'in-scope' }, answers), false);
    assert.equal(evaluate({ outcome: ['in-scope', 'needs-review'] }, answers, 'needs-review'), true);
  });
});

describe('answer validation', () => {
  it('rejects unknown options and exclusive options combined with others', () => {
    assert.equal(isValidAnswer(QUESTIONS.radio, 'yes'), true);
    assert.equal(isValidAnswer(QUESTIONS.radio, 'maybe'), false);
    assert.equal(isValidAnswer(QUESTIONS.special_category, ['toy', 'wearable']), true);
    assert.equal(isValidAnswer(QUESTIONS.special_category, ['toy', 'none']), false);
    assert.equal(isValidAnswer(QUESTIONS.special_category, []), false);
    assert.equal(isValidAnswer(QUESTIONS.special_category, 'toy'), false);
  });
});

describe('branching and invalidation', () => {
  it('removes dependent answers when an upstream answer hides them', () => {
    const before: Answers = {
      eu_role: 'manufacturer',
      radio: 'yes',
      internet: 'direct',
      special_category: ['none'],
      data_functions: ['money'],
      sector_rules: ['none'],
      market_timing: 'before_2027',
    };
    assert.equal(computeResult(red, before).outcome, 'in-scope');

    const changed = pruneAnswers(TOOLS, { ...before, internet: 'no' });
    assert.deepEqual(changed.removed, ['data_functions']);
    assert.equal(isComplete(red, changed.answers), true);
    assert.equal(computeResult(red, changed.answers).outcome, 'outside-checked-scope');
  });

  it('keeps shared answers still used by another tool', () => {
    const answers: Answers = { eu_role: 'manufacturer', radio: 'no', sector_rules: ['none'], internet: 'direct' };
    const { answers: pruned, removed } = pruneAnswers(TOOLS, answers);
    assert.ok(removed.includes('internet'), 'internet is only asked by the RED tool');
    assert.deepEqual(pruned.sector_rules, ['none'], 'the CRA scope check still asks about other rules');
  });

  it('repeats until no hidden answers remain', () => {
    const answers: Answers = {
      eu_role: 'manufacturer',
      commercial: 'monetised',
      product_kind: 'online_service',
      remote_processing: 'yes',
      sector_rules: ['none'],
      market_timing: 'spans',
    };
    const { answers: pruned, removed } = pruneAnswers(TOOLS, { ...answers, eu_role: 'not_eu' });
    assert.deepEqual(removed.sort(), ['commercial', 'product_kind', 'remote_processing', 'sector_rules']);
    assert.deepEqual(Object.keys(pruned).sort(), ['eu_role', 'market_timing'], 'the roadmap still asks about timing');
  });
});

describe('step navigation', () => {
  const partial: Answers = { eu_role: 'manufacturer', radio: 'yes' };

  it('redirects deep links past unanswered questions', () => {
    assert.equal(resolveStep(red, partial, 'market_timing'), 'internet');
    assert.equal(resolveStep(red, partial, 'result'), 'internet');
    assert.equal(resolveStep(red, partial, 'radio'), 'radio');
    assert.equal(resolveStep(red, partial, 'not-a-step'), 'internet');
    assert.equal(resolveStep(red, {}, null), 'eu_role');
  });

  it('moves forward and back through visible questions', () => {
    const visited = new Set(['eu_role', 'radio']);
    assert.equal(nextStep(red, partial, visited, 'radio'), 'internet');
    assert.equal(previousStep(red, partial, visited, 'radio'), 'eu_role');
    assert.equal(previousStep(red, partial, visited, 'eu_role'), null);
    assert.equal(previousStep(red, partial, visited, 'contact'), 'result');
  });

  it('returns to the result after an edit unless the edit opens new questions', () => {
    const complete: Answers = {
      eu_role: 'manufacturer',
      radio: 'yes',
      internet: 'no',
      special_category: ['none'],
      sector_rules: ['none'],
      market_timing: 'before_2027',
    };
    const visited = new Set(Object.keys(complete));
    assert.equal(nextStep(red, complete, visited, 'eu_role', true), 'result');
    const opened = { ...complete, internet: 'direct' };
    assert.equal(nextStep(red, opened, visited, 'internet', true), 'data_functions');
  });

  it('skips answers reused from another tool', () => {
    const fromScope: Answers = { core_function: 'none', market_timing: 'spans', product_kind: 'hardware' };
    const path = stepPath(roadmap, fromScope, new Set()).map((entry) => entry.question.id);
    assert.equal(path.includes('core_function'), false);
    assert.equal(path.includes('market_timing'), false);
    assert.equal(path.includes('risk_assessment'), true);
    assert.equal(resolveStep(roadmap, fromScope, null), 'risk_assessment');
  });
});

describe('session storage', () => {
  function memoryStore(): KeyValueStore & { data: Map<string, string> } {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => void data.set(key, value),
      removeItem: (key) => void data.delete(key),
    };
  }

  it('round-trips answers and progress', () => {
    const store = memoryStore();
    const now = 1_000_000;
    assert.equal(saveSession(store, { version: 1, updatedAt: 0, answers: { radio: 'yes' }, tools: { 'red-scope': { visited: ['radio'] } } }, now), true);
    const loaded = loadSession(store, now + 1000);
    assert.deepEqual(loaded.answers, { radio: 'yes' });
    assert.deepEqual(loaded.tools['red-scope']?.visited, ['radio']);
  });

  it('expires idle sessions and ignores malformed data', () => {
    const store = memoryStore();
    saveSession(store, { version: 1, updatedAt: 0, answers: { radio: 'yes' }, tools: {} }, 0);
    assert.deepEqual(loadSession(store, SESSION_TTL_MS + 1).answers, {});
    assert.equal(store.data.has(SESSION_KEY), false);

    store.setItem(SESSION_KEY, '{"version":1,"updatedAt":5,"answers":{"radio":42,"internet":["direct"]}}');
    assert.deepEqual(loadSession(store, 10).answers, { internet: ['direct'] });
    store.setItem(SESSION_KEY, 'not json');
    assert.deepEqual(loadSession(store, 10).answers, {});
  });

  it('reports when storage is unavailable', () => {
    const blocked: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {},
    };
    assert.equal(saveSession(blocked, loadSession(blocked)), false);
    assert.equal(saveSession(null, loadSession(null)), false);
  });
});

describe('tool availability', () => {
  it('never publishes unreviewed rules in a production build without the preview flag', () => {
    assert.equal(toolMode('fixture', { dev: false }), 'unavailable');
    assert.equal(toolMode('fixture', { dev: false, previewFlag: 'false' }), 'unavailable');
    assert.equal(toolMode('fixture', { dev: false, previewFlag: 'true' }), 'preview');
    assert.equal(toolMode('fixture', { dev: true }), 'preview');
    assert.equal(toolMode('reviewed', { dev: false }), 'live');
  });

  it('uses the CRA scope check as the first tool to reuse answers from', () => {
    assert.equal(cra.path[0].question.id, 'eu_role');
  });
});
