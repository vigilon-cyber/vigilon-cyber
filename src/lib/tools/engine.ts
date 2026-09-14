/**
 * Pure question-flow and rule engine shared by every guided tool.
 *
 * Nothing here touches the DOM, storage or `import.meta.env`, so the same
 * code runs in the browser and in `node --test`.
 */

import { QUESTIONS } from './questions.ts';
import { SOURCE_ORDER } from './sources.ts';
import type { SourceId } from './sources.ts';
import type {
  Answers,
  AnswerValue,
  Outcome,
  PathEntry,
  Predicate,
  Question,
  ResultItem,
  ResultStep,
  Rule,
  StepTemplate,
  ToolDefinition,
  ToolResult,
} from './types.ts';

export const RESULT_STEP = 'result';
export const CONTACT_STEP = 'contact';

export function asList(value: AnswerValue | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function evaluate(predicate: Predicate, answers: Answers, outcome?: Outcome): boolean {
  if ('always' in predicate) return true;
  if ('all' in predicate) return predicate.all.every((p) => evaluate(p, answers, outcome));
  if ('any' in predicate) return predicate.any.some((p) => evaluate(p, answers, outcome));
  if ('not' in predicate) return !evaluate(predicate.not, answers, outcome);
  if ('outcome' in predicate) return outcome !== undefined && asList(predicate.outcome).includes(outcome);

  const value = answers[predicate.q];
  if ('answered' in predicate) return asList(value).length > 0 === predicate.answered;
  if ('is' in predicate) return typeof value === 'string' && asList(predicate.is).includes(value);
  const wanted = asList(predicate.includes);
  return asList(value).some((v) => wanted.includes(v));
}

export function isValidAnswer(question: Question, value: AnswerValue | undefined): boolean {
  if (value === undefined) return false;
  const ids = new Set(question.options.map((option) => option.id));
  if (question.kind === 'single') return typeof value === 'string' && ids.has(value);
  if (!Array.isArray(value) || value.length === 0 || !value.every((v) => ids.has(v))) return false;
  if (new Set(value).size !== value.length) return false;
  const exclusive = question.options.filter((option) => option.exclusive).map((option) => option.id);
  return value.length === 1 || !value.some((v) => exclusive.includes(v));
}

export function visiblePath(tool: ToolDefinition, answers: Answers): PathEntry[] {
  return tool.path.filter((entry) => !entry.showIf || evaluate(entry.showIf, answers));
}

function isAnswered(entry: PathEntry, answers: Answers): boolean {
  return isValidAnswer(entry.question, answers[entry.question.id]);
}

export function firstUnanswered(tool: ToolDefinition, answers: Answers): PathEntry | undefined {
  return visiblePath(tool, answers).find((entry) => !isAnswered(entry, answers));
}

export function isComplete(tool: ToolDefinition, answers: Answers): boolean {
  return firstUnanswered(tool, answers) === undefined;
}

/**
 * Removes answers that no longer apply anywhere.
 *
 * Answers are shared between tools, so an answer is kept while at least one
 * tool still asks that question given the other answers. Removing one answer
 * can hide further questions, so this repeats until nothing changes.
 */
export function pruneAnswers(
  tools: readonly ToolDefinition[],
  answers: Answers,
): { answers: Answers; removed: string[] } {
  const current: Answers = { ...answers };
  const removed: string[] = [];
  for (;;) {
    const keep = new Set<string>();
    for (const tool of tools) {
      for (const entry of visiblePath(tool, current)) {
        if (isAnswered(entry, current)) keep.add(entry.question.id);
      }
    }
    const stale = Object.keys(current).filter((id) => !keep.has(id));
    if (stale.length === 0) return { answers: current, removed };
    for (const id of stale) {
      delete current[id];
      removed.push(id);
    }
  }
}

/**
 * Questions this visit steps through. Answers reused from another tool are
 * skipped unless the visitor has opened that question in this tool.
 */
export function stepPath(tool: ToolDefinition, answers: Answers, visited: ReadonlySet<string>): PathEntry[] {
  return visiblePath(tool, answers).filter(
    (entry) => !isAnswered(entry, answers) || visited.has(entry.question.id),
  );
}

/** Returns the step to show for a requested step id, redirecting when it is not reachable yet. */
export function resolveStep(tool: ToolDefinition, answers: Answers, requested: string | null): string {
  const path = visiblePath(tool, answers);
  const firstOpen = path.find((entry) => !isAnswered(entry, answers));
  if (requested === null || requested === RESULT_STEP || requested === CONTACT_STEP) {
    return firstOpen ? firstOpen.question.id : (requested ?? RESULT_STEP);
  }
  const index = path.findIndex((entry) => entry.question.id === requested);
  if (index === -1) return firstOpen ? firstOpen.question.id : RESULT_STEP;
  const blocked = path.slice(0, index).some((entry) => !isAnswered(entry, answers));
  return blocked && firstOpen ? firstOpen.question.id : requested;
}

export function previousStep(
  tool: ToolDefinition,
  answers: Answers,
  visited: ReadonlySet<string>,
  current: string,
): string | null {
  if (current === CONTACT_STEP) return RESULT_STEP;
  const path = stepPath(tool, answers, visited);
  if (current === RESULT_STEP) return path.at(-1)?.question.id ?? null;
  const index = path.findIndex((entry) => entry.question.id === current);
  return index > 0 ? path[index - 1].question.id : null;
}

/**
 * Step after answering `current`. In review mode (editing from the result)
 * the visitor returns to the result unless the change opened new questions.
 */
export function nextStep(
  tool: ToolDefinition,
  answers: Answers,
  visited: ReadonlySet<string>,
  current: string,
  review = false,
): string {
  const firstOpen = firstUnanswered(tool, answers);
  if (review) return firstOpen?.question.id ?? RESULT_STEP;
  const path = stepPath(tool, answers, new Set([...visited, current]));
  const index = path.findIndex((entry) => entry.question.id === current);
  const next = index === -1 ? undefined : path[index + 1];
  return next?.question.id ?? firstOpen?.question.id ?? RESULT_STEP;
}

export function stageOf(tool: ToolDefinition, step: string): string {
  if (step === RESULT_STEP || step === CONTACT_STEP) return tool.stages.at(-1)?.id ?? step;
  return tool.path.find((entry) => entry.question.id === step)?.stage ?? tool.stages[0].id;
}

export function findQuestion(tool: ToolDefinition, id: string): Question | undefined {
  return tool.path.find((entry) => entry.question.id === id)?.question ?? QUESTIONS[id];
}

export function answerLabels(question: Question, value: AnswerValue | undefined): string[] {
  return asList(value).map((id) => question.options.find((option) => option.id === id)?.label ?? id);
}

function fill(template: string, tool: ToolDefinition, answers: Answers): string {
  return template.replace(/\{\{([a-z0-9_]+)\}\}/g, (_, id: string) => {
    const question = findQuestion(tool, id);
    const labels = question ? answerLabels(question, answers[id]) : [];
    return labels.length ? labels.map((label) => `“${label}”`).join(', ') : 'not answered';
  });
}

function orderSteps(catalog: readonly StepTemplate[], ids: ReadonlySet<string>): ResultStep[] {
  const included = catalog.filter((step) => ids.has(step.id));
  const done = new Set<string>();
  const ordered: ResultStep[] = [];
  while (ordered.length < included.length) {
    const pending = included.filter((step) => !done.has(step.id));
    const ready = pending.find((step) => (step.dependsOn ?? []).every((dep) => !ids.has(dep) || done.has(dep)));
    const pick = ready ?? pending[0];
    done.add(pick.id);
    ordered.push({
      ...pick,
      dependsOnTitles: (pick.dependsOn ?? [])
        .filter((dep) => ids.has(dep))
        .map((dep) => catalog.find((step) => step.id === dep)?.title ?? dep),
    });
  }
  return ordered;
}

export function computeResult(tool: ToolDefinition, answers: Answers): ToolResult {
  const { positionRules, findingRules, ...ruleSet } = tool.rules;
  const position = positionRules.find((rule) => evaluate(rule.when, answers));
  const outcome: Outcome = position?.outcome ?? 'needs-review';
  const fired: Rule[] = [
    ...(position ? [position] : []),
    ...findingRules.filter((rule) => evaluate(rule.when, answers, outcome)),
  ];

  const reasons: ResultItem[] = [];
  const uncertainties: ResultItem[] = [];
  const covered: string[] = [];
  const obligationIds = new Set<string>();
  const stepIds = new Set<string>();
  const services = new Map<string, string>();
  const relatedTools = new Set<ToolResult['relatedTools'][number]>();
  const sources = new Set<SourceId>();

  for (const rule of fired) {
    if (rule.reason) reasons.push({ ruleId: rule.id, text: fill(rule.reason, tool, answers), reference: rule.reference });
    if (rule.uncertainty) {
      uncertainties.push({ ruleId: rule.id, text: fill(rule.uncertainty, tool, answers), reference: rule.reference });
    }
    if (rule.covered) covered.push(fill(rule.covered, tool, answers));
    rule.obligations?.forEach((id) => obligationIds.add(id));
    rule.steps?.forEach((id) => stepIds.add(id));
    rule.services?.forEach((service) => {
      if (!services.has(service.id)) services.set(service.id, service.why);
    });
    rule.tools?.forEach((id) => relatedTools.add(id));
    rule.sources.forEach((id) => sources.add(id));
  }

  for (const entry of visiblePath(tool, answers)) {
    const chosen = asList(answers[entry.question.id]);
    const unsure = entry.question.options.some((option) => option.unsure && chosen.includes(option.id));
    if (unsure) {
      uncertainties.push({
        ruleId: `UNSURE:${entry.question.id}`,
        text: `You weren’t sure: “${entry.question.title}”${entry.question.unsureNote ? ` ${entry.question.unsureNote}` : ''}`,
      });
    }
  }

  relatedTools.delete(tool.id);

  return {
    toolId: tool.id,
    outcome,
    position: tool.positions[outcome] ?? {
      label: 'Needs review',
      headline: 'We can’t give a confident answer from these answers',
      summary: 'Some combinations need a specialist to review the facts.',
    },
    reasons,
    uncertainties,
    obligations: tool.obligations.filter((obligation) => obligationIds.has(obligation.id)),
    steps: orderSteps(tool.steps, stepIds),
    services: [...services].map(([id, why]) => ({ id: id as ToolResult['services'][number]['id'], why })),
    covered,
    relatedTools: [...relatedTools],
    sources: SOURCE_ORDER.filter((id) => sources.has(id)),
    ruleSet,
    firedRuleIds: fired.map((rule) => rule.id),
    action: position?.action ?? tool.actions[outcome] ?? tool.defaultAction,
    scopeNote: tool.scopeNote,
  };
}
