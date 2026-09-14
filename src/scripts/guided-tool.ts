/**
 * Browser controller for a guided tool page.
 *
 * Each step has a URL (?step=<id>) so browser Back/Forward, refresh and
 * in-tool navigation agree. Answers are never put in the URL; they live in
 * sessionStorage for this tab only (see ../lib/tools/session.ts).
 */

import { reportQuoteConversion, trackGuided } from '../lib/analytics.ts';
import {
  asList,
  computeResult,
  CONTACT_STEP,
  isValidAnswer,
  nextStep,
  previousStep,
  pruneAnswers,
  RESULT_STEP,
  resolveStep,
  stageOf,
  visiblePath,
} from '../lib/tools/engine.ts';
import { TOOLS, TOOLS_BY_ID, toolHref } from '../lib/tools/registry.ts';
import { SERVICES } from '../lib/tools/services.ts';
import { clearSession, emptySession, loadSession, saveSession } from '../lib/tools/session.ts';
import type { GuidedSession, KeyValueStore } from '../lib/tools/session.ts';
import { SOURCES } from '../lib/tools/sources.ts';
import { answerRows, formatDate, formatResultText, OWNER_LABELS, reviewStatus } from '../lib/tools/summary.ts';
import type { AnswerValue, Question, ResultAction, ToolDefinition, ToolId, ToolResult } from '../lib/tools/types.ts';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_EMAIL = 'info@vigiloncyber.com';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value: string): string => value.replace(/[&<>"']/g, (char) => ESCAPES[char]);

interface Draft {
  name: string;
  email: string;
  company: string;
  message: string;
}

interface FieldError {
  id: string;
  message: string;
}

function probeStorage(): KeyValueStore | null {
  try {
    const store = window.sessionStorage;
    store.setItem('vigilon.probe', '1');
    store.removeItem('vigilon.probe');
    return store;
  } catch {
    return null;
  }
}

class GuidedToolController {
  private readonly root: HTMLElement;
  private readonly tool: ToolDefinition;
  private readonly view: HTMLElement;
  private readonly store: KeyValueStore | null;
  private readonly reducedMotion: MediaQueryList;
  private session: GuidedSession;
  private review = false;
  private resumed = false;
  /** Contact details are kept in memory only, never in storage. */
  private draft: Draft = { name: '', email: '', company: '', message: '' };

  constructor(root: HTMLElement, tool: ToolDefinition, view: HTMLElement) {
    this.root = root;
    this.tool = tool;
    this.view = view;
    this.store = probeStorage();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.session = loadSession(this.store);
  }

  start(): void {
    this.session.answers = pruneAnswers(TOOLS, this.session.answers).answers;
    const { step: requested } = this.readUrl();
    this.resumed = requested === null && this.visited().size > 0;
    this.restoreFromUrl(false);
    const help = this.root.querySelector<HTMLElement>('.tool-help');
    if (help) help.hidden = false;

    window.addEventListener('popstate', () => this.restoreFromUrl(true));
    // Returning from another page via the back/forward cache: another tool may have changed shared answers.
    window.addEventListener('pageshow', (event) => {
      if (!event.persisted) return;
      this.session = loadSession(this.store);
      this.session.answers = pruneAnswers(TOOLS, this.session.answers).answers;
      this.restoreFromUrl(false);
    });
    this.view.addEventListener('click', (event) => this.onViewClick(event));
    this.root.querySelector('[data-reset]')?.addEventListener('click', () => this.reset());
  }

  // ---- Navigation -------------------------------------------------------

  private readUrl(): { step: string | null; review: boolean } {
    const params = new URLSearchParams(window.location.search);
    return { step: params.get('step'), review: params.get('review') === '1' };
  }

  private url(step: string, review = false): string {
    const params = new URLSearchParams(window.location.search);
    params.set('step', step);
    if (review) params.set('review', '1');
    else params.delete('review');
    return `${window.location.pathname}?${params.toString()}`;
  }

  private isQuestion(step: string): boolean {
    return step !== RESULT_STEP && step !== CONTACT_STEP;
  }

  private navigate(requested: string, review = false): void {
    const step = resolveStep(this.tool, this.session.answers, requested);
    const keepReview = review && this.isQuestion(step);
    history.pushState({ step }, '', this.url(step, keepReview));
    this.resumed = false;
    this.render(step, keepReview, true);
  }

  private restoreFromUrl(moveFocus: boolean): void {
    const { step: requested, review } = this.readUrl();
    const step = resolveStep(this.tool, this.session.answers, requested);
    const keepReview = review && step === requested && this.isQuestion(step);
    if (step !== requested || review !== keepReview) history.replaceState({ step }, '', this.url(step, keepReview));
    if (moveFocus) this.resumed = false;
    this.render(step, keepReview, moveFocus);
  }

  private onViewClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    const action = target.closest<HTMLElement>('[data-action]');
    if (action) trackGuided('result_action_selected', { tool_id: this.tool.id, action_id: action.dataset.action });

    const link = target.closest<HTMLAnchorElement>('a[data-nav]');
    if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
      event.preventDefault();
      this.navigate(link.dataset.nav ?? RESULT_STEP, link.hasAttribute('data-review'));
      return;
    }

    const summaryLink = target.closest<HTMLAnchorElement>('.error-summary a[href^="#"]');
    if (summaryLink) {
      event.preventDefault();
      const field = document.getElementById(summaryLink.hash.slice(1));
      field?.focus();
      field?.scrollIntoView({ block: 'center', behavior: this.scrollBehavior() });
      return;
    }

    if (target.closest('[data-reset-inline]')) this.reset();
    if (target.closest('[data-print]')) window.print();
    if (target.closest('[data-download]')) this.download();
  }

  private reset(): void {
    if (!window.confirm('Clear all your answers in this tab and start over?')) return;
    clearSession(this.store);
    this.session = emptySession();
    this.draft = { name: '', email: '', company: '', message: '' };
    this.navigate(this.tool.path[0].question.id);
  }

  // ---- State ------------------------------------------------------------

  private visited(): Set<string> {
    return new Set(this.session.tools[this.tool.id]?.visited ?? []);
  }

  private persist(): void {
    saveSession(this.store, this.session);
  }

  private answer(question: Question, value: AnswerValue): void {
    const progress = this.session.tools[this.tool.id] ?? { visited: [] };
    const changed = JSON.stringify(this.session.answers[question.id]) !== JSON.stringify(value);

    if (progress.visited.length === 0 && progress.completedAt === undefined) {
      trackGuided('tool_started', { tool_id: this.tool.id });
    }
    if (changed && progress.completedAt !== undefined) {
      trackGuided('answer_changed_after_result', { tool_id: this.tool.id, step_id: question.id });
    }
    if (question.options.some((option) => option.unsure && asList(value).includes(option.id))) {
      trackGuided('not_sure_selected', { tool_id: this.tool.id, step_id: question.id });
    }

    this.session.answers = pruneAnswers(TOOLS, { ...this.session.answers, [question.id]: value }).answers;
    if (!progress.visited.includes(question.id)) progress.visited.push(question.id);
    this.session.tools[this.tool.id] = progress;
    this.persist();
  }

  // ---- Rendering --------------------------------------------------------

  private render(step: string, review: boolean, moveFocus: boolean): void {
    this.review = review;
    this.updateStages(step);
    if (step === RESULT_STEP) this.renderResult();
    else if (step === CONTACT_STEP) this.renderContact();
    else this.renderQuestion(step);
    if (moveFocus) this.focusHeading();
    trackGuided('step_viewed', { tool_id: this.tool.id, step_id: step });
  }

  private scrollBehavior(): ScrollBehavior {
    return this.reducedMotion.matches ? 'auto' : 'smooth';
  }

  private focusHeading(): void {
    const heading = this.view.querySelector<HTMLElement>('h1');
    if (!heading) return;
    this.root.scrollIntoView({ block: 'start', behavior: this.scrollBehavior() });
    heading.focus({ preventScroll: true });
  }

  private setTitle(prefix: string): void {
    document.title = `${prefix} – ${this.tool.name} – Vigilon Cyber`;
  }

  private updateStages(step: string): void {
    const current = stageOf(this.tool, step);
    const index = this.tool.stages.findIndex((stage) => stage.id === current);
    this.root.querySelectorAll<HTMLElement>('[data-stage]').forEach((item, i) => {
      item.classList.toggle('done', i < index);
      item.classList.toggle('current', i === index);
      if (i === index) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      const status = item.querySelector('.stage-status');
      if (status) status.textContent = i < index ? ' (completed)' : i === index ? ' (current)' : '';
    });
  }

  private noticesHtml(): string {
    const notices: string[] = [];
    if (!this.store) {
      notices.push('<p class="tool-notice">Your browser isn’t letting this page save progress, so refreshing or leaving the page will clear your answers.</p>');
    }
    if (this.resumed) {
      notices.push('<p class="tool-notice">We’ve kept the answers you gave earlier in this tab. <button type="button" class="btn-link" data-reset-inline>Start over</button></p>');
    }
    const visited = this.visited();
    if (visited.size === 0) {
      const reused = visiblePath(this.tool, this.session.answers).filter((entry) => this.session.answers[entry.question.id] !== undefined).length;
      if (reused > 0) {
        const count = reused === 1 ? 'one answer' : `${reused} answers`;
        notices.push(`<p class="tool-notice">We’ve reused ${count} you gave in another check, so we won’t ask again. You can change ${reused === 1 ? 'it' : 'them'} on the results page.</p>`);
      }
    }
    return notices.join('');
  }

  private renderQuestion(id: string): void {
    const entry = this.tool.path.find((item) => item.question.id === id);
    if (!entry) return;
    const { question } = entry;
    const chosen = asList(this.session.answers[id]);
    const back = this.review ? RESULT_STEP : previousStep(this.tool, this.session.answers, this.visited(), id);
    const type = question.kind === 'single' ? 'radio' : 'checkbox';
    const exclusive = question.options.filter((option) => option.exclusive).map((option) => `“${option.label}”`);
    const describedBy = [question.hint ? `hint-${id}` : '', question.kind === 'multi' && exclusive.length ? `multi-${id}` : ''].filter(Boolean).join(' ');

    this.setTitle(question.title);
    this.view.innerHTML = `
      ${this.noticesHtml()}
      <form class="question" novalidate>
        <div class="error-summary" role="alert" tabindex="-1" hidden></div>
        <fieldset${describedBy ? ` aria-describedby="${describedBy}"` : ''}>
          <legend><h1 class="question-title" tabindex="-1">${esc(question.title)}</h1></legend>
          ${question.hint ? `<p class="hint" id="hint-${id}">${esc(question.hint)}</p>` : ''}
          ${question.kind === 'multi' && exclusive.length ? `<p class="hint" id="multi-${id}">Choosing ${exclusive.map(esc).join(' or ')} clears your other choices.</p>` : ''}
          <p class="field-error" id="error-${id}" hidden></p>
          <div class="options">
            ${question.options
              .map((option) => {
                const inputId = `${id}-${option.id}`;
                return `
                <div class="option${option.unsure ? ' option-unsure' : ''}">
                  <input type="${type}" id="${inputId}" name="${id}" value="${esc(option.id)}"${chosen.includes(option.id) ? ' checked' : ''}${option.exclusive ? ' data-exclusive' : ''}${option.hint ? ` aria-describedby="${inputId}-hint"` : ''}>
                  <label for="${inputId}">${esc(option.label)}</label>
                  ${option.hint ? `<p class="option-hint" id="${inputId}-hint">${esc(option.hint)}</p>` : ''}
                </div>`;
              })
              .join('')}
          </div>
        </fieldset>
        ${question.explainer ? `<details class="explainer"><summary>${esc(question.explainer.summary)}</summary>${question.explainer.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}</details>` : ''}
        ${question.whyWeAsk ? `<details class="explainer"><summary>Why we ask</summary><p>${esc(question.whyWeAsk)}</p></details>` : ''}
        <div class="question-actions">
          <button type="submit" class="btn btn-primary">Continue</button>
          ${back ? `<a class="back-link" href="${esc(this.url(back))}" data-nav="${esc(back)}">${back === RESULT_STEP ? 'Back to your result' : 'Back'}</a>` : ''}
        </div>
      </form>`;

    const form = this.view.querySelector<HTMLFormElement>('form');
    if (!form) return;

    form.addEventListener('change', (event) => {
      const input = event.target as HTMLInputElement;
      if (input.type === 'checkbox' && input.checked) {
        const exclusive = input.hasAttribute('data-exclusive');
        form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((box) => {
          // An exclusive choice clears everything else; any other choice clears the exclusive ones.
          if (box !== input && (exclusive || box.hasAttribute('data-exclusive'))) box.checked = false;
        });
      }
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const selected = Array.from(form.querySelectorAll<HTMLInputElement>(`input[name="${id}"]:checked`)).map((input) => input.value);
      const value: AnswerValue = question.kind === 'single' ? (selected[0] ?? '') : selected;
      if (!isValidAnswer(question, value)) {
        const message = question.kind === 'single' ? 'Select an answer to continue' : 'Select at least one option to continue';
        this.showErrors(form, [{ id: `${id}-${question.options[0].id}`, message }], `error-${id}`);
        return;
      }
      this.answer(question, value);
      this.navigate(nextStep(this.tool, this.session.answers, this.visited(), id, this.review), this.review);
    });
  }

  private showErrors(form: HTMLElement, errors: FieldError[], inlineId?: string): void {
    const summary = form.querySelector<HTMLElement>('.error-summary');
    if (!summary) return;
    summary.innerHTML = `<h2>There is a problem</h2><ul>${errors
      .map((error) => (error.id ? `<li><a href="#${esc(error.id)}">${esc(error.message)}</a></li>` : `<li>${error.message}</li>`))
      .join('')}</ul>`;
    summary.hidden = false;

    form.querySelectorAll<HTMLElement>('.field-error').forEach((element) => {
      element.hidden = true;
      element.textContent = '';
    });
    form.querySelectorAll('.has-error').forEach((element) => element.classList.remove('has-error'));

    if (inlineId) {
      const inline = form.querySelector<HTMLElement>(`#${inlineId}`);
      if (inline) {
        inline.textContent = `Error: ${errors[0].message}`;
        inline.hidden = false;
        const fieldset = inline.closest('fieldset');
        fieldset?.classList.add('has-error');
        const described = new Set((fieldset?.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean));
        described.add(inlineId);
        fieldset?.setAttribute('aria-describedby', [...described].join(' '));
      }
    } else {
      for (const error of errors) {
        if (!error.id) continue;
        const field = form.querySelector<HTMLElement>(`#${error.id}`);
        const inline = form.querySelector<HTMLElement>(`#${error.id}-error`);
        if (!field || !inline) continue;
        inline.textContent = `Error: ${error.message}`;
        inline.hidden = false;
        field.closest('.form-group')?.classList.add('has-error');
      }
    }

    if (!document.title.startsWith('Error: ')) document.title = `Error: ${document.title}`;
    summary.focus();
  }

  // ---- Result -----------------------------------------------------------

  private actionHtml(action: ResultAction, placement: string): string {
    if (action.kind === 'contact') {
      return `<a class="btn btn-primary" href="${esc(this.url(CONTACT_STEP))}" data-nav="${CONTACT_STEP}" data-action="contact-${placement}">${esc(action.label)}</a>`;
    }
    return `<a class="btn btn-primary" href="${toolHref(action.toolId)}" data-action="tool-${action.toolId}-${placement}">${esc(action.label)}</a>`;
  }

  private serviceItem(service: ToolResult['services'][number]): string {
    const details = SERVICES[service.id];
    const link =
      service.id === 'expert-call'
        ? `<a href="${esc(this.url(CONTACT_STEP))}" data-nav="${CONTACT_STEP}" data-action="service-expert-call">${esc(details.name)}</a>`
        : `<a href="${details.href}" data-action="service-${service.id}">${esc(details.name)}</a>`;
    return `<li>${link}<span>${esc(service.why)}</span></li>`;
  }

  private renderResult(): void {
    const result = computeResult(this.tool, this.session.answers);
    const progress = this.session.tools[this.tool.id] ?? { visited: [] };
    if (progress.completedAt === undefined) {
      progress.completedAt = Date.now();
      this.session.tools[this.tool.id] = progress;
      this.persist();
      trackGuided('tool_completed', { tool_id: this.tool.id, step_id: result.outcome });
    }

    const fixture = result.ruleSet.status !== 'reviewed';
    const assisted = result.services.filter((service) => SERVICES[service.id].kind === 'assisted');
    const platform = result.services.filter((service) => SERVICES[service.id].kind === 'platform');
    const rows = answerRows(this.tool, this.session.answers);

    this.setTitle(`Result: ${result.position.label}`);
    this.view.innerHTML = `
      <article class="result" aria-labelledby="result-title">
        <header class="result-position tone-${result.outcome}">
          <p class="position-label">${esc(result.position.label)}</p>
          <h1 id="result-title" tabindex="-1">${esc(result.position.headline)}</h1>
          <p>${esc(result.position.summary)}</p>
          ${fixture ? '<p class="fixture-inline"><strong>Preview:</strong> this result comes from unreviewed local fixture rules. Don’t rely on it for compliance decisions.</p>' : ''}
          <div class="position-actions">${this.actionHtml(result.action, 'top')}</div>
        </header>

        <section class="result-section" aria-labelledby="why-title">
          <h2 id="why-title">Why</h2>
          ${result.reasons.length
            ? `<ul class="reason-list">${result.reasons.map((item) => `<li>${esc(item.text)}${item.reference ? `<span class="ref">${esc(item.reference)}</span>` : ''}</li>`).join('')}</ul>`
            : '<p>This result is based on the answers summarised below.</p>'}
          ${result.obligations.length
            ? `<h3>What to plan for</h3><dl class="obligations">${result.obligations
                .map((item) => `<div><dt>${esc(item.title)}</dt><dd>${esc(item.detail)}<span class="ref">${esc(item.reference)}</span></dd></div>`)
                .join('')}</dl>`
            : ''}
        </section>

        ${result.uncertainties.length
          ? `<section class="result-section" aria-labelledby="uncertain-title">
              <h2 id="uncertain-title">What we couldn’t confirm</h2>
              <ul class="reason-list">${result.uncertainties.map((item) => `<li>${esc(item.text)}${item.reference ? `<span class="ref">${esc(item.reference)}</span>` : ''}</li>`).join('')}</ul>
            </section>`
          : ''}

        ${result.steps.length
          ? `<section class="result-section" aria-labelledby="steps-title">
              <h2 id="steps-title">Next steps</h2>
              <ol class="steps">${result.steps
                .map(
                  (step) => `<li>
                    <h3>${esc(step.title)}</h3>
                    <p class="owner owner-${step.owner}">${OWNER_LABELS[step.owner]}</p>
                    <p>${esc(step.detail)}</p>
                    ${step.dependsOnTitles.length ? `<p class="step-deps">After: ${step.dependsOnTitles.map(esc).join('; ')}</p>` : ''}
                  </li>`,
                )
                .join('')}</ol>
            </section>`
          : ''}

        ${result.covered.length || result.services.length || result.relatedTools.length
          ? `<section class="result-section" aria-labelledby="support-title">
              <h2 id="support-title">Support</h2>
              ${result.covered.length ? `<h3>Already in place</h3><ul class="reason-list">${result.covered.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}
              ${assisted.length ? `<h3>How Vigilon can help</h3><ul class="service-list">${assisted.map((service) => this.serviceItem(service)).join('')}</ul>` : ''}
              ${platform.length ? `<h3>Ongoing platform support</h3><ul class="service-list">${platform.map((service) => this.serviceItem(service)).join('')}</ul>` : ''}
              ${result.relatedTools.length
                ? `<h3>Continue with another check</h3><p class="hint">Answers you’ve already given carry over.</p><ul class="service-list">${result.relatedTools
                    .map((id: ToolId) => `<li><a href="${toolHref(id)}" data-action="related-${id}">${esc(TOOLS_BY_ID[id].name)}</a><span>${esc(TOOLS_BY_ID[id].summary)}</span></li>`)
                    .join('')}</ul>`
                : ''}
            </section>`
          : ''}

        <section class="result-section" aria-labelledby="answers-title">
          <h2 id="answers-title">Your answers</h2>
          <dl class="answers">${rows
            .map(
              (row) => `<div class="answer-row">
                <dt>${esc(row.label)}</dt>
                <dd>${esc(row.value)}</dd>
                <dd class="answer-change"><a href="${esc(this.url(row.questionId, true))}" data-nav="${esc(row.questionId)}" data-review>Change<span class="sr-only"> ${esc(row.label.toLowerCase())}</span></a></dd>
              </div>`,
            )
            .join('')}</dl>
        </section>

        <section class="result-section" aria-labelledby="sources-title">
          <h2 id="sources-title">Sources and rule version</h2>
          <p>Sources checked ${formatDate(result.ruleSet.sourcesCheckedAt)}. Rule set ${esc(result.ruleSet.id)}, version ${esc(result.ruleSet.version)}. ${esc(reviewStatus(result))}.</p>
          <ul class="source-list">${result.sources.map((id) => `<li><a href="${SOURCES[id].url}">${esc(SOURCES[id].title)}</a> <span>${esc(SOURCES[id].publisher)}</span></li>`).join('')}</ul>
          <p class="scope-note">${esc(result.scopeNote)}</p>
        </section>

        <section class="result-section result-action" aria-labelledby="action-title">
          <h2 id="action-title">What next</h2>
          <div class="action-row">
            ${this.actionHtml(result.action, 'bottom')}
            <button type="button" class="btn btn-outline" data-print data-action="print">Print or save as PDF</button>
            <button type="button" class="btn-link" data-download data-action="download">Download summary (.txt)</button>
          </div>
          <p class="save-note">Your answers stay in this browser tab until you close it. Links to this page don’t include your answers, so print or download a copy to keep one.</p>
        </section>
      </article>`;
  }

  private download(): void {
    const result = computeResult(this.tool, this.session.answers);
    const now = new Date();
    const blob = new Blob([formatResultText(this.tool, this.session.answers, result, now)], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `vigilon-${this.tool.slug}-${now.toISOString().slice(0, 10)}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  // ---- Optional follow-up -----------------------------------------------

  private renderContact(): void {
    const result = computeResult(this.tool, this.session.answers);
    const summary = formatResultText(this.tool, this.session.answers, result);
    const field = (id: keyof Draft, label: string, attributes: string) => `
      <div class="form-group">
        <label for="contact-${id}">${label}</label>
        <p class="field-error" id="contact-${id}-error" hidden></p>
        <input id="contact-${id}" name="${id}" value="${esc(this.draft[id])}" ${attributes} aria-describedby="contact-${id}-error">
      </div>`;

    this.setTitle('Send your result');
    this.view.innerHTML = `
      <div class="contact-step">
        <h1 tabindex="-1">Send your result to a Vigilon specialist</h1>
        <p>Your answers and result are sent with your message, so you don’t need to repeat them. We’ll reply by email.</p>
        <form novalidate>
          <div class="error-summary" role="alert" tabindex="-1" hidden></div>
          ${field('name', 'Name', 'type="text" autocomplete="name" maxlength="200" required')}
          ${field('email', 'Work email', 'type="email" autocomplete="email" maxlength="320" spellcheck="false" required')}
          ${field('company', 'Company', 'type="text" autocomplete="organization" maxlength="200" required')}
          <div class="form-group">
            <label for="contact-message">Anything else we should know? <span class="optional">(optional)</span></label>
            <p class="hint" id="contact-message-hint">Don’t include vulnerability details, incident evidence or other confidential information.</p>
            <textarea id="contact-message" name="message" maxlength="5000" aria-describedby="contact-message-hint">${esc(this.draft.message)}</textarea>
          </div>
          <div class="hp" aria-hidden="true">
            <label for="contact-website">Website</label><input id="contact-website" name="website" type="text" tabindex="-1" autocomplete="off">
            <label for="contact-fax">Fax number</label><input id="contact-fax" name="fax" type="text" tabindex="-1" autocomplete="off">
          </div>
          <details class="sent-preview">
            <summary>See exactly what will be sent</summary>
            <pre>${esc(summary)}</pre>
          </details>
          <p class="privacy-note">We’ll use these details to respond to your request. Nothing is sent until you select “Send to Vigilon”.</p>
          <div class="question-actions">
            <button type="submit" class="btn btn-primary">Send to Vigilon</button>
            <a class="back-link" href="${esc(this.url(RESULT_STEP))}" data-nav="${RESULT_STEP}">Back to your result</a>
          </div>
        </form>
      </div>`;

    const form = this.view.querySelector<HTMLFormElement>('form');
    if (!form) return;
    form.addEventListener('input', (event) => {
      const input = event.target as HTMLInputElement | HTMLTextAreaElement;
      if (input.name in this.draft) this.draft[input.name as keyof Draft] = input.value;
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.send(form, summary);
    });
  }

  private async send(form: HTMLFormElement, summary: string): Promise<void> {
    const draft = {
      name: this.draft.name.trim(),
      email: this.draft.email.trim(),
      company: this.draft.company.trim(),
      message: this.draft.message.trim(),
    };
    const errors: FieldError[] = [];
    if (!draft.name) errors.push({ id: 'contact-name', message: 'Enter your name' });
    if (!draft.email) errors.push({ id: 'contact-email', message: 'Enter your work email address' });
    else if (!EMAIL.test(draft.email)) errors.push({ id: 'contact-email', message: 'Enter an email address in the correct format, like name@example.com' });
    if (!draft.company) errors.push({ id: 'contact-company', message: 'Enter your company name' });
    if (errors.length) {
      this.setTitle('Send your result');
      this.showErrors(form, errors);
      return;
    }
    // Clear errors from an earlier attempt while this one is sending.
    form.querySelector<HTMLElement>('.error-summary')?.setAttribute('hidden', '');
    form.querySelectorAll<HTMLElement>('.field-error').forEach((element) => {
      element.hidden = true;
    });
    form.querySelectorAll('.has-error').forEach((element) => element.classList.remove('has-error'));
    this.setTitle('Send your result');

    const data = new FormData();
    data.set('inquiryType', 'guided');
    data.set('toolId', this.tool.id);
    data.set('assessmentSummary', summary);
    Object.entries(draft).forEach(([key, value]) => data.set(key, value));
    const honeypot = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? '';
    data.set('website', honeypot('website'));
    data.set('fax', honeypot('fax'));
    const isBot = Boolean(honeypot('website') || honeypot('fax'));

    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }
    form.setAttribute('aria-busy', 'true');

    const failed = (message: string, fieldErrors: FieldError[] = []) => {
      if (button) {
        button.disabled = false;
        button.textContent = 'Send to Vigilon';
      }
      form.removeAttribute('aria-busy');
      this.setTitle('Send your result');
      this.showErrors(form, fieldErrors.length ? fieldErrors : [{ id: '', message }]);
    };

    try {
      const response = await fetch('/api/quote', { method: 'POST', body: data });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.ok) {
        if (!isBot) {
          reportQuoteConversion();
          trackGuided('inquiry_submitted', { tool_id: this.tool.id });
        }
        this.renderSent(draft.email);
        return;
      }
      if (response.status === 400 && body.error === 'Invalid email address') {
        failed('', [{ id: 'contact-email', message: 'Enter an email address in the correct format, like name@example.com' }]);
        return;
      }
      failed(`Your request couldn’t be sent. Your answers and details are still here, so you can try again, or email us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.`);
    } catch {
      failed(`Your request couldn’t be sent — check your connection and try again. Your answers and details are still here. You can also email us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.`);
    }
  }

  private renderSent(email: string): void {
    this.draft = { name: '', email: '', company: '', message: '' };
    this.setTitle('Request sent');
    this.view.innerHTML = `
      <div class="confirmation">
        <h1 tabindex="-1">Your request has been sent</h1>
        <p>Thank you. A member of the Vigilon team will reply to ${esc(email)}.</p>
        <p><a href="${esc(this.url(RESULT_STEP))}" data-nav="${RESULT_STEP}">Back to your result</a></p>
      </div>`;
    this.focusHeading();
  }
}

export function mountGuidedTools(): void {
  document.querySelectorAll<HTMLElement>('[data-guided-tool]').forEach((root) => {
    if (root.dataset.mode === 'unavailable') return;
    const tool = TOOLS_BY_ID[root.dataset.guidedTool as ToolId];
    const view = root.querySelector<HTMLElement>('[data-tool-view]');
    if (tool && view) new GuidedToolController(root, tool, view).start();
  });
}
