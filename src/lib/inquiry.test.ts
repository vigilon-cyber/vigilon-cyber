import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { escapeHtml, parseInquiry, renderInquiryEmail } from './inquiry.ts';

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const quote = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  company: 'Engines Ltd',
  service: 'cra',
  productDescription: 'Connected thermostat <b>v2</b>',
};

const guided = {
  inquiryType: 'guided',
  name: 'Grace Hopper',
  email: 'grace@example.com',
  company: 'Compilers Inc',
  toolId: 'cra-scope',
  assessmentSummary: 'RESULT: Likely in scope\n<script>alert(1)</script>',
};

describe('inquiry parsing', () => {
  it('keeps the existing quote form requirements', () => {
    assert.equal(parseInquiry(form(quote)).ok, true);
    const missing = parseInquiry(form({ ...quote, productDescription: '' }));
    assert.deepEqual(missing, { ok: false, error: 'Missing required fields' });
    assert.deepEqual(parseInquiry(form({ ...quote, email: 'nope' })), { ok: false, error: 'Invalid email address' });
  });

  it('accepts a guided follow-up with name, email, company and the result summary', () => {
    const parsed = parseInquiry(form(guided));
    assert.ok(parsed.ok && !parsed.bot);
    assert.equal(parsed.inquiry.kind, 'guided');
    assert.deepEqual(parseInquiry(form({ ...guided, toolId: 'unknown' })), { ok: false, error: 'Missing required fields' });
    assert.deepEqual(parseInquiry(form({ ...guided, assessmentSummary: '' })), { ok: false, error: 'Missing required fields' });
    assert.deepEqual(parseInquiry(form({ ...guided, message: 'x'.repeat(5001) })), { ok: false, error: 'A field is too long' });
  });

  it('flags honeypot submissions as bots', () => {
    assert.deepEqual(parseInquiry(form({ ...guided, website: 'spam' })), { ok: true, bot: true });
    assert.deepEqual(parseInquiry(form({ ...quote, fax: '123' })), { ok: true, bot: true });
  });
});

describe('inquiry email', () => {
  it('escapes visitor input', () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    const parsed = parseInquiry(form(guided));
    assert.ok(parsed.ok && !parsed.bot);
    const email = renderInquiryEmail(parsed.inquiry);
    assert.doesNotMatch(email.html, /<script>/);
    assert.match(email.html, /&lt;script&gt;/);
    assert.equal(email.subject, 'Guided inquiry: CRA scope check — Grace Hopper (Compilers Inc)');
    assert.equal(email.replyTo, 'grace@example.com');
  });

  it('renders the direct quote email with the service label', () => {
    const parsed = parseInquiry(form({ ...quote, company: 'Engines\r\nBcc: x@example.com' }));
    assert.ok(parsed.ok && !parsed.bot);
    const email = renderInquiryEmail(parsed.inquiry);
    assert.match(email.html, /CRA readiness &amp; technical documentation/);
    assert.match(email.html, /&lt;b&gt;v2&lt;\/b&gt;/);
    assert.doesNotMatch(email.subject, /[\r\n]/);
  });
});
