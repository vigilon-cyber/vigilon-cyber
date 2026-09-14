import { craRoadmap } from './cra-roadmap.ts';
import { craScope } from './cra-scope.ts';
import { redScope } from './red-scope.ts';
import { reportingReadiness } from './reporting-readiness.ts';
import type { RuleSet, ToolDefinition, ToolId } from './types.ts';

export const TOOLS: readonly ToolDefinition[] = [redScope, craScope, craRoadmap, reportingReadiness];

export const TOOLS_BY_ID = Object.fromEntries(TOOLS.map((tool) => [tool.id, tool])) as Record<ToolId, ToolDefinition>;

export function toolHref(id: ToolId): string {
  return `/tools/${TOOLS_BY_ID[id].slug}`;
}

/** Homepage task cards, in display order. `fallback` is used while a tool is unavailable. */
export const TOOL_CARDS: Array<{
  toolId: ToolId;
  title: string;
  description: string;
  cta: string;
  fallback: { label: string; href: string };
}> = [
  {
    toolId: 'red-scope',
    title: 'Does RED cybersecurity apply to my product?',
    description: 'Answer a few questions about your radio product and how it connects.',
    cta: 'Check RED scope',
    fallback: { label: 'Explore RED testing', href: '/services/red-cyber-compliance' },
  },
  {
    toolId: 'cra-scope',
    title: 'Does the CRA apply to my product?',
    description: 'Check how your product, market and role affect the likely requirements.',
    cta: 'Check CRA scope',
    fallback: { label: 'Explore CRA support', href: '/services/cyber-resilience-act' },
  },
  {
    toolId: 'cra-roadmap',
    title: 'What should we do first for CRA?',
    description: 'Turn your current readiness into a prioritised action plan.',
    cta: 'Build my CRA roadmap',
    fallback: { label: 'Explore CRA support', href: '/services/cyber-resilience-act' },
  },
  {
    toolId: 'reporting-readiness',
    title: 'How should we handle CRA reporting?',
    description: 'Identify gaps in your vulnerability and incident reporting process.',
    cta: 'Check reporting readiness',
    fallback: { label: 'Explore reporting support', href: '/services/cyber-resilience-act#vulnerability-handling' },
  },
];

/**
 * `live`: reviewed rules. `preview`: unreviewed fixtures, shown with a
 * prominent notice (local development, or a deployment that explicitly sets
 * PUBLIC_GUIDED_TOOLS_PREVIEW=true). `unavailable`: unreviewed rules in a
 * production build — the checker is replaced by direct service routes.
 */
export type ToolMode = 'live' | 'preview' | 'unavailable';

export interface ToolEnv {
  dev: boolean;
  previewFlag?: string;
}

export function toolMode(status: RuleSet['status'], env: ToolEnv): ToolMode {
  if (status === 'reviewed') return 'live';
  if (env.dev || env.previewFlag === 'true') return 'preview';
  return 'unavailable';
}

/** Link to a tool, or to `fallback` while the tool is unavailable. */
export function toolLinkOr(id: ToolId, fallback: string, env: ToolEnv): string {
  return toolMode(TOOLS_BY_ID[id].rules.status, env) === 'unavailable' ? fallback : toolHref(id);
}

/** Task cards with links resolved for the current build. */
export function resolveToolCards(env: ToolEnv) {
  return TOOL_CARDS.map((card) => {
    const mode = toolMode(TOOLS_BY_ID[card.toolId].rules.status, env);
    const available = mode !== 'unavailable';
    return {
      ...card,
      preview: mode === 'preview',
      href: available ? toolHref(card.toolId) : card.fallback.href,
      label: available ? card.cta : card.fallback.label,
    };
  });
}
