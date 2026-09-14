import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { parseInquiry, renderInquiryEmail } from '../../lib/inquiry.ts';

export const prerender = false;

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request }) => {
  // Only accept form-encoded bodies (the quote form and the guided follow-up both send FormData)
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/x-www-form-urlencoded') && !contentType.includes('multipart/form-data')) {
    return json({ success: false, error: 'Invalid content type' }, 415);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ success: false, error: 'Failed to parse form data' }, 400);
  }

  const parsed = parseInquiry(formData);
  if (!parsed.ok) return json({ success: false, error: parsed.error }, 400);
  // Honeypot bot check — silently discard, but pretend success so bots don't adapt
  if (parsed.bot) return json({ success: true }, 200);

  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return json({ success: false, error: 'Server configuration error' }, 500);
  }

  const email = renderInquiryEmail(parsed.inquiry);

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: 'Vigilon Cyber <noreply@vigiloncyber.com>',
      to: 'bryce@vigiloncyber.com',
      replyTo: email.replyTo,
      subject: email.subject,
      html: email.html,
    });

    if (error) {
      console.error('Resend error:', error);
      return json({ success: false, error: 'Failed to send email' }, 500);
    }

    return json({ success: true }, 200);
  } catch (err) {
    console.error('Unexpected error sending email:', err);
    return json({ success: false, error: 'Unexpected server error' }, 500);
  }
};
