/**
 * RED cybersecurity scope check.
 *
 * LOCAL FIXTURE: these rules implement Delegated Regulation (EU) 2022/30 (as
 * amended), its repeal by Delegated Regulation (EU) 2026/339, and the EN 18031
 * citation in Implementing Decision (EU) 2025/138, as read on the
 * sources-checked date. They have not been reviewed by a qualified reviewer
 * and must not be published as a production checker.
 */

import { QUESTIONS } from './questions.ts';
import { SOURCES_CHECKED_AT } from './sources.ts';
import type { Predicate, ToolDefinition } from './types.ts';

const notEu: Predicate = { q: 'eu_role', is: 'not_eu' };
const noRadio: Predicate = { q: 'radio', is: 'no' };
const stopEarly: Predicate = { any: [notEu, noRadio] };
const internetConnected: Predicate = { q: 'internet', is: ['direct', 'via_device'] };
const specialCategory: Predicate = { q: 'special_category', includes: ['childcare', 'toy', 'wearable'] };
const processesData: Predicate = { q: 'data_functions', includes: ['personal', 'traffic_location'] };
const transfersMoney: Predicate = { q: 'data_functions', includes: 'money' };
/** Delegated Regulation (EU) 2022/30, Art. 2(2): (e) and (f) don't apply. Aviation is routed to review separately. */
const efDerogation: Predicate = { q: 'sector_rules', includes: ['vehicle', 'toll'] };
const isManufacturer: Predicate = { q: 'eu_role', is: 'manufacturer' };
const inScope: Predicate = { outcome: 'in-scope' };

const RED = 'Directive 2014/53/EU';
const DA = 'Delegated Regulation (EU) 2022/30';
const REPEAL = 'Delegated Regulation (EU) 2026/339';
const CITATION = 'Implementing Decision (EU) 2025/138';

export const redScope: ToolDefinition = {
  id: 'red-scope',
  slug: 'red-scope',
  name: 'RED cybersecurity scope check',
  shortName: 'RED scope',
  summary: 'Check whether the cybersecurity requirements of the EU Radio Equipment Directive (RED) are likely to apply to your radio product.',
  scopeNote:
    'This check covers only the RED cybersecurity requirements in Article 3(3)(d), (e) and (f), made applicable by Delegated Regulation (EU) 2022/30. It does not assess RED safety, electromagnetic compatibility (EMC), radio spectrum or other obligations, and a negative result is not an exemption from them. It is preliminary guidance, not a legal determination or certification.',
  stages: [
    { id: 'role', label: 'Role' },
    { id: 'product', label: 'Product' },
    { id: 'timing', label: 'Timing' },
    { id: 'result', label: 'Result' },
  ],
  path: [
    { question: QUESTIONS.eu_role, stage: 'role' },
    { question: QUESTIONS.radio, stage: 'product', showIf: { not: notEu } },
    { question: QUESTIONS.internet, stage: 'product', showIf: { not: stopEarly } },
    { question: QUESTIONS.special_category, stage: 'product', showIf: { not: stopEarly } },
    {
      question: QUESTIONS.data_functions,
      stage: 'product',
      showIf: {
        all: [
          { not: stopEarly },
          {
            any: [
              { q: 'internet', is: ['direct', 'via_device', 'unsure'] },
              { q: 'special_category', includes: ['childcare', 'toy', 'wearable', 'unsure'] },
            ],
          },
        ],
      },
    },
    { question: QUESTIONS.sector_rules, stage: 'product', showIf: { not: stopEarly } },
    {
      question: QUESTIONS.market_timing,
      stage: 'timing',
      showIf: { all: [{ not: stopEarly }, { not: { q: 'sector_rules', includes: 'medical' } }] },
    },
  ],
  positions: {
    'in-scope': {
      label: 'Likely in scope',
      headline: 'The RED cybersecurity requirements are likely to apply',
      summary: 'Based on your answers, at least one of the requirements in Article 3(3)(d), (e) or (f) appears to apply. This is preliminary guidance, not a legal determination.',
    },
    'outside-checked-scope': {
      label: 'Likely outside the checked scope',
      headline: 'The RED cybersecurity requirements are likely not to apply, based on your answers',
      summary: 'This covers only the RED cybersecurity requirements checked here. Other RED requirements — including safety, EMC and radio spectrum — may still apply.',
    },
    'needs-review': {
      label: 'Needs review',
      headline: 'Your answers need a specialist review',
      summary: 'At least one fact that decides whether the RED cybersecurity requirements apply is uncertain, or falls outside what this tool checks.',
    },
  },
  obligations: [
    {
      id: 'art-3-3-d',
      title: 'Article 3(3)(d): network protection',
      detail: 'The equipment must not harm the network or its functioning, nor misuse network resources. Harmonised standard: EN 18031-1.',
      reference: `${RED}, Art. 3(3)(d); ${DA}, Art. 1(1)`,
    },
    {
      id: 'art-3-3-e',
      title: 'Article 3(3)(e): personal data and privacy',
      detail: 'The equipment must incorporate safeguards to protect the personal data and privacy of the user and subscriber. Harmonised standard: EN 18031-2.',
      reference: `${RED}, Art. 3(3)(e); ${DA}, Art. 1(2)`,
    },
    {
      id: 'art-3-3-f',
      title: 'Article 3(3)(f): protection from fraud',
      detail: 'The equipment must support features that protect from fraud. Harmonised standard: EN 18031-3.',
      reference: `${RED}, Art. 3(3)(f); ${DA}, Art. 1(3)`,
    },
    {
      id: 'documentation',
      title: 'Conformity assessment and technical documentation',
      detail: 'Carry out the applicable conformity assessment procedure, draw up the technical documentation, and keep it with the EU declaration of conformity for 10 years after the equipment is placed on the market.',
      reference: `${RED}, Art. 10(3)–(4); Art. 17`,
    },
  ],
  steps: [
    {
      id: 'resolve-open-questions',
      title: 'Resolve the open questions',
      detail: 'Confirm the uncertain facts listed above, then run this check again.',
      owner: 'you',
    },
    {
      id: 'confirm-requirements',
      title: 'Confirm which EN 18031 parts and restrictions apply',
      detail: 'Map each applicable requirement to EN 18031-1, -2 or -3, including the restrictions published with their citation.',
      owner: 'you',
      dependsOn: ['resolve-open-questions'],
    },
    {
      id: 'choose-route',
      title: 'Choose the conformity assessment route',
      detail: 'Where harmonised standards are not applied, or applied only in part, a Notified Body procedure is required for the requirements concerned.',
      owner: 'you',
      dependsOn: ['confirm-requirements'],
    },
    {
      id: 'gap-analysis',
      title: 'Run a gap analysis before formal testing',
      detail: 'Find and fix gaps against the applicable requirements before you invest in formal test evidence.',
      owner: 'vigilon',
      dependsOn: ['confirm-requirements'],
    },
    {
      id: 'test-evidence',
      title: 'Test and document the evidence',
      detail: 'Carry out the assessment for each applicable requirement and record the results for the technical documentation.',
      owner: 'vigilon',
      dependsOn: ['gap-analysis'],
    },
    {
      id: 'technical-file',
      title: 'Complete the technical documentation and EU declaration of conformity',
      detail: 'Bring the risk assessment and test reports together before placing the product on the market.',
      owner: 'you',
      dependsOn: ['test-evidence', 'choose-route'],
    },
    {
      id: 'request-evidence',
      title: 'Ask the manufacturer for conformity evidence',
      detail: 'Request the EU declaration of conformity and confirmation of the conformity assessment and technical documentation.',
      owner: 'you',
    },
    {
      id: 'check-cra',
      title: 'Check CRA scope',
      detail: 'See whether the Cyber Resilience Act applies to the product, including its reporting obligations.',
      owner: 'you',
    },
    {
      id: 'other-red-requirements',
      title: 'Confirm your other RED obligations',
      detail: 'This check doesn’t cover safety, EMC, radio spectrum or other RED requirements.',
      owner: 'you',
    },
    {
      id: 'confirm-other-legislation',
      title: 'Confirm the other legislation that applies',
      detail: 'Check the product’s classification under the rules you selected.',
      owner: 'you',
    },
    {
      id: 'recheck-on-change',
      title: 'Check again if your plans change',
      detail: 'A change in markets, connectivity or features can change this result.',
      owner: 'you',
    },
  ],
  actions: {
    'in-scope': { kind: 'contact', label: 'Scope my RED testing' },
    'needs-review': { kind: 'contact', label: 'Discuss these open questions' },
    'outside-checked-scope': { kind: 'contact', label: 'Talk to an expert' },
  },
  defaultAction: { kind: 'contact', label: 'Talk to an expert' },
  rules: {
    id: 'red-scope',
    version: '0.1.0',
    status: 'fixture',
    sourcesCheckedAt: SOURCES_CHECKED_AT,
    reviewedAt: null,
    reviewedBy: null,
    positionRules: [
      {
        id: 'RED-SCOPE-010',
        version: '0.1.0',
        sources: ['red'],
        reference: `${RED}, Art. 1(1); Art. 2(1)(9)`,
        when: notEu,
        outcome: 'outside-checked-scope',
        reason: 'You told us the product won’t be supplied in the EU. The RED applies to radio equipment made available on the EU market.',
        uncertainty: 'If you later supply the product in the EU, check again.',
        steps: ['recheck-on-change'],
      },
      {
        id: 'RED-SCOPE-020',
        version: '0.1.0',
        sources: ['red'],
        reference: `${RED}, Art. 2(1)(1)`,
        when: noRadio,
        outcome: 'outside-checked-scope',
        reason: 'You told us the product doesn’t intentionally send or receive radio signals, so it is unlikely to be radio equipment under the RED.',
        uncertainty: 'Connected products without radio functions can still fall within the Cyber Resilience Act.',
        steps: ['check-cra'],
        tools: ['cra-scope'],
        action: { kind: 'tool', toolId: 'cra-scope', label: 'Check CRA scope' },
      },
      {
        id: 'RED-SCOPE-030',
        version: '0.1.0',
        sources: ['red-da'],
        reference: `${DA}, Art. 2(1)`,
        when: { q: 'sector_rules', includes: 'medical' },
        outcome: 'outside-checked-scope',
        reason: 'You told us the product is a medical device or in vitro diagnostic medical device. The RED cybersecurity requirements in Article 3(3)(d), (e) and (f) don’t apply to radio equipment also covered by those regulations.',
        uncertainty: 'Confirm that Regulation (EU) 2017/745 or (EU) 2017/746 actually applies to the product.',
        steps: ['confirm-other-legislation', 'other-red-requirements'],
      },
      {
        id: 'RED-SCOPE-035',
        version: '0.1.0',
        sources: ['red', 'red-da'],
        reference: `${RED}, Art. 1(2)–(3) and Annex I; ${DA}, Art. 2(2)`,
        when: { q: 'sector_rules', includes: ['marine', 'aviation', 'defence', 'spare_part'] },
        outcome: 'needs-review',
        reason: 'You told us {{sector_rules}} applies. The RED excludes the marine equipment and airborne products listed in its Annex I and radio equipment used exclusively for public security or defence, and the cybersecurity delegated regulation limits some requirements for civil aviation products. This tool doesn’t assess these cases, or how the RED applies to spare parts.',
        services: [{ id: 'expert-call', why: 'Review whether these exclusions or limits apply to the product.' }],
        steps: ['resolve-open-questions'],
      },
      {
        id: 'RED-SCOPE-040',
        version: '0.1.0',
        sources: ['red-da-repeal', 'cra'],
        reference: `${REPEAL}, Art. 1`,
        effectiveFrom: '2027-12-11',
        when: { q: 'market_timing', is: 'from_2027' },
        outcome: 'outside-checked-scope',
        reason: 'You told us the product will only be placed on the market from 11 December 2027. Delegated Regulation (EU) 2022/30, which makes the RED cybersecurity requirements apply, is repealed from that date, when the Cyber Resilience Act applies in full.',
        uncertainty: 'If the launch moves before 11 December 2027, check again.',
        steps: ['check-cra', 'other-red-requirements'],
        tools: ['cra-scope'],
        action: { kind: 'tool', toolId: 'cra-scope', label: 'Check CRA scope' },
      },
      {
        id: 'RED-SCOPE-050',
        version: '0.1.0',
        sources: ['red-da'],
        reference: `${DA}, Art. 1`,
        when: {
          any: [
            { q: 'eu_role', is: 'unsure' },
            { q: 'radio', is: 'unsure' },
            { q: 'internet', is: 'unsure' },
            { q: 'special_category', includes: 'unsure' },
            { q: 'data_functions', includes: 'unsure' },
            { q: 'sector_rules', includes: 'unsure' },
            { q: 'market_timing', is: 'unsure' },
          ],
        },
        outcome: 'needs-review',
        reason: 'At least one answer that decides whether the RED cybersecurity requirements apply was “I’m not sure”, so this check can’t indicate a likely position yet.',
        services: [{ id: 'expert-call', why: 'Resolve the uncertain facts with a specialist.' }],
        steps: ['resolve-open-questions'],
      },
      {
        id: 'RED-SCOPE-100',
        version: '0.1.0',
        sources: ['red-da'],
        reference: `${DA}, Art. 1(1)`,
        when: internetConnected,
        outcome: 'in-scope',
        reason: 'You told us the product sends or receives radio signals and can communicate over the internet ({{internet}}). That makes it internet-connected radio equipment, to which the network-protection requirement in Article 3(3)(d) applies.',
        obligations: ['art-3-3-d', 'documentation'],
      },
      {
        id: 'RED-SCOPE-110',
        version: '0.1.0',
        sources: ['red-da'],
        reference: `${DA}, Art. 1(2)(b)–(d)`,
        when: { all: [{ q: 'internet', is: 'no' }, specialCategory, processesData, { not: efDerogation }] },
        outcome: 'in-scope',
        reason: 'You told us the product is {{special_category}} and can {{data_functions}}. The privacy requirement in Article 3(3)(e) applies to such radio equipment even when it doesn’t communicate over the internet.',
        obligations: ['art-3-3-e', 'documentation'],
      },
      {
        id: 'RED-SCOPE-180',
        version: '0.1.0',
        sources: ['red-da'],
        reference: `${DA}, Art. 2(2)`,
        when: { all: [{ q: 'internet', is: 'no' }, specialCategory, processesData, efDerogation] },
        outcome: 'outside-checked-scope',
        reason: 'Article 3(3)(e) would otherwise apply to this product, but you told us {{sector_rules}} also applies. For radio equipment covered by those rules, Articles 3(3)(e) and (f) don’t apply, and without internet communication Article 3(3)(d) doesn’t either.',
        steps: ['confirm-other-legislation', 'other-red-requirements'],
      },
      {
        id: 'RED-SCOPE-190',
        version: '0.1.0',
        sources: ['red-da'],
        reference: `${DA}, Art. 1`,
        when: { q: 'internet', is: 'no' },
        outcome: 'outside-checked-scope',
        reason: 'You told us the product doesn’t communicate over the internet, and your other answers don’t match the childcare, toy or wearable equipment that processes personal, traffic or location data. The RED cybersecurity requirements apply only to those categories.',
        uncertainty: 'Adding internet connectivity — including through an app, hub or gateway — would change this result.',
        steps: ['other-red-requirements', 'recheck-on-change'],
      },
      {
        id: 'RED-SCOPE-999',
        version: '0.1.0',
        sources: ['red-da'],
        reference: `${DA}, Art. 1`,
        when: { always: true },
        outcome: 'needs-review',
        reason: 'This combination of answers isn’t covered by the checks in this tool, so it needs a specialist review.',
        services: [{ id: 'expert-call', why: 'Review the facts this tool can’t assess.' }],
        steps: ['resolve-open-questions'],
      },
    ],
    findingRules: [
      {
        id: 'RED-SCOPE-F-010',
        version: '0.1.0',
        sources: ['red-da'],
        reference: `${DA}, Art. 1(2)(a)`,
        when: { all: [inScope, internetConnected, processesData, { not: efDerogation }] },
        reason: 'You also told us it can process personal, traffic or location data, so the privacy requirement in Article 3(3)(e) applies.',
        obligations: ['art-3-3-e'],
      },
      {
        id: 'RED-SCOPE-F-020',
        version: '0.1.0',
        sources: ['red-da', 'en-18031-citation', 'red'],
        reference: `${DA}, Art. 1(3); ${CITATION}, Annex (EN 18031-3, Notice 3); ${RED}, Art. 17(4)`,
        when: { all: [inScope, internetConnected, transfersMoney, { not: efDerogation }] },
        reason: 'You told us it lets users transfer money, monetary value or virtual currency, so the fraud-protection requirement in Article 3(3)(f) applies.',
        uncertainty: 'EN 18031-3 is cited with a restriction: its secure-update assessment criteria (clause 6.3.2.4) don’t give a presumption of conformity for Article 3(3)(f). Where harmonised standards are applied only in part, a Notified Body procedure is required for the requirement concerned.',
        obligations: ['art-3-3-f'],
        services: [{ id: 'notified-body-prep', why: 'Prepares the product and documentation if a Notified Body procedure is needed.' }],
        steps: ['choose-route'],
      },
      {
        id: 'RED-SCOPE-F-030',
        version: '0.1.0',
        sources: ['red-da'],
        reference: `${DA}, Art. 2(2)`,
        when: { all: [inScope, efDerogation, { any: [processesData, transfersMoney] }] },
        reason: 'You told us {{sector_rules}} also applies. For radio equipment covered by those rules, Articles 3(3)(e) and (f) don’t apply.',
      },
      {
        id: 'RED-SCOPE-F-040',
        version: '0.1.0',
        sources: ['en-18031-citation'],
        reference: `${CITATION}, Annex (EN 18031-2, Notice 3)`,
        when: { all: [inScope, { q: 'special_category', includes: ['childcare', 'toy'] }, processesData, { not: efDerogation }] },
        uncertainty: 'EN 18031-2 is cited with a restriction for toy and childcare radio equipment: it doesn’t give a presumption of conformity if parental or guardian access control isn’t ensured.',
        steps: ['confirm-requirements'],
      },
      {
        id: 'RED-SCOPE-F-050',
        version: '0.1.0',
        sources: ['en-18031-citation', 'red'],
        reference: `${CITATION}, Annex; ${RED}, Art. 17(3)–(4)`,
        when: inScope,
        reason: 'EN 18031-1, -2 and -3 give a presumption of conformity for the requirements they cover, subject to restrictions published with their citation — for example, none applies where users can choose not to set or use any password.',
        steps: ['confirm-requirements'],
      },
      {
        id: 'RED-SCOPE-F-055',
        version: '0.1.0',
        sources: ['red'],
        reference: `${RED}, Art. 10(1), (3)–(4)`,
        when: { all: [inScope, isManufacturer] },
        services: [
          { id: 'red-gap-analysis', why: 'Shows which requirements and restrictions affect the product before formal testing.' },
          { id: 'red-testing', why: 'Produces the test evidence for the requirements that apply.' },
          { id: 'red-technical-file', why: 'Brings the risk assessment and test reports into the technical documentation.' },
        ],
        steps: ['gap-analysis', 'test-evidence', 'technical-file'],
      },
      {
        id: 'RED-SCOPE-F-060',
        version: '0.1.0',
        sources: ['red'],
        reference: `${RED}, Art. 12(2); Art. 14`,
        when: { all: [inScope, { q: 'eu_role', is: 'importer' }] },
        reason: 'As an importer, before placing the product on the market you must make sure the manufacturer has carried out the conformity assessment, drawn up the technical documentation and affixed the CE marking.',
        uncertainty: 'If you place the product on the market under your own name or trademark, or modify it in a way that may affect compliance, you take on the manufacturer’s obligations.',
        services: [{ id: 'expert-call', why: 'Agree what evidence to request from the manufacturer.' }],
        steps: ['request-evidence'],
      },
      {
        id: 'RED-SCOPE-F-065',
        version: '0.1.0',
        sources: ['red'],
        reference: `${RED}, Art. 13(1)–(2); Art. 14`,
        when: { all: [inScope, { q: 'eu_role', is: 'distributor' }] },
        reason: 'As a distributor, you must act with due care — including verifying the CE marking and required documents before making the product available.',
        uncertainty: 'If you place the product on the market under your own name or trademark, or modify it in a way that may affect compliance, you take on the manufacturer’s obligations.',
        services: [{ id: 'expert-call', why: 'Agree what evidence to request from the manufacturer or importer.' }],
        steps: ['request-evidence'],
      },
      {
        id: 'RED-SCOPE-F-070',
        version: '0.1.0',
        sources: ['red-da', 'red-da-repeal'],
        reference: `${DA}, Art. 3; ${REPEAL}, Art. 1`,
        when: { all: [inScope, { q: 'market_timing', is: 'before_2027' }] },
        reason: 'You told us the product will be placed on the market before 11 December 2027, while the RED cybersecurity requirements apply (from 1 August 2025 until their repeal on 11 December 2027).',
      },
      {
        id: 'RED-SCOPE-F-075',
        version: '0.1.0',
        sources: ['red-da-repeal', 'cra'],
        reference: `${REPEAL}, Art. 1; Regulation (EU) 2024/2847, Art. 71(2)`,
        when: { all: [inScope, { q: 'market_timing', is: 'spans' }] },
        reason: 'You told us supply will continue after 11 December 2027. The RED cybersecurity delegated regulation is repealed from that date, when the Cyber Resilience Act applies in full.',
        uncertainty: 'Confirm how the transition applies to products you continue to place on the market after 10 December 2027.',
        steps: ['check-cra'],
        tools: ['cra-scope'],
      },
      {
        id: 'RED-SCOPE-F-080',
        version: '0.1.0',
        sources: ['cra', 'ec-cra-reporting'],
        reference: 'Regulation (EU) 2024/2847, Art. 2(1); Art. 14; Art. 71(2)',
        when: inScope,
        reason: 'Radio products that connect to devices or networks may also be products with digital elements under the Cyber Resilience Act, whose reporting obligations have applied since 11 September 2026.',
        steps: ['check-cra'],
        tools: ['cra-scope'],
      },
      {
        id: 'RED-SCOPE-F-090',
        version: '0.1.0',
        sources: ['red'],
        reference: `${RED}, Art. 3`,
        when: { all: [{ outcome: 'outside-checked-scope' }, { not: stopEarly }] },
        steps: ['other-red-requirements'],
      },
    ],
  },
};
