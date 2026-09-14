/**
 * Validation and email rendering for /api/quote.
 *
 * Two kinds of submission share the endpoint and the existing Resend
 * delivery: the direct quote form, and the optional follow-up after a guided
 * tool result (which carries the visitor's answers and result summary).
 */

import { TOOLS_BY_ID } from './tools/registry.ts';
import type { ToolId } from './tools/types.ts';

export const SERVICE_LABELS: Record<string, string> = {
  'en-18031': 'RED cybersecurity testing (EN 18031)',
  cra: 'CRA readiness & technical documentation',
  continuum: 'Vigilon Continuum',
  etsi: 'ETSI EN 303 645 IoT Security',
  pentest: 'Penetration Testing',
  risk: 'Risk Assessment & Threat Modelling',
  'vuln-scan': 'Vulnerability Scanning',
  multiple: 'Multiple Services / Bundle',
  'not-sure': 'Not Sure — Need Guidance',
};

const COMPLIANCE_LABELS: Record<string, string> = {
  'self-declaration': 'Self-declaration (Module A)',
  'notified-body': 'Notified Body assessment (Module B+C)',
  'not-sure': 'Not sure — need guidance',
};

const TIMELINE_LABELS: Record<string, string> = {
  urgent: 'Urgent — within 4 weeks',
  standard: 'Standard — 1–3 months',
  planning: 'Planning — 3–6 months',
  future: 'Future — 6+ months',
};

const LIMITS = { short: 200, email: 320, long: 5000, summary: 20000 };

export interface QuoteInquiry {
  kind: 'quote';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  service: string;
  productDescription: string;
  compliancePath: string;
  timeline: string;
  additionalInfo: string;
}

export interface GuidedInquiry {
  kind: 'guided';
  name: string;
  email: string;
  company: string;
  message: string;
  toolId: ToolId;
  summary: string;
}

export type Inquiry = QuoteInquiry | GuidedInquiry;

export type ParseResult =
  | { ok: true; bot: true }
  | { ok: true; bot: false; inquiry: Inquiry }
  | { ok: false; error: string };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tooLong(values: Array<[string, number]>): boolean {
  return values.some(([value, max]) => value.length > max);
}

export function parseInquiry(form: FormData): ParseResult {
  // Honeypot fields: discard silently so bots don't adapt.
  if (field(form, 'website') || field(form, 'fax')) return { ok: true, bot: true };

  if (field(form, 'inquiryType') === 'guided') {
    const name = field(form, 'name');
    const email = field(form, 'email');
    const company = field(form, 'company');
    const message = field(form, 'message');
    const toolId = field(form, 'toolId');
    const summary = field(form, 'assessmentSummary');

    if (!name || !email || !company || !summary || !(toolId in TOOLS_BY_ID)) {
      return { ok: false, error: 'Missing required fields' };
    }
    if (!EMAIL.test(email)) return { ok: false, error: 'Invalid email address' };
    if (
      tooLong([
        [name, LIMITS.short],
        [company, LIMITS.short],
        [email, LIMITS.email],
        [message, LIMITS.long],
        [summary, LIMITS.summary],
      ])
    ) {
      return { ok: false, error: 'A field is too long' };
    }
    return { ok: true, bot: false, inquiry: { kind: 'guided', name, email, company, message, toolId: toolId as ToolId, summary } };
  }

  const inquiry: QuoteInquiry = {
    kind: 'quote',
    firstName: field(form, 'firstName'),
    lastName: field(form, 'lastName'),
    email: field(form, 'email'),
    phone: field(form, 'phone'),
    company: field(form, 'company'),
    jobTitle: field(form, 'jobTitle'),
    service: field(form, 'service'),
    productDescription: field(form, 'productDescription'),
    compliancePath: field(form, 'compliancePath'),
    timeline: field(form, 'timeline'),
    additionalInfo: field(form, 'additionalInfo'),
  };

  if (!inquiry.firstName || !inquiry.lastName || !inquiry.email || !inquiry.company || !inquiry.service || !inquiry.productDescription) {
    return { ok: false, error: 'Missing required fields' };
  }
  if (!EMAIL.test(inquiry.email)) return { ok: false, error: 'Invalid email address' };
  if (
    tooLong([
      [inquiry.firstName, LIMITS.short],
      [inquiry.lastName, LIMITS.short],
      [inquiry.company, LIMITS.short],
      [inquiry.jobTitle, LIMITS.short],
      [inquiry.phone, LIMITS.short],
      [inquiry.email, LIMITS.email],
      [inquiry.productDescription, LIMITS.long],
      [inquiry.additionalInfo, LIMITS.long],
    ])
  ) {
    return { ok: false, error: 'A field is too long' };
  }
  return { ok: true, bot: false, inquiry };
}

const label = 'padding:6px 0;color:#555;width:160px;';
const cell = 'padding:6px 0;';
const heading = 'font-size:1rem;color:#555;text-transform:uppercase;letter-spacing:.05em;margin:0 0 16px;';
const block = 'background:#f8f9fa;border-left:4px solid #2563eb;padding:16px;border-radius:0 4px 4px 0;margin-bottom:28px;white-space:pre-wrap;';

function row(name: string, value: string, strong = false): string {
  if (!value) return '';
  return `<tr><td style="${label}">${escapeHtml(name)}</td><td style="${cell}${strong ? 'font-weight:600;' : ''}">${escapeHtml(value)}</td></tr>`;
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${escapeHtml(title)}</title></head>
<body style="font-family:Arial,sans-serif;color:#1a1a2e;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#0a1628;padding:28px 32px;">
      <h1 style="color:#ffffff;margin:0;font-size:1.4rem;">${escapeHtml(title)}</h1>
    </div>
    <div style="padding:32px;">${body}</div>
  </div>
</body>
</html>`;
}

/** Strips line breaks so user input can't add lines to the subject header. */
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ');
}

export function renderInquiryEmail(inquiry: Inquiry): { subject: string; html: string; replyTo: string } {
  if (inquiry.kind === 'guided') {
    const toolName = TOOLS_BY_ID[inquiry.toolId].name;
    const html = layout(
      'New guided inquiry — Vigilon Cyber',
      `<h2 style="${heading}">Contact Details</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
        ${row('Name', inquiry.name, true)}
        <tr><td style="${label}">Email</td><td style="${cell}"><a href="mailto:${escapeHtml(inquiry.email)}" style="color:#2563eb;">${escapeHtml(inquiry.email)}</a></td></tr>
        ${row('Company', inquiry.company, true)}
        ${row('Started from', toolName)}
      </table>
      ${inquiry.message ? `<h2 style="${heading}">Message</h2><div style="${block}">${escapeHtml(inquiry.message)}</div>` : ''}
      <h2 style="${heading}">Answers and result (generated by the visitor’s browser)</h2>
      <div style="${block}font-family:Consolas,monospace;font-size:13px;">${escapeHtml(inquiry.summary)}</div>
      <p style="margin:0;font-size:0.85rem;color:#888;">Submitted via vigiloncyber.com · Reply to this email to respond directly to ${escapeHtml(inquiry.name)}.</p>`,
    );
    return {
      subject: oneLine(`Guided inquiry: ${toolName} — ${inquiry.name} (${inquiry.company})`),
      html,
      replyTo: inquiry.email,
    };
  }

  const serviceLabel = SERVICE_LABELS[inquiry.service] ?? inquiry.service;
  const html = layout(
    'New Quote Request — Vigilon Cyber',
    `<h2 style="${heading}">Contact Details</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
      ${row('Name', `${inquiry.firstName} ${inquiry.lastName}`, true)}
      <tr><td style="${label}">Email</td><td style="${cell}"><a href="mailto:${escapeHtml(inquiry.email)}" style="color:#2563eb;">${escapeHtml(inquiry.email)}</a></td></tr>
      ${row('Phone', inquiry.phone)}
      ${row('Company', inquiry.company, true)}
      ${row('Job Title', inquiry.jobTitle)}
    </table>
    <h2 style="${heading}">Engagement Details</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
      ${row('Service', serviceLabel, true)}
      ${row('Compliance Path', COMPLIANCE_LABELS[inquiry.compliancePath] ?? (inquiry.compliancePath || 'Not specified'))}
      ${row('Timeline', TIMELINE_LABELS[inquiry.timeline] ?? (inquiry.timeline || 'Not specified'))}
    </table>
    <h2 style="${heading}">Product Description</h2>
    <div style="${block}">${escapeHtml(inquiry.productDescription)}</div>
    ${inquiry.additionalInfo ? `<h2 style="${heading}">Additional Information</h2><div style="${block}border-left-color:#64748b;">${escapeHtml(inquiry.additionalInfo)}</div>` : ''}
    <p style="margin:0;font-size:0.85rem;color:#888;">Submitted via vigiloncyber.com · Reply to this email to respond directly to ${escapeHtml(inquiry.firstName)}.</p>`,
  );
  return {
    subject: oneLine(`Quote Request: ${serviceLabel} — ${inquiry.firstName} ${inquiry.lastName} (${inquiry.company})`),
    html,
    replyTo: inquiry.email,
  };
}
