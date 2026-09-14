/**
 * Coarse funnel events for the guided tools, sent through the existing
 * Vercel Analytics integration.
 *
 * Only identifiers (tool, step, action, device class) are sent. Never pass
 * answers, free text, vulnerability information or personal data.
 */

import { track } from '@vercel/analytics';

export type GuidedEvent =
  | 'task_card_viewed'
  | 'tool_started'
  | 'step_viewed'
  | 'not_sure_selected'
  | 'tool_completed'
  | 'answer_changed_after_result'
  | 'result_action_selected'
  | 'inquiry_submitted';

export function trackGuided(event: GuidedEvent, properties: { tool_id: string; step_id?: string; action_id?: string }): void {
  try {
    const device = window.matchMedia('(max-width: 760px)').matches ? 'mobile' : 'desktop';
    track(event, { ...properties, device });
  } catch {
    // Analytics must never break the page.
  }
}

/** Google Ads conversion for a confirmed, non-honeypot inquiry submission. */
export function reportQuoteConversion(): void {
  const { gtag } = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof gtag === 'function') {
    gtag('event', 'conversion', { send_to: 'AW-17513516704/jf6NCOzw-dAcEKCdjJ9B' });
  }
}
