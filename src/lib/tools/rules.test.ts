/**
 * Scenario, boundary and integrity tests for the tool rule sets.
 *
 * These confirm the rules do what they say. They do not validate the legal
 * interpretation — that needs a qualified reviewer (see README).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeResult, isComplete, visiblePath } from './engine.ts';
import { TOOLS, TOOLS_BY_ID } from './registry.ts';
import { SERVICES } from './services.ts';
import { SOURCES } from './sources.ts';
import { formatResultText } from './summary.ts';
import type { Answers, Predicate, ToolDefinition } from './types.ts';

const red = TOOLS_BY_ID['red-scope'];
const cra = TOOLS_BY_ID['cra-scope'];
const roadmap = TOOLS_BY_ID['cra-roadmap'];
const reporting = TOOLS_BY_ID['reporting-readiness'];

function asked(tool: ToolDefinition, answers: Answers): string[] {
  return visiblePath(tool, answers).map((entry) => entry.question.id);
}

function result(tool: ToolDefinition, answers: Answers) {
  assert.equal(isComplete(tool, answers), true, `expected a complete path, still asking: ${asked(tool, answers).filter((id) => !(id in answers))}`);
  return computeResult(tool, answers);
}

describe('RED scope', () => {
  const base: Answers = {
    eu_role: 'manufacturer',
    radio: 'yes',
    internet: 'direct',
    special_category: ['none'],
    data_functions: ['personal', 'money'],
    sector_rules: ['none'],
    market_timing: 'before_2027',
  };

  it('stops after one question when the product is not for the EU', () => {
    const answers: Answers = { eu_role: 'not_eu' };
    assert.deepEqual(asked(red, answers), ['eu_role']);
    assert.equal(result(red, answers).outcome, 'outside-checked-scope');
  });

  it('points non-radio products to the CRA check', () => {
    const outcome = result(red, { eu_role: 'manufacturer', radio: 'no' });
    assert.equal(outcome.outcome, 'outside-checked-scope');
    assert.deepEqual(outcome.action, { kind: 'tool', toolId: 'cra-scope', label: 'Check CRA scope' });
  });

  it('applies (d), (e) and (f) to internet-connected equipment with personal data and payments', () => {
    const outcome = result(red, base);
    assert.equal(outcome.outcome, 'in-scope');
    assert.deepEqual(
      outcome.obligations.map((item) => item.id),
      ['art-3-3-d', 'art-3-3-e', 'art-3-3-f', 'documentation'],
    );
    assert.ok(outcome.firedRuleIds.includes('RED-SCOPE-F-020'), 'EN 18031-3 restriction is flagged');
    assert.ok(outcome.relatedTools.includes('cra-scope'));
  });

  it('applies only (e) to a wearable that processes personal data without internet', () => {
    const outcome = result(red, { ...base, internet: 'no', special_category: ['wearable'], data_functions: ['personal'] });
    assert.equal(outcome.outcome, 'in-scope');
    assert.deepEqual(outcome.obligations.map((item) => item.id), ['art-3-3-e', 'documentation']);
  });

  it('applies the vehicle derogation to (e) and (f)', () => {
    const offline = result(red, {
      ...base,
      internet: 'no',
      special_category: ['wearable'],
      data_functions: ['personal'],
      sector_rules: ['vehicle'],
    });
    assert.equal(offline.outcome, 'outside-checked-scope');
    assert.equal(offline.firedRuleIds[0], 'RED-SCOPE-180');

    const online = result(red, { ...base, sector_rules: ['vehicle'] });
    assert.equal(online.outcome, 'in-scope');
    assert.deepEqual(online.obligations.map((item) => item.id), ['art-3-3-d', 'documentation']);
  });

  it('treats non-internet products outside the special categories as outside the checked scope', () => {
    const answers: Answers = { ...base, internet: 'no', special_category: ['none'] };
    delete answers.data_functions;
    assert.equal(asked(red, answers).includes('data_functions'), false);
    assert.equal(result(red, answers).outcome, 'outside-checked-scope');
  });

  it('never gives a confident answer when a deciding fact is unknown', () => {
    assert.equal(result(red, { ...base, internet: 'unsure' }).outcome, 'needs-review');
    assert.equal(result(red, { ...base, sector_rules: ['unsure'] }).outcome, 'needs-review');
  });

  it('reflects the repeal of the delegated regulation from 11 December 2027', () => {
    const later = result(red, { ...base, market_timing: 'from_2027' });
    assert.equal(later.outcome, 'outside-checked-scope');
    assert.ok(later.sources.includes('red-da-repeal'));

    const spans = result(red, { ...base, market_timing: 'spans' });
    assert.equal(spans.outcome, 'in-scope');
    assert.ok(spans.uncertainties.some((item) => item.ruleId === 'RED-SCOPE-F-075'));
  });

  it('routes excluded or unsupported sectors correctly', () => {
    const medical: Answers = { ...base, sector_rules: ['medical'] };
    delete medical.market_timing;
    assert.equal(asked(red, medical).includes('market_timing'), false);
    assert.equal(result(red, medical).outcome, 'outside-checked-scope');
    assert.equal(result(red, { ...base, sector_rules: ['aviation'] }).outcome, 'needs-review');
    assert.equal(result(red, { ...base, sector_rules: ['spare_part'] }).outcome, 'needs-review');
  });
});

describe('CRA scope', () => {
  const base: Answers = {
    eu_role: 'manufacturer',
    commercial: 'monetised',
    product_kind: 'hardware',
    data_connection: 'direct',
    remote_processing: 'yes',
    sector_rules: ['none'],
    core_function: 'none',
    market_timing: 'spans',
  };

  it('finds a connected monetised hardware product likely in scope, with reporting already applicable', () => {
    const outcome = result(cra, base);
    assert.equal(outcome.outcome, 'in-scope');
    assert.ok(outcome.obligations.some((item) => item.id === 'reporting'));
    assert.ok(outcome.relatedTools.includes('reporting-readiness'));
    assert.deepEqual(outcome.action, { kind: 'tool', toolId: 'cra-roadmap', label: 'Build my CRA roadmap' });
    assert.ok(outcome.firedRuleIds.includes('CRA-SCOPE-F-050'), 'remote data processing is part of the product');
  });

  it('does not treat free software, SaaS or unconnected products with blanket shortcuts', () => {
    const foss = result(cra, { eu_role: 'manufacturer', commercial: 'foss' });
    assert.equal(foss.outcome, 'outside-checked-scope');
    assert.ok(foss.uncertainties.length > 0, 'explains when open source can still be commercial');

    assert.equal(result(cra, { eu_role: 'manufacturer', commercial: 'steward' }).outcome, 'needs-review');

    const serviceOnly: Answers = { eu_role: 'distributor', product_kind: 'online_service', remote_processing: 'no' };
    assert.deepEqual(asked(cra, serviceOnly), ['eu_role', 'product_kind', 'remote_processing']);
    assert.equal(result(cra, serviceOnly).outcome, 'outside-checked-scope');

    const backend = result(cra, { ...serviceOnly, remote_processing: 'yes', sector_rules: ['none'], market_timing: 'spans' });
    assert.equal(backend.outcome, 'needs-review');

    const free = result(cra, { ...base, commercial: 'free' });
    assert.equal(free.outcome, 'in-scope');
    assert.ok(free.uncertainties.some((item) => item.ruleId === 'CRA-SCOPE-F-010'));
  });

  it('skips the connection question when internet connectivity is already known', () => {
    const answers: Answers = { ...base, internet: 'via_device' };
    delete answers.data_connection;
    assert.equal(asked(cra, answers).includes('data_connection'), false);
    assert.equal(result(cra, answers).outcome, 'in-scope');
  });

  it('applies the exclusions in Article 2', () => {
    for (const sector of ['medical', 'vehicle', 'aviation', 'marine', 'defence', 'spare_part']) {
      const answers: Answers = { ...base, sector_rules: [sector] };
      delete answers.core_function;
      delete answers.market_timing;
      assert.equal(result(cra, answers).outcome, 'outside-checked-scope', sector);
    }
    const toll = result(cra, { ...base, sector_rules: ['toll'] });
    assert.equal(toll.outcome, 'in-scope', 'road toll rules are not a CRA exclusion');
  });

  it('gives importers and distributors their own obligations', () => {
    const importer: Answers = { ...base, eu_role: 'importer' };
    delete importer.commercial;
    const outcome = result(cra, importer);
    assert.equal(outcome.outcome, 'in-scope');
    assert.deepEqual(outcome.obligations.map((item) => item.id), ['reporting', 'importer-checks']);
  });

  it('explains the conformity route for each category', () => {
    assert.ok(result(cra, { ...base, core_function: 'class_i' }).firedRuleIds.includes('CRA-SCOPE-F-072'));
    assert.ok(result(cra, { ...base, core_function: 'class_ii' }).firedRuleIds.includes('CRA-SCOPE-F-074'));
    assert.ok(result(cra, { ...base, core_function: 'critical' }).firedRuleIds.includes('CRA-SCOPE-F-076'));
  });

  it('needs review when a deciding fact is unknown', () => {
    assert.equal(result(cra, { ...base, product_kind: 'unsure' }).outcome, 'needs-review');
    assert.equal(result(cra, { ...base, data_connection: 'unsure' }).outcome, 'needs-review');
  });
});

describe('CRA roadmap', () => {
  const ready: Answers = {
    eu_role: 'manufacturer',
    product_kind: 'hardware',
    risk_assessment: 'current',
    test_evidence: 'structured',
    tech_docs: 'mostly',
    sbom: 'maintained',
    vuln_handling: 'documented',
    updates: 'in_place',
    core_function: 'none',
    market_timing: 'spans',
  };

  it('acknowledges covered areas instead of recommending everything', () => {
    const outcome = result(roadmap, ready);
    assert.equal(outcome.outcome, 'action-plan');
    assert.equal(outcome.covered.length, 6);
    assert.deepEqual(outcome.steps.map((step) => step.id), ['conformity-route', 'ongoing']);
  });

  it('puts reporting readiness first when vulnerability handling is not documented', () => {
    const outcome = result(roadmap, { ...ready, vuln_handling: 'none', risk_assessment: 'none', test_evidence: 'none', tech_docs: 'none' });
    const order = outcome.steps.map((step) => step.id);
    assert.equal(order[0], 'reporting-readiness');
    assert.ok(order.indexOf('risk-assessment') < order.indexOf('testing'));
    assert.ok(order.indexOf('testing') < order.indexOf('technical-documentation'));
    assert.ok(order.indexOf('technical-documentation') < order.indexOf('conformity-route'));
    const docs = outcome.steps.find((step) => step.id === 'technical-documentation');
    assert.deepEqual(docs?.dependsOnTitles.length, 3, 'only unfinished prerequisites are listed');
  });

  it('asks to confirm scope when it has not been checked', () => {
    const noScope: Answers = { ...ready };
    delete noScope.eu_role;
    delete noScope.product_kind;
    const outcome = result(roadmap, noScope);
    assert.equal(outcome.steps[0].id, 'confirm-scope');
    assert.ok(outcome.relatedTools.includes('cra-scope'));
  });

  it('does not produce a manufacturer roadmap for importers or out-of-scope products', () => {
    assert.equal(result(roadmap, { ...ready, eu_role: 'importer' }).outcome, 'needs-review');
    assert.equal(result(roadmap, { ...ready, data_connection: 'none' }).outcome, 'needs-review');
  });
});

describe('CRA reporting readiness', () => {
  const gaps: Answers = {
    eu_role: 'manufacturer',
    product_kind: 'hardware',
    intake: 'none',
    triage: 'ad_hoc',
    escalation: 'business_hours',
    notification_prep: 'none',
    user_comms: 'none',
    records: 'scattered',
  };

  it('orders reporting gaps by dependency', () => {
    const order = result(reporting, gaps).steps.map((step) => step.id);
    assert.deepEqual(order.slice(0, 4), ['intake', 'triage', 'escalation', 'notification']);
    assert.equal(order.at(-1), 'ongoing');
  });

  it('acknowledges a ready process', () => {
    const outcome = result(reporting, {
      eu_role: 'manufacturer',
      intake: 'published',
      triage: 'documented',
      escalation: 'covered',
      notification_prep: 'defined',
      user_comms: 'ready',
      records: 'tracked',
      product_kind: 'hardware',
    });
    assert.equal(outcome.covered.length, 6);
    assert.deepEqual(outcome.steps.map((step) => step.id), ['exercise', 'ongoing']);
    assert.equal(outcome.services.some((item) => item.id === 'continuum'), false);
  });

  it('gives distributors their own duties without asking process questions', () => {
    assert.deepEqual(asked(reporting, { eu_role: 'distributor' }), ['eu_role']);
    assert.equal(result(reporting, { eu_role: 'distributor' }).outcome, 'needs-review');
  });
});

describe('rule set integrity', () => {
  const gatingUnsure: Record<string, string[]> = {
    'red-scope': ['eu_role', 'radio', 'internet', 'special_category', 'data_functions', 'sector_rules', 'market_timing'],
    'cra-scope': ['eu_role', 'commercial', 'product_kind', 'data_connection', 'remote_processing', 'sector_rules'],
  };

  function questionIds(predicate: Predicate): string[] {
    if ('all' in predicate) return predicate.all.flatMap(questionIds);
    if ('any' in predicate) return predicate.any.flatMap(questionIds);
    if ('not' in predicate) return questionIds(predicate.not);
    if ('q' in predicate) return [predicate.q];
    return [];
  }

  for (const tool of TOOLS) {
    it(`${tool.id}: references resolve and unreviewed rules are marked as fixtures`, () => {
      const rules = [...tool.rules.positionRules, ...tool.rules.findingRules];
      const ids = rules.map((rule) => rule.id);
      assert.equal(new Set(ids).size, ids.length, 'rule ids are unique');
      assert.deepEqual(tool.rules.positionRules.at(-1)?.when, { always: true }, 'a fallback position rule exists');
      assert.equal(tool.rules.positionRules.at(-1)?.outcome === 'in-scope', false, 'fallback is never a confident yes');
      if (tool.rules.status !== 'reviewed') {
        assert.equal(tool.rules.reviewedBy, null);
      } else {
        assert.ok(tool.rules.reviewedBy && tool.rules.reviewedAt, 'reviewed rules name a reviewer and date');
      }

      const questionsKnown = new Set(TOOLS.flatMap((t) => t.path.map((entry) => entry.question.id)));
      for (const rule of rules) {
        assert.ok(rule.sources.length > 0 && rule.reference, `${rule.id} cites a source`);
        rule.sources.forEach((id) => assert.ok(SOURCES[id], `${rule.id}: source ${id}`));
        rule.steps?.forEach((id) => assert.ok(tool.steps.some((step) => step.id === id), `${rule.id}: step ${id}`));
        rule.obligations?.forEach((id) => assert.ok(tool.obligations.some((item) => item.id === id), `${rule.id}: obligation ${id}`));
        rule.services?.forEach((service) => assert.ok(SERVICES[service.id], `${rule.id}: service ${service.id}`));
        questionIds(rule.when).forEach((id) => assert.ok(questionsKnown.has(id), `${rule.id}: question ${id}`));
        for (const text of [rule.reason, rule.uncertainty, rule.covered]) {
          for (const [, id] of (text ?? '').matchAll(/\{\{([a-z0-9_]+)\}\}/g)) {
            assert.ok(questionsKnown.has(id), `${rule.id}: template question ${id}`);
          }
        }
      }
      for (const entry of tool.path) {
        if (entry.showIf) questionIds(entry.showIf).forEach((id) => assert.ok(questionsKnown.has(id), `showIf ${id}`));
        assert.ok(tool.stages.some((stage) => stage.id === entry.stage), `stage ${entry.stage}`);
      }
    });
  }

  it('never returns “likely in scope” while a deciding answer is “I’m not sure” (randomised)', () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 2 ** 32;
      return seed / 2 ** 32;
    };

    for (const tool of [red, cra]) {
      for (let run = 0; run < 3000; run += 1) {
        const answers: Answers = {};
        for (let guard = 0; guard < 20; guard += 1) {
          const open = visiblePath(tool, answers).find((entry) => !(entry.question.id in answers));
          if (!open) break;
          const options = open.question.options;
          if (open.question.kind === 'single') {
            answers[open.question.id] = options[Math.floor(random() * options.length)].id;
          } else {
            const exclusive = options.filter((option) => option.exclusive);
            const regular = options.filter((option) => !option.exclusive);
            const picked = random() < 0.3
              ? [exclusive[Math.floor(random() * exclusive.length)].id]
              : regular.filter(() => random() < 0.4).map((option) => option.id);
            answers[open.question.id] = picked.length > 0 ? picked : [regular[0].id];
          }
        }
        const outcome = computeResult(tool, answers);
        assert.ok(outcome.position.headline, 'every combination produces a position');
        const unsure = gatingUnsure[tool.id].filter((id) => [answers[id]].flat().includes('unsure'));
        if (unsure.length > 0) {
          assert.notEqual(outcome.outcome, 'in-scope', `${tool.id} ${JSON.stringify(answers)}`);
        }
      }
    }
  });

  it('describes Vigilon Continuum without unverified capability claims', () => {
    const text = [SERVICES.continuum.description, ...TOOLS.flatMap((tool) => [...tool.rules.positionRules, ...tool.rules.findingRules])
      .flatMap((rule) => rule.services ?? [])
      .filter((service) => service.id === 'continuum')
      .map((service) => service.why)].join(' ');
    assert.doesNotMatch(text, /\b(integrat|certif|approved|official|guarantee|automat|direct(ly)? submi)/i);
  });

  it('labels fixture results in the downloadable summary', () => {
    const answers: Answers = { eu_role: 'not_eu' };
    const text = formatResultText(cra, answers, computeResult(cra, answers), new Date('2026-09-13T12:00:00Z'));
    assert.match(text, /LOCAL FIXTURE/);
    assert.match(text, /Generated 13 September 2026/);
    assert.match(text, /Role in the EU: It won’t be supplied in the EU/);
    assert.match(text, /eur-lex\.europa\.eu\/eli\/reg\/2024\/2847/);
  });
});
