/**
 * CRA reporting readiness check.
 *
 * Asks about process, never about actual vulnerabilities or incidents.
 *
 * LOCAL FIXTURE: not yet reviewed by a qualified reviewer. Vigilon Continuum
 * is recommended only by its confirmed broad description; do not add feature
 * claims until they are verified.
 */

import { QUESTIONS } from './questions.ts';
import { SOURCES_CHECKED_AT } from './sources.ts';
import type { Predicate, ToolDefinition } from './types.ts';

const plan: Predicate = { outcome: 'action-plan' };
const CRA = 'Regulation (EU) 2024/2847';

export const reportingReadiness: ToolDefinition = {
  id: 'reporting-readiness',
  slug: 'cra-reporting-readiness',
  name: 'CRA reporting readiness check',
  shortName: 'Reporting readiness',
  summary: 'Find gaps in how you would handle vulnerability and incident reporting under the Cyber Resilience Act (CRA).',
  scopeNote:
    'This check looks at your reporting process for one product or product family. It does not collect vulnerability or incident details, it is not a submission to any authority, and Vigilon is not connected to the EU Single Reporting Platform through this tool. It is preliminary guidance, not a legal determination.',
  stages: [
    { id: 'role', label: 'Role' },
    { id: 'process', label: 'Process' },
    { id: 'result', label: 'Result' },
  ],
  path: [
    { question: QUESTIONS.eu_role, stage: 'role' },
    ...['intake', 'triage', 'escalation', 'notification_prep', 'user_comms', 'records'].map((id) => ({
      question: QUESTIONS[id],
      stage: 'process',
      showIf: { not: { q: 'eu_role', is: ['not_eu', 'importer', 'distributor'] } } as Predicate,
    })),
  ],
  positions: {
    'action-plan': {
      label: 'Action plan',
      headline: 'Your reporting readiness plan',
      summary: 'Based on your answers, here are the gaps to close first and what you already have in place. It doesn’t replace testing your process with a realistic exercise.',
    },
    'needs-review': {
      label: 'Needs review',
      headline: 'Your reporting duties need a closer look',
      summary: 'Your answers suggest different or uncertain reporting obligations.',
    },
    'outside-checked-scope': {
      label: 'Likely outside the checked scope',
      headline: 'CRA reporting is likely not to apply, based on your answers',
      summary: 'This reflects the CRA reporting checks in this tool only.',
    },
  },
  obligations: [
    {
      id: 'exploited-vulnerabilities',
      title: 'Actively exploited vulnerabilities',
      detail: 'Early warning within 24 hours of becoming aware; vulnerability notification within 72 hours; final report no later than 14 days after a corrective or mitigating measure is available.',
      reference: `${CRA}, Art. 14(1)–(2)`,
    },
    {
      id: 'severe-incidents',
      title: 'Severe incidents affecting the product’s security',
      detail: 'Early warning within 24 hours of becoming aware; incident notification within 72 hours; final report within one month of the incident notification.',
      reference: `${CRA}, Art. 14(3)–(5)`,
    },
    {
      id: 'submission-route',
      title: 'Submission route',
      detail: 'Submit through the EU Single Reporting Platform, using the endpoint of the CSIRT designated as coordinator in the Member State of your main EU establishment. Notifications are accessible to ENISA at the same time.',
      reference: `${CRA}, Art. 14(7); Art. 16`,
    },
    {
      id: 'inform-users',
      title: 'Informing users',
      detail: 'Inform impacted users — and, where appropriate, all users — about the vulnerability or incident and any mitigation or corrective measures they can take.',
      reference: `${CRA}, Art. 14(8)`,
    },
  ],
  steps: [
    {
      id: 'confirm-scope',
      title: 'Confirm CRA scope and your role',
      detail: 'Reporting obligations depend on the product being in scope and on who its manufacturer is.',
      owner: 'you',
    },
    {
      id: 'inform-manufacturer',
      title: 'Agree how you will pass vulnerability information to the manufacturer',
      detail: 'Set up a contact and a way to tell the manufacturer, without undue delay, about vulnerabilities you become aware of.',
      owner: 'you',
    },
    {
      id: 'intake',
      title: 'Publish a monitored security contact and disclosure policy',
      detail: 'Give researchers and users a clear route to report vulnerabilities, and make sure someone watches it.',
      owner: 'you',
    },
    {
      id: 'triage',
      title: 'Define how reports are assessed and escalated',
      detail: 'Name owners, set severity criteria, and describe how you recognise active exploitation or a severe incident.',
      owner: 'vigilon',
      dependsOn: ['intake'],
    },
    {
      id: 'escalation',
      title: 'Name decision-makers and 24-hour cover',
      detail: 'Make sure someone with authority can decide to notify within 24 hours, including outside business hours and during absences.',
      owner: 'you',
      dependsOn: ['triage'],
    },
    {
      id: 'notification',
      title: 'Prepare notification content, route and approvals',
      detail: 'Map the information each stage needs, identify your reporting CSIRT, and agree who approves each submission.',
      owner: 'vigilon',
      dependsOn: ['escalation'],
    },
    {
      id: 'user-comms',
      title: 'Prepare how you will inform affected users',
      detail: 'Decide the channels and message owners for telling users about a vulnerability or incident and the measures they can take.',
      owner: 'you',
      dependsOn: ['triage'],
    },
    {
      id: 'records',
      title: 'Keep one record of reports, decisions and notifications',
      detail: 'Track each case from receipt to final report so deadlines and follow-up are visible.',
      owner: 'you',
      dependsOn: ['triage'],
    },
    {
      id: 'exercise',
      title: 'Test the process with a realistic exercise',
      detail: 'Walk through a simulated case against the 24-hour, 72-hour and final-report deadlines, and fix what slows you down.',
      owner: 'you',
      dependsOn: ['escalation', 'notification', 'user-comms', 'records'],
    },
    {
      id: 'ongoing',
      title: 'Keep the process running for every product in scope',
      detail: 'Reporting obligations apply to in-scope products already on the market as well as new ones.',
      owner: 'ongoing',
    },
  ],
  actions: {
    'action-plan': { kind: 'contact', label: 'Discuss my reporting process' },
    'needs-review': { kind: 'contact', label: 'Discuss my reporting duties' },
    'outside-checked-scope': { kind: 'contact', label: 'Talk to an expert' },
  },
  defaultAction: { kind: 'contact', label: 'Talk to an expert' },
  rules: {
    id: 'reporting-readiness',
    version: '0.1.0',
    status: 'reviewed',
    sourcesCheckedAt: SOURCES_CHECKED_AT,
    reviewedAt: '2026-09-14',
    reviewedBy: 'Bryce Kowalczyk',
    positionRules: [
      {
        id: 'CRA-REPORTING-010',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Art. 2(1)`,
        when: { q: 'eu_role', is: 'not_eu' },
        outcome: 'outside-checked-scope',
        reason: 'You told us the product won’t be supplied in the EU. CRA reporting obligations concern products made available on the EU market.',
      },
      {
        id: 'CRA-REPORTING-020',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Art. 14; Art. 19(5); Art. 20(4); Art. 21`,
        when: { q: 'eu_role', is: ['importer', 'distributor'] },
        outcome: 'needs-review',
        reason: 'You told us {{eu_role}}. The Article 14 reporting obligations fall on manufacturers. Importers and distributors must tell the manufacturer about vulnerabilities without undue delay, and inform market surveillance authorities where the product presents a significant cybersecurity risk.',
        uncertainty: 'If you place the product on the market under your own name or trademark, or substantially modify it, you are treated as its manufacturer and Article 14 applies to you.',
        steps: ['inform-manufacturer', 'confirm-scope'],
        services: [{ id: 'expert-call', why: 'Clarify your obligations and what to agree with the manufacturer.' }],
      },
      {
        id: 'CRA-REPORTING-030',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Art. 14; Art. 21`,
        when: { q: 'eu_role', is: 'unsure' },
        outcome: 'needs-review',
        reason: 'You weren’t sure of your role. Article 14 reporting obligations fall on the manufacturer, so your role decides whether they apply to you.',
        steps: ['confirm-scope'],
        services: [{ id: 'expert-call', why: 'Work out who carries the manufacturer’s obligations.' }],
      },
      {
        id: 'CRA-REPORTING-100',
        version: '0.1.0',
        sources: ['cra', 'ec-cra-reporting'],
        reference: `${CRA}, Art. 14; Art. 69(3); Art. 71(2)`,
        effectiveFrom: '2026-09-11',
        when: { always: true },
        outcome: 'action-plan',
        reason: 'Reporting obligations for manufacturers have applied since 11 September 2026, including for in-scope products placed on the market before 11 December 2027.',
        obligations: ['exploited-vulnerabilities', 'severe-incidents', 'submission-route', 'inform-users'],
        steps: ['exercise', 'ongoing'],
      },
    ],
    findingRules: [
      {
        id: 'CRA-REPORTING-F-010',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Art. 2`,
        when: { all: [plan, { q: 'product_kind', answered: false }] },
        uncertainty: 'This plan assumes the CRA applies to the product. You haven’t run the CRA scope check in this session.',
        steps: ['confirm-scope'],
        tools: ['cra-scope'],
      },
      {
        id: 'CRA-REPORTING-F-020',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Art. 13(17); Annex I, Part II(5)–(6)`,
        when: { all: [plan, { q: 'intake', is: ['general', 'none', 'unsure'] }] },
        reason: 'You told us outside reporters have {{intake}}. Manufacturers need a coordinated vulnerability disclosure (CVD) policy, a contact address for vulnerability reports and a single point of contact for users.',
        services: [{ id: 'continuum', why: 'Designs a CVD policy and intake process.' }],
        steps: ['intake'],
      },
      {
        id: 'CRA-REPORTING-F-025',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Annex I, Part II(5)–(6)`,
        when: { all: [plan, { q: 'intake', is: 'published' }] },
        covered: 'A published, monitored security contact or disclosure policy.',
      },
      {
        id: 'CRA-REPORTING-F-030',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Art. 3(42); Art. 14(1), (3), (5)`,
        when: { all: [plan, { q: 'triage', is: ['ad_hoc', 'none', 'unsure'] }] },
        reason: 'Deadlines run from when you become aware of an actively exploited vulnerability or severe incident, so you need a consistent way to recognize one.',
        services: [{ id: 'continuum', why: 'Recognizes direct and downstream exploits and severe incidents with defined criteria for when reporting is required, and manages the associated workflows.' }],
        steps: ['triage'],
      },
      {
        id: 'CRA-REPORTING-F-035',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Art. 14`,
        when: { all: [plan, { q: 'triage', is: 'documented' }] },
        covered: 'A documented assessment and escalation process with named owners.',
      },
      {
        id: 'CRA-REPORTING-F-040',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Art. 14(2)(a); Art. 14(4)(a)`,
        when: { all: [plan, { q: 'escalation', is: ['business_hours', 'none', 'unsure'] }] },
        reason: 'An early warning is due within 24 hours of becoming aware, whether or not that falls within business hours. You told us: {{escalation}}.',
        steps: ['escalation'],
      },
      {
        id: 'CRA-REPORTING-F-045',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Art. 14(2)(a)`,
        when: { all: [plan, { q: 'escalation', is: 'covered' }] },
        covered: 'Named decision-makers who can act within 24 hours, with cover for absences.',
      },
      {
        id: 'CRA-REPORTING-F-050',
        version: '0.1.0',
        sources: ['cra', 'ec-cra-reporting'],
        reference: `${CRA}, Art. 14(2), (4), (7); Art. 16`,
        when: { all: [plan, { q: 'notification_prep', is: ['partial', 'none', 'unsure'] }] },
        reason: 'Each notification stage has required content — for example general information about the product, the nature of the exploit or incident, and corrective or mitigating measures — and the route depends on your main EU establishment.',
        services: [
          {
            id: 'continuum',
            why: 'Generates/reconciles SBOMs, runs vulnerability assessments, prepares notification reports, and manages routing and approvals. SBOMs are continuously monitored against exploit databases through the support period and reports are automatically generated for directly reported incidents and exploits, or relevant dependency CVEs. Notifications are submitted through the EU Single Reporting Platform after client approval with escalation exceptions to meet the 24-hour deadline.',
          },
        ],
        steps: ['notification'],
      },
      {
        id: 'CRA-REPORTING-F-055',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Art. 14(7)`,
        when: { all: [plan, { q: 'notification_prep', is: 'defined' }] },
        covered: 'A defined notification route, content and approvers.',
      },
      {
        id: 'CRA-REPORTING-F-060',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Art. 14(8)`,
        when: { all: [plan, { q: 'user_comms', is: ['partial', 'none', 'unsure'] }] },
        steps: ['user-comms'],
      },
      {
        id: 'CRA-REPORTING-F-065',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Art. 14(8)`,
        when: { all: [plan, { q: 'user_comms', is: 'ready' }] },
        covered: 'Channels and a process for informing affected users.',
      },
      {
        id: 'CRA-REPORTING-F-070',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Art. 14(2)(c); Art. 14(4)(c)`,
        when: { all: [plan, { q: 'records', is: ['scattered', 'none', 'unsure'] }] },
        reason: 'Final reports fall due after a corrective measure is available or a month after the incident notification, so decisions and follow-up need to stay traceable.',
        services: [
          {
            id: 'continuum',
            why: 'Continuum maintains incident and exploit reports to ensure records are complete and accurate. As a centralized platform for tracking decisions, notifications, and follow-up actions related to incidents, final corrective action reports can be generated and submitted automatically once all necessary information is available.',
          },
        ],
        steps: ['records'],
      },
      {
        id: 'CRA-REPORTING-F-075',
        version: '0.1.0',
        sources: ['cra'],
        reference: `${CRA}, Art. 14`,
        when: { all: [plan, { q: 'records', is: 'tracked' }] },
        covered: 'A tracked record of reports, decisions, notifications and follow-up.',
      },
    ],
  },
};
