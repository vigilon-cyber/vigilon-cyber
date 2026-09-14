/**
 * Plain-text rendering of a result, used for the download, the print
 * header and the optional follow-up inquiry.
 */

import { answerLabels, visiblePath } from './engine.ts';
import { SERVICES } from './services.ts';
import { SOURCES } from './sources.ts';
import type { Answers, StepOwner, ToolDefinition, ToolResult } from './types.ts';

export const OWNER_LABELS: Record<StepOwner, string> = {
  you: 'Your team',
  vigilon: 'Vigilon can help',
  ongoing: 'Ongoing',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Formats an ISO date (YYYY-MM-DD) without depending on the runtime locale. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export interface AnswerRow {
  questionId: string;
  label: string;
  value: string;
}

export function answerRows(tool: ToolDefinition, answers: Answers): AnswerRow[] {
  return visiblePath(tool, answers)
    .filter((entry) => answers[entry.question.id] !== undefined)
    .map((entry) => ({
      questionId: entry.question.id,
      label: entry.question.summaryLabel,
      value: answerLabels(entry.question, answers[entry.question.id]).join('; '),
    }));
}

export function reviewStatus(result: ToolResult): string {
  const { status, reviewedAt, reviewedBy } = result.ruleSet;
  if (status === 'reviewed' && reviewedAt && reviewedBy) return `Reviewed by ${reviewedBy} on ${formatDate(reviewedAt)}`;
  return 'Local fixture — these rules have not been reviewed by a qualified reviewer';
}

export function formatResultText(
  tool: ToolDefinition,
  answers: Answers,
  result: ToolResult,
  generatedAt: Date = new Date(),
): string {
  const lines: string[] = [];
  const section = (title: string, items: string[]) => {
    if (items.length === 0) return;
    lines.push('', title.toUpperCase(), ...items);
  };

  lines.push(
    `Vigilon Cyber — ${tool.name}`,
    `Generated ${formatDate(generatedAt.toISOString())}`,
    'Preliminary guidance only. Not a legal determination or certification.',
  );
  if (result.ruleSet.status !== 'reviewed') {
    lines.push('LOCAL FIXTURE: not reviewed regulatory guidance.');
  }

  lines.push('', `RESULT: ${result.position.label}`, result.position.headline, result.position.summary);
  section('Why', result.reasons.map((item) => `- ${item.text}${item.reference ? ` (${item.reference})` : ''}`));
  section('Open questions', result.uncertainties.map((item) => `- ${item.text}`));
  section('Obligations to plan for', result.obligations.map((item) => `- ${item.title}: ${item.detail} (${item.reference})`));
  section(
    'Next steps',
    result.steps.map((step, index) => {
      const after = step.dependsOnTitles.length ? ` After: ${step.dependsOnTitles.join('; ')}.` : '';
      return `${index + 1}. ${step.title} [${OWNER_LABELS[step.owner]}] — ${step.detail}${after}`;
    }),
  );
  section('Already in place', result.covered.map((item) => `- ${item}`));
  section('Relevant support', result.services.map((item) => `- ${SERVICES[item.id].name}: ${item.why}`));
  section('Your answers', answerRows(tool, answers).map((row) => `- ${row.label}: ${row.value}`));
  section('Sources', [
    `Sources checked ${formatDate(result.ruleSet.sourcesCheckedAt)}. Rule set ${result.ruleSet.id} v${result.ruleSet.version}. ${reviewStatus(result)}.`,
    ...result.sources.map((id) => `- ${SOURCES[id].title}: ${SOURCES[id].url}`),
  ]);
  section('What this check does not cover', [result.scopeNote]);

  return lines.join('\n');
}
