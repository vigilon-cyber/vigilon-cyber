/**
 * Shared types for the guided compliance tools.
 *
 * Tools are plain data: questions, a path with declarative visibility
 * predicates, and a versioned rule set. Keeping rules as data (rather than
 * free-form code) lets a reviewer read them, lets tests exercise boundaries,
 * and lets the same engine run in the browser and under `node --test`.
 */

import type { ServiceId } from './services.ts';
import type { SourceId } from './sources.ts';

export type ToolId = 'red-scope' | 'cra-scope' | 'cra-roadmap' | 'reporting-readiness';

export type AnswerValue = string | string[];
export type Answers = Record<string, AnswerValue>;

export interface Option {
  id: string;
  label: string;
  hint?: string;
  /** In a multi-select, choosing this option clears the others. */
  exclusive?: boolean;
  /** Marks an explicit "I'm not sure" answer. */
  unsure?: boolean;
}

export interface Question {
  id: string;
  kind: 'single' | 'multi';
  /** Screen heading, phrased as a question. */
  title: string;
  hint?: string;
  /** Accessible disclosure explaining unfamiliar terms. */
  explainer?: { summary: string; body: string[] };
  /** Only where the relevance of the question is not obvious. */
  whyWeAsk?: string;
  /** What to find out when the visitor answers "I'm not sure". */
  unsureNote?: string;
  /** Short label for the editable answer summary. */
  summaryLabel: string;
  options: Option[];
}

export type Outcome = 'in-scope' | 'outside-checked-scope' | 'needs-review' | 'action-plan';

export type Predicate =
  | { always: true }
  | { all: Predicate[] }
  | { any: Predicate[] }
  | { not: Predicate }
  /** Single-choice answer equals one of the listed option ids. */
  | { q: string; is: string | string[] }
  /** Multi-choice answer contains at least one of the listed option ids. */
  | { q: string; includes: string | string[] }
  | { q: string; answered: boolean }
  /** Only meaningful in finding rules, evaluated after the position is known. */
  | { outcome: Outcome | Outcome[] };

export interface PathEntry {
  question: Question;
  /** Stage id from the tool's stage list. */
  stage: string;
  /** The question is asked only while this predicate holds. */
  showIf?: Predicate;
}

export type StepOwner = 'you' | 'vigilon' | 'ongoing';

export interface StepTemplate {
  id: string;
  title: string;
  detail: string;
  owner: StepOwner;
  dependsOn?: string[];
}

export interface Obligation {
  id: string;
  title: string;
  detail: string;
  reference: string;
}

export interface Rule {
  /** Stable identifier, e.g. CRA-SCOPE-010. */
  id: string;
  version: string;
  sources: SourceId[];
  /** Human-readable legal reference, e.g. "Regulation (EU) 2024/2847, Art. 2(1)". */
  reference: string;
  /** ISO date from which the underlying provision applies, where relevant. */
  effectiveFrom?: string;
  when: Predicate;
  /** Position rules only: the first matching rule decides the outcome. */
  outcome?: Outcome;
  /** Reasoning text. `{{question_id}}` inserts the visitor's answer labels. */
  reason?: string;
  uncertainty?: string;
  obligations?: string[];
  services?: Array<{ id: ServiceId; why: string }>;
  steps?: string[];
  covered?: string;
  tools?: ToolId[];
  /** Position rules only: overrides the tool's default action for this outcome. */
  action?: ResultAction;
}

export interface RuleSet {
  id: string;
  version: string;
  /**
   * `fixture` rules are unreviewed local implementations of the cited
   * sources. They must not be published as a production checker.
   */
  status: 'fixture' | 'reviewed';
  sourcesCheckedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  /** Ordered. The first rule whose predicate matches decides the outcome. */
  positionRules: Rule[];
  /** Every matching rule contributes reasons, steps and support. */
  findingRules: Rule[];
}

export interface PositionCopy {
  label: string;
  headline: string;
  summary: string;
}

export type ResultAction =
  | { kind: 'contact'; label: string }
  | { kind: 'tool'; toolId: ToolId; label: string };

export interface ToolDefinition {
  id: ToolId;
  slug: string;
  name: string;
  /** Used in document titles and compact chrome. */
  shortName: string;
  summary: string;
  /** States what the check does not cover. Shown on every result. */
  scopeNote: string;
  stages: Array<{ id: string; label: string }>;
  path: PathEntry[];
  positions: Partial<Record<Outcome, PositionCopy>>;
  steps: StepTemplate[];
  obligations: Obligation[];
  actions: Partial<Record<Outcome, ResultAction>>;
  defaultAction: ResultAction;
  rules: RuleSet;
}

export interface ResultItem {
  ruleId: string;
  text: string;
  reference?: string;
}

export interface ResultStep extends StepTemplate {
  dependsOnTitles: string[];
}

export interface ToolResult {
  toolId: ToolId;
  outcome: Outcome;
  position: PositionCopy;
  reasons: ResultItem[];
  uncertainties: ResultItem[];
  obligations: Obligation[];
  steps: ResultStep[];
  services: Array<{ id: ServiceId; why: string }>;
  covered: string[];
  relatedTools: ToolId[];
  sources: SourceId[];
  ruleSet: Omit<RuleSet, 'positionRules' | 'findingRules'>;
  firedRuleIds: string[];
  action: ResultAction;
  scopeNote: string;
}
